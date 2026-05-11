'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BalaoMensagem } from './balao-mensagem'

type Mensagem = {
  id: string
  direcao: 'enviada' | 'recebida'
  conteudo: string | null
  enviado_em: string
  responsavel: { nome: string } | null
}

type Props = {
  mensagensIniciais: Mensagem[]
  conversaId: string
}

export function ThreadMensagens({ mensagensIniciais, conversaId }: Props) {
  const [mensagens, setMensagens] = useState(mensagensIniciais)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`thread-${conversaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversaId}` },
        (payload) => {
          const nova = payload.new as Record<string, unknown>
          setMensagens((prev) => [
            ...prev,
            {
              id: nova.id as string,
              direcao: nova.direcao as 'enviada' | 'recebida',
              conteudo: nova.conteudo as string | null,
              enviado_em: nova.enviado_em as string,
              responsavel: null,
            },
          ])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversaId])

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
      {mensagens.map((m) => (
        <BalaoMensagem key={m.id} mensagem={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
