# Headroom: Funktionskatalog

Stand: 31.10.2026, Branch `docs/funktionskatalog-backend`. Der Katalog beruht auf dem Code im Repo und auf `docs/schueler-modus-funktionen.txt`.

Er hält drei Dinge fest:
1. **Was die App kann**: jede Funktion, die heute gebaut ist oder geplant wird.
2. **In welcher Reihenfolge sie stabil gebaut wird**: Priorität P0 bis P3.
3. **Wann eine Funktion aktiv ist**: die Bedingung, unter der jemand sie überhaupt sieht.

Der Bauplan für das Backend steht in [`docs/plans/2026-10-31-1724-feat-backend-fundament-sync-plan.md`](plans/2026-10-31-1724-feat-backend-fundament-sync-plan.md).

## So ist der Katalog zu lesen

**Priorität**

| Stufe | Bedeutung |
|---|---|
| **P0 Fundament** | Ohne das läuft nichts. Wird zuerst stabil und vollständig getestet. |
| **P1 Kern** | Die Hauptaussage der App für alle Profile, dazu Konto und Sync. |
| **P2 Komfort** | Macht die App deutlich besser, ist aber nicht nötig, um sie zu nutzen. |
| **P3 Erweiterung** | Demo, Geschäftsmodell oder Datenfluss nach außen. Bleibt hinter dem Advanced-Modus, bis es einzeln freigegeben ist. |

**Daten** sagt, wo die Daten der Funktion liegen:

| Wert | Bedeutung |
|---|---|
| lokal | nur auf dem Gerät |
| Sync | auf dem Gerät und, mit Konto, Ende-zu-Ende-verschlüsselt auf dem Server. Der Server kann die Daten nicht lesen. |
| Dienst | Die Funktion braucht einen Server-Dienst, der Daten im Klartext sieht. Dafür ist eine eigene Einwilligung nötig. |

**Stand**

| Wert | Bedeutung |
|---|---|
| fertig | echte Logik, getestet |
| Demo | erfundene Daten oder keine Zahlung |
| fehlt | noch nicht gebaut |

**Aktiv wenn** nutzt diese Begriffe:

| Begriff | Bedeutung |
|---|---|
| *Schüler-Modus* | `isStudentMode()`: unter 18, oder Status „Schüler:in“, bis der Wechsel am 18. Geburtstag bestätigt ist |
| *ab 16* | Einwilligungsalter nach Art. 8 DSGVO (`consentAgeRule` in `packages/core/data/privacy.ts`, `verified: true`). Heute wird es gegen `profile.age` geprüft, der Schüler-Modus nutzt dagegen `ageOn(birthDate)` |
| *Advanced: X* | Advanced-Modus an und Flag X an (`app/src/config/features.ts`) |
| *Konto* | angemeldet. Das ist nur ab 16 möglich, siehe Freigaberegeln. |

---

## P0 Fundament

