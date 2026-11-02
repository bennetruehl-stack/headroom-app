# Headroom – Konzept und Projektstand

**Stand:** 26. Oktober 2026 · **Letzter Commit:** `97982f1` („Schicht-Tracker (Kalender + Foto) und Advanced-Modus“) plus eine noch nicht committete Textkorrektur (doppeltes €-Zeichen, siehe Kapitel 16)
**Zweck dieses Dokuments:** vollständige Beschreibung von Idee, Konzept, Funktionsumfang, Technik, Datenschutz, Geschäftsmodell und aktuellem Entwicklungsstand der App Headroom – als Grundlage für Pitch, Weiterentwicklung und Übergabe.

---

## Inhalt

1. Zusammenfassung
2. Ausgangslage: Das Problem hinter Headroom
3. Zielgruppen und Markt
4. Produktidee und Leitprinzipien
5. Funktionsumfang im Detail
6. Schicht-Tracker: Kalender, Foto und Dublettenprüfung
7. Advanced-Modus (Demo-Funktionen)
8. Grenzwerte und Rechtsgrundlagen
9. Rollenbasierte Darstellung
10. Technische Architektur
11. Datenmodell
12. Datenschutz und Datenflüsse
13. Gestaltung und Bedienerlebnis
14. Qualitätssicherung
15. Geschäftsmodell
16. Projektstand und Entwicklungshistorie
17. Begleitmaterial (Pitch, Demo, Videos)
18. Offene Punkte, Risiken und nächste Schritte
19. Anhang: Starten, Testen, Bauen

---

## 1. Zusammenfassung

Headroom ist eine mobile Web-App (Progressive Web App) für Menschen in Deutschland, die mehrere Beschäftigungen kombinieren – vor allem Studierende, Minijobber:innen, Werkstudierende, Schüler:innen und Beschäftigte mit Nebenjob. Die App rechnet Einnahmen und Arbeitsstunden **über alle Jobs zusammen** und zeigt, wie viel Spielraum bis zur nächsten relevanten gesetzlichen Grenze bleibt: Minijob-Verdienstgrenze, Jahresgrenze, 70-Tage-Regel für kurzfristige Beschäftigung, Einkommensgrenze der Familienversicherung, 20-Stunden-Regel für Werkstudierende, BAföG-Hinzuverdienst und steuerliche Orientierungswerte.

Das Bild für den Pitch: **„Headroom ist wie ein Kalorien-Tracker für deine Jobs.“** Ein Budget (die Grenze), viele Einträge (die Schichten) und ein Blick darauf, was noch übrig ist.

Kernfunktionen im aktuellen Stand:

- Onboarding nach Status, Dashboard mit Monat, Jahr und Saison, Grenzwerte mit Quelle und Prüfdatum.
- Jobs und Schichten erfassen, bearbeiten, wiederholen; „Was würde diese Schicht verändern?“-Check vor dem Zusagen.
- **Schicht-Tracker:** Schichten automatisch aus Google- oder Apple-Kalender (iCal-Link oder .ics-Datei) und aus Fotos/Screenshots von Dienstplänen übernehmen – ohne Doppelerfassung.
- Deutsch und Englisch, Dunkelmodus, Export/Import, lokale Datenhaltung, installierbar auf dem Handy.
- Optionaler **Advanced-Modus** mit Demo-Funktionen (Partner-Jobbörsen, Partnerhinweise, Premium, Lohnstatistik, Firmenprüfung).

Headroom informiert mit amtlichen Quellen und gibt **keine** individuelle Steuer- oder Rechtsberatung.

---

## 2. Ausgangslage: Das Problem hinter Headroom

### 2.1 Der Auslöser

Die Idee entstand aus einem echten Fall (hier anonymisiert): Ein Freund mit mehreren Anstellungen schrieb nachts um 00:32 Uhr „bruder – bist du wach – ich bin gefickt“ und schickte ein Foto eines Briefs seiner Krankenkasse.

Was passiert war, lässt sich in einer Kette beschreiben:

1. **Mehrere Jobs, kein Überblick.** Jeder Job für sich wirkte unproblematisch. Niemand rechnete zusammen, was insgesamt für ihn gilt.
2. **Eine übersehene Pflicht.** Er war **freiwillig** in der gesetzlichen Krankenversicherung versichert. In diesem Fall richtet sich der Beitrag nach dem Einkommen, und das Einkommen muss man der Krankenkasse selbst nachweisen. Die Kasse hatte mehrmals nach Unterlagen gefragt; er reagierte nicht, weil er nicht wusste, dass das Pflicht ist.
3. **Höchstbeitrag per Gesetz.** Ohne Angaben ist die Kasse gesetzlich verpflichtet, den Beitrag nach der **Beitragsbemessungsgrenze** zu berechnen – so, als verdiene er 5.812,50 € im Monat:

   | Bestandteil | Satz | Beitrag/Monat |
   |---|---:|---:|
   | Krankenversicherung | 14,0 % | 813,75 € |
   | Zusatzbeitrag | 2,69 % | 156,36 € |
   | Pflegeversicherung | 3,6 % | 209,25 € |
   | **Summe** | | **1.179,36 €** |

4. **Nachzahlung.** Rückwirkend ab Juli wurden für Juli bis September **3.538,08 €** auf einmal fällig – mit zwei Wochen Frist. Ab Oktober folgten 1.179,36 € monatlich.

Wichtig für die Darstellung: Es handelt sich um **Kranken- und Pflegeversicherungsbeiträge, nicht um Steuern**. Und mit Einkommensnachweisen lässt sich der Beitrag noch rückwirkend korrigieren (laut Bescheid innerhalb von zwölf Monaten) – aber nur, wenn man weiß, dass man handeln muss.

### 2.2 Das eigentliche Problem

> **Das Problem war nicht das Geld. Es war der fehlende Überblick.**

Wer mehrere Jobs hat, muss heute selbst zusammenrechnen und die Regeln kennen: Minijob-Grenze über alle Minijobs, Familienversicherung, Werkstudenten-Regel, kurzfristige Beschäftigung, Steuer. Die Informationen sind über Minijob-Zentrale, Krankenkassen, Rentenversicherung und Gesetzestexte verteilt. Niemand zeigt sie an einer Stelle, bezogen auf die eigene Situation.

Ein zweites, typisches Beispiel ist in der App als Demo-Profil hinterlegt (**Lena, 20**): Kneipe 340 € plus Café 280 € im Monat. Jeder Minijob für sich liegt unter 603 €, zusammen sind es 620 € – 17 € über der Grenze. Mehrere Minijobs werden Monat für Monat zusammengerechnet; liegt die Summe über 603 €, werden alle Jobs versicherungspflichtig.

