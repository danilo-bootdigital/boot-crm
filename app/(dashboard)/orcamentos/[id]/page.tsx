import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  // Buscar dados do orçamento passo a passo para depurar
  console.log('Buscando orçamento com ID:', id)

  // Primeiro, verificar se o orçamento existe
  const { data: orcamentoBasico, error: erroBasico } = await supabase
    .from('quotes')
    .select('id, numero, status, organization_id')
    .eq('id', id)
    .single()

  if (erroBasico) {
    console.error('Erro ao buscar orçamento básico:', erroBasico)
    notFound()
  }

  if (!orcamentoBasico) {
    console.log('Orçamento não encontrado com ID:', id)
    notFound()
  }

  console.log('Orçamento encontrado:', orcamentoBasico)

  // Se o básico funcionar, mostrar dados simples primeiro
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/orcamentos">
          <Button variant="ghost" size="sm" className="gap-1 pl-0 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
            Orçamentos
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Orçamento #{orcamentoBasico.numero}</h1>
          <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded">
            {orcamentoBasico.status}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Depuração</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">ID: {orcamentoBasico.id}</p>
          <p className="text-sm text-slate-600">Número: {orcamentoBasico.numero}</p>
          <p className="text-sm text-slate-600">Status: {orcamentoBasico.status}</p>
          <p className="text-sm text-slate-600">Organization ID: {orcamentoBasico.organization_id}</p>
        </CardContent>
      </Card>
    </div>
  )
}