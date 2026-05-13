import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { startOfWeek, format, eachWeekOfInterval, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardMetrica } from '@/components/relatorios/card-metrica'
import { FiltrosRelatorio } from '@/components/relatorios/filtros-relatorio'
import { GraficoFunil } from '@/components/relatorios/grafico-funil'
import { GraficoLeadsPeriodo } from '@/components/relatorios/grafico-leads-periodo'
import { GraficoVendasVendedor } from '@/components/relatorios/grafico-vendas-vendedor'
import { TabelaResumoVendas } from '@/components/relatorios/tabela-resumo-vendas'
import { BotoesExportar } from '@/components/relatorios/botoes-exportar'
import { formatarMoeda } from '@/lib/utils'

function calcularPeriodo(periodo: string | null, inicioCustom: string | null, fimCustom: string | null) {
  const agora = new Date()
  let fim = agora.toISOString()
  let inicio: string

  switch (periodo) {
    case '7': inicio = subDays(agora, 7).toISOString(); break
    case '90': inicio = subDays(agora, 90).toISOString(); break
    case '365': inicio = subDays(agora, 365).toISOString(); break
    case 'custom':
      inicio = inicioCustom ? new Date(inicioCustom).toISOString() : subDays(agora, 30).toISOString()
      fim = fimCustom ? new Date(`${fimCustom}T23:59:59`).toISOString() : agora.toISOString()
      break
    default: inicio = subDays(agora, 30).toISOString()
  }

  return { inicio, fim }
}

