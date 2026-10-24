# Headroom

Headroom ist eine mobile, informationsorientierte PWA für Menschen in Deutschland, die mehrere Beschäftigungen kombinieren. Die App summiert Einnahmen und Arbeitsstunden über alle erfassten Jobs und ordnet bekannte Grenzen für Monat, Jahr und Beschäftigungsart ein. Sie gibt keine individuelle Steuer- oder Rechtsberatung.

## Lokal starten

Voraussetzung ist eine aktuelle Node.js-Version. Im Projektstamm:

```sh
npm install
npm run dev                 # nur die PWA, standardmäßig http://localhost:5173
npm run dev:all             # PWA plus lokalen Demo-Server auf 127.0.0.1:8787
```

Der Server ist optional. Ohne ihn funktionieren Kernfunktionen und lokale Demodaten. Für Qualitätssicherung:

```sh
npm test                    # Vitest: Core- und App-Tests
npm run test:e2e            # Playwright-Smoketests; Chromium muss verfügbar sein
npx tsc --noEmit -p server/tsconfig.json
npm run build
```

`HEADROOM_DB_PATH=/anderer/pfad/headroom.sqlite npm run dev:server` legt die SQLite-Datenbank des lokalen Demo-Servers an einem alternativen Ort an. Im Standardfall liegt sie unter `server/data/headroom.sqlite` und wird nicht eingecheckt.

## Aufbau

```text
app/                         React, TypeScript, Vite, PWA und deutsch/englische UI
  src/config/features.ts     optionale Funktionen; standardmäßig alle deaktiviert
  src/lib/storage.ts         IndexedDB, localStorage-Fallback und Datenmigration
  src/mock/data.ts           sichtbar gekennzeichnete Beispieldaten
       │
       ├── verwendet
       ▼
packages/core/               reine TypeScript-Typen und Berechnungen
  data/limits.ts             datierte Grenzwerte mit Quelle und Prüfstatus
  data/jobPresets.ts         durchsuchbare Job-Presets
  data/references.ts         externe Informationsquellen
       │
       └── verwendet
       ▼
server/                      optionaler lokaler Express-Demo-Server
  src/index.ts               SQLite für Demoinserate und freiwillige Lohndaten
```

## Enthaltene Funktionen

- Onboarding für Studierende, Werkstudierende, Minijobber:innen, Beschäftigte mit Nebenjob und Schüler:innen; Profilangaben lassen sich später ändern.
- Jobs und Schichten erfassen, bearbeiten, löschen und wiederholen; Demo-Profil mit 487 € Monatsverdienst, 116 € verbleibendem Spielraum und 15 kurzfristigen Arbeitstagen.
- Dashboard für Monat, Jahr und Saison, Grenzwertkarten mit Quelle und Stand, Schichtprüfung, Lohnorientierung und persönliche Trends.
- Deutsch und Englisch, dunkles Farbschema, JSON-Export und -Import, lokale Löschfunktion sowie installierbare PWA mit Offline-Grundgerüst.
- Sechs separat schaltbare Vorschaufunktionen: Schichtplan-OCR, Jobbörse, Partnerhinweise, Demo-Premium, anonyme Lohnstatistik und OpenStreetMap-Firmensuche.
- 32 Job-Presets, 40 klar markierte Beispielinserate, mindestens 3.200 synthetische Vergleichsdatensätze und fünf Partnerkarten. Alle Partnernamen außer ELSTER sind fiktiv.

## Datenschutz und Datenfluss

Im Grundbetrieb werden Profil, Jobs und Schichten in IndexedDB auf dem Gerät gespeichert. Falls IndexedDB nicht verfügbar ist, verwendet die App localStorage. Die gebündelten Schriftdateien vermeiden automatische Anfragen an einen externen Schriftanbieter. Die optionalen Funktionen sind in einer frischen Installation ausgeschaltet.

Wenn optionale Funktionen manuell eingeschaltet und verwendet werden, gelten diese Datenflüsse:

