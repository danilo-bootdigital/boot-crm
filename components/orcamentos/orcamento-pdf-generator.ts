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

  // Helper para cor
  const setFill = (color: readonly number[]) => {
    doc.setFillColor(color[0], color[1], color[2])
  }
  const setText = (color: readonly number[]) => {
    doc.setTextColor(color[0], color[1], color[2])
  }

  const org = orcamento.organizacao

  // ==========================================================
  // HEADER - Layout em grid fixo
  // ==========================================================
  const headerTop = 10
  const col1W = (contentWidth - 90) // Coluna esquerda
  const col2X = margin + col1W + 10
  const col2W = 90 // Coluna direita (Nº/ORÇAMENTO)

  // Logo à esquerda
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

  // Subhead "Representação Farmacêutica"
  setText(GRAY_TEXT)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Representação Farmacêutica', margin, headerTop + 25)

  // Grid de contatos em 2 linhas
  const tel = org?.telefone || '(19) 97819-3530'
  const email = org?.email || 'contato@dprimerepresentacao.com.br'
  const site = org?.site || 'www.dprimerepresentacao.com.br'
  const instagram = org?.instagram || '@dprimerepresentacao'

  // Função para desenhar contato com ícone
  const drawContact = (x: number, y: number, icon: string, text: string, maxWidth: number) => {
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
  drawContact(margin, headerTop + 34, '☎', tel, 50)
  drawContact(margin + 60, headerTop + 34, '✉', email, 80)

  // Linha 2: Site | Instagram
  drawContact(margin, headerTop + 41, '🌐', site, 70)
  drawContact(margin + 75, headerTop + 41, '📷', instagram, 50)

  // Linha vertical separadora
  doc.setDrawColor(GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2])
  doc.setLineWidth(0.5)
  doc.line(col2X, headerTop, col2X, headerTop + 40)

  // ===== LADO DIREITO: ORÇAMENTO - GRID FIXO =====
  setText(GREEN)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('ORÇAMENTO', pageWidth - margin, headerTop + 12, { align: 'right' })

  // Nº do orçamento - box com borda
  const numBoxW = 70
  const numBoxH = 16
  const numBoxX = pageWidth - margin - numBoxW
  const numBoxY = headerTop + 16
  doc.setDrawColor(GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2])
  doc.setLineWidth(0.5)
  setFill(GREEN_LIGHT2)
  doc.roundedRect(numBoxX, numBoxY, numBoxW, numBoxH, 2, 2, 'FD')
  setText(GREEN)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(`Nº ${orcamento.numero.toString().padStart(3, '0')}`, numBoxX + numBoxW / 2, numBoxY + 11, { align: 'center' })

  // Dados do orçamento em grid fixo
  const dataFormatada = new Date(orcamento.criado_em).toLocaleDateString('pt-BR')
  const rightY = numBoxY + numBoxH + 6

  // Grid de dados
  const dataLabelX = col2X
  const dataValueX = col2X + 30

  // Data | Proposta (mesma linha)
  setFill(GREEN)
  doc.circle(dataLabelX + 3, rightY - 2.5, 2, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('📅', dataLabelX + 3, rightY - 1.5, { align: 'center' })
  setText(GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Data:', dataLabelX + 8, rightY - 1)
  setText(DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text(dataFormatada, dataValueX, rightY - 1)

  // Proposta (mesma linha)
  doc.setFillColor(GREEN[0], GREEN[1], GREEN[2])
  doc.circle(dataLabelX + 55, rightY - 2.5, 2, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('📄', dataLabelX + 55, rightY - 1.5, { align: 'center' })
  setText(GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Proposta:', dataLabelX + 60, rightY - 1)
  setText(DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text(orcamento.numero.toString().padStart(3, '0'), dataLabelX + 85, rightY - 1)

  // Linha 2: Validade
  setFill(GREEN)
  doc.circle(dataLabelX + 3, rightY + 5 - 2.5, 2, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('⏰', dataLabelX + 3, rightY + 5 - 1.5, { align: 'center' })
  setText(GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Validade:', dataLabelX + 8, rightY + 5 - 1)
  setText(DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text('30 dias', dataValueX, rightY + 5 - 1)

  // Linha 3: Responsável
  setFill(GREEN)
  doc.circle(dataLabelX + 3, rightY + 10 - 2.5, 2, 'F')
  setText(WHITE)
  doc.setFontSize(6)
  doc.text('👤', dataLabelX + 3, rightY + 10 - 1.5, { align: 'center' })
  setText(GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Responsável:', dataLabelX + 8, rightY + 10 - 1)
  setText(DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text(orcamento.responsavel?.nome || '—', dataValueX, rightY + 10 - 1)

  // Linha horizontal verde
  const headerBottom = headerTop + 60
  doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2])
  doc.setLineWidth(1)
  doc.line(margin, headerBottom, pageWidth - margin, headerBottom)

  // ==========================================================
  // TRÊS CARDS - Alturas iguais
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

  // Calcular número de linhas de cada card (para altura igual)
  const countLines = (lines: { label: string; value: string }[]) => {
    let n = 0
    lines.forEach(({ value }) => {
      if (value) n++
    })
    return n
  }

  const card1Lines = countLines(col1Lines)
  const card2Lines = countLines(col2Lines)
  const card3Lines = countLines(col3Lines)
  // Para mesma altura, usar o maior como base
  const maxCardLines = Math.max(card1Lines, card2Lines, card3Lines)
  const lineH = 5.5
  const cardPadding = 10
  const cardTitleH = 22
  const cardHeaderH = 30 // título + separador
  const cardInfoH = showInfoPF ? 25 : 0
  // Altura baseada em número de linhas, garantindo uniformidade
  const maxCardH = cardHeaderH + 5 + (maxCardLines * lineH) + cardInfoH + 5

  // Layout dos cards
  const cardsY = headerBottom + 8
  const colGap = 6
  const colWidth = (contentWidth - colGap * 2) / 3

  // === HELPER: DESENHAR CARD COM ALTURA FIXA ===
  const drawFixedCard = (
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    icon: string,
    lines: { label: string; value: string }[],
    infoText?: string
  ) => {
    // Borda do card
    doc.setDrawColor(GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2])
    doc.setLineWidth(0.5)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, y, w, h, 4, 4, 'FD')

    // Título com ícone circular
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
    doc.setDrawColor(GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2])
    doc.setLineWidth(0.3)
    doc.line(x + 5, y + 24, x + w - 5, y + 24)

    // Conteúdo
    let cy = y + 30
    const labelW = 35
    const valueW = w - cardPadding * 2 - labelW

    lines.forEach((line) => {
      if (line.value && cy < y + h - cardInfoH - 5) {
        setText(GRAY_TEXT)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.text(line.label || '', x + cardPadding, cy)

        setText(DARK_TEXT)
        doc.setFontSize(10)
        // Largura SEGURA - nunca negativa
        const safeValueW = Math.max(valueW, 30)
        const valueLines = doc.splitTextToSize(line.value, safeValueW)
        doc.text(valueLines, x + cardPadding + labelW, cy)
        cy += lineH * valueLines.length
      }
    })

    // Info box para PF
    if (infoText) {
      const infoBoxH = 18
      const infoBoxY = y + h - infoBoxH - 3
      doc.setFillColor(GREEN_LIGHT[0], GREEN_LIGHT[1], GREEN_LIGHT[2])
      doc.setDrawColor(GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2])
      doc.setLineWidth(0.3)
      doc.roundedRect(x + cardPadding, infoBoxY, w - cardPadding * 2, infoBoxH, 2, 2, 'FD')

      // Ícone info
      setFill(GREEN)
      doc.circle(x + cardPadding + 8, infoBoxY + infoBoxH / 2, 5, 'F')
      setText(WHITE)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('i', x + cardPadding + 8, infoBoxY + infoBoxH / 2 + 2.5, { align: 'center' })

      // Texto info
      setText(DARK_TEXT)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      const safeInfoW = w - cardPadding * 2 - 22
      const infoLines = doc.splitTextToSize(infoText, Math.max(safeInfoW, 30))
      doc.text(infoLines, x + cardPadding + 18, infoBoxY + infoBoxH / 2 - 1)
    }
  }

  // Desenhar 3 cards com MESMA altura
  drawFixedCard(
    margin,
    cardsY,
    colWidth,
    maxCardH,
    'DADOS DO CLIENTE',
    '👤',
    col1Lines
  )

  drawFixedCard(
    margin + colWidth + colGap,
    cardsY,
    colWidth,
    maxCardH,
    'DADOS PARA EMISSÃO DA NOTA',
    '📋',
    col2Lines,
    showInfoPF ? 'Para Pessoa Física, os dados da nota fiscal são utilizados conforme o cadastro do contato.' : undefined
  )

  if (temEntrega) {
    drawFixedCard(
      margin + (colWidth + colGap) * 2,
      cardsY,
      colWidth,
      maxCardH,
      'ENDEREÇO DE ENTREGA',
      '🚚',
      col3Lines
    )
  }

  // ==========================================================
  // FORNECEDOR E FRETE
  // ==========================================================
  let currentY = cardsY + maxCardH + 8
  if (orcamento.fornecedor || orcamento.carrier) {
    const fornecY = currentY
    const fornecH = 24
    const fornecW = contentWidth / 2 - 3

    // Card Fornecedor
    if (orcamento.fornecedor) {
      doc.setDrawColor(GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2])
      doc.setLineWidth(0.5)
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(margin, fornecY, fornecW, fornecH, 4, 4, 'FD')

      // Ícone
      setFill(GREEN)
      doc.circle(margin + 14, fornecY + fornecH / 2, 6, 'F')
      setText(WHITE)
      doc.setFontSize(8)
      doc.text('🏢', margin + 14, fornecY + fornecH / 2 + 2.5, { align: 'center' })

      // Conteúdo
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
      doc.setDrawColor(GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2])
      doc.setLineWidth(0.5)
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(freteX, fornecY, fornecW, fornecH, 4, 4, 'FD')

      // Ícone
      setFill(GREEN)
      doc.circle(freteX + 14, fornecY + fornecH / 2, 6, 'F')
      setText(WHITE)
      doc.setFontSize(8)
      doc.text('🚚', freteX + 14, fornecY + fornecH / 2 + 2.5, { align: 'center' })

      // Conteúdo
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

  // Card header produtos
  doc.setDrawColor(GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2])
  doc.setLineWidth(0.5)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(margin, prodY, contentWidth, prodH, 4, 4, 'FD')

  // Ícone
  setFill(GREEN)
  doc.circle(margin + 18, prodY + prodH / 2, 6, 'F')
  setText(WHITE)
  doc.setFontSize(8)
  doc.text('🛒', margin + 18, prodY + prodH / 2 + 2.5, { align: 'center' })

  // Título
  setText(GREEN)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTOS', margin + 30, prodY + prodH / 2 + 2)

  currentY += prodH + 2

  // Tabela - SEM HTML, SEM QUEBRA DE PÁGINA
  const tableEndY = pageHeight - 30 // Reservar espaço para resumo e rodapé

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'DESCRIÇÃO', 'APRESENTAÇÃO', 'QTD', 'VALOR UNIT.', 'DESC.', 'VALOR TOTAL']],
    body: orcamento.itens.map((item, i) => {
      // SEM HTML - usar array de linhas para o nome do produto em negrito
      // mas o autoTable não suporta múltiplas linhas com formatação diferente
      // então usamos apenas texto simples
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
    }),
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: [GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2]],
      lineWidth: 0.3,
      textColor: [DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]],
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [GREEN[0], GREEN[1], GREEN[2]],
      textColor: [WHITE[0], WHITE[1], WHITE[2]],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 38, fontSize: 8 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    // SEM pageBreak - manter resumo junto
    pageBreak: 'avoid',
    showHead: 'everyPage',
    margin: { left: margin, right: margin, bottom: 80 }, // Reservar 80px para resumo + rodapé
  })

  // ==========================================================
  // RESUMO FINANCEIRO (sempre junto da tabela)
  // ==========================================================
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 20
  const resumoY = finalY + 6

  // Verificar se cabe na página
  const resumoH = 55
  if (resumoY + resumoH > pageHeight - 15) {
    // Não cabe, adicionar nova página APENAS aqui
    doc.addPage()
    var ry = 20
  } else {
    var ry = resumoY
  }

  const rightAlign = pageWidth - margin
  const labelX = rightAlign - 90
  const valueX = rightAlign

  // Card de resumo
  const resumoW = 100
  const resumoX = rightAlign - resumoW

  doc.setDrawColor(GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2])
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

  // TOTAL - destaque verde
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

  doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2])
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
