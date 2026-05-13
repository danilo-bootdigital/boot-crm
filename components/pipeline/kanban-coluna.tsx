'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanCard, type DealCard } from './kanban-card'

type Etapa = {
  id: string
  nome: string
  cor: string
  tipo_especial: 'fechado' | 'perdido' | null
}

type Props = {
  etapa: Etapa
  deals: DealCard[]
  podeArrastar: boolean
  podeCriar: boolean
  onNovaNegociacao: (estagioId: string) => void
  onDealDoubleClick: (deal: DealCard) => void
}

export function KanbanColuna({ etapa, deals, podeArrastar, podeCriar, onNovaNegociacao, onDealDoubleClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: etapa.id,
    data: { etapa },
  })

  const totalValor = deals.reduce((sum, d) => sum + (d.valor_estimado ?? 0), 0)

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: etapa.cor }}
          />
          <span className="text-sm font-semibold text-slate-800 truncate">{etapa.nome}</span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {deals.length}
          </span>
        </div>
        {podeCriar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onNovaNegociacao(etapa.id)}
            title="Nova negociação"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Total da coluna */}
      {totalValor > 0 && (
        <p className="px-1 text-xs text-slate-400">
          {totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
        </p>
      )}

      {/* Área de drop */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[180px] flex-col gap-2 rounded-xl p-2 transition-colors',
          isOver ? 'bg-slate-200' : 'bg-slate-100',
        )}
      >
        {deals.map((deal) => (
          <KanbanCard key={deal.id} deal={deal} podeArrastar={podeArrastar} onDoubleClick={() => onDealDoubleClick(deal)} />
        ))}

        {deals.length === 0 && (
          <div
            className={cn(
              'flex flex-1 items-center justify-center rounded-lg border-2 border-dashed py-8 text-xs text-slate-400 transition-colors',
              isOver ? 'border-slate-400 text-slate-500' : 'border-slate-300',
            )}
          >
            Solte aqui
          </div>
        )}
      </div>
    </div>
  )
}
