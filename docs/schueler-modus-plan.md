# Schüler-Modus – Plan

Stand: 2026-10-28. Kurzfassung, was angelegt oder geändert wird und welche Annahmen gelten.

## Was es in der Codebasis gibt (und was nicht)

| Gesucht | Gefunden |
|---|---|
| ShiftCheckDialog.tsx | `app/src/features/shifts/ShiftCheckDialog.tsx` |
| WeekCalendar.tsx | `app/src/features/shifts/WeekCalendar.tsx` (nur im Advanced-Modus, Flag `weekCalendar`) |
| WageCheckPage.tsx | `app/src/features/more/WageCheckPage.tsx` |
| TaxAppCard | `app/src/features/advanced/TaxAppCard.tsx` (nur mit Flag `partnerRecommendations`, erst ab 16) |
| PeerStats | `app/src/features/advanced/PeerStatsPage.tsx` |
| Limit-/Fortschrittsbalken | `app/src/components/ProgressBar.tsx`, Zeilen in `features/dashboard/RoleLimits.tsx` |
| Kurzfristige Beschäftigung | `packages/core/src/combinations.ts` (`shortTermProfessionalRisk`), `shortDays` in `core/src/index.ts` |
| Nutzerprofil | `Profile` in `packages/core/src/types.ts`, Persistenz in `app/src/lib/storage.ts` |
| Job-Vorlagen / Jobbörse | `packages/core/data/jobPresets.ts`, `features/advanced/JobBoardPage.tsx` |
| PDF-Export | `app/src/lib/pdf.ts` (`makeTextPdf`, reiner Text, ohne Library) |
| **Benachrichtigungssystem** | **fehlt.** Es gibt nur das Hinweisband auf der Übersicht (`syncNotice`). |
| **Teilbare Links** | **fehlen.** Keine Sharing-Infrastruktur; der Server ist ein lokaler Demo-Server. |

## Datenmodell

- `Profile` (Core) bekommt optionale Felder, damit alte Stände gültig bleiben:
  `birthDate`, `isFullTimeSchoolObligated`, `bundesland`, `schoolSchedule` (wöchentliche Blöcke),
  `schoolHolidays` (Zeiträume), `familyReceivesBasicIncome`, `parentalConsent` (Checkliste je Job),
  `afterSchool` („Was machst du danach?“), `graduationDate`, `medicalExamDate`.
- `status`: Die App nutzt englische Werte (`'Pupil'`, `'Student'` …). Ich benenne nichts um, sondern ergänze
  `'School leaver'` und `'Apprentice'`. Zuordnung: schueler = `Pupil`, schulabgaenger = `School leaver`,
  student = `Student`, azubi = `Apprentice`.
- `age` bleibt (Altdaten). Wenn `birthDate` gesetzt ist, wird das Alter daraus zum jeweiligen Stichtag berechnet.
- Schüler-Modus = abgeleitet: unter 18 **oder** Status `Pupil`. Kein eigener Schalter.
- `Shift` bekommt `breaks?: { start, end }[]` für die Pausenregel.
- `Job` bekommt `tags?: JobTag[]`. Die Tags kommen aus der Vorlage (`jobPresets.ts`); für alte Jobs ohne Tags
  werden sie aus dem WZ-Code abgeleitet (56 → Gastronomie, 47 → Verkauf …).
  Außerdem `incomeTaxWithheld?: boolean` („Auf meiner Abrechnung wird Lohnsteuer abgezogen“) für den Steuer-Hinweis.

## Neue Module (UI-frei, in `packages/core`)

- `src/rules/legalConstants.ts` – alle Grenzwerte mit Paragraf und `validFrom`. Euro-Grenzen, die es schon in
  `data/limits.ts` gibt (Minijob-Grenze, Grundfreibetrag, Mindestlohn), werden **nicht doppelt** gepflegt,
  sondern über Funktionen aus `limits.ts` gelesen. So gibt es eine Quelle der Wahrheit.
- `src/rules/youthLabor/` – reine Funktionen `checkYouthLabor(profile, jobs, shifts, range, today)` →
  `RuleViolation[]`. Datum wird immer übergeben, nie `new Date()` in der Logik.
- `src/rules/money.ts` – Mindestlohn-Ausnahme, Bürgergeld-Freibeträge, Steuererstattung.
- `src/rules/transitions.ts` – 18. Geburtstag, Schulabschluss.
- `src/rules/jobTags.ts` – Zuordnung Tag → Regel (Akkord, gefährlich, JuSchG).

## Annahmen

1. Gruppe A (Kinderregeln) gilt für 13–14 immer und für vollzeitschulpflichtige 15–17 außerhalb der Ferien.
   In den Ferien gilt Gruppe B nur ab 15 (§ 5 Abs. 4 nennt Jugendliche). 13–14 bleiben auch in den Ferien bei Gruppe A.
