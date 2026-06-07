'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

export function useUserRole() {
  const [cargo, setCargo] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getCargo() {
      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: perfil } = await supabase
            .from('profiles')
            .select('cargo')
            .eq('id', user.id)
            .single()

          setCargo(perfil?.cargo || null)
        }
      } catch (error) {
        console.error('Erro ao obter cargo do usuário:', error)
      } finally {
        setLoading(false)
      }
    }

    getCargo()
  }, [])

  return { cargo, loading }
}