- **Lohnstatistik:** Erst nach gesonderter Einwilligung sendet die App ein zufälliges Geräte-Token, Job-Preset, Stadt, tatsächlichen und erwarteten Stundenlohn sowie Monat an den Demo-Server. Die Firmenbezeichnung wird nicht übertragen. Gruppenwerte werden erst ab 20 Datensätzen ausgegeben. Die Einwilligung ist widerrufbar; die App fordert die Löschung der zum Token gehörenden Datensätze an.
- **Jobbörse:** Die Vorschau lädt Demoinserate vom lokalen Server. Ein selbst erstelltes Inserat sendet Titel, Stadt, Datum, Dauer und Stundenlohn an dessen SQLite-Datenbank. Bewerbungen öffnen nur die Kontaktmöglichkeit; Headroom übermittelt dabei keine Profildaten.
- **Firmensuche:** Nur nach Aktivierung der Funktion und Klick auf „Prüfen“ werden Firmenname und Stadt an OpenStreetMap Nominatim gesendet. Vor öffentlichem Einsatz müssen App-Kennung, Anfragefrequenz, Caching und Anbieterauswahl gegen die [Nominatim-Nutzungsrichtlinie](https://operations.osmfoundation.org/policies/nominatim/) geprüft und passend konfiguriert werden.
- **Schichtplan-OCR:** Die Erkennung läuft lokal im Browser. Partnerkarten öffnen eine externe Seite erst nach einem Klick.

Der Server ist ausschließlich als lokaler Demo-Server ausgelegt. Für einen öffentlichen Betrieb fehlen unter anderem ein geprüftes Hosting- und Löschkonzept, Datenschutzinformationen, Missbrauchsschutz und eine Sicherheitsprüfung. Es gibt keine Nutzerkonten. Individuelle Nutzerdaten werden nicht verkauft.

## Grenzwerte und Quellen

Alle fachlichen Grenzwerte liegen zentral in `packages/core/data/limits.ts` und enthalten Quelle, Gültigkeitszeitraum, Prüfdatum und `verified`. Die App zeigt Quelle und Prüfdatum an. Ein `verified: false`-Wert wird sichtbar als ungeprüft markiert und erzeugt keine automatische Grenzwarnung. Die 2027-Minijobgrenze wird aus dem Mindestlohn mit `ceil(Mindestlohn × 130 / 3)` abgeleitet; sie ist nicht als Konstante dupliziert.

Die Datensätze und Rechenwege bleiben vor Veröffentlichung fachlich zu prüfen. Insbesondere sind folgende elf Datensätze derzeit `verified: false`:

| Datensatz | Zeitraum | Eingetragener Wert | Offen |
| --- | --- | ---: | --- |
| Familienversicherung | 2027 | kein Wert | Einkommensgrenze und Minijob-Ausnahme anhand einer aktuellen offiziellen oder Krankenkassenquelle bestätigen |
| BAföG-Hinzuverdienst | 2026 | 603 €/Monat | Freibetrag und Anrechnung offiziell verifizieren; Minijob-Zentrale als verwendete Ausgangsquelle gegen BAföG-Regelung prüfen |
| BAföG-Hinzuverdienst | 2027 | kein Wert | Geltenden Freibetrag und Anrechnung offiziell verifizieren |
| Steuerlicher Orientierungswert für regulären Arbeitslohn | 2026 | 13.614 €/Jahr | Zusammensetzung aus Grundfreibetrag und Pauschbeträgen sowie Brutto-Orientierungscharakter bestätigen |
| Steuerlicher Orientierungswert für regulären Arbeitslohn | 2027 | kein Wert | Werte und Berechnung verifizieren |
| Einkommensteuer-Grundfreibetrag | 2027 | kein Wert | Betrag anhand der geltenden Fassung des EStG bestätigen |
| Arbeitnehmer-Pauschbetrag | 2026 | 1.230 €/Jahr | Betrag und Zusammenspiel mit dem Orientierungswert verifizieren |
| Arbeitnehmer-Pauschbetrag | 2027 | kein Wert | Betrag und Zusammenspiel verifizieren |
| Sonderausgaben-Pauschbetrag | 2026 | 36 €/Jahr | Betrag und Zusammenspiel verifizieren |
| Sonderausgaben-Pauschbetrag | 2027 | kein Wert | Betrag und Zusammenspiel verifizieren |
| Jugendarbeitsschutz | 2026–2027 | kein Wert | Arbeitszeiten, Pausen, Tätigkeitsverbote und Nachtarbeit aus amtlichen Quellen ergänzen; nur als Information verwenden |

Weitere bewusst offene Prüfpunkte und Produktgrenzen:

- 2027-Familienversicherungs- und BAföG-Werte erst mit gültiger amtlicher beziehungsweise verlässlicher offizieller Quelle ergänzen.
- Steuerliche Aussagen, Pauschbeträge und die Abgrenzung pauschal versteuerter Minijobs fachlich prüfen; keine persönliche Steuerfreigrenze suggerieren.
- Werkstudentenprivileg ist eine Orientierung: 26-Wochen-Regel, Lage der Arbeitszeit und Einzelfallausnahmen sind nicht implementiert.
- Kurzfristige Beschäftigung bildet die landwirtschaftlichen Sonderregeln nicht ab. Die allgemeine 70-Tage-/Drei-Monats-Regel ersetzt keine Einzelfallprüfung.
- Trinkgeldbehandlung und Jugendarbeitsschutz vor einer Berechnung oder Warnung mit amtlichen Quellen klären.
- Job-Preset-Wirtschaftszweige von WZ 2008 auf WZ 2025 (Destatis) übertragen; typische Anforderungsniveaus anhand KldB 2010 (Bundesagentur für Arbeit) validieren.
- Jahresprojektion, Saisonabgrenzung, Statuswechsel und Grenzänderungen am Jahreswechsel fachlich und mit weiteren Profilfällen überprüfen.
- Die Nominatim-Konfiguration für den öffentlichen Betrieb prüfen; laut Richtlinie gelten Anfragebegrenzung, erkennbare App-Kennung und sichtbare Namensnennung.
- Partnerhinweise und externe Anbieter neutral prüfen. Vor einer Krankenkassenvergleichs-Partnerschaft sind die rechtlichen Regeln zur Mitgliederwerbung durch gesetzliche Krankenkassen zu klären.
- Vor einer Veröffentlichung: Barrierefreiheit systematisch gegen WCAG AA sowie Tastatur- und Screenreader-Bedienung prüfen; zusätzliche PWA-Iconvarianten und Aktualisierungsverhalten bewerten.
- Vor Serverbetrieb im Internet: Hosting, Aufbewahrungsfristen, Löschung, Rate-Limits, Sicherheitskonfiguration und vollständige Datenschutzhinweise umsetzen.

Die im Core dokumentierten Quellen umfassen unter anderem [Minijob-Zentrale](https://www.minijob-zentrale.de/DE/die-minijobs/mehrere-jobs/mehrere-jobs_node.html), [BMAS – Mindestlohn](https://www.bmas.de/DE/Service/Gesetze-und-Gesetzesvorhaben/fuenfte-mindestlohnanpassungsverordnung-milov5.html), [Deutsche Rentenversicherung – Werkstudentenprivileg](https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Arbeitgeber-und-Steuerberater/summa-summarum/Lexikon/W/werkstudentenprivileg), [BARMER – Familienversicherung](https://www.barmer.de/unsere-leistungen/beitraege-tarife/krankenversicherung-familien/voraussetzungen-1480744) und [Einkommensteuergesetz](https://www.gesetze-im-internet.de/estg/__32a.html). Maßgeblich sind immer die Datensätze einschließlich Prüfdatum im Projekt.

## Qualitätsprüfungen

Der Core enthält Unit-Tests für Einkommensprojektion, Profilfilter, Jahreswerte, Werkstudentenstunden, Kurzfristigkeit, Peer-Schwellen und Empfehlungsstufen. App- und Playwright-Smoketests prüfen die zentralen Nutzerflüsse, Quellennachweise, deaktivierten Vorschaufunktionen und das mobile Layout. Die genauen Befehle zum erneuten Ausführen stehen unter „Lokal starten“.
