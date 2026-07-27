import { useState, useEffect } from 'react'
import { getEquipoUsers, type EquipoUser } from '@/services/api'

/**
 * Loads the Equipo panel rows (admin + empleado users) once on mount.
 *
 * The dashboard renders the Equipo panel as a read-only summary, so we
 * intentionally skip refetch / caching here — the admin user-management
 * page already has its own mutation flow. Failures resolve to an empty
 * list with `loading=false` so the table still renders its empty state.
 */
export function useUsers() {
  const [users, setUsers] = useState<EquipoUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getEquipoUsers()
      .then(data => {
        if (cancelled) return
        setUsers(data)
      })
      .catch(() => {
        if (cancelled) return
        setUsers([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { users, loading }
}
