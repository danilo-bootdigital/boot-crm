import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { OrcamentoDetalhe } from '@/components/orcamentos/orcamento-detalhe'
import { BadgeStatusOrcamento } from '@/components/orcamentos/badge-status-orcamento'
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
      carrier:carriers!carrier_id(nome),
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
          <BadgeStatusOrcamento status={orcamento.status} />
        </div>
      </div>

      <OrcamentoDetalhe orcamento={orcamento} />
    </div>
  )
}