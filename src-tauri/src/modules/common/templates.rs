pub fn html_template(title: &str, css: bool, js: bool) -> String {
    let title = if title.is_empty() {
        "Hive Project"
    } else {
        title
    };

    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{}</title>
    {}
</head>
<body>
    <main class="container">
        <span class="badge">🐝 Built with Hive</span>

        <h1>Welcome to {}</h1>

        <p class="description">
            Your project is ready to go.
            Hive helps you build, run and manage modern development environments
            with a fast, simple and developer-friendly workflow.
        </p>

        <div class="actions">
            <a href="https://github.com/HiveSofts" target="_blank" rel="noopener noreferrer">
                GitHub
            </a>
        </div>
    </main>

    {}
</body>
</html>"#,
        title,
        if css {
            r#"<link rel="stylesheet" href="styles.css">"#
        } else {
            ""
        },
        title,
        if js {
            r#"<script src="script.js"></script>"#
        } else {
            ""
        }
    )
}
pub fn css_template() -> &'static str {
    r#"* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    color-scheme: light dark;
    --bg: #fafafa;
    --surface: #ffffff;
    --text: #111827;
    --muted: #6b7280;
    --accent: #f59e0b;
    --border: #e5e7eb;
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg: #0f1115;
        --surface: #171a21;
        --text: #f8fafc;
        --muted: #94a3b8;
        --border: #2a2f3a;
    }
}

body {
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: var(--bg);
    color: var(--text);
    display: grid;
    place-items: center;
    min-height: 100vh;
    padding: 2rem;
}

.container {
    width: min(720px, 100%);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 18px;
    padding: 3rem;
    text-align: center;
}

.badge {
    display: inline-block;
    padding: .45rem .9rem;
    border-radius: 999px;
    background: rgba(245, 158, 11, .12);
    color: var(--accent);
    font-weight: 600;
    margin-bottom: 1.5rem;
}

h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    margin-bottom: 1rem;
}

.description {
    color: var(--muted);
    font-size: 1.05rem;
    line-height: 1.8;
    max-width: 620px;
    margin: 0 auto;
}

.actions {
    margin-top: 2rem;
}

.actions a {
    display: inline-block;
    text-decoration: none;
    color: white;
    background: var(--accent);
    padding: .9rem 1.4rem;
    border-radius: 10px;
    transition: .2s;
    font-weight: 600;
}

.actions a:hover {
    transform: translateY(-2px);
    opacity: .9;
}
"#
}
/// Returns the content for a basic JS file
pub fn js_template() -> &'static str {
    r#"console.log("🐝 Welcome to Hive!");
"#
}
