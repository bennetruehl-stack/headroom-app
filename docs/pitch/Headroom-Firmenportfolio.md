# Headroom – Firmenportfolio und grober Businessplan

**Stand:** 3. November 2026 · **Status:** Entwurf, provisorisch · **Vertraulich**
**Für:** neue Teammitglieder – zum Einstieg in Software Engineering, Finanzen, BWL und Strategie sowie Go-to-Market und Pitch
**Von:** Bennet Ruhl

> Dieses Dokument fasst zusammen, was es heute gibt, wo Headroom hin will und was dafür zu tun ist. Zahlen ohne Quelle sind als **Annahme** markiert. Nichts davon ist endgültig.

---

## 1. Headroom in drei Sätzen

Headroom ist eine App für Menschen in Deutschland, die mehrere Jobs kombinieren – vor allem Studierende, Minijobber:innen, Werkstudierende, Schüler:innen und Angestellte mit Nebenjob. Sie rechnet Verdienst und Stunden **über alle Jobs zusammen** und zeigt, wie viel Spielraum bis zur nächsten gesetzlichen Grenze bleibt (Minijob-Grenze, 70-Tage-Regel, Familienversicherung, 20-Stunden-Regel, BAföG u. a.). Das Bild dafür: **„Ein Kalorien-Tracker für deine Jobs.“**

Headroom informiert mit amtlichen Quellen. Es gibt **keine** individuelle Steuer- oder Rechtsberatung.

---

## 2. Das Problem

**Auslöser (echter Fall, anonymisiert):** Ein Freund mit mehreren Jobs schickt nachts um 00:32 Uhr das Foto eines Briefs seiner Krankenkasse. Er war freiwillig gesetzlich versichert und hätte sein Einkommen selbst nachweisen müssen – das wusste er nicht. Ohne Nachweis setzt die Kasse per Gesetz den Höchstbeitrag an:

- **3.538,08 €** Nachzahlung für drei Monate, Frist zwei Wochen
- danach **1.179,36 €** pro Monat (Kranken- und Pflegeversicherung, keine Steuer)

**Kernsatz:** Das Problem war nicht das Geld. Es war der fehlende Überblick.

Die Regeln sind über Minijob-Zentrale, Krankenkassen, Rentenversicherung und Gesetzestexte verteilt. Niemand zeigt sie an einer Stelle und bezogen auf die eigene Lage.

**Zweites Beispiel (Demoprofil in der App):** Lena, 20, hat zwei Minijobs mit 340 € und 280 €. Jeder liegt unter 603 €, zusammen sind es 620 € – 17 € über der Grenze. In der Regel werden damit beide Jobs versicherungspflichtig.

---

## 3. Was Headroom macht (Produkt)

| Funktion | Was sie leistet | Stand |
|---|---|---|
| Dashboard „Dein Spielraum“ | Eine große Zahl: wie viel bis zur strengsten Grenze übrig ist, in Euro und Stunden. Status als Wort und Farbe (Sicher · Knapp · Über). Monat, Jahr, Saison. | fertig |
| „Was würde diese Schicht verändern?“ | Vor dem Zusagen eine Schicht durchrechnen. | fertig |
| Schichten aus Kalender und Foto | Google-/Apple-Kalender oder Foto eines Dienstplans, Texterkennung auf dem Gerät, Doppelte werden erkannt. | fertig |
| Grenzwerte mit Quelle | Jede Grenze mit Wert, Folge, Quelle, Gültigkeit und Prüfdatum. | fertig |
| Rollenbasierte Darstellung | Was oben steht, hängt vom Status ab (Schülerin sieht andere Grenzen als Werkstudent). | fertig |
| Schüler-Modus | Unter 18: Jugendarbeitsschutz, Ferienjob-Zähler, Eltern-Seite mit Einwilligung als PDF. Keine Werbung, kein Premium, keine Partner. | fertig |
| Konto und verschlüsselter Abgleich | Freiwillig ab 16. Handy, Browser und Mac gleichen sich Ende-zu-Ende-verschlüsselt ab; der Server kann nichts lesen. | gebaut, noch nicht freigegeben |
| Plattformen | Installierbare Web-App (Handy), Browser, Mac-App. Deutsch und Englisch, hell und dunkel. | fertig |
| Advanced-Modus (Demo) | Partner-Jobbörse, Partnerhinweise, Premium, Lohnstatistik – mit erfundenen Partnern/Daten, standardmäßig aus. | Demo |

**Haltung, die auch für Marketing und Partner gilt:**
- Grenzen und Tracking bleiben kostenlos.
- Ohne Konto verlassen keine Daten das Gerät. Keine Datenverkäufe.
- Partner sind immer gekennzeichnet und ausblendbar. Unter 18 keine Partner-, Premium- oder Steuer-App-Hinweise.
- Sprache: „gilt in der Regel“ statt „du musst“. Headroom informiert, berät nicht.

