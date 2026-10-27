import type { ReactNode } from 'react';
import type { Screen } from '../../app/types';
import { PageHeading } from '../../components/PageHeading';
import { t, type Language } from '../../i18n/translations';

// Persönliche Angaben sind bewusst Platzhalter. Nichts davon erfinden; vor Veröffentlichung ausfüllen und rechtlich prüfen.
function Placeholder({ children }: { children: ReactNode }) {
  return <mark className="legal-placeholder">{children}</mark>;
}

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="surface legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function BackButton({ language, onBack }: { language: Language; onBack: () => void }) {
  return (
    <button className="button button-quiet heading-action" type="button" onClick={onBack}>
      <span aria-hidden="true">←</span> {t(language, 'back')}
    </button>
  );
}

const contactBlock = (
  <p>
    <Placeholder>[NAME EINTRAGEN]</Placeholder><br />
    <Placeholder>[STRASSE UND HAUSNUMMER EINTRAGEN]</Placeholder><br />
    <Placeholder>[PLZ UND ORT EINTRAGEN]</Placeholder><br />
    E-Mail: <Placeholder>[E-MAIL-ADRESSE EINTRAGEN]</Placeholder>
  </p>
);

export function PrivacyPage({ language, onNavigate, backTo }: { language: Language; onNavigate: (screen: Screen) => void; backTo: Screen }) {
  const de = language === 'de';
  return (
    <section className="page-enter legal-page">
      <PageHeading kicker={t(language, 'legalKicker')} title={t(language, 'privacyTitle')} trailing={<BackButton language={language} onBack={() => onNavigate(backTo)} />} />
      <p className="notice notice-amber">{t(language, 'legalDraftNotice')}</p>
      {!de && <p className="muted">The binding version of this page is German. Short English summary: by default, everything stays on your device.</p>}

      <LegalSection title="1. Verantwortlich">
        <p>Verantwortlich für die Datenverarbeitung in Headroom:</p>
        {contactBlock}
      </LegalSection>

      <LegalSection title="2. Grundbetrieb: Daten bleiben auf deinem Gerät">
        <p>
          Profil, Jobs, Schichten und Einmalzahlungen speichert Headroom in deinem Browser (IndexedDB, falls nicht verfügbar
          localStorage). Es gibt keine Nutzerkonten, kein Tracking und keine Werbung. Die Schriftdateien sind in der App
          enthalten; es gibt keine automatischen Anfragen an einen externen Schriftanbieter. Individuelle Nutzerdaten werden
          nicht verkauft.
        </p>
        <p>
          In den Einstellungen kannst du deine Daten als JSON-Datei exportieren und alle lokalen Daten löschen.
        </p>
      </LegalSection>

      <LegalSection title="3. Kalender und Foto (Kernfunktionen, nur auf deine Aktion)">
        <ul>
          <li>
            <strong>Kalender:</strong> Ein eingefügter privater iCal-Link wird nur auf dem Gerät gespeichert und nie exportiert.
            Zum Abrufen sendet die App ihn an den Headroom-Server, der ihn ausschließlich an calendar.google.com oder
            *.icloud.com weiterreicht und nicht protokolliert. Der Import einer .ics-Datei läuft vollständig lokal.
          </li>
          <li>
            <strong>Foto oder Screenshot:</strong> Die Texterkennung (tesseract.js) läuft im Browser; das Bild verlässt das
            Gerät nicht. Beim ersten Lauf lädt die App Programmteile und Sprachdaten vom Content-Delivery-Netzwerk jsDelivr
            (cdn.jsdelivr.net). Dabei wird technisch bedingt deine IP-Adresse an diesen Anbieter übermittelt.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Optionale Funktionen (standardmäßig ausgeschaltet)">
        <ul>
          <li>
            <strong>Lohnstatistik:</strong> Nur nach gesonderter Einwilligung sendet die App ein zufälliges Geräte-Token,
            Job-Art, Stadt, tatsächlichen und erwarteten Stundenlohn sowie den Monat an den Server. Firmennamen werden nicht
            übertragen. Gruppenwerte erscheinen erst ab 20 Datensätzen. Die Einwilligung ist widerrufbar; die App fordert dann
            die Löschung der zum Token gehörenden Datensätze an.
          </li>
          <li>
            <strong>Jobbörse:</strong> Ein selbst erstelltes Inserat sendet Titel, Stadt, Datum, Dauer und Stundenlohn an den
            Server. Bewerbungen öffnen nur die Kontaktmöglichkeit; Headroom übermittelt keine Profildaten.
          </li>
          <li>
            <strong>Firmensuche:</strong> Erst nach Aktivierung und Klick auf „Prüfen“ werden Firmenname und Stadt an
            OpenStreetMap Nominatim gesendet.
          </li>
          <li>Partnerkarten öffnen eine externe Seite erst nach einem Klick.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Hosting und Server">
        <p>
          Beim Aufruf der App verarbeitet der Hosting-Anbieter technisch notwendige Verbindungsdaten (zum Beispiel IP-Adresse und
          Zeitpunkt). Anbieter: <Placeholder>[HOSTING-ANBIETER UND SITZ EINTRAGEN]</Placeholder>. Speicherdauer der
          Server-Protokolle: <Placeholder>[SPEICHERDAUER EINTRAGEN]</Placeholder>. Rechtsgrundlage:
          <Placeholder> [RECHTSGRUNDLAGE PRÜFEN UND EINTRAGEN]</Placeholder>.
        </p>
      </LegalSection>

      <LegalSection title="6. Deine Rechte">
        <p>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und
          Widerspruch (Art. 15 bis 21 DSGVO) sowie das Recht, eine Einwilligung jederzeit zu widerrufen. Du kannst dich bei einer
          Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel: <Placeholder>[ZUSTÄNDIGE AUFSICHTSBEHÖRDE EINTRAGEN]</Placeholder>.
        </p>
        <p>Kontakt für Datenschutzfragen: <Placeholder>[E-MAIL-ADRESSE EINTRAGEN]</Placeholder></p>
      </LegalSection>

      <p className="muted">Stand: <Placeholder>[DATUM DER VERÖFFENTLICHUNG EINTRAGEN]</Placeholder></p>
    </section>
  );
}

