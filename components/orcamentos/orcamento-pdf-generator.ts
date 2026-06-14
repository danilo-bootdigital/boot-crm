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

export async function gerarPdf(orcamento: OrcamentoData) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  const contentWidth = pageWidth - margin * 2

  // Helpers de cor
  const setFill = (color: readonly number[]) => doc.setFillColor(color[0], color[1], color[2])
  const setText = (color: readonly number[]) => doc.setTextColor(color[0], color[1], color[2])
  const setDraw = (color: readonly number[]) => doc.setDrawColor(color[0], color[1], color[2])

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

  // Helper de quebra de texto SEGURO
  // Quebra por palavras e limita linhas para evitar quebra caractere por caractere
  const safeTextLines = (text: string, maxWidth: number, maxLines: number = 2): string[] => {
    if (!text) return []
    // Primeiro, quebrar por espaços/palavras
    const words = text.split(/\s+/)
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word
      const width = doc.getTextWidth(testLine)
      if (width <= maxWidth) {
        currentLine = testLine
      } else {
        if (currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          // Palavra única muito longa - truncar
          lines.push(word.substring(0, Math.floor(maxWidth / doc.getTextWidth('M'))))
        }
        if (lines.length >= maxLines) break
      }
    }
    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine)
    }
    return lines
  }

  // ==========================================================
  // HEADER - Layout em grid fixo
  // ==========================================================
  const headerTop = 10
  const org = orcamento.organizacao

  // Lado esquerdo: Logo + subhead + contatos
  if (org?.logo_url) {
    const logoData = await loadLogo(org.logo_url)
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', margin, headerTop, 40, 22)
      } catch {
        // Logo não carregado
      }
    }
  }

  setText(GRAY_TEXT)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Representação Farmacêutica', margin, headerTop + 25)

  const tel = org?.telefone || '(19) 97819-3530'
  const email = org?.email || 'contato@dprimerepresentacao.com.br'
  const site = org?.site || 'www.dprimerepresentacao.com.br'
  const instagram = org?.instagram || '@dprimerepresentacao'

  // Função para desenhar contato com ícone
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

  // Linha 1: Telefone | Email
  drawContact(margin, headerTop + 34, '☎', tel)
  drawContact(margin + 60, headerTop + 34, '✉', email)
  // Linha 2: Site | Instagram
  drawContact(margin, headerTop + 41, '🌐', site)
  drawContact(margin + 75, headerTop + 41, '📷', instagram)

  // ==========================================================
  // LADO DIREITO: ORÇAMENTO (em grid fixo)
  // ==========================================================
  const numBoxW = 60
  const numBoxH = 16
  const numBoxX = pageWidth - margin - numBoxW
  const numBoxY = headerTop + 12

  setText(GREEN)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('ORÇAMENTO', pageWidth - margin, headerTop + 8, { align: 'right' })

  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  setFill(GREEN_LIGHT2)
  doc.roundedRect(numBoxX, numBoxY, numBoxW, numBoxH, 2, 2, 'FD')
  setText(GREEN)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(`Nº ${orcamento.numero.toString().padStart(3, '0')}`, numBoxX + numBoxW / 2, numBoxY + 11, { align: 'center' })

  // Dados do orçamento em grid fixo
  const dataFormatada = new Date(orcamento.criado_em).toLocaleDateString('pt-BR')
  const rightDataY = numBoxY + numBoxH + 6
  const dataLabelX = numBoxX
  const propostaLabelX = numBoxX + 50

  // Data (com ícone)
  setFill(GREEN)
  doc.circle(dataLabelX + 3, rightDataY - 2.5, 2, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('📅', dataLabelX + 3, rightDataY - 1.5, { align: 'center' })
  setText(GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Data:', dataLabelX + 8, rightDataY - 1)
  setText(DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text(dataFormatada, dataLabelX + 24, rightDataY - 1)

  // Proposta (mesma linha)
  setFill(GREEN)
  doc.circle(propostaLabelX + 3, rightDataY - 2.5, 2, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('📄', propostaLabelX + 3, rightDataY - 1.5, { align: 'center' })
  setText(GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Proposta:', propostaLabelX + 8, rightDataY - 1)
  setText(DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text(orcamento.numero.toString().padStart(3, '0'), propostaLabelX + 30, rightDataY - 1)

  // Validade
  setFill(GREEN)
  doc.circle(dataLabelX + 3, rightDataY + 6, 2, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('⏰', dataLabelX + 3, rightDataY + 7, { align: 'center' })
  setText(GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Validade:', dataLabelX + 8, rightDataY + 7)
  setText(DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text('30 dias', dataLabelX + 30, rightDataY + 7)

  // Responsável
  setFill(GREEN)
  doc.circle(dataLabelX + 3, rightDataY + 13, 2, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('👤', dataLabelX + 3, rightDataY + 14, { align: 'center' })
  setText(GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Responsável:', dataLabelX + 8, rightDataY + 14)
  setText(DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text(orcamento.responsavel?.nome || '—', dataLabelX + 36, rightDataY + 14)

  // Linha horizontal verde
  const headerBottom = headerTop + 65
  setDraw(GREEN)
  doc.setLineWidth(1)
  doc.line(margin, headerBottom, pageWidth - margin, headerBottom)

  // ==========================================================
  // TRÊS CARDS - Alturas iguais calculadas
  // ==========================================================
  const cliente = orcamento.contato || orcamento.lead

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
    { label: 'Endereço:', value: endereco || '' },
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
    { label: 'Endereço:', value: orcamento.nota_endereco || '' },
  ].filter(l => l.value)
  const showInfoPF = isPF

  // === CARD 3: ENDEREÇO DE ENTREGA ===
  const temEntrega = orcamento.endereco_entrega && orcamento.endereco_entrega.trim().length > 0
  const col3Lines: { label: string; value: string }[] = []
  if (temEntrega) {
    col3Lines.push(
      { label: 'Nome / Destinatário:', value: cliente?.nome || '' },
      { label: 'Telefone:', value: cliente?.telefone || '' },
      { label: 'Endereço:', value: orcamento.endereco_entrega! },
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
  }

  // Calcular ALTURA IGUAL para os 3 cards
  const cardLineH = 5.5
  const cardPadding = 10
  const cardHeaderH = 30
  const cardInfoH = showInfoPF ? 25 : 0

  // Calcular quantas linhas reais cada card precisa
  const calculateCardLines = (lines: { label: string; value: string }[], colWidth: number) => {
    const labelW = 35
    const valueW = colWidth - cardPadding * 2 - labelW
    let totalLines = 0
    lines.forEach(({ value }) => {
      if (value) {
        // Estimar 1 linha por campo, mais extras para campos longos
        const estimatedLines = Math.max(1, Math.ceil(value.length / 25))
        totalLines += estimatedLines
      }
    })
    return totalLines
  }

  const colGap = 6
  const colWidth = (contentWidth - colGap * 2) / 3

  const card1EstimatedLines = calculateCardLines(col1Lines, colWidth)
  const card2EstimatedLines = calculateCardLines(col2Lines, colWidth)
  const card3EstimatedLines = calculateCardLines(col3Lines, colWidth)
  const maxLines = Math.max(card1EstimatedLines, card2EstimatedLines, card3EstimatedLines, 8)

  // Altura IGUAL para todos os cards
  const cardH = cardHeaderH + 5 + (maxLines * cardLineH) + cardInfoH + 5

  const cardsY = headerBottom + 8

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
    // Borda
    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.5)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, y, w, h, 4, 4, 'FD')

    // Ícone circular
    setFill(GREEN)
    doc.circle(x + 18, y + 14, 6, 'F')
    setText(WHITE)
    doc.setFontSize(8)
    doc.text(icon, x + 18, y + 16, { align: 'center' })

    // Título
    setText(GREEN)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(title, x + 30, y + 16)

    // Linha separadora
    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.3)
    doc.line(x + 5, y + 24, x + w - 5, y + 24)

    // Conteúdo - LARGURA MÍNIMA 60mm para evitar quebra letra por letra
    let cy = y + 30
    const labelW = 30
    const valueW = Math.max(w - cardPadding * 2 - labelW, 50) // MÍNIMO 50mm

    lines.forEach((line) => {
      if (line.value && cy < y + h - cardInfoH - 5) {
        setText(GRAY_TEXT)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.text(line.label || '', x + cardPadding, cy)

        setText(DARK_TEXT)
        doc.setFontSize(10)
        // Usar splitTextToSize mas limitar linhas
        const valueLines = doc.splitTextToSize(line.value, valueW)
        // Limitar a no máximo 2 linhas para não estourar o card
        const limitedLines = valueLines.slice(0, 2)
        doc.text(limitedLines, x + cardPadding + labelW, cy)
        cy += cardLineH * limitedLines.length
      }
    })

    // Info box para PF
    if (infoText) {
      const infoBoxH = 18
      const infoBoxY = y + h - infoBoxH - 3
      setFill(GREEN_LIGHT)
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      doc.roundedRect(x + cardPadding, infoBoxY, w - cardPadding * 2, infoBoxH, 2, 2, 'FD')

      setFill(GREEN)
      doc.circle(x + cardPadding + 8, infoBoxY + infoBoxH / 2, 5, 'F')
      setText(WHITE)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('i', x + cardPadding + 8, infoBoxY + infoBoxH / 2 + 2.5, { align: 'center' })

      setText(DARK_TEXT)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      const safeInfoW = Math.max(w - cardPadding * 2 - 22, 40)
      const infoLines = doc.splitTextToSize(infoText, safeInfoW).slice(0, 2)
      doc.text(infoLines, x + cardPadding + 18, infoBoxY + infoBoxH / 2 - 1)
    }
  }

  // Desenhar 3 cards com MESMA altura
  drawCard(margin, cardsY, colWidth, cardH, 'DADOS DO CLIENTE', '👤', col1Lines)
  drawCard(
    margin + colWidth + colGap,
    cardsY,
    colWidth,
    cardH,
    'DADOS PARA EMISSÃO DA NOTA',
    '📋',
    col2Lines,
    showInfoPF ? 'Para Pessoa Física, os dados da nota fiscal são utilizados conforme o cadastro do contato.' : undefined
  )
  if (temEntrega) {
    drawCard(
      margin + (colWidth + colGap) * 2,
      cardsY,
      colWidth,
      cardH,
      'ENDEREÇO DE ENTREGA',
      '🚚',
      col3Lines
    )
  }

  // ==========================================================
  // FORNECEDOR E FRETE - linha única horizontal
  // ==========================================================
  let currentY = cardsY + cardH + 8
  if (orcamento.fornecedor || orcamento.carrier) {
    const fornecY = currentY
    const fornecH = 24
    const fornecW = contentWidth / 2 - 3

    // Card Fornecedor
    if (orcamento.fornecedor) {
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.5)
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(margin, fornecY, fornecW, fornecH, 4, 4, 'FD')

      setFill(GREEN)
      doc.circle(margin + 14, fornecY + fornecH / 2, 6, 'F')
      setText(WHITE)
      doc.setFontSize(8)
      doc.text('🏢', margin + 14, fornecY + fornecH / 2 + 2.5, { align: 'center' })

      setText(GREEN)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('FORNECEDOR:', margin + 25, fornecY + fornecH / 2 - 1)
      setText(DARK_TEXT)
      doc.setFont('helvetica', 'normal')
      doc.text(orcamento.fornecedor.nome, margin + 60, fornecY + fornecH / 2 - 1)
    }

    // Card Frete
    if (orcamento.carrier) {
      const freteX = margin + fornecW + 6
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.5)
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(freteX, fornecY, fornecW, fornecH, 4, 4, 'FD')

      setFill(GREEN)
      doc.circle(freteX + 14, fornecY + fornecH / 2, 6, 'F')
      setText(WHITE)
      doc.setFontSize(8)
      doc.text('🚚', freteX + 14, fornecY + fornecH / 2 + 2.5, { align: 'center' })

      setText(GREEN)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('FRETE POR:', freteX + 25, fornecY + fornecH / 2 - 1)
      setText(DARK_TEXT)
      doc.setFont('helvetica', 'normal')
      doc.text(orcamento.carrier.nome, freteX + 60, fornecY + fornecH / 2 - 1)
    }

    currentY += fornecH + 8
  }

  // ==========================================================
  // PRODUTOS
  // ==========================================================
  const prodY = currentY
  const prodH = 24

  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(margin, prodY, contentWidth, prodH, 4, 4, 'FD')

  setFill(GREEN)
  doc.circle(margin + 18, prodY + prodH / 2, 6, 'F')
  setText(WHITE)
  doc.setFontSize(8)
  doc.text('🛒', margin + 18, prodY + prodH / 2 + 2.5, { align: 'center' })

  setText(GREEN)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTOS', margin + 30, prodY + prodH / 2 + 2)

  currentY += prodH + 2

  // Tabela - SEM HTML, SEM quebra de página
  // Construir linhas com quebras de linha onde necessário
  const tableBody = orcamento.itens.map((item, i) => {
    // SEM HTML - apenas texto com \n para quebras
    const descText = item.descricao +
      (item.marca ? `\nMarca: ${item.marca}` : '') +
      (item.codigo ? `\nCódigo: ${item.codigo}` : '')
    return [
      (i + 1).toString(),
      descText,
      item.unidade || '—',
      item.quantidade.toString(),
      formatarMoeda(item.preco_unitario),
      item.desconto_item > 0 ? `${item.desconto_item}%` : '—',
      formatarMoeda(item.subtotal),
    ]
  })

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'DESCRIÇÃO', 'APRESENTAÇÃO', 'QTD', 'VALOR UNIT.', 'DESC.', 'VALOR TOTAL']],
    body: tableBody,
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: [GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2]],
      lineWidth: 0.3,
      textColor: [DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]],
      valign: 'middle',
      overflow: 'linebreak',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [GREEN[0], GREEN[1], GREEN[2]],
      textColor: [WHITE[0], WHITE[1], WHITE[2]],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto', minCellWidth: 60 }, // MIN 60mm para evitar quebra
      2: { cellWidth: 35, fontSize: 8 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    pageBreak: 'avoid',
    showHead: 'everyPage',
    margin: { left: margin, right: margin, bottom: 75 },
  })

  // ==========================================================
  // RESUMO FINANCEIRO
  // ==========================================================
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 20
  let ry = finalY + 8

  // Verificar espaço - se não couber, forçar página nova
  if (ry + 65 > pageHeight - 15) {
    doc.addPage()
    ry = 20
  }

  const rightAlign = pageWidth - margin
  const resumoW = 100
  const resumoX = rightAlign - resumoW
  const resumoH = 60

  // Card de resumo
  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(resumoX, ry, resumoW, resumoH, 3, 3, 'FD')

  let ryi = ry + 8
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // Subtotal
  setText(DARK_TEXT)
  doc.text('Subtotal:', resumoX + 8, ryi)
  doc.text(formatarMoeda(orcamento.valor_subtotal), rightAlign - 4, ryi, { align: 'right' })
  ryi += 8

  // Desconto
  doc.text('Desconto:', resumoX + 8, ryi)
  if (orcamento.desconto_geral > 0) {
    doc.setTextColor(200, 50, 50)
    doc.text(`-${formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}`, rightAlign - 4, ryi, { align: 'right' })
  } else {
    setText(DARK_TEXT)
    doc.text('R$ 0,00', rightAlign - 4, ryi, { align: 'right' })
  }
  ryi += 8

  // Frete
  setText(DARK_TEXT)
  doc.text('Frete:', resumoX + 8, ryi)
  doc.text(`+${formatarMoeda(orcamento.frete)}`, rightAlign - 4, ryi, { align: 'right' })
  ryi += 6

  // TOTAL
  setFill(GREEN)
  doc.roundedRect(resumoX, ryi, resumoW, 14, 2, 2, 'F')
  setText(WHITE)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', resumoX + 8, ryi + 9)
  doc.setFontSize(13)
  doc.text(formatarMoeda(orcamento.valor_total), rightAlign - 4, ryi + 9, { align: 'right' })

  // ==========================================================
  // RODAPÉ
  // ==========================================================
  const footerY = pageHeight - 12

  setDraw(GREEN)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)

  setFill(GREEN)
  doc.circle(margin + 4, footerY - 1, 4, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('🛡', margin + 4, footerY, { align: 'center' })

  setText(DARK_TEXT)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const dataGeracao = new Date().toLocaleDateString('pt-BR')
  const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  doc.text(`Proposta gerada em ${dataGeracao} às ${horaGeracao}`, margin + 12, footerY - 1)
  doc.text('Documento gerado automaticamente pelo CRM DPRIME.', margin + 12, footerY + 4)

  return Buffer.from(doc.output('arraybuffer'))
}
