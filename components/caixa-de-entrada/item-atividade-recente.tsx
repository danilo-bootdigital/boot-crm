import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Activity } from 'lucide-react'

type Props = {
  id: string
  tipo: string
  descricao: string
  criadoEm: string
  leadId: string | null
  leadNome: string | null
}

const ICONES_COR: Record<string, string> = {
  lead_criado: 'bg-blue-100 text-blue-600',
  deal_ganho: 'bg-green-100 text-green-600',
  deal_perdido: 'bg-red-100 text-red-600',
  responsavel_atribuido_automaticamente: 'bg-purple-100 text-purple-600',
}

export function ItemAtividadeRecente({ id, tipo, descricao, criadoEm, leadId, leadNome }: Props) {
  const cor = ICONES_COR[tipo] ?? 'bg-slate-100 text-slate-600'
  const href = leadId ? `/leads/${leadId}` : '/painel'

  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-lg border p-3 hover:bg-slate-50 transition-colors"
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cor}`}>
        <Activity className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-900 truncate">{descricao}</p>
          <span className="shrink-0 text-xs text-slate-400">
            {formatDistanceToNow(new Date(criadoEm), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        {leadNome && (
          <p className="mt-0.5 text-xs text-slate-500 truncate">{leadNome}</p>
        )}
      </div>
    </Link>
  )
}
