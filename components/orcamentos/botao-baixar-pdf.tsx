'use client'

// Botão "Baixar PDF" real — usado dentro do preview HTML.
// Faz fetch para /api/orcamentos/{id}/pdf, recebe o blob e dispara download.
// Substitui o BotaoBaixarPdfPlaceholder (PR 1) quando o PR 2 entra em produção.

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  orcamentoId: string
  numero?: number
}

export function BotaoBaixarPdf({ orcamentoId, numero }: Props) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleClick() {
    if (loading) return
    setLoading(true)
    setErro(null)
    try {
      const res = await fetch(`/api/orcamentos/${orcamentoId}/pdf`, {
        method: 'GET',
        credentials: 'include',
      })
      if (!res.ok) {
        const txt = await res.text()
        setErro(`Erro ${res.status}: ${txt.slice(0, 120)}`)
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orcamento-${numero ?? orcamentoId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'erro desconhecido'
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="gap-2 bg-emerald-700 hover:bg-emerald-800"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {loading ? 'Gerando PDF…' : 'Baixar PDF'}
      </Button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  )
}
