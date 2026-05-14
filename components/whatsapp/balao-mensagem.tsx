import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { FileText, Download } from 'lucide-react'

type Props = {
  mensagem: {
    id: string
    direcao: 'enviada' | 'recebida'
    conteudo: string | null
    tipo_midia: string
    url_midia: string | null
    enviado_em: string
    responsavel: { nome: string } | null
  }
}

function ConteudoMidia({ tipo, url, conteudo }: { tipo: string; url: string | null; conteudo: string | null }) {
  if (tipo === 'imagem' && url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt="Imagem"
          className="max-w-[280px] rounded-md cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy"
        />
        {conteudo && conteudo !== '[Imagem]' && (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{conteudo}</p>
        )}
      </a>
    )
  }

  if (tipo === 'audio' && url) {
    return (
      <audio controls className="max-w-[260px] w-full" preload="metadata">
        <source src={url} />
        Seu navegador não suporta áudio.
      </audio>
    )
  }

  if (tipo === 'documento' && url) {
    const fileName = url.split('/').pop() || 'documento'
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 px-3 py-2 hover:bg-slate-100 transition-colors"
      >
        <FileText className="h-8 w-8 text-red-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-700 truncate">{fileName}</p>
          <p className="text-[11px] text-slate-400">Documento</p>
        </div>
        <Download className="h-4 w-4 text-slate-400 shrink-0" />
      </a>
    )
  }

  return <p className="whitespace-pre-wrap break-words">{conteudo ?? '(mídia)'}</p>
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
          <p className="mb-1 text-[12px] font-medium text-green-700">{mensagem.responsavel.nome}</p>
        )}
        <ConteudoMidia tipo={mensagem.tipo_midia} url={mensagem.url_midia} conteudo={mensagem.conteudo} />
        <p className={cn('mt-1 text-[12px]', enviada ? 'text-right text-green-700' : 'text-slate-400')}>
          {hora}
        </p>
      </div>
    </div>
  )
}
