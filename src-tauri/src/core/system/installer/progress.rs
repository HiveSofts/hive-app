use serde::Serialize;

/// Live progress event streamed from the Rust installer to the frontend.
///
/// Emitted under the `"package-install-progress"` event. The same struct is
/// used for both managed (system) and static (portable) installs so the UI
/// has a single event channel to render.
#[derive(Debug, Clone, Serialize)]
pub struct InstallProgress {
    /// Catalog tool id being operated on.
    pub tool_id: String,
    /// Install / update / remove.
    pub action: String,
    /// Short human step label (e.g. "Downloading", "Installing", "Verifying").
    pub step: String,
    /// Longer message, usually the current log line when `log` is set.
    pub message: String,
    /// 0.0..=100.0 where known; `None` for indeterminate steps.
    pub progress: Option<f32>,
    /// True when `message` is a stderr line (render red).
    #[serde(default)]
    pub is_stderr: bool,
    /// Raw log line payload (for the live log panel).
    #[serde(default)]
    pub log: Option<String>,
    /// Resolved/final command, surfaced in the advanced panel for trust.
    #[serde(default)]
    pub command: Option<String>,
    /// Failure reason classification (see classify_failure).
    #[serde(default)]
    pub failure_reason: Option<String>,
    /// Optional numeric exit code of the child process.
    #[serde(default)]
    pub exit_code: Option<i32>,
    /// True on the terminal event (success or error).
    #[serde(default)]
    pub done: bool,
    /// True when the whole operation succeeded.
    #[serde(default)]
    pub success: bool,
}

/// Classify a failure from exit code + stderr text into a user-meaningful reason.
pub fn classify_failure(exit_code: Option<i32>, stderr: &str) -> String {
    let s = stderr.to_lowercase();
    if s.contains("permission denied") || s.contains("eacces") || s.contains("not permitted") {
        "permission_denied".into()
    } else if s.contains("network") || s.contains("could not resolve") || s.contains("failed to fetch")
        || s.contains("no route") || s.contains("timeout") || s.contains("temporary failure")
    {
        "network".into()
    } else if s.contains("unable to locate") || s.contains("no package") || s.contains("not found")
        || s.contains("eexist") || s.contains("no candidate")
    {
        "not_found".into()
    } else if s.contains("conflict") || s.contains("breaking") || s.contains("held package")
        || s.contains("already provided")
    {
        "dependency_conflict".into()
    } else if s.contains("no space left") || s.contains("disk full") || s.contains("write error") {
        "disk_space".into()
    } else if exit_code == Some(0) {
        "unknown".into()
    } else {
        "unknown".into()
    }
}
