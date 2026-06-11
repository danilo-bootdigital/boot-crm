'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null)
  const [finalizando, setFinalizando] = useState(false)

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
            .select('id, telefone_externo, ultima_mensagem_em, status, lead:leads!lead_id(nome), contato:contacts!contato_id(nome)')
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
      const atualizadas = [...conversas]
      atualizadas[index] = {
        ...atualizadas[index],
        nome_contato: novoNome
      }
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
        <div className="p-8 text-center text-muted-foreground">
          Nenhuma conversa encontrada para os filtros selecionados.
        </div>
      ) : (
        conversas.map((conversa) => (
          <div key={conversa.id} className="border-b flex items-center">
            <Link
              href={`/whatsapp/${conversa.id}`}
              className={cn(
                'flex-1 px-4 py-3 transition-colors hover:bg-slate-50',
                conversa.id === conversaAtivaId && 'bg-slate-100'
              )}
            >
              <div className="flex items-center gap-2">
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
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                {conversa.ultima_mensagem_em_formatada || 'Sem mensagens'}
              </p>
            </Link>
            <button
              onClick={(e) => handleFinalizarClick(e, conversa)}
              className="p-3 hover:bg-green-50 text-green-600 transition-colors"
              title="Finalizar atendimento"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        ))
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
              {finalizando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}