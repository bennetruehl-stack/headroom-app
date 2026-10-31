import { jobPresets } from '@headroom/core';
import { describe, expect, it } from 'vitest';
import { bafoegRelevant, showLimitInStudentMode, visibleEmploymentType, visiblePreset } from './studentMode';

describe('Schüler-Modus: Ausblenden', () => {
  it('blendet Werkstudenten-Art und reine Hochschul-Vorlagen aus', () => {
    expect(visibleEmploymentType('working student', true)).toBe(false);
    expect(visibleEmploymentType('mini-job', true)).toBe(true);
    const hidden = jobPresets.filter((preset) => !visiblePreset(preset, true)).map((preset) => preset.title_de);
    expect(hidden).toEqual(expect.arrayContaining(['Studentische Hilfskraft in der Forschung', 'Tutor:in an der Hochschule', 'IT / Software']));
    expect(hidden).not.toContain('Nachhilfe');
    expect(hidden).not.toContain('Sonstiger Job');
    expect(jobPresets.every((preset) => visiblePreset(preset, false))).toBe(true);
  });

  it('zeigt BAföG nur, wenn eine BAföG-Grenze für den Status gilt', () => {
    expect(bafoegRelevant('Pupil')).toBe(false);
    expect(bafoegRelevant('Student')).toBe(true);
  });

  it('versteckt nicht geltende Grenzwerte nur im Schüler-Modus', () => {
    expect(showLimitInStudentMode(false, true)).toBe(false);
    expect(showLimitInStudentMode(false, false)).toBe(true);
    expect(showLimitInStudentMode(true, true)).toBe(true);
  });
});