### 2.3 Wie Headroom antwortet

| Was gefehlt hat | Was Headroom macht |
|---|---|
| Ein Blick auf alle Jobs zusammen | Rechnet alle Jobs zusammen – für Monat, Jahr und Saison |
| Wissen, welche Regeln für einen gelten | Zeigt die Grenzen für das eigene Profil, mit Quelle und der Folge beim Überschreiten |
| Rechtzeitig merken, dass sich etwas ändert | Warnt, bevor eine Grenze überschritten ist – nicht erst, wenn der Brief kommt |

Ehrliche Einordnung: Headroom meldet nichts an Krankenkassen und kennt die konkrete Meldepflicht freiwillig Versicherter noch nicht als eigene Erinnerung (siehe Kapitel 18).

---

## 3. Zielgruppen und Markt

### 3.1 Zielgruppen

Die App unterscheidet fünf Profile (Status im Onboarding):

| Status | Typische Situation |
|---|---|
| Student:in | Minijobs und kurzfristige Jobs neben dem Studium, oft familienversichert, teils BAföG |
| Werkstudent:in | Werkstudentenjob mit 20-Stunden-Regel in der Vorlesungszeit, ggf. Minijob daneben |
| Minijobber:in | ein oder mehrere Minijobs, kurzfristige Saisonjobs |
| Arbeitnehmer:in mit Nebenjob | versicherungspflichtige Hauptbeschäftigung plus Minijob(s) |
| Schüler:in | Minijob, Jugendarbeitsschutz (unter 18), Familienversicherung |

### 3.2 Marktzahlen (Zielgruppe 1: Studierende)

| Kennzahl | Wert | Quelle |
|---|---:|---|
| Studierende in Deutschland, Wintersemester 2025/26 | **2.876.900** | Statistisches Bundesamt, Pressemitteilung vom 28.11.2025 (vorläufig) |
| Anteil, der neben dem Studium arbeitet | **63 %** | DZHW, 22. Sozialerhebung („Die Studierendenbefragung in Deutschland“), erhoben im Sommersemester 2021 |
| Durchschnittlicher Erwerbsaufwand | rund **15 Stunden/Woche** | ebd. |
| Anteil, der das Studium (auch) über eigenen Job finanziert | **58,9 %** | ebd. |
| Studierende mit Job (Hochrechnung) | **≈ 1,8 Mio.** | eigene Hochrechnung: 63 % × 2.876.900 – keine amtliche Zahl |

Einordnung: Die 63 % stammen aus 2021 (Corona-Zeit); 2016 lag die Quote fünf Prozentpunkte höher. Schüler:innen, Minijobber:innen und Beschäftigte mit Nebenjob kommen als weitere Zielgruppen hinzu.

---

## 4. Produktidee und Leitprinzipien

### 4.1 Die Analogie

| Kalorien-Tracker | Headroom |
|---|---|
| Tagesbudget: 2.000 kcal | Minijob-Grenze: 603 € im Monat |
| Mahlzeit eintragen | Schicht eintragen – oder aus Kalender und Foto übernehmen |
| „Noch 400 kcal übrig“ | „Noch 116 € übrig, etwa 8 Stunden“ |
| Vor dem Snack nachsehen | „Was würde diese Schicht verändern?“ |

### 4.2 Leitprinzipien

Die Entwicklung folgte drei Kernprinzipien (aus dem Auftrag für den CODE Admission Day), die bei Konflikten Vorrang vor Einzelaufgaben haben:

1. **Einfache Benutzbarkeit.** Pro Bildschirm eine Hauptaussage und eine Hauptaktion. Klartext statt Fachbegriff; Fachbegriffe bekommen eine aufklappbare Ein-Satz-Erklärung. Die wichtigste Information ist höchstens zwei Taps vom Dashboard entfernt.
2. **Rollenbasierte Darstellung.** Was oben und groß steht, hängt vom Profil-Status ab (Kapitel 9). Alles andere bleibt erreichbar, aber zurückhaltend.
3. **Ästhetik und Erlebnis.** Ein einheitliches, ruhiges Gesamtbild mit einer einzigen blauen Akzentfarbe; Ampelfarben nur für den Grenzwert-Status; Bewegung nach den Design-Engineering-Prinzipien von Emil Kowalski (Kapitel 13).

### 4.3 Grundhaltung

- **Information statt Beratung.** Jede Grenze trägt Quelle, Gültigkeitszeitraum und Prüfdatum. Ungeprüfte Werte sind sichtbar markiert und lösen keine automatischen Warnungen aus.
- **Daten bleiben auf dem Gerät.** Es gibt keine Nutzerkonten. Datenübertragung findet nur in optionalen, ausdrücklich eingeschalteten Funktionen statt.
- **Kein Datenverkauf, Partner immer gekennzeichnet.**

---

## 5. Funktionsumfang im Detail

### 5.1 Onboarding

- Auswahl des Status (fünf Profile), Alter, Familienversicherung, BAföG, bei Arbeitnehmer:innen die Hauptbeschäftigung, bei Werkstudierenden die Vorlesungszeit.
- Sprache wählbar (Deutsch/Englisch).
- Zwei **Beispielprofile** zum direkten Ausprobieren:
  - **Standard:** zwei Minijobs (Barkeeper:in im Irish Pub, Service im Restaurant) plus 15 Festival-Tage (kurzfristig). Aktueller Monat 487 € von 603 € → **116 € Spielraum, etwa 8 Stunden**, Status „Knapp“. Die Monate seit Januar sind so verteilt, dass Monats- und Jahresansicht eine stimmige Geschichte erzählen.
  - **Lena, 20:** Kneipe 340 €/Monat ganzjährig, ab dem laufenden Monat zusätzlich Café 280 €/Monat → 620 € und damit **17 € über der Grenze**; dazu 15 Festival-Tage im Juli. Spätere Monate sind als geplant eingetragen.
- Beispieldaten sind in der Oberfläche sichtbar gekennzeichnet („Beispieldaten“ bzw. „Beispiel · Lena, 20“).

### 5.2 Dashboard („Dein Spielraum.“)

