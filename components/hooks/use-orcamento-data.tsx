'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { redirect, notFound } from 'next/navigation'

export function useOrcamentoData(id: string) {
  const [orcamento, setOrcamento] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        redirect('/login')
        return
      }

      const { data: perfilData } = await supabase
        .from('profiles')
        .select('id, organization_id, cargo')
        .eq('id', user.id)
        .single()

      if (!perfilData) {
        redirect('/login')
        return
      }

      const { data: orcamentoData } = await supabase
        .from('quotes')
        .select(`
          *,
          responsavel:profiles!responsavel_id(nome),
          lead:leads!lead_id(id, nome, telefone, email, endereco, cpf_cnpj),
          deal:deals!deal_id(id, titulo, contato_id),
          aprovador:profiles!aprovacao_interna_por(nome),
          fornecedor:suppliers!supplier_id(nome)
        `)
        .eq('id', id)
        .eq('organization_id', perfilData.organization_id)
        .single()

      if (!orcamentoData) {
        notFound()
      }

      setOrcamento(orcamentoData)
      setPerfil(perfilData)
      setLoading(false)
    }

    loadData()
  }, [id])

  return { orcamento, perfil, loading }
}