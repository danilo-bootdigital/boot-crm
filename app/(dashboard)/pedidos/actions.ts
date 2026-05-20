'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { OrderStatus } from '@/types/database'

const TRANSICOES: Record<string, string> = {
  pendente: 'em_producao',
  em_producao: 'pronto',
  pronto: 'enviado',
  enviado: 'entregue',
  entregue: 'concluido',
}

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_producao: 'Em Produção',
  pronto: 'Pronto',
  enviado: 'Enviado',
  entregue: 'Entregue',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

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

export async function avancarStatus(orderId: string, observacao?: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: pedido } = await supabase
    .from('orders')
    .select('id, status, lead_id, deal_id, numero')
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedido) throw new Error('Pedido não encontrado.')

  const proximoStatus = TRANSICOES[pedido.status as string]
  if (!proximoStatus) throw new Error('Este pedido não pode avançar de status.')

  const agora = new Date().toISOString()
  const extras: Record<string, unknown> = { status: proximoStatus, atualizado_em: agora }
  if (proximoStatus === 'concluido') extras.concluido_em = agora

  const { error } = await supabase
    .from('orders')
    .update(extras)
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao avançar status: ${error.message}`)

  await supabase.from('order_status_history').insert({
    organization_id: perfil.organization_id,
    order_id: orderId,
    status_anterior: pedido.status,
    status_novo: proximoStatus,
    observacao: observacao || null,
    autor_id: perfil.id,
  })

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'pedido_status',
    descricao: `Pedido #${pedido.numero} alterado para ${STATUS_LABELS[proximoStatus] || proximoStatus}.`,
    lead_id: pedido.lead_id || null,
    deal_id: pedido.deal_id || null,
    autor_id: perfil.id,
  })

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${orderId}`)
}

export async function cancelarPedido(orderId: string, motivo: string) {
  if (!motivo?.trim()) throw new Error('Motivo do cancelamento é obrigatório.')

  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: pedido } = await supabase
    .from('orders')
    .select('id, status, lead_id, deal_id, numero')
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedido) throw new Error('Pedido não encontrado.')
  if (pedido.status === 'cancelado' || pedido.status === 'concluido') {
    throw new Error('Este pedido não pode ser cancelado.')
  }

  const agora = new Date().toISOString()

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelado' as OrderStatus,
      motivo_cancelamento: motivo.trim(),
      cancelado_por: perfil.id,
      cancelado_em: agora,
      atualizado_em: agora,
    })
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao cancelar: ${error.message}`)

  await supabase.from('order_status_history').insert({
    organization_id: perfil.organization_id,
    order_id: orderId,
    status_anterior: pedido.status,
    status_novo: 'cancelado',
    observacao: motivo.trim(),
    autor_id: perfil.id,
  })

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'pedido_cancelado',
    descricao: `Pedido #${pedido.numero} cancelado. Motivo: ${motivo.trim()}`,
    lead_id: pedido.lead_id || null,
    deal_id: pedido.deal_id || null,
    autor_id: perfil.id,
  })

  revalidatePath('/pedidos')
  revalidatePath(`/pedidos/${orderId}`)
}

export async function excluirPedido(orderId: string, senhaAdmin: string) {
  if (!senhaAdmin?.trim()) throw new Error('Senha de administrador é obrigatória.')

  const { supabase, perfil } = await getUsuarioEOrg()

  if (perfil.cargo !== 'admin') {
    throw new Error('Apenas administradores podem excluir pedidos.')
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: (await supabase.auth.getUser()).data.user!.email!,
    password: senhaAdmin,
  })

  if (authError) {
    throw new Error('Senha incorreta.')
  }

  const { data: pedido } = await supabase
    .from('orders')
    .select('id, numero')
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedido) throw new Error('Pedido não encontrado.')

  await supabase.from('order_items').delete().eq('order_id', orderId)
  await supabase.from('order_status_history').delete().eq('order_id', orderId)

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir pedido: ${error.message}`)

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    tipo: 'pedido_excluido',
    descricao: `Pedido #${pedido.numero} excluído permanentemente.`,
    autor_id: perfil.id,
  })

  revalidatePath('/pedidos')
  redirect('/pedidos')
}
