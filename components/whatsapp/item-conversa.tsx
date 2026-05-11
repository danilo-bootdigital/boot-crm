import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type Props = {
  conversa: {
    id: string
    telefone_externo: string
    ultima_mensagem_em: string | null
    lead: { id: string; nome: string | null } | null
    instancia: { nome: string } | null
    ultima_mensagem: string | null
  }
  ativa: boolean
}

export function ItemConversa({ conversa, ativa }: Props) {
  const nome = conversa.lead?.nome ?? conversa.telefone_externo
  const hora = conversa.ultima_mensagem_em
    ? format(new Date(conversa.ultima_mensagem_em), 'HH:mm', { locale: ptBR })
    : ''

  return (
    <Link
      href={`/whatsapp/${conversa.id}`}
      className={cn(
        'flex items-start gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors',
        ativa && 'bg-slate-100'
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 font-semibold text-sm">
        {nome.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-900 truncate">{nome}</p>
          {hora && <span className="text-xs text-slate-400 shrink-0 ml-2">{hora}</span>}
        </div>
        {conversa.ultima_mensagem && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{conversa.ultima_mensagem}</p>
        )}
        {conversa.instancia && (
          <p className="text-[10px] text-slate-400">{conversa.instancia.nome}</p>
        )}
      </div>
    </Link>
  )
}
