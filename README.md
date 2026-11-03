# Headroom

Headroom ist eine mobile, informationsorientierte PWA für Menschen in Deutschland, die mehrere Beschäftigungen kombinieren. Die App summiert Einnahmen und Arbeitsstunden über alle erfassten Jobs und ordnet bekannte Grenzen für Monat, Jahr und Beschäftigungsart ein. Sie gibt keine individuelle Steuer- oder Rechtsberatung.

## Lokal starten

Voraussetzung ist Node.js 24 LTS (siehe `.nvmrc`) mit npm; das Projekt nutzt npm-Workspaces, kein pnpm. Im Projektstamm:

```sh
npm install
npm run dev                 # nur die PWA, standardmäßig http://localhost:5173
npm run dev:all             # PWA plus lokalen Demo-Server auf 127.0.0.1:8787
```

Der Server ist optional. Ohne ihn funktionieren Kernfunktionen und lokale Demodaten. Für Qualitätssicherung:

```sh
npm test                    # Vitest: Core-, Schnittstellen-, Backend- und App-Tests
npm run test:e2e            # Playwright-Smoketests; Chromium muss verfügbar sein
npm run typecheck           # Typprüfung aller Workspaces (Core, Schnittstellen, Backend, App, Demo-Server)
npm run build
```

Dieselben Prüfungen außer den Playwright-Tests laufen bei jedem Push in GitHub Actions (`.github/workflows/ci.yml`).

Fehlermeldung `Cannot find native binding` (Rolldown): Vite 8 und Vitest laden eine native Rolldown-Bibliothek. Sie fehlt, wenn `node_modules` auf einem anderen Rechner oder mit einer abgeschotteten Node-Laufzeit (z. B. aus einer Desktop-App) installiert wurde. Abhilfe: `rm -rf node_modules && npm ci` mit einem regulären Node.js.

Die Backend-Tests brauchen keine Installation von Postgres: Lokal laufen sie gegen PGlite (Postgres als WebAssembly). Ist `TEST_DATABASE_URL` gesetzt, laufen sie gegen dieses Postgres, jeder Test in einem eigenen Schema; so macht es die CI mit Postgres 17.

## Backend (im Aufbau)

`backend/` ist das künftige Backend für Konto und verschlüsselten Abgleich (Fastify, Postgres, Kysely). Es hat bisher nur `/health` (Prozess läuft) und `/ready` (Datenbank erreichbar und migriert), dazu alle Schutzschichten: geprüfte Konfiguration, CORS nur für eingetragene Ursprünge, Rate-Limit (enger für `/v1/auth/*`), Sicherheits-Header und Logs ohne IP-Adressen, Zugangsdaten oder Inhalte. Die App nutzt es noch nicht.

```sh
cp .env.example .env                      # Passwort der Datenbank und erlaubte Ursprünge eintragen
mkdir -p secrets && openssl rand -base64 48 > secrets/prelogin_secret
docker compose up --build                 # Backend auf 127.0.0.1:8080, Postgres 17 mit Volume
```

Ohne Docker: `DATABASE_URL`, `ALLOWED_ORIGINS` (kommagetrennt, z. B. `app://headroom,http://localhost:5173`) und `PRELOGIN_SECRET` (mindestens 32 Zeichen) setzen und `npm run dev:backend` starten. Steht ein eigener Reverse-Proxy davor, gehören seine Adressen oder Netze in `TRUSTED_PROXIES` (z. B. `10.0.0.0/8` oder `loopback`); nur dann zählt das Rate-Limit nach der weitergeleiteten Adresse. Ohne Angabe wird keinem Proxy vertraut. Fehlt eine Pflichtangabe, startet das Backend nicht und nennt die fehlende Variable. `.env` und `secrets/` werden nicht eingecheckt.

`HEADROOM_DB_PATH=/anderer/pfad/headroom.sqlite npm run dev:server` legt die SQLite-Datenbank des lokalen Demo-Servers an einem alternativen Ort an. Im Standardfall liegt sie unter `server/data/headroom.sqlite` und wird nicht eingecheckt.