- Drei Ansichten über einen gleitenden Umschalter: **Monat, Jahr, Saison**. Die Überschrift passt sich dem Tab an.
- **Monat:** große Zahl „noch verfügbar in diesem Monat“ mit Stunden-Umrechnung über den Mindestlohn, Fortschrittsbalken, Status-Badge (Sicher < 80 %, Knapp 80–100 %, Über > 100 %), Quelle und Prüfdatum. Bei mehreren Minijobs über der Grenze ein klarer Hinweis, dass alle Jobs versicherungspflichtig werden können.
- **Jahr:** Hochrechnung des voraussichtlichen Minijob-Jahresverdiensts (Vergangenes plus Planung plus Fortschreibung), Erläuterung der Methode (aufklappbar), steuerliche Orientierung.
- **Saison:** Zähler für Tage in kurzfristiger Beschäftigung (70-Tage-Regel).
- **„Für dich wichtig“:** die für das Profil primären Grenzen; weitere Grenzen eingeklappt.
- Aktionen: **„Schicht eintragen“** (Hauptaktion), **„Was würde diese Schicht verändern?“**, **„Aus Kalender oder Foto übernehmen“**.
- Hinweise auf zu prüfende Kalendertermine und automatisch ergänzte Schichten.

### 5.3 Schichten

- Liste aller Schichten mit Datum, Job, Stunden, Uhrzeiten, Betrag; Kennzeichen „Geplant“ sowie Herkunft „Kalender“ oder „Foto“.
- Erfassen über Uhrzeiten oder Stunden, Option „wöchentlich wiederholen“ (12 Wochen, endet am Job-Enddatum).
- Bearbeiten und Löschen. Bearbeitete importierte Schichten werden bei späteren Kalender-Abgleichen nicht überschrieben.
- Zuschläge (in %) und Trinkgeld je Job werden pro Schicht berücksichtigt.

### 5.4 „Was würde diese Schicht verändern?“ (Schicht-Check)

Ein Sheet, in dem man Job, Datum und Stunden einer geplanten Schicht eingibt. Die App zeigt den Verdienst dieser Schicht und für jede relevante Grenze, wie viel danach noch bleibt oder um wie viel man darüber läge – z. B. „Danach blieben noch 47 € bis zum Grenzwert 603 €“. Berücksichtigt werden Monatsgrenze, Jahresgrenze, Familienversicherung und – bei Werkstudierenden – die Wochenstunden in der Vorlesungszeit.

### 5.5 Jobs

- Anlegen über 32 durchsuchbare **Job-Presets** in 13 Bereichen (Gastronomie, Hotel, Einzelhandel, Logistik, Veranstaltungen, Bildung, Betreuung, Haushalt, Sport, Büro, Werkstudent:in, Mobilität, Sonstiges) oder frei.
- Felder: Titel, Beschäftigungsart (Minijob, kurzfristig, Werkstudent:in, regulär), Stundenlohn, erwarteter Lohn, Start/Ende, Firma, Stadt, Wirtschaftszweig, Anforderungsniveau, Zuschläge, Trinkgeld, **Stichwörter für Kalender und Dienstplan**.
- Plausibilitätsprüfung des Firmennamens (zu kurz, nur Ziffern, Tastatur-Mash) mit Korrekturvorschlag bei Ähnlichkeit zu vorhandenen Firmen.
- Vorab-Hinweis beim Anlegen eines weiteren Minijobs, wie viel neben den bestehenden noch passt.

### 5.6 Grenzwerte

Übersicht aller für das Jahr gültigen Grenzwerte mit Wert, Zeitraum, Folge beim Überschreiten, Quelle (verlinkt) und Prüfdatum; nach Rolle gruppiert. Ungeprüfte Werte sind als solche markiert.

### 5.7 Mehr

- **Auswertungen:** Monatsverdienst der letzten sechs Monate als Balkendiagramm, Stunden je Job, Verdienst je Branche, verbrauchte kurzfristige Tage.
- **Lohncheck:** Vergleich jedes Stundenlohns mit dem gesetzlichen Mindestlohn (13,90 €), Hinweis bei Unterschreitung, Link zum Entgeltatlas der Bundesagentur für Arbeit.
- **Schichten übernehmen** (Kalender/Foto, Kapitel 6).
- **Einstellungen:** Profil ändern, Dunkelmodus, **Advanced-Modus**, JSON-Export und -Import, Demo zurücksetzen, alle Daten löschen.

### 5.8 Allgemein

- Zweisprachig (Deutsch/Englisch), Umschalter in der Kopfzeile.
- Dunkelmodus.
- Installierbar als PWA mit Offline-Grundgerüst (Service Worker cacht Startseite, Manifest, Icon).
- Mobile-first, getestet auf 375 und 390 px Breite ohne horizontales Scrollen.

---

## 6. Schicht-Tracker: Kalender, Foto und Dublettenprüfung

Der Schicht-Tracker ist die wichtigste Erweiterung des aktuellen Stands. Er ist eine reguläre Funktion – kein Demo-Feature – und über „Aus Kalender oder Foto übernehmen“ auf dem Dashboard, den Button „Importieren“ in der Schichtliste oder „Mehr“ erreichbar.

### 6.1 Kalender (Google und Apple)

- **Privater iCal-Link** (Google: „Privatadresse im iCal-Format“; Apple: Link eines öffentlichen Kalenders) oder **.ics-Datei**. Die App zeigt für beide Anbieter eine Drei-Schritte-Anleitung.
- Übernommen wird der Zeitraum **30 Tage zurück bis 60 Tage voraus**.
- Unterstützt: Zeitzonen (TZID und UTC), gefaltete Zeilen und Escapes, `DURATION`, wiederkehrende Termine (`RRULE` täglich und wöchentlich mit `BYDAY`, `COUNT`, `UNTIL`, `INTERVAL`), Ausnahmen (`EXDATE`), verschobene Einzeltermine (`RECURRENCE-ID`). Ganztägige, abgesagte und über 16 Stunden lange Termine werden übersprungen. Wandzeiten bleiben über die Sommer-/Winterzeit-Umstellung erhalten.
- **Jobzuordnung:** über die Stichwörter des Jobs, dann über Jobtitel oder Firma im Termintitel. Bei keinem oder mehrdeutigem Treffer bleibt der Termin ohne Job.
- **Prüfschritt:** Termine mit Job sind vorausgewählt; andere Termine (Arzt, Geburtstag) sind eingeklappt und abgewählt. Datum, Zeiten und Job sind editierbar. Ordnet man einen Termin von Hand zu, merkt sich die App dessen Titel als Stichwort.
- **Automatischer Abgleich:** Verbundene Kalender-Links werden beim Öffnen höchstens alle sechs Stunden abgefragt. Eindeutig zugeordnete neue Termine werden direkt übernommen; Termine, die nach Arbeit klingen („Schicht“, „Dienst“, „Arbeit“ …), aber zu keinem Job passen, landen als „zu prüfen“ auf dem Dashboard.
- Der Abruf eines Links läuft über den lokalen Server, weil Google und iCloud keinen direkten Abruf aus dem Browser erlauben (CORS). Ohne Server funktioniert der Datei-Import vollständig.