export default async function RelatoriosPage({
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
  const isVendedor = perfil.cargo === 'vendedor'

  const { inicio, fim } = calcularPeriodo(
    params.periodo ?? '30',
    params.inicio ?? null,
    params.fim ?? null
  )
  const filtroResponsavel = params.responsavel ?? null

  // Buscar responsáveis para o filtro (admin/gestor)
  const { data: responsaveisRaw } = isAdminGestor
    ? await supabase
        .from('profiles')
        .select('id, nome')
        .eq('organization_id', orgId)
        .eq('ativo', true)
        .in('cargo', ['vendedor', 'gestor', 'admin'])
        .order('nome')
    : { data: [] }

  const responsaveis = (responsaveisRaw ?? []) as { id: string; nome: string }[]

  // Queries paralelas
  let queryLeadsNovos = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .gte('criado_em', inicio)
    .lte('criado_em', fim)

  let queryLeadsQualificados = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'qualificado')
    .gte('criado_em', inicio)
    .lte('criado_em', fim)

  let queryDealsGanhos = supabase
    .from('deals')
    .select('valor_estimado')
    .eq('organization_id', orgId)
    .eq('ganho', true)
    .gte('atualizado_em', inicio)
    .lte('atualizado_em', fim)

  let queryDealsPerdidos = supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('ganho', false)
    .gte('atualizado_em', inicio)
    .lte('atualizado_em', fim)

  let queryLeadsSemana = supabase
    .from('leads')
    .select('criado_em')
    .eq('organization_id', orgId)
    .gte('criado_em', inicio)
    .lte('criado_em', fim)

  let queryVendasVendedor = supabase
    .from('deals')
    .select('responsavel_id, valor_estimado, responsavel:profiles!responsavel_id(nome)')
    .eq('organization_id', orgId)
    .eq('ganho', true)
    .gte('atualizado_em', inicio)
    .lte('atualizado_em', fim)

  // Aplicar filtro de responsável
  const responsavelFiltro = filtroResponsavel || (isVendedor ? perfil.id : null)
  if (responsavelFiltro) {
    queryLeadsNovos = queryLeadsNovos.eq('responsavel_id', responsavelFiltro)
    queryLeadsQualificados = queryLeadsQualificados.eq('responsavel_id', responsavelFiltro)
    queryDealsGanhos = queryDealsGanhos.eq('responsavel_id', responsavelFiltro)
    queryDealsPerdidos = queryDealsPerdidos.eq('responsavel_id', responsavelFiltro)
    queryLeadsSemana = queryLeadsSemana.eq('responsavel_id', responsavelFiltro)
    queryVendasVendedor = queryVendasVendedor.eq('responsavel_id', responsavelFiltro)
  }

  // Pipeline para funil
  const queryPipeline = supabase
    .from('pipelines')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)
    .single()

  const [
    { count: leadsNovos },
    { count: leadsQualificados },
    { data: dealsGanhos },
    { count: dealsPerdidos },
    { data: leadsSemana },
    { data: vendasVendedor },
    { data: pipeline },
  ] = await Promise.all([
    queryLeadsNovos,
    queryLeadsQualificados,
    queryDealsGanhos,
    queryDealsPerdidos,
    queryLeadsSemana,
    queryVendasVendedor,
    queryPipeline,
  ])

  // Métricas
  const totalDealsGanhos = dealsGanhos?.length ?? 0
  const receitaTotal = dealsGanhos?.reduce((acc, d) => acc + (d.valor_estimado ?? 0), 0) ?? 0
  const ticketMedio = totalDealsGanhos > 0 ? receitaTotal / totalDealsGanhos : 0
  const taxaConversao = (leadsNovos ?? 0) > 0
    ? Math.round(((leadsQualificados ?? 0) / (leadsNovos ?? 1)) * 100)
    : 0

  // Funil
  let dadosFunil: { nome: string; cor: string; total: number }[] = []
  if (pipeline) {
    const { data: etapas } = await supabase
      .from('pipeline_stages')
      .select('id, nome, cor, ordem')
      .eq('pipeline_id', pipeline.id)
      .eq('organization_id', orgId)
      .is('oculto', false)
      .order('ordem')

    let queryDealsAtivos = supabase
      .from('deals')
      .select('estagio_id')
      .eq('organization_id', orgId)
      .is('ganho', null)

    if (responsavelFiltro) {
      queryDealsAtivos = queryDealsAtivos.eq('responsavel_id', responsavelFiltro)
    }

    const { data: dealsAtivos } = await queryDealsAtivos

    const contagemPorEtapa = new Map<string, number>()
    dealsAtivos?.forEach((d) => {
      contagemPorEtapa.set(d.estagio_id, (contagemPorEtapa.get(d.estagio_id) ?? 0) + 1)
    })

    dadosFunil = (etapas ?? []).map((e) => ({
      nome: e.nome,
      cor: e.cor,
      total: contagemPorEtapa.get(e.id) ?? 0,
    }))
  }

  // Leads por semana
  const inicioDate = new Date(inicio)
  const fimDate = new Date(fim)
  const semanas = eachWeekOfInterval({ start: inicioDate, end: fimDate }, { weekStartsOn: 1 })
  const contagemSemana = new Map<string, number>()
  semanas.forEach((s) => contagemSemana.set(s.toISOString(), 0))

  leadsSemana?.forEach((l) => {
    const semana = startOfWeek(new Date(l.criado_em), { weekStartsOn: 1 })
    const key = semana.toISOString()
    contagemSemana.set(key, (contagemSemana.get(key) ?? 0) + 1)
  })

  const dadosLeadsSemana = semanas.map((s) => ({
    semana: format(s, 'dd/MM', { locale: ptBR }),
    total: contagemSemana.get(s.toISOString()) ?? 0,
  }))

  // Vendas por vendedor
  const vendasMap = new Map<string, { nome: string; valor: number; deals: number }>()
  vendasVendedor?.forEach((d) => {
    const resp = Array.isArray(d.responsavel) ? d.responsavel[0] : d.responsavel
    const nome = resp?.nome ?? 'Sem responsável'
    const key = d.responsavel_id as string
    const atual = vendasMap.get(key) ?? { nome, valor: 0, deals: 0 }
    atual.valor += d.valor_estimado ?? 0
    atual.deals += 1
    vendasMap.set(key, atual)
  })
  const dadosVendas = Array.from(vendasMap.values()).sort((a, b) => b.valor - a.valor)

  // Produtos mais vendidos (via quote_items → quotes)
  const { data: itensVendidos } = await supabase
    .from('quote_items')
    .select('descricao, quantidade, preco_unitario, subtotal, product_id, quote:quotes!quote_id(organization_id, status, supplier_id, criado_em)')

  // Agrupar por produto
  const produtosMap = new Map<string, { nome: string; fornecedor: string; quantidade: number; receita: number }>()
  ;(itensVendidos ?? []).forEach((item) => {
    const quote = Array.isArray(item.quote) ? item.quote[0] : item.quote
    if (!quote || quote.organization_id !== orgId) return
    if (quote.status !== 'aprovado_pelo_cliente' && quote.status !== 'enviado_ao_cliente') return
    // Filtrar por período usando criado_em do quote
    if (quote.criado_em < inicio || quote.criado_em > fim) return

    const key = item.product_id || item.descricao
    const atual = produtosMap.get(key) ?? { nome: item.descricao, fornecedor: '', quantidade: 0, receita: 0 }
    atual.quantidade += item.quantidade
    atual.receita += item.subtotal
    produtosMap.set(key, atual)
  })
  const dadosProdutos = Array.from(produtosMap.values()).sort((a, b) => b.receita - a.receita).slice(0, 20)

  // Período formatado para exibição
  const periodoLabel = params.periodo === '7' ? 'Últimos 7 dias'
    : params.periodo === '90' ? 'Últimos 90 dias'
    : params.periodo === '365' ? 'Último ano'
    : params.periodo === 'custom' ? `${params.inicio ?? ''} a ${params.fim ?? ''}`
    : 'Últimos 30 dias'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
          <p className="mt-1 text-sm text-slate-500">Análise de desempenho com filtros por período.</p>
        </div>
        <BotoesExportar
          metricas={{
            leadsNovos: leadsNovos ?? 0,
            taxaConversao,
            dealsGanhos: totalDealsGanhos,
            receita: receitaTotal,
            ticketMedio,
            dealsPerdidos: dealsPerdidos ?? 0,
          }}
          dadosFunil={dadosFunil}
          dadosLeadsSemana={dadosLeadsSemana}
          dadosVendas={dadosVendas}
          dadosProdutos={dadosProdutos}
          periodo={periodoLabel}
        />
      </div>

      <FiltrosRelatorio
        responsaveis={responsaveis}
        mostrarFiltroResponsavel={isAdminGestor}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <CardMetrica label="Leads novos" valor={String(leadsNovos ?? 0)} />
        <CardMetrica label="Taxa de conversão" valor={`${taxaConversao}%`} subtexto="Qualificados / Total" />
        <CardMetrica label="Deals ganhos" valor={String(totalDealsGanhos)} />
        <CardMetrica label="Receita" valor={formatarMoeda(receitaTotal)} />
        <CardMetrica label="Ticket médio" valor={formatarMoeda(ticketMedio)} subtexto={`${dealsPerdidos ?? 0} perdidos`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Funil do Pipeline</CardTitle></CardHeader>
          <CardContent><GraficoFunil dados={dadosFunil} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Leads por semana</CardTitle></CardHeader>
          <CardContent><GraficoLeadsPeriodo dados={dadosLeadsSemana} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Vendas por vendedor</CardTitle></CardHeader>
          <CardContent><GraficoVendasVendedor dados={dadosVendas} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Ranking de vendas</CardTitle></CardHeader>
          <CardContent><TabelaResumoVendas dados={dadosVendas} /></CardContent>
        </Card>
      </div>

      {dadosProdutos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Produtos Mais Vendidos</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-slate-500">
                    <th className="pb-2 pr-4">Produto</th>
                    <th className="pb-2 pr-4 text-right">Qtd</th>
                    <th className="pb-2 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosProdutos.map((p, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4 text-slate-700">{p.nome}</td>
                      <td className="py-2 pr-4 text-right text-slate-600">{p.quantidade}</td>
                      <td className="py-2 text-right font-medium text-slate-900">{formatarMoeda(p.receita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
