'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Paperclip, X, FileText, Image, Mic } from 'lucide-react'
import { enviarMensagem, enviarMidia } from '@/app/(dashboard)/whatsapp/actions'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { SeletorRespostaRapida } from './seletor-resposta-rapida'
import { toast } from 'sonner'

type Props = {
  conversaId: string
  variaveis?: {
    nome?: string
    vendedor?: string
    empresa?: string
    telefone?: string
  }
}

function IconeArquivo({ tipo }: { tipo: string }) {
  if (tipo.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />
  if (tipo.startsWith('audio/')) return <Mic className="h-5 w-5 text-purple-500" />
  return <FileText className="h-5 w-5 text-red-500" />
}

export function FormEnvioMensagem({ conversaId, variaveis = {} }: Props) {
  const [texto, setTexto] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  function handleEnviar() {
    if (!texto.trim() && !arquivo) return
    setErro(null)
    startTransition(async () => {
      try {
        if (arquivo) {
          const formData = new FormData()
          formData.set('file', arquivo)
          if (texto.trim()) formData.set('caption', texto.trim())
          await enviarMidia(conversaId, formData)
          setArquivo(null)
          setTexto('')
          toast.success('Arquivo enviado.')
        } else {
          await enviarMensagem(conversaId, texto)
          setTexto('')
        }
      } catch (e: unknown) {
        if (isRedirectError(e)) throw e
        const msg = e instanceof Error ? e.message : 'Erro ao enviar.'
        setErro(msg)
        toast.error(msg)
      }
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 16 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máximo 16MB).')
      return
    }
    setArquivo(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleRespostaRapida(textoModelo: string) {
    setTexto(textoModelo)
  }

  return (
    <div className="border-t bg-white p-3 space-y-2">
      {erro && <p className="text-xs text-red-600">{erro}</p>}

      {arquivo && (
        <div className="flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
          <IconeArquivo tipo={arquivo.type} />
          <span className="flex-1 text-xs text-slate-700 truncate">{arquivo.name}</span>
          <span className="text-[11px] text-slate-400">{(arquivo.size / 1024).toFixed(0)} KB</span>
          <button onClick={() => setArquivo(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative flex items-end gap-2">
        <SeletorRespostaRapida variaveis={variaveis} onSelecionar={handleRespostaRapida} />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          title="Anexar arquivo"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={handleFileChange}
          className="hidden"
        />

        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={arquivo ? 'Legenda (opcional)...' : 'Digite uma mensagem... (Enter para enviar)'}
          rows={2}
          className="resize-none flex-1"
          disabled={isPending}
        />
        <Button
          size="icon"
          onClick={handleEnviar}
          disabled={isPending || (!texto.trim() && !arquivo)}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
