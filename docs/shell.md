# Skripte für eine andere Tauri-App verwenden

Die Skripte in `scripts/` sind für diese App geschrieben, lassen sich aber in jedes andere
**Tauri-2-Projekt** übernehmen. Die meisten funktionieren unverändert. Angepasst werden müssen nur
wenige Werte: vor allem die **Bundle-ID**, der **Dateiname der `.ipa`** und die **NDK-Version**.

## Übersicht

| Skript | Wofür | Läuft auf | Anpassen? |
|---|---|---|---|
| `with-msvc.mjs` | lädt unter Windows die Visual-Studio-Umgebung (und für Android `ANDROID_HOME`, `NDK_HOME`, `JAVA_HOME`) | Windows (sonst wirkungslos) | nein |
| `ci-run.sh` | führt einen Befehl in GitHub Actions aus und meldet Fehler als lesbare Annotation | GitHub Actions (alle Runner) | nein |
| `ios-package-ipa.sh` | packt die unsignierte `.ipa` aus dem Xcode-Archiv | macOS | **Dateiname** (Argument) |
| `ios-simulator-screenshot.sh` | startet die App im iPhone-Simulator und macht Screenshots | macOS | **Bundle-ID**, ggf. Wartezeiten |

Dazu kommen die Stellen, an denen die Skripte **aufgerufen** werden: `package.json` und
`.github/workflows/build.yml`.

## Checkliste für eine neue App

1. Ordner `scripts/` und die Datei `.gitattributes` in das neue Projekt kopieren.
2. In `scripts/ios-simulator-screenshot.sh` die **Bundle-ID** eintragen (siehe unten).
3. In `package.json` und im Workflow den **Namen der `.ipa`** ändern (`plugged` → dein Name).
4. Im Workflow die **NDK-Version** prüfen (zwei Stellen).
5. Pfade im Workflow prüfen, falls dein Projekt nicht der Standard-Struktur von Tauri folgt.
6. Einmal pushen und im Tab *Actions* prüfen, ob alle Jobs grün sind.

Voraussetzung für alle Skripte: Sie werden **aus dem Projektordner** aufgerufen (dort, wo
`package.json` und `src-tauri/` liegen), und das Projekt hat die übliche Tauri-Struktur:

```
package.json
src-tauri/
  tauri.conf.json
  gen/android/   (von `tauri android init`)
  gen/apple/     (von `tauri ios init`, nur auf macOS bzw. im Workflow)
```

---

## `with-msvc.mjs`

Startet einen Befehl mit geladener Visual-Studio-Umgebung. Rust nimmt unter Windows sonst
automatisch die neueste Visual-Studio-Installation, auch wenn dort die C++-Bibliotheken fehlen.

**Anpassen: nichts.** Das Skript sucht selbst:

- eine Visual-Studio-Installation mit `msvcrt.lib` (unter `Program Files` und `Program Files (x86)`)
- für Android das SDK (`%LOCALAPPDATA%\Android\Sdk`), das neueste NDK darin und das JDK von
  Android Studio

Aufruf in `package.json`, einfach vor den eigentlichen Befehl schreiben:

```json
"dev": "node scripts/with-msvc.mjs tauri dev",
"build:windows": "node scripts/with-msvc.mjs tauri build --bundles nsis,msi",
"build:android": "node scripts/with-msvc.mjs tauri android build --apk"
```

Gut zu wissen:

- Unter Linux und macOS startet es den Befehl **unverändert**. Die Einträge in `package.json` können
  also für alle Systeme gleich bleiben.
- Die Android-Variablen setzt es nur, wenn im Befehl das Wort `android` vorkommt.
- Bereits gesetzte Werte haben Vorrang, **außer `JAVA_HOME`**: Gibt es Android Studio, wird immer
  dessen JDK genommen, weil Gradle mit sehr neuen JDKs oft nicht klarkommt. Willst du ein eigenes
  JDK erzwingen, entferne in `setAndroidEnv()` die Zeile mit `env.JAVA_HOME = jbr`.
- Läuft der Befehl schon in einer „Developer PowerShell für VS“, wird nichts doppelt geladen.

## `ci-run.sh`

Führt in GitHub Actions einen Befehl aus. Schlägt er fehl, schreibt das Skript die wichtigsten
Logzeilen als **Fehler-Annotation**. Bei öffentlichen Repositories kann man diese ohne GitHub-Login
lesen, die vollständigen Job-Logs dagegen nicht.

**Anpassen: nichts.** Aufruf im Workflow:

```yaml
- run: bash scripts/ci-run.sh "Titel der Meldung" npm run build:linux
```

Der erste Parameter ist der Titel, alles danach ist der Befehl.

Optional:

- Welche Zeilen als „Fehlerzeilen“ gelten, steht in der Zeile mit
  `grep -iE 'error|failed|fatal|cannot|could not'`.
- Wie viele Zeilen gemeldet werden, steuern `tail -n 15` (Fehlerzeilen) und `tail -n 20` (Log-Ende).
  Mehr Zeilen bringen wenig: GitHub schneidet Annotationen bei etwa 4 KB ab.

Unter **Windows-Runnern** braucht der Schritt `shell: bash`, sonst landet der Aufruf eventuell beim
WSL-Bash:

