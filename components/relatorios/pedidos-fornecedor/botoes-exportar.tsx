'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, FileText, FileDown } from 'lucide-react'
import { toast } from 'sonner'

type Formato = 'xlsx' | 'csv' | 'pdf'

const CONFIG: { formato: Formato; label: string; icone: typeof FileDown }[] = [
  { formato: 'xlsx', label: 'Excel', icone: FileSpreadsheet },
  { formato: 'csv', label: 'CSV', icone: FileText },
  { formato: 'pdf', label: 'PDF', icone: FileDown },
]

export function BotoesExportarPedidosFornecedor({ queryString }: { queryString: string }) {
  const [exportando, setExportando] = useState<Formato | null>(null)

  async function exportar(formato: Formato) {
    if (exportando) return // bloqueia múltiplas exportações simultâneas
    setExportando(formato)
    try {
      const url = `/relatorios/pedidos-por-fornecedor/exportar?formato=${formato}&${queryString}`
      const res = await fetch(url)
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}))
        throw new Error(msg.error || 'Falha ao exportar')
      }
      const blob = await res.blob()
      const nomeArquivo =
        res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] ??
        `pedidos-por-fornecedor.${formato}`
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = nomeArquivo
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(link.href)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar relatório')
    } finally {
      setExportando(null)
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      {CONFIG.map(({ formato, label, icone: Icone }) => (
        <Button
          key={formato}
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={exportando !== null}
          onClick={() => exportar(formato)}
        >
          <Icone className="h-4 w-4" />
          {exportando === formato ? 'Exportando…' : label}
        </Button>
      ))}
    </div>
  )
}
