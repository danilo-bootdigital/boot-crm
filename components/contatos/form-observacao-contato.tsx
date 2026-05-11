'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { adicionarObservacaoContato } from '@/app/(dashboard)/contatos/actions'

export function FormObservacaoContato({ contatoId }: { contatoId: string }) {
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit() {
    if (!texto.trim()) return
    setCarregando(true)
    try {
      await adicionarObservacaoContato(contatoId, texto.trim())
      setTexto('')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escreva uma observação sobre este contato..."
        rows={3}
      />
      <Button onClick={handleSubmit} disabled={carregando || !texto.trim()} size="sm">
        {carregando ? 'Salvando...' : 'Adicionar'}
      </Button>
    </div>
  )
}