```yaml
- run: bash scripts/ci-run.sh "Windows-Build" npm run build:windows
  shell: bash
```

## `ios-package-ipa.sh`

Packt die `.app` aus dem Xcode-Archiv in eine unsignierte `.ipa`. Nötig, weil
`tauri ios build --no-sign` die `.app` nach dem Archivieren unter einem anderen Namen sucht, als Xcode
sie ablegt. Das Skript sucht sie deshalb selbst.

**Anpassen: den Dateinamen** über die Argumente:

```bash
bash scripts/ios-package-ipa.sh <Ausgabeordner> <Dateiname-ohne-.ipa>
# Beispiel:
bash scripts/ios-package-ipa.sh ios-build meine-app
# ergibt ios-build/meine-app.ipa
```

Davor muss das Archiv gebaut worden sein:

```bash
npx tauri ios build --no-sign --archive-only --target aarch64
```

Den Namen an diesen Stellen ändern:

- `package.json` → `build:ios`
- Workflow → Schritt *IPA packen*
- Workflow → Upload-Schritt `path: ios-build/*.ipa` (nur, wenn du den **Ordner** änderst)

Das Skript erwartet das Archiv unter `src-tauri/gen/apple/build/`. Liegt dein Tauri-Ordner woanders,
den Pfad in der `find`-Zeile anpassen.

## `ios-simulator-screenshot.sh`

Installiert den Simulator-Build in einem iPhone-Simulator, startet die App und speichert zwei
Screenshots. So siehst du ohne Mac, wie die App mit Notch und Home-Leiste aussieht.

**Anpassen: die Bundle-ID.** Sie muss genau dem Wert `identifier` in `src-tauri/tauri.conf.json`
entsprechen:

```bash
BUNDLE_ID="host.plugged.app"   # ← durch deinen identifier ersetzen, z. B. "com.example.meineapp"
```

Ist die ID falsch, schlägt `simctl launch` fehl und es gibt keine Screenshots.

Optional:

- **Wartezeiten:** `sleep 25` vor dem ersten und `sleep 10` vor dem zweiten Screenshot. Lädt deine
  App schneller oder langsamer (z. B. eine große Webseite), die Werte anpassen.
- **Weitere Screenshots:** einfach weitere Zeilen nach diesem Muster ergänzen:
  `xcrun simctl io "$UDID" screenshot "$OUT/3-name.png"`.
- **Gerät:** Das Skript nimmt bevorzugt ein „Pro“-iPhone (mit Notch/Dynamic Island). Für ein
  bestimmtes Modell die Zeile `pro = [...]` z. B. auf `"16 Pro" in d["name"]` ändern.

Davor muss der Simulator-Build gebaut worden sein. Das alte Geräte-Archiv vorher löschen, sonst
findet das Skript womöglich die falsche `.app`:

```bash
rm -rf src-tauri/gen/apple/build/*.xcarchive
npx tauri ios build --no-sign --archive-only --target aarch64-sim
bash scripts/ios-simulator-screenshot.sh ios-screenshots
```

---

## Werte im Workflow (`.github/workflows/build.yml`)

| Was | Wo | Anpassen, wenn … |
|---|---|---|
| NDK-Version `28.2.13676358` | Android-Job: Schritt *NDK installieren* **und** `NDK_HOME=…` beim Build | deine App eine andere NDK-Version braucht. Beide Stellen müssen übereinstimmen. |
| Rust-Targets Android | `targets: aarch64-linux-android,armv7-linux-androideabi,x86_64-linux-android` | du andere Architekturen baust. Passend zu `--target` in `build:android`. |
| Rust-Targets iOS | `targets: aarch64-apple-ios,aarch64-apple-ios-sim` | in der Regel nie |
| `.ipa`-Name | Schritt *IPA packen* | immer (siehe oben) |
| Upload-Pfade | `path: src-tauri/target/release/bundle/...` | dein Tauri-Ordner nicht `src-tauri` heißt |
| Node-Version | `node-version: 22` | dein Projekt eine andere braucht |

Signierte Android-Builds brauchen außerdem die Secrets `ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEY_ALIAS` und `ANDROID_KEY_PASSWORD`. Ohne sie entsteht eine unsignierte APK.

## Stolperfallen

- **Zeilenenden:** Shell-Skripte müssen mit LF gespeichert sein, sonst bricht `bash` mit Fehlern wie
  `$'\r': command not found` ab. Die mitkopierte `.gitattributes` (`*.sh text eol=lf`) sorgt dafür.
  Bei Skripten, die vorher schon mit CRLF eingecheckt waren, einmal
  `git add --renormalize .` ausführen und committen.
- **Ausführen statt aufrufen:** Im Workflow werden die Skripte mit `bash scripts/…` gestartet. Das
  Ausführungsrecht (`chmod +x`) ist deshalb nicht nötig.
- **Arbeitsverzeichnis:** Alle Pfade sind relativ zum Projektordner. Aus einem Unterordner
  aufgerufen, finden die Skripte nichts.
- **`gen/apple`** wird im Workflow bei jedem Lauf neu erzeugt (`tauri ios init --ci`) und muss nicht
  im Repository liegen. Eigene Änderungen am Xcode-Projekt gehen dadurch bei jedem Lauf verloren.
