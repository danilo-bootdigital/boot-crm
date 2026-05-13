'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { QuoteStatus } from '@/types/database'

async function getUsuarioEOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  return { supabase, perfil }
}

type ItemInput = {
  product_id: string | null
  descricao: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
}

function calcularTotais(itens: ItemInput[], descontoGeral: number) {
  const subtotais = itens.map((item) => {
    const sub = item.quantidade * item.preco_unitario * (1 - item.desconto_item / 100)
    return Math.round(sub * 100) / 100
  })
  const valorSubtotal = subtotais.reduce((acc, s) => acc + s, 0)
  const valorTotal = Math.round(valorSubtotal * (1 - descontoGeral / 100) * 100) / 100
  return { subtotais, valorSubtotal, valorTotal }
}

function validarItensEDesconto(itens: ItemInput[], descontoGeral: number) {
  if (descontoGeral < 0 || descontoGeral > 100) {
    throw new Error('Desconto geral deve estar entre 0 e 100%.')
  }
  for (const item of itens) {
    if (item.quantidade <= 0) throw new Error('Quantidade deve ser maior que zero.')
    if (item.preco_unitario < 0) throw new Error('Preço unitário não pode ser negativo.')
    if (item.desconto_item < 0 || item.desconto_item > 100) {
      throw new Error('Desconto do item deve estar entre 0 e 100%.')
    }
    if (!item.descricao?.trim()) throw new Error('Todos os itens precisam de uma descrição.')
  }
}

