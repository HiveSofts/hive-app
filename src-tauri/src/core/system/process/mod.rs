mod executor;
mod kill;

pub use executor::*;
pub use kill::*;

use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::process::Child;
use std::sync::Mutex;

/// A process group keyed by a logical handle (typically the project path).
///
/// Replaces the four ad-hoc `Mutex<HashMap>` registries that previously lived in
/// the laravel/php/wordpress server modules and the tunnel module. A background
/// reaper thread removes entries as soon as the child exits, so the map never
/// grows stale and stop operations can rely on it.
pub struct ProcessRegistry {
    map: Mutex<HashMap<String, Child>>,
}

impl ProcessRegistry {
    pub fn new() -> Self {
        let registry = Self {
            map: Mutex::new(HashMap::new()),
        };
        registry.start_reaper();
        registry
    }

    /// Insert a child under `key`. If a previous child is still held under the
    /// same key it is killed and reaped first (dedup by project path).
    pub fn insert(&self, key: String, child: Child) {
        if let Ok(mut map) = self.map.lock() {
            if let Some(mut old) = map.remove(&key) {
                let _ = old.kill();
                let _ = old.wait();
            }
            map.insert(key, child);
        }
    }

    /// Remove and kill the child under `key`, reaping it. Returns true if a
    /// process was actually held (and signalled).
    pub fn stop(&self, key: &str) -> bool {
        if let Ok(mut map) = self.map.lock() {
            if let Some(mut child) = map.remove(key) {
                let _ = child.kill();
                let _ = child.wait();
                return true;
            }
        }
        false
    }

    /// Kill every registered child and clear the map.
    pub fn stop_all(&self) {
        if let Ok(mut map) = self.map.lock() {
            for (_, mut child) in map.drain() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }

    /// Kill a child process and (on Unix) its whole process group.
    ///
    /// Long-running children are spawned inside their own session
    /// (`setsid()`), so the group kill via the negative PID reaches the whole
    /// tree without parsing `pstree` output. On Windows `taskkill /T /F`
    /// terminates the tree.
    ///
    /// The sequence is graceful: SIGTERM to the group, a short grace period,
    /// then SIGKILL to whichever PIDs are still alive, then the direct child is
    /// reaped. This lets children flush state instead of being killed mid-write.
    pub fn kill_tree(&self, key: &str) -> bool {
        let mut child = if let Ok(mut map) = self.map.lock() {
            match map.remove(key) {
                Some(child) => child,
                None => return false,
            }
        } else {
            return false;
        };
        let pid = child.id();

        #[cfg(unix)]
        {
            unsafe {
                libc::kill(-(pid as i32), libc::SIGTERM);
                libc::kill(pid as i32, libc::SIGTERM);
            }
            std::thread::sleep(std::time::Duration::from_millis(500));
            unsafe {
                libc::kill(-(pid as i32), libc::SIGKILL);
                libc::kill(pid as i32, libc::SIGKILL);
            }
        }
        #[cfg(windows)]
        {
            use std::process::Command;
            let _ = Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .output();
        }

        // Reap the direct child so it never becomes a zombie. Descendants were
        // killed with the group and get reaped by init once orphaned.
        let _ = child.wait();
        true
    }

    /// Whether a child is currently registered under `key`.
    pub fn contains(&self, key: &str) -> bool {
        self.map
            .lock()
            .map(|map| map.contains_key(key))
            .unwrap_or(false)
    }

    /// Iterate the PIDs of every currently registered child. Used for
    /// system-metadata reads (e.g. per-project CPU/memory) where callers must
    /// not block on the lock. Returns a Vec so the guard is dropped.
    pub fn pids(&self) -> Result<Vec<u32>, String> {
        let map = self
            .map
            .lock()
            .map_err(|_| "Process registry poisoned".to_string())?;
        Ok(map.values().map(|c| c.id()).collect())
    }

    fn start_reaper(&self) {
        let map = &self.map;
        std::thread::spawn(move || {
            loop {
                std::thread::sleep(std::time::Duration::from_secs(2));
                if let Ok(mut guard) = map.lock() {
                    let dead: Vec<String> = guard
                        .iter()
                        .filter(|(_, child)| child.try_wait().map(|s| s.is_some()).unwrap_or(false))
                        .map(|(key, _)| key.clone())
                        .collect();
                    for key in dead {
                        guard.remove(&key);
                    }
                }
            }
        });
    }
}

/// The single shared registry used across all modules.
pub static PROCESS_REGISTRY: Lazy<ProcessRegistry> = Lazy::new(ProcessRegistry::new);
