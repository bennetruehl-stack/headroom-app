import { describe, expect, it } from 'vitest';
import { compareStamps, createClock, receive, tick } from './hlc';

const T = Date.UTC(2026, 10, 1, 12, 0, 0);

describe('hybride logische Uhr', () => {
  it('liefert bei gleicher Wanduhr fortlaufend größere Marken', () => {
    let clock = createClock('gerät-a');
    const first = tick(clock, T);
    clock = first.clock;
    const second = tick(clock, T);
    expect(compareStamps(second.stamp, first.stamp)).toBe(1);
  });

  it('läuft nicht rückwärts, wenn die Wanduhr zurückspringt', () => {
    const first = tick(createClock('gerät-a'), T);
    const second = tick(first.clock, T - 60_000);
    expect(compareStamps(second.stamp, first.stamp)).toBe(1);
  });

  it('springt nach dem Empfang vorwärts, auch wenn die eigene Uhr 10 Minuten nachgeht', () => {
    const remote = tick(createClock('gerät-b'), T).stamp;
    const late = T - 10 * 60_000;
    const clock = receive(createClock('gerät-a'), remote, late);
    const next = tick(clock, late).stamp;
    expect(compareStamps(next, remote)).toBe(1);
  });

  it('entscheidet bei gleicher Zeit immer gleich nach der Geräte-ID', () => {
    const a = tick(createClock('gerät-a'), T).stamp;
    const b = tick(createClock('gerät-b'), T).stamp;
    expect(compareStamps(a, b)).toBe(-1);
    expect(compareStamps(b, a)).toBe(1);
    expect(compareStamps(a, a)).toBe(0);
  });

  it('vergleicht Zeiten mit unterschiedlicher Stellenzahl richtig', () => {
    const early = tick(createClock('z'), 999).stamp;
    const later = tick(createClock('a'), 1000).stamp;
    expect(compareStamps(early, later)).toBe(-1);
  });
});
