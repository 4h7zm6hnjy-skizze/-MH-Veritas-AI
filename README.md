# MH Veritas AI – Version 0.2.1

**Entwicklungsstand, keine zertifizierte Medizin-/Rechtssoftware.**

## Änderungen in v0.2.0

- Zurück-Schaltfläche in Kopfzeile und Einstellungen.
- Sichtbare Versionsnummer, „Nach Updates suchen“ und „Update installieren“ mit Service-Worker-Prüfung.
- Das lokal gewählte KI-Modell wird im verschlüsselten Datentresor gespeichert und bei neuem Start automatisch wieder initialisiert.
- WebLLM-Modellgewichte werden ausdrücklich in IndexedDB zwischengespeichert. Das Gerät muss die GPU bei jedem App-Neustart erneut initialisieren. Ggf. braucht die Bibliothek Internet; der Cache kann von iOS/Safari geleert werden.
- Prüfung des Speicherstatus und optionaler Antrag auf dauerhaften Browserspeicher.

## WICHTIG: GitHub-Upload

Dieses Paket ist **flach** und speziell für deinen GitHub-iPhone-Upload erstellt: Alle Dateien direkt im **Repository-Hauptverzeichnis** hochladen; vorhandene Dateien ersetzen. **Keine ZIP-Datei selbst hochladen.**

Im Repository auf GitHub Pages: main / (root) aktivieren.

### Daten und Datenschutz

Chats und Dokumente liegen lokal AES-GCM-verschlüsselt im Browser-Tresor. Das WebLLM-Modell ist öffentlich zugänglich und liegt unverschlüsselt in seinem Browsercache; keine privaten Informationen werden dort gespeichert. Das WebLLM-Skript und Modellgewichte kommen bei erstmaligem Laden von Drittservern. Es gibt keine unabhängige Faktenkontrolle. Verschlüsselte Backups regelmäßig exportieren. Keine medizinischen oder juristischen Entscheidungen auf KI-Ausgaben allein stützen.

### Funktionstest auf dem iPhone

1. ZIP entpackt hochladen und App aktualisieren.
2. Tresor entsperren, Einstellungen öffnen, Modell auswählen und einmal vollständig laden.
3. „Modellspeicher schützen & prüfen“ nutzen (Zustimmung kann durch iOS verweigert werden).
4. App vollständig schließen und erneut öffnen; Tresor entsperren.
5. Die App sollte die gespeicherte Auswahl automatisch aufrufen und das Modell wieder starten. Falls der Cache fehlt oder die KI-Bibliothek offline nicht lädt, erscheint eine konkrete Fehlermeldung.
6. Im Einstellungsbereich „Nach Updates suchen“ testen; ohne neue Version wird „Kein neueres Update“ angezeigt.

# MH Veritas AI – Version 0.1.0

**Status: Entwicklungsstand / erste lokale, funktionale PWA.** Keine freigegebene medizinische Software, keine Rechtsberatung, kein Ersatz für medizinische Fachinformation. Keine Garantie für Richtigkeit generierter Antworten.

## Enthalten

- Installierbare, responsive Progressive Web App (iPhone, Android, PC)
- Getrennte Bereiche Chat, Medizin, Medikamente, Recht, Dokumente
- Browser-lokales KI-Textmodell über WebLLM (modellabhängig, erst nach manuellem Herunterladen)
- Sicherheitsvorgaben im Systemprompt, sichtbare Kennzeichnung „nicht unabhängig geprüft“
- AES-GCM-verschlüsselter Datentresor, PBKDF2-SHA256, 310.000 Iterationen, kryptographischer Zufall
- Lokale Unterhaltungen, Dokumentenablage, TXT/MD/CSV/JSON und bei unterstützten Browsern DOCX-Textextraktion
- PDF und Bilder können **gespeichert**, aber in dieser Version **noch nicht automatisch analysiert** werden. Kein OCR.
- Sichere Backup-Export-/Importfunktion (verschlüsselter JSON-Tresor)
- Optionale Gerätesprachausgabe. Diktat nur, wenn der Browser eine tatsächlich lokal arbeitende Spracherkennung nachweislich unterstützt (sonst deaktiviert)
- Web-App-Integration als Link/Button, optional iframe; keine automatische Datenfreigabe

## Installation

1. Den **Inhalt des ZIP-Ordners**, nicht den ZIP-Ordner als Unterordner, auf einen statischen **HTTPS-Webhost** hochladen (z. B. Netlify oder GitHub Pages). Alternativ auf dem PC lokal unter `http://localhost` mit einem Webserver starten.
2. Die URL in Safari/Chrome öffnen; über „Zum Home-Bildschirm“ oder „App installieren“ hinzufügen.
3. Ein Passwort mit mindestens 10 Zeichen wählen. **Wichtig:** Bei Passwortverlust sind die Inhalte nicht rekonstruierbar.
4. **Einstellungen → Modell auswählen & laden**. Die App lädt dabei eine WebLLM-JavaScript-Bibliothek von `https://esm.run` und Modelldateien aus dem WebLLM-Modellkatalog. Für das erstmalige Laden ist Internet nötig; die Größe kann erheblich sein. **Inhalt des Chats wird dafür nicht bewusst versendet**. Netzwerkanfragen für Modell-/Bibliotheksdownload geben dem jeweiligen Server aber technisch Metadaten (z. B. IP-Adresse) preis.
5. Nach Abschluss des Modell-Downloads im KI-Chat schreiben.

## Sehr wichtige Grenzen

