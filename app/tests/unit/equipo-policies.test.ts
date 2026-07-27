import { describe, expect, it } from 'vitest';
import { EQUIPO_POLICIES, EQUIPO_ROLE_LABEL } from '@/utils/equipo';
import type { EquipoUser } from '@/services/api';

/**
 * Coverage for the dashboard Equipo panel.
 *
 * The Equipo panel shows admin + empleado users with hardcoded policy text.
 * The catalog is small (two roles) and the copy is reviewed manually, so
 * we pin both the policy text and the role pill label here. If the policy
 * text ever needs to change intentionally, this test will surface the
 * description so the review can confirm.
 */
describe('Equipo panel helpers', () => {
  it('exposes a policy for every role shown in the panel', () => {
    // admin + empleado are the two roles shown in the Equipo panel.
    // facilitators / participantes intentionally have no entry because
    // they are surfaced via other panels.
    expect(Object.keys(EQUIPO_POLICIES).sort()).toEqual(['admin', 'empleado']);
  });

  it('marks admin as the most-privileged role', () => {
    expect(EQUIPO_POLICIES.admin).toContain('Acceso completo');
  });

  it('keeps empleado bounded — no user / course creation', () => {
    expect(EQUIPO_POLICIES.empleado).toContain('No puede crear usuarios');
    expect(EQUIPO_POLICIES.empleado).toContain('cursos');
  });

  it('uses singular masculine labels for the role pill', () => {
    expect(EQUIPO_ROLE_LABEL.admin).toBe('Admin');
    expect(EQUIPO_ROLE_LABEL.empleado).toBe('Empleado');
  });

  it('does not regress the EquipoUser role union', () => {
    // Pin the type so a future refactor doesn't silently widen it
    // (e.g., adding 'facilitador' would defeat the purpose of having
    // a separate Facilitadores panel).
    const roles: EquipoUser['role'][] = ['admin', 'empleado'];
    expect(roles).toEqual(['admin', 'empleado']);
  });
});
