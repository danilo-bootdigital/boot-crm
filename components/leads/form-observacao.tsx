'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { adicionarObservacao } from '@/app/(dashboard)/leads/actions'

export function FormObservacao({ leadId }: { leadId: string }) {
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit() {
    if (!texto.trim()) return
    setCarregando(true)
    try {
      await adicionarObservacao(leadId, texto.trim())
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
        placeholder="Escreva uma observação sobre este lead..."
        rows={3}
      />
      <Button onClick={handleSubmit} disabled={carregando || !texto.trim()} size="sm">
        {carregando ? 'Salvando...' : 'Adicionar'}
      </Button>
    </div>
  )
}
