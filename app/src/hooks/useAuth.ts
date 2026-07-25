import { useState, useEffect, useCallback } from 'react'
import { login as loginApi, getCurrentUser, logout as logoutApi } from '@/services/api'
import type { User, LoginCredentials } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser().then(u => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await loginApi(credentials)
    localStorage.setItem('token', result.token)
    setUser(result.user)
    return result.user
  }, [])

  const logout = useCallback(() => {
    logoutApi()
    setUser(null)
  }, [])

  return { user, role: user?.rol ?? null, loading, login, logout, isAuthenticated: !!user }
}
