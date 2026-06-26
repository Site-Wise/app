// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::command;
use tauri::WindowEvent;
use tauri_plugin_notification::NotificationExt;

// Learn more about Tauri commands at https://v2.tauri.app/develop/calling-rust/
#[command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[command]
async fn show_notification(title: String, body: String, app: tauri::AppHandle) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
fn get_platform_info() -> Result<serde_json::Value, String> {
    let os = std::env::consts::OS;
    let is_mobile = matches!(os, "android" | "ios");
    Ok(serde_json::json!({
        "platform": os,
        "arch": std::env::consts::ARCH,
        "is_native": true,
        "is_mobile": is_mobile,
        "is_desktop": !is_mobile
    }))
}

// Shared application entry point used by both the desktop binary (main.rs) and
// the mobile runtimes. On Android/iOS, `tauri::mobile_entry_point` generates the
// platform glue that invokes this function.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // The system tray is desktop-only. Mobile platforms have no tray.
            #[cfg(desktop)]
            {
                use tauri::tray::{TrayIconBuilder, TrayIconEvent};
                use tauri::{
                    menu::{Menu, MenuItem},
                    Manager,
                };

                let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
                let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
                let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

                let _tray = TrayIconBuilder::with_id("main")
                    .menu(&menu)
                    .on_menu_event(move |app, event| match event.id().as_ref() {
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
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click { .. } = event {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    })
                    .build(app)?;
            }

            // Silence unused-variable warnings on mobile where `app` is not used
            // in this closure.
            let _ = app;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                // On desktop, closing the window hides it to the tray instead of
                // quitting. On mobile there is no tray, so this is a no-op.
                #[cfg(desktop)]
                {
                    let _ = window.hide();
                    api.prevent_close();
                }
                #[cfg(not(desktop))]
                {
                    let _ = (window, api);
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            show_notification,
            get_platform_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