| ID | Funktion | Nutzen | Aktiv wenn | Daten | Stand | Hauptdateien |
|---|---|---|---|---|---|---|
| F01 | Onboarding und Profil | Status (7 Möglichkeiten), Alter, Familienversicherung, BAföG, Hauptjob und Vorlesungszeiten; welche Felder erscheinen, hängt vom Status ab | immer | Sync | fertig | `app/src/features/onboarding/Onboarding.tsx`, `app/src/app/constants.ts` |
| F02 | Jobs | Job anlegen mit Art, Lohn, Zeitraum, Branche, Arbeitgeber, Zuschlägen, Trinkgeld und Kalender-Stichwörtern; 32 Vorlagen | immer (im Schüler-Modus ohne Werkstudenten-Art) | Sync | fertig | `app/src/features/jobs/JobsPage.tsx`, `app/src/features/jobs/JobForm.tsx`, `packages/core/data/jobPresets.ts` |
| F03 | Schichten erfassen | Mit Uhrzeit oder Stunden, Pausen, Zuschlägen und Trinkgeld; wöchentlich wiederholen; als „geplant“ markieren | immer | Sync | fertig | `app/src/features/shifts/ShiftsPage.tsx`, `app/src/features/shifts/ShiftForm.tsx` |
| F04 | Spielraum-Dashboard | Wie viel bis zur strengsten Monatsgrenze übrig ist, in Euro und Stunden, mit Status als Wort und Farbe; Jahreshochrechnung | immer | lokal (Berechnung) | fertig | `app/src/features/dashboard/Dashboard.tsx`, `app/src/features/dashboard/DashboardMetrics.tsx` |
| F05 | Grenzwerte mit Quelle | Jeder Wert mit Quelle, Gültigkeit und Prüfstatus, je Jahr | immer | lokal (mitgeliefert) | fertig | `packages/core/data/limits.ts`, `packages/core/src/index.ts` (`activeLimits`, `limitsForYear`) |
| F06 | Sprache DE/EN | Alle Texte zweisprachig | immer | Sync (Einstellung) | fertig | `app/src/i18n/translations.ts` |
| F07 | Export, Import und Löschen | JSON-Export ohne private Kalender-Links, Import, alle Daten löschen | immer | lokal | fertig | `app/src/features/more/SettingsPage.tsx`, `app/src/lib/storage.ts` (`stateForExport`, `normalizeState`) |
| F08 | Lokale Datenhaltung mit Versionen | Jeder Datensatz einzeln gespeichert, mit Schema-Version, Migrationen und Änderungszeit; Voraussetzung für Sync | immer | lokal | **fehlt** (heute ein einziger `AppState` ohne Version) | heute: `app/src/lib/storage.ts`; neu: `app/src/lib/db/` |
| F09 | Zentrale Freigabe von Funktionen | Eine Stelle entscheidet, welche Funktion für wen aktiv ist; Menü, Routen und Karten fragen nur dort nach | immer | lokal | **fehlt** (heute verteilt, siehe unten) | neu: `packages/core/src/features/` |
| F10 | Beispielprofile | Standard, Lena und Mia (16) zum Ausprobieren, sichtbar als Beispiel gekennzeichnet | nur ohne eigene Daten bzw. auf Wunsch | lokal | fertig | `app/src/lib/storage.ts` (`createDemoState`, `createLenaState`, `createMiaState`) |
| F11 | Rechtstexte | Datenschutzerklärung und Impressum | immer | – | Text da, persönliche Angaben fehlen noch (`[PLATZHALTER]`) | `app/src/features/legal/LegalPages.tsx` |

## P1 Kern

| ID | Funktion | Nutzen | Aktiv wenn | Daten | Stand | Hauptdateien |
|---|---|---|---|---|---|---|
| F20 | Konto | Registrieren, anmelden, abmelden, Konto löschen | ab 16 | Dienst (E-Mail und Hash des Anmeldeschlüssels; das Passwort verlässt das Gerät nie) | **fehlt** | neu: `backend/` |
| F21 | Verschlüsselter Sync | Gleicher Stand auf Handy, Browser und Mac; offline nutzbar; Schlüssel nur auf dem Gerät | Konto | Sync | **fehlt** | neu: `app/src/lib/sync/`, `backend/` |
| F22 | Wiederherstellungscode | Zugang zu den Daten, falls das Passwort vergessen ist | Konto | lokal (beim Nutzer) | **fehlt** | neu |
| F23 | „Für dich wichtig“ | Die Grenzen, die für den eigenen Status gelten, groß; die übrigen eingeklappt | immer, Inhalt je nach Status (`packages/core/data/roles.ts`) | lokal | fertig | `app/src/features/dashboard/RoleLimits.tsx` |
| F24 | Schicht-Check | Was eine geplante Schicht an Monats- und Jahresgrenze, Familienversicherung und 20-Stunden-Regel ändert | immer; Teil Jugendarbeitsschutz im Schüler-Modus; Teil Stunden nur bei Werkstudent:in | lokal | fertig | `app/src/features/shifts/ShiftCheckDialog.tsx` |
| F25 | Einmalzahlungen | Bonus, Urlaubs- und Weihnachtsgeld getrennt erfassen | immer | Sync | fertig | `app/src/features/shifts/PaymentsSection.tsx` |
| F26 | Grenzen-Seite | Alle Grenzen eines Jahres mit Quelle; ungeprüfte Werte markiert | immer; im Schüler-Modus nur Grenzen, die gelten | lokal | fertig | `app/src/features/limits/LimitsPage.tsx` |
| F27 | Info-Karten | Hinweis, wenn die Familienversicherung endet; Arten von Beschäftigung erklärt | Familienversicherung an bzw. immer | lokal | fertig | `app/src/features/dashboard/InformationCards.tsx` |
| F28 | Prüfung nach Jugendarbeitsschutzgesetz | Ruhezeiten, Pausen, Nachtruhe, 5-Tage-Woche, Wochenende, gefährliche Arbeiten, Schulzeit; Treffer mit Paragraf | Schüler-Modus (genauer: `youthLaborApplies`, unter 18) | lokal | fertig | `packages/core/src/rules/youthLabor/`, `app/src/features/youth/ViolationList.tsx` |
| F29 | Ferienjob-Zähler | Ferienarbeitstage, in der Regel höchstens 20 im Jahr | Schüler-Modus, vollzeitschulpflichtig, ab 15 | lokal | fertig | `app/src/features/dashboard/RoleLimits.tsx` (`holidayJobDays`) |
| F30 | Job-Hinweise für Minderjährige | Vorlagen „nicht für Minderjährige“; Hinweise je nach Art der Tätigkeit | unter 18 | lokal | fertig | `packages/core/src/rules/jobTags.ts`, `app/src/features/youth/JobTagFindings.tsx` |
| F31 | Minijob neben dem Hauptjob | Warnung bei Hauptjob plus Minijob, Hinweis auf Steuerklasse VI | Status Angestellte:r und Hauptjob | lokal | fertig | `packages/core/src/index.ts` (`employeeMiniJobStatus`), `RoleLimits.tsx` |
| F32 | Mehrere Minijobs | Warnung, wenn zwei Minijobs zusammen über der Grenze liegen | mindestens zwei Minijobs | lokal | fertig | `packages/core/src/index.ts` (`multipleMiniJobsOverCap`, `miniJobRoomBesideOthers`) |

