'use client'

import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, DollarSign } from 'lucide-react'

export type DealCard = {
  id: string
  titulo: string
  valor_estimado: number | null
  ganho: boolean | null
  motivo_perda: string | null
  data_fechamento_prevista: string | null
  estagio_id: string
  contato: { id: string; nome: string } | null
  responsavel: { id: string; nome: string } | null
}

type Props = {
  deal: DealCard
  podeArrastar: boolean
}

export function KanbanCard({ deal, podeArrastar }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
    disabled: !podeArrastar,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'rounded-lg border bg-white p-3 shadow-sm transition-shadow select-none',
        podeArrastar && 'cursor-grab active:cursor-grabbing hover:shadow-md',
        isDragging && 'opacity-40',
      )}
    >
      <p className="text-sm font-medium text-slate-900 line-clamp-2">{deal.titulo}</p>

      {deal.contato && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{deal.contato.nome}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {deal.valor_estimado !== null && deal.valor_estimado > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
            <DollarSign className="h-3 w-3 shrink-0" />
            {deal.valor_estimado.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            })}
          </span>
        )}
        {deal.data_fechamento_prevista && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3 shrink-0" />
            {format(new Date(deal.data_fechamento_prevista + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
          </span>
        )}
      </div>

      {deal.responsavel && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
            {deal.responsavel.nome.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-slate-500 truncate">
            {deal.responsavel.nome.split(' ')[0]}
          </span>
        </div>
      )}
    </div>
  )
}
