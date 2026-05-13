import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageCircle } from 'lucide-react'

type Props = {
  conversaId: string
  leadNome: string | null
  telefone: string
  conteudo: string | null
  enviadoEm: string
}

export function ItemMensagemPendente({ conversaId, leadNome, telefone, conteudo, enviadoEm }: Props) {
  return (
    <Link
      href={`/whatsapp/${conversaId}`}
      className="flex items-start gap-3 rounded-lg border p-3 hover:bg-slate-50 transition-colors"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
        <MessageCircle className="h-4 w-4 text-green-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-900 truncate">
            {leadNome ?? telefone}
          </p>
          <span className="shrink-0 text-xs text-slate-400">
            {formatDistanceToNow(new Date(enviadoEm), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 truncate">
          {conteudo ?? 'Mídia recebida'}
        </p>
      </div>
    </Link>
  )
}
