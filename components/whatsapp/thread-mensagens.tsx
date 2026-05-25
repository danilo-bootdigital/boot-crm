'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BalaoMensagem } from './balao-mensagem'

type Mensagem = {
  id: string
  direcao: 'enviada' | 'recebida'
  conteudo: string | null
  tipo_midia: string
  url_midia: string | null
  enviado_em: string
  responsavel: { nome: string } | null
}

type Props = {
  mensagensIniciais: Mensagem[]
  conversaId: string
}

type MensagensPorConversa = Record<string, Mensagem[]>

export function ThreadMensagens({ mensagensIniciais, conversaId }: Props) {
  const [mensagensRealtime, setMensagensRealtime] = useState<MensagensPorConversa>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  const mensagensNovas = mensagensRealtime[conversaId] ?? []

  const mensagens = useMemo(() => {
    const idsIniciais = new Set(mensagensIniciais.map((m) => m.id))
    const novasSemDuplicar = mensagensNovas.filter((m) => !idsIniciais.has(m.id))

    return [...mensagensIniciais, ...novasSemDuplicar]
  }, [mensagensIniciais, mensagensNovas])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`thread-${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversaId}`,
        },
        (payload) => {
          const nova = payload.new as Record<string, unknown>

          const mensagem: Mensagem = {
            id: nova.id as string,
            direcao: nova.direcao as 'enviada' | 'recebida',
            conteudo: nova.conteudo as string | null,
            tipo_midia: (nova.tipo_midia as string) ?? 'texto',
            url_midia: (nova.url_midia as string) ?? null,
            enviado_em: nova.enviado_em as string,
            responsavel: null,
          }

          setMensagensRealtime((prev) => {
            const mensagensDaConversa = prev[conversaId] ?? []

            const jaExiste =
              mensagensIniciais.some((m) => m.id === mensagem.id) ||
              mensagensDaConversa.some((m) => m.id === mensagem.id)

            if (jaExiste) return prev

            return {
              ...prev,
              [conversaId]: [...mensagensDaConversa, mensagem],
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversaId, mensagensIniciais])

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
      {mensagens.map((m) => (
        <BalaoMensagem key={m.id} mensagem={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}