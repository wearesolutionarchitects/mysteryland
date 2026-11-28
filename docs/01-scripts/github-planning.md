# GitHub-Planung und Automatisierung

## Label-Taxonomie

Labels für die Arbeitssteuerung verwenden ein Präfix. Pro Dimension soll ein Issue möglichst genau ein Label tragen:

- `type:` beschreibt die Art der Arbeit.
- `area:` beschreibt den hauptsächlich betroffenen Bereich.
- `status:` beschreibt den nächsten notwendigen Schritt.
- `priority:` beschreibt die relative Dringlichkeit.
- `stage:` beschreibt die Phase eines Events.
- `automation:` markiert Vorgänge, die GitHub-Automatisierung betreffen.

Künstler-Labels dienen als fachliche Filter. Sie tragen den Künstlernamen ohne Präfix und die Farbe `#0052cc`. Die Beschreibung enthält die offizielle Website oder, falls es keine gibt, das erste belegte offizielle Profil in der Reihenfolge Facebook, Instagram, YouTube. Fehlt ein Beleg, bleibt die Beschreibung leer. Auftrittsnamen derselben Band werden unter dem gemeinsamen Künstlerlabel erfasst. Stadt und Spielstätte werden in den GitHub Issue Fields `City` und `Venue` erfasst. Neue Automationen sollen sich für die Arbeitssteuerung nur auf die präfixierten Steuerungslabels verlassen.

## Empfohlenes Project-Setup

Ein organisationsweites Project sollte Issues und Pull Requests aus diesem Repository aufnehmen. Sinnvolle Felder sind `Status`, `Priority`, `Type`, `Area`, `Event date` und `Event stage`.

Empfohlene Workflows im Project:

1. Neue Issues und Pull Requests automatisch aufnehmen.
2. `status: needs-triage` in den Status `Triage` überführen.
3. `status: ready` in den Status `Ready` überführen.
4. Geschlossene Vorgänge auf `Done` setzen.
5. Das Veranstaltungsdatum aus dem Issue Field `Start date` im Project anzeigen. Die Bearbeitungsphase kann als separates Project-Feld gepflegt werden.

## Ein Issue pro Event

Das Issue-Formular `Neues Event` setzt den Issue-Typ `Event`. Jedes Issue beschreibt genau ein Event. Veranstaltungsdatum, Stadt, Spielstätte, Veranstalter und Preis werden in den angepinnten Issue Fields gepflegt. Die belegten Acts erhalten Künstlerlabels. Der Issue-Text enthält Kategorie und Quellen sowie bei Bedarf Rollen, Running Order und weitere Angaben zur Event-Page.

Damit bleiben die Verantwortlichkeiten klar:

- Das Issue ist die kanonische Planungs- und Intake-Einheit.
- Die MDX-Datei ist die kanonische veröffentlichte Inhaltsquelle.
- `src/scripts/event/render.ts` bleibt die zentrale Ausgabe-Logik.
- Nachgelagerte Skripte ergänzen nur ihren jeweiligen Bereich.
- Eine spätere Action darf die Event-MDX aus dem Issue erzeugen, soll aber keine zweite Render-Implementierung enthalten.

Labels eignen sich für repoübergreifende Trigger und Actions. Project-Felder eignen sich besser für Planung, Ansichten und Auswertungen. Beide sollten nicht dieselbe Information doppelt als konkurrierende Wahrheiten pflegen.
