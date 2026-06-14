import { formatarMoeda } from '@/lib/utils'

// Paleta verde suave DPRIME
const GREEN = [47, 143, 70] as const      // #2F8F46 - verde principal
const GREEN_LIGHT = [234, 244, 236] as const // #EAF4EC - verde claro
const GREEN_BORDER = [201, 221, 204] as const // #C9DDCC - verde borda
const DARK_TEXT = [43, 43, 43] as const    // #2B2B2B
const GRAY_TEXT = [107, 107, 107] as const // #6B6B6B
const WHITE = [255, 255, 255] as const

interface OrcamentoItem {
  id: string
  descricao: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
  subtotal: number
  product_id: string | null
  marca?: string | null
  codigo?: string | null
  unidade?: string | null
}

interface OrcamentoData {
  id: string
  numero: number
  status: string
  criado_em: string
  responsavel: { nome: string } | null
  lead: { id: string; nome: string; telefone: string; email: string; endereco: string; cpf_cnpj: string } | null
  contato: {
    id: string
    nome: string
    telefone: string | null
    email: string | null
    cpf_cnpj: string | null
    cargo: string | null
    tipo_pessoa: string | null
    categoria_cliente: string | null
    especialidade: string | null
    tipo_conselho: string | null
    numero_conselho: string | null
    uf_conselho: string | null
    observacoes: string | null
    empresa_id: string | null
    empresa: { id: string; nome: string } | null
    endereco: string | null
    endereco_numero: string | null
    endereco_complemento: string | null
    endereco_bairro: string | null
    endereco_cidade: string | null
    endereco_estado: string | null
    endereco_cep: string | null
  } | null
  deal: { id: string; titulo: string; contato_id: string } | null
  aprovador: { nome: string } | null
  fornecedor: { nome: string } | null
  carrier: { nome: string } | null
  organizacao: {
    nome: string
    nome_fantasia: string | null
    cnpj: string | null
    telefone: string | null
    email: string | null
    endereco: string | null
    logo_url: string | null
    site: string | null
    instagram: string | null
  } | null
  itens: OrcamentoItem[]
  valor_subtotal: number
  desconto_geral: number
  frete: number
  frete_regiao: string | null
  endereco_entrega: string | null
  forma_pagamento: string | null
  valor_total: number
  observacoes: string | null
  nota_tipo_pessoa: string | null
  nota_nome: string | null
  nota_documento: string | null
  nota_razao_social: string | null
  nota_nome_fantasia: string | null
  nota_endereco: string | null
  nota_ie: string | null
  nota_im: string | null
}