2. Schichten ohne Start- und Endzeit können Nachtruhe, Unterrichtszeit, Pausen und Ruhezeit nicht prüfen.
   Dann gibt es eine `info`-Meldung „Trag Start und Ende ein“, keinen Fehler.
3. Ferien und Stundenplan trägt der Nutzer selbst ein. Es gibt keine Ferien-Datenquelle pro Bundesland.
4. Die 4-Wochen-Ferienjob-Grenze wird als 20 Arbeitstage gezählt (wie vorgegeben).
5. Vergleichs-Stundenlöhne für Jugendliche: Ich habe keine belastbare amtliche Quelle. Die Tabelle wird als
   pflegbare Konstante angelegt, bleibt aber leer (`null`). Bis dahin vergleicht die App mit dem Mindestlohn
   als Orientierung und verlinkt den Entgeltatlas. Keine erfundenen Zahlen.
6. Rechtswerte, die nicht schon im Projekt geprüft sind, stehen mit `verified: false` und Prüfnotiz in
   `legalConstants.ts`. Regeln, die daran hängen, melden höchstens `warning`, nie `error`, solange ungeprüft –
   Ausnahme: die bereits geprüften §§ 8, 11, 14 JArbSchG.
7. Benachrichtigungen: Weil es kein System gibt, nutze ich das bestehende Hinweisband-Muster der Übersicht.
   Push-Benachrichtigungen wären ein eigenes Thema (Service Worker, Erlaubnis).
8. Teilbarer Link für Eltern: nicht umgesetzt, siehe Vorschlag unten. PDF-Export wird umgesetzt.
9. Phase 5 („Ausblenden und Vereinfachen“) ist in der Vorgabe abgeschnitten. Ich setze sie nicht auf Verdacht um.

## Vorschlag teilbarer Link (nicht umgesetzt)

Headroom verspricht „Deine Angaben bleiben auf diesem Gerät“. Zwei Wege:
- **A (empfohlen): Daten im URL-Fragment** (`#r=…`, komprimiert). Das Fragment geht nie an einen Server.
  Eine schreibgeschützte Ansicht liest es aus. Nachteil: Link ist lang, wer ihn hat, sieht die Daten.
- **B: Server-Snapshot** mit zufälliger ID und Ablaufdatum. Kürzerer Link, aber Daten verlassen das Gerät;
  braucht Einwilligung der Eltern (unter 16: DSGVO Art. 8) und einen echten Server.

## Keine neuen Libraries

PDFs laufen über das vorhandene `makeTextPdf`.

## Stand nach Umsetzung (2026-10-28)

| Phase | Stand |
|---|---|
| 1 Schutz vor Regelverstößen | fertig. `packages/core/src/rules/youthLabor/`, Anzeige in ShiftCheckDialog, WeekCalendar, Übersicht (Zeile „Jugendarbeitsschutz“ und „Ferienjob-Tage“), Profilfelder in den Einstellungen. |
| 2 Geld und Rechtliches | fertig. `rules/money.ts`; WageCheckPage, BasicIncomeCard, TaxAppCard (Erstattungshinweis), Schulabgänger in `combinations.ts`. |
| 3 Eltern und Organisatorisches | fertig bis auf den teilbaren Link (siehe Vorschlag oben). Neue Seite „Eltern“ unter „Mehr“; `rules/medicalExam.ts`, `rules/jobTags.ts`. |
| 4 Automatische Übergänge | fertig. `rules/transitions.ts`, Hinweisband auf der Übersicht. |
| 5 Ausblenden und Vereinfachen | fertig. Zentrale Liste in `app/src/config/studentMode.ts`: Partner/Werbung, Premium, Lohn-Statistik, Firmensuche und Jobbörse aus; Werkstudenten-Art und reine Hochschul-Vorlagen weg; Grenzwerte-Seite nur mit geltenden Grenzen; BAföG-Schalter nur, wenn eine BAföG-Grenze für den Status gilt. Nach bestätigtem 18. Geburtstag wieder sichtbar. |

Prüfung der Rechtswerte: JArbSchG §§ 2, 5, 8, 11, 13–17, 22, 23, 32, MiLoG § 22 und SGB II §§ 11a, 11b
am 2026-10-28 auf gesetze-im-internet.de nachgelesen. Ungeprüft (nur Hinweise): Name „Bürgergeld“
(Umbenennung angekündigt), 4 Jahre Steuererklärung rückwirkend, Schulabgänger-Regel aus den
Geringfügigkeits-Richtlinien, JuSchG-Verweise.

Nebenbei geändert: `makeTextPdf` schreibt Umlaute, ß, § und € jetzt korrekt (WinAnsi statt „fur“),
die Grenzwert-Liste läuft auf 375 px nicht mehr über den Rand.
