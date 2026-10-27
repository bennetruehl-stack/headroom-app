// Vor Veröffentlichung sämtliche Werte und Folgen nochmals anhand der verlinkten Quellen prüfen.
import type { Limit, ProfileStatus } from '../src/types';

const allStatuses: ProfileStatus[] = [
  'Student',
  'Working student',
  'Mini-jobber',
  'Employee',
  'Pupil',
];

const minijobSource =
  'https://www.minijob-zentrale.de/SharedDocs/Downloads/DE/Rundschreiben/Geringfuegigkeitsrichtlinien-2026.pdf?__blob=publicationFile';
const multipleJobsSource =
  'https://www.minijob-zentrale.de/DE/die-minijobs/mehrere-jobs/mehrere-jobs_node.html';
const dateChecked = '2026-10-23';
const dateRechecked = '2026-10-24';
/** Prüfdatum der in Phase 1 des Audits geänderten Datensätze. */
const dateAudit = '2026-10-27';
const sgb5Section10 = 'https://www.gesetze-im-internet.de/sgb_5/__10.html';
const bafoegNotice2026 = 'https://www.recht.bund.de/bgbl/1/2025/279/VO.html';
const drvWorkingStudent =
  'https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Arbeitgeber-und-Steuerberater/summa-summarum/Lexikon/W/werkstudentenprivileg';
const estgSource = (section: string) => 'https://www.gesetze-im-internet.de/estg/__' + section + '.html';
const employeeLumpSumText =
  'Pauschale für Werbungskosten aus Arbeitslohn. Sie wird automatisch abgezogen, wenn keine höheren Kosten nachgewiesen werden.';
const specialExpensesText =
  'Pauschale für Sonderausgaben. Sie wird automatisch abgezogen, wenn keine höheren Sonderausgaben nachgewiesen werden.';
export const statutoryMinimumWage2026 = 13.9;
export const statutoryMinimumWage2027 = 14.6;
export const miniJobCapFormula = {
  minimumWageMultiplier: 130,
  divisor: 3,
  asOf: dateChecked,
  sourceName: 'Minijob-Zentrale – Geringfügigkeits-Richtlinien 2026',
  sourceUrl: minijobSource,
} as const;
const monthlyCap2027 = Math.ceil((statutoryMinimumWage2027 * miniJobCapFormula.minimumWageMultiplier) / miniJobCapFormula.divisor);

function record(
  id: string,
  name: string,
  value: number | null,
  unit: string,
  period: Limit['period'],
  appliesTo: ProfileStatus[],
  consequence: string,
  sourceName: string,
  sourceUrl: string,
  validFrom: string,
  validTo: string,
  verified: boolean,
  condition?: string,
): Limit {
  return {
    id,
    name,
    value,
    unit,
    period,
    appliesTo,
    consequence,
    sourceName,
    sourceUrl,
    asOf: dateChecked,
    validFrom,
    validTo,
    verified,
    condition,
  };
}

