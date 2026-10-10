# plugged.host App

Native App für [plugged.host](https://plugged.host/) – gebaut mit [Tauri 2](https://tauri.app).
Eine Codebasis für **Windows** (`.exe`/`.msi`), **Android** (`.apk`), **Linux** (`.AppImage`) und **iPhone** (`.ipa`).

## Funktionsweise

- Die App öffnet `https://plugged.host/` in der System-WebView (WebView2 / Android WebView / WebKitGTK).
- Welche Links in der App bleiben und welche im **Standardbrowser** aufgehen, steht in
  `src-tauri/src/lib.rs` in den Listen `IN_APP` und `EXTERNAL`. Jede Regel ist `rule("host", "/pfad")`:
  - Der Host gilt inkl. aller Subdomains, ein leerer Pfad steht für den ganzen Host.
  - `"/plus"` trifft `/plus` und `/plus/...`, aber nicht `/plusplus`.
  - `EXTERNAL` hat Vorrang. Alles, was in keiner Liste steht, öffnet sich im Browser.
  - Die `EXTERNAL`-Regeln werden zusätzlich in die Seite eingefügt (`inject/links.js`), damit auch
    Seitenwechsel des Panels per JavaScript (Livewire) abgefangen werden.
  - Test der Regeln: `node scripts/with-msvc.mjs cargo test --manifest-path src-tauri/Cargo.toml --lib`
- Ohne Internet erscheint eine Offline-Seite mit „Erneut versuchen“.
- Desktop: Fenstergröße/-position wird gespeichert, nur eine Instanz läuft gleichzeitig.
- Android: Zurück-Taste navigiert in der Seite zurück, Inhalt bleibt unter Status-/Navigationsleiste.
- Die Webseite hat **keinen** Zugriff auf native Tauri-APIs.
- Auf `panel.plugged.host/tokens` wird der primäre Button (`.fi-btn.fi-color-primary.w-full.justify-center`)
  deaktiviert und mit „Not available on Desktop-App“ beschriftet (`src-tauri/src/inject/tokens.js`).
- Im Panel steht in der Sidebar zusätzlich **„About the App“**. Die Seite dazu ist lokal
  (`src-tauri/src/inject/about.html`, beim Kompilieren eingebaut) und wird von `inject/about.js` im
  Inhaltsbereich angezeigt. Platzhalter `__APP_NAME__`, `__APP_VERSION__`, `__APP_PLATFORM__` und
  `__APP_ENGINE__` füllt `lib.rs` automatisch.

## Projektstruktur

```
ui/index.html                 Startseite (Verbindungsprüfung + Offline-Hinweis)
src-tauri/src/lib.rs          Fenster + Link-Regeln (welche Domains in der App bleiben)
src-tauri/src/inject/         JavaScript, das in die Webseite eingefügt wird
src-tauri/tauri.conf.json     App-Name, ID, Bundle-Einstellungen
src-tauri/gen/android/        Android-Projekt (Gradle)
assets/og.png                 Quell-Icon (npm run icons erzeugt alle Icon-Größen)
.github/workflows/build.yml   Cloud-Build für alle drei Plattformen
```

## Bauen

Voraussetzungen: Node.js, Rust (`rustup`), `npm install`.

| Ziel | Befehl | Voraussetzungen | Ergebnis |
|---|---|---|---|
| Windows | `npm run build:windows` | VS Build Tools (C++ + Windows SDK) | `src-tauri/target/release/bundle/nsis/*.exe`, `msi/*.msi` |
| Android | `npm run build:android` | Android SDK + NDK, JDK 17–21, `JAVA_HOME`, `NDK_HOME`, Rust-Targets `*-linux-android*` | `src-tauri/gen/android/app/build/outputs/apk/universal/release/*.apk` |
| iPhone | `npm run build:ios` | nur macOS mit Xcode, daher über GitHub Actions (siehe unten) | `src-tauri/gen/apple/build/arm64/*.ipa` (unsigniert) |
| Linux | `npm run build:linux` | Linux/WSL mit `libwebkit2gtk-4.1-dev` u. a. (siehe Workflow) | `src-tauri/target/release/bundle/appimage/*.AppImage` |

Entwicklung: `npm run dev`

Unter Windows laufen `dev`, `build:windows` und `build:android` über `scripts/with-msvc.mjs`.
Das Skript lädt automatisch eine **vollständige** MSVC-Installation (`vcvars64.bat`), damit Rust nicht
eine Visual-Studio-Version ohne x64-Bibliotheken erwischt. Für Android setzt es außerdem `ANDROID_HOME`,
`NDK_HOME` und `JAVA_HOME` (JDK aus Android Studio).

### Windows-Installer

- `src-tauri/windows/installer.nsi`: eigenes NSIS-Template. Grundlage ist das Standard-Template von
  tauri-cli 2.12.1, eigene Änderungen sind mit `PABLO:` markiert. Es zeigt das Lizenzabkommen (muss
  akzeptiert werden) und die Ordnerauswahl, unten links steht „PABLO Development - a small Studio“
  statt „Nullsoft Install System“.
- `src-tauri/windows/LICENSE.rtf`: Lizenzabkommen (Deutsch + Englisch) für NSIS **und** MSI. Umlaute
  müssen als RTF-Escapes (`'e4`) drinstehen, weil WiX nur Codepage 1252 akzeptiert.
- In Kommentaren des Templates keine doppelten geschweiften Klammern verwenden, die Tauri-CLI liest sie
  als Platzhalter.
- Nach einem Update von `@tauri-apps/cli` das Template mit dem neuen Original vergleichen.

### iPhone (.ipa) ohne Mac

Eine `.ipa` lässt sich nur unter macOS bauen. Der Job `ios` im Workflow erledigt das auf einem
kostenlosen Mac-Runner von GitHub (bei **öffentlichen** Repositories ohne Minutenlimit):

1. Auf GitHub unter **Actions → Build → Run workflow** starten (oder auf `master`/`main` pushen).
2. Nach dem Lauf unter **Artifacts** herunterladen:
   - `ios`: die unsignierte `.ipa`
   - `ios-screenshots`: Screenshots aus dem iPhone-Simulator (zum Prüfen von Notch/Home-Leiste)
3. Unter Windows mit [Sideloadly](https://sideloadly.io/) installieren: iPhone per Kabel anschließen,
   `.ipa` hineinziehen, normale Apple-ID eingeben, *Start*. Auf dem iPhone danach unter
   *Einstellungen → Allgemein → VPN & Geräteverwaltung* dem eigenen Entwicklerprofil vertrauen und
   ab iOS 16 den *Entwicklermodus* einschalten.

Einschränkungen mit kostenloser Apple-ID: Die App läuft **7 Tage**, dann erneut mit Sideloadly
installieren. Maximal 3 selbst installierte Apps. Verteilung an andere
(TestFlight, App Store) geht nur mit einem bezahlten Apple-Developer-Konto.

### Android-Signatur

`src-tauri/gen/android/keystore.properties` zeigt auf `android-release.jks`. Beide sind in `.gitignore`.
**Sichere den Keystore + Passwort** – ohne ihn kannst du keine Updates für installierte APKs mehr ausliefern.

### GitHub Actions

Workflow manuell starten oder ein Tag `v*` pushen. Für signierte APKs diese Secrets anlegen:
`ANDROID_KEYSTORE_BASE64` (`base64 -w0 android-release.jks`), `ANDROID_KEY_ALIAS` (`plugged`), `ANDROID_KEY_PASSWORD`.
