# Headroom – Regeln für Claude

Entwurf vom 30.10.2026. Gilt für jede Sitzung in diesem Repo.

## Arbeitsablauf (Compound-Engineering-Skills)

Nutze diese Skills von selbst, ohne dass ich sie aufrufen muss. Sag in einem Satz, welchen du startest.

| Situation | Skill |
|---|---|
| Neue Funktion oder Idee, noch unklar was genau | `ce-brainstorm` |
| Anforderungen sind klar, es fehlt der Bauplan | `ce-plan` (baut auf dem Plan in `docs/plans/` auf) |
| Ein Plan liegt vor und soll umgesetzt werden | `ce-work` |
| Größere Aufgabe von Idee bis fertigem Code, ich sage „mach komplett“ | `lfg` |
| Fehler, falsches Rechenergebnis, Test schlägt fehl | `ce-debug` |
| Vor jedem Commit mit mehr als einer kleinen Änderung | `ce-code-review` |
| Commit oder PR erstellen | `ce-commit` bzw. `ce-commit-push-pr` |
| Nach einem gelösten, lehrreichen Problem | `ce-compound` (Erkenntnis festhalten) |
| Entscheidung „sollen wir Technik X einsetzen?“ | `ce-pov` |

Ausnahmen: Tippfehler, Ein-Zeilen-Fixes und reine Fragen ohne Skill erledigen.

## Entwicklungsprozess

### Ablauf einer Änderung

1. **Klären:** Was soll sich für wen ändern? Bei Unklarheit erst `ce-brainstorm`, nicht raten.
2. **Planen:** Ab etwa drei Dateien oder einer neuen Regel ein Plan in `docs/plans/` (`ce-plan`).
3. **Branch:** Nie direkt auf `main` arbeiten. Ein Branch pro Thema: `feature/…`, `fix/…`, `redesign/…`, `docs/…`.
4. **Bauen:** In kleinen Schritten, jeder Commit lauffähig. Erst Core-Logik mit Tests, dann UI.
5. **Prüfen:** Checkliste „Fertig heißt“ unten abarbeiten, dann `ce-code-review`.
6. **Zusammenführen:** Erst nach meinem Okay nach `main` mergen. Nichts pushen, solange ich es nicht sage.

### Fertig heißt

- `npm test` läuft durch.
- `npm run build` läuft durch; bei Server-Änderungen zusätzlich `npx tsc --noEmit -p server/tsconfig.json`.
- Neue oder geänderte Regel in `packages/core`: Tests mit festem Datum, mindestens ein Fall knapp unter, einer genau auf und einer über der Grenze.
- Geänderter Grenzwert: Quelle, Gültigkeitsdatum und Prüfstatus aktualisiert.
- UI-Änderung: im Browser angesehen, hell und dunkel, Handybreite; Text auf Deutsch und Englisch.
- Geänderter Ablauf (Onboarding, Schicht erfassen, Import): `npm run test:e2e`.
- README und `docs/Headroom-Konzept-und-Projektstand.md` angepasst, wenn sich Funktionen oder Datenflüsse ändern.

### Commits

- Ein Commit pro abgeschlossenem Schritt, nicht „alles auf einmal“.
- Keine Fremddateien mitcommitten (z. B. `brag-output*`, `dist`, Screenshots), außer ich will es.
- Keine Zugangsdaten, Tokens oder echten Personendaten ins Repo; Beispielprofile bleiben erfunden und als Beispiel gekennzeichnet.

### Backend und Sicherheit

- Jeder neue Endpunkt: Eingaben prüfen, Rate-Limit, keine Klardaten im Log. Vor dem Merge `security-reviewer`.
- Neue gespeicherte Daten brauchen vorher eine Antwort auf: Wozu, wie lange, wie wird gelöscht?

### Wenn etwas schiefgeht

- Fehler zuerst mit einem Test nachstellen, dann beheben (`ce-debug`).
- Nichts löschen, zurücksetzen oder überschreiben, ohne zu fragen.

## Projekt

- Monorepo mit npm-Workspaces (kein pnpm): `app/` (React-PWA), `packages/core/` (reine Berechnungen), `server/` (optionaler Demo-Server), `desktop/` (Electron).
- Vor dem Abschluss einer Änderung: `npm test`. Bei UI-Änderungen zusätzlich im Browser prüfen (`npm run dev`).
- Berechnungen und Regeln gehören nach `packages/core`, nicht in Komponenten. Funktionen bekommen das Datum übergeben, nie `new Date()` in der Logik.

## Fachliche Regeln

- Jeder Grenzwert steht in `packages/core/data/limits.ts` mit Quelle, Gültigkeitsdatum und Prüfstatus. Keine Zahl erfinden: Ohne amtliche Quelle bleibt der Wert leer oder `verified: false`.
- Headroom informiert und berät nicht. Texte sagen „gilt in der Regel“, nie „du musst“ oder „du darfst“ als Rechtsauskunft.
- Demo-Funktionen bleiben hinter dem Advanced-Modus (`app/src/config/features.ts`) und sind standardmäßig aus.
- Schüler-Modus (unter 18 oder Status Schüler:in): keine Partner-, Premium- oder Steuer-App-Hinweise.

## Gestaltung und Sprache

- Design nach `design-system/headroom/MASTER.md`. Keine neuen Farben oder Schriften.
- Pro Bildschirm eine Hauptaussage, eine Hauptaktion. Status immer als Wort plus Farbe.
- UI-Texte auf Deutsch und Englisch pflegen, Klartext statt Fachbegriff.
- Commit-Nachrichten auf Deutsch, kurz und beschreibend (wie in der bisherigen Historie).

## Daten

- Nutzerdaten bleiben auf dem Gerät. Neue Datenflüsse zu einem Server nur mit gesonderter Einwilligung und Eintrag im README-Abschnitt „Datenschutz und Datenfluss“.
