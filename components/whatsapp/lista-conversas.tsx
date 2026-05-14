'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ItemConversa } from './item-conversa'
import { FiltrosConversas } from './filtros-conversas'
import { useParams, useRouter } from 'next/navigation'

type ConversaStatus = 'nao_atendida' | 'em_atendimento' | 'aguardando_cliente' | 'finalizada'
type TagType = { id: string; nome: string; cor: string }
type Usuario = { id: string; nome: string }

type Conversa = {
  id: string
  telefone_externo: string
  ultima_mensagem_em: string | null
  lead: { id: string; nome: string | null } | null
  instancia: { nome: string } | null
  ultima_mensagem: string | null
  status: ConversaStatus
  responsavel_id: string | null
  responsavel_nome: string | null
  tags: TagType[]
}

type Filtros = {
  status: ConversaStatus | null
  responsavelId: string | null
  tagId: string | null
  busca: string
}

type Props = {
  conversasIniciais: Conversa[]
  organizationId: string
  usuarios: Usuario[]
  todasTags: TagType[]
}

export function ListaConversas({ conversasIniciais, organizationId, usuarios, todasTags }: Props) {
  const [conversas, setConversas] = useState(conversasIniciais)
  const [filtros, setFiltros] = useState<Filtros>({ status: null, responsavelId: null, tagId: null, busca: '' })
  const params = useParams()
  const conversaAtivaId = params?.id as string | undefined
  const router = useRouter()

  useEffect(() => {
    setConversas(conversasIniciais)
  }, [conversasIniciais])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('conversations-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `organization_id=eq.${organizationId}`,
      }, () => {
        router.refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [organizationId, router])

  const contadores = useMemo(() => {
    const c: Record<ConversaStatus, number> = { nao_atendida: 0, em_atendimento: 0, aguardando_cliente: 0, finalizada: 0 }
    conversas.forEach((conv) => { c[conv.status]++ })
    return c
  }, [conversas])

  const conversasFiltradas = useMemo(() => {
    return conversas.filter((c) => {
      if (filtros.status && c.status !== filtros.status) return false
      if (filtros.responsavelId && c.responsavel_id !== filtros.responsavelId) return false
      if (filtros.tagId && !c.tags.some((t) => t.id === filtros.tagId)) return false
      if (filtros.busca) {
        const termo = filtros.busca.toLowerCase()
        const nome = c.lead?.nome?.toLowerCase() ?? ''
        const tel = c.telefone_externo.toLowerCase()
        if (!nome.includes(termo) && !tel.includes(termo)) return false
      }
      return true
    })
  }, [conversas, filtros])

  return (
    <div className="flex flex-col h-full">
      <FiltrosConversas
        filtros={filtros}
        onChange={setFiltros}
        usuarios={usuarios}
        tags={todasTags}
        contadores={contadores}
      />
      <div className="flex-1 overflow-y-auto">
        {conversasFiltradas.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">Nenhuma conversa encontrada.</p>
        ) : (
          conversasFiltradas.map((c) => (
            <ItemConversa key={c.id} conversa={c} ativa={c.id === conversaAtivaId} />
          ))
        )}
      </div>
    </div>
  )
}
