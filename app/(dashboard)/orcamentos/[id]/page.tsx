import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeStatusOrcamento } from '@/components/orcamentos/badge-status-orcamento'
import { AcoesOrcamento } from '@/components/orcamentos/acoes-orcamento'
import { formatarMoeda } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'
import type { QuoteStatus, QuoteItem } from '@/types/database'

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
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
    .select(`
      *,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(id, nome),
      deal:deals!deal_id(id, titulo),
      aprovador:profiles!aprovacao_interna_por(nome)
    `)
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!orcamento) notFound()

  const { data: itens } = await supabase
    .from('quote_items')
    .select('*')
    .eq('quote_id', id)
    .order('id') as { data: QuoteItem[] | null }

  const responsavel = Array.isArray(orcamento.responsavel) ? orcamento.responsavel[0] : orcamento.responsavel
  const lead = Array.isArray(orcamento.lead) ? orcamento.lead[0] : orcamento.lead
  const deal = Array.isArray(orcamento.deal) ? orcamento.deal[0] : orcamento.deal
  const aprovador = Array.isArray(orcamento.aprovador) ? orcamento.aprovador[0] : orcamento.aprovador

  const podeEditar = (orcamento.status === 'rascunho' || orcamento.status === 'rejeitado_internamente') &&
    (perfil.cargo === 'admin' || perfil.cargo === 'gestor' || orcamento.responsavel_id === perfil.id)

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
          <BadgeStatusOrcamento status={orcamento.status as QuoteStatus} />
        </div>
        <div className="flex gap-2">
          {podeEditar && (
            <Link href={`/orcamentos/${id}/editar`}>
              <Button variant="outline" size="sm">Editar</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Itens do orçamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-slate-500">
                      <th className="pb-2 pr-4">Descrição</th>
                      <th className="pb-2 pr-4 text-right">Qtd</th>
                      <th className="pb-2 pr-4 text-right">Preço unit.</th>
                      <th className="pb-2 pr-4 text-right">Desc.</th>
                      <th className="pb-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(itens ?? []).map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium text-slate-900">{item.descricao}</td>
                        <td className="py-2 pr-4 text-right text-slate-700">{item.quantidade}</td>
                        <td className="py-2 pr-4 text-right text-slate-700">{formatarMoeda(item.preco_unitario)}</td>
                        <td className="py-2 pr-4 text-right text-slate-600">{item.desconto_item > 0 ? `${item.desconto_item}%` : '—'}</td>
                        <td className="py-2 text-right font-medium text-slate-900">{formatarMoeda(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatarMoeda(orcamento.valor_subtotal)}</span>
                </div>
                {orcamento.desconto_geral > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Desconto geral ({orcamento.desconto_geral}%)</span>
                    <span>-{formatarMoeda(orcamento.valor_subtotal - orcamento.valor_total)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-slate-900 border-t pt-2">
                  <span>Total</span>
                  <span>{formatarMoeda(orcamento.valor_total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {orcamento.observacoes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{orcamento.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Responsável</p>
                <p className="font-medium">{responsavel?.nome ?? '—'}</p>
              </div>
              {lead && (
                <div>
                  <p className="text-xs text-slate-500">Lead</p>
                  <Link href={`/leads/${lead.id}`} className="font-medium text-blue-600 hover:underline">
                    {lead.nome ?? 'Sem nome'}
                  </Link>
                </div>
              )}
              {deal && (
                <div>
                  <p className="text-xs text-slate-500">Negociação</p>
                  <p className="font-medium">{deal.titulo}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Criado em</p>
                <p className="font-medium">{format(new Date(orcamento.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              {aprovador && (
                <div>
                  <p className="text-xs text-slate-500">Aprovação interna</p>
                  <p className="font-medium">{aprovador.nome}</p>
                  {orcamento.aprovacao_interna_comentario && (
                    <p className="text-xs text-slate-500 mt-1">{orcamento.aprovacao_interna_comentario}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <AcoesOrcamento
            orcamentoId={id}
            status={orcamento.status as QuoteStatus}
            cargo={perfil.cargo}
            isResponsavel={orcamento.responsavel_id === perfil.id}
          />
        </div>
      </div>
    </div>
  )
}
