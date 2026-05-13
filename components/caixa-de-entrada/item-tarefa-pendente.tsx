import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckSquare, AlertTriangle } from 'lucide-react'

type Props = {
  id: string
  titulo: string
  dataVencimento: string | null
  responsavelNome: string | null
  leadNome: string | null
  leadId: string | null
}

export function ItemTarefaPendente({ id, titulo, dataVencimento, responsavelNome, leadNome, leadId }: Props) {
  const vencida = dataVencimento ? new Date(dataVencimento) < new Date() : false

  return (
    <Link
      href={leadId ? `/leads/${leadId}` : '/tarefas'}
      className="flex items-start gap-3 rounded-lg border p-3 hover:bg-slate-50 transition-colors"
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${vencida ? 'bg-red-100' : 'bg-amber-100'}`}>
        {vencida ? (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        ) : (
          <CheckSquare className="h-4 w-4 text-amber-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-900 truncate">{titulo}</p>
          {dataVencimento && (
            <span className={`shrink-0 text-xs ${vencida ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
              {vencida ? 'Vencida ' : ''}
              {formatDistanceToNow(new Date(dataVencimento), { addSuffix: true, locale: ptBR })}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500 truncate">
          {[responsavelNome, leadNome].filter(Boolean).join(' · ') || 'Sem vínculo'}
        </p>
      </div>
    </Link>
  )
}
