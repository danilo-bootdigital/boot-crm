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

function calcularTotais(itens: ItemInput[], descontoGeral: number, frete: number = 0) {
  const subtotais = itens.map((item) => {
    const sub = item.quantidade * item.preco_unitario * (1 - item.desconto_item / 100)
    return Math.round(sub * 100) / 100
  })
  const valorSubtotal = subtotais.reduce((acc, s) => acc + s, 0)
  const valorTotal = Math.round((valorSubtotal * (1 - descontoGeral / 100) + frete) * 100) / 100
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

async function validarFornecedorItens(
  supabase: Awaited<ReturnType<typeof createClient>>,
  supplierId: string,
  itens: ItemInput[]
) {
  const productIds = itens
    .map((i) => i.product_id)
    .filter((id): id is string => id !== null)

  if (productIds.length === 0) return

  const { data: products, error } = await supabase
    .from('products')
    .select('id, supplier_id')
    .in('id', productIds)

  if (error) throw new Error('Erro ao validar produtos do fornecedor.')

  const invalidos = products?.filter((p) => p.supplier_id !== supplierId)
  if (invalidos && invalidos.length > 0) {
    throw new Error('Um ou mais produtos não pertencem ao fornecedor selecionado. Não é permitido misturar fornecedores em um orçamento.')
  }
}

export async function criarOrcamento(dados: {
  lead_id: string | null
  deal_id: string | null
  supplier_id: string
  contato_id: string | null
  observacoes: string | null
  endereco_entrega: string | null
  forma_pagamento: string | null
  desconto_geral: number
  frete: number
  carrier_id: string | null
  frete_regiao: string | null
  itens: ItemInput[]
}) {
  const { supabase, perfil } = await getUsuarioEOrg()

  if (!dados.supplier_id) throw new Error('Fornecedor é obrigatório.')
  if (dados.itens.length === 0) throw new Error('Adicione ao menos um item.')
  validarItensEDesconto(dados.itens, dados.desconto_geral)
  await validarFornecedorItens(supabase, dados.supplier_id, dados.itens)

  const { subtotais, valorSubtotal, valorTotal } = calcularTotais(dados.itens, dados.desconto_geral, dados.frete)

  const { data: orcamento, error } = await supabase
    .from('quotes')
    .insert({
      organization_id: perfil.organization_id,
      responsavel_id: perfil.id,
      lead_id: dados.lead_id || null,
      deal_id: dados.deal_id || null,
      supplier_id: dados.supplier_id,
      contato_id: dados.contato_id || null,
      observacoes: dados.observacoes || null,
      endereco_entrega: dados.endereco_entrega || null,
      forma_pagamento: dados.forma_pagamento || null,
      desconto_geral: dados.desconto_geral,
      frete: dados.frete || 0,
      carrier_id: dados.carrier_id || null,
      frete_regiao: dados.frete_regiao || null,
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
  supplier_id: string
  contato_id?: string | null
  observacoes: string | null
  endereco_entrega?: string | null
  forma_pagamento?: string | null
  desconto_geral: number
  frete?: number
  carrier_id?: string | null
  frete_regiao?: string | null
  itens: ItemInput[]
}) {
  const { supabase, perfil } = await getUsuarioEOrg()

  if (!dados.supplier_id) throw new Error('Fornecedor é obrigatório.')
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

  await validarFornecedorItens(supabase, dados.supplier_id, dados.itens)

  const { subtotais, valorSubtotal, valorTotal } = calcularTotais(dados.itens, dados.desconto_geral, dados.frete ?? 0)

  const { error: updateError } = await supabase
    .from('quotes')
    .update({
      lead_id: dados.lead_id ?? null,
      deal_id: dados.deal_id ?? null,
      supplier_id: dados.supplier_id,
      contato_id: dados.contato_id ?? null,
      observacoes: dados.observacoes || null,
      endereco_entrega: dados.endereco_entrega ?? null,
      forma_pagamento: dados.forma_pagamento ?? null,
      desconto_geral: dados.desconto_geral,
      frete: dados.frete ?? 0,
      carrier_id: dados.carrier_id ?? null,
      frete_regiao: dados.frete_regiao ?? null,
      valor_subtotal: valorSubtotal,
      valor_total: valorTotal,
      status: 'rascunho' as QuoteStatus,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', orcamentoId)
    .eq('organization_id', perfil.organization_id)

  if (updateError) throw new Error(`Erro ao atualizar orçamento: ${updateError.message}`)

  const itensParaInserir = dados.itens.map((item, i) => ({
    quote_id: orcamentoId,
    product_id: item.product_id || null,
    descricao: item.descricao,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    desconto_item: item.desconto_item,
    subtotal: subtotais[i],
  }))

  // Buscar IDs dos itens antigos antes de inserir novos
  const { data: itensAntigos } = await supabase
    .from('quote_items')
    .select('id')
    .eq('quote_id', orcamentoId)

  const idsAntigos = (itensAntigos ?? []).map(i => i.id)

  // Inserir novos itens primeiro (se falhar, os antigos permanecem intactos)
  const { error: errItens } = await supabase.from('quote_items').insert(itensParaInserir)
  if (errItens) throw new Error(`Erro ao atualizar itens: ${errItens.message}`)

  // Só agora deletar os antigos (novos já estão salvos)
  if (idsAntigos.length > 0) {
    await supabase.from('quote_items').delete().in('id', idsAntigos)
  }

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

export async function aprovarOrcamento(orcamentoId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: orcamento } = await supabase
    .from('quotes')
    .select('id, status')
    .eq('id', orcamentoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!orcamento) throw new Error('Orçamento não encontrado.')

  // Permitir aprovação a partir de: enviado_ao_cliente ou aprovado_internamente
  const statusPermitidos: QuoteStatus[] = ['enviado_ao_cliente', 'aprovado_internamente']
  if (!statusPermitidos.includes(orcamento.status as QuoteStatus)) {
    throw new Error(`Status atual "${orcamento.status}" não permite aprovação.`)
  }

  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'aprovado_pelo_cliente' as QuoteStatus,
      aprovado_cliente_em: new Date().toISOString(),
      aprovado_cliente_por: perfil.id,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', orcamentoId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao aprovar orçamento: ${error.message}`)

  // Registrar atividade
  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'orcamento_aprovado',
    descricao: `Orçamento aprovado pelo cliente.`,
    autor_id: perfil.id,
  })

  revalidatePath('/orcamentos')
  revalidatePath(`/orcamentos/${orcamentoId}`)
}

export async function transformarEmPedido(orcamentoId: string, motivo?: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  // 1. Validar orçamento
  const { data: orcamento } = await supabase
    .from('quotes')
    .select(`
      *,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(nome, telefone),
      contato:contacts!contato_id(nome, telefone),
      itens:quote_items!quote_id(*)
    `)
    .eq('id', orcamentoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!orcamento) throw new Error('Orçamento não encontrado.')

  // Validações
  if (orcamento.status !== 'aprovado_pelo_cliente') {
    throw new Error('Apenas orçamentos aprovados pelo cliente podem ser transformados em pedidos.')
  }

  if (!orcamento.itens || orcamento.itens.length === 0) {
    throw new Error('Orçamento deve ter pelo menos um item para ser transformado em pedido.')
  }

  if (!orcamento.contato_id && !orcamento.lead_id) {
    throw new Error('Orçamento deve ter um cliente (contato ou lead) vinculado.')
  }

  // Verificar se já existe pedido para este orçamento
  const { data: pedidoExistente } = await supabase
    .from('orders')
    .select('id')
    .eq('quote_id', orcamentoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (pedidoExistente) {
    throw new Error('Já existe um pedido gerado para este orçamento. Entre em contato com o administrador para gerar um novo.')
  }

  // 2. Buscar contato vinculado (prioridade: contato_id direto no orçamento)
  let contatoId: string | null = orcamento.contato_id ?? null
  if (!contatoId && orcamento.lead_id) {
    const { data: leadData } = await supabase.from('leads').select('telefone').eq('id', orcamento.lead_id).single()
    if (leadData?.telefone) {
      const { data: contato } = await supabase
        .from('contacts')
        .select('id')
        .eq('organization_id', perfil.organization_id)
        .eq('telefone', leadData.telefone)
        .limit(1)
        .single()
      contatoId = contato?.id ?? null
    }
  }

  // 3. Criar pedido
  const { data: pedido, error: errPedido } = await supabase
    .from('orders')
    .insert({
      organization_id: perfil.organization_id,
      numero: orcamento.numero,
      quote_id: orcamentoId,
      lead_id: orcamento.lead_id ?? null,
      contato_id: contatoId,
      deal_id: orcamento.deal_id ?? null,
      responsavel_id: orcamento.responsavel_id,
      status: 'pendente',
      valor_total: orcamento.valor_total,
      desconto_geral: orcamento.desconto_geral,
      frete: orcamento.frete ?? 0,
      observacoes: orcamento.observacoes,
      endereco_entrega: orcamento.endereco_entrega,
      forma_pagamento: orcamento.forma_pagamento,
    })
    .select('id, numero')
    .single()

  if (errPedido) throw new Error(`Erro ao gerar pedido: ${errPedido.message}`)

  // 4. Copiar itens do orçamento para o pedido
  const itensParaInserir = orcamento.itens.map((item: any) => ({
    order_id: pedido.id,
    product_id: item.product_id,
    descricao: item.descricao,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    desconto_item: item.desconto_item,
    subtotal: item.subtotal,
  }))

  const { error: errItens } = await supabase.from('order_items').insert(itensParaInserir)
  if (errItens) {
    // Rollback: deletar pedido criado sem itens
    await supabase.from('orders').delete().eq('id', pedido.id)
    throw new Error(`Erro ao copiar itens para o pedido: ${errItens.message}`)
  }

  // 5. Registrar histórico de status do pedido
  await supabase.from('order_status_history').insert({
    organization_id: perfil.organization_id,
    order_id: pedido.id,
    status_anterior: null,
    status_novo: 'pendente',
    observacao: `Pedido gerado a partir do orçamento #${orcamento.id.slice(0, 8)}${motivo ? ` - ${motivo}` : ''}`,
    autor_id: perfil.id,
  })

  // 6. Registrar atividade
  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'pedido_gerado',
    descricao: `Pedido #${pedido.numero} gerado a partir do orçamento aprovado.${motivo ? ` Motivo: ${motivo}` : ''}`,
    lead_id: orcamento.lead_id ?? null,
    deal_id: orcamento.deal_id ?? null,
    autor_id: perfil.id,
  })

  // 7. Atualizar orçamento com referência ao pedido
  await supabase
    .from('quotes')
    .update({
      aprovado_cliente_em: new Date().toISOString(),
      aprovado_cliente_por: perfil.id,
      atualizado_em: new Date().toISOString()
    })
    .eq('id', orcamentoId)
    .eq('organization_id', perfil.organization_id)

  revalidatePath('/orcamentos')
  revalidatePath(`/orcamentos/${orcamentoId}`)
  revalidatePath('/pedidos')
}

export async function marcarAprovadoCliente(orcamentoId: string) {
  // Função mantida para compatibilidade, mas agora chama transformarEmPedido
  return transformarEmPedido(orcamentoId, 'Aprovação automática via botão "Cliente aprovou"')
}

export async function verificarPedidoGerado(orcamentoId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: pedido } = await supabase
    .from('orders')
    .select('id, numero, status')
    .eq('quote_id', orcamentoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  return pedido || null
}

export async function marcarRecusadoCliente(orcamentoId: string) {
  await alterarStatus(orcamentoId, 'recusado_pelo_cliente', ['enviado_ao_cliente'])
}
