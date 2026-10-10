#[cfg(desktop)]
use tauri::Manager;
use tauri::{webview::WebviewWindowBuilder, WebviewUrl};
use tauri_plugin_opener::OpenerExt;
use url::Url;

/// Eine Regel: Host (inkl. aller Subdomains) + optionaler Pfad.
/// Leerer Pfad = ganzer Host. Ein Pfad gilt für sich selbst und alles darunter,
/// "/plus" trifft also "/plus" und "/plus/abc", aber nicht "/plusplus".
struct Rule {
    host: &'static str,
    path: &'static str,
}

const fn rule(host: &'static str, path: &'static str) -> Rule {
    Rule { host, path }
}

/// Wird immer im Standardbrowser geöffnet – hat Vorrang vor `IN_APP`.
const EXTERNAL: &[Rule] = &[
    rule("backups.plugged.host", ""), // Downloads gehen in der Android-WebView nicht
    rule("devcloud.plugged.host", ""),
    rule("mclo.gs", ""),
    rule("modrinth.com", ""),
];

/// Bleibt in der App. Alles andere (Discord-Einladungen, Sponsored Links …) geht in den Browser.
const IN_APP: &[Rule] = &[
    rule("plugged.host", ""),              // Website, panel., status.
    rule("noprofit.space", ""),            // Login / Registrierung (accounts.noprofit.space)
    rule("challenges.cloudflare.com", ""), // Turnstile
    // Discord nur für den OAuth-Login
    rule("discord.com", "/oauth2"),
    rule("discord.com", "/api/oauth2"),
    rule("discord.com", "/login"),
    rule("discordapp.com", "/oauth2"),
    rule("discordapp.com", "/api/oauth2"),
    rule("discordapp.com", "/login"),
];

fn host_matches(host: &str, domain: &str) -> bool {
    host == domain || host.ends_with(&format!(".{domain}"))
}

fn path_matches(path: &str, prefix: &str) -> bool {
    let prefix = prefix.trim_end_matches('/');
    prefix.is_empty()
        || path == prefix
        || path
            .strip_prefix(prefix)
            .is_some_and(|rest| rest.starts_with('/'))
}

fn matches(rules: &[Rule], host: &str, path: &str) -> bool {
    rules
        .iter()
        .any(|r| host_matches(host, r.host) && path_matches(path, r.path))
}

fn is_in_app(url: &Url) -> bool {
    match url.scheme() {
        // Lokale Startseite (tauri://localhost bzw. http(s)://tauri.localhost)
        "tauri" | "asset" | "about" | "data" | "blob" => return true,
        "http" | "https" => {}
        _ => return false,
    }
    let Some(host) = url.host_str() else {
        return false;
    };
    if host == "tauri.localhost" || host == "localhost" {
        return true;
    }
    let path = url.path();
    !matches(EXTERNAL, host, path) && matches(IN_APP, host, path)
}

/// Die EXTERNAL-Regeln als JSON für das eingefügte Skript – das Panel wechselt Seiten
/// per JavaScript (Livewire), was `on_navigation` nicht mitbekommt.
fn external_rules_json() -> String {
    let items: Vec<String> = EXTERNAL
        .iter()
        .map(|r| format!(r#"{{"host":"{}","path":"{}"}}"#, r.host, r.path))
        .collect();
    format!("[{}]", items.join(","))
}

fn platform() -> (&'static str, &'static str) {
    if cfg!(target_os = "android") {
        ("Android", "Android System WebView")
    } else if cfg!(target_os = "ios") {
        ("iOS", "WKWebView")
    } else if cfg!(target_os = "windows") {
        ("Windows", "Microsoft Edge WebView2")
    } else if cfg!(target_os = "macos") {
        ("macOS", "WKWebView")
    } else {
        ("Linux", "WebKitGTK")
    }
}

const DESKTOP_NOTE: &str =
    "<li>The app remembers its window size and position, and only one copy runs at a time.</li>";

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Baut das Skript für den Sidebar-Punkt "About the App": die lokale Seite about.html wird
/// mit App-Infos gefüllt und als JS-String in about.js eingesetzt.
fn about_script(info: &tauri::PackageInfo) -> String {
    let (os, engine) = platform();
    let html = include_str!("inject/about.html")
        .replace("__APP_NAME__", &escape_html(&info.name))
        .replace("__APP_VERSION__", &escape_html(&info.version.to_string()))
        .replace("__APP_PLATFORM__", os)
        .replace("__APP_ENGINE__", engine)
        // Fenster merken / nur eine Instanz gibt es nur auf dem Desktop (siehe run()).
        .replace(
            "__APP_DESKTOP_NOTE__",
            if cfg!(desktop) { DESKTOP_NOTE } else { "" },
        );
    let html = serde_json::to_string(&html).expect("about.html als JSON");
    include_str!("inject/about.js").replace("__ABOUT_HTML__", &html)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.unminimize();
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }))
            .plugin(tauri_plugin_window_state::Builder::default().build());
    }

    builder
        .setup(|app| {
            let nav_handle = app.handle().clone();

            let win = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .initialization_script(
                    include_str!("inject/links.js")
                        .replace("__EXTERNAL_RULES__", &external_rules_json()),
                )
                .initialization_script(include_str!("inject/tokens.js"))
                .initialization_script(about_script(app.package_info()))
                .on_navigation(move |url| {
                    if is_in_app(url) {
                        true
                    } else {
                        let _ = nav_handle.opener().open_url(url.as_str(), None::<&str>);
                        false
                    }
                });

            #[cfg(desktop)]
            let win = win
                .title("plugged.host")
                .inner_size(1280.0, 820.0)
                .min_inner_size(400.0, 500.0)
                .center()
                .background_color(tauri::window::Color(11, 13, 16, 255));

            win.build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten von plugged.host");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn in_app(u: &str) -> bool {
        is_in_app(&Url::parse(u).unwrap())
    }

    #[test]
    fn rules() {
        assert!(in_app("https://plugged.host/"));
        assert!(in_app("https://panel.plugged.host/tokens"));
        assert!(in_app("https://panel.plugged.host/plusplus"));
        assert!(in_app("https://panel.plugged.host/plus"));
        assert!(!in_app("https://backups.plugged.host/file.zip"));
        assert!(!in_app("https://devcloud.plugged.host/"));
        assert!(!in_app("https://mclo.gs/abc123"));
        assert!(!in_app("https://modrinth.com/"));
        assert!(in_app("https://accounts.noprofit.space/login"));
        assert!(in_app("https://discord.com/oauth2/authorize?client_id=1"));
        assert!(!in_app("https://discord.com/invite/abc"));
        assert!(!in_app("https://notplugged.host/"));
        assert!(!in_app("https://example.com/"));
        assert!(in_app("http://tauri.localhost/index.html"));
    }

    #[test]
    fn about_script_has_no_placeholders() {
        let info = tauri::PackageInfo {
            name: "plugged.host <Test>".into(),
            version: "1.2.3".parse().unwrap(),
            authors: "",
            description: "",
            crate_name: "plugged",
        };
        let js = about_script(&info);
        assert!(!js.contains("__ABOUT_HTML__"));
        assert!(!js.contains("__APP_"), "nicht ersetzter Platzhalter");
        assert!(js.contains("1.2.3"));
        assert!(js.contains("plugged.host &lt;Test&gt;"));
    }
}