### 6.2 Foto und Screenshot

- Bild aus Kamera oder Galerie wählen oder per Strg/Cmd + V einfügen; Vorschau des Bildes.
- **Texterkennung lokal im Browser** (tesseract.js, Deutsch und Englisch). Beim ersten Lauf werden Sprachdaten nachgeladen; das Bild verlässt das Gerät nicht.
- Der Dienstplan-Parser liest **zeilenweise** und erkennt Datumsangaben (`19.10.`, `24.10.2026`), Wochentage (Mo/Montag/Mon …) mit Kalenderwoche oder vorherigem Datum, Zeitspannen (`09:00 – 14:30`, `9-17 Uhr`, `9.30-13.30`), Stundenangaben (`6 Std`, `4,5 h`), Nachtschichten über Mitternacht, freie Tage („frei“, „Urlaub“) und Tabellen, in denen Datum und Zeit auf getrennten Zeilen stehen.
- Getestet mit echter OCR auf einem Beispiel-Dienstplan: alle vier Schichten korrekt erkannt, der freie Tag übersprungen, die Nachtschicht 20:00–02:00 als 6 Stunden gezählt.
- Danach derselbe Prüfschritt wie beim Kalender, mit einem Standard-Job für alle Zeilen ohne Zuordnung.

### 6.3 Dublettenprüfung

Eine Schicht wird nur einmal erfasst, auch wenn sie per Foto **und** Kalender ankommt:

1. **Gleiche Kalender-Kennung** (UID, bei Serien plus ursprünglicher Startzeit): bei geänderter Zeit eine Aktualisierung, sonst übersprungen.
2. **Gleicher Job, gleicher Tag, mindestens 50 % Zeitüberlappung** (auch über Mitternacht): Der bestehende Eintrag bleibt; fehlende Uhrzeiten und die Kalender-Kennung werden ergänzt.
3. **Ohne Uhrzeiten:** gleicher Job, gleicher Tag, Stunden ±0,25.
4. Doppelte Zeilen innerhalb eines Imports werden zusammengefasst.

Von Hand bearbeitete importierte Schichten (`editedManually`) werden bei späteren Abgleichen nicht überschrieben. Der Prüfschritt zeigt die Ergebnisse als „neu“, „wird ergänzt“ und „schon erfasst“.

### 6.4 Nicht Teil dieses Stands

Die Anbindung spezifischer Job-Apps (z. B. Schichtplan-Software von Arbeitgebern) ist bewusst für später vorgesehen.

---

## 7. Advanced-Modus (Demo-Funktionen)

Ein einzelner Schalter in den Einstellungen, **standardmäßig aus**. Ohne Advanced-Modus sind alle Demo-Funktionen aus, egal wie die Einzel-Flags stehen; die reguläre App bleibt unverändert. Beim ersten Einschalten werden Jobbörse und Partnerhinweise aktiviert; die Einzel-Flags sind dann im Entwicklerbereich schaltbar. Wochenkalender und Job-Kombinationen sind seit 31.10.2026 keine Advanced-Funktionen mehr: Sie gelten immer, wenn ihre fachliche Bedingung zutrifft. Welche Funktion für wen aktiv ist, entscheidet zentral die Feature-Registry in `packages/core/src/features/registry.ts`.

| Funktion | Beschreibung |
|---|---|
| **Jobbörse mit Partner-Jobbörsen** | Offene Schichten (40 klar markierte Demoinserate vom lokalen Server oder lokal). Jede Schicht wird gegen den eigenen Spielraum geprüft: passt / prüfen / zu lang – inklusive Jahresgrenze, zweitem Minijob neben Hauptjob und Werkstudenten-Wochenstunden. Drei **fiktive Partner-Jobbörsen** (Schichtfuchs, Jobwolke, Campuskorb) mit Filter und „über …“-Kennzeichnung. Eigene Inserate können eingestellt werden. |
| **Partnerhinweise** | Kontextabhängige Hinweise in vier Stufen (z. B. Steuererklärung kann Geld zurückbringen; Ende der Familienversicherung; dauerhaft über der Minijob-Grenze; Fall passt nicht eindeutig). Partnerkarten (ELSTER plus fiktive Partner) sind immer als „Partner“ gekennzeichnet und ausblendbar. Erst ab 16 Jahren. |
| **Premium (Demo)** | Ohne Zahlung aktivierbar: Jahresbericht als PDF, Verlauf über mehrere Jahre. |
| **Anonyme Lohnstatistik** | Nach gesonderter Einwilligung (ab 16) Vergleich des eigenen Stundenlohns mit Gruppenwerten; Ausgabe erst ab 20 Datensätzen; Einwilligung widerrufbar mit Löschanforderung. Mindestens 3.200 synthetische Vergleichsdatensätze für die Demo. |
| **Firmenprüfung (OpenStreetMap)** | Auf Klick Abgleich von Firmenname und Stadt mit Nominatim. |

Eine Statistik-Demo nach Branche, Alter und Steuerstatus ist bewusst noch nicht umgesetzt.

---

## 8. Grenzwerte und Rechtsgrundlagen

Alle fachlichen Werte liegen zentral in `packages/core/data/limits.ts`. Jeder Datensatz enthält Wert, Einheit, Zeitraum, betroffene Profile, Bedingung, Folge, Quelle, Gültigkeit, Prüfdatum und den Status `verified`. Interne Prüfnotizen (`reviewNote`) werden nie angezeigt. Die Minijob-Grenze 2027 wird aus dem Mindestlohn abgeleitet: `ceil(Mindestlohn × 130 / 3)`.