const sourceLimits: Limit[] = [
  record(
    'miniJobMonthly',
    'Minijob-Verdienstgrenze',
    603,
    'EUR',
    'month',
    allStatuses,
    'Die Grenze gilt für den regelmäßigen Verdienst aus allen Minijobs. Wird sie überschritten, kann Sozialversicherungspflicht entstehen.',
    'Minijob-Zentrale',
    minijobSource,
    '2026-01-01',
    '2026-12-31',
    true,
  ),
  record(
    'miniJobMonthly',
    'Minijob-Verdienstgrenze',
    monthlyCap2027,
    'EUR',
    'month',
    allStatuses,
    'Die Grenze gilt für den regelmäßigen Verdienst aus allen Minijobs. Wird sie überschritten, kann Sozialversicherungspflicht entstehen.',
    'Minijob-Zentrale – Geringfügigkeits-Richtlinien 2026',
    minijobSource,
    '2027-01-01',
    '2027-12-31',
    true,
  ),
  record(
    'miniJobYearly',
    'Voraussichtlicher Jahresverdienst im Minijob',
    7_236,
    'EUR',
    'year',
    allStatuses,
    'Entscheidend ist grundsätzlich der voraussichtliche Jahresverdienst; ein einzelner Monat kann über der Monatsgrenze liegen.',
    'Minijob-Zentrale',
    multipleJobsSource,
    '2026-01-01',
    '2026-12-31',
    true,
  ),
  record(
    'miniJobYearly',
    'Voraussichtlicher Jahresverdienst im Minijob',
    monthlyCap2027 * 12,
    'EUR',
    'year',
    allStatuses,
    'Abgeleitet aus der monatlichen Verdienstgrenze. Die individuelle sozialversicherungsrechtliche Beurteilung kann abweichen.',
    'Minijob-Zentrale – Geringfügigkeits-Richtlinien 2026',
    minijobSource,
    '2027-01-01',
    '2027-12-31',
    true,
  ),
  record(
    'miniJobAlongsideMainJob',
    'Minijob neben einer Hauptbeschäftigung',
    1,
    'Jobs',
    'year',
    ['Employee'],
    'Neben einer versicherungspflichtigen Hauptbeschäftigung bleibt grundsätzlich nur ein zeitlich zuerst aufgenommener Minijob mit Verdienstgrenze privilegiert; weitere Beschäftigungen werden zusammengerechnet.',
    'Minijob-Zentrale',
    multipleJobsSource,
    '2026-01-01',
    '2027-12-31',
    true,
  ),
  {
    ...record(
      'familyInsurance',
      'Gesamteinkommensgrenze Familienversicherung',
      565,
      'EUR',
      'month',
      ['Student', 'Working student', 'Mini-jobber', 'Pupil'],
      'Maßgeblich ist das regelmäßige monatliche Gesamteinkommen (ein Siebtel der Bezugsgröße, 2026: 565 EUR). Wer ausschließlich einen Minijob hat, darf bis zur Minijob-Grenze von 603 EUR verdienen. Gesamteinkommen ist nicht dasselbe wie Brutto: Bei Arbeitslohn werden unter anderem Werbungskosten abgezogen. Headroom vergleicht vorsichtig mit deinem Brutto. Ob die Familienversicherung endet, entscheidet deine Krankenkasse.',
      '§ 10 Abs. 1 SGB V und Sozialversicherungsrechengrößen-Verordnung 2026',
      sgb5Section10,
      '2026-01-01',
      '2026-12-31',
      true,
      'familyInsured && age < 25',
    ),
    asOf: dateAudit,
    basis: 'total-income',
  },
  record(
    'familyInsurance',
    'Gesamteinkommensgrenze Familienversicherung',
    null,
    'EUR',
    'month',
    ['Student', 'Working student', 'Mini-jobber', 'Pupil'],
    '',
    '§ 10 Abs. 1 SGB V (Wert 2027 noch nicht verkündet)',
    sgb5Section10,
    '2027-01-01',
    '2027-12-31',
    false,
    'familyInsured && age < 25',
  ),
  record(
    'shortTermEmployment',
    'Kurzfristige Beschäftigung',
    70,
    'Arbeitstage',
    'year',
    ['Student', 'Working student', 'Mini-jobber', 'Pupil'],
    'Grundsätzlich höchstens 70 Arbeitstage oder 3 Monate je Kalenderjahr. Für landwirtschaftliche Betriebe gelten seit 2026 abweichende Grenzen; diese App prüft sie nicht.',
    'Minijob-Zentrale',
    'https://www.minijob-zentrale.de/DE/meta/faq-bereich/begriffe-und-beschaeftigungsarten/_node.html',
    '2026-01-01',
    '2027-12-31',
    true,
  ),
  record(
    'workingStudentHours',
    'Arbeitszeit im Werkstudentenprivileg',
    20,
    'Stunden',
    'week',
    ['Working student'],
    'Die 20-Stunden-Grenze ist eine vereinfachte Orientierung für die Vorlesungszeit. Ausnahmen und die Lage der Arbeitszeit (abends, nachts, Wochenende) prüft Headroom nicht. Die 26-Wochen-Regel steht als eigener Grenzwert daneben.',
    'Deutsche Rentenversicherung',
    'https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Arbeitgeber-und-Steuerberater/summa-summarum/Lexikon/W/werkstudentenprivileg',
    '2026-01-01',
    '2026-12-31',
    true,
    'lecturePeriod',
  ),
  record(
    'workingStudentHours',
    'Arbeitszeit im Werkstudentenprivileg',
    20,
    'Stunden',
    'week',
    ['Working student'],
    'Die 20-Stunden-Grenze ist eine vereinfachte Orientierung für die Vorlesungszeit. Ausnahmen und die Lage der Arbeitszeit (abends, nachts, Wochenende) prüft Headroom nicht. Die 26-Wochen-Regel steht als eigener Grenzwert daneben.',
    'Deutsche Rentenversicherung',
    'https://www.deutsche-rentenversicherung.de/DRV/DE/Experten/Arbeitgeber-und-Steuerberater/summa-summarum/Lexikon/W/werkstudentenprivileg',
    '2027-01-01',
    '2027-12-31',
    true,
    'lecturePeriod',
  ),
  record(
    'workingStudent26Weeks',
    'Werkstudent: Wochen über 20 Stunden im Zeitjahr',
    26,
    'Wochen',
    'year',
    ['Working student'],
    'Mehr als 20 Wochenstunden sind nur ausnahmsweise mit dem Werkstudentenprivileg vereinbar (vorlesungsfreie Zeit oder Arbeit abends, nachts, am Wochenende). Alle Wochen mit mehr als 20 Stunden dürfen zusammen innerhalb eines Jahres 26 Wochen nicht überschreiten. Das Jahr wird vom Ende der Beschäftigung zurückgerechnet; Jobs bei anderen Arbeitgebern zählen mit.',
    'Deutsche Rentenversicherung – Werkstudentenprivileg',
    drvWorkingStudent,
    '2026-01-01',
    '2027-12-31',
    true,
    'workingStudent',
  ),
  {
    ...record(
      'bafoegSideIncome',
      'BAföG-Freibetrag für eigenes Einkommen',
      389,
      'EUR',
      'month',
      ['Student', 'Working student'],
      'Gesetzlicher Freibetrag nach § 23 BAföG: 389 EUR im Monat bleiben anrechnungsfrei. Das ist ein Betrag nach Abzug von Werbungskosten-Pauschale und Sozialpauschale, kein Bruttowert. BAföG rechnet mit dem Durchschnitt über den Bewilligungszeitraum; einzelne Monate darüber sind deshalb nicht automatisch ein Problem. Über die Anrechnung entscheidet dein BAföG-Amt.',
      'Bekanntmachung zu § 23 Abs. 1 Satz 1 Nr. 1 BAföG vom 18.11.2025 (BGBl. 2025 I Nr. 279)',
      bafoegNotice2026,
      '2026-01-01',
      '2026-12-31',
      true,
      'bafoeg',
    ),
    asOf: dateAudit,
    basis: 'net-allowance',
    grossEquivalent: {
      value: 603,
      note: 'Rechnung zum Brutto-Äquivalent: (603 EUR − 1.230 EUR / 12 Arbeitnehmer-Pauschbetrag) × (1 − 22,3 % Sozialpauschale) = 388,89 EUR, aufgerundet 389 EUR. Annahmen: rentenversicherungspflichtige Beschäftigung, keine höheren Werbungskosten, keine weiteren Einkünfte.',
      note_en: 'Gross-equivalent calculation: (EUR 603 − EUR 1,230 / 12 employee allowance) × (1 − 22.3% social-insurance lump sum) = EUR 388.89, rounded up to EUR 389. Assumes employment subject to pension insurance, no higher work expenses and no other income.',
    },
  },
  record(
    'bafoegSideIncome',
    'BAföG-Freibetrag für eigenes Einkommen',
    null,
    'EUR',
    'month',
    ['Student', 'Working student'],
    '',
    '§ 23 Abs. 1 und 6 BAföG (Betrag 2027 noch nicht bekanntgemacht)',
    'https://www.gesetze-im-internet.de/baf_g/__23.html',
    '2027-01-01',
    '2027-12-31',
    false,
    'bafoeg',
  ),
  record(
    'incomeTaxThreshold',
    'Orientierungswert für regulären Arbeitslohn',
    13_614,
    'EUR',
    'year',
    ['Student', 'Working student', 'Employee'],
    'Grobe Orientierung aus Grundfreibetrag und Pauschbeträgen. Das ist keine persönliche Steuerfreigrenze; weitere Einkünfte und Abzüge verändern die Berechnung. Pauschal versteuerte Minijobs sind gesondert zu betrachten.',
    'EStG §§ 9a, 10c und 32a – vereinfachte Orientierung',
    'https://www.gesetze-im-internet.de/estg/__32a.html',
    '2026-01-01',
    '2026-12-31',
    false,
  ),
  record(
    'incomeTaxThreshold',
    'Orientierungswert für regulären Arbeitslohn',
    12_348 + 1_230 + 36,
    'EUR',
    'year',
    ['Student', 'Working student', 'Employee'],
    'Grobe Orientierung aus Grundfreibetrag und Pauschbeträgen. Das ist keine persönliche Steuerfreigrenze; weitere Einkünfte und Abzüge verändern die Berechnung. Pauschal versteuerte Minijobs sind gesondert zu betrachten.',
    'EStG §§ 9a, 10c und 32a – vereinfachte Orientierung',
    estgSource('32a'),
    '2027-01-01',
    '2027-12-31',
    false,
  ),
  record(
    'incomeTaxBasicAllowance',
    'Grundfreibetrag Einkommensteuer',
    12_348,
    'EUR',
    'year',
    ['Student', 'Working student', 'Employee'],
    'Grundfreibetrag nach § 32a EStG. Das zu versteuernde Einkommen ist nicht mit dem Bruttoarbeitslohn gleichzusetzen.',
    'Einkommensteuergesetz § 32a',
    'https://www.gesetze-im-internet.de/estg/__32a.html',
    '2026-01-01',
    '2026-12-31',
    true,
  ),
  record(
    'incomeTaxBasicAllowance',
    'Grundfreibetrag Einkommensteuer',
    12_348,
    'EUR',
    'year',
    ['Student', 'Working student', 'Employee'],
    'Grundfreibetrag nach § 32a EStG. Das zu versteuernde Einkommen ist nicht mit dem Bruttoarbeitslohn gleichzusetzen.',
    'Einkommensteuergesetz § 32a',
    estgSource('32a'),
    '2027-01-01',
    '2027-12-31',
    true,
  ),
  record(
    'employeeLumpSum',
    'Arbeitnehmer-Pauschbetrag',
    1_230,
    'EUR',
    'year',
    ['Student', 'Working student', 'Employee'],
    employeeLumpSumText,
    'Einkommensteuergesetz § 9a',
    estgSource('9a'),
    '2026-01-01',
    '2026-12-31',
    true,
  ),
  record(
    'employeeLumpSum',
    'Arbeitnehmer-Pauschbetrag',
    1_230,
    'EUR',
    'year',
    ['Student', 'Working student', 'Employee'],
    employeeLumpSumText,
    'Einkommensteuergesetz § 9a',
    estgSource('9a'),
    '2027-01-01',
    '2027-12-31',
    true,
  ),
  record(
    'specialExpensesLumpSum',
    'Sonderausgaben-Pauschbetrag',
    36,
    'EUR',
    'year',
    ['Student', 'Working student', 'Employee'],
    specialExpensesText,
    'Einkommensteuergesetz § 10c',
    estgSource('10c'),
    '2026-01-01',
    '2026-12-31',
    true,
  ),
  record(
    'specialExpensesLumpSum',
    'Sonderausgaben-Pauschbetrag',
    36,
    'EUR',
    'year',
    ['Student', 'Working student', 'Employee'],
    specialExpensesText,
    'Einkommensteuergesetz § 10c',
    estgSource('10c'),
    '2027-01-01',
    '2027-12-31',
    true,
  ),
  record(
    'minimumWage',
    'Gesetzlicher Mindestlohn',
    statutoryMinimumWage2026,
    'EUR',
    'hour',
    allStatuses,
    'Gesetzlicher Bruttomindestlohn je Zeitstunde. Ausnahmen und persönliche Anwendbarkeit sind gesondert zu prüfen.',
    'Bundesministerium für Arbeit und Soziales',
    'https://www.bmas.de/DE/Service/Gesetze-und-Gesetzesvorhaben/fuenfte-mindestlohnanpassungsverordnung-milov5.html',
    '2026-01-01',
    '2026-12-31',
    true,
  ),
  record(
    'minimumWage',
    'Gesetzlicher Mindestlohn',
    statutoryMinimumWage2027,
    'EUR',
    'hour',
    allStatuses,
    'Gesetzlicher Bruttomindestlohn je Zeitstunde. Ausnahmen und persönliche Anwendbarkeit sind gesondert zu prüfen.',
    'Bundesministerium für Arbeit und Soziales',
    'https://www.bmas.de/DE/Service/Gesetze-und-Gesetzesvorhaben/fuenfte-mindestlohnanpassungsverordnung-milov5.html',
    '2027-01-01',
    '2027-12-31',
    true,
  ),
  record(
    'youthWorkProtection',
    'Jugendarbeitsschutz',
    null,
    'Information',
    'year',
    ['Pupil'],
    'Unter 18 gilt grundsätzlich: höchstens 8 Stunden am Tag und 40 Stunden pro Woche, Arbeit nur zwischen 6 und 20 Uhr, 30 Minuten Pause ab mehr als 4,5 Stunden und 60 Minuten ab mehr als 6 Stunden. Das Gesetz kennt Ausnahmen. Headroom zeigt das nur als Information.',
    'Jugendarbeitsschutzgesetz §§ 8, 11, 14',
    'https://www.gesetze-im-internet.de/jarbschg/',
    '2026-01-01',
    '2027-12-31',
    true,
    'age < 18',
  ),
];

