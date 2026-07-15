import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, ArrowLeft, ExternalLink } from 'lucide-react'
import { CardMetrica } from '@/components/relatorios/card-metrica'
import { BadgeStatusPedido } from '@/components/pedidos/badge-status-pedido'
import { Paginacao } from '@/components/ui/paginacao'
import { FiltrosPedidosFornecedor } from '@/components/relatorios/pedidos-fornecedor/filtros'
import { BotoesExportarPedidosFornecedor } from '@/components/relatorios/pedidos-fornecedor/botoes-exportar'
import { formatarMoeda } from '@/lib/utils'
import {
  montarFiltros, POR_PAGINA,
  type TotaisPedidosFornecedor, type ConsolidadoFornecedor, type DetalhePedido,
} from '@/lib/relatorios/pedidos-por-fornecedor'

export default async function PedidosPorFornecedorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const orgId = perfil.organization_id
  const isAdminGestor = perfil.cargo === 'admin' || perfil.cargo === 'gestor'

  // Listas para os filtros
  const [{ data: fornecedoresRaw }, { data: responsaveisRaw }] = await Promise.all([
    supabase.from('suppliers').select('id, nome').eq('organization_id', orgId).order('nome'),
    isAdminGestor
      ? supabase.from('profiles').select('id, nome').eq('organization_id', orgId).eq('ativo', true)
          .in('cargo', ['vendedor', 'gestor', 'admin']).order('nome')
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ])

  const fornecedores = (fornecedoresRaw ?? []) as { id: string; nome: string }[]
  const responsaveis = (responsaveisRaw ?? []) as { id: string; nome: string }[]

  const filtros = montarFiltros(params)
  const pagina = Math.max(1, parseInt(params.pagina ?? '1', 10) || 1)

  // Dados do relatório (só busca quando os filtros são válidos)
  let totais: TotaisPedidosFornecedor | null = null
  let consolidado: ConsolidadoFornecedor[] = []
  let detalhe: DetalhePedido[] = []
  let erro: string | null = null
  let totalRegistros = 0

  if (filtros.valido) {
    const [rTotais, rConsolidado, rDetalhe] = await Promise.all([
      supabase.rpc('relatorio_pedidos_fornecedor_totais', filtros.rpc),
      supabase.rpc('relatorio_pedidos_fornecedor_consolidado', filtros.rpc),
      supabase.rpc('relatorio_pedidos_fornecedor_detalhe', {
        ...filtros.rpc,
        p_limit: POR_PAGINA,
        p_offset: (pagina - 1) * POR_PAGINA,
      }),
    ])

    if (rTotais.error || rConsolidado.error || rDetalhe.error) {
      erro = rTotais.error?.message || rConsolidado.error?.message || rDetalhe.error?.message || 'Erro ao gerar relatório.'
    } else {
      totais = (rTotais.data?.[0] as TotaisPedidosFornecedor) ?? null
      consolidado = (rConsolidado.data ?? []) as ConsolidadoFornecedor[]
      detalhe = (rDetalhe.data ?? []) as DetalhePedido[]
      totalRegistros = detalhe[0]?.total_rows ? Number(detalhe[0].total_rows) : 0
    }
  }

  const semResultados = filtros.valido && !erro && (totais?.qtd_pedidos ?? 0) === 0

  // Totais gerais do consolidado (linha final da tabela)
  const totalGeralConsolidado = consolidado.reduce(
    (acc, c) => ({
      qtd_pedidos: acc.qtd_pedidos + Number(c.qtd_pedidos),
      qtd_itens: acc.qtd_itens + Number(c.qtd_itens),
      subtotal: acc.subtotal + Number(c.subtotal),
      desconto: acc.desconto + Number(c.desconto),
      frete: acc.frete + Number(c.frete),
      valor_final: acc.valor_final + Number(c.valor_final),
    }),
    { qtd_pedidos: 0, qtd_itens: 0, subtotal: 0, desconto: 0, frete: 0, valor_final: 0 }
  )

  const exportParams = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v) exportParams.set(k, v) })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/relatorios" className="mb-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <ArrowLeft className="h-3 w-3" /> Relatórios
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Relatório de Pedidos por Fornecedor</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulte e exporte os pedidos realizados por fornecedor dentro do período selecionado.
          </p>
        </div>
        {filtros.valido && !erro && !semResultados && (
          <BotoesExportarPedidosFornecedor queryString={exportParams.toString()} />
        )}
      </div>

      <FiltrosPedidosFornecedor
        fornecedores={fornecedores}
        responsaveis={responsaveis}
        mostrarResponsavel={isAdminGestor}
      />

      {/* Estados */}
      {!filtros.valido ? (
        <EstadoVazio
          titulo="Defina os filtros para gerar o relatório"
          descricao={filtros.motivoInvalido ?? 'Selecione o período e clique em “Gerar relatório”.'}
        />
      ) : erro ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Não foi possível gerar o relatório: {erro}
        </div>
      ) : semResultados ? (
        <EstadoVazio
          titulo="Nenhum pedido encontrado"
          descricao="Não há pedidos para os filtros selecionados. Ajuste o período, fornecedor ou status."
        />
      ) : (
        <>
          {/* CARDS */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <CardMetrica label="Pedidos" valor={String(totais?.qtd_pedidos ?? 0)} />
            <CardMetrica label="Valor total" valor={formatarMoeda(totais?.valor_total)} />
            <CardMetrica label="Ticket médio" valor={formatarMoeda(totais?.ticket_medio)} />
            <CardMetrica label="Itens" valor={String(Number(totais?.qtd_itens ?? 0))} />
            <CardMetrica label="Clientes" valor={String(totais?.qtd_clientes ?? 0)} />
            <CardMetrica label="Fornecedores" valor={String(totais?.qtd_fornecedores ?? 0)} />
            <CardMetrica label="Total de descontos" valor={formatarMoeda(totais?.total_desconto)} />
            <CardMetrica label="Total de fretes" valor={formatarMoeda(totais?.total_frete)} />
          </div>

          {/* CONSOLIDADO POR FORNECEDOR */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Consolidado por fornecedor</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5">Fornecedor</th>
                    <th className="px-4 py-2.5 text-right">Pedidos</th>
                    <th className="px-4 py-2.5 text-right">Itens</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                    <th className="px-4 py-2.5 text-right">Descontos</th>
                    <th className="px-4 py-2.5 text-right">Frete</th>
                    <th className="px-4 py-2.5 text-right">Valor final</th>
                    <th className="px-4 py-2.5 text-right">Ticket médio</th>
                    <th className="px-4 py-2.5 text-right">Part. %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {consolidado.map((c, i) => (
                    <tr key={c.supplier_id ?? `sem-${i}`} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{c.fornecedor}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{Number(c.qtd_pedidos)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{Number(c.qtd_itens)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatarMoeda(c.subtotal)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatarMoeda(c.desconto)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatarMoeda(c.frete)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">{formatarMoeda(c.valor_final)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatarMoeda(c.ticket_medio)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{Number(c.participacao).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
                    <td className="px-4 py-2.5">Total geral</td>
                    <td className="px-4 py-2.5 text-right">{totalGeralConsolidado.qtd_pedidos}</td>
                    <td className="px-4 py-2.5 text-right">{totalGeralConsolidado.qtd_itens}</td>
                    <td className="px-4 py-2.5 text-right">{formatarMoeda(totalGeralConsolidado.subtotal)}</td>
                    <td className="px-4 py-2.5 text-right">{formatarMoeda(totalGeralConsolidado.desconto)}</td>
                    <td className="px-4 py-2.5 text-right">{formatarMoeda(totalGeralConsolidado.frete)}</td>
                    <td className="px-4 py-2.5 text-right">{formatarMoeda(totalGeralConsolidado.valor_final)}</td>
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5 text-right">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* DETALHE DE PEDIDOS */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Pedidos ({totalRegistros})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-4 py-2.5">Data</th>
                    <th className="px-4 py-2.5">Fornecedor</th>
                    <th className="px-4 py-2.5">Cliente</th>
                    <th className="px-4 py-2.5">Responsável</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Itens</th>
                    <th className="px-4 py-2.5 text-right">Subtotal</th>
                    <th className="px-4 py-2.5 text-right">Desconto</th>
                    <th className="px-4 py-2.5 text-right">Frete</th>
                    <th className="px-4 py-2.5 text-right">Valor final</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {detalhe.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/pedidos/${p.id}`} className="font-medium text-blue-600 hover:underline">
                          #{p.numero}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{new Date(p.criado_em).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-2.5 text-slate-700">{p.fornecedor}</td>
                      <td className="px-4 py-2.5 text-slate-700">{p.cliente}</td>
                      <td className="px-4 py-2.5 text-slate-600">{p.responsavel}</td>
                      <td className="px-4 py-2.5"><BadgeStatusPedido status={p.status} /></td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{Number(p.qtd_itens)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatarMoeda(p.subtotal)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatarMoeda(p.desconto)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatarMoeda(p.frete)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900">{formatarMoeda(p.valor_final)}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/pedidos/${p.id}`} className="text-slate-400 hover:text-blue-600" title="Abrir pedido">
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3">
              <Paginacao
                paginaAtual={pagina}
                totalRegistros={totalRegistros}
                porPagina={POR_PAGINA}
                baseUrl="/relatorios/pedidos-por-fornecedor"
                searchParams={params}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function EstadoVazio({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-16 text-center">
      <Package className="h-12 w-12 text-slate-300" />
      <p className="mt-3 text-sm font-medium text-slate-600">{titulo}</p>
      <p className="mt-1 max-w-sm text-xs text-slate-400">{descricao}</p>
    </div>
  )
}