## P2 Komfort

| ID | Funktion | Nutzen | Aktiv wenn | Daten | Stand | Hauptdateien |
|---|---|---|---|---|---|---|
| F40 | Import aus Kalenderdatei | `.ics`-Datei einlesen, prüfen, Job zuordnen, Doppelte erkennen | immer | lokal | fertig | `app/src/features/import/ImportPage.tsx`, `packages/core/src/shiftImport.ts` |
| F41 | Kalender-Link abonnieren | iCal-Link von Google oder iCloud, Abgleich höchstens alle 6 Stunden | immer; braucht den Server-Dienst und eine eigene Einwilligung | Dienst (Link wird durchgereicht, nicht gespeichert) | fertig im Demo-Server, Umzug ins Backend geplant | `app/src/lib/shiftImport.ts`, `server/src/index.ts` (`/api/calendar-feed`) |
| F42 | Import aus Foto | Dienstplan-Foto auf dem Gerät auslesen (tesseract.js) | immer | lokal | fertig | `packages/core/src/shiftImport.ts` (`parseScheduleText`) |
| F43 | Eltern-Seite | Einwilligung je Job, Vorlage als PDF, Monatsübersicht als PDF, Hinweis auf die Erstuntersuchung | Schüler-Modus (**Route heute ungesperrt**) | Sync | fertig | `app/src/features/youth/ParentsPage.tsx`, `app/src/lib/parentDocs.ts`, `packages/core/src/rules/medicalExam.ts` |
| F44 | Übergänge | Hinweis zum 18. Geburtstag und zum Schulende mit Vorschlag für den neuen Status; nichts ändert sich ohne Bestätigung | Profil mit Geburtsdatum bzw. Schulende | Sync (`handledTransitions`) | fertig | `packages/core/src/rules/transitions.ts`, `app/src/features/youth/TransitionNotices.tsx` |
| F45 | Lohn-Check | Lohn im Vergleich zum Mindestlohn; unter 18 ohne Ausbildung der Hinweis, dass er in der Regel nicht gilt | immer, Inhalt je nach Alter | lokal | fertig | `app/src/features/more/WageCheckPage.tsx`, `packages/core/src/rules/money.ts` |
| F46 | Verlauf | Verdienst der letzten 6 Monate, Stunden je Job, Tage kurzfristiger Beschäftigung | immer | lokal | fertig | `app/src/features/more/TrendsPage.tsx` |
| F47 | Hinweis auf Steuererstattung | „Das bekommst du wahrscheinlich zurück“, wenn Lohnsteuer abgezogen wird, das Jahreseinkommen aber unter dem Grundfreibetrag bleibt; nur ELSTER-Link | Job mit `incomeTaxWithheld` | lokal | fertig | `app/src/features/advanced/TaxAppCard.tsx` (`TaxRefundCard`) |
| F48 | Bürgergeld-Karte | Welcher Teil des Verdienstes in der Regel frei bleibt | `familyReceivesBasicIncome` | lokal | fertig, Werte teils `verified: false` | `app/src/features/youth/BasicIncomeCard.tsx` |
| F49 | Kurzfristig nach der Schule | Ob ein kurzfristiger Job nach dem Schulende in der Regel sozialversicherungsfrei bleibt | Status Schulabgänger:in | lokal | fertig, `verified: false` | `packages/core/src/combinations.ts` (`shortTermProfessionalRisk`) |
| F50 | Wochenkalender | Schichten als Woche; 20-Stunden-Regel; Schichten in der Schulzeit rot markiert | heute nur mit Advanced: weekCalendar. **Neu**: immer, im Schüler-Modus mit Schulzeit-Markierung | lokal | fertig, Freigabe zu ändern | `app/src/features/shifts/WeekCalendar.tsx` |
| F51 | Job-Kombinationen | Erkennt die eigene Kombination (z. B. Minijob plus kurzfristig) und zeigt, welche Regeln dann zusammen gelten | heute Advanced: jobCombinations. **Neu**: automatisch, sobald eine Kombination erkannt ist | lokal | fertig, Freigabe zu ändern | `app/src/features/advanced/JobComboCard.tsx`, `packages/core/src/combinations.ts` |
| F52 | Dunkelmodus | Helles oder dunkles Design | immer | Sync (Einstellung) | fertig | `app/src/features/more/SettingsPage.tsx` |
| F53 | Mac-App | Headroom als eigenes Programm | immer | lokal | fertig, `/api` heute gesperrt | `desktop/main.cjs` |

