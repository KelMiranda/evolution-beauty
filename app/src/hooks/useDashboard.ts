import { useState, useEffect } from 'react'
import { getDashboardStats } from '@/services/api'
import type { DashboardStats } from '@/types'

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats().then(s => {
      setStats(s)
      setLoading(false)
    })
  }, [])

  return { stats, loading }
}
