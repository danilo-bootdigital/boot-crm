import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { FormOrcamento } from '@/components/orcamentos/form-orcamento'
import type { QuoteItem } from '@/types/database'

export default async function EditarOrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: orcamento } = await supabase
    .from('quotes')
    .select('id, lead_id, deal_id, supplier_id, contato_id, frete, endereco_entrega, forma_pagamento, observacoes, desconto_geral, status, responsavel_id')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!orcamento) notFound()

  if (orcamento.status !== 'rascunho' && orcamento.status !== 'rejeitado_internamente') {
    redirect(`/orcamentos/${id}`)
  }
  if (perfil.cargo === 'vendedor' && orcamento.responsavel_id !== perfil.id) {
    redirect(`/orcamentos/${id}`)
  }
  if (perfil.cargo === 'atendimento') redirect(`/orcamentos/${id}`)

  const { data: itens } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('id') as { data: QuoteItem[] | null }

  const { data: produtos } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .eq('ativo', true)
    .order('nome')

  const { data: fornecedores } = await supabase
    .from('suppliers')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: categorias } = await supabase
    .from('supplier_categories')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const { data: deals } = await supabase
    .from('deals')
    .select('id, titulo')
    .eq('organization_id', perfil.organization_id)
    .is('ganho', null)
    .order('titulo')

  const { data: contatos } = await supabase
    .from('contacts')
    .select('id, nome, telefone, email, cpf_cnpj, endereco')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Editar Orçamento #{orcamento.id.slice(0, 8)}</h1>
      <FormOrcamento
        produtos={produtos ?? []}
        fornecedores={fornecedores ?? []}
        categorias={categorias ?? []}
        deals={(deals ?? []) as { id: string; titulo: string }[]}
        contatos={(contatos ?? []) as { id: string; nome: string; telefone: string | null; email: string | null; cpf_cnpj: string | null; endereco: string | null }[]}
        orcamentoId={id}
        defaultValues={{
          lead_id: orcamento.lead_id,
          deal_id: orcamento.deal_id,
          supplier_id: orcamento.supplier_id,
          contato_id: orcamento.contato_id ?? null,
          observacoes: orcamento.observacoes,
          endereco_entrega: orcamento.endereco_entrega ?? null,
          forma_pagamento: orcamento.forma_pagamento ?? null,
          desconto_geral: orcamento.desconto_geral,
          frete: orcamento.frete ?? 0,
          itens: (itens ?? []).map((item) => ({
            product_id: item.product_id,
            descricao: item.descricao,
            unidade: item.unidade ?? 'un',
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            desconto_item: item.desconto_item,
          })),
        }}
      />
    </div>
  )
}
