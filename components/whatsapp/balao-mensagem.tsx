import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type Props = {
  mensagem: {
    id: string
    direcao: 'enviada' | 'recebida'
    conteudo: string | null
    enviado_em: string
    responsavel: { nome: string } | null
  }
}

export function BalaoMensagem({ mensagem }: Props) {
  const enviada = mensagem.direcao === 'enviada'
  const hora = format(new Date(mensagem.enviado_em), 'HH:mm', { locale: ptBR })

  return (
    <div className={cn('flex', enviada ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm',
          enviada ? 'bg-green-100 text-slate-900' : 'bg-white text-slate-900 border border-slate-100'
        )}
      >
        {!enviada && mensagem.responsavel && (
          <p className="mb-1 text-[10px] font-medium text-green-700">{mensagem.responsavel.nome}</p>
        )}
        <p className="whitespace-pre-wrap break-words">{mensagem.conteudo ?? '(mídia)'}</p>
        <p className={cn('mt-1 text-[10px]', enviada ? 'text-right text-green-700' : 'text-slate-400')}>
          {hora}
        </p>
      </div>
    </div>
  )
}
