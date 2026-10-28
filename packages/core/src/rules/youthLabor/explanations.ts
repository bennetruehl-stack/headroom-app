// Kurze Erklärungen zu jeder Regel. Die UI verlinkt sie bei jeder Meldung („Warum?“).
// Hinweise, keine Rechtsberatung. Kurze Sätze, Du-Ansprache.
export type YouthRuleId =
  | 'underMinimumAge'
  | 'parentalConsentMissing'
  | 'lightWorkOnly'
  | 'childDailyHours'
  | 'childTimeWindow'
  | 'duringSchool'
  | 'beforeSchool'
  | 'dailyHours'
  | 'weeklyHours'
  | 'workdaysPerWeek'
  | 'nightRest'
  | 'nightException'
  | 'breaksMissing'
  | 'breakTooShort'
  | 'continuousWork'
  | 'restBetweenDays'
  | 'saturdayWork'
  | 'saturdayException'
  | 'sundayWork'
  | 'sundayException'
  | 'freeSaturdays'
  | 'freeSundays'
  | 'holidayJobLimit'
  | 'timesMissing'
  | 'schoolObligationAssumed'
  | 'pieceWork'
  | 'hazardousWork'
  | 'barNightclub'
  | 'alcoholTobacco';

export type RuleExplanation = { title: string; title_en: string; text: string; text_en: string };