export async function gerarPdf(orcamento: OrcamentoData) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  // Helper para carregar logo
  async function loadLogo(url: string): Promise<string | null> {
    try {
      const response = await fetch(url)
      if (!response.ok) return null
      const buffer = await response.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const contentType = response.headers.get('content-type') || 'image/png'
      return `data:${contentType};base64,${base64}`
    } catch {
      return null
    }
  }

  // === HEADER PREMIUM ===
  const headerTop = 12
  const headerBottom = 55

  const org = orcamento.organizacao

  // Lado esquerdo: Logo maior
  if (org?.logo_url) {
    const logoData = await loadLogo(org.logo_url)
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', margin, headerTop, 45, 22)
      } catch {
        // Logo não carregado
      }
    }
  }

  // Nome da empresa
  doc.setTextColor(...GREEN)
  doc.setFontSize(14)
  doc.setFont(undefined!, 'bold')
  doc.text(org?.nome_fantasia || org?.nome || 'DPRIME', margin, headerTop + 28)

  doc.setFontSize(10)
  doc.setFont(undefined!, 'normal')
  doc.setTextColor(...GRAY_TEXT)
  doc.text('Representação Farmacêutica', margin, headerTop + 35)

  // Contatos organizados
  const contatos = [
    org?.telefone ? `Tel: ${org.telefone}` : null,
    org?.email,
    org?.site,
    org?.instagram,
  ].filter(Boolean)

  doc.setFontSize(9)
  let contactY = headerTop + 42
  doc.text(contatos.slice(0, 2).join('   |   '), margin, contactY)
  if (contatos.length > 2) {
    doc.text(contatos.slice(2).join('   |   '), margin, contactY + 5)
  }

  // Lado direito: ORÇAMENTO - título grande
  const rightX = pageWidth - margin

  doc.setTextColor(...GREEN)
  doc.setFontSize(34)
  doc.setFont(undefined!, 'bold')
  doc.text('ORÇAMENTO', rightX, headerTop + 20, { align: 'right' })

  // Linha decorativa verde
  const titleWidth = doc.getTextWidth('ORÇAMENTO')
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(1.2)
  doc.line(rightX - titleWidth, headerTop + 24, rightX, headerTop + 24)

  // Dados do orçamento - mais legíveis
  doc.setFontSize(13)
  doc.setFont(undefined!, 'normal')

  const dataFormatada = new Date(orcamento.criado_em).toLocaleDateString('pt-BR')

  let rightY = headerTop + 34
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont(undefined!, 'bold')
  doc.text('Nº', rightX, rightY, { align: 'right' })
  doc.setTextColor(...DARK_TEXT)
  doc.setFont(undefined!, 'normal')
  doc.text(orcamento.numero.toString().padStart(3, '0'), rightX - 12, rightY, { align: 'right' })

  rightY += 7
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont(undefined!, 'bold')
  doc.text('Data:', rightX, rightY, { align: 'right' })
  doc.setTextColor(...DARK_TEXT)
  doc.setFont(undefined!, 'normal')
  doc.text(dataFormatada, rightX - 28, rightY, { align: 'right' })

  rightY += 7
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont(undefined!, 'bold')
  doc.text('Responsável:', rightX, rightY, { align: 'right' })
  doc.setTextColor(...DARK_TEXT)
  doc.setFont(undefined!, 'normal')
  doc.text(orcamento.responsavel?.nome || '—', rightX - 40, rightY, { align: 'right' })

  // Linha divisória verde
  doc.setDrawColor(...GREEN_BORDER)
  doc.setLineWidth(0.8)
  doc.line(margin, headerBottom, pageWidth - margin, headerBottom)

  // === TRÊS COLUNAS PRINCIPAIS ===
  let y = headerBottom + 12
  const colGap = 10
  const colWidth = (contentWidth - colGap * 2) / 3
  const lineH = 6 // Espaçamento entre linhas 1.4-1.6
  const cardPadding = 20

  // Helper para desenhar card premium
  const drawCard = (x: number, y: number, w: number, title: string, lines: { label: string; value: string }[]) => {
    const titleH = 22
    const contentH = lines.length * lineH + 8
    const cardH = titleH + contentH

    // Fundo branco com borda suave
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...GREEN_BORDER)
    doc.setLineWidth(0.5)
    doc.roundedRect(x, y, w, cardH, 3, 3, 'FD')

    // Barra de título verde suave
    doc.setFillColor(...GREEN_LIGHT)
    doc.roundedRect(x, y, w, titleH, 3, 3, 'F')
    doc.rect(x, y + titleH - 3, w, 3, 'F')

    // Título - 16-18px
    doc.setTextColor(...GREEN)
    doc.setFontSize(16)
    doc.setFont(undefined!, 'bold')
    doc.text(title, x + cardPadding, y + 15)

    // Conteúdo - Labels 12-13px, Valores 13-14px
    let cy = y + titleH + 10
    doc.setFontSize(12)
    lines.forEach(({ label, value }) => {
      if (value) {
        doc.setTextColor(...GRAY_TEXT)
        doc.setFont(undefined!, 'bold')
        doc.text(label, x + cardPadding, cy)
        doc.setFont(undefined!, 'normal')
        doc.setTextColor(...DARK_TEXT)
        doc.setFontSize(13)
        const valueLines = doc.splitTextToSize(value, w - cardPadding * 2 - 40)
        doc.text(valueLines, x + cardPadding + 45, cy)
        cy += lineH * valueLines.length
      }
    })

    return cardH
  }

  // Identificar cliente
  const cliente = orcamento.contato || orcamento.lead

  // Montar endereço completo
  function montarEndereco(): string | null {
    if (!cliente) return null
    if (orcamento.contato) {
      const partes: string[] = []
      if (orcamento.contato.endereco) partes.push(orcamento.contato.endereco)
      if (orcamento.contato.endereco_numero) partes.push(orcamento.contato.endereco_numero)
      if (orcamento.contato.endereco_complemento) partes.push(orcamento.contato.endereco_complemento)
      if (orcamento.contato.endereco_bairro) partes.push(orcamento.contato.endereco_bairro)
      const cidadeUFCEP: string[] = []
      if (orcamento.contato.endereco_cidade) cidadeUFCEP.push(orcamento.contato.endereco_cidade)
      if (orcamento.contato.endereco_estado) cidadeUFCEP.push(orcamento.contato.endereco_estado)
      if (orcamento.contato.endereco_cep) cidadeUFCEP.push(orcamento.contato.endereco_cep)
      if (cidadeUFCEP.length > 0) partes.push(cidadeUFCEP.join(' - '))
      return partes.length > 0 ? partes.join(', ') : null
    }
    return orcamento.lead?.endereco || null
  }

  const endereco = montarEndereco()

  // COLUNA 1: DADOS DO CLIENTE
  const col1Lines: { label: string; value: string }[] = [
    { label: 'Nome:', value: cliente?.nome || '—' },
    { label: 'CPF/CNPJ:', value: (orcamento.contato?.cpf_cnpj || orcamento.lead?.cpf_cnpj) || '' },
    { label: 'Telefone:', value: cliente?.telefone || '' },
    { label: 'E-mail:', value: cliente?.email || '' },
    { label: 'Empresa:', value: orcamento.contato?.empresa?.nome || '' },
    { label: 'Categoria:', value: orcamento.contato?.categoria_cliente || '' },
    { label: 'Especialidade:', value: orcamento.contato?.especialidade || '' },
    { label: 'Conselho:', value: (orcamento.contato?.tipo_conselho && orcamento.contato?.numero_conselho)
      ? `${orcamento.contato.tipo_conselho} ${orcamento.contato.numero_conselho}${orcamento.contato.uf_conselho ? ` - ${orcamento.contato.uf_conselho}` : ''}`
      : '' },
    { label: 'Tipo:', value: orcamento.contato?.tipo_pessoa || '' },
    { label: 'Endereço:', value: endereco || '' },
  ].filter(l => l.value)

  const col1H = drawCard(margin, y, colWidth, 'DADOS DO CLIENTE', col1Lines)

  // COLUNA 2: DADOS PARA EMISSÃO DA NOTA
  const isPF = orcamento.nota_tipo_pessoa === 'PF'
  const col2Lines: { label: string; value: string }[] = [
    { label: 'Tipo:', value: isPF ? 'Pessoa Física' : (orcamento.nota_tipo_pessoa === 'PJ' ? 'Pessoa Jurídica' : '—') },
    { label: isPF ? 'Nome:' : 'Razão Social:', value: orcamento.nota_nome || '' },
    { label: isPF ? 'CPF:' : 'CNPJ:', value: orcamento.nota_documento || '' },
    ...(isPF ? [
      { label: 'Telefone:', value: cliente?.telefone || '' },
      { label: 'E-mail:', value: cliente?.email || '' },
    ] : [
      { label: 'Nome Fantasia:', value: orcamento.nota_nome_fantasia || '' },
      { label: 'IE:', value: orcamento.nota_ie || '' },
      { label: 'IM:', value: orcamento.nota_im || '' },
    ]),
    { label: 'Endereço:', value: orcamento.nota_endereco || '' },
  ].filter(l => l.value)

  if (isPF && !orcamento.nota_nome) {
    col2Lines.push({ label: '', value: 'Dados conforme cadastro do contato' })
  }

  const col2H = drawCard(margin + colWidth + colGap, y, colWidth, 'DADOS PARA EMISSÃO DA NOTA', col2Lines)

  // COLUNA 3: ENDEREÇO DE ENTREGA
  const temEntrega = orcamento.endereco_entrega && orcamento.endereco_entrega.trim().length > 0
  let col3H = 0

  if (temEntrega) {
    const col3Lines: { label: string; value: string }[] = [
      { label: 'Endereço:', value: orcamento.endereco_entrega! },
    ].filter(l => l.value)

    col3H = drawCard(margin + (colWidth + colGap) * 2, y, colWidth, 'ENDEREÇO DE ENTREGA', col3Lines)
  }

  // Altura máxima das colunas
  const maxColH = Math.max(col1H, col2H, col3H)
  y += maxColH + 16

  // === FORNECEDOR E FRETE ===
  if (orcamento.fornecedor || orcamento.carrier) {
    const fornecY = y
    const fornecH = 45

    // Card premium
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...GREEN_BORDER)
    doc.setLineWidth(0.5)
    doc.roundedRect(margin, fornecY, contentWidth, fornecH, 3, 3, 'FD')

    // Barra de título
    doc.setFillColor(...GREEN_LIGHT)
    doc.roundedRect(margin, fornecY, contentWidth, 22, 3, 3, 'F')
    doc.rect(margin, fornecY + 19, contentWidth, 3, 'F')

    doc.setTextColor(...GREEN)
    doc.setFontSize(16)
    doc.setFont(undefined!, 'bold')
    doc.text('FORNECEDOR / FRETE', margin + cardPadding, fornecY + 15)

    // Conteúdo
    let fx = margin + cardPadding
    let fy = fornecY + 32

    doc.setFontSize(13)

    if (orcamento.fornecedor) {
      doc.setTextColor(...GRAY_TEXT)
      doc.setFont(undefined!, 'bold')
      doc.text('Fornecedor:', fx, fy)
      fx += 42
      doc.setTextColor(...DARK_TEXT)
      doc.setFont(undefined!, 'normal')
      doc.text(orcamento.fornecedor.nome, fx, fy)
      fx += doc.getTextWidth(orcamento.fornecedor.nome) + 20
    }

    if (orcamento.carrier) {
      doc.setTextColor(...GRAY_TEXT)
      doc.setFont(undefined!, 'bold')
      doc.text('Frete por:', fx, fy)
      fx += 35
      doc.setTextColor(...DARK_TEXT)
      doc.setFont(undefined!, 'normal')
      doc.text(orcamento.carrier.nome, fx, fy)
    }

    y += fornecH + 16
  }

  // === PRODUTOS ===
  doc.setFillColor(...GREEN_LIGHT)
  doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F')
  doc.rect(margin, y + 19, contentWidth, 3, 'F')

  doc.setTextColor(...GREEN)
  doc.setFontSize(16)
  doc.setFont(undefined!, 'bold')
  doc.text('PRODUTOS', margin + cardPadding, y + 15)

  y += 26

  // Tabela premium
  autoTable(doc, {
    startY: y,
    head: [['#', 'DESCRIÇÃO', 'APRESENTAÇÃO', 'QTD', 'VALOR UNIT.', 'DESC.', 'VALOR TOTAL']],
    body: orcamento.itens.map((item, i) => [
      (i + 1).toString(),
      item.descricao,
      [item.marca || '', item.codigo || ''].filter(Boolean).join(' | ') || '—',
      item.quantidade.toString(),
      formatarMoeda(item.preco_unitario),
      item.desconto_item > 0 ? `${item.desconto_item}%` : '—',
      formatarMoeda(item.subtotal),
    ]),
    styles: {
      fontSize: 13,
      cellPadding: 4,
      lineColor: [...GREEN_BORDER],
      lineWidth: 0.3,
      textColor: [...DARK_TEXT],
    },
    headStyles: {
      fillColor: [...GREEN],
      textColor: [...WHITE],
      fontStyle: 'bold',
      fontSize: 12,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 13,
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', fontStyle: 'bold', fontSize: 14 },
      2: { cellWidth: 50, fontSize: 11, textColor: [...GRAY_TEXT] },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 38, halign: 'right' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
  })

  // === RESUMO FINANCEIRO ===
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
  let ty = finalY + 12

  const rightAlign = pageWidth - margin
  const labelX = rightAlign - 90
  const valueX = rightAlign

  doc.setFontSize(14)

  // Subtotal
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont(undefined!, 'normal')
  doc.text('Subtotal:', labelX, ty)
  doc.setTextColor(...DARK_TEXT)
  doc.text(formatarMoeda(orcamento.valor_subtotal), valueX, ty, { align: 'right' })
  ty += 8

  // Desconto
  if (orcamento.desconto_geral > 0) {
    doc.setTextColor(...GRAY_TEXT)
    doc.setFont(undefined!, 'normal')
    doc.text(`Desconto (${orcamento.desconto_geral}%):`, labelX, ty)
    doc.setTextColor(200, 50, 50)
    doc.text(`-${formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}`, valueX, ty, { align: 'right' })
    ty += 8
  }

  // Frete
  if (orcamento.frete > 0) {
    doc.setTextColor(...GRAY_TEXT)
    doc.setFont(undefined!, 'normal')
    doc.text('Frete:', labelX, ty)
    doc.setTextColor(...DARK_TEXT)
    doc.text(`+${formatarMoeda(orcamento.frete)}`, valueX, ty, { align: 'right' })
    ty += 8
  }

  // TOTAL premium - maior destaque
  ty += 6
  const totalW = 110
  const totalH = 22
  doc.setFillColor(...GREEN)
  doc.roundedRect(rightAlign - totalW, ty - 8, totalW, totalH, 3, 3, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(16)
  doc.setFont(undefined!, 'bold')
  doc.text('TOTAL', rightAlign - totalW + 10, ty + 6)
  doc.setFontSize(24)
  doc.text(formatarMoeda(orcamento.valor_total), rightAlign - 6, ty + 6, { align: 'right' })

  // === RODAPÉ ===
  const footerY = pageHeight - 12

  // Linha fina verde
  doc.setDrawColor(...GREEN_BORDER)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)

  doc.setFontSize(9)
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont(undefined!, 'normal')

  const dataGeracao = new Date().toLocaleDateString('pt-BR')
  const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  doc.text(`Proposta gerada em ${dataGeracao} às ${horaGeracao}`, margin, footerY)
  doc.text('Documento gerado automaticamente pelo CRM DPRIME.', margin, footerY + 5)

  return Buffer.from(doc.output('arraybuffer'))
}
