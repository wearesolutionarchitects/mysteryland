# GitHub-Planung und Automatisierung

## Label-Taxonomie

Labels für die Arbeitssteuerung verwenden ein Präfix. Pro Dimension soll ein Issue möglichst genau ein Label tragen:

- `type:` beschreibt die Art der Arbeit.
- `area:` beschreibt den hauptsächlich betroffenen Bereich.
- `status:` beschreibt den nächsten notwendigen Schritt.
- `priority:` beschreibt die relative Dringlichkeit.
- `stage:` beschreibt die Phase eines Events.
- `automation:` markiert Vorgänge, die GitHub-Automatisierung betreffen.

Die bestehenden Künstler-, Orts- und Venue-Labels bleiben als fachliche Filter erhalten. Neue Automationen sollen sich jedoch nur auf die präfixierten Steuerungslabels verlassen.

## Labels synchronisieren

`src/scripts/github/labels-data.json` ist die kanonische Quelle. Der Sync ist idempotent: bestehende Labels werden aktualisiert, fehlende angelegt.

Lokal mit authentifizierter GitHub CLI:

```bash
npm run script:github:create-labels
```

Alternativ lässt sich die Action `Labels` manuell über `workflow_dispatch` starten. Sie benötigt nur das bereitgestellte `GITHUB_TOKEN` mit Schreibrecht für Issues.

## Empfohlenes Project-Setup

Ein organisationsweites Project sollte Issues und Pull Requests aus diesem Repository aufnehmen. Sinnvolle Felder sind `Status`, `Priority`, `Type`, `Area`, `Event date` und `Event stage`.

Empfohlene Workflows im Project:

1. Neue Issues und Pull Requests automatisch aufnehmen.
2. `status: needs-triage` in den Status `Triage` überführen.
3. `status: ready` in den Status `Ready` überführen.
4. Geschlossene Vorgänge auf `Done` setzen.
5. Eventdatum und Eventphase zunächst als Project-Felder pflegen; eine spätere Action kann sie aus dem strukturierten Issue-Formular übernehmen.

Labels eignen sich für repoübergreifende Trigger und Actions. Project-Felder eignen sich besser für Planung, Ansichten und Auswertungen. Beide sollten nicht dieselbe Information doppelt als konkurrierende Wahrheiten pflegen.