- Die App lädt **keine Chatdaten auf einen eigenen Cloudserver**. Die eingebundene Modellbibliothek stammt allerdings von einem Fremdserver und ist in dieser Erstversion nicht sicherheitsauditiert; für vertrauliche Gesundheits- oder Rechtsdaten ist diese Version deshalb noch nicht zur produktiven Nutzung freigegeben. Sie ist aber **nicht vollkommen netzwerkfrei**: beim Modell-/Bibliotheksdownload werden fremde Domains kontaktiert. Diese Abhängigkeiten sind noch nicht lokal gebündelt oder unabhängig auf Sicherheit auditiert.
- Das WebLLM-Paket wird als versionierte CDN-Abhängigkeit geladen. Dies wurde mangels Zugang zu den Bibliotheksservern in der Entwicklungsumgebung **nicht live durchgetestet**. Ob das konkrete Modell auf deinem iPhone oder PC tatsächlich geladen werden kann, muss im Zielbrowser getestet werden.
- Die Offline-Oberfläche arbeitet nach erstem Besuch über den Service Worker; **Offline-KI** kann erst nach vollständig geladenem und vom Browser dauerhaft gespeichertem Modell funktionieren. iOS/Browser können Daten und Cache löschen; es gibt keine Garantie für dauerhafte Offlineverfügbarkeit.
- Die App enthält **keine verlässliche aktuelle Rechts- oder Medikamentendatenbank**, keine Live-Recherche, keine verifizierte Quellenprüfung und keine unabhängige Wahrheitsprüfung. Fachbezogene Fragen deshalb nur als unverbindliche Orientierung nutzen.
- Kein KI-Modell kann garantieren, dass es Quellen und Fakten nicht erfindet. Der Systemprompt reduziert das Risiko, verhindert es aber nicht sicher.
- PDF und Bilddateien sind in v0.1.0 nur verschlüsselt ablegbar. Es wäre falsch zu behaupten, sie wären bereits auswertbar.
- Ein Plugin zur Durchsuchung deiner anderen Apps gibt es noch nicht. Der Einbindungscode öffnet ausschließlich Veritas AI; die Datentresore bleiben getrennt.
- Eine Sicherheitsprüfung durch unabhängige Fachleute, Accessibility-Audit und End-to-End-Test auf echten Mobilgeräten stehen aus.

## Datenschutz und Technik

- Browser-API: `crypto.subtle`, IndexedDB, WebGPU, Service Worker.
- Keine Cookies, keine Tracking-Skripte, keine eingebauten Analysedienste.
- Verschlüsselung erfolgt vor dem Ablegen in IndexedDB. Beim Entsperren werden Inhalte im Arbeitsspeicher entschlüsselt.
- Eine kompromittierte Browser-Erweiterung oder eine schädlich veränderte eingebundene Drittbibliothek ist dadurch **nicht** ausgeschlossen. CSP, vendored Libraries und Modellintegritätsprüfung sollten vor Verwendung mit sensiblen Echt-Daten ergänzt werden.
- Speichere regelmäßige Backups. Ältere Chats bleiben nach dem Zurücksetzen des Browsers nur durch Backup erhalten.

## Lokale Vorschau

```sh
cd verity-local-ai
python3 -m http.server 8080
```

Dann http://localhost:8080 öffnen. Modell-Downloads brauchen Internet.

## Projektstruktur

- `index.html`, `style.css`, `app.js`: Oberfläche und Bedienlogik
- `vault.js`: lokaler Verschlüsselungstresor
- `parsers.js`: lokale Dateiextraktion (Text / DOCX), keine externen PDF-Dienste
- `rules.js`: Regeln für Wahrheit, Unsicherheit, Medizin und Recht
- `sw.js`, `manifest.webmanifest`, `assets/`: PWA
- `integration/verity-embed.js`: Einbindung in andere Web-Apps

## Nächste Entwicklungsstufen

1. Bibliotheken lokal und versionsfest bündeln; auf iPhone/Android/PC testen; Sicherheits- und Datenschutzprüfung
2. PDF-Extraktion und echte lokale OCR/Bildanalyse sowie offline Spracheingabe auf geeigneten Geräten
3. Datenverbindung zu anderen Web-Apps mit expliziten Berechtigungen und bestätigter Einwilligung
4. Wahlweise verifizierte, datenschutzgeprüfte Online-Recherche mit sichtbarer Quellenkette und Datum
5. Fachliche Qualitätssicherung medizinischer/rechtlicher Abläufe; vor öffentlichen diagnostischen Funktionen regulatorische Prüfung


## Änderungen in v0.2.1 (iPhone Navigation & Anzeige)

- Menüleiste und Zurück-Button bleiben an der Oberkante der Web-App sichtbar und antippbar.
- Die Seite selbst wird gegen versehentliches Verschieben gesperrt; der Inhaltsbereich scrollt weiterhin vertikal.
- iPhone-Statusleiste auf nicht überlagerndes `black` umgestellt, da `black-translucent` in installierten iOS-Web-Apps zu Darstellungsproblemen führen kann.
- Zoomsperre über Viewport, CSS und iOS-Gesten. Das kann die Zugänglichkeit beim Vergrößern einschränken.
- Eingabefelder mobil auf mindestens 16px gestellt, damit der Fokus keinen Auto-Zoom auslöst.
- Daten-Tresor, Chatverläufe, Modellcache und Exportfunktionen unverändert.

Installation: Entpackte **Dateien** (nicht die ZIP) in den GitHub-Branch `main` hochladen und bestehende ersetzen. Danach in der App über Einstellungen → Nach Updates suchen → Update installieren aktualisieren. Im Zweifel die App schließen und neu öffnen. Vorher verschlüsseltes Backup exportieren.

Hinweis: Echte iPhone-/iOS-Versionen können sich bei Safe-Area und Zoom verschieden verhalten. Eine Geräteprüfung ist notwendig.
