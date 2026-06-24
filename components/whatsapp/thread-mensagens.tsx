'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Lock } from 'lucide-react'
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

// Fundo sutil estilo WhatsApp (padrão leve sobre off-white)
const PADRAO_FUNDO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill='%23000000' fill-opacity='0.025'%3E%3Ccircle cx='10' cy='10' r='1.5'/%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/svg%3E\")"

// Rótulo do separador de data
function rotuloData(dataIso: string): string {
  const d = new Date(dataIso)
  if (isToday(d)) return 'Hoje'
  if (isYesterday(d)) return 'Ontem'
  return format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function chaveDia(dataIso: string): string {
  return format(new Date(dataIso), 'yyyy-MM-dd')
}

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
    <div
      className="flex flex-1 flex-col overflow-y-auto px-4 py-4 md:px-8"
      style={{ backgroundColor: '#f3f1ec', backgroundImage: PADRAO_FUNDO }}
    >
      {/* Aviso de criptografia */}
      <div className="mb-4 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50/90 px-3 py-1.5 text-center text-[12px] text-amber-700 shadow-sm">
          <Lock className="h-3 w-3 shrink-0" />
          As mensagens são protegidas com criptografia de ponta a ponta.
        </span>
      </div>

      {mensagens.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="rounded-md bg-white/70 px-4 py-2 text-sm text-slate-400 shadow-sm">
            Nenhuma mensagem ainda. Envie a primeira mensagem abaixo.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {mensagens.map((m, i) => {
            const mostrarSeparador =
              i === 0 || chaveDia(m.enviado_em) !== chaveDia(mensagens[i - 1].enviado_em)
            return (
              <div key={m.id} className="flex flex-col gap-1.5">
                {mostrarSeparador && (
                  <div className="my-2 flex justify-center">
                    <span className="rounded-md bg-white/90 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 shadow-sm">
                      {rotuloData(m.enviado_em)}
                    </span>
                  </div>
                )}
                <BalaoMensagem mensagem={m} />
              </div>
            )
          })}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
