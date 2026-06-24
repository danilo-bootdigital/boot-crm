'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { iniciais } from '@/lib/telefone'
import { EditarNome } from './editar-nome'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Loader2 } from 'lucide-react'
import { alterarStatusConversa } from '@/app/(dashboard)/whatsapp/actions-conversa'

type Conversa = {
  id: string
  nome_contato: string
  telefone: string
  ultima_mensagem_em: string | null
  ultima_mensagem_em_formatada?: string | null
  ultima_mensagem?: string | null
  nao_lidas?: number
  status: string
}

type Props = {
  conversasIniciais: Conversa[]
  conversaAtivaId?: string
  onNomeEditado?: (conversaId: string, novoNome: string) => void
}

// Bolinha de status do atendimento
const STATUS_DOT: Record<string, string> = {
  nao_atendida: 'bg-red-500',
  em_atendimento: 'bg-blue-500',
  aguardando_cliente: 'bg-amber-500',
  finalizada: 'bg-emerald-500',
}

// Hora curta estilo WhatsApp (HH:mm hoje, "Ontem", ou dd/mm)
function horaCurta(dataIso: string | null): string {
  if (!dataIso) return ''
  const d = new Date(dataIso)
  if (isToday(d)) return format(d, 'HH:mm', { locale: ptBR })
  if (isYesterday(d)) return 'Ontem'
  return format(d, 'dd/MM/yy', { locale: ptBR })
}

export function ListaConversas({
  conversasIniciais,
  conversaAtivaId,
  onNomeEditado,
}: Props) {
  const searchParams = useSearchParams()
  const [conversasRealtime, setConversasRealtime] = useState<Conversa[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [finalizando, setFinalizando] = useState(false)

  // Mantém os demais filtros da URL ao abrir uma conversa (split view inline)
  const hrefConversa = (id: string): string => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('conversaId', id)
    return `/whatsapp?${params.toString()}`
  }

  const conversas = useMemo(() => {
    const mapa = new Map<string, Conversa>()

    for (const conversa of conversasIniciais) {
      mapa.set(conversa.id, conversa)
    }

    for (const conversa of conversasRealtime) {
      // Preserva campos enriquecidos do server (última mensagem, etc.) ao mesclar realtime
      const existente = mapa.get(conversa.id)
      mapa.set(conversa.id, existente ? { ...existente, ...conversa } : conversa)
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
            .select('id, telefone_externo, ultima_mensagem_em, status, nao_lidas, lead:leads!lead_id(nome), contato:contacts!contato_id(nome)')
            .order('ultima_mensagem_em', { ascending: false })

          if (data) {
            const mappedData = data.map((c) => ({
              id: c.id,
              telefone: c.telefone_externo,
              ultima_mensagem_em: c.ultima_mensagem_em,
              ultima_mensagem_em_formatada: c.ultima_mensagem_em
                ? new Date(c.ultima_mensagem_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                : null,
              status: c.status,
              nao_lidas: (c as any).nao_lidas ?? 0,
              nome_contato: (c as any).lead?.nome || (c as any).contato?.nome || `Contato ${c.telefone_externo}` || 'Contato WhatsApp',
            }))
            setConversasRealtime(mappedData as Conversa[])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleNomeEditado = (conversaId: string, novoNome: string) => {
    const index = conversas.findIndex(c => c.id === conversaId)
    if (index !== -1) {
      setConversasRealtime(prev => [...prev])
    }

    onNomeEditado?.(conversaId, novoNome)
  }

  const handleFinalizarClick = (e: React.MouseEvent, conversa: Conversa) => {
    e.preventDefault()
    e.stopPropagation()
    setConversaSelecionada(conversa)
    setDialogOpen(true)
  }

  const handleConfirmarFinalizar = async () => {
    if (!conversaSelecionada) return

    setFinalizando(true)
    try {
      await alterarStatusConversa(conversaSelecionada.id, 'finalizada')
      setDialogOpen(false)
      setConversaSelecionada(null)
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error)
    } finally {
      setFinalizando(false)
    }
  }

  return (
    <div className="flex flex-col">
      {conversas.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-500">Nenhuma conversa encontrada</p>
          <p className="mt-1 text-xs text-slate-400">
            Ajuste a busca ou os filtros para ver outras conversas.
          </p>
        </div>
      ) : (
        conversas.map((conversa) => {
          const ativa = conversa.id === conversaAtivaId
          const naoLidas = conversa.nao_lidas ?? 0
          return (
            <Link
              key={conversa.id}
              href={hrefConversa(conversa.id)}
              className={cn(
                'group relative flex items-center gap-3 border-b border-slate-50 px-3 py-3 transition-colors',
                ativa ? 'bg-emerald-50/70' : 'hover:bg-slate-50',
              )}
            >
              {/* Barra de seleção */}
              {ativa && <span className="absolute inset-y-0 left-0 w-0.5 bg-emerald-500" />}

              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                  {iniciais(conversa.nome_contato)}
                </div>
                <span
                  className={cn(
                    'absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white',
                    STATUS_DOT[conversa.status] ?? 'bg-slate-300',
                  )}
                />
              </div>

              {/* Conteúdo */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1">
                    <h3 className={cn('truncate text-sm', naoLidas > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-800')}>
                      {conversa.nome_contato}
                    </h3>
                    <span className="opacity-0 transition-opacity group-hover:opacity-100">
                      <EditarNome
                        conversaId={conversa.id}
                        nomeAtual={conversa.nome_contato}
                        telefone={conversa.telefone}
                        onEditComplete={(novoNome) => handleNomeEditado(conversa.id, novoNome)}
                      />
                    </span>
                  </div>
                  <span className={cn('shrink-0 text-[11px]', naoLidas > 0 ? 'font-medium text-emerald-600' : 'text-slate-400')}>
                    {horaCurta(conversa.ultima_mensagem_em)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className={cn('truncate text-xs', naoLidas > 0 ? 'text-slate-600' : 'text-slate-400')}>
                    {conversa.ultima_mensagem?.trim() || 'Sem mensagens'}
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {naoLidas > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white">
                        {naoLidas > 99 ? '99+' : naoLidas}
                      </span>
                    )}
                    {conversa.status !== 'finalizada' && (
                      <button
                        onClick={(e) => handleFinalizarClick(e, conversa)}
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium text-emerald-600 opacity-0 transition-opacity hover:bg-emerald-100 group-hover:opacity-100"
                        title="Finalizar atendimento"
                      >
                        Fechar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })
      )}

      {/* Dialog de confirmação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar atendimento?</DialogTitle>
            <DialogDescription>
              A conversa com {conversaSelecionada?.nome_contato} será marcada como finalizada.
              Você ainda poderá visualizar no filtro &quot;Finalizadas&quot;.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={finalizando}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarFinalizar} disabled={finalizando}>
              {finalizando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
