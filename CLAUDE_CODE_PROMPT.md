# Auftrag: Headroom für den CODE Admission Day fertig machen

Du arbeitest im Repo **Headroom**: eine mobile PWA (React + TypeScript + Vite, Monorepo mit `app/`, `packages/core/`, `server/`). Sie rechnet mehrere Nebenjobs zusammen und zeigt, wie viel man noch verdienen darf, bevor eine gesetzliche Grenze greift. Lies zuerst `README.md`, `design-system/headroom/MASTER.md`, `packages/core/data/limits.ts`, `packages/core/src/index.ts` und `app/src/App.tsx`, bevor du etwas änderst.

Die App wird in einem 2–3-minütigen Pitch live auf dem Handy gezeigt. Sie muss auf den ersten Blick fertig, schön und verständlich wirken.

<kernprinzipien>
Diese Prinzipien gelten für jede Entscheidung in diesem Auftrag. Wenn eine Aufgabe unten mit ihnen kollidiert, gewinnen die Prinzipien.

## 1. Einfache Benutzbarkeit
Die App darf niemanden überfordern. Die Zielgruppe weiß oft selbst nicht genau, welche Regeln für sie gelten. Deshalb:
- Pro Bildschirm eine Hauptaussage und eine Hauptaktion.
- Klartext statt Fachbegriff. Fachbegriffe (z. B. „kurzfristige Beschäftigung“) bekommen einen Satz Erklärung direkt daneben, aufklappbar.
- Der Weg zur wichtigsten Information hat höchstens zwei Taps ab dem Dashboard.

## 2. Rollenbasierte Darstellung
Was angezeigt wird, hängt vom gewählten Status im Profil ab (Student:in, Werkstudent:in, Minijobber:in, Arbeitnehmer:in mit Nebenjob, Schüler:in).
- **Primäre Schicht:** Die Grenzen und Funktionen, die für diese Rolle gelten, stehen immer oben und groß.
- **Sekundäre Schicht:** Alles andere ist erreichbar, aber zurückhaltend: eingeklappt, unter „Weitere Grenzen“ oder auf der Grenzwerte-Seite. Nie auf dem Dashboard prominent.

Verwende diese Zuordnung als Ausgangspunkt und lege sie als **eine** zentrale Konfiguration an (z. B. `packages/core/data/roles.ts`), nicht verstreut über Komponenten:

| Rolle | Primär | Sekundär |
|---|---|---|
| Student:in | Minijob-Monatsgrenze (alle Minijobs zusammen), Familienversicherung (nur wenn ja und unter 25), BAföG (nur wenn ja), Saison-Zähler kurzfristige Beschäftigung | Steuer-Orientierung, Werkstudenten-Regel |
| Werkstudent:in | 20-Stunden-Woche in der Vorlesungszeit, Minijob daneben, Steuer-Orientierung | Familienversicherung, BAföG |
| Minijobber:in | Minijob-Monatsgrenze, Saison-Zähler | Steuer-Orientierung |
| Arbeitnehmer:in mit Nebenjob | Nur ein Minijob neben dem Hauptjob abgabenfrei, Steuerklasse VI / Lohnsteuer-Info | Minijob-Grenze allgemein |
| Schüler:in | Minijob-Monatsgrenze, Jugendarbeitsschutz als reine Information (nur unter 18), Familienversicherung | Steuer-Orientierung |

Profilfilter, die schon im Core existieren (Alter, Familienversicherung, BAföG), bleiben erhalten. Die Rollenzuordnung entscheidet nur über **primär oder sekundär**, nicht über richtig oder falsch.

## 3. Ästhetik und Nutzungserlebnis
Priorität in dieser Reihenfolge:
1. **Optische Attraktivität:** ein einheitliches, „rundes“ Gesamtbild. Halte dich an `design-system/headroom/MASTER.md` (Farben, Schriften, Radien, Abstände). Keine neuen Farben oder Schriften erfinden. Gleiche Elemente sehen überall gleich aus.
2. **Befriedigendes Erlebnis:** kleine, ruhige Mikroanimationen, wo sie Feedback geben, z. B. wenn der Balken nach einer neuen Schicht wächst, die Zahl hoch- oder runterzählt oder sich der Status von „Sicher“ zu „Knapp“ ändert. Dauer 150–300 ms. `prefers-reduced-motion` respektieren.
3. **Sofortige Verständlichkeit:** Wer das Dashboard 5 Sekunden sieht, soll sagen können, wie viel er noch verdienen darf und ob das okay ist. Status immer als Wort plus Farbe, nie nur Farbe.
</kernprinzipien>