| Grenze | 2026 | 2027 | Gilt für | Geprüft | Quelle |
|---|---:|---:|---|---|---|
| Minijob-Verdienstgrenze | 603 €/Monat | 633 €/Monat | alle | ja | Minijob-Zentrale |
| Minijob-Jahresverdienst | 7.236 €/Jahr | 7.596 €/Jahr | alle | ja | Minijob-Zentrale |
| Minijob neben Hauptbeschäftigung | 1 Job | 1 Job | Arbeitnehmer:innen | ja | Minijob-Zentrale |
| Familienversicherung | 565 €/Monat | – | Student:in, Werkstudent:in, Minijobber:in, Schüler:in (familienversichert, unter 25) | 2026 ja, 2027 offen | § 10 SGB V, SVBezGrV 2026 (3.955 € / 7) |
| Kurzfristige Beschäftigung | 70 Arbeitstage | 70 Arbeitstage | Student:in, Werkstudent:in, Minijobber:in, Schüler:in | ja | Minijob-Zentrale |
| Werkstudenten-Arbeitszeit | 20 h/Woche | 20 h/Woche | Werkstudent:in (Vorlesungszeit) | ja | Deutsche Rentenversicherung |
| BAföG-Hinzuverdienst | 603 €/Monat | – | Student:in mit BAföG | offen | Minijob-Zentrale (Magazin) |
| Steuerlicher Orientierungswert | 13.614 €/Jahr | 13.614 €/Jahr | Student:in, Werkstudent:in, Arbeitnehmer:in | Methode offen | EStG §§ 9a, 10c, 32a |
| Grundfreibetrag | 12.348 € | 12.348 € | dto. | ja | § 32a EStG |
| Arbeitnehmer-Pauschbetrag | 1.230 € | 1.230 € | dto. | ja | § 9a EStG |
| Sonderausgaben-Pauschbetrag | 36 € | 36 € | dto. | ja | § 10c EStG |
| Mindestlohn | 13,90 €/h | 14,60 €/h | alle | ja | BMAS |
| Jugendarbeitsschutz (nur Information) | 8 h/Tag, 40 h/Woche, 6–20 Uhr, Pausen | wie 2026 | Schüler:in unter 18 | ja | §§ 8, 11, 14 JArbSchG |

Der steuerliche Orientierungswert setzt sich aus Grundfreibetrag, Arbeitnehmer-Pauschbetrag und Sonderausgaben-Pauschbetrag zusammen (12.348 + 1.230 + 36 = 13.614 €). Die Methode ist bewusst vereinfacht (Brutto statt zu versteuerndes Einkommen, ohne Vorsorgepauschale) und als ungeprüft markiert.

Ungeprüfte Werte werden sichtbar gekennzeichnet und erzeugen **keine** automatische Grenzwarnung.

Weitere Quellen in der App: Entgeltatlas, ELSTER, Minijob-Zentrale, Klassifikation der Berufe (KldB 2010), Klassifikation der Wirtschaftszweige (WZ 2025). Für Einwilligungen gilt ein Mindestalter von 16 Jahren (Art. 8 DSGVO).

---

## 9. Rollenbasierte Darstellung

Die Zuordnung liegt zentral in `packages/core/data/roles.ts` und entscheidet nur über **primär** (oben, groß) oder **sekundär** (zurückhaltend, eingeklappt) – nicht über richtig oder falsch. Die Profilfilter (Alter, Familienversicherung, BAföG, Hauptjob) gelten zusätzlich.

| Rolle | Primär | Sekundär |
|---|---|---|
| Student:in | Minijob-Monatsgrenze, Familienversicherung, BAföG, kurzfristige Beschäftigung | Steuer-Orientierung, Werkstudenten-Regel |
| Werkstudent:in | 20-Stunden-Woche, Minijob-Monatsgrenze, Steuer-Orientierung | Familienversicherung, BAföG |
| Minijobber:in | Minijob-Monatsgrenze, kurzfristige Beschäftigung | Steuer-Orientierung |
| Arbeitnehmer:in mit Nebenjob | Minijob neben Hauptjob, Steuerklasse-VI-/Lohnsteuer-Info | Minijob-Grenze allgemein |
| Schüler:in | Minijob-Monatsgrenze, Jugendarbeitsschutz, Familienversicherung | Steuer-Orientierung |

---

## 10. Technische Architektur

### 10.1 Überblick

Monorepo mit npm-Workspaces:

```text
app/                 React-PWA (TypeScript, Vite)
  src/App.tsx              Bildschirme und Komponenten
  src/import/ImportPage.tsx  Schicht-Import (Kalender, Foto, Prüfschritt)
  src/lib/storage.ts        Laden, Speichern, Löschen, Demo-Profile
  src/lib/db/               Speicher je Datensatz, Übernahme des alten Blocks
  src/lib/shiftImport.ts    Import anwenden, Kalender abgleichen
  src/app/screenGate.ts     sperrt Bildschirme ohne Freigabe der Feature-Registry
  src/i18n/translations.ts  Deutsch und Englisch
  src/mock/data.ts          gekennzeichnete Demodaten
  src/style.css             Design-Tokens und Komponenten
packages/core/       reine TypeScript-Logik ohne Browser- oder Netzwerkzugriff
  data/limits.ts            Grenzwerte mit Quelle und Prüfstatus
  data/roles.ts             Rollenzuordnung
  data/jobPresets.ts        32 Job-Presets
  src/index.ts              Berechnungen
  src/shiftImport.ts        iCal-Parser, Dienstplan-Parser, Jobzuordnung, Dubletten
packages/contracts/  Zod-Schemas der künftigen Backend-Schnittstelle (Konto, Abgleich)
backend/             künftiges Backend (Fastify, Postgres, Kysely): Konfiguration, /health, /ready, CORS, Rate-Limit, geschwärzte Logs
server/              optionaler lokaler Demo-Server (Express, SQLite)
design-system/headroom/MASTER.md   Gestaltungsregeln
```

### 10.2 Technologien

| Bereich | Technik |
|---|---|
| Oberfläche | React 19.3, TypeScript 7.0, Vite 8.3 |
| Schrift | Plus Jakarta Sans (variabel, lokal gebündelt) |
| Texterkennung | tesseract.js 7 (lokal im Browser) |
| Server | Express 5.3, better-sqlite3 13 |
| Tests | Vitest 5, Playwright 1.64, jsdom |

### 10.3 Kernlogik (`packages/core`)

Wichtige Funktionen: `activeLimits` (Profilfilter), `monthTotal`, `monthlySummary` (Rest, Stunden, Status), `annualMiniProjection` und `annualProjectionBreakdown` (Jahreshochrechnung), `monthlyIncomeForLimit`, `miniJobRoomBesideOthers`, `multipleMiniJobsOverCap`, `shortDays` (kurzfristige Tage), `workingHoursCheck` und `hoursInWeek` (Werkstudierende), `isInLecturePeriod`, `shiftCheck`, `wageBelowMinimum`, `peerMedian`/`peerWagePosition`, `recommendationLevel` (Partnerhinweise), `companyPlausibility`, `roleTier`, dazu der Schicht-Import: `parseIcs`, `parseScheduleText`, `matchJob`, `sameShift`, `dedupeCandidates`.