export function ImprintPage({ language, onNavigate, backTo }: { language: Language; onNavigate: (screen: Screen) => void; backTo: Screen }) {
  return (
    <section className="page-enter legal-page">
      <PageHeading kicker={t(language, 'legalKicker')} title={t(language, 'imprintTitle')} trailing={<BackButton language={language} onBack={() => onNavigate(backTo)} />} />
      <p className="notice notice-amber">{t(language, 'legalDraftNotice')}</p>

      <LegalSection title="Angaben gemäß § 5 DDG">
        {contactBlock}
        <p>Telefon: <Placeholder>[TELEFON EINTRAGEN, FALLS VORHANDEN]</Placeholder></p>
        <p>
          Rechtsform, Registergericht und Registernummer: <Placeholder>[FALLS VORHANDEN EINTRAGEN, SONST ENTFERNEN]</Placeholder><br />
          Umsatzsteuer-Identifikationsnummer: <Placeholder>[FALLS VORHANDEN EINTRAGEN, SONST ENTFERNEN]</Placeholder>
        </p>
      </LegalSection>

      <LegalSection title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p><Placeholder>[NAME UND ANSCHRIFT EINTRAGEN]</Placeholder></p>
      </LegalSection>

      <LegalSection title="Hinweis zum Inhalt">
        <p>
          Headroom ist ein Informationsangebot und ersetzt keine Steuer- oder Rechtsberatung. Grenzwerte stammen aus den in der
          App verlinkten amtlichen Quellen mit Prüfdatum. Verbindlich entscheiden Minijob-Zentrale, Krankenkasse, BAföG-Amt,
          Rentenversicherung und Finanzamt.
        </p>
      </LegalSection>
    </section>
  );
}
