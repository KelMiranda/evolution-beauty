import { useState, useEffect, useCallback } from 'react'
import { getRegistros, deleteRegistro, createRegistro } from '@/services/api'
import type { Registro } from '@/types'

export function useRegistros(params?: {
  search?: string
  departamento?: string
  funcion?: string
  estado?: string
  page?: number
  limit?: number
}) {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getRegistros(params)
      setRegistros(result.data)
      setTotal(result.total)
    } finally {
      setLoading(false)
    }
  }, [params?.search, params?.departamento, params?.funcion, params?.estado, params?.page, params?.limit])

  useEffect(() => {
    fetch()
  }, [fetch])

  const remove = useCallback(async (id: string) => {
    await deleteRegistro(id)
    await fetch()
  }, [fetch])

  const create = useCallback(async (data: Omit<Registro, 'id' | 'codigo' | 'fechaRegistro' | 'estado'>) => {
    const newReg = await createRegistro(data)
    await fetch()
    return newReg
  }, [fetch])

  return { registros, total, loading, refetch: fetch, remove, create }
}
