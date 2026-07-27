import type { EquipoUser } from '@/services/api'

/**
 * Hardcoded policy descriptions for the dashboard Equipo panel.
 *
 * Kept as a constant rather than fetched from the backend because:
 *  • The four-role taxonomy is small and reviewed manually by the admin
 *    team, so copy changes don't need a deployment of the SPA + backend
 *    in lockstep.
 *  • The Equipo panel is a read-only summary; richer policy editing is
 *    tracked outside this scope (per `docs/architecture.md` future
 *    architectural changes).
 *
 * `facilitador` and `participante` are intentionally absent — facilitators
 * have their own panel and participants are public registrations, so
 * neither shows up in the Equipo panel.
 */
export const EQUIPO_POLICIES: Record<EquipoUser['role'], string> = {
  admin:
    'Acceso completo. Gestiona usuarios, cursos, participantes, reportes y configuración del sistema.',
  empleado:
    'Gestiona participantes y reportes. No puede crear usuarios ni cursos.',
}

/**
 * Short label used by the role pill in the Equipo table.
 */
export const EQUIPO_ROLE_LABEL: Record<EquipoUser['role'], string> = {
  admin: 'Admin',
  empleado: 'Empleado',
}
