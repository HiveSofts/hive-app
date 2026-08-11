use std::fs;
use std::path::{Path, PathBuf};

#[tauri::command]
pub fn list_directory_contents(path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err("Path does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut entries = Vec::new();

    for entry in fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        if let Some(file_name) = entry.file_name().to_str() {
            entries.push(file_name.to_string());
        }
    }

    entries.sort(); // Sort alphabetically for consistent output
    Ok(entries)
}

/// Returns true if `candidate` is inside `base` (both canonicalized) and is not
/// `base` itself. Used to defend against zip-slip / path-traversal extraction.
fn is_within(base: &Path, candidate: &Path) -> bool {
    let base = match base.canonicalize() {
        Ok(b) => b,
        Err(_) => return false,
    };
    let candidate = match candidate.canonicalize() {
        Ok(c) => c,
        Err(_) => return false,
    };
    candidate.starts_with(&base)
}

/// Resolve a logical entry name against the extraction root, refusing any name
/// that could escape it. Returns the final output path (with parents created)
/// or an error that aborts the whole extraction.
fn resolve_entry(dest_canon: &Path, name_relative: &str) -> Result<PathBuf, String> {
    // Absolute path or `..` traversal → reject the whole archive.
    let entry_path = Path::new(name_relative);
    if entry_path.is_absolute() || name_relative.split('/').any(|seg| seg == "..") {
        return Err(format!(
            "Unsafe archive entry '{name_relative}' (path traversal) — extraction aborted"
        ));
    }

    let out_path = dest_canon.join(name_relative);
    let parent = out_path
        .parent()
        .ok_or_else(|| format!("Entry '{name_relative}' has no parent"))?;

    // Resolve the parent (creating any missing intermediate directories) and
    // verify it stays inside the extraction root BEFORE writing. This defends
    // against a previously-extracted symlink pointing outside.
    fs::create_dir_all(parent)
        .map_err(|e| format!("Failed to create parent dir {}: {}", parent.display(), e))?;
    if !is_within(dest_canon, parent) {
        return Err(format!(
            "Unsafe archive entry '{name_relative}' escapes extraction root — extraction aborted"
        ));
    }

    Ok(out_path)
}

/// Core extraction used by both the plain and strip-root variants. When
/// `strip_root` is `Some("prefix")`, only entries under `prefix/` are extracted
/// and the prefix is removed from their destination path (WordPress official
/// zips wrap everything in a top-level folder); all other entries are skipped.
/// Every extracted entry is still validated against path traversal.
fn extract_entries(
    archive: &mut zip::ZipArchive<impl std::io::Read + std::io::Seek>,
    dest: &Path,
    strip_root: Option<&str>,
) -> Result<(), String> {
    fs::create_dir_all(dest)
        .map_err(|e| format!("Failed to create dir {}: {}", dest.display(), e))?;

    let dest_canon = dest
        .canonicalize()
        .map_err(|e| format!("Failed to resolve {}: {}", dest.display(), e))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read entry {}: {}", i, e))?;

        let name = file.name();
        let relative = match strip_root {
            Some(prefix) => {
                match name.strip_prefix(&format!("{prefix}/")) {
                    Some(rest) => rest,
                    None => continue, // outside the top-level folder — skip
                }
            }
            None => name.to_string(),
        };

        let out_path = resolve_entry(&dest_canon, &relative)?;

        if file.is_dir() {
            fs::create_dir_all(&out_path)
                .map_err(|e| format!("Failed to create dir {}: {}", out_path.display(), e))?;
        } else {
            let mut out_file = fs::File::create(&out_path)
                .map_err(|e| format!("Failed to create file {}: {}", out_path.display(), e))?;
            std::io::copy(&mut file, &mut out_file)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }

    Ok(())
}

/// Safe zip extraction: rejects any archive entry whose path would escape
/// `dest` (via `..` segments, absolute paths, or symlinks). A malicious or
/// malformed archive fails closed instead of writing outside the target.
pub fn safe_extract_zip(
    archive: &mut zip::ZipArchive<impl std::io::Read + std::io::Seek>,
    dest: &Path,
) -> Result<(), String> {
    extract_entries(archive, dest, None)
}

/// Same guarantee as [`safe_extract_zip`], but only extracts entries under the
/// given top-level `root_dir` and drops that prefix from each destination path.
/// Used for official zips that wrap their contents in a folder (e.g.
/// `wordpress/`), so the files land directly in `dest`.
pub fn safe_extract_zip_strip_root(
    archive: &mut zip::ZipArchive<impl std::io::Read + std::io::Seek>,
    dest: &Path,
    root_dir: &str,
) -> Result<(), String> {
    extract_entries(archive, dest, Some(root_dir))
}

/// Resolve a path inside `base` after joining `relative`, returning an error if
/// the result escapes `base`. Used for project-name / user-controlled segments.
pub fn safe_join(base: &Path, relative: &str) -> Result<PathBuf, String> {
    let joined = base.join(relative);
    let base_canon = base
        .canonicalize()
        .map_err(|e| format!("Failed to resolve base {}: {}", base.display(), e))?;
    let joined_canon = joined
        .canonicalize()
        .map_err(|e| format!("Failed to resolve path {}: {}", joined.display(), e))?;
    if joined_canon.starts_with(&base_canon) {
        Ok(joined)
    } else {
        Err(format!("Path '{}' escapes base directory", relative))
    }
}
