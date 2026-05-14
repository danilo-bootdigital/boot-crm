'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import { enviarMensagem } from '@/app/(dashboard)/whatsapp/actions'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { SeletorRespostaRapida } from './seletor-resposta-rapida'

type Props = {
  conversaId: string
  variaveis?: {
    nome?: string
    vendedor?: string
    empresa?: string
    telefone?: string
  }
}

export function FormEnvioMensagem({ conversaId, variaveis = {} }: Props) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  function handleEnviar() {
    if (!texto.trim()) return
    setErro(null)
    startTransition(async () => {
      try {
        await enviarMensagem(conversaId, texto)
        setTexto('')
      } catch (e: unknown) {
        if (isRedirectError(e)) throw e
        setErro(e instanceof Error ? e.message : 'Erro ao enviar mensagem.')
      }
    })
  }

  function handleRespostaRapida(textoModelo: string) {
    setTexto(textoModelo)
  }

  return (
    <div className="border-t bg-white p-3 space-y-2">
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="relative flex items-end gap-2">
        <SeletorRespostaRapida variaveis={variaveis} onSelecionar={handleRespostaRapida} />
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem... (Enter para enviar)"
          rows={2}
          className="resize-none flex-1"
          disabled={isPending}
        />
        <Button
          size="icon"
          onClick={handleEnviar}
          disabled={isPending || !texto.trim()}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
