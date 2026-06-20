use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager, Runtime,
};

pub fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let hide = MenuItemBuilder::new("Hide").id("hide").build(app)?;
    let show = MenuItemBuilder::new("Show").id("show").build(app)?;
    let separator = MenuItemBuilder::new("").id("separator").build(app)?;
    let quit = MenuItemBuilder::new("Quit").id("quit").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&show, &hide, &separator, &quit])
        .build()?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "quit" => {
                app.exit(0);
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