export const youthRuleExplanations: Record<YouthRuleId, RuleExplanation> = {
  underMinimumAge: {
    title: 'Unter 13 nicht erlaubt', title_en: 'Not allowed under 13',
    text: 'Kinder unter 13 dürfen grundsätzlich nicht arbeiten. Ausnahmen gibt es nur mit Genehmigung der Behörde, z. B. für Theater oder Film.',
    text_en: 'Children under 13 are generally not allowed to work. Exceptions need approval from the authorities, e.g. for theatre or film.',
  },
  parentalConsentMissing: {
    title: 'Eltern müssen zustimmen', title_en: 'Parents must agree',
    text: 'Solange für dich die Kinderregeln gelten, brauchst du die Einwilligung deiner Eltern. Hak sie in deinem Profil ab, sobald sie vorliegt.',
    text_en: 'As long as the child rules apply to you, you need your parents’ consent. Tick it in your profile once you have it.',
  },
  lightWorkOnly: {
    title: 'Nur leichte Arbeit', title_en: 'Light work only',
    text: 'Erlaubt sind nur leichte Arbeiten, die dir nicht schaden und Schule nicht stören. Beispiele: Zeitungen austragen, Nachhilfe, Babysitten, Hilfe im Sport.',
    text_en: 'Only light work that doesn’t harm you or get in the way of school is allowed. Examples: delivering newspapers, tutoring, babysitting, helping at sports.',
  },
  childDailyHours: {
    title: 'Höchstens 2 Stunden am Tag', title_en: 'At most 2 hours a day',
    text: 'Diese Kinderregel gilt mit 13 und 14. Ab 15 gilt sie nur, solange du noch vollzeitschulpflichtig bist, und dann nur außerhalb der Ferien: höchstens 2 Stunden am Tag, im landwirtschaftlichen Familienbetrieb 3. Ist deine Vollzeitschulpflicht erfüllt (meist nach 9 oder 10 Schuljahren), stell das im Profil um.',
    text_en: 'This child rule applies at 13 and 14. From 15 it applies only while you still have to attend school full time, and then only outside the holidays: at most 2 hours a day (3 on a family farm). If you have completed full-time schooling (usually after 9 or 10 years), change it in your profile.',
  },
  childTimeWindow: {
    title: 'Nur zwischen 8 und 18 Uhr', title_en: 'Only between 8 am and 6 pm',
    text: 'Solange die Kinderregeln gelten (mit 13 und 14 oder ab 15, solange du vollzeitschulpflichtig bist, außerhalb der Ferien), darfst du nicht zwischen 18 und 8 Uhr arbeiten.',
    text_en: 'While the child rules apply (at 13 and 14, or from 15 while you still have to attend school full time, outside the holidays), you may not work between 6 pm and 8 am.',
  },
  duringSchool: {
    title: 'Nicht während des Unterrichts', title_en: 'Not during lessons',
    text: 'Arbeit während der Unterrichtszeit ist nicht erlaubt. Headroom vergleicht mit dem Stundenplan aus deinem Profil.',
    text_en: 'Work during school hours is not allowed. Headroom compares with the timetable in your profile.',
  },
  beforeSchool: {
    title: 'Nicht vor dem Unterricht', title_en: 'Not before school',
    text: 'Solange die Kinderregeln gelten, darfst du an Schultagen nicht vor dem Unterricht arbeiten.',
    text_en: 'While the child rules apply, you may not work before lessons on school days.',
  },
  dailyHours: {
    title: 'Höchstens 8 Stunden am Tag', title_en: 'At most 8 hours a day',
    text: 'Unter 18 darfst du höchstens 8 Stunden am Tag arbeiten. 8,5 Stunden sind an einzelnen Tagen okay, wenn du an anderen Tagen derselben Woche kürzer arbeitest.',
    text_en: 'Under 18 you may work at most 8 hours a day. 8.5 hours on single days is fine if you work less on other days of the same week.',
  },
  weeklyHours: {
    title: 'Höchstens 40 Stunden pro Woche', title_en: 'At most 40 hours a week',
    text: 'Alle Jobs zusammen dürfen 40 Stunden pro Woche nicht übersteigen.',
    text_en: 'All jobs together may not exceed 40 hours a week.',
  },
  workdaysPerWeek: {
    title: 'Höchstens 5 Tage pro Woche', title_en: 'At most 5 days a week',
    text: 'Du darfst an höchstens 5 Tagen pro Woche arbeiten. Die zwei freien Tage sollen möglichst hintereinander liegen.',
    text_en: 'You may work on at most 5 days a week. The two days off should be consecutive if possible.',
  },
  nightRest: {
    title: 'Nachtruhe von 20 bis 6 Uhr', title_en: 'No work from 8 pm to 6 am',
    text: 'Unter 18 darfst du nur zwischen 6 und 20 Uhr arbeiten. Ab 16 gibt es Ausnahmen: Gastronomie bis 22 Uhr, Schichtbetriebe bis 23 Uhr, Bäckerei ab 5 Uhr (ab 17 ab 4 Uhr), Landwirtschaft ab 5 oder bis 21 Uhr.',
    text_en: 'Under 18 you may only work between 6 am and 8 pm. From 16 there are exceptions: hospitality until 10 pm, shift work until 11 pm, bakeries from 5 am (from 17: 4 am), agriculture from 5 am or until 9 pm.',
  },
  nightException: {
    title: 'Ausnahme von der Nachtruhe', title_en: 'Exception to the night rest',
    text: 'In deiner Branche darfst du ab 16 etwas früher oder später arbeiten. Headroom nimmt das aus deinem Job.',
    text_en: 'In your industry you may work a bit earlier or later from age 16. Headroom takes this from your job.',
  },
  breaksMissing: {
    title: 'Pausen eintragen', title_en: 'Add your breaks',
    text: 'Ab mehr als 4,5 Stunden brauchst du 30 Minuten Pause, ab mehr als 6 Stunden 60 Minuten. Trag deine Pausen ein, dann prüft Headroom das.',
    text_en: 'Over 4.5 hours you need a 30-minute break, over 6 hours 60 minutes. Add your breaks and Headroom will check.',
  },
  breakTooShort: {
    title: 'Pause zu kurz', title_en: 'Break too short',
    text: 'Mehr als 4,5 bis 6 Stunden: mindestens 30 Minuten Pause. Mehr als 6 Stunden: mindestens 60 Minuten. Nur Pausen ab 15 Minuten zählen.',
    text_en: 'More than 4.5 to 6 hours: at least 30 minutes of breaks. More than 6 hours: at least 60 minutes. Only breaks of 15 minutes or more count.',
  },
  continuousWork: {
    title: 'Nicht länger als 4,5 Stunden am Stück', title_en: 'No more than 4.5 hours in a row',
    text: 'Du darfst nie länger als 4,5 Stunden ohne Pause arbeiten.',
    text_en: 'You may never work more than 4.5 hours without a break.',
  },
  restBetweenDays: {
    title: '12 Stunden frei zwischen zwei Arbeitstagen', title_en: '12 hours off between two workdays',
    text: 'Nach Feierabend brauchst du mindestens 12 Stunden am Stück frei, bevor du wieder anfängst.',
    text_en: 'After work you need at least 12 hours off in a row before you start again.',
  },
  saturdayWork: {
    title: 'Samstags frei', title_en: 'Saturdays off',
    text: 'Samstags darfst du grundsätzlich nicht arbeiten. Ausnahmen gibt es z. B. im Verkauf, in der Gastronomie, im Sport oder in der Landwirtschaft.',
    text_en: 'You generally may not work on Saturdays. Exceptions include retail, hospitality, sport and agriculture.',
  },
  saturdayException: {
    title: 'Samstag in deiner Branche erlaubt', title_en: 'Saturday allowed in your industry',
    text: 'In deiner Branche ist Samstagsarbeit erlaubt. Dafür musst du an einem anderen Tag derselben Woche frei haben. Mindestens 2 Samstage im Monat sollen frei bleiben.',
    text_en: 'Saturday work is allowed in your industry. You must get another day off in the same week. At least 2 Saturdays a month should stay free.',
  },
  sundayWork: {
    title: 'Sonntags frei', title_en: 'Sundays off',
    text: 'Sonntags darfst du grundsätzlich nicht arbeiten. Ausnahmen gibt es z. B. in der Gastronomie, im Sport oder in Kliniken. Verkauf gehört nicht dazu.',
    text_en: 'You generally may not work on Sundays. Exceptions include hospitality, sport and hospitals. Retail is not one of them.',
  },
  sundayException: {
    title: 'Sonntag in deiner Branche erlaubt', title_en: 'Sunday allowed in your industry',
    text: 'In deiner Branche ist Sonntagsarbeit erlaubt. Dafür musst du an einem anderen Tag derselben Woche frei haben. Mindestens 2 Sonntage im Monat müssen frei bleiben.',
    text_en: 'Sunday work is allowed in your industry. You must get another day off in the same week. At least 2 Sundays a month must stay free.',
  },
  freeSaturdays: {
    title: 'Zu wenige freie Samstage', title_en: 'Too few free Saturdays',
    text: 'Mindestens 2 Samstage im Monat sollen frei bleiben.',
    text_en: 'At least 2 Saturdays a month should stay free.',
  },
  freeSundays: {
    title: 'Zu wenige freie Sonntage', title_en: 'Too few free Sundays',
    text: 'Mindestens 2 Sonntage im Monat müssen frei bleiben.',
    text_en: 'At least 2 Sundays a month must stay free.',
  },
  holidayJobLimit: {
    title: 'Ferienjob: höchstens 4 Wochen im Jahr', title_en: 'Holiday job: at most 4 weeks a year',
    text: 'Wenn du noch vollzeitschulpflichtig bist, darfst du ab 15 in den Ferien höchstens 4 Wochen im Kalenderjahr richtig arbeiten. Headroom zählt das als 20 Arbeitstage.',
    text_en: 'If you still have to attend school full time, from 15 you may work properly during holidays for at most 4 weeks per calendar year. Headroom counts this as 20 workdays.',
  },
  timesMissing: {
    title: 'Uhrzeiten fehlen', title_en: 'Times missing',
    text: 'Ohne Start und Ende kann Headroom Nachtruhe, Schulzeit, Pausen und freie Stunden nicht prüfen.',
    text_en: 'Without start and end times Headroom can’t check night rest, school hours, breaks and time off.',
  },
  schoolObligationAssumed: {
    title: 'Vollzeitschulpflicht angenommen', title_en: 'Full-time schooling assumed',
    text: 'Wie lange du vollzeitschulpflichtig bist, hängt vom Bundesland ab (meist 9 oder 10 Schuljahre). Headroom nimmt „ja“ an, bis du es im Profil einträgst.',
    text_en: 'How long you must attend school full time depends on your state (usually 9 or 10 years). Headroom assumes “yes” until you set it in your profile.',
  },
  pieceWork: {
    title: 'Akkordarbeit verboten', title_en: 'Piece work not allowed',
    text: 'Arbeit im Akkord oder mit vorgegebenem Tempo (z. B. Fließband) ist unter 18 verboten.',
    text_en: 'Piece work or work at a set pace (e.g. assembly line) is not allowed under 18.',
  },
  hazardousWork: {
    title: 'Gefährliche Arbeit verboten', title_en: 'Dangerous work not allowed',
    text: 'Arbeiten mit Unfallgefahr, Gefahrstoffen, Lärm oder Hitze sind unter 18 grundsätzlich verboten.',
    text_en: 'Work with accident risks, hazardous substances, noise or heat is generally not allowed under 18.',
  },
  barNightclub: {
    title: 'Bar oder Nachtlokal', title_en: 'Bar or night venue',
    text: 'Das Jugendschutzgesetz begrenzt, wann und wo du dich in Gaststätten und Clubs aufhalten darfst. Kläre mit deinem Arbeitgeber, ob der Job für dich passt.',
    text_en: 'The Youth Protection Act limits when and where you may be in bars and clubs. Check with your employer whether the job is suitable for you.',
  },
  alcoholTobacco: {
    title: 'Alkohol und Tabak', title_en: 'Alcohol and tobacco',
    text: 'Alkohol und Tabak dürfen nur an Erwachsene bzw. ab 16 (Bier, Wein) verkauft werden. Frag, wer im Job das Alter der Kund:innen prüft.',
    text_en: 'Alcohol and tobacco may only be sold to adults (beer and wine from 16). Ask who checks customers’ ages at work.',
  },
};
