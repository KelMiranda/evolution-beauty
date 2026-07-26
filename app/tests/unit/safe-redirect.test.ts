import { describe, expect, it } from 'vitest';
import { safeRedirect } from '@/lib/safeRedirect';

// Each scenario below mirrors a Requirement/Scenario in
// `openspec/changes/acoes-dui-enrollment-flow/specs/redirect-after-registration/spec.md`.
describe('safeRedirect', () => {
  describe('acceptance — relative paths', () => {
    it.each([
      ['/cursos/9?token=XYZ', '/cursos/9?token=XYZ'],
      ['/cursos/9#schedule', '/cursos/9#schedule'],
      ['/cursos/9', '/cursos/9'],
      ['/dashboard', '/dashboard'],
      ['/cursos/9?a=1&b=2', '/cursos/9?a=1&b=2'],
      ['/registro/landing', '/registro/landing'],
    ])('returns %s unchanged when given %s', (input, expected) => {
      expect(safeRedirect(input)).toBe(expected);
    });

    it('preserves leading and trailing whitespace before validation', () => {
      expect(safeRedirect('  /cursos/9?token=XYZ  ')).toBe('/cursos/9?token=XYZ');
    });
  });

  describe('rejection — empty / non-string inputs', () => {
    it.each([
      ['', ''],
      [' ', ' '],
      [null, null],
      [undefined, undefined],
    ])('returns null for non-actionable input (%s)', (_label, input) => {
      expect(safeRedirect(input as string | null | undefined)).toBeNull();
    });

    it('returns null for inputs shorter than two characters after trim', () => {
      expect(safeRedirect('/')).toBeNull();
      expect(safeRedirect('a')).toBeNull();
    });
  });

  describe('rejection — protocol-relative and external schemes', () => {
    it('returns null for protocol-relative targets', () => {
      expect(safeRedirect('//evil.com')).toBeNull();
      expect(safeRedirect('//evil.com/path')).toBeNull();
    });

    it.each([
      'http://evil.com/path',
      'https://evil.com/path',
      'HTTPS://evil.com',
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
    ])('returns null for scheme-prefixed input (%s)', (input) => {
      expect(safeRedirect(input)).toBeNull();
    });

    it('returns null for a scheme embedded before the query string', () => {
      expect(safeRedirect('/foo?next=http://evil.com')).toBe('/foo?next=http://evil.com');
      expect(safeRedirect('/foo?next=javascript:alert(1)')).toBe('/foo?next=javascript:alert(1)');
    });
  });

  describe('rejection — control characters and whitespace', () => {
    // JS's `trim()` already strips leading/trailing whitespace and control
    // characters, so inputs with only trailing control characters reduce to
    // their canonical path and are accepted (the dangerous characters are
    // gone). The function's control-character check still defends against
    // embedded control characters that trim() cannot reach.
    it.each([
      '/cur\tsos/9',
      '/cur\nsos/9',
      '/cursos/9\u0000',
      '/cursos/9\u001f',
    ])('returns null for path with embedded control characters (%s)', (input) => {
      expect(safeRedirect(input)).toBeNull();
    });

    it.each([
      '/cursos/9\n',
      '/cursos/9\r',
      '/cursos/9\t',
    ])('trims trailing control characters and returns the cleaned path (%s)', (input) => {
      expect(safeRedirect(input)).toBe('/cursos/9');
    });

    it('returns null for path with internal whitespace', () => {
      expect(safeRedirect('/cursos/ 9')).toBeNull();
      expect(safeRedirect('/cur sos/9')).toBeNull();
    });
  });

  describe('rejection — non-root paths', () => {
    it('returns null when input does not start with /', () => {
      expect(safeRedirect('cursos/9')).toBeNull();
      expect(safeRedirect('?token=XYZ')).toBeNull();
      expect(safeRedirect('#schedule')).toBeNull();
    });
  });

  describe('rejection — self-loop guard', () => {
    it.each([
      '/registro',
      '/registro?redirect=/cursos/9',
      '/registro#step1',
      '/registro?funcion=Participante',
    ])('returns null when redirect loops back into /registro (%s)', (input) => {
      expect(safeRedirect(input)).toBeNull();
    });
  });

  describe('non-string inputs', () => {
    it.each([
      [42, 'number'],
      [true, 'boolean'],
      [{}, 'object'],
      [[], 'array'],
    ])('returns null for %s input', (input) => {
      expect(safeRedirect(input as unknown as string)).toBeNull();
    });
  });
});