## P3 Erweiterungen (Advanced, standardmäßig aus)

| ID | Funktion | Nutzen | Aktiv wenn | Daten | Stand | Hauptdateien |
|---|---|---|---|---|---|---|
| F60 | Premium | Jahresbericht als PDF, Verlauf über mehrere Jahre | Advanced: premium; nicht im Schüler-Modus | lokal | Demo (keine Zahlung) | `app/src/features/advanced/PremiumPage.tsx` |
| F61 | Lohnstatistik | Eigenen Stundenlohn mit dem Median einer Gruppe vergleichen; Gruppen erst ab 20 Einträgen | Advanced: peerStats; ab 16; nicht im Schüler-Modus; Einwilligung | Dienst | Demo (erfundene Daten) | `app/src/features/advanced/PeerStatsPage.tsx`, `server/src/index.ts` |
| F62 | Jobbörse | Offene Schichten, geprüft gegen den eigenen Spielraum | Advanced: jobBoard; ab 16; nicht im Schüler-Modus | Dienst | Demo | `app/src/features/advanced/JobBoardPage.tsx`, `app/src/mock/data.ts` |
| F63 | Partnerhinweise | Passende Partner je nach Lage, z. B. Steuer-App über der Grenze | Advanced: partnerRecommendations; ab 16; nicht im Schüler-Modus | lokal | Demo (erfundene Partner) | `app/src/features/advanced/PartnerPanel.tsx`, `app/src/features/advanced/TaxAppCard.tsx` |
| F64 | Firmen-Check (OpenStreetMap) | Prüft auf Klick, ob es den Arbeitgeber am Ort gibt | Advanced: osmCompanyCheck; ab 16; nicht im Schüler-Modus | Dienst (Nominatim) | fertig, nicht für den Betrieb eingerichtet | `app/src/features/jobs/JobsPage.tsx` |
| F65 | Entwicklerseite | Einzelne Flags schalten | Advanced | lokal | Werkzeug | `app/src/features/more/DeveloperPage.tsx` |
| F66 | Eltern-Link | Eltern sehen die Monatsübersicht über einen Link | Schüler-Modus; Konto der Eltern oder Link-Verfahren noch offen | Dienst | **fehlt** | – (siehe `docs/schueler-modus-plan.md`) |
| F67 | Erinnerungen (Push) | z. B. „Grenze bald erreicht“, „Meldepflicht prüfen“ | Einwilligung zu Mitteilungen | lokal oder Dienst | **fehlt** | – |
| F68 | Erinnerung an die Meldepflicht | Für freiwillig Versicherte: Einkommen in der Regel der Krankenkasse melden | freiwillig versichert (neues Profilfeld) | lokal | **fehlt** | – |
| F69 | Lohnvergleich für Jugendliche | Typische Löhne unter 18 | Schüler-Modus | lokal | **fehlt** (keine verlässliche Quelle) | – |
| F70 | Kalender: monatliche Termine und gelöschte Termine | `FREQ=MONTHLY` lesen, im Kalender gelöschte Termine entfernen | Kalender-Link | lokal | **fehlt** | `packages/core/src/shiftImport.ts` |
| F71 | Anbindung an Schichtplan-Apps von Arbeitgebern | Schichten direkt übernehmen | offen | Dienst | **fehlt** | – |