export async function criarOrcamento(dados: {
  lead_id: string | null
  deal_id: string | null
  supplier_id: string | null
  observacoes: string | null
  desconto_geral: number
  itens: ItemInput[]
}) {
  const { supabase, perfil } = await getUsuarioEOrg()

  if (dados.itens.length === 0) throw new Error('Adicione ao menos um item.')
  validarItensEDesconto(dados.itens, dados.desconto_geral)

  const { subtotais, valorSubtotal, valorTotal } = calcularTotais(dados.itens, dados.desconto_geral)

  const { data: orcamento, error } = await supabase
    .from('quotes')
    .insert({
      organization_id: perfil.organization_id,
      responsavel_id: perfil.id,
      lead_id: dados.lead_id || null,
      deal_id: dados.deal_id || null,
      supplier_id: dados.supplier_id || null,
      observacoes: dados.observacoes || null,
      desconto_geral: dados.desconto_geral,
      valor_subtotal: valorSubtotal,
      valor_total: valorTotal,
      status: 'rascunho' as QuoteStatus,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar orçamento: ${error.message}`)

  const itensParaInserir = dados.itens.map((item, i) => ({
    quote_id: orcamento.id,
    product_id: item.product_id || null,
    descricao: item.descricao,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    desconto_item: item.desconto_item,
    subtotal: subtotais[i],
  }))

  const { error: errItens } = await supabase.from('quote_items').insert(itensParaInserir)
  if (errItens) throw new Error(`Erro ao inserir itens: ${errItens.message}`)

  revalidatePath('/orcamentos')
  redirect(`/orcamentos/${orcamento.id}`)
}

export async function editarOrcamento(orcamentoId: string, dados: {
  lead_id?: string | null
  deal_id?: string | null
  supplier_id?: string | null
  observacoes: string | null
  desconto_geral: number
  itens: ItemInput[]
}) {
  const { supabase, perfil } = await getUsuarioEOrg()

  if (dados.itens.length === 0) throw new Error('Adicione ao menos um item.')
  validarItensEDesconto(dados.itens, dados.desconto_geral)

  const { data: orcamento } = await supabase
    .from('quotes')
    .select('id, status, responsavel_id')
    .eq('id', orcamentoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!orcamento) throw new Error('Orçamento não encontrado.')
  if (orcamento.status !== 'rascunho' && orcamento.status !== 'rejeitado_internamente') {
    throw new Error('Apenas orçamentos em rascunho ou rejeitados podem ser editados.')
  }
  if (perfil.cargo === 'vendedor' && orcamento.responsavel_id !== perfil.id) {
    throw new Error('Você só pode editar seus próprios orçamentos.')
  }

  const { subtotais, valorSubtotal, valorTotal } = calcularTotais(dados.itens, dados.desconto_geral)

  await supabase
    .from('quotes')
    .update({
      lead_id: dados.lead_id ?? null,
      deal_id: dados.deal_id ?? null,
      supplier_id: dados.supplier_id ?? null,
      observacoes: dados.observacoes || null,
      desconto_geral: dados.desconto_geral,
      valor_subtotal: valorSubtotal,
      valor_total: valorTotal,
      status: 'rascunho' as QuoteStatus,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', orcamentoId)
    .eq('organization_id', perfil.organization_id)

  await supabase.from('quote_items').delete().eq('quote_id', orcamentoId)

  const itensParaInserir = dados.itens.map((item, i) => ({
    quote_id: orcamentoId,
    product_id: item.product_id || null,
    descricao: item.descricao,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    desconto_item: item.desconto_item,
    subtotal: subtotais[i],
  }))

  const { error: errItens } = await supabase.from('quote_items').insert(itensParaInserir)
  if (errItens) throw new Error(`Erro ao atualizar itens: ${errItens.message}`)

  revalidatePath('/orcamentos')
  revalidatePath(`/orcamentos/${orcamentoId}`)
}

export async function excluirOrcamento(orcamentoId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  if (perfil.cargo === 'atendimento') {
    throw new Error('Você não tem permissão para excluir orçamentos.')
  }

  // Vendedor só pode excluir os próprios
  const { data: orcamento } = await supabase
    .from('quotes')
    .select('id, responsavel_id')
    .eq('id', orcamentoId)
    .eq('organization_id', perfil.organization_id)
    .in('status', ['rascunho', 'rejeitado_internamente'])
    .single()

  if (!orcamento) throw new Error('Orçamento não encontrado ou não pode ser excluído.')
  if (perfil.cargo === 'vendedor' && orcamento.responsavel_id !== perfil.id) {
    throw new Error('Você só pode excluir seus próprios orçamentos.')
  }

  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', orcamentoId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir: ${error.message}`)
  revalidatePath('/orcamentos')
  redirect('/orcamentos')
}

async function alterarStatus(orcamentoId: string, novoStatus: QuoteStatus, statusPermitidos: QuoteStatus[], extras?: Record<string, unknown>) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: orcamento } = await supabase
    .from('quotes')
    .select('id, status')
    .eq('id', orcamentoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!orcamento) throw new Error('Orçamento não encontrado.')
  if (!statusPermitidos.includes(orcamento.status as QuoteStatus)) {
    throw new Error(`Não é possível alterar o status de "${orcamento.status}" para "${novoStatus}".`)
  }

  const { error } = await supabase
    .from('quotes')
    .update({ status: novoStatus, atualizado_em: new Date().toISOString(), ...extras })
    .eq('id', orcamentoId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao alterar status: ${error.message}`)
  revalidatePath('/orcamentos')
  revalidatePath(`/orcamentos/${orcamentoId}`)
}

export async function enviarParaAprovacao(orcamentoId: string) {
  await alterarStatus(orcamentoId, 'aguardando_aprovacao_interna', ['rascunho', 'rejeitado_internamente'])
}

export async function aprovarInterno(orcamentoId: string, comentario?: string) {
  const { perfil } = await getUsuarioEOrg()
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') {
    throw new Error('Apenas administradores e gestores podem aprovar.')
  }
  await alterarStatus(orcamentoId, 'aprovado_internamente', ['aguardando_aprovacao_interna'], {
    aprovacao_interna_por: perfil.id,
    aprovacao_interna_em: new Date().toISOString(),
    aprovacao_interna_comentario: comentario || null,
  })
}

export async function rejeitarInterno(orcamentoId: string, comentario: string) {
  const { perfil } = await getUsuarioEOrg()
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') {
    throw new Error('Apenas administradores e gestores podem rejeitar.')
  }
  if (!comentario?.trim()) throw new Error('Informe o motivo da rejeição.')
  await alterarStatus(orcamentoId, 'rejeitado_internamente', ['aguardando_aprovacao_interna'], {
    aprovacao_interna_por: perfil.id,
    aprovacao_interna_em: new Date().toISOString(),
    aprovacao_interna_comentario: comentario,
  })
}

export async function enviarAoCliente(orcamentoId: string) {
  await alterarStatus(orcamentoId, 'enviado_ao_cliente', ['aprovado_internamente'])
}

export async function marcarAprovadoCliente(orcamentoId: string) {
  await alterarStatus(orcamentoId, 'aprovado_pelo_cliente', ['enviado_ao_cliente'])
}

export async function marcarRecusadoCliente(orcamentoId: string) {
  await alterarStatus(orcamentoId, 'recusado_pelo_cliente', ['enviado_ao_cliente'])
}
