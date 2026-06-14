import { formatarMoeda } from '@/lib/utils'

// Paleta verde suave DPRIME
const GREEN = [47, 143, 70] as const
const GREEN_LIGHT = [234, 244, 236] as const
const GREEN_LIGHT2 = [240, 247, 242] as const
const GREEN_BORDER = [201, 221, 204] as const
const DARK_TEXT = [43, 43, 43] as const
const GRAY_TEXT = [107, 107, 107] as const
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

// Quebra inteligente de endereço
function quebrarEnderecoInteligente(text: string): string {
  if (!text) return ''
  return text
    .replace(/,\s*(\d+)/g, ',\n$1')     // vírgula + número → quebra antes do número
    .replace(/\s+-\s+/g, '\n')           // " - " → quebra
}

export async function gerarPdf(orcamento: OrcamentoData) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  const setFill = (color: readonly number[]) => doc.setFillColor(color[0], color[1], color[2])
  const setText = (color: readonly number[]) => doc.setTextColor(color[0], color[1], color[2])
  const setDraw = (color: readonly number[]) => doc.setDrawColor(color[0], color[1], color[2])

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

  // ==========================================================
  // HEADER (50mm de altura)
  // ==========================================================
  const headerTop = 10
  const org = orcamento.organizacao

  if (org?.logo_url) {
    const logoData = await loadLogo(org.logo_url)
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', margin, headerTop, 40, 20)
      } catch {
        // Logo não carregado
      }
    }
  }

  setText(GRAY_TEXT)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Representação Farmacêutica', margin, headerTop + 23)

  const tel = org?.telefone || '(19) 97819-3530'
  const email = org?.email || 'contato@dprimerepresentacao.com.br'
  const site = org?.site || 'www.dprimerepresentacao.com.br'
  const instagram = org?.instagram || '@dprimerepresentacao'

  const drawContact = (x: number, y: number, icon: string, text: string) => {
    setFill(GREEN)
    doc.circle(x + 3, y - 2.5, 2, 'F')
    setText(WHITE)
    doc.setFontSize(6)
    doc.text(icon, x + 3, y - 1.5, { align: 'center' })
    setText(DARK_TEXT)
    doc.setFontSize(9)
    doc.text(text, x + 8, y - 1)
  }

  drawContact(margin, headerTop + 30, '☎', tel)
  drawContact(margin + 60, headerTop + 30, '✉', email)
  drawContact(margin, headerTop + 37, '🌐', site)
  drawContact(margin + 75, headerTop + 37, '📷', instagram)

  // LADO DIREITO: ORÇAMENTO
  const numBoxW = 55
  const numBoxH = 14
  const numBoxX = pageWidth - margin - numBoxW
  const numBoxY = headerTop + 8

  setText(GREEN)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('ORÇAMENTO', pageWidth - margin, headerTop + 6, { align: 'right' })

  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  setFill(GREEN_LIGHT2)
  doc.roundedRect(numBoxX, numBoxY, numBoxW, numBoxH, 2, 2, 'FD')
  setText(GREEN)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Nº ${orcamento.numero.toString().padStart(3, '0')}`, numBoxX + numBoxW / 2, numBoxY + 9, { align: 'center' })

  const dataFormatada = new Date(orcamento.criado_em).toLocaleDateString('pt-BR')
  const rightDataY = numBoxY + numBoxH + 5
  const dataLabelX = numBoxX
  const propostaLabelX = numBoxX + 45

  setFill(GREEN)
  doc.circle(dataLabelX + 3, rightDataY - 2, 2, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('📅', dataLabelX + 3, rightDataY - 1, { align: 'center' })
  setText(GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Data:', dataLabelX + 8, rightDataY - 1)
  setText(DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text(dataFormatada, dataLabelX + 24, rightDataY - 1)

  setFill(GREEN)
  doc.circle(propostaLabelX + 3, rightDataY - 2, 2, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('📄', propostaLabelX + 3, rightDataY - 1, { align: 'center' })
  setText(GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Proposta:', propostaLabelX + 8, rightDataY - 1)
  setText(DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text(orcamento.numero.toString().padStart(3, '0'), propostaLabelX + 30, rightDataY - 1)

  setFill(GREEN)
  doc.circle(dataLabelX + 3, rightDataY + 5, 2, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('⏰', dataLabelX + 3, rightDataY + 6, { align: 'center' })
  setText(GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Validade:', dataLabelX + 8, rightDataY + 6)
  setText(DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text('30 dias', dataLabelX + 30, rightDataY + 6)

  setFill(GREEN)
  doc.circle(dataLabelX + 3, rightDataY + 11, 2, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('👤', dataLabelX + 3, rightDataY + 12, { align: 'center' })
  setText(GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Responsável:', dataLabelX + 8, rightDataY + 12)
  setText(DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text(orcamento.responsavel?.nome || '—', dataLabelX + 36, rightDataY + 12)

  // Linha horizontal verde
  const headerBottom = headerTop + 50
  setDraw(GREEN)
  doc.setLineWidth(1)
  doc.line(margin, headerBottom, pageWidth - margin, headerBottom)

  // ==========================================================
  // TRÊS CARDS
  // ==========================================================
  const cliente = orcamento.contato || orcamento.lead

  function montarEnderecoContato(): string | null {
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

  const endereco = montarEnderecoContato()

  // === CARD 1: DADOS DO CLIENTE ===
  const col1Lines: { label: string; value: string }[] = [
    { label: 'Nome:', value: cliente?.nome || '—' },
    { label: 'CPF/CNPJ:', value: (orcamento.contato?.cpf_cnpj || orcamento.lead?.cpf_cnpj) || '' },
    { label: 'Telefone:', value: cliente?.telefone || '' },
    { label: 'E-mail:', value: cliente?.email || '' },
    { label: 'Empresa:', value: orcamento.contato?.empresa?.nome || '' },
    { label: 'Categoria:', value: orcamento.contato?.categoria_cliente || '' },
    { label: 'Especialidade:', value: orcamento.contato?.especialidade || '' },
    { label: 'Conselho / Nº:', value: (orcamento.contato?.tipo_conselho && orcamento.contato?.numero_conselho)
      ? `${orcamento.contato.tipo_conselho} ${orcamento.contato.numero_conselho}${orcamento.contato.uf_conselho ? ` - ${orcamento.contato.uf_conselho}` : ''}`
      : '' },
    { label: 'Tipo de pessoa:', value: (orcamento.contato?.tipo_pessoa && orcamento.contato?.categoria_cliente)
      ? `${orcamento.contato.tipo_pessoa} - ${orcamento.contato.categoria_cliente}`
      : '' },
    { label: 'Endereço:', value: quebrarEnderecoInteligente(endereco || '') },
  ].filter(l => l.value)

  // === CARD 2: DADOS PARA EMISSÃO DA NOTA ===
  const isPF = orcamento.nota_tipo_pessoa === 'PF'
  const col2Lines: { label: string; value: string }[] = [
    { label: 'Tipo:', value: isPF ? 'Pessoa Física' : (orcamento.nota_tipo_pessoa === 'PJ' ? 'Pessoa Jurídica' : '—') },
    { label: 'Nome:', value: orcamento.nota_nome || '' },
    { label: isPF ? 'CPF:' : 'CNPJ:', value: orcamento.nota_documento || '' },
    ...(isPF ? [
      { label: 'Telefone:', value: cliente?.telefone || '' },
      { label: 'E-mail:', value: cliente?.email || '' },
    ] : [
      { label: 'Nome Fantasia:', value: orcamento.nota_nome_fantasia || '' },
      { label: 'IE:', value: orcamento.nota_ie || '' },
      { label: 'IM:', value: orcamento.nota_im || '' },
    ]),
    { label: 'Endereço:', value: quebrarEnderecoInteligente(orcamento.nota_endereco || '') },
  ].filter(l => l.value)
  const showInfoPF = isPF

  // === CARD 3: ENDEREÇO DE ENTREGA (SEMPRE VISÍVEL) ===
  const temEntrega = !!(orcamento.endereco_entrega && orcamento.endereco_entrega.trim().length > 0)
  const col3Lines: { label: string; value: string }[] = []

  if (temEntrega) {
    col3Lines.push(
      { label: 'Nome / Destinatário:', value: cliente?.nome || '' },
      { label: 'Telefone:', value: cliente?.telefone || '' },
      { label: 'Endereço:', value: quebrarEnderecoInteligente(orcamento.endereco_entrega!) },
    )
    if (orcamento.contato?.endereco_bairro) {
      col3Lines.push({ label: 'Bairro:', value: orcamento.contato.endereco_bairro })
    }
    if (orcamento.contato?.endereco_cidade) {
      const cidadeUF = orcamento.contato.endereco_estado
        ? `${orcamento.contato.endereco_cidade} - ${orcamento.contato.endereco_estado}`
        : orcamento.contato.endereco_cidade
      col3Lines.push({ label: 'Cidade / UF:', value: cidadeUF })
    }
    if (orcamento.contato?.endereco_cep) {
      col3Lines.push({ label: 'CEP:', value: orcamento.contato.endereco_cep })
    }
  } else {
    col3Lines.push({
      label: '',
      value: 'Endereço de entrega não informado.'
    })
  }

  // === CÁLCULO DE ALTURA DOS CARDS ===
  // minLines = 6, maxLines = maior entre os 3
  const cardLineH = 4.8
  const cardPadding = 10
  const cardHeaderH = 26
  const cardInfoH = showInfoPF ? 18 : 0

  // Calcular quantas linhas cada card precisa
  const calculateCardLines = (lines: { label: string; value: string }[]) => {
    let totalLines = 0
    lines.forEach(({ value }) => {
      if (value) {
        // Endereço com quebras manuais conta como múltiplas linhas
        const lineCount = value.split('\n').length
        totalLines += Math.max(1, lineCount)
      }
    })
    return totalLines
  }

  const colGap = 6
  const colWidth = (contentWidth - colGap * 2) / 3

  const card1Lines = Math.max(6, calculateCardLines(col1Lines))
  const card2Lines = Math.max(6, calculateCardLines(col2Lines))
  const card3Lines = Math.max(6, calculateCardLines(col3Lines))
  const maxLines = Math.max(card1Lines, card2Lines, card3Lines)

  // Altura UNIFORME baseada no maior card
  const cardH = cardHeaderH + 5 + (maxLines * cardLineH) + cardInfoH + 5

  const cardsY = headerBottom + 6

  // === HELPER: DESENHAR CARD COM LARGURA MÍNIMA SEGURA ===
  const drawCard = (
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    icon: string,
    lines: { label: string; value: string }[],
    infoText?: string
  ) => {
    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.5)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, y, w, h, 4, 4, 'FD')

    setFill(GREEN)
    doc.circle(x + 16, y + 12, 5, 'F')
    setText(WHITE)
    doc.setFontSize(7)
    doc.text(icon, x + 16, y + 14, { align: 'center' })

    setText(GREEN)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(title, x + 26, y + 14)

    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.3)
    doc.line(x + 4, y + 20, x + w - 4, y + 20)

    let cy = y + 25
    const labelW = 28
    const valueW = Math.max(w - cardPadding * 2 - labelW, 40)

    lines.forEach((line) => {
      if (line.value && cy < y + h - cardInfoH - 4) {
        setText(GRAY_TEXT)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.text(line.label || '', x + cardPadding, cy)

        setText(DARK_TEXT)
        doc.setFontSize(9)
        // Quebras manuais já estão no texto
        const valueLines = line.value.split('\n')
        doc.text(valueLines, x + cardPadding + labelW, cy)
        cy += cardLineH * Math.max(1, valueLines.length)
      }
    })

    if (infoText) {
      const infoBoxH = 14
      const infoBoxY = y + h - infoBoxH - 3
      setFill(GREEN_LIGHT)
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      doc.roundedRect(x + cardPadding, infoBoxY, w - cardPadding * 2, infoBoxH, 2, 2, 'FD')

      setFill(GREEN)
      doc.circle(x + cardPadding + 7, infoBoxY + infoBoxH / 2, 4, 'F')
      setText(WHITE)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('i', x + cardPadding + 7, infoBoxY + infoBoxH / 2 + 2, { align: 'center' })

      setText(DARK_TEXT)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      const safeInfoW = Math.max(w - cardPadding * 2 - 18, 30)
      const infoLines = infoText.split('\n')
      doc.text(infoLines, x + cardPadding + 15, infoBoxY + infoBoxH / 2 - 1)
    }
  }

  // Desenhar 3 cards
  drawCard(margin, cardsY, colWidth, cardH, 'DADOS DO CLIENTE', '👤', col1Lines)
  drawCard(
    margin + colWidth + colGap,
    cardsY,
    colWidth,
    cardH,
    'DADOS PARA EMISSÃO DA NOTA',
    '📋',
    col2Lines,
    showInfoPF ? 'Para Pessoa Física, os dados da nota\nfiscal são do cadastro do contato.' : undefined
  )
  drawCard(
    margin + (colWidth + colGap) * 2,
    cardsY,
    colWidth,
    cardH,
    'ENDEREÇO DE ENTREGA',
    '🚚',
    col3Lines
  )

  // ==========================================================
  // FORNECEDOR E FRETE
  // ==========================================================
  let currentY = cardsY + cardH + 6
  if (orcamento.fornecedor || orcamento.carrier) {
    const fornecY = currentY
    const fornecH = 20
    const fornecW = contentWidth / 2 - 3

    if (orcamento.fornecedor) {
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.5)
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(margin, fornecY, fornecW, fornecH, 4, 4, 'FD')

      setFill(GREEN)
      doc.circle(margin + 12, fornecY + fornecH / 2, 5, 'F')
      setText(WHITE)
      doc.setFontSize(7)
      doc.text('🏢', margin + 12, fornecY + fornecH / 2 + 2, { align: 'center' })

      setText(GREEN)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('FORNECEDOR:', margin + 22, fornecY + fornecH / 2 - 1)
      setText(DARK_TEXT)
      doc.setFont('helvetica', 'normal')
      doc.text(orcamento.fornecedor.nome, margin + 55, fornecY + fornecH / 2 - 1)
    }

    if (orcamento.carrier) {
      const freteX = margin + fornecW + 6
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.5)
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(freteX, fornecY, fornecW, fornecH, 4, 4, 'FD')

      setFill(GREEN)
      doc.circle(freteX + 12, fornecY + fornecH / 2, 5, 'F')
      setText(WHITE)
      doc.setFontSize(7)
      doc.text('🚚', freteX + 12, fornecY + fornecH / 2 + 2, { align: 'center' })

      setText(GREEN)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('FRETE POR:', freteX + 22, fornecY + fornecH / 2 - 1)
      setText(DARK_TEXT)
      doc.setFont('helvetica', 'normal')
      doc.text(orcamento.carrier.nome, freteX + 50, fornecY + fornecH / 2 - 1)
    }

    currentY += fornecH + 6
  }

  // ==========================================================
  // PRODUTOS
  // ==========================================================
  const prodY = currentY
  const prodH = 20

  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(margin, prodY, contentWidth, prodH, 4, 4, 'FD')

  setFill(GREEN)
  doc.circle(margin + 16, prodY + prodH / 2, 5, 'F')
  setText(WHITE)
  doc.setFontSize(7)
  doc.text('🛒', margin + 16, prodY + prodH / 2 + 2, { align: 'center' })

  setText(GREEN)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTOS', margin + 26, prodY + prodH / 2 + 1)

  currentY += prodH + 2

  // Construir dados da tabela
  const tableBody = orcamento.itens.map((item, i) => {
    return [
      (i + 1).toString(),
      item.descricao,
      [item.marca, item.codigo].filter(Boolean).join(' | ') || '—',
      item.quantidade.toString(),
      formatarMoeda(item.preco_unitario),
      item.desconto_item > 0 ? `${item.desconto_item}%` : '—',
      formatarMoeda(item.subtotal),
    ]
  })

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'DESCRIÇÃO', 'MARCA / CÓDIGO', 'QTD', 'VALOR UNIT.', 'DESC.', 'VALOR TOTAL']],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2]],
      lineWidth: 0.3,
      textColor: [DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]],
      valign: 'middle',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [GREEN[0], GREEN[1], GREEN[2]],
      textColor: [WHITE[0], WHITE[1], WHITE[2]],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 9,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', minCellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 35, fontSize: 7, textColor: [GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]], fontStyle: 'normal' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        // Nome do produto em bold (já está bold via bodyStyles)
      }
    },
    pageBreak: 'avoid',
    showHead: 'everyPage',
    margin: { left: margin, right: margin, bottom: 50 },
  })

  // ==========================================================
  // RESUMO FINANCEIRO
  // ==========================================================
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 20
  let ry = finalY + 4

  // Verificar espaço
  if (ry + 35 > pageHeight - 12) {
    doc.addPage()
    ry = 20
  }

  const rightAlign = pageWidth - margin
  const resumoW = 95
  const resumoX = rightAlign - resumoW
  const resumoH = 35

  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(resumoX, ry, resumoW, resumoH, 3, 3, 'FD')

  let ryi = ry + 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  setText(DARK_TEXT)
  doc.text('Subtotal:', resumoX + 6, ryi)
  doc.text(formatarMoeda(orcamento.valor_subtotal), rightAlign - 4, ryi, { align: 'right' })
  ryi += 5

  doc.text('Desconto:', resumoX + 6, ryi)
  if (orcamento.desconto_geral > 0) {
    doc.setTextColor(200, 50, 50)
    doc.text(`-${formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}`, rightAlign - 4, ryi, { align: 'right' })
  } else {
    setText(DARK_TEXT)
    doc.text('R$ 0,00', rightAlign - 4, ryi, { align: 'right' })
  }
  ryi += 5

  setText(DARK_TEXT)
  doc.text('Frete:', resumoX + 6, ryi)
  doc.text(`+${formatarMoeda(orcamento.frete)}`, rightAlign - 4, ryi, { align: 'right' })
  ryi += 4

  setFill(GREEN)
  doc.roundedRect(resumoX, ryi, resumoW, 12, 2, 2, 'F')
  setText(WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', resumoX + 6, ryi + 8)
  doc.setFontSize(12)
  doc.text(formatarMoeda(orcamento.valor_total), rightAlign - 4, ryi + 8, { align: 'right' })

  // ==========================================================
  // RODAPÉ
  // ==========================================================
  const footerY = pageHeight - 10

  setDraw(GREEN)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)

  setFill(GREEN)
  doc.circle(margin + 3, footerY, 3, 'F')
  setText(WHITE)
  doc.setFontSize(5)
  doc.text('🛡', margin + 3, footerY + 0.5, { align: 'center' })

  setText(DARK_TEXT)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const dataGeracao = new Date().toLocaleDateString('pt-BR')
  const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  doc.text(`Proposta gerada em ${dataGeracao} às ${horaGeracao}`, margin + 10, footerY - 0.5)
  doc.text('Documento gerado automaticamente pelo CRM DPRIME.', margin + 10, footerY + 3)

  return Buffer.from(doc.output('arraybuffer'))
}
