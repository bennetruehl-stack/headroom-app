// WZ-Nummern stammen aus WZ 2008 – anhand WZ 2025 (Destatis) prüfen.
// Qualifikationsniveaus sind typische Fälle – anhand KldB 2010 (Bundesagentur für Arbeit) prüfen.
import type { EmploymentType, JobTag } from '../src/types';

export type JobPreset = {
  id: string;
  area: string;
  area_en: string;
  title_de: string;
  title_en: string;
  industry: { wzDivision: string; name: string };
  skillLevel: 1 | 2 | 3 | 4;
  typicalEmploymentTypes: EmploymentType[];
  /** Merkmale für den Jugendarbeitsschutz. Die Regeln dazu stehen in src/rules/jobTags.ts, nicht in der UI. */
  tags: JobTag[];
};

type PresetRow = {
  area: string;
  areaEn: string;
  de: string;
  en: string;
  wz: string;
  name: string;
  level: 1 | 2 | 3 | 4;
  types: EmploymentType[];
  tags?: JobTag[];
};

const rows: PresetRow[] = [
  { area: 'Gastronomie', areaEn: 'Gastronomy', de: 'Service / Kellner:in', en: 'Service / Waiter', wz: '56', name: 'Gastronomie', level: 1, types: ['mini-job', 'short-term'], tags: ['gastronomy'] },
  { area: 'Gastronomie', areaEn: 'Gastronomy', de: 'Barkeeper:in', en: 'Bartender', wz: '56', name: 'Gastronomie', level: 1, types: ['mini-job', 'short-term'], tags: ['gastronomy', 'barNightclub', 'alcoholTobacco'] },
  { area: 'Gastronomie', areaEn: 'Gastronomy', de: 'Küchenhilfe / Spülkraft', en: 'Kitchen help / Dishwasher', wz: '56', name: 'Gastronomie', level: 1, types: ['mini-job', 'short-term'], tags: ['gastronomy'] },
  { area: 'Gastronomie', areaEn: 'Gastronomy', de: 'Barista', en: 'Barista', wz: '56', name: 'Gastronomie', level: 1, types: ['mini-job', 'short-term'], tags: ['gastronomy'] },
  { area: 'Gastronomie', areaEn: 'Gastronomy', de: 'Essenslieferung per Fahrrad', en: 'Food delivery rider', wz: '56/53', name: 'Gastronomie / Kurierdienste', level: 1, types: ['mini-job', 'short-term'], tags: ['transport'] },
  { area: 'Hotel', areaEn: 'Hotel', de: 'Rezeption / Housekeeping', en: 'Reception / Housekeeping', wz: '55', name: 'Beherbergung', level: 1, types: ['mini-job', 'short-term'], tags: ['gastronomy'] },
  { area: 'Einzelhandel', areaEn: 'Retail', de: 'Verkauf / Kasse', en: 'Sales / Cashier', wz: '47', name: 'Einzelhandel', level: 1, types: ['mini-job', 'short-term'], tags: ['retail', 'alcoholTobacco'] },
  { area: 'Einzelhandel', areaEn: 'Retail', de: 'Regalpflege / Warenverräumung', en: 'Shelf stocking / Inventory', wz: '47', name: 'Einzelhandel', level: 1, types: ['mini-job', 'short-term'], tags: ['retail'] },
  { area: 'Einzelhandel', areaEn: 'Retail', de: 'Promotion / Messe', en: 'Promotion / Trade fair', wz: '73', name: 'Werbung und Messe', level: 1, types: ['mini-job', 'short-term'] },
  { area: 'Logistik', areaEn: 'Logistics', de: 'Lager / Kommissionierung', en: 'Warehouse / Picking', wz: '52', name: 'Lagerei', level: 1, types: ['mini-job', 'short-term'] },
  { area: 'Logistik', areaEn: 'Logistics', de: 'Paket- / Kurierdienst', en: 'Parcel / Courier', wz: '53', name: 'Kurierdienste', level: 1, types: ['mini-job', 'short-term'], tags: ['transport'] },
  { area: 'Veranstaltungen', areaEn: 'Events', de: 'Eventpersonal / Aufbau', en: 'Event staff / Setup', wz: '90–93', name: 'Kunst, Unterhaltung und Erholung', level: 1, types: ['mini-job', 'short-term'] },
  { area: 'Veranstaltungen', areaEn: 'Events', de: 'Einlass / Garderobe / Ticketing', en: 'Entrance / Cloakroom / Ticketing', wz: '90–93', name: 'Kunst, Unterhaltung und Erholung', level: 1, types: ['mini-job', 'short-term'] },
  { area: 'Veranstaltungen', areaEn: 'Events', de: 'Festival- / Saisonjob', en: 'Festival / Seasonal job', wz: '90–93', name: 'Kunst, Unterhaltung und Erholung', level: 1, types: ['short-term', 'mini-job'] },
  { area: 'Bildung', areaEn: 'Education', de: 'Nachhilfe', en: 'Tutoring', wz: '85', name: 'Erziehung und Unterricht', level: 2, types: ['mini-job', 'regular'], tags: ['lightWork'] },
  { area: 'Bildung', areaEn: 'Education', de: 'Studentische Hilfskraft in der Forschung', en: 'Student research assistant', wz: '85', name: 'Erziehung und Unterricht', level: 2, types: ['working student', 'regular'] },
  { area: 'Bildung', areaEn: 'Education', de: 'Tutor:in an der Hochschule', en: 'University tutor', wz: '85', name: 'Erziehung und Unterricht', level: 2, types: ['working student', 'regular'] },
  { area: 'Betreuung', areaEn: 'Care', de: 'Babysitting', en: 'Babysitting', wz: '97', name: 'Private Haushalte', level: 1, types: ['mini-job', 'short-term'], tags: ['household', 'lightWork'] },
  { area: 'Betreuung', areaEn: 'Care', de: 'Pflegeassistenz', en: 'Care assistant', wz: '86–88', name: 'Gesundheits- und Sozialwesen', level: 1, types: ['mini-job', 'short-term'], tags: ['hospital'] },
  { area: 'Haushalt', areaEn: 'Household', de: 'Reinigung / Haushaltshilfe', en: 'Cleaning / Household help', wz: '97/81', name: 'Private Haushalte / Gebäudereinigung', level: 1, types: ['mini-job', 'short-term'], tags: ['household'] },
  { area: 'Sport', areaEn: 'Sport', de: 'Trainer:in / Kursleitung', en: 'Coach / Instructor', wz: '93', name: 'Sport und Erholung', level: 2, types: ['mini-job', 'regular'], tags: ['sport', 'lightWork'] },
  { area: 'Sport', areaEn: 'Sport', de: 'Empfang im Fitnessstudio', en: 'Gym front desk', wz: '93', name: 'Sport und Erholung', level: 1, types: ['mini-job', 'short-term'], tags: ['sport'] },
  { area: 'Büro', areaEn: 'Office', de: 'Bürohilfe / Empfang', en: 'Office help / Reception', wz: '82', name: 'Büroservice', level: 1, types: ['mini-job', 'short-term'], tags: ['lightWork'] },
  { area: 'Büro', areaEn: 'Office', de: 'Callcenter / Kundenservice', en: 'Call center / Customer service', wz: '82', name: 'Büroservice', level: 1, types: ['mini-job', 'regular'] },
  { area: 'Werkstudent:in', areaEn: 'Working student', de: 'Marketing / Social Media', en: 'Marketing / Social media', wz: '73', name: 'Werbung und Marktforschung', level: 2, types: ['working student'] },
  { area: 'Werkstudent:in', areaEn: 'Working student', de: 'IT / Software', en: 'IT / Software', wz: '62', name: 'IT-Dienstleistungen', level: 2, types: ['working student'] },
  { area: 'Werkstudent:in', areaEn: 'Working student', de: 'Vertrieb', en: 'Sales', wz: 'varies', name: 'Je nach Tätigkeit', level: 2, types: ['working student'] },
  { area: 'Werkstudent:in', areaEn: 'Working student', de: 'Finanzen / Controlling', en: 'Finance / Controlling', wz: 'varies', name: 'Je nach Tätigkeit', level: 2, types: ['working student'] },
  { area: 'Werkstudent:in', areaEn: 'Working student', de: 'Forschung / Labor', en: 'Research / Lab', wz: '72', name: 'Forschung und Entwicklung', level: 2, types: ['working student'] },
  { area: 'Mobilität', areaEn: 'Mobility', de: 'Fahrer:in / Shuttle', en: 'Driver / Shuttle', wz: '49', name: 'Landverkehr', level: 1, types: ['mini-job', 'short-term'], tags: ['transport'] },
  { area: 'Mobilität', areaEn: 'Mobility', de: 'Personalvermittlung / Zeitarbeit', en: 'Staffing agency', wz: '78', name: 'Vermittlung und Überlassung', level: 1, types: ['mini-job', 'short-term', 'regular'] },
  { area: 'Sonstiges', areaEn: 'Other', de: 'Sonstiger Job', en: 'Other job', wz: 'varies', name: 'Branche frei wählbar', level: 1, types: ['mini-job', 'short-term', 'working student', 'regular'] },
  // Typische Ferien- und Schülerjobs sowie Jobs, die unter 18 verboten sind (Tags pieceWork, hazardous).
  // Am Ende angehängt, damit die IDs der bestehenden Vorlagen gleich bleiben.
  { area: 'Schülerjobs', areaEn: 'Teen jobs', de: 'Zeitungen / Prospekte austragen', en: 'Newspaper / flyer delivery', wz: '53', name: 'Post- und Kurierdienste', level: 1, types: ['mini-job'], tags: ['lightWork'] },
  { area: 'Schülerjobs', areaEn: 'Teen jobs', de: 'Verkauf in der Bäckerei', en: 'Bakery sales', wz: '47/10', name: 'Einzelhandel / Backwaren', level: 1, types: ['mini-job', 'short-term'], tags: ['bakery', 'retail'] },
  { area: 'Schülerjobs', areaEn: 'Teen jobs', de: 'Erntehelfer:in', en: 'Harvest helper', wz: '01', name: 'Landwirtschaft', level: 1, types: ['short-term'], tags: ['agriculture'] },
  { area: 'Schülerjobs', areaEn: 'Teen jobs', de: 'Tankstelle / Kiosk', en: 'Petrol station / Kiosk', wz: '47', name: 'Einzelhandel', level: 1, types: ['mini-job'], tags: ['retail', 'alcoholTobacco'] },
  { area: 'Produktion', areaEn: 'Production', de: 'Fließband / Produktion', en: 'Assembly line / Production', wz: '10–33', name: 'Verarbeitendes Gewerbe', level: 1, types: ['short-term', 'mini-job'], tags: ['pieceWork', 'multiShift'] },
  { area: 'Bau', areaEn: 'Construction', de: 'Bauhelfer:in', en: 'Construction helper', wz: '41–43', name: 'Baugewerbe', level: 1, types: ['short-term'], tags: ['hazardous'] },
];

export const jobPresets: JobPreset[] = rows.map((row, index) => ({
  id: 'preset-' + index,
  area: row.area,
  area_en: row.areaEn,
  title_de: row.de,
  title_en: row.en,
  industry: { wzDivision: row.wz, name: row.name },
  skillLevel: row.level,
  typicalEmploymentTypes: row.types,
  tags: row.tags ?? [],
}));