### 10.4 Datenhaltung in der App

- Primär **IndexedDB** (`headroom-local`, Version 2), Fallback **localStorage**, notfalls nur Arbeitsspeicher.
- Gespeichert wird **je Datensatz** (Profil, Job, Schicht, Zahlung, Kalender, Einstellungen, Gerätezustand). Jedes Feld trägt eine Zeitmarke (hybride logische Uhr aus `packages/core/src/records`), damit Geräte später feldweise zusammenführen können. Gelöschte Einträge bleiben als Löschvermerk stehen.
- Der Gerätezustand (Beispielprofil, Premium-Demo, Lohnstatistik-Token, offene Importe, Onboarding) wird nie abgeglichen.
- Der alte Block aus Version 1 wird beim ersten Start je Datensatz geprüft und übernommen. Er bleibt bis zum nächsten erfolgreichen Start liegen und wird erst entfernt, wenn jeder seiner Einträge im neuen Speicher steht.
- Ungültige Einträge (aus dem alten Block oder einer Sicherungsdatei) werden einzeln **aussortiert und aufbewahrt**. Die App meldet sie, sie gehen mit in den Export und lassen sich in den Einstellungen verwerfen.
- „Auf diesem Gerät löschen“ leert den Speicher vollständig, ohne Löschvermerke, und entfernt die Kennzeichnung als Beispielprofil.
- Feature-Flags und Advanced-Modus liegen getrennt in localStorage.
- JSON-Export enthält Daten und Flags, aber **keine** privaten Kalender-Links.

### 10.5 Lokaler Demo-Server (`server/src/index.ts`, Port 8787)

| Endpunkt | Zweck |
|---|---|
| `GET /health` | Statusabfrage |
| `GET /api/listings`, `POST /api/listings` | Demo-Jobbörse (SQLite, 40 Startinserate) |
| `POST /api/peer-opt-in`, `DELETE /api/peer-opt-in/:token` | freiwillige Lohndaten, Löschung |
| `GET /api/peer-stats` | Gruppenwerte (erst ab 20 Datensätzen) |
| `POST /api/calendar-feed` | Kalender-Abruf für Google/iCloud |

Schutzmaßnahmen am Kalender-Endpunkt: nur `https`/`webcal`, Host-Allowlist (`calendar.google.com`, `*.icloud.com`), Prüfung auch jeder Weiterleitung, keine Zugangsdaten in der URL, 10 Sekunden Timeout, maximal 2 MB, Link im Request-Body statt in der URL, keine Protokollierung des Links. Eingaben an allen Endpunkten werden auf genaue Felder und Wertebereiche geprüft; JSON-Bodys sind auf 8 KB begrenzt.

### 10.6 Ausführung

