'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { formatarMoeda } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, DollarSign, User, Contact, Plus, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { adicionarObservacaoDeal } from '@/app/(dashboard)/pipeline/actions'
import type { DealCard } from './kanban-card'

type Observacao = {
  id: string
  descricao: string
  criado_em: string
  autor: { nome: string } | null
}

type Props = {
  deal: DealCard | null
  aberto: boolean
  onFechar: () => void
}

export function ModalDetalheDeal({ deal, aberto, onFechar }: Props) {
  const [observacoes, setObservacoes] = useState<Observacao[]>([])
  const [mostrarForm, setMostrarForm] = useState(false)
  const [texto, setTexto] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (!deal || !aberto) {
      setObservacoes([])
      setMostrarForm(false)
      setTexto('')
      return
    }

    const supabase = createClient()
    supabase
      .from('activities')
      .select('id, descricao, criado_em, autor:profiles!autor_id(nome)')
      .eq('deal_id', deal.id)
      .eq('tipo', 'observacao')
      .order('criado_em', { ascending: false })
      .then(({ data }) => {
        setObservacoes((data ?? []) as unknown as Observacao[])
      })
  }, [deal, aberto])

  function handleAdicionar() {
    if (!deal || !texto.trim()) return

    startTransition(async () => {
      try {
        await adicionarObservacaoDeal(deal.id, texto.trim())
        toast.success('Observação adicionada.')
        setTexto('')
        setMostrarForm(false)

        // Recarregar observações
        const supabase = createClient()
        const { data } = await supabase
          .from('activities')
          .select('id, descricao, criado_em, autor:profiles!autor_id(nome)')
          .eq('deal_id', deal.id)
          .eq('tipo', 'observacao')
          .order('criado_em', { ascending: false })
        setObservacoes((data ?? []) as unknown as Observacao[])
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao adicionar.')
      }
    })
  }

  if (!deal) return null

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deal.titulo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            {deal.valor_estimado !== null && deal.valor_estimado > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium">{formatarMoeda(deal.valor_estimado)}</span>
              </div>
            )}

            {deal.contato && (
              <div className="flex items-center gap-2">
                <Contact className="h-4 w-4 text-slate-400" />
                <span className="text-sm">{deal.contato.nome}</span>
              </div>
            )}

            {deal.responsavel && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-sm">{deal.responsavel.nome}</span>
              </div>
            )}

            {deal.data_fechamento_prevista && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm">
                  {format(new Date(deal.data_fechamento_prevista + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>

          {deal.ganho === true && (
            <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              Negociação ganha
            </div>
          )}

          {deal.ganho === false && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <p className="font-medium">Negociação perdida</p>
              {deal.motivo_perda && <p className="mt-1 text-xs">{deal.motivo_perda}</p>}
            </div>
          )}

          {/* Observações */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Observações
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 h-7"
                onClick={() => setMostrarForm(!mostrarForm)}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>

            {mostrarForm && (
              <div className="mb-3 space-y-2">
                <Textarea
                  placeholder="Digite a observação..."
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setMostrarForm(false); setTexto('') }}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleAdicionar} disabled={isPending || !texto.trim()}>
                    {isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            )}

            {observacoes.length === 0 && !mostrarForm && (
              <p className="text-xs text-slate-400">Nenhuma observação registrada.</p>
            )}

            <div className="space-y-3 max-h-48 overflow-y-auto">
              {observacoes.map((obs) => {
                const autor = Array.isArray(obs.autor) ? obs.autor[0] : obs.autor
                return (
                  <div key={obs.id} className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-sm text-slate-700">{obs.descricao}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {autor?.nome ?? 'Sistema'} — {format(new Date(obs.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