const englishText: Record<string, { name_en: string; consequence_en: string }> = {
  miniJobMonthly: {
    name_en: 'Mini-job earnings cap',
    consequence_en: 'The cap applies to regular earnings from all mini-jobs. Exceeding it can lead to mandatory social insurance.',
  },
  miniJobYearly: {
    name_en: 'Expected annual mini-job earnings',
    consequence_en: 'Expected annual earnings are generally decisive; one month may exceed the monthly cap.',
  },
  miniJobAlongsideMainJob: {
    name_en: 'Mini-job alongside a main job',
    consequence_en: 'Generally, only one mini-job may receive preferential treatment alongside an insured main job.',
  },
  familyInsurance: {
    name_en: 'Family-insurance total-income limit',
    consequence_en: 'What counts is your regular monthly total income (one seventh of the reference value, 2026: EUR 565). If your only job is a mini-job, you may earn up to the mini-job cap of EUR 603. Total income is not the same as gross pay: work-related expenses, among other things, are deducted from wages. Headroom compares cautiously with your gross pay. Your health insurer decides whether family insurance ends.',
  },
  shortTermEmployment: {
    name_en: 'Short-term employment',
    consequence_en: 'Generally no more than 70 workdays or 3 months per calendar year. Agriculture has separate rules.',
  },
  workingStudentHours: {
    name_en: 'Working-student hours during lecture periods',
    consequence_en: 'The 20-hour limit is a simplified reference for lecture periods. Headroom does not check exceptions or when the hours were worked (evenings, nights, weekends). The 26-week rule is shown as a separate limit.',
  },
  bafoegSideIncome: {
    name_en: 'BAföG allowance for own income',
    consequence_en: 'Statutory allowance under section 23 BAföG: EUR 389 per month are not counted. This amount applies after deducting the work-expense and social-insurance lump sums; it is not a gross figure. BAföG uses the average over the approval period, so single months above it are not automatically a problem. Your BAföG office decides.',
  },
  workingStudent26Weeks: {
    name_en: 'Working student: weeks above 20 hours per year',
    consequence_en: 'More than 20 hours a week are compatible with working-student status only as an exception (lecture-free period or evenings, nights, weekends). All weeks above 20 hours together may not exceed 26 weeks within one year. The year is counted back from the end of the employment; jobs with other employers count too.',
  },
  incomeTaxThreshold: {
    name_en: 'Reference value for regular wages',
    consequence_en: 'Simplified reference only; personal taxes depend on other income and deductions.',
  },
  incomeTaxBasicAllowance: {
    name_en: 'Income-tax basic allowance',
    consequence_en: 'Basic allowance under section 32a of the Income Tax Act. Taxable income is not the same as gross wages.',
  },
  employeeLumpSum: {
    name_en: 'Employee allowance',
    consequence_en: 'Lump sum for work-related expenses from wages. It is deducted automatically unless higher costs are shown.',
  },
  specialExpensesLumpSum: {
    name_en: 'Special-expenses lump sum',
    consequence_en: 'Lump sum for special expenses. It is deducted automatically unless higher special expenses are shown.',
  },
  minimumWage: {
    name_en: 'Statutory minimum wage',
    consequence_en: 'Statutory gross hourly minimum wage; check applicability and exceptions separately.',
  },
  youthWorkProtection: {
    name_en: 'Youth employment protection',
    consequence_en: 'Under 18, the general rules are: at most 8 hours a day and 40 hours a week, work only between 6 am and 8 pm, a 30-minute break after more than 4.5 hours and 60 minutes after more than 6 hours. The law has exceptions. Headroom shows this as information only.',
  },
};