---

## 4. Zielgruppen und Markt

| Profil | Typische Lage | Was zuerst zählt |
|---|---|---|
| Student:in | Minijobs, Saisonjobs, oft familienversichert, teils BAföG | Minijob-Grenze, Familienversicherung, BAföG, 70 Tage |
| Werkstudent:in | Werkstudentenjob, evtl. Minijob daneben | 20 Stunden pro Woche in der Vorlesungszeit |
| Minijobber:in | ein oder mehrere Minijobs | Minijob-Grenze über alle Jobs |
| Angestellte mit Nebenjob | Hauptjob plus Minijob | nur ein Minijob neben dem Hauptjob |
| Schüler:in | erster Job, oft unter 18 | Jugendarbeitsschutz, Ferienjob-Tage, Familienversicherung |

**Belegte Zahlen (Zielgruppe Studierende):**

| Kennzahl | Wert | Quelle |
|---|---:|---|
| Studierende in Deutschland, WS 2025/26 | 2.876.900 | Statistisches Bundesamt (vorläufig) |
| Anteil mit Job neben dem Studium | 63 % | DZHW, 22. Sozialerhebung (2021) |
| Erwerbsaufwand im Schnitt | ca. 15 Std./Woche | ebd. |
| Studierende mit Job | ≈ 1,8 Mio. | eigene Hochrechnung, keine amtliche Zahl |

Offen: Zahlen zu Minijobber:innen gesamt, Schüler:innen mit Job und Angestellten mit Nebenjob mit Quelle ergänzen. Wettbewerbsanalyse fehlt noch ganz.

---

## 5. Geschäftsmodell (Entwurf)

**Grundsatz:** Kostenlos, wo es um Grenzen geht – bezahlt, wo es Mehrwert gibt.

| Stufe | Inhalt | Erlös | Stand |
|---|---|---|---|
| Kostenlos | alle Grenzen, Tracking, Kalender- und Foto-Import | Reichweite, Vertrauen | gebaut |
| Premium | Jahresbericht als PDF, Verlauf über mehrere Jahre, Erinnerungen | 5 €/Monat (**Annahme**) | Demo, ohne Zahlung |
| Partner-Jobbörsen | offene Schichten, die in den eigenen Spielraum passen | Provision je Vermittlung (Höhe offen) | Demo, fiktive Partner |
| Partnerangebote | Steuer, Versicherung – nur bei echtem Anlass | Provision je Abschluss (Höhe offen) | Demo, fiktive Partner |
| Hochschulen (B2B) | Lizenz für Beratungsstellen zu Nebenjobs | Lizenzgebühr (offen) | Idee |

**Rechenbeispiel, nur zur Orientierung (alle Werte Annahmen):**
Erreicht Headroom 1 % der ≈ 1,8 Mio. Studierenden mit Job, sind das rund 18.000 Nutzer:innen. Zahlen davon 5 % für Premium zu 5 € im Monat, ergibt das rund 4.500 € im Monat bzw. 54.000 € im Jahr – ohne Partner- und B2B-Erlöse. Diese Rechnung zeigt nur die Größenordnung; Conversion, Preis und Reichweite müssen erst getestet werden.

**Rechtlicher Prüfpunkt:** Vor einer Kooperation mit gesetzlichen Krankenkassen sind die Regeln zur Mitgliederwerbung zu klären.

---

## 6. Aktueller Stand

**Zeitraum:** Entwicklung seit 24. Oktober 2026 (Ursprung: Aufgabe für den Admission Day der CODE University), seitdem rund 55 Commits.

| Bereich | Stand |
|---|---|
| Produkt | vorführbar und technisch solide; 357 automatische Tests und 14 Ende-zu-Ende-Tests laufen grün |
| Backend | Grundgerüst, Konto, verschlüsselter Abgleich und Kalender-Abruf sind gebaut. Konto/Abgleich warten auf die Klärung der Rechtsgrundlage für Konten. Noch nicht gehostet. |
| Pitch-Material | Pitch-Deck DE und EN (10 Folien mit Sprechernotizen), Handy-Demo, vier kurze Produktvideos, „Headroom auf einen Blick“ (HTML/PDF), ausführliches Konzeptdokument |
| Team | Bennet (Gründer, BWL; hat Produkt und Technik bisher allein gebaut). Vorgesehen, noch nicht fest: Nico (Finanzen?), Arne (Go-to-Market und Pitch?), Johanna (Allrounderin, in Klärung). Gesucht: Software Engineering, eventuell Design oder Marketing. |
| Firma | noch keine Gründung, Rechtsform offen |
| Finanzierung | keine; bisher eigenfinanziert durch Arbeitszeit |
| Nutzer:innen | noch keine öffentlichen; nur Demo und Tests |

