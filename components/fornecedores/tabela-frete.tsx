'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Truck, Save } from 'lucide-react'
import { salvarFrete } from '@/app/(dashboard)/configuracoes/fornecedores/actions'

const REGIOES = [
  'São Paulo Capital e Região',
  'Interior de São Paulo',
  'Sul',
  'Sudeste',
  'Norte',
  'Centro-Oeste',
]

type FreteItem = {
  regiao: string
  valor: number
}

type Props = {
  fornecedorId: string
  fretes: FreteItem[]
}

export function TabelaFrete({ fornecedorId, fretes }: Props) {
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    REGIOES.forEach((r) => {
      const existente = fretes.find((f) => f.regiao === r)
      map[r] = existente ? existente.valor.toString() : ''
    })
    return map
  })
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSalvar() {
    const dados = REGIOES.map((regiao) => ({
      regiao,
      valor: parseFloat(valores[regiao] || '0') || 0,
    }))

    startTransition(async () => {
      try {
        await salvarFrete(fornecedorId, dados)
        toast.success('Tabela de frete salva.')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar frete.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4" />
          Tabela de Frete
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {REGIOES.map((regiao) => (
            <div key={regiao} className="flex items-center gap-3">
              <span className="text-sm text-slate-700 w-56 shrink-0">{regiao}</span>
              <div className="relative flex-1 max-w-[160px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                <Input
                  className="pl-9 h-9 text-sm"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={valores[regiao]}
                  onChange={(e) => setValores((prev) => ({ ...prev, [regiao]: e.target.value }))}
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSalvar} disabled={isPending} size="sm" className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {isPending ? 'Salvando...' : 'Salvar frete'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
