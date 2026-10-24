import { describe, expect, it } from 'vitest';
import { annualMiniProjection, monthTotal } from '@headroom/core';
import { createDemoState } from './storage';

describe('demo state', () => {
  const state = createDemoState();
  const today = new Date();
  const year = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const monthKey = year + '-' + String(currentMonth).padStart(2, '0');

  it('keeps the pitch value of 487 EUR in the current month', () => {
    expect(monthTotal(state.shifts, state.jobs, monthKey, ['mini-job'])).toBeCloseTo(487, 1);
  });

  it('runs the mini-jobs since January so month and year tell the same story', () => {
    const months = new Set(
      state.shifts
        .filter((shift) => shift.jobId !== 'demo-festival' && shift.date.startsWith(String(year)))
        .map((shift) => shift.date.slice(0, 7)),
    );
    expect(months.size).toBe(currentMonth);

    const projected = annualMiniProjection(state.shifts, state.jobs, year, currentMonth);
    // Rund zwölf typische Monate um die 487 EUR, aber unter der Jahresgrenze.
    expect(projected).toBeGreaterThan(487 * 11);
    expect(projected).toBeLessThan(7_236);
  });
});
