import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { orcamentoId, motivo } = await request.json()

    // Buscar perfil do usuário
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, organization_id, cargo')
      .eq('id', user.id)
      .single()

    if (!perfil) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    // Validar orçamento
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

    console.log('=== Dados do Orçamento ===')
    console.log('ID:', orcamentoId)
    console.log('Status:', orcamento?.status)
    console.log('Itens:', orcamento?.itens?.length)
    console.log('Contato ID:', orcamento?.contato_id)
    console.log('Lead ID:', orcamento?.lead_id)
    console.log('========================')

    if (!orcamento) {
      return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
    }

    // Validações
    console.log('Status do orçamento:', orcamento.status)
    if (orcamento.status !== 'aprovado_pelo_cliente') {
      return NextResponse.json({ error: 'Apenas orçamentos aprovados pelo cliente podem ser transformados em pedidos.' }, { status: 400 })
    }

    if (!orcamento.itens || orcamento.itens.length === 0) {
      return NextResponse.json({ error: 'Orçamento deve ter pelo menos um item para ser transformado em pedido.' }, { status: 400 })
    }

    if (!orcamento.contato_id && !orcamento.lead_id) {
      return NextResponse.json({ error: 'Orçamento deve ter um cliente (contato ou lead) vinculado.' }, { status: 400 })
    }

    // Verificar se já existe pedido para este orçamento
    const { data: pedidoExistente } = await supabase
      .from('orders')
      .select('id, numero, status')
      .eq('quote_id', orcamentoId)
      .eq('organization_id', perfil.organization_id)
      .single()

    console.log('=== Verificação de Pedido Existente ===')
    console.log('Orçamento ID:', orcamentoId)
    console.log('Pedido encontrado:', pedidoExistente)
    console.log('====================================')

    if (pedidoExistente) {
      console.error('Pedido já existe:', pedidoExistente)
      return NextResponse.json({
        error: `Já existe um pedido gerado para este orçamento (Pedido #${pedidoExistente.numero}). Entre em contato com o administrador para gerar um novo.`
      }, { status: 400 })
    }

    // Buscar contato vinculado (prioridade: contato_id direto no orçamento)
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

    // Criar pedido
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

    if (errPedido) {
      throw new Error(`Erro ao gerar pedido: ${errPedido.message}`)
    }

    // Copiar itens do orçamento para o pedido
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

    // Registrar histórico de status do pedido
    await supabase.from('order_status_history').insert({
      organization_id: perfil.organization_id,
      order_id: pedido.id,
      status_anterior: null,
      status_novo: 'pendente',
      observacao: `Pedido gerado a partir do orçamento #${orcamento.id.slice(0, 8)}${motivo ? ` - ${motivo}` : ''}`,
      autor_id: perfil.id,
    })

    // Registrar atividade
    await supabase.from('activities').insert({
      organization_id: perfil.organization_id,
      tipo: 'pedido_gerado',
      descricao: `Pedido #${pedido.numero} gerado a partir do orçamento aprovado.${motivo ? ` Motivo: ${motivo}` : ''}`,
      lead_id: orcamento.lead_id ?? null,
      deal_id: orcamento.deal_id ?? null,
      autor_id: perfil.id,
    })

    // Atualizar orçamento com referência ao pedido
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

    return NextResponse.json({
      success: true,
      pedidoNumero: pedido.numero,
      message: 'Pedido gerado com sucesso!'
    })
  } catch (error: any) {
    console.error('=== ERRO AO CONVERTER ORÇAMENTO EM PEDIDO ===', error)
    return NextResponse.json({
      error: error.message || 'Falha ao converter orçamento em pedido'
    }, { status: 500 })
  }
}