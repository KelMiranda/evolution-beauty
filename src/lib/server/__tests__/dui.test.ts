import { describe, expect, it } from 'vitest';

import { duiSchema, normalizeDui } from '../dui';

describe('normalizeDui', () => {
  it('returns the canonical form unchanged when already valid', () => {
    expect(normalizeDui('00000000-0')).toBe('00000000-0');
    expect(normalizeDui('12345678-9')).toBe('12345678-9');
  });

  it('inserts the dash for nine contiguous digits', () => {
    expect(normalizeDui('000000000')).toBe('00000000-0');
    expect(normalizeDui('123456789')).toBe('12345678-9');
  });

  it('strips internal whitespace and surrounding whitespace before matching', () => {
    expect(normalizeDui('  00000000-0  ')).toBe('00000000-0');
    expect(normalizeDui('00000 000-0')).toBe('00000000-0');
    expect(normalizeDui('  00000 000 0  ')).toBe('00000000-0');
  });

  it('strips control characters (newline, tab) before matching', () => {
    expect(normalizeDui('00000000-0\n')).toBe('00000000-0');
    expect(normalizeDui('00000000\t-0')).toBe('00000000-0');
  });

  it('rejects inputs that are too short', () => {
    expect(normalizeDui('1234567')).toBeNull();
    expect(normalizeDui('1')).toBeNull();
    expect(normalizeDui('')).toBeNull();
  });

  it('rejects inputs that are too long', () => {
    expect(normalizeDui('12345678901234')).toBeNull();
    expect(normalizeDui('00000000-00')).toBeNull();
    expect(normalizeDui('000000000-0')).toBeNull();
  });

  it('rejects inputs with letters or non-digit symbols', () => {
    expect(normalizeDui('abcdefgh-i')).toBeNull();
    expect(normalizeDui('12345-67-8')).toBeNull();
    expect(normalizeDui('00000000-a')).toBeNull();
  });

  it('normalizes a single-internal-space nine-digit input to canonical', () => {
    // `00000000 0` -> strip space -> `000000000` -> 9 digits -> `00000000-0`
    expect(normalizeDui('00000000 0')).toBe('00000000-0');
  });

  it('rejects inputs that include a scheme prefix', () => {
    expect(normalizeDui('javascript:00000000-0')).toBeNull();
    expect(normalizeDui('http://00000000-0')).toBeNull();
  });

  it('rejects non-string inputs', () => {
    expect(normalizeDui(null)).toBeNull();
    expect(normalizeDui(undefined)).toBeNull();
    expect(normalizeDui(123456789)).toBeNull();
    expect(normalizeDui({ value: '00000000-0' })).toBeNull();
    expect(normalizeDui(['00000000-0'])).toBeNull();
  });
});

describe('duiSchema', () => {
  it('parses canonical DUI to itself', () => {
    const result = duiSchema.safeParse('12345678-9');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('12345678-9');
  });

  it('parses nine-digit DUI to canonical form', () => {
    const result = duiSchema.safeParse('123456789');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('12345678-9');
  });

  it('parses whitespace-padded DUI to canonical form', () => {
    const result = duiSchema.safeParse('  00000 000-0  ');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe('00000000-0');
  });

  it('fails with a per-field error for too-short input', () => {
    const result = duiSchema.safeParse('1234');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(result.error.issues[0]?.message).toContain('DUI inválido');
    }
  });

  it('fails with a per-field error for too-long input', () => {
    const result = duiSchema.safeParse('12345678901234');
    expect(result.success).toBe(false);
  });

  it('fails with a per-field error for non-digit input', () => {
    const result = duiSchema.safeParse('abcdefgh-i');
    expect(result.success).toBe(false);
  });
});
