import { describe, expect, it } from 'vitest';
import { formatDuiInput, normalizeDui } from '@/lib/dui';

describe('formatDuiInput', () => {
  describe('partial input — typing digit by digit', () => {
    it('keeps the first 8 digits unchanged (no dash yet)', () => {
      expect(formatDuiInput('0')).toBe('0');
      expect(formatDuiInput('04')).toBe('04');
      expect(formatDuiInput('046')).toBe('046');
      expect(formatDuiInput('04660171')).toBe('04660171');
    });

    it('auto-inserts the dash right after the 8th digit', () => {
      expect(formatDuiInput('046601718')).toBe('04660171-8');
      expect(formatDuiInput('123456780')).toBe('12345678-0');
    });

    it('caps at the canonical 10-character form', () => {
      expect(formatDuiInput('046601713')).toBe('04660171-3');
      expect(formatDuiInput('0466017134')).toBe('04660171-3');
    });
  });

  describe('canonical input — already formatted', () => {
    it('returns the canonical form unchanged', () => {
      expect(formatDuiInput('04660171-3')).toBe('04660171-3');
      expect(formatDuiInput('12345678-9')).toBe('12345678-9');
    });
  });

  describe('paste scenarios', () => {
    it('inserts dash when pasting nine contiguous digits', () => {
      expect(formatDuiInput('046601713')).toBe('04660171-3');
    });

    it('preserves the dashed form when pasting with dashes', () => {
      expect(formatDuiInput('04660171-3')).toBe('04660171-3');
    });

    it('strips extra dashes and spaces from pasted input', () => {
      expect(formatDuiInput('0466-0171-3')).toBe('04660171-3');
      expect(formatDuiInput('0466 0171 3')).toBe('04660171-3');
      expect(formatDuiInput('0-4-6-6-0-1-7-1-3')).toBe('04660171-3');
    });

    it('strips non-digit characters entirely', () => {
      expect(formatDuiInput('12abc34def5678')).toBe('12345678');
      expect(formatDuiInput('12-34-56-78-9')).toBe('12345678-9');
      expect(formatDuiInput('a1b2c3d4e5f6g7h8i9')).toBe('12345678-9');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for empty input', () => {
      expect(formatDuiInput('')).toBe('');
    });

    it('returns empty string for input with no digits', () => {
      expect(formatDuiInput('abc')).toBe('');
      expect(formatDuiInput('-')).toBe('');
      expect(formatDuiInput('   ')).toBe('');
    });

    it('truncates pasted input that has more than 9 digits', () => {
      expect(formatDuiInput('04660171399')).toBe('04660171-3');
      expect(formatDuiInput('999999999999')).toBe('99999999-9');
    });
  });

  describe('compose with normalizeDui', () => {
    it('round-trips through normalizeDui to the canonical form', () => {
      // Whatever the user manages to type or paste, normalizeDui should
      // accept it and produce the canonical 00000000-0.
      expect(normalizeDui(formatDuiInput('046601713'))).toBe('04660171-3');
      expect(normalizeDui(formatDuiInput('0466-0171-3'))).toBe('04660171-3');
      expect(normalizeDui(formatDuiInput('046601718'))).toBe('04660171-8');
      // Partial input normalizes to the partial canonical form (still 00000000-0 shape but shorter)
      expect(normalizeDui(formatDuiInput('04660171'))).toBeNull();
    });
  });
});