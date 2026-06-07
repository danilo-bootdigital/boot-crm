import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { OrcamentoDetalhe } from '@/components/orcamentos/orcamento-detalhe'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Quote } from '@/types/database'

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Buscar dados do orçamento
  const { data: orcamento, error } = await supabase
    .from('quotes')
    .select(`
      *,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(id, nome, telefone, email, endereco, cpf_cnpj),
      contato:contacts!contato_id(id, nome, telefone, email),
      deal:deals!deal_id(id, titulo, contato_id),
      aprovador:profiles!aprovacao_interna_por(nome),
      fornecedor:suppliers!supplier_id(nome),
      itens:quote_items!quote_id(
        id,
        descricao,
        quantidade,
        preco_unitario,
        desconto_item,
        subtotal,
        product_id
      )
    `)
    .eq('id', id)
    .single()

  if (error || !orcamento) {
    notFound()
  }

  // Tela de auditoria para verificar fluxo de renderização
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
          <h1 className="text-2xl font-bold text-slate-900">Auditoria de Renderização</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados Recebidos pelo Componente</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-slate-100 p-3 rounded overflow-auto">
            {JSON.stringify({
              id: orcamento.id,
              numero: orcamento.numero,
              status: orcamento.status,
              itens: orcamento.itens?.length || 0,
              fornecedor: orcamento.fornecedor?.nome || 'NENHUM',
              lead: orcamento.lead?.nome || 'NENHUM',
              contato: orcamento.contato?.nome || 'NENHUM',
              total: orcamento.valor_total
            }, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teste de Renderização do Componente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm"><strong>Importando OrcamentoDetalhe...</strong></p>

            <div className="border border-blue-200 p-3 rounded">
              <p className="text-sm mb-2"><strong>Componente OrcamentoDetalhe:</strong></p>
              <OrcamentoDetalhe orcamento={orcamento} />
            </div>

            <p className="text-xs text-slate-500">
              Se o componente acima não aparecer, há um erro no componente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}