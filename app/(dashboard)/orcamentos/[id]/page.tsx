import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  // Buscar dados do orçamento de forma simples
  const { data: orcamento } = await supabase
    .from('quotes')
    .select('id, numero, status')
    .eq('id', id)
    .single()

  if (!orcamento) {
    notFound()
  }

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
          <h1 className="text-2xl font-bold text-slate-900">Orçamento #{orcamento.numero}</h1>
          <span className="px-2 py-1 bg-slate-100 text-slate-800 text-xs font-medium rounded">
            {orcamento.status}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhes do Orçamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">ID: {orcamento.id}</p>
          <p className="text-sm text-slate-600">Número: {orcamento.numero}</p>
          <p className="text-sm text-slate-600">Status: {orcamento.status}</p>
        </CardContent>
      </Card>
    </div>
  )
}