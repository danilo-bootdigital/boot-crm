import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeStatusPedido } from '@/components/pedidos/badge-status-pedido'
import { TimelineStatus } from '@/components/pedidos/timeline-status'
import { BotoesPedido } from '@/components/pedidos/botoes-pedido'

export default async function PedidoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: pedido } = await supabase
    .from('orders')
    .select(`
      id, numero, status, valor_total, desconto_geral, frete, observacoes,
      endereco_entrega, forma_pagamento, motivo_cancelamento,
      criado_em, concluido_em, cancelado_em,
      quote_id,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(id, nome, telefone, email),
      contato:contacts!contato_id(id, nome, telefone, email)
    `)
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!pedido) notFound()

  // Fallback: buscar contato via orçamento se não está direto no pedido
  let contatoFallback: { id: string; nome: string; telefone: string | null; email: string | null } | null = null
  const contatoDireto = Array.isArray(pedido.contato) ? pedido.contato[0] : pedido.contato
  const leadDireto = Array.isArray(pedido.lead) ? pedido.lead[0] : pedido.lead

  if (!contatoDireto && !leadDireto && pedido.quote_id) {
    const { data: quote } = await supabase
      .from('quotes')
      .select('contato_id, lead_id')
      .eq('id', pedido.quote_id)
      .single()

    if (quote?.contato_id) {
      const { data: c } = await supabase
        .from('contacts')
        .select('id, nome, telefone, email')
        .eq('id', quote.contato_id)
        .single()
      contatoFallback = c
    } else if (quote?.lead_id) {
      const { data: l } = await supabase
        .from('leads')
        .select('id, nome, telefone, email')
        .eq('id', quote.lead_id)
        .single()
      if (l) contatoFallback = l
    }
  }

  const { data: itens } = await supabase
    .from('order_items')
    .select('id, descricao, quantidade, preco_unitario, desconto_item, subtotal')
    .eq('order_id', id)

  const { data: historico } = await supabase
    .from('order_status_history')
    .select('id, status_anterior, status_novo, observacao, criado_em, autor:profiles!autor_id(nome)')
    .eq('order_id', id)
    .order('criado_em', { ascending: false })

  const responsavel = Array.isArray(pedido.responsavel) ? pedido.responsavel[0] : pedido.responsavel
  const lead = Array.isArray(pedido.lead) ? pedido.lead[0] : pedido.lead
  const contato = Array.isArray(pedido.contato) ? pedido.contato[0] : pedido.contato
  const cliente = contato || lead || contatoFallback

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pedidos">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Pedido #{pedido.numero}</h1>
            <BadgeStatusPedido status={pedido.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Criado em {new Date(pedido.criado_em).toLocaleDateString('pt-BR')} · Responsável: {responsavel?.nome ?? '—'}
          </p>
        </div>
        <BotoesPedido pedidoId={id} status={pedido.status} />
      </div>

      <TimelineStatus statusAtual={pedido.status} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Itens */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Itens do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-slate-500">
                      <th className="pb-2 pr-3">Descrição</th>
                      <th className="pb-2 pr-3 text-right">Qtd</th>
                      <th className="pb-2 pr-3 text-right">Preço Unit.</th>
                      <th className="pb-2 pr-3 text-right">Desc.</th>
                      <th className="pb-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(itens ?? []).map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 text-slate-700">{item.descricao}</td>
                        <td className="py-2 pr-3 text-right text-slate-600">{Number(item.quantidade)}</td>
                        <td className="py-2 pr-3 text-right text-slate-600">
                          {Number(item.preco_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2 pr-3 text-right text-slate-500">{Number(item.desconto_item)}%</td>
                        <td className="py-2 text-right font-medium text-slate-800">
                          {Number(item.subtotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td colSpan={4} className="pt-3 text-right text-sm font-medium text-slate-600">Total:</td>
                      <td className="pt-3 text-right text-base font-bold text-slate-900">
                        {Number(pedido.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Status</CardTitle>
            </CardHeader>
            <CardContent>
              {(!historico || historico.length === 0) ? (
                <p className="text-sm text-slate-400">Nenhum registro.</p>
              ) : (
                <div className="space-y-3">
                  {historico.map((h) => {
                    const autor = Array.isArray(h.autor) ? h.autor[0] : h.autor
                    return (
                      <div key={h.id} className="flex items-start gap-3 text-sm">
                        <div className="mt-1 h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                        <div>
                          <p className="text-slate-700">
                            {h.status_anterior ? `${h.status_anterior} → ` : ''}<span className="font-medium">{h.status_novo}</span>
                          </p>
                          {h.observacao && <p className="text-xs text-slate-500 mt-0.5">{h.observacao}</p>}
                          <p className="text-xs text-slate-400 mt-0.5">
                            {autor?.nome ?? 'Sistema'} · {new Date(h.criado_em).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {cliente ? (
                <>
                  <p className="font-medium text-slate-800">{cliente.nome}</p>
                  {cliente.telefone && <p className="text-slate-500">{cliente.telefone}</p>}
                  {cliente.email && <p className="text-slate-500">{cliente.email}</p>}
                </>
              ) : (
                <p className="text-slate-400">Sem cliente vinculado</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {pedido.forma_pagamento && (
                <div><span className="text-slate-500">Pagamento:</span> <span className="text-slate-700">{pedido.forma_pagamento}</span></div>
              )}
              {pedido.endereco_entrega && (
                <div><span className="text-slate-500">Entrega:</span> <span className="text-slate-700">{pedido.endereco_entrega}</span></div>
              )}
              {Number(pedido.frete) > 0 && (
                <div><span className="text-slate-500">Frete:</span> <span className="text-slate-700">{Number(pedido.frete).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
              )}
              {Number(pedido.desconto_geral) > 0 && (
                <div><span className="text-slate-500">Desconto:</span> <span className="text-slate-700">{Number(pedido.desconto_geral)}%</span></div>
              )}
              {pedido.observacoes && (
                <div><span className="text-slate-500">Obs:</span> <span className="text-slate-700">{pedido.observacoes}</span></div>
              )}
              {pedido.motivo_cancelamento && (
                <div className="rounded bg-red-50 p-2 border border-red-200">
                  <span className="text-red-700 text-xs font-medium">Motivo cancelamento:</span>
                  <p className="text-red-600 text-xs mt-0.5">{pedido.motivo_cancelamento}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Orçamento Original</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/orcamentos/${pedido.quote_id}`} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <FileText className="h-4 w-4" />
                Ver orçamento
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
