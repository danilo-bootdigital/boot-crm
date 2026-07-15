import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  montarFiltros, rotuloPeriodo, STATUS_OPCOES, TODOS_STATUS,
  type TotaisPedidosFornecedor, type ConsolidadoFornecedor, type DetalhePedido,
} from '@/lib/relatorios/pedidos-por-fornecedor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPCOES.map((s) => [s.valor, s.label])
)

// PT-BR Excel: separador ';' + decimal com vírgula.
function csvCampo(valor: unknown): string {
  const str = String(valor ?? '')
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
function moedaCsv(v: number): string {
  return Number(v ?? 0).toFixed(2).replace('.', ',')
}
function moedaBr(v: number): string {
  return Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, nome, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })

  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const formato = (params.formato ?? 'csv').toLowerCase()
  const filtros = montarFiltros(params)
  if (!filtros.valido) {
    return NextResponse.json({ error: filtros.motivoInvalido ?? 'Filtros inválidos' }, { status: 400 })
  }

  // Busca TODOS os registros dos filtros (p_limit = null).
  const [rTot, rCons, rDet] = await Promise.all([
    supabase.rpc('relatorio_pedidos_fornecedor_totais', filtros.rpc),
    supabase.rpc('relatorio_pedidos_fornecedor_consolidado', filtros.rpc),
    supabase.rpc('relatorio_pedidos_fornecedor_detalhe', { ...filtros.rpc, p_limit: null, p_offset: 0 }),
  ])
  if (rTot.error || rCons.error || rDet.error) {
    return NextResponse.json({ error: rTot.error?.message || rCons.error?.message || rDet.error?.message }, { status: 500 })
  }

  const totais = (rTot.data?.[0] ?? null) as TotaisPedidosFornecedor | null
  const consolidado = (rCons.data ?? []) as ConsolidadoFornecedor[]
  const detalhe = (rDet.data ?? []) as DetalhePedido[]

  if (!totais || totais.qtd_pedidos === 0) {
    return NextResponse.json({ error: 'Nenhum pedido encontrado para exportar.' }, { status: 400 })
  }

  // Rótulos dos filtros para o cabeçalho do relatório
  let fornecedorLabel = 'Todos os fornecedores'
  if (filtros.fornecedorId) fornecedorLabel = consolidado[0]?.fornecedor ?? 'Fornecedor selecionado'

  let responsavelLabel = 'Todos os responsáveis'
  if (filtros.responsavelId) {
    const { data: resp } = await supabase
      .from('profiles').select('nome').eq('id', filtros.responsavelId).single()
    responsavelLabel = resp?.nome ?? 'Responsável selecionado'
  }

  const statusLabel = filtros.statusSelecionados.length === TODOS_STATUS.length
    ? 'Todos os status'
    : filtros.statusSelecionados.map((s) => STATUS_LABEL[s] ?? s).join(', ')

  const periodoLabel = rotuloPeriodo(filtros.inicioData, filtros.fimData)
  const geradoEm = new Date().toLocaleString('pt-BR')
  const dataArquivo = filtros.fimData || new Date().toISOString().slice(0, 10)

  // ============================================================
  // CSV — tabela detalhada
  // ============================================================
  if (formato === 'csv') {
    const sep = ';'
    const cols = ['Numero', 'Data', 'Fornecedor', 'Cliente', 'Responsavel', 'Status', 'Itens', 'Subtotal', 'Desconto', 'Frete', 'Valor Final']
    let csv = cols.join(sep) + '\n'
    for (const p of detalhe) {
      csv += [
        p.numero,
        new Date(p.criado_em).toLocaleDateString('pt-BR'),
        csvCampo(p.fornecedor),
        csvCampo(p.cliente),
        csvCampo(p.responsavel),
        csvCampo(STATUS_LABEL[p.status] ?? p.status),
        Number(p.qtd_itens),
        moedaCsv(p.subtotal),
        moedaCsv(p.desconto),
        moedaCsv(p.frete),
        moedaCsv(p.valor_final),
      ].join(sep) + '\n'
    }
    const bom = '﻿'
    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="pedidos-por-fornecedor-${dataArquivo}.csv"`,
      },
    })
  }

  // ============================================================
  // XLSX — Aba Resumo + Aba Pedidos
  // ============================================================
  if (formato === 'xlsx') {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    const resumo: (string | number)[][] = [
      ['Relatório de Pedidos por Fornecedor'],
      [],
      ['Fornecedor', fornecedorLabel],
      ['Período', periodoLabel],
      ['Status', statusLabel],
      ['Responsável', responsavelLabel],
      ['Gerado em', geradoEm],
      ['Exportado por', perfil.nome],
      [],
      ['Indicadores'],
      ['Pedidos', Number(totais.qtd_pedidos)],
      ['Valor total', Number(totais.valor_total)],
      ['Ticket médio', Number(totais.ticket_medio)],
      ['Itens', Number(totais.qtd_itens)],
      ['Clientes', Number(totais.qtd_clientes)],
      ['Fornecedores', Number(totais.qtd_fornecedores)],
      ['Total de descontos', Number(totais.total_desconto)],
      ['Total de fretes', Number(totais.total_frete)],
      [],
      ['Consolidação por fornecedor'],
      ['Fornecedor', 'Pedidos', 'Itens', 'Subtotal', 'Descontos', 'Frete', 'Valor final', 'Ticket médio', 'Part. %'],
      ...consolidado.map((c) => [
        c.fornecedor, Number(c.qtd_pedidos), Number(c.qtd_itens), Number(c.subtotal),
        Number(c.desconto), Number(c.frete), Number(c.valor_final), Number(c.ticket_medio), Number(c.participacao),
      ]),
    ]
    const wsResumo = XLSX.utils.aoa_to_sheet(resumo)
    wsResumo['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

    const pedidos: (string | number)[][] = [
      ['Número', 'Data', 'Fornecedor', 'Cliente', 'Responsável', 'Status', 'Itens', 'Subtotal', 'Desconto', 'Frete', 'Valor final'],
      ...detalhe.map((p) => [
        Number(p.numero),
        new Date(p.criado_em).toLocaleDateString('pt-BR'),
        p.fornecedor, p.cliente, p.responsavel,
        STATUS_LABEL[p.status] ?? p.status,
        Number(p.qtd_itens), Number(p.subtotal), Number(p.desconto), Number(p.frete), Number(p.valor_final),
      ]),
    ]
    const wsPedidos = XLSX.utils.aoa_to_sheet(pedidos)
    wsPedidos['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 24 }, { wch: 24 }, { wch: 20 }, { wch: 14 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, wsPedidos, 'Pedidos')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="pedidos-por-fornecedor-${dataArquivo}.xlsx"`,
      },
    })
  }

  // ============================================================
  // PDF — paisagem, cabeçalho repetido, paginação
  // ============================================================
  if (formato === 'pdf') {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 32

    const totalPedidosStr = String(totais.qtd_pedidos)
    const infoLinhas = [
      `Fornecedor: ${fornecedorLabel}`,
      `Período: ${periodoLabel}`,
      `Status: ${statusLabel}`,
      `Responsável: ${responsavelLabel}`,
    ]

    const body = detalhe.map((p) => [
      `#${p.numero}`,
      new Date(p.criado_em).toLocaleDateString('pt-BR'),
      p.fornecedor,
      p.cliente,
      p.responsavel,
      STATUS_LABEL[p.status] ?? p.status,
      String(Number(p.qtd_itens)),
      moedaBr(p.subtotal),
      moedaBr(p.desconto),
      moedaBr(p.frete),
      moedaBr(p.valor_final),
    ])

    // Linha de totais gerais
    const foot = [[
      'Totais', '', '', '', '', '',
      String(Number(totais.qtd_itens)),
      moedaBr(totais.total_subtotal),
      moedaBr(totais.total_desconto),
      moedaBr(totais.total_frete),
      moedaBr(totais.valor_total),
    ]]

    autoTable(doc, {
      startY: margin + 78,
      head: [['#', 'Data', 'Fornecedor', 'Cliente', 'Responsável', 'Status', 'Itens', 'Subtotal', 'Desconto', 'Frete', 'Valor final']],
      body,
      foot,
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: {
        6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' },
        9: { halign: 'right' }, 10: { halign: 'right' },
      },
      margin: { left: margin, right: margin, top: margin + 78 },
      showFoot: 'lastPage',
      didDrawPage: () => {
        // Cabeçalho (repetido em todas as páginas)
        doc.setFillColor(241, 245, 249)
        doc.rect(0, 0, pageWidth, margin + 68, 'F')
        doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42)
        doc.text('Relatório de Pedidos por Fornecedor', margin, margin + 6)
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105)
        infoLinhas.forEach((linha, i) => {
          const col = i < 2 ? margin : pageWidth / 2
          const row = margin + 22 + (i % 2) * 12
          doc.text(linha, col, row)
        })
        doc.setFontSize(8); doc.setTextColor(15, 23, 42)
        doc.text(`Pedidos: ${totalPedidosStr}   Valor total: ${moedaBr(totais.valor_total)}`, margin, margin + 58)

        // Rodapé
        const pageAtual = doc.getNumberOfPages()
        doc.setFontSize(7); doc.setTextColor(148, 163, 184)
        doc.text(`Gerado em ${geradoEm} por ${perfil.nome}`, margin, pageHeight - 12)
        doc.text(`Página ${pageAtual}`, pageWidth - margin, pageHeight - 12, { align: 'right' })
      },
    })

    // Renumera o rodapé com o total real de páginas
    const totalPaginas = doc.getNumberOfPages()
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i)
      doc.setFillColor(255, 255, 255)
      doc.rect(pageWidth - margin - 70, pageHeight - 22, 70, 14, 'F')
      doc.setFontSize(7); doc.setTextColor(148, 163, 184)
      doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - margin, pageHeight - 12, { align: 'right' })
    }

    const arrayBuffer = doc.output('arraybuffer')
    return new NextResponse(new Uint8Array(arrayBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="pedidos-por-fornecedor-${dataArquivo}.pdf"`,
      },
    })
  }

  return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
}
