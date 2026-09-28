# Zusammenarbeit

## Browser und E2E

- Keinen eigenen Dev-Server starten. Der Benutzer startet Mysteryland selbst; seine angezeigte URL verwenden und keinen Server aus einem Schwester-Repo übernehmen.
- E2E mit Playwright gegen `http://localhost:4322` ausführen; `PLAYWRIGHT_BASE_URL` kann eine ausdrücklich abweichende URL vorgeben. Die Konfiguration startet bewusst keinen Webserver.
- Sichtbare Prüfung in Google Chrome: `npm run test:e2e:ui` oder `npm run test:e2e:debug`; Tests sequenziell ausführen. Zusätzlich die Website in einem separaten Chrome-Tab zur Übergabe geöffnet lassen. Der In-App-Browser ersetzt diese Prüfung nicht.

## Terminal in VS Code mitlesen

- Shell-Befehle fuer dieses Repo ueber `node scripts/dev/codex-terminal.mjs run -- <programm> <argumente...>` ausfuehren. Beispiel: `node scripts/dev/codex-terminal.mjs run -- git status --short`. Fuer Shell-Syntax explizit die passende Shell als Programm uebergeben. Bestehende Sandbox-/Freigaberegeln gelten unveraendert.
- Lokales Protokoll: `.local/codex-terminal.log`; VS Code: `Tasks: Run Task` → `Codex: Terminal live`. Node muss im PATH sein; Codex CLI ist nicht erforderlich. Der Viewer funktioniert auf macOS und Windows.
- Erfasst werden nur Befehle ueber diesen Starter, inklusive stdout/stderr und Exitcode. Datei-Edits per Werkzeug sowie Browser-/Connector-Aktionen sind keine Terminal-Ausgabe. Keine Geheimnisse als Argumente oder Ausgabe erzeugen; der Starter nimmt keine automatische Redaktion vor. Logs nicht committen.
- Aktive Viewer mit Ctrl+C beenden. Alte Logs bei Bedarf zwischen Befehlen entfernen. Der Starter wird identisch in den vier Repos gepflegt, damit jedes Repo unabhaengig auf den Dev-Geraeten funktioniert.