<aufgaben>
Arbeite diese Punkte in dieser Reihenfolge ab.

### 0. Sicherheitsnetz
Das Projekt ist kein Git-Repo. Führe zuerst `git init` aus und erstelle einen Commit mit dem aktuellen Stand („Baseline vor Admission-Day-Überarbeitung“), damit jede Änderung rückgängig gemacht werden kann. Danach nach jeder Aufgabe einen eigenen Commit.

### 1. Keine „TODO“-Texte in der Oberfläche
In `packages/core/data/limits.ts` stehen Beschreibungen wie „TODO: Pauschbetrag … verifizieren“, die auf der Grenzwerte-Seite wörtlich angezeigt werden. Trenne interne Prüfnotizen von Nutzertexten:
- Neues Feld z. B. `reviewNote` für interne Notizen, das nie gerendert wird.
- Nutzertext bei ungeprüften Werten: kurz und neutral, z. B. „Dieser Wert wird gerade noch geprüft.“ (DE/EN in `app/src/i18n/translations.ts`).
- Prüfe danach mit einer Suche, dass „TODO“ in keinem gerenderten String mehr vorkommt.

### 2. Werte verifizieren
Prüfe die Datensätze mit `verified: false` nur anhand **offizieller Quellen**: gesetze-im-internet.de, bmas.de, minijob-zentrale.de, bafoeg.de / bmbf.de, deutsche-rentenversicherung.de, gkv-spitzenverband.de oder große gesetzliche Krankenkassen.
- Wenn du einen Wert sicher bestätigen kannst: Wert, Quelle (URL), `checkedAt` mit heutigem Datum und `verified: true` setzen.
- Wenn nicht: `verified: false` lassen und in `reviewNote` festhalten, was fehlt. **Niemals einen Wert schätzen oder aus dem Gedächtnis eintragen.**
- Kandidaten, die sich wahrscheinlich schnell bestätigen lassen: Arbeitnehmer-Pauschbetrag (2026), Sonderausgaben-Pauschbetrag (2026), Grundfreibetrag 2027, Familienversicherung 2027.
- Die README-Tabelle der offenen Datensätze danach aktualisieren.

### 3. Überschrift passt sich dem Tab an
Der Kicker „DEIN MONAT AUF EINEN BLICK“ bleibt auch in den Tabs „Jahr“ und „Saison“ stehen. Er soll pro Tab passen, z. B. „Dein Jahr auf einen Blick“ / „Deine Saison auf einen Blick“ (DE und EN).

### 4. Demodaten, die eine stimmige Geschichte erzählen
Aktuell zeigt der Monat 487 €, das Jahr aber nur 1.461 €, weil die Demo-Schichten erst seit wenigen Wochen existieren. Das wirkt im Pitch widersprüchlich.
- Erzeuge die Demo-Schichten so, dass sie realistisch seit Januar des aktuellen Jahres laufen. Monat und Jahresprognose müssen zueinander passen.
- Der Demo-Monatsstand von 487 € (116 € Spielraum, Status „Knapp“) bleibt erhalten, damit die bestehenden Tests und der Pitch-Ablauf stimmen. Wenn du Tests anpassen musst, begründe es im Commit.

### 5. Zweites Demo-Profil: der „Lena-Fall“
Das ist der stärkste Pitch-Moment: Zwei Minijobs liegen **zusammen** über der Monatsgrenze (603 €), obwohl die Jahressumme noch unter 7.236 € liegt. Mehrere Minijobs werden Monat für Monat zusammengerechnet, die Jahresbetrachtung rettet sie nicht.
- Profil „Lena, 20, Studentin“: Kneipe-Minijob ganzjährig 340 €/Monat, ab Oktober zusätzlich Café-Minijob 280 €/Monat → 620 €/Monat, also über 603 €. Dazu ein Festival-Job im Juli, 15 Tage, kurzfristig.
- Die App zeigt klar „Über der Grenze“ für den Monat, auch wenn das Jahr noch „Sicher“ wäre, und erklärt in **einem** Satz, warum.
- Beim Anlegen des zweiten Minijobs erscheint eine Vorab-Warnung: Dort passen höchstens 263 € im Monat.
- Das Profil lässt sich ohne Umwege auswählen, z. B. im Onboarding über „Beispiel ansehen“ mit zwei Optionen. Es ist sichtbar als Beispieldaten gekennzeichnet.
- Ergänze einen Unit-Test im Core und einen Playwright-Smoketest für diesen Fall.

