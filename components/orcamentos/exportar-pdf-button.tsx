'use client'

import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'
import { useState } from 'react'

type Props = {
  orcamentoId: string
  numero: number
}

export function ExportarPdfButton({ orcamentoId, numero }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    if (loading) return

    setLoading(true)
    try {
      const response = await fetch(`/api/orcamentos/${orcamentoId}/pdf`)

      if (!response.ok) {
        const error = await response.text()
        console.error('Erro ao gerar PDF:', error)
        alert('Erro ao gerar PDF. Tente novamente.')
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `orcamento-${numero}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao exportar PDF:', error)
      alert('Erro ao exportar PDF. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 h-9"
      onClick={handleExport}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Exportar PDF</span>
    </Button>
  )
}