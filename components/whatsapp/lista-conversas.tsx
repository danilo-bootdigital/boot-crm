'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { EditarNome } from './editar-nome'

type Conversa = {
  id: string
  nome_contato: string
  telefone: string
  ultima_mensagem: string | null
  ultima_mensagem_em: string | null
  nao_lidas: number
  status: string
}

type Props = {
  conversasIniciais: Conversa[]
  conversaAtivaId?: string
  onNomeEditado?: (conversaId: string, novoNome: string) => void
}

export function ListaConversas({
  conversasIniciais,
  conversaAtivaId,
  onNomeEditado,
}: Props) {
  const [conversasRealtime, setConversasRealtime] = useState<Conversa[]>([])

  const conversas = useMemo(() => {
    const mapa = new Map<string, Conversa>()

    for (const conversa of conversasIniciais) {
      mapa.set(conversa.id, conversa)
    }

    for (const conversa of conversasRealtime) {
      mapa.set(conversa.id, conversa)
    }

    return Array.from(mapa.values()).sort((a, b) => {
      const dataA = a.ultima_mensagem_em
        ? new Date(a.ultima_mensagem_em).getTime()
        : 0

      const dataB = b.ultima_mensagem_em
        ? new Date(b.ultima_mensagem_em).getTime()
        : 0

      return dataB - dataA
    })
  }, [conversasIniciais, conversasRealtime])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('lista-conversas')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        async () => {
          const { data } = await supabase
            .from('conversations')
            .select('id, nome_contato, telefone, ultima_mensagem, ultima_mensagem_em, nao_lidas, status')
            .order('ultima_mensagem_em', { ascending: false })

          if (data) {
            setConversasRealtime(data as Conversa[])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleNomeEditado = (conversaId: string, novoNome: string) => {
    // Atualizar na lista atual
    const index = conversas.findIndex(c => c.id === conversaId)
    if (index !== -1) {
      const atualizadas = [...conversas]
      atualizadas[index] = {
        ...atualizadas[index],
        nome_contato: novoNome
      }
      // Como usamos useMemo, precisamos forçar atualização
      setConversasRealtime(prev => [...prev])
    }

    // Notificar o componente pai
    onNomeEditado?.(conversaId, novoNome)
  }

  return (
    <div className="flex flex-col">
      {conversas.map((conversa) => (
        <Link
          key={conversa.id}
          href={`/whatsapp/${conversa.id}`}
          className={cn(
            'border-b px-4 py-3 transition-colors hover:bg-slate-50 group',
            conversa.id === conversaAtivaId && 'bg-slate-100'
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-medium text-slate-800">
                  {conversa.nome_contato}
                </h3>
                <EditarNome
                  conversaId={conversa.id}
                  nomeAtual={conversa.nome_contato}
                  telefone={conversa.telefone}
                  onEditComplete={(novoNome) => handleNomeEditado(conversa.id, novoNome)}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {conversa.telefone}
              </p>
            </div>

            {conversa.nao_lidas > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-500 px-1 text-[11px] font-bold text-white">
                {conversa.nao_lidas}
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-xs text-slate-500">
            {conversa.ultima_mensagem || 'Sem mensagens'}
          </p>
        </Link>
      ))}
    </div>
  )
}