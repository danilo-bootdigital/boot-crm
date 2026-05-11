'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ItemConversa } from './item-conversa'
import { useParams } from 'next/navigation'

type Conversa = {
  id: string
  telefone_externo: string
  ultima_mensagem_em: string | null
  lead: { id: string; nome: string | null } | null
  instancia: { nome: string } | null
  ultima_mensagem: string | null
}

type Props = { conversasIniciais: Conversa[] }

export function ListaConversas({ conversasIniciais }: Props) {
  const [conversas, setConversas] = useState(conversasIniciais)
  const params = useParams()
  const conversaAtivaId = params?.id as string | undefined

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel('conversations-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        // Realtime notifies of changes; full refresh is handled by the parent route revalidation
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex flex-col">
      {conversas.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-400">Nenhuma conversa ainda.</p>
      ) : (
        conversas.map((c) => (
          <ItemConversa key={c.id} conversa={c} ativa={c.id === conversaAtivaId} />
        ))
      )}
    </div>
  )
}