// Interne Prüfnotizen. Werden nie angezeigt. Schlüssel: id@validFrom
const reviewNotes: Record<string, string> = {
  'familyInsurance@2026-01-01': 'Am 2026-10-27 gegen § 10 Abs. 1 Satz 1 Nr. 5 und Satz 4 SGB V (1/7 der Bezugsgröße; nur Minijob: bis Geringfügigkeitsgrenze) und § 1 SVBezGrV 2026 (3.955 €/Monat → 565 €) geprüft. Gesamteinkommen nach § 16 SGB IV = Einkünfte nach EStG; die App vergleicht vorsichtig mit Brutto (ohne Werbungskostenabzug).',
  'familyInsurance@2027-01-01': 'Regel nach § 10 Abs. 1 SGB V bekannt (1/7 der monatlichen Bezugsgröße). Kabinettsentwurf SVBezGrV 2027 nennt 4.130 €/Monat (→ 590 €); Bundesratszustimmung laut DRV-Meldung vom 24.09.2026 ausstehend, am 2026-10-27 nicht auf gesetze-im-internet.de verkündet. Wert erst nach Verkündung eintragen.',
  'bafoegSideIncome@2026-01-01': '389 € am 2026-10-27 im Bundesgesetzblatt (BGBl. 2025 I Nr. 279, Regelungstext-PDF) geprüft. Brutto-Äquivalent 603 € nach Formel § 23 Abs. 6 BAföG mit § 21 Abs. 2 Satz 1 Nr. 1 BAföG (22,3 %) und § 9a EStG (1.230 €) nachgerechnet: (603 − 102,50) × 0,777 = 388,89 → 389. Für nicht rentenversicherungspflichtige Minijobs (§ 21 Abs. 2 Nr. 3, 38,8 %) läge das Brutto-Äquivalent höher; 603 € ist die vorsichtige Untergrenze.',
  'bafoegSideIncome@2027-01-01': 'Neuer Betrag wird nach § 23 Abs. 6 BAföG zum 1. Januar per Bekanntmachung festgesetzt; am 2026-10-27 für 2027 noch nicht veröffentlicht. Kein Wert wird geschätzt.',
  'workingStudent26Weeks@2026-01-01': '26 Wochen „im Laufe eines Jahres“ am 2026-10-27 auf der DRV-Lexikonseite geprüft. Zeitjahr (rückwärts vom voraussichtlichen Ende der Beschäftigung, 182 Kalendertage, Vorbeschäftigungen zählen) nur über Krankenkassen-Veröffentlichungen (TK, BARMER, DAK) zum Rundschreiben der Spitzenorganisationen vom 23.11.2016 belegt; das Rundschreiben selbst nicht eingesehen.',
  'incomeTaxThreshold@2026-01-01': 'Bestandteile am 2026-10-24 im EStG bestätigt (12.348 + 1.230 + 36 = 13.614). Offen bleibt die Methode: Vorsorgepauschale und Brutto/zu versteuerndes Einkommen sind vereinfacht; fachlich prüfen lassen.',
  'incomeTaxThreshold@2027-01-01': 'Aus den am 2026-10-24 im EStG bestätigten Bestandteilen abgeleitet. Methode wie 2026 ungeprüft.',
  'incomeTaxBasicAllowance@2027-01-01': '§ 32a EStG (Stand 2026-10-24): Tarif gilt „ab dem Veranlagungszeitraum 2026“. Vor dem Jahreswechsel auf eine Änderung für 2027 prüfen.',
  'employeeLumpSum@2027-01-01': '§ 9a EStG ohne Befristung (Stand 2026-10-24). Vor dem Jahreswechsel auf Änderungen prüfen.',
  'specialExpensesLumpSum@2027-01-01': '§ 10c EStG ohne Befristung (Stand 2026-10-24). Vor dem Jahreswechsel auf Änderungen prüfen.',
  'youthWorkProtection@2026-01-01': '§§ 8 Abs. 1, 11 Abs. 1, 14 Abs. 1 JArbSchG am 2026-10-24 bestätigt. Ausnahmen (z. B. § 14 Abs. 2) werden nicht abgebildet. Nur Information; keine Warnung daraus berechnen.',
};

