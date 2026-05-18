'use client'

import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, DollarSign, Phone, MessageSquare, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { BadgeOrigem } from '@/components/leads/badge-origem'

export type DealCard = {
  id: string
  titulo: string
  valor_estimado: number | null
  ganho: boolean | null
  motivo_perda: string | null
  data_fechamento_prevista: string | null
  atualizado_em: string
  estagio_id: string
  contato: { id: string; nome: string } | null
  responsavel: { id: string; nome: string } | null
  lead: {
    id: string
    nome: string | null
    telefone: string | null
    foto_perfil_url: string | null
    origem: string
    status: string
  } | null
  ultima_mensagem: string | null
  ultima_mensagem_em: string | null
  status_conversa: string | null
  conversa_id: string | null
  tags: { id: string; nome: string; cor: string }[]
}

type Props = {
  deal: DealCard
  podeArrastar: boolean
  onDoubleClick?: () => void
}

export function KanbanCard({ deal, podeArrastar, onDoubleClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
    disabled: !podeArrastar,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  const nomeExibido = deal.lead?.nome || deal.contato?.nome || deal.titulo
  const telefone = deal.lead?.telefone
  const fotoUrl = deal.lead?.foto_perfil_url

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={onDoubleClick}
      className={cn(
        'rounded-lg border bg-white p-3 shadow-sm transition-shadow select-none',
        podeArrastar && 'cursor-grab active:cursor-grabbing hover:shadow-md',
        isDragging && 'opacity-40',
      )}
    >
      {/* Header: foto + nome */}
      <div className="flex items-start gap-2">
        {fotoUrl ? (
          <img
            src={fotoUrl}
            alt=""
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            {nomeExibido.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 truncate">{nomeExibido}</p>
          {telefone && (
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Phone className="h-3 w-3 shrink-0" />
              {telefone}
            </p>
          )}
        </div>
      </div>

      {/* Última mensagem */}
      {deal.ultima_mensagem && (
        <div className="mt-2 flex items-start gap-1.5">
          <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
          <p className="text-xs text-slate-500 line-clamp-2">{deal.ultima_mensagem}</p>
        </div>
      )}

      {/* Metadados */}
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
        {deal.ultima_mensagem_em && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3 shrink-0" />
            {formatDistanceToNow(new Date(deal.ultima_mensagem_em), { addSuffix: true, locale: ptBR })}
          </span>
        )}
        {!deal.ultima_mensagem_em && deal.data_fechamento_prevista && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3 shrink-0" />
            {format(new Date(deal.data_fechamento_prevista + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
          </span>
        )}
      </div>

      {/* Origem do lead */}
      {deal.lead && (
        <div className="mt-2">
          <BadgeOrigem origem={deal.lead.origem as any} />
        </div>
      )}

      {/* Tags */}
      {deal.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {deal.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full px-2 py-0.5 text-[12px] font-medium text-white"
              style={{ backgroundColor: tag.cor }}
            >
              {tag.nome}
            </span>
          ))}
        </div>
      )}

      {/* Responsável */}
      {deal.responsavel && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[12px] font-semibold text-slate-600">
            {deal.responsavel.nome.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-slate-500 truncate">
            {deal.responsavel.nome.split(' ')[0]}
          </span>
        </div>
      )}

      {/* Status do atendimento */}
      {deal.status_conversa && (
        <div className="mt-2">
          <StatusBadge status={deal.status_conversa} />
        </div>
      )}

      {/* Botão WhatsApp */}
      {deal.conversa_id && (
        <div className="mt-2">
          <Link
            href={`/whatsapp/${deal.conversa_id}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </Link>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    nao_atendida: { label: 'Não atendida', className: 'bg-red-100 text-red-700' },
    em_atendimento: { label: 'Em atendimento', className: 'bg-blue-100 text-blue-700' },
    aguardando_cliente: { label: 'Aguardando cliente', className: 'bg-yellow-100 text-yellow-700' },
    finalizada: { label: 'Finalizada', className: 'bg-green-100 text-green-700' },
  }
  const c = config[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-medium', c.className)}>
      {c.label}
    </span>
  )
}