### 6. Rollenbasierte Darstellung umsetzen
Setze Kernprinzip 2 um: Das Dashboard zeigt oben nur die primären Grenzen der gewählten Rolle, die sekundären in einem eingeklappten Bereich „Weitere Grenzen“. Die Grenzwerte-Seite gruppiert ebenso: „Für dich wichtig“ zuerst, darunter „Weitere Grenzen“.

### 7. Feinschliff Ästhetik und Erlebnis
Setze Kernprinzip 3 um. Konkret:
- Prüfe alle Hauptbildschirme (Onboarding, Dashboard Monat/Jahr/Saison, Schicht eintragen, Jobs, Grenzwerte, Mehr) auf Einheitlichkeit: gleiche Kartenstile, Abstände, Buttonformen und Typo-Hierarchie.
- Ergänze die Mikroanimationen aus Prinzip 3.
- Lange Quellenangaben auf Karten dürfen das Layout nicht zerreißen. Kürze sie mit sinnvollem Umbruch.
- Die feste Navigation unten darf auf keinem Bildschirm Inhalte oder Buttons verdecken (genug Abstand unten, `safe-area-inset-bottom` beachten).

### 8. Abhängigkeiten pinnen
In `app/package.json` und `server/package.json` stehen mehrere Pakete auf `"latest"`. Ersetze sie durch die **aktuell installierten** Versionen aus `package-lock.json` (mit `^`). Kein Upgrade, nur pinnen.
</aufgaben>

<grenzen>
- Die Vorschaufunktionen (Jobbörse, Partner, OCR, Premium, Lohnstatistik, Firmensuche) bleiben standardmäßig **aus**. Baue sie nicht aus.
- Keine Funktion darf persönliche Empfehlungen geben („Du solltest …“). Formuliere immer als Information („Diese Schicht bringt dich über die Grenze“). Der Hinweis „keine Steuer- oder Rechtsberatung“ bleibt auf jeder Seite.
- Ungeprüfte Werte (`verified: false`) lösen weiterhin keine automatischen Warnungen aus.
- Deutsch und Englisch müssen nach jeder Textänderung vollständig sein.
- Ändere nichts am Server, außer beim Pinnen der Versionen.
</grenzen>

<vorgehen>
1. Lies die genannten Dateien und schreib mir zuerst einen **kurzen Plan** (max. 15 Zeilen): welche Dateien du pro Aufgabe änderst und wo du Risiken siehst. Warte auf mein OK, bevor du mit Aufgabe 1 beginnst.
2. Arbeite dann Aufgabe für Aufgabe ab, jeweils mit eigenem Commit.
3. Wenn eine Aufgabe unklar ist oder mit den Kernprinzipien kollidiert, entscheide im Sinne der Prinzipien und notiere die Entscheidung im Commit-Text.
</vorgehen>

<abnahme>
Erst wenn alles davon erfüllt ist, bist du fertig:
- `npm test`, `npm run build`, `npm run test:e2e` und `npx tsc --noEmit -p server/tsconfig.json` laufen fehlerfrei.
- Mache mit Playwright Screenshots bei 375 × 812 und 390 × 844 von: Onboarding, Dashboard (Monat, Jahr, Saison) für das Standard-Demo-Profil und das Lena-Profil, Grenzwerte-Seite, Schicht eintragen. Speichere sie unter `screenshots/` und sieh sie dir selbst an. Behebe alles, was überlappt, abgeschnitten ist oder uneinheitlich wirkt.
- Eine Suche nach „TODO“ in gerenderten Texten ergibt nichts.
- Kein horizontales Scrollen auf 375 px.

Am Ende schreibst du mir eine Zusammenfassung in höchstens 10 Zeilen:
- was geändert wurde,
- welche Werte jetzt verifiziert sind und mit welcher Quelle,
- welche Werte offen bleiben und warum,
- was du für den Pitch noch empfehlen würdest.
</abnahme>
