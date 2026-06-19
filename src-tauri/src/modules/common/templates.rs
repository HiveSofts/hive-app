/// Returns the content for a basic HTML file
pub fn html_template(title: &str, css: bool, js: bool) -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{}</title>
    {}
</head>
<body>
    <main>
        <h1>Welcome to {}</h1>
        <p>Your static website is ready to be built.</p>
    </main>
    {}
</body>
</html>"#,
        if title.is_empty() { "My Static Site" } else { title },
        if css { r#"<link rel="stylesheet" href="styles.css">"# } else { "" },
        if title.is_empty() { "My Static Site" } else { title },
        if js { r#"<script src="script.js"></script>"# } else { "" }
    )
}

/// Returns the content for a basic CSS file
pub fn css_template() -> &'static str {
    r#"/* styles.css */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
}

main {
    background: white;
    padding: 2rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    max-width: 600px;
    text-align: center;
}

h1 {
    color: #1a1a1a;
    margin-bottom: 0.5rem;
}

p {
    color: #666;
}
"#
}

/// Returns the content for a basic JS file
pub fn js_template() -> &'static str {
    r#"// script.js
console.log('Hello from static site!');
"#
}