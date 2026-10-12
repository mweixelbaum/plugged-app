# plugged.host-App aufs iPhone bringen (ohne Mac)

Die App für das iPhone wird auf GitHub als **unsignierte `.ipa`** gebaut. Apple lässt nur signierte
Apps auf dem iPhone zu. Das Programm **Sideloadly** signiert die `.ipa` unter Windows mit deiner
normalen Apple-ID und installiert sie per Kabel. Das kostet nichts. Ein Apple-Developer-Konto ist
nicht nötig.

## Was du brauchst

- einen Windows-PC
- dein iPhone und ein passendes **USB-Kabel**
- eine **Apple-ID** (die normale, mit der du auch im App Store bist, reicht)
- ein GitHub-Konto (GitHub gibt Build-Dateien nur angemeldeten Nutzern zum Download)

## 1. Die `.ipa` herunterladen

1. Öffne <https://github.com/mweixelbaum/plugged-app/actions> und melde dich bei GitHub an.
2. Klicke auf den obersten Lauf von **Build** mit grünem Haken.
3. Scrolle ganz nach unten zu **Artifacts** und lade **`ios`** herunter.
4. Entpacke die ZIP-Datei. Darin liegt `plugged.ipa`.

> Ein neuer Build entsteht automatisch bei jedem Push auf `master`. Manuell startest du ihn unter
> *Actions → Build → Run workflow*.

## 2. Sideloadly einrichten (einmalig)

1. Installiere **iTunes** und **iCloud** in der Version **von der Apple-Webseite**, nicht aus dem
   Microsoft Store. Sideloadly braucht deren Gerätetreiber, die Store-Versionen funktionieren damit
   oft nicht.
   - iTunes: <https://www.apple.com/de/itunes/> (unter „Andere Versionen“ bzw. „Windows“)
   - iCloud für Windows: über die Apple-Supportseite
2. Lade Sideloadly von **<https://sideloadly.io/>** herunter und installiere es. Nimm wirklich nur
   diese Seite, es kursieren Fälschungen.

## 3. iPhone vorbereiten

1. iPhone per Kabel mit dem PC verbinden und entsperren.
2. Auf die Frage **„Diesem Computer vertrauen?“** mit **Vertrauen** antworten und den Code eingeben.

## 4. App installieren

1. Sideloadly starten. Oben sollte dein iPhone erscheinen.
2. `plugged.ipa` auf das große IPA-Feld ziehen.
3. Bei **Apple account** deine Apple-ID eintragen.
4. Auf **Start** klicken und dein Apple-ID-Passwort eingeben.
5. Ist die Zwei-Faktor-Authentifizierung aktiv, erscheint ein Code auf deinem iPhone bzw. einem
   anderen Apple-Gerät. Diesen Code in Sideloadly eingeben.
6. Warten, bis unten **„Done.“** steht. Die App ist jetzt auf dem Home-Bildschirm, startet aber noch
   nicht.

> Sideloadly meldet sich mit deiner Apple-ID direkt bei Apple an. Wer das mit seinem Hauptkonto
> nicht möchte, legt sich eine zweite, kostenlose Apple-ID nur dafür an.

## 5. App auf dem iPhone freigeben (einmalig)

**Entwicklermodus einschalten** (ab iOS 16):

1. *Einstellungen → Datenschutz & Sicherheit → Entwicklermodus* einschalten.
2. Das iPhone startet neu. Danach die Abfrage mit **Aktivieren** bestätigen und den Code eingeben.

> Der Punkt „Entwicklermodus“ erscheint erst, nachdem Sideloadly eine App installiert hat.

**Deinem Entwicklerprofil vertrauen:**

1. *Einstellungen → Allgemein → VPN & Geräteverwaltung*.
2. Unter *Entwickler-App* deine Apple-ID antippen.
3. **„… vertrauen“** antippen und bestätigen.

Jetzt startet die App.

## Nach 7 Tagen: App erneuern

Mit einer kostenlosen Apple-ID ist die Signatur nur **7 Tage** gültig. Danach öffnet sich die App
nicht mehr. Das löst du so:

- **Von Hand:** Schritt 4 einfach wiederholen, mit derselben `.ipa` oder einer neueren.
- **Automatisch:** In Sideloadly die Option zum automatischen Erneuern (*Auto-Refresh*)
  aktivieren. Dafür muss der PC laufen, Sideloadly geöffnet bleiben und das iPhone im selben
  WLAN sein (oder angesteckt).

## Grenzen der kostenlosen Apple-ID

- Höchstens **3** selbst installierte Apps gleichzeitig.
- Die App ist **nur für dich**. Andere Personen müssen die `.ipa` selbst mit ihrer eigenen Apple-ID
  installieren. Verteilung über TestFlight oder den App Store geht nur mit einem bezahlten
  Apple-Developer-Konto (99 $/Jahr).

## Probleme

| Problem | Lösung |
|---|---|
| Sideloadly zeigt kein iPhone an | Kabel prüfen, iPhone entsperren, „Diesem Computer vertrauen“ bestätigen. iTunes/iCloud von der Apple-Webseite installieren (nicht Microsoft Store). |
| „Nicht vertrauenswürdiger Entwickler“ beim Öffnen | Schritt 5: Profil unter *VPN & Geräteverwaltung* vertrauen. |
| „Entwicklermodus erforderlich“ | Schritt 5: Entwicklermodus einschalten. |
| App öffnet sich nach einigen Tagen nicht mehr | Die 7 Tage sind abgelaufen. App erneut mit Sideloadly installieren. |
| Fehler wegen zu vieler Apps | Eine andere selbst installierte App löschen (maximal 3). |
| Anmeldung bei Apple schlägt fehl | Passwort prüfen, 2FA-Code eingeben. Alternativ eine zweite Apple-ID verwenden. |

## Alternative: AltStore

Statt Sideloadly geht auch **AltStore** (<https://altstore.io/>). Dafür installierst du **AltServer** auf dem PC
und die AltStore-App auf dem iPhone. AltStore kann die App dann im WLAN automatisch erneuern, solange
AltServer auf dem PC läuft. Die Einrichtung ist etwas aufwendiger, die Grenzen sind dieselben
(7 Tage, 3 Apps).
