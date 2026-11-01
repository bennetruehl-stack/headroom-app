/**
 * Hybride logische Uhr: Wanduhr in Millisekunden plus Zähler plus Geräte-ID.
 * Marken lassen sich als Text vergleichen. Die Uhr läuft nie rückwärts und springt nach dem
 * Empfang einer fremden Marke vor diese, auch wenn die eigene Wanduhr nachgeht.
 * Die aktuelle Zeit wird immer übergeben.
 */
export type HlcStamp = string;

export type Clock = { ms: number; counter: number; node: string };

const MS_DIGITS = 15;
const COUNTER_DIGITS = 6;

export function createClock(node: string): Clock {
  return { ms: 0, counter: 0, node };
}

export function formatStamp(clock: Clock): HlcStamp {
  return String(clock.ms).padStart(MS_DIGITS, '0') + '-' + String(clock.counter).padStart(COUNTER_DIGITS, '0') + '-' + clock.node;
}

export function parseStamp(stamp: HlcStamp): Clock {
  const [ms, counter, ...node] = stamp.split('-');
  return { ms: Number(ms), counter: Number(counter), node: node.join('-') };
}

export function compareStamps(a: HlcStamp | undefined, b: HlcStamp | undefined): -1 | 0 | 1 {
  if (a === b) return 0;
  if (a === undefined) return -1;
  if (b === undefined) return 1;
  return a < b ? -1 : 1;
}

/** Neue Marke für eine eigene Änderung. */
export function tick(clock: Clock, now: number): { clock: Clock; stamp: HlcStamp } {
  const ms = Math.max(clock.ms, now);
  const next = { ms, counter: ms === clock.ms ? clock.counter + 1 : 0, node: clock.node };
  return { clock: next, stamp: formatStamp(next) };
}

/** Uhr nach dem Empfang einer fremden Marke vorstellen. */
export function receive(clock: Clock, remote: HlcStamp, now: number): Clock {
  const other = parseStamp(remote);
  const ms = Math.max(clock.ms, other.ms, now);
  let counter = 0;
  if (ms === clock.ms && ms === other.ms) counter = Math.max(clock.counter, other.counter) + 1;
  else if (ms === clock.ms) counter = clock.counter + 1;
  else if (ms === other.ms) counter = other.counter + 1;
  return { ms, counter, node: clock.node };
}