---

## 7. Wo Headroom hin will

**Vision:** Niemand in Deutschland soll von einem Brief der Krankenkasse oder Minijob-Zentrale überrascht werden, nur weil er mehrere Jobs hat. Headroom ist die Stelle, an der man vorher sieht, was gilt.

**Grobe Etappen (Zeiten sind Annahmen):**

| Phase | Ziel | Woran man es merkt |
|---|---|---|
| 1. Validieren (bis ca. Anfang 2027) | Mit echten Studierenden testen, ob Problem und Lösung so ankommen. | 20–30 Interviews, erste Testgruppe nutzt die App über mehrere Wochen |
| 2. Öffentlicher Start (ca. Sommersemester 2027) | Gehostete Version, fachlich geprüfte Grenzwerte, Datenschutz komplett. Start rechtzeitig vor Saisonjobs im Sommer. | erste 1.000 aktive Nutzer:innen (**Annahme**) |
| 3. Erlöse testen | Premium-Zahlung, erster echter Partner, erste Hochschule als Pilot. | erste zahlende Nutzer:innen, ein unterschriebener Pilot |
| 4. Ausbauen | weitere Zielgruppen (Schüler:innen über Eltern und Schulen, Angestellte mit Nebenjob), evtl. iOS/Android-Store | – |

---

## 8. Was gemacht werden muss

### Produkt und Technik (Bennet, Software Engineering)
- Gehosteten Betrieb aufsetzen (Server, Datenschutzhinweise, Löschkonzept, Sicherheit).
- Erinnerung an die Meldepflicht für freiwillig Versicherte – schließt die Lücke zum Gründungsfall.
- Erinnerungen per Push.
- Offene Punkte im Kalender-Import (monatliche Wiederholungen, gelöschte Termine).
- Barrierefreiheit systematisch prüfen.

### Fachlich und rechtlich (extern prüfen lassen, BWL koordiniert)
- Einzelne Grenzwerte durch sachkundige Stelle prüfen (Familienversicherung 2027, BAföG, steuerlicher Orientierungswert, Werkstudentenregel).
- Abgrenzung „Information statt Rechtsberatung“ absichern (u. a. Rechtsdienstleistungsgesetz).
- Rechtsgrundlage für Konten klären (blockiert Konto und Abgleich).
- Regeln zur Mitgliederwerbung bei Kooperationen mit Krankenkassen.

### Business, Finanzen, Markt (BWL, Finanzen, Go-to-Market – siehe Kapitel 9)
- Erste Zielgruppe und Zugangsweg festlegen.
- Erlösmodell konkretisieren (Preis, Provisionen, B2B).
- Finanzmodell, Förderung und Finanzierung.
- Gründung vorbereiten.

---

## 9. Team und Rollen

Bennet hat Headroom bisher allein gebaut. Jetzt entsteht ein kleines Team. Mit Bennet, Arne und Johanna gibt es drei Leute mit BWL-Hintergrund; für Technik und eventuell Design oder Marketing suchen wir noch.

> **Wichtig: Die Rollen sind noch nicht fest.** Namen mit Fragezeichen sind vorgesehen, aber nicht beschlossen. Aufgaben, Aufteilung und Namen werden gemeinsam geklärt und können sich ändern.

| Rolle | Wer | Stand |
|---|---|---|
| 1. Software Engineering | – | gesucht |
| 2. Finanzen | Nico (?) | vorgesehen |
| 3. BWL und Strategie | Bennet, Arne, Johanna | Aufteilung offen |
| 4. Go-to-Market und Pitch | Arne (?) | vorgesehen |
| 5. Allrounder:in | Johanna | in Klärung |
| 6. Design oder Marketing | – | eventuell, gesucht |

### Rolle 1: Software Engineering (gesucht)
- Gehosteten Betrieb mit aufbauen: Server, Sicherheit, Datenschutz.
- Erinnerungen per Push und Erinnerung an die Meldepflicht.
- Kalender-Import verbessern, Barrierefreiheit, später evtl. App-Stores.
- Technik: React-Web-App mit TypeScript, Node-Backend mit Postgres, Tests zuerst.
- **Erste 30 Tage:** Projekt lokal starten, Tests laufen lassen, eine kleine Funktion von Anfang bis Ende bauen.

### Rolle 2: Finanzen (vorgesehen: Nico ?)
- Finanzmodell für zwei bis drei Jahre: Betriebskosten, Erlösszenarien.
- Premium-Preis und Provisionen mit Zahlen hinterlegen.
- Förderungen und Finanzierung finden (z. B. Gründungsstipendien, Programme), mit Fristen.
- Später: Budget, Buchhaltung, Zahlungsabwicklung.
- **Erste 30 Tage:** Kostenaufstellung für den Betrieb, Liste passender Förderprogramme.