---

## Freigaberegeln an einer Stelle

Heute entscheiden vier Stellen, was jemand sieht:

| Stelle | Was sie heute regelt |
|---|---|
| `app/src/config/features.ts` | Advanced-Flags; ohne Advanced ist alles aus |
| `app/src/config/studentMode.ts` | Was im Schüler-Modus ausgeblendet wird |
| `consentAgeRule` (`packages/core/data/privacy.ts`) | Ab 16, an vier Stellen gegen `profile.age` geprüft (`App.tsx`, `JobBoardPage`, `TaxAppCard`, `PeerStatsPage`) |
| `packages/core/data/roles.ts` und `activeLimits()` | Welche Grenzen je Status gelten und groß erscheinen |
| Einzelne Prüfungen in Komponenten | z. B. `RoleLimits.tsx`, `MorePage.tsx`, `App.tsx` |

**Ziel (F09)**: eine Registry in `packages/core/src/features/`. Jede Funktion bekommt dort ID, Priorität und eine Bedingung `activeWhen(ctx)`. Die bestehenden Prüfungen werden in die Registry übernommen, nicht neu geschrieben.

Die Funktion `resolveFeatures({ profile, jobs, settings, account, date })` liefert die Menge der aktiven IDs. Menü, Routen und Karten fragen nur noch dort nach. Das Datum wird übergeben, wie überall im Core.

Bedingungen, die die Registry kennt:

| Bedingung | Quelle heute |
|---|---|
| Status (7 Werte) | `PROFILE_STATUSES` in `packages/core/src/types.ts` |
| Alter an einem Datum; Schüler-Modus | `ageOn`, `isStudentMode`, `youthLaborApplies` in `packages/core/src/rules/youthLabor/profile.ts` |
| Einwilligungsalter 16 | `consentAgeRule`; neu eine Prüfung `consentAgeReached(profile, date)`, die wie der Schüler-Modus mit Geburtsdatum rechnet |
| Familienversicherung, BAföG, Hauptjob, Bürgergeld | Profilfelder |
| Jobarten und Kombinationen | `Job.type`, `detectedCombinations` |
| Advanced-Modus und Flags | `features.ts` (Flag-Speicher bleibt in der App) |
| Konto vorhanden | neu |

### Neue Regeln

1. **Konto erst ab 16.** Unter 16 ist in der Regel die Einwilligung der Eltern nötig (Art. 8 DSGVO; `consentAgeRule` ist schon mit Quelle und `verified: true` hinterlegt). Darunter bleibt alles lokal und die Konto-Funktionen erscheinen nicht. Wer 16 wird, bekommt das Konto angeboten, wie bei den übrigen Übergängen.
2. **Jede Route ist gesperrt, nicht nur der Menüeintrag.** Das behebt die Lücke bei `Parents`.
3. **Was dem Schutz dient, hängt nicht vom Advanced-Modus ab.** Wochenkalender mit Schulzeit-Markierung (F50) und Job-Kombinationen (F51) kommen aus Advanced heraus.
4. **Jede Funktion mit Typ „Dienst“** braucht eine eigene Einwilligung und einen Eintrag im README-Abschnitt „Datenschutz und Datenfluss“.
5. **Kein Konto und kein Sync mit Beispielprofil.** Solange `example` gesetzt ist, bietet die App kein Konto an. Sonst landen erfundene Daten mit festen IDs in echten Konten.

## Bekannte Lücken in der Doku

- `docs/Headroom-Konzept-und-Projektstand.md` spricht von 5 Profilen und 2 Beispielprofilen. Der Code hat 7 Profile und 3 Beispielprofile (Mia ist neu).
- README und Konzept-Doku sagen, das erste Einschalten von Advanced aktiviere Jobbörse und Partnerhinweise. Tatsächlich kommen Wochenkalender und Job-Kombinationen dazu (`advancedDefaults`).

- „Alle Daten löschen“ (`onDelete` in `app/src/App.tsx`) setzt `example` nicht zurück, die Daten gelten danach weiter als Beispiel.

Die Doku-Punkte werden angepasst, sobald Phase 0 aus dem Bauplan umgesetzt ist.
