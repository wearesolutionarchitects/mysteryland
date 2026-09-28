# Lokale Social-Werkstatt

Im vom Benutzer gestarteten Mysteryland-Dev-Server: <http://localhost:4322/__social/> oder <http://127.0.0.1:4322/__social/>. Kein zusätzlicher Server nötig. Nach dem ersten Einbau der Vite-Konfiguration muss ein bereits laufender Dev-Server gegebenenfalls vom Benutzer neu gestartet werden.

1. Event und Phase auswählen: Ankündigung vor dem Event oder Rückblick danach.
2. Eigene Texte, bis zu fünf Hashtags und Galeriebilder auswählen. Vorhandene Social-Vorgaben dienen nur bei Ankündigungen als Ausgangspunkt; Rückblicke beginnen ohne übernommene Ankündigung.
3. Medien und Texte erzeugen. Die Werkstatt verwendet den bestehenden `event:social`-Generator mit den Formaten für Facebook, Instagram und WhatsApp.
4. Je Plattform den vollständigen Text und das Zielprofil kuratieren und speichern. Sichtbarkeit/Empfängerkreis ist optional: leer bedeutet, die bestehende Plattform-Einstellung zu verwenden. Bilder anklicken, um sie herunterzuladen.
5. Den gespeicherten Stand ausdrücklich freigeben. Änderungen am Text oder Ziel heben die Freigabe auf. Die Freigabe enthält auch Prüfsummen der Medien.
6. Text kopieren, Plattform in Chrome öffnen und dort den Beitrag mit den freigegebenen Medien und dem festgelegten Publikum vorbereiten. Die Werkstatt klickt nicht automatisch auf „Veröffentlichen“. Bei Agent-Unterstützung gilt weiterhin die ausdrückliche Freigabe des konkreten Beitrags vor dem finalen Klick. Chrome-/Playwright-Unterstützung erfolgt separat im bestehenden Browserablauf; keine Zugangsdaten in der Werkstatt speichern.
7. Nach tatsächlicher Veröffentlichung den Beitragslink hinterlegen. Für einen WhatsApp-Status ohne dauerhaften Link eine eindeutige Bestätigung mit Ziel/Empfängerkreis hinterlegen. Das ist eine manuelle Dokumentation, kein automatischer Plattformnachweis.

„Neue Beitragsrunde“ archiviert den bisherigen Stand einschließlich Freigaben und Veröffentlichungsbelegen. Danach können andere Medien und Texte erzeugt werden. Bestehende Bildpakete bleiben erhalten. Veröffentlichte Einzelbeiträge sind unveränderlich; die andere Phase bleibt unabhängig.

## Trennung von mysteryland.biz

- Die Werkstatt ist ein Vite-Plugin mit `apply: 'serve'` und ausschließlich `configureServer`; sie erzeugt keine Astro-Seite und keine Produktionsroute. Es gibt keine Links dazu auf der öffentlichen Website.
- HTTP-Zugriff ist auf Loopback-Adressen und localhost/127.0.0.1/::1 als Host beschränkt. Schreibzugriffe verlangen dieselbe Origin; kein CORS, kein Framing, keine externen Ressourcen.
- Entwürfe, Historie, Freigaben und Bildpakete liegen im ignorierten `.social/`. Der bestehende CLI-Export bleibt unter dem ebenfalls ignorierten `social-outbox/`. Event-MDX wird nicht verändert.
- `npm run build` prüft nach dem Astro-Build `dist/` auf lokale Routen, Verwaltungsoberfläche und Outbox-Verzeichnisse. Damit greift die Prüfung auch in CI/CD vor dem Upload des Artefakts.
- Die Grenze betrifft die veröffentlichte Website. Quellcode im GitHub-Repository ist davon unabhängig. Lokale Daten müssen bei einem Rechnerwechsel separat gesichert werden.

## Prüfung

`npm test` prüft Phasentrennung, Freigaben, konkurrierende Änderungen, Medienänderungen, lokale Zugriffsgrenzen und den Build-Check. `npm run test:e2e -- tests/e2e/social-workspace.spec.ts` prüft Chrome gegen den vorhandenen Dev-Server; Playwright startet keinen Server.