### Rolle 3: BWL und Strategie (Bennet, Arne, Johanna)
- Geschäftsmodell schärfen: Partner, die zur Haltung passen, B2B-Modell für Hochschulen.
- Wettbewerb und Alternativen erfassen: Apps, Rechner, Beratungsstellen, Krankenkassen.
- Gründung vorbereiten: Rechtsform, Verträge, rechtliche Prüfung koordinieren.
- Wer welchen Teil übernimmt, ist noch offen.
- **Erste 30 Tage:** Wettbewerbsübersicht auf einer Seite, Vorschlag für das B2B-Modell.

### Rolle 4: Go-to-Market und Pitch (vorgesehen: Arne ?)
- Erste Zielgruppe und Startzeitpunkt: erster Minijob, Sommer-Saisonjob, Semesterstart.
- Kanäle: Hochschulen, Fachschaften, Studierendenwerke, Social Media, Startup-Initiativen wie Think!.
- Interviews mit Studierenden; Botschaft testen, ohne nach Rechtsberatung zu klingen.
- Pitch-Deck erweitern, Pitch-Wettbewerbe und -Termine.
- **Erste 30 Tage:** 10 Gespräche mit Studierenden, Vorschlag für Zielgruppe, Kanal und Start.

### Rolle 5: Allrounder:in (Johanna, in Klärung)
- Springt dort ein, wo gerade am meisten zu tun ist: BWL, Go-to-Market, Pitch.
- Organisation: Termine, Absprachen, Überblick über offene Aufgaben.
- Recherche und Interviews mit unterstützen.
- Verbindung zwischen den Rollen.
- **Erste 30 Tage:** Überblick über alle Rollen gewinnen, eine Aufgabe aus BWL oder Go-to-Market mit übernehmen.

### Rolle 6: Design oder Marketing (eventuell, gesucht)
- Auftritt nach außen: Website bzw. Landingpage, Social-Media-Inhalte.
- Material für Kampagnen und Pitch im bestehenden Headroom-Design.
- Ton und Haltung beibehalten: Klartext, informieren statt beraten.
- **Erste 30 Tage:** Entwurf für eine Landingpage, erste Vorlagen für Social Media.

### Für alle in den ersten Wochen
1. Produkt kennenlernen: Demo öffnen, Beispielprofil „Lena, 20“ laden, „Was würde diese Schicht verändern?“ ausprobieren.
2. Konzeptdokument lesen: alle Regeln, Quellen und der technische Stand.
3. Haltung verinnerlichen: informieren statt beraten, Daten bleiben auf dem Gerät, Partner immer gekennzeichnet.

### Zusammenarbeit – noch zu klären
- Wer welche Rolle endgültig übernimmt.
- Umfang in Stunden pro Woche und Dauer, je Rolle.
- Vergütung bzw. Beteiligung (z. B. Anteile mit Vesting) – bewusst noch offen.
- Vertraulichkeit und Entscheidungswege im Team.
- Später: Rechtsform, Gründungszeitpunkt, wer gründet mit.

---

## 10. Offene Fragen und Risiken

| Thema | Risiko | Umgang |
|---|---|---|
| Rechtsberatung | Die App könnte als Rechtsberatung verstanden werden. | Strikte Sprache („gilt in der Regel“), Quellen an jeder Zahl, rechtliche Prüfung vor Start |
| Fachliche Fehler | Ein falscher Grenzwert schadet dem Vertrauen. | Jede Zahl mit Quelle und Prüfstatus, ungeprüfte Werte lösen keine Warnung aus |
| Zahlungsbereitschaft | Junge Zielgruppe zahlt ungern. | Kern bleibt gratis; Premium, Partner und B2B früh testen |
| Datenschutz | Sensible Daten (Einkommen, Versicherung). | Daten bleiben auf dem Gerät; Sync nur verschlüsselt und freiwillig |
| Saisonalität | Bedarf steigt vor Sommerjobs und zum Semesterstart. | Start und Kampagnen danach planen |
| Kleines Team | Vieles hängt an einer Person. | Team mit klaren Rollen aufbauen: Technik, Finanzen, BWL, Go-to-Market |

---

## 11. Material zum Weiterschauen

- **Headroom auf einen Blick** – `docs/pitch/Headroom-auf-einen-Blick.pdf`
- **Konzept und Projektstand** (ausführlich, alle Regeln und Quellen) – `docs/Headroom-Konzept-und-Projektstand.md`
- **Funktionskatalog** (alle Funktionen mit Priorität) – `docs/Funktionskatalog.md`
- Pitch-Deck DE/EN, Handy-Demo und Videos auf Anfrage bei Bennet

---

*Entwurf. Alle Grenzwerte gelten für 2026, Quellen in der App. Beispielprofile und Partnernamen außer ELSTER sind erfunden. Zahlen ohne Quelle sind Annahmen.*