## Als Mac-App

Headroom lässt sich als eigenes Programm (Electron) bauen, das ohne Terminal, Server und Internet läuft:

```sh
npm run desktop             # Web-App bauen und im App-Fenster starten (zum Testen)
npm run desktop:build       # Headroom.app bauen (desktop/dist/mac-arm64/)
npm run desktop:install     # nach ~/Applications kopieren (Launchpad, Spotlight, Dock)
```

Nach Änderungen am Code `desktop:build` und `desktop:install` erneut ausführen. Die Mac-App speichert ihre Daten getrennt vom Browser; zum Umziehen in den Einstellungen exportieren und importieren. Jobbörse und Vergleichswerte brauchen den Demo-Server und sind in der Mac-App offline.

## Aufbau

```text
app/                         React, TypeScript, Vite, PWA und deutsch/englische UI
  src/app/screenGate.ts      sperrt Bildschirme, die die Feature-Registry nicht freigibt
  src/import/ImportPage.tsx  Schichten aus Kalender (.ics/iCal-Link) und Foto übernehmen
  src/lib/shiftImport.ts     Import anwenden, Kalender abgleichen
  src/lib/storage.ts         Laden, Speichern, Löschen, Beispielprofile
  src/lib/db/                Speicher je Datensatz (IndexedDB, localStorage-Fallback), Übernahme alter Daten
  src/mock/data.ts           sichtbar gekennzeichnete Beispieldaten
       │
       ├── verwendet
       ▼
packages/core/               reine TypeScript-Typen und Berechnungen
  src/features/registry.ts   entscheidet für jede Funktion, für wen sie aktiv ist (Profil, Alter, Advanced-Modus)
  src/features/flags.ts      Demo-Flags des Advanced-Modus; standardmäßig aus
  src/shiftImport.ts         iCalendar-Parser, Dienstplan-Textparser, Jobzuordnung, Dublettenprüfung
  data/limits.ts             datierte Grenzwerte mit Quelle und Prüfstatus
  data/jobPresets.ts         durchsuchbare Job-Presets
  data/references.ts         externe Informationsquellen
       │
packages/contracts/          Zod-Schemas der künftigen Backend-Schnittstelle (Konto, Abgleich), geteilt von App und Backend
backend/                     künftiges Backend (Fastify, Postgres, Kysely); bisher nur Zustand und Schutzschichten
       │
       └── verwendet
       ▼
server/                      optionaler lokaler Express-Demo-Server
  src/index.ts               SQLite für Demoinserate und freiwillige Lohndaten; Kalender-Abruf (Google/iCloud)
```

## Enthaltene Funktionen

- Onboarding für Studierende, Werkstudierende, Minijobber:innen, Beschäftigte mit Nebenjob und Schüler:innen; Profilangaben lassen sich später ändern.
- **Schicht-Tracker:** Schichten aus Google- oder Apple-Kalender (privater iCal-Link oder .ics-Datei) und aus Fotos oder Screenshots von Dienstplänen übernehmen. Termine werden über Stichwörter, Jobtitel oder Firma einem Job zugeordnet; vor dem Speichern gibt es immer eine Prüfung. Verbundene Kalender werden beim Öffnen höchstens alle sechs Stunden abgeglichen. Dieselbe Schicht wird nur einmal erfasst, auch wenn sie per Foto und per Kalender ankommt (gleiche Kalender-Kennung oder gleicher Job, gleicher Tag und mindestens 50 % Zeitüberlappung). Von Hand bearbeitete importierte Schichten überschreibt ein späterer Abgleich nicht.
- Jobs und Schichten erfassen, bearbeiten, löschen und wiederholen; Demo-Profil mit 487 € Monatsverdienst, 116 € verbleibendem Spielraum und 15 kurzfristigen Arbeitstagen.
- Dashboard für Monat, Jahr und Saison, Grenzwertkarten mit Quelle und Stand, Schichtprüfung, Lohnorientierung und persönliche Trends.
- Deutsch und Englisch, dunkles Farbschema, JSON-Export und -Import, lokale Löschfunktion sowie installierbare PWA mit Offline-Grundgerüst.
- **Advanced-Modus (Demo)** in den Einstellungen, standardmäßig aus. Erst damit werden die Vorschaufunktionen sichtbar: Jobbörse mit drei fiktiven Partner-Jobbörsen, Partnerhinweise, Demo-Premium, anonyme Lohnstatistik und OpenStreetMap-Firmensuche (einzeln schaltbar im Entwicklerbereich). Ohne Advanced-Modus sind alle aus, egal wie die Einzel-Flags stehen. Eine Statistik-Demo nach Branche, Alter und Steuerstatus ist bewusst noch nicht umgesetzt.
- 32 Job-Presets, 40 klar markierte Beispielinserate, mindestens 3.200 synthetische Vergleichsdatensätze, fünf Partnerkarten und drei Partner-Jobbörsen. Alle Partnernamen außer ELSTER sind fiktiv.

