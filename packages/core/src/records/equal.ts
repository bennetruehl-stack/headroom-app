/** Vergleicht zwei JSON-artige Werte unabhängig von der Reihenfolge der Schlüssel. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => sameValue(item, b[index]));
  const left = definedEntries(a as Record<string, unknown>);
  const right = definedEntries(b as Record<string, unknown>);
  return left.length === right.length && left.every(([key, value]) => sameValue(value, (b as Record<string, unknown>)[key]));
}

function definedEntries(value: Record<string, unknown>): [string, unknown][] {
  return Object.entries(value).filter(([, item]) => item !== undefined);
}