- App allein: `npm run dev` (http://localhost:5173). Der Vite-Proxy leitet `/api` und `/health` an den Server weiter.
- App plus Server: `npm run dev:all`.
- Produktionsbuild: `npm run build`. Für eine eigenständig gehostete Demo wird mit relativen Pfaden gebaut (`vite build --base ./`).
- Backend (im Aufbau): `npm run dev:backend` mit `DATABASE_URL`, `ALLOWED_ORIGINS` und `PRELOGIN_SECRET`, oder `docker compose up --build` (API und Postgres 17). Details im README, Abschnitt „Backend“.

---

## 11. Datenmodell

| Typ | Wichtige Felder |
|---|---|
| `Profile` | `status`, `age`, `familyInsured`, `bafoeg`, `hasMainJob`, `semesterPeriods` |
| `Job` | `id`, `title`, `type` (mini-job, short-term, working student, regular), `wage`, `startDate`, `endDate`, `company`, `city`, `industry`, `skillLevel`, `expectedWage`, `surcharges`, `tipsEnabled`, `tips`, `calendarKeywords` |
| `Shift` | `id`, `jobId`, `date`, `hours`, `startTime`, `endTime`, `days`, `planned`, `recurring`, `surchargeAmount`, `tips`, `source` (manual, calendar, photo), `externalId`, `calendarId`, `editedManually` |
| `Limit` | `id`, `name`, `value`, `unit`, `period`, `appliesTo`, `condition`, `consequence`, `sourceName`, `sourceUrl`, `asOf`, `validFrom`, `validTo`, `verified`, `reviewNote` |
| `AppState` | `profile`, `jobs`, `shifts`, `onboarded`, `language`, `darkMode`, `isPremium`, `dismissedRecommendations`, `peerOptIn`, `peerToken`, `example`, `calendars`, `pendingImports` |
| `CalendarSource` | `id`, `name`, `kind` (url, file), `url`, `lastSync`, `lastError` |
| `ShiftCandidate` | `date`, `startTime`, `endTime`, `hours`, `title`, `source`, `externalId`, `jobId` |

---

## 12. Datenschutz und Datenflüsse

**Grundbetrieb:** Profil, Jobs und Schichten liegen ausschließlich auf dem Gerät. Schriften sind gebündelt, es gibt keine automatischen Anfragen an Dritte. Optionale Funktionen sind in einer frischen Installation ausgeschaltet.

| Funktion | Was übertragen wird | Wohin |
|---|---|---|
| Kalender-Link | der private iCal-Link (im Body, nicht in der URL) | lokaler Server → nur Google bzw. iCloud |
| Kalender-Datei | nichts | – (lokal) |
| Foto/Screenshot | nichts; nur Sprachdaten werden einmalig nachgeladen | – (Erkennung lokal) |
| Lohnstatistik (Advanced, Einwilligung, ab 16) | zufälliges Geräte-Token, Job-Preset, Stadt, tatsächlicher und erwarteter Stundenlohn, Monat – keine Firma | lokaler Demo-Server |
| Jobbörse (Advanced) | beim eigenen Inserat: Titel, Stadt, Datum, Dauer, Stundenlohn | lokaler Demo-Server |
| Firmenprüfung (Advanced) | auf Klick Firmenname und Stadt | OpenStreetMap Nominatim |
| Partnerkarten (Advanced) | nichts; externe Seite erst nach Klick | – |

Alle Funktionen mit Datenübertragung oder Partnerbezug (Lohnstatistik, eigenes Inserat, Firmenprüfung, Partnerhinweise) stehen erst ab 16 Jahren zur Verfügung (Art. 8 DSGVO). Private Kalender-Links werden nicht exportiert. Die Löschfunktion entfernt lokale Daten, Flags und fordert die Löschung freiwilliger Lohndaten an. Der Server ist ausdrücklich nur für den lokalen Demo-Betrieb ausgelegt (Kapitel 18).

**Backend (im Aufbau):** Die App nutzt es noch nicht, es überträgt also noch keine Nutzerdaten. Seine Logs enthalten nur Methode, Pfad ohne Parameter und wenige feste Header, keine IP-Adressen, Zugangsdaten oder Inhalte.

---

## 13. Gestaltung und Bedienerlebnis

Grundlage ist `design-system/headroom/MASTER.md`; Quelle der Wahrheit ist `app/src/style.css`.

- **Stil:** hell, ruhig, viel Weißraum, eine einzige blaue Akzentfarbe.
- **Farben:** Hintergrund `#F4F5F7`, Text `#0E1116`, Akzent `#2456F5`, Akzent-Tint `#EAF0FF`. Status nur für Grenzwerte: Sicher `#0F7A55`, Knapp `#A35400`, Über `#C4291D`. Eigene Tokens für den Dunkelmodus.
- **Typografie:** Plus Jakarta Sans; Zahlen mit tabellarischen Ziffern; große Hero-Zahl.
- **Formen:** Karten mit 22 px Radius, Buttons 14 px, Pillen für Status und Datum.
- **Bewegung** (nach Emil Kowalski): starke Ease-out-Kurven, kurze Dauern unter 300 ms, Druck-Feedback `scale(0.97)`, Hover nur bei Maus, Fortschrittsbalken über `clip-path`, Status-Badge animiert nur bei echtem Wechsel, gleitende Segment-Indikatoren, Bottom-Sheet mit Drawer-Kurve, `prefers-reduced-motion` respektiert.
- **Logo:** blaues abgerundetes Quadrat mit „h·“ und Wortmarke „Headroom“.

---

## 14. Qualitätssicherung

| Ebene | Umfang |
|---|---|
| Core-Unit-Tests (Vitest) | 30 Tests: Einkommensprojektion, Profilfilter, Jahreswerte, Werkstudentenstunden, Kurzfristigkeit, Peer-Schwellen, Empfehlungsstufen, Rollen; iCal (UTC/TZID, Ganztag, gefaltete Zeilen, RRULE/EXDATE, RECURRENCE-ID, lange Serien), Dienstplan-Parser, Jobzuordnung, alle Dublettenregeln |
| App-Unit-Tests (Vitest) | 7 Tests: Demodaten-Geschichte (487 €), Monats- und Jahresverlauf, Speicher-Migration, Export ohne Kalender-Link |
| End-to-End (Playwright) | 8 Tests: Onboarding (116 €), Schicht aktualisiert Betrag, Quellen und Standdatum, ausgeblendete Demo-Funktionen, 375-px-Layout, Lena-Fall, Kalenderimport ohne Doppelerfassung, Advanced-Modus ein/aus |
| Typprüfung und Build | `tsc` für App und Server, Vite-Build |
| Manuelle Prüfungen | Handyansicht 375/390 px, echte OCR auf Beispiel-Dienstplan, Proxy gegen erlaubte und gesperrte Hosts, Abruf eines echten öffentlichen Google-Kalenders |

Stand der letzten Läufe: alle Tests grün.

---

## 15. Geschäftsmodell

**Grundsatz:** Kostenlos, wo es um Grenzen geht – bezahlt, wo es Mehrwert gibt.

| Stufe | Was Nutzer:innen bekommen | Erlös |
|---|---|---|
| Kostenlos | alle Grenzen, Tracking, Kalender- und Foto-Import | Reichweite, Vertrauen |
| Premium | Jahresbericht (PDF), Verlauf über mehrere Jahre, Erinnerungen | **5 € pro Monat** |
| Partner-Jobbörsen | Schichten, die in den eigenen Spielraum passen | Provision je Vermittlung (noch offen) |
| Partnerangebote | Steuer, Versicherung – nur bei echtem Anlass | Provision je Abschluss (noch offen) |
| Hochschulen (B2B, Idee) | Lizenz für Beratungsstellen, die zu Nebenjobs beraten | Lizenzgebühr (noch offen) |

Drei Regeln: Grenzen bleiben gratis · keine Datenverkäufe · Partner immer gekennzeichnet. Rechtlicher Prüfpunkt: Vor einer Kooperation mit Krankenkassen sind die Regeln zur Mitgliederwerbung gesetzlicher Krankenkassen zu klären.

---

## 16. Projektstand und Entwicklungshistorie

### 16.1 Commits

| Commit | Inhalt |
|---|---|
| `7167320` | Baseline vor der Admission-Day-Überarbeitung |
| `ff3d571` | Altes Stylesheet entfernt |
| `c8d4fd1` | Aufgabe 1: keine TODO-Texte mehr in der Oberfläche |
| `1b287a4` | Aufgabe 2: Grenzwerte gegen amtliche Quellen geprüft |
| `f7d1827` | Aufgabe 3: Dashboard-Überschrift passt sich dem Tab an |
| `e3bb102` | Aufgabe 4: Demodaten erzählen eine stimmige Geschichte |
| `8fa00be` | Aufgabe 5: zweites Demo-Profil (Lena) |
| `2f27c7c` | Aufgabe 6: rollenbasierte Darstellung |
| `9afe5be` | Aufgabe 7: Feinschliff Ästhetik und Erlebnis |
| `a782d82` | Nachtrag: interne Nominatim-Notiz nicht mehr anzeigen |
| `06b7dda` | Aufgabe 8: Abhängigkeiten auf installierte Versionen gepinnt |
| `b09b8bd` | Bewegung und Feedback nach Emil Kowalski |
| `97982f1` | Schicht-Tracker (Kalender + Foto) und Advanced-Modus |

### 16.2 Nicht committete Änderung

In den Texten des Schicht-Checks stand das €-Zeichen doppelt („116 € €“, „€47 € left“), weil der Betrag schon formatiert übergeben wird. Die Korrektur in `app/src/i18n/translations.ts` (Deutsch und Englisch, Texte „noch übrig“ und „über der Grenze“) ist umgesetzt und getestet, aber noch nicht committet. Die veröffentlichte Handy-Demo enthält die Korrektur bereits.

### 16.3 Reifegrad

- **Funktionsfähig und vorführbar:** Onboarding, Dashboard, Grenzwerte, Jobs, Schichten, Schicht-Check, Schicht-Tracker, Auswertungen, Lohncheck, Einstellungen, Advanced-Demo.
- **Prototyp-Charakter:** Server nur lokal; Partner fiktiv; Premium ohne Zahlung; Lohnstatistik mit synthetischen Daten.
- **Fachlich zu prüfen:** einzelne Grenzwerte und die steuerliche Methode (Kapitel 18).

---

## 17. Begleitmaterial (Pitch, Demo, Videos)

| Material | Ort | Inhalt |
|---|---|---|
| Pitch-Deck Deutsch | Artifact „Headroom Pitch – CODE University“ | 10 Folien: Chat um 00:32 und Nachzahlung → „Was passiert ist“ (Ursachenkette) → „Was gefehlt hat“ (Brücke) → Kalorien-Tracker → Prinzip → Markt → Monetarisierung im Überblick → Konzept → Erlösmodell → Danke; mit Sprechernotizen |
| Pitch-Deck Englisch | Artifact „Headroom Pitch – CODE University (English)“ | dieselben 10 Folien auf Englisch |
| PDF-Fassungen | lokal erzeugt | beide Decks als PDF |
| Handy-Demo | Artifact „Headroom Demo“ | gebaute App zum Öffnen auf dem Handy (Kalender-Links ohne lokalen Server nicht verfügbar; Datei-Import und Foto-Scan direkt) |
| Video 1 | `brag-output/` | 21 s, Deutsch, Musik, ohne Sprecher |
| Video 2 (Startup-Parodie) | `brag-output-2026-10-26-124226/` | 20,5 s, Englisch, nummerierte Pitch-Folien |
| Video 3 (mit Sprecher) | `brag-output-2026-10-26-131839/` | 24,5 s, englische Männerstimme, Demo-Bildschirme Deutsch |
| Video 4 (mit Sprecher, ausführlich) | `brag-output-2026-10-26-133448/` | 65,6 s, komplett Englisch, Problem in sechs Szenen, Musik von ruhig zu fröhlich |

Die Artifacts sind privat und müssen zum Teilen freigegeben werden. Die Musik in den Videos 3 und 4 steht unter CC BY 4.0 und braucht die Nennung „Music: Sascha Ende, ende.app“. Die `brag-output*`-Ordner liegen ungetrackt im Repository.

---

## 18. Offene Punkte, Risiken und nächste Schritte

### 18.1 Fachliche Prüfpunkte

- Familienversicherung 2027 und BAföG 2026/2027 erst mit gültiger amtlicher Quelle eintragen.
- Steuerlicher Orientierungswert: Methode (Brutto vs. zu versteuerndes Einkommen, Vorsorgepauschale) fachlich prüfen; keine persönliche Steuerfreigrenze suggerieren.
- Werkstudentenprivileg: 26-Wochen-Regel, Lage der Arbeitszeit und Ausnahmen fehlen.
- Kurzfristige Beschäftigung: landwirtschaftliche Sonderregeln fehlen; die 70-Tage-/3-Monats-Regel ersetzt keine Einzelfallprüfung.
- Trinkgeld und Jugendarbeitsschutz vor jeder Berechnung oder Warnung mit amtlichen Quellen klären.
- Job-Presets: Wirtschaftszweige von WZ 2008 auf WZ 2025 übertragen, Anforderungsniveaus an KldB 2010 validieren.
- Jahresprojektion, Saisonabgrenzung, Statuswechsel und Grenzänderungen am Jahreswechsel mit weiteren Fällen prüfen.

### 18.2 Technische und rechtliche Voraussetzungen vor einer Veröffentlichung

- Server: Hosting, Aufbewahrungsfristen, Löschkonzept, Rate-Limits, Sicherheitskonfiguration, Datenschutzhinweise.
- Nominatim: App-Kennung, Anfragefrequenz, Caching und Namensnennung nach Nutzungsrichtlinie.
- Barrierefreiheit systematisch gegen WCAG AA sowie Tastatur- und Screenreader-Bedienung prüfen.
- Weitere PWA-Icon-Varianten und Aktualisierungsverhalten des Service Workers.
- Partnerhinweise und externe Anbieter neutral prüfen; Regeln zur Mitgliederwerbung gesetzlicher Krankenkassen klären.

### 18.3 Bekannte Lücken im Schicht-Tracker

- Kalender-Abo braucht den lokalen Server; gehostet fehlt ein abgesicherter Abruf-Dienst.
- Monatliche Kalender-Wiederholungen (`FREQ=MONTHLY`) werden nur als Einzeltermin gelesen.
- Im Kalender gelöschte Termine werden beim Abgleich nicht entfernt.
- Die OCR-Qualität hängt stark von Bild und Layout ab; komplexe Tabellen brauchen Korrektur im Prüfschritt.
- Anbindung spezifischer Job-Apps steht noch aus.

### 18.4 Empfohlene nächste Schritte

1. **Textkorrektur committen** (doppeltes €-Zeichen).
2. **Meldepflicht-Erinnerung** als eigene Funktion: Wer „freiwillig versichert“ angibt, bekommt einen Hinweis, dass das Einkommen der Krankenkasse nachzuweisen ist, und eine Erinnerung bei Änderungen. Das schließt die Lücke zwischen dem Gründungsfall und dem heutigen Funktionsumfang.
3. Provisionen und B2B-Modell für das Erlösmodell festlegen.
4. Fachliche Prüfung der offenen Grenzwerte durch eine sachkundige Stelle.
5. Betriebskonzept für einen gehosteten Server (Kalender-Abruf, Datenschutz, Sicherheit).
6. Statistik-Demo nach Branche, Alter und Steuerstatus (zurückgestellt) – nur mit synthetischen oder strikt aggregierten Daten.

---

## 19. Anhang: Starten, Testen, Bauen

Voraussetzung: aktuelle Node.js-Version. Im Projektstamm:

```sh
npm install
npm run dev                 # nur die PWA, http://localhost:5173
npm run dev:all             # PWA plus lokaler Demo-Server auf 127.0.0.1:8787
npm test                    # Vitest: Core- und App-Tests
npm run test:e2e            # Playwright-Smoketests (Chromium nötig)
npx tsc --noEmit -p server/tsconfig.json
npm run build               # Produktionsbuild
```

`HEADROOM_DB_PATH=/anderer/pfad/headroom.sqlite npm run dev:server` legt die SQLite-Datenbank des Demo-Servers an einem anderen Ort an.

**Für eine Vorführung:** Im Onboarding „Lena, 20“ laden (17 € über der Grenze) oder „Student:in“ wählen und „Headroom öffnen“ (116 € Spielraum). Danach „Aus Kalender oder Foto übernehmen“ für den Schicht-Import und im Dashboard „Was würde diese Schicht verändern?“.