## Datenschutz und Datenfluss

Im Grundbetrieb werden Profil, Jobs, Schichten, Zahlungen, Kalender und Einstellungen als einzelne Datensätze in IndexedDB auf dem Gerät gespeichert. Falls IndexedDB nicht verfügbar ist, verwendet die App localStorage. Ungültige Einträge werden aussortiert und aufbewahrt, bis du sie in den Einstellungen verwirfst; sie gehen mit in den Export. „Auf diesem Gerät löschen“ entfernt alle Daten dieses Geräts. Gelöschte Einträge hinterlassen auf dem Gerät einen Löschvermerk mit ihren letzten Werten: Er wird für den späteren Abgleich zwischen Geräten gebraucht, bleibt bis „Auf diesem Gerät löschen“ und verlässt das Gerät heute nicht. Eine Aufbewahrungsfrist kommt mit dem Abgleich. Die gebündelten Schriftdateien vermeiden automatische Anfragen an einen externen Schriftanbieter. Die optionalen Funktionen sind in einer frischen Installation ausgeschaltet.

Wenn optionale Funktionen manuell eingeschaltet und verwendet werden, gelten diese Datenflüsse:

- **Lohnstatistik:** Erst nach gesonderter Einwilligung sendet die App ein zufälliges Geräte-Token, Job-Preset, Stadt, tatsächlichen und erwarteten Stundenlohn sowie Monat an den Demo-Server. Die Firmenbezeichnung wird nicht übertragen. Gruppenwerte werden erst ab 20 Datensätzen ausgegeben. Die Einwilligung ist widerrufbar; die App fordert die Löschung der zum Token gehörenden Datensätze an.
- **Jobbörse:** Die Vorschau lädt Demoinserate vom lokalen Server. Ein selbst erstelltes Inserat sendet Titel, Stadt, Datum, Dauer und Stundenlohn an dessen SQLite-Datenbank. Bewerbungen öffnen nur die Kontaktmöglichkeit; Headroom übermittelt dabei keine Profildaten.
- **Firmensuche:** Nur nach Aktivierung der Funktion und Klick auf „Prüfen“ werden Firmenname und Stadt an OpenStreetMap Nominatim gesendet. Vor öffentlichem Einsatz müssen App-Kennung, Anfragefrequenz, Caching und Anbieterauswahl gegen die [Nominatim-Nutzungsrichtlinie](https://operations.osmfoundation.org/policies/nominatim/) geprüft und passend konfiguriert werden.
- **Kalender (Kernfunktion):** Ein eingefügter iCal-Link wird nie exportiert. Vor dem ersten Abruf fragt die App nach einer eigenen Einwilligung (je Gerät, auf der Import-Seite widerrufbar); ohne sie ruft sie keinen Link ab. Zum Abrufen sendet die App den Link per POST (nicht in der URL) an das Backend (`/v1/calendar/feed`, ohne eingetragene Backend-Adresse an den lokalen Demo-Server). Es reicht ihn ausschließlich an `calendar.google.com` oder `*.icloud.com` weiter (auch bei Weiterleitungen geprüft, 10 s Timeout, max. 2 MB, eigenes Rate-Limit) und gibt den Kalenderinhalt zurück. Link und Inhalt laufen dabei im Klartext durch den Server; er speichert und protokolliert beides nicht. Wozu: Google und Apple erlauben keinen Abruf direkt aus dem Browser. Wie lange: nur für die Dauer der Anfrage. Gespeichert wird auf dem Gerät nur der Tag der Einwilligung. Der Import einer .ics-Datei läuft vollständig lokal und braucht keine Einwilligung.
- **Foto/Screenshot (Kernfunktion):** Die Texterkennung (tesseract.js, Deutsch und Englisch) läuft im Browser; das Bild verlässt das Gerät nicht. Beim ersten Lauf lädt tesseract.js Programmteile und Sprachdaten von cdn.jsdelivr.net nach; dabei geht die IP-Adresse an jsDelivr.
- Partnerkarten öffnen eine externe Seite erst nach einem Klick.

**Backend (im Aufbau, noch nicht von der App genutzt):** Die Logs enthalten nur Methode, Pfad ohne Parameter und wenige feste Header (Browser-Kennung, Inhaltstyp und -länge, Ursprung; `Authorization` nur geschwärzt), also keine IP-Adressen, Cookies, E-Mail-Adressen, Schlüssel oder Inhalte. Docker Compose begrenzt die Log-Dateien auf 14 Stück zu je 10 MB; eine Löschung nach spätestens 14 Tagen wird beim Hosting-Anbieter eingestellt, sobald er feststeht.

Datenschutzerklärung und Impressum stehen als In-App-Seiten unter `app/src/features/legal/` (erreichbar über „Mehr“ und die Fußzeile). Persönliche Angaben sind dort als `[PLATZHALTER]` markiert und müssen vor einer Veröffentlichung ausgefüllt und rechtlich geprüft werden.

Der Server ist ausschließlich als lokaler Demo-Server ausgelegt. Für einen öffentlichen Betrieb fehlen unter anderem ein geprüftes Hosting- und Löschkonzept, Datenschutzinformationen, Missbrauchsschutz und eine Sicherheitsprüfung. Es gibt keine Nutzerkonten. Individuelle Nutzerdaten werden nicht verkauft.

## Grenzwerte und Quellen

Alle fachlichen Grenzwerte liegen zentral in `packages/core/data/limits.ts` und enthalten Quelle, Gültigkeitszeitraum, Prüfdatum und `verified`. Die App zeigt Quelle und Prüfdatum an. Ein `verified: false`-Wert wird sichtbar als ungeprüft markiert und erzeugt keine automatische Grenzwarnung. Die 2027-Minijobgrenze wird aus dem Mindestlohn mit `ceil(Mindestlohn × 130 / 3)` abgeleitet; sie ist nicht als Konstante dupliziert.

Die Datensätze und Rechenwege bleiben vor Veröffentlichung fachlich zu prüfen. Interne Prüfnotizen stehen im Feld `reviewNote` und werden nie angezeigt. Fehlt für ein Jahr ein Wert, liefert der Core `null` („nicht verfügbar“): Die App zeigt dann keinen Restbetrag und keine Warnung. Die Jahresauswahl der Grenzwertseite ergibt sich aus den Datensätzen (`availableLimitYears`).

Am 27.10.2026 geprüft und geändert:

| Datensatz | Zeitraum | Wert | Quelle |
| --- | --- | ---: | --- |
| BAföG-Freibetrag für eigenes Einkommen | 2026 | 389 €/Monat (nach Abzügen); Brutto-Äquivalent ca. 603 € | [Bekanntmachung vom 18.11.2025, BGBl. 2025 I Nr. 279](https://www.recht.bund.de/bgbl/1/2025/279/VO.html); Brutto-Äquivalent nach § 23 Abs. 6 mit § 21 Abs. 2 Nr. 1 BAföG (22,3 %) und § 9a EStG nachgerechnet |
| Gesamteinkommensgrenze Familienversicherung | 2026 | 565 €/Monat (nur Minijob: 603 €) | [§ 10 SGB V](https://www.gesetze-im-internet.de/sgb_5/__10.html), [SVBezGrV 2026 § 1](https://www.gesetze-im-internet.de/svbezgrv_2026/__1.html); die App vergleicht vorsichtig mit Brutto und kennzeichnet das als Brutto-Orientierung |
| Werkstudent: Wochen über 20 Stunden | 2026–2027 | 26 Wochen im Zeitjahr | [DRV – Werkstudentenprivileg](https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Arbeitgeber-und-Steuerberater/summa-summarum/Lexikon/W/werkstudentenprivileg); Berechnung des Zeitjahres nur über Krankenkassen-Veröffentlichungen belegt |

Weiterhin ohne Wert oder `verified: false`:

| Datensatz | Zeitraum | Eingetragener Wert | Offen |
| --- | --- | ---: | --- |
| Familienversicherung | 2027 | kein Wert | SVBezGrV 2027 noch nicht verkündet (Kabinettsentwurf: 4.130 €/Monat → 590 €) |
| BAföG-Freibetrag | 2027 | kein Wert | Bekanntmachung nach § 23 Abs. 6 BAföG für 2027 noch nicht veröffentlicht |
| Steuerlicher Orientierungswert für regulären Arbeitslohn | 2026 und 2027 | 13.614 €/Jahr | Bestandteile im EStG bestätigt; die vereinfachte Methode fachlich prüfen |

Einmalzahlungen (Bonus, Urlaubs-, Weihnachtsgeld) werden getrennt erfasst. Wie sie je Grenze zählen, steht in `oneTimePaymentRules` im Core: bei Minijob, Familienversicherung, BAföG und Steuer voll im Auszahlungsmonat (vorsichtiger als die amtliche Jahresbetrachtung), bei Stunden- und Tagesgrenzen gar nicht.

Am 24.10.2026 gegen amtliche Quellen bestätigt:

| Datensatz | Zeitraum | Wert | Quelle |
| --- | --- | ---: | --- |
| Einkommensteuer-Grundfreibetrag | 2026 und 2027 | 12.348 €/Jahr | [§ 32a EStG](https://www.gesetze-im-internet.de/estg/__32a.html) („ab dem Veranlagungszeitraum 2026“) |
| Arbeitnehmer-Pauschbetrag | 2026 und 2027 | 1.230 €/Jahr | [§ 9a EStG](https://www.gesetze-im-internet.de/estg/__9a.html) |
| Sonderausgaben-Pauschbetrag | 2026 und 2027 | 36 €/Jahr | [§ 10c EStG](https://www.gesetze-im-internet.de/estg/__10c.html) |
| Jugendarbeitsschutz (nur Information) | 2026–2027 | 8 h/Tag, 40 h/Woche, 6–20 Uhr, Pausen | [§§ 8, 11, 14 JArbSchG](https://www.gesetze-im-internet.de/jarbschg/) |

Die 2027-Werte im EStG gelten nach heutigem Gesetzesstand; vor dem Jahreswechsel auf Änderungen prüfen.

Weitere bewusst offene Prüfpunkte und Produktgrenzen:

- 2027-Familienversicherungs- und BAföG-Werte erst nach Verkündung beziehungsweise Bekanntmachung ergänzen.
- Steuerliche Aussagen, Pauschbeträge und die Abgrenzung pauschal versteuerter Minijobs fachlich prüfen; keine persönliche Steuerfreigrenze suggerieren.
- Werkstudentenprivileg ist eine Orientierung: Die 26-Wochen-Regel wird gezählt; Lage der Arbeitszeit (abends, nachts, Wochenende), Jobs außerhalb von Headroom und Einzelfallausnahmen prüft die App nicht und sagt das am Ergebnis.
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