// Am 2026-10-24 gegen amtliche Quellen geprüft.
const recheckedKeys = new Set([
  'incomeTaxThreshold@2026-01-01',
  'incomeTaxThreshold@2027-01-01',
  'incomeTaxBasicAllowance@2026-01-01',
  'incomeTaxBasicAllowance@2027-01-01',
  'employeeLumpSum@2026-01-01',
  'employeeLumpSum@2027-01-01',
  'specialExpensesLumpSum@2026-01-01',
  'specialExpensesLumpSum@2027-01-01',
  'youthWorkProtection@2026-01-01',
]);

// Am 2026-10-27 (Audit Phase 1) gegen amtliche Quellen geprüft, auch wenn der Wert offen bleibt.
const auditCheckedKeys = new Set([
  'familyInsurance@2026-01-01',
  'familyInsurance@2027-01-01',
  'bafoegSideIncome@2026-01-01',
  'bafoegSideIncome@2027-01-01',
  'workingStudent26Weeks@2026-01-01',
]);

export const limits: Limit[] = sourceLimits.map((limit) => ({
  ...limit,
  ...englishText[limit.id],
  // Ohne deutschen Nutzertext bleibt auch der englische leer; die App zeigt dann einen neutralen Hinweis.
  ...(limit.consequence === '' ? { consequence_en: '' } : {}),
  reviewNote: reviewNotes[limit.id + '@' + limit.validFrom],
  ...(recheckedKeys.has(limit.id + '@' + limit.validFrom) ? { asOf: dateRechecked } : {}),
  ...(auditCheckedKeys.has(limit.id + '@' + limit.validFrom) ? { asOf: dateAudit } : {}),
}));

/** Alle Jahre, für die mindestens ein Grenzwert hinterlegt ist – Grundlage der Jahresauswahl. */
export function availableLimitYears(): number[] {
  const years = new Set<number>();
  for (const limit of limits) {
    const from = Number(limit.validFrom.slice(0, 4));
    const to = Number(limit.validTo.slice(0, 4));
    for (let year = from; year <= to; year += 1) years.add(year);
  }
  return [...years].sort((a, b) => a - b);
}

export function limitsForYear(year: number): Limit[] {
  const firstDay = String(year) + '-01-01';
  const lastDay = String(year) + '-12-31';
  return limits.filter((limit) => limit.validFrom <= lastDay && limit.validTo >= firstDay);
}
