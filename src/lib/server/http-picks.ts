/**
 * Body field pickers used by endpoints that accept both camelCase and snake_case
 * payloads (e.g. the public JSON registration endpoint). Each picker accepts an
 * unknown record and a list of alias keys; the first present, coerced value is
 * returned. Missing keys yield sentinels (`''`, `0`, `false`) that the Zod
 * schema can reject cleanly.
 */

export function pickString(raw: Record<string, unknown>, ...aliases: string[]): string {
  for (const alias of aliases) {
    const value = raw[alias];
    if (value === undefined || value === null) continue;
    return String(value);
  }
  return '';
}

export function pickOptionalString(raw: Record<string, unknown>, ...aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const value = raw[alias];
    if (value === undefined || value === null) continue;
    const text = String(value);
    return text;
  }
  return undefined;
}

export function pickNumber(raw: Record<string, unknown>, ...aliases: string[]): number {
  for (const alias of aliases) {
    const value = raw[alias];
    if (value === undefined || value === null) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function pickBoolean(raw: Record<string, unknown>, ...aliases: string[]): boolean {
  for (const alias of aliases) {
    const value = raw[alias];
    if (value === undefined || value === null) continue;
    if (value === true || value === false) return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return false;
}
