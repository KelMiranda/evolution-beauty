import { describe, expect, it } from 'vitest';
import { splitFacilitadores } from '@/utils/facilitadores';
import type { Registro } from '@/types';

/**
 * Coverage for the dashboard Facilitadores panel split.
 *
 * `splitFacilitadores` is the pure helper that drives the two sub-tables
 * (linked vs unlinked) on `DashboardPage`. It must filter by the canonical
 * PR2 role `'Facilitador'`, fall back to lowercase `'facilitador'` for
 * legacy admin rows, and partition on `courseId` truthiness — anything
 * with a `courseId` lands in `linked`, anything without in `unlinked`.
 */
function makeRegistro(overrides: Partial<Registro>): Registro {
  return {
    id: '1',
    courseId: undefined,
    facilitatorId: undefined,
    nombre: 'Test',
    dui: '00000000-0',
    fechaNacimiento: '1990-01-01',
    genero: 'female',
    pais: 'SV',
    prefijo: '+503',
    celular: '00000000',
    correo: 'test@example.com',
    direccion: '',
    distrito: '',
    departamento: 'San Salvador',
    municipio: '',
    entidad: '',
    funcion: 'Participante',
    nivelEducativo: '',
    capacitacion: '',
    autorizaDatos: true,
    observaciones: '',
    fechaRegistro: '2024-01-01',
    codigo: 'P000001',
    estado: 'activo',
    ...overrides,
  };
}

describe('splitFacilitadores', () => {
  it('returns empty buckets when there are no facilitator rows', () => {
    const result = splitFacilitadores([
      makeRegistro({ id: '1', funcion: 'Participante' }),
      makeRegistro({ id: '2', funcion: 'Empleado' }),
    ]);
    expect(result.linked).toEqual([]);
    expect(result.unlinked).toEqual([]);
  });

  it('splits canonical Facilitador rows by courseId truthiness', () => {
    const result = splitFacilitadores([
      makeRegistro({ id: '1', funcion: 'Facilitador', courseId: '29' }),
      makeRegistro({ id: '2', funcion: 'Facilitador' }),
    ]);
    expect(result.linked.map(r => r.id)).toEqual(['1']);
    expect(result.unlinked.map(r => r.id)).toEqual(['2']);
  });

  it('also matches lowercase "facilitador" (legacy admin rows)', () => {
    const result = splitFacilitadores([
      makeRegistro({ id: '3', funcion: 'facilitador', courseId: '30' }),
    ]);
    expect(result.linked.map(r => r.id)).toEqual(['3']);
    expect(result.unlinked).toEqual([]);
  });

  it('does NOT include legacy "Facilitadora" rows (PR2 canonical form)', () => {
    const result = splitFacilitadores([
      makeRegistro({ id: '4', funcion: 'Facilitadora', courseId: '31' }),
    ]);
    expect(result.linked).toEqual([]);
    expect(result.unlinked).toEqual([]);
  });

  it('mixes canonical and lowercase rows into the right buckets', () => {
    const result = splitFacilitadores([
      makeRegistro({ id: 'a', funcion: 'Facilitador', courseId: '1' }),
      makeRegistro({ id: 'b', funcion: 'facilitador', courseId: '2' }),
      makeRegistro({ id: 'c', funcion: 'Facilitador' }),
      makeRegistro({ id: 'd', funcion: 'facilitador' }),
      makeRegistro({ id: 'e', funcion: 'Participante', courseId: '3' }),
    ]);
    expect(result.linked.map(r => r.id).sort()).toEqual(['a', 'b']);
    expect(result.unlinked.map(r => r.id).sort()).toEqual(['c', 'd']);
  });
});
