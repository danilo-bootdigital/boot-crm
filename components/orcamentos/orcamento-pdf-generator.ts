import { formatarMoeda } from '@/lib/utils'

// Paleta verde suave DPRIME
const GREEN = [47, 143, 70] as const      // #2F8F46
const GREEN_LIGHT = [234, 244, 236] as const // #EAF4EC
const GREEN_LIGHT2 = [240, 247, 242] as const // verde mais claro
const GREEN_BORDER = [201, 221, 204] as const // #C9DDCC
const GREEN_DARK = [47, 143, 70] as const
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

  // Helper para desenhar ícone circular
  const drawIconCircle = (x: number, y: number, color: number[]) => {
    doc.setFillColor(color[0], color[1], color[2])
    doc.circle(x, y, 6, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
  }

  // === HEADER ===
  const headerTop = 10
  const org = orcamento.organizacao

  // Lado esquerdo: Logo + Contatos
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
  let subheadY = headerTop + 25
  doc.setTextColor(...GRAY_TEXT)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Representação Farmacêutica', margin, subheadY)

  // Linha 1: Telefone | Email
  doc.setFontSize(9)
  doc.setTextColor(...DARK_TEXT)
  let line1Y = subheadY + 9
  const tel = org?.telefone || '(19) 97819-3530'
  const email = org?.email || 'contato@dprimerepresentacao.com.br'
  // Ícone telefone
  doc.setFillColor(...GREEN)
  doc.circle(margin + 3, line1Y - 2.5, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6)
  doc.text('☎', margin + 3, line1Y - 1.5, { align: 'center' })
  doc.setTextColor(...DARK_TEXT)
  doc.setFontSize(9)
  doc.text(tel, margin + 8, line1Y - 1)

  // Email - ícone
  const emailX = margin + 60
  doc.setFillColor(...GREEN)
  doc.circle(emailX + 3, line1Y - 2.5, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6)
  doc.text('✉', emailX + 3, line1Y - 1.5, { align: 'center' })
  doc.setTextColor(...DARK_TEXT)
  doc.setFontSize(9)
  doc.text(email, emailX + 8, line1Y - 1)

  // Linha 2: Site | Instagram
  let line2Y = line1Y + 7
  const site = org?.site || 'www.dprimerepresentacao.com.br'
  const instagram = org?.instagram || '@dprimerepresentacao'

  doc.setFillColor(...GREEN)
  doc.circle(margin + 3, line2Y - 2.5, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6)
  doc.text('🌐', margin + 3, line2Y - 1.5, { align: 'center' })
  doc.setTextColor(...DARK_TEXT)
  doc.setFontSize(9)
  doc.text(site, margin + 8, line2Y - 1)

  const instaX = margin + 75
  doc.setFillColor(...GREEN)
  doc.circle(instaX + 3, line2Y - 2.5, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6)
  doc.text('📷', instaX + 3, line2Y - 1.5, { align: 'center' })
  doc.setTextColor(...DARK_TEXT)
  doc.setFontSize(9)
  doc.text(instagram, instaX + 8, line2Y - 1)

  // Linha vertical separadora
  const lineVerticalX = pageWidth - 95
  doc.setDrawColor(...GREEN_BORDER)
  doc.setLineWidth(0.5)
  doc.line(lineVerticalX, headerTop, lineVerticalX, headerTop + 32)

  // Lado direito: ORÇAMENTO
  const rightX = pageWidth - margin

  doc.setTextColor(...GREEN)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('ORÇAMENTO', rightX, headerTop + 10, { align: 'right' })

  // Nº do orçamento - box com borda
  const numBoxW = 60
  const numBoxH = 18
  const numBoxX = rightX - numBoxW
  const numBoxY = headerTop + 14
  doc.setDrawColor(...GREEN_BORDER)
  doc.setLineWidth(0.5)
  doc.setFillColor(...GREEN_LIGHT2)
  doc.roundedRect(numBoxX, numBoxY, numBoxW, numBoxH, 2, 2, 'FD')
  doc.setTextColor(...GREEN)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(`Nº ${orcamento.numero.toString().padStart(3, '0')}`, numBoxX + numBoxW / 2, numBoxY + 12, { align: 'center' })

  // Linha 1: Data | Proposta (com ícones)
  const dataFormatada = new Date(orcamento.criado_em).toLocaleDateString('pt-BR')

  let rightY = headerTop + 40
  // Data
  doc.setFillColor(...GREEN)
  doc.circle(rightX - 85, rightY - 2.5, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6)
  doc.text('📅', rightX - 85, rightY - 1.5, { align: 'center' })
  doc.setTextColor(...GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Data:', rightX - 75, rightY - 1)
  doc.setTextColor(...DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text(dataFormatada, rightX - 60, rightY - 1)

  // Proposta
  doc.setFillColor(...GREEN)
  doc.circle(rightX - 35, rightY - 2.5, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6)
  doc.text('📄', rightX - 35, rightY - 1.5, { align: 'center' })
  doc.setTextColor(...GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Proposta:', rightX - 25, rightY - 1)
  doc.setTextColor(...DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text(orcamento.numero.toString().padStart(3, '0'), rightX - 2, rightY - 1)

  // Linha 2: Validade
  rightY += 7
  doc.setFillColor(...GREEN)
  doc.circle(rightX - 85, rightY - 2.5, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6)
  doc.text('⏰', rightX - 85, rightY - 1.5, { align: 'center' })
  doc.setTextColor(...GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Validade:', rightX - 75, rightY - 1)
  doc.setTextColor(...DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text('30 dias', rightX - 50, rightY - 1)

  // Linha 3: Responsável
  rightY += 7
  doc.setFillColor(...GREEN)
  doc.circle(rightX - 85, rightY - 2.5, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6)
  doc.text('👤', rightX - 85, rightY - 1.5, { align: 'center' })
  doc.setTextColor(...GRAY_TEXT)
  doc.setFontSize(8)
  doc.text('Responsável:', rightX - 75, rightY - 1)
  doc.setTextColor(...DARK_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.text(orcamento.responsavel?.nome || '—', rightX - 30, rightY - 1)

  // Linha horizontal verde
  const headerBottom = headerTop + 55
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(1)
  doc.line(margin, headerBottom, pageWidth - margin, headerBottom)

  // === TRÊS CARDS ===
  let y = headerBottom + 8
  const colGap = 6
  const colWidth = (contentWidth - colGap * 2) / 3
  const cardPadding = 14
  const lineH = 6.5
  const titleH = 28

  // Helper para card
  const drawCard = (x: number, y: number, w: number, title: string, lines: { label: string; value: string }[], hasInfo: boolean = false, infoText: string = '') => {
    // Calcular altura baseada no conteúdo
    let contentH = 0
    lines.forEach(({ value }) => {
      if (value) {
        const valueLines = doc.splitTextToSize(value, w - cardPadding * 2 - 40)
        contentH += lineH * valueLines.length
      }
    })

    let infoH = 0
    if (hasInfo) {
      infoH = 30
    }

    const cardH = titleH + contentH + 8 + infoH + 8

    // Borda do card
    doc.setDrawColor(...GREEN_BORDER)
    doc.setLineWidth(0.5)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, y, w, cardH, 4, 4, 'FD')

    // Título com ícone circular
    drawIconCircle(x + 18, y + 14, [GREEN[0], GREEN[1], GREEN[2]])
    // Ícones específicos para cada card
    if (title.includes('CLIENTE')) doc.text('👤', x + 18, y + 16, { align: 'center' })
    else if (title.includes('NOTA')) doc.text('📋', x + 18, y + 16, { align: 'center' })
    else if (title.includes('ENTREGA')) doc.text('🚚', x + 18, y + 16, { align: 'center' })

    // Título
    doc.setTextColor(...GREEN)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(title, x + 30, y + 16)

    // Linha separadora após título
    const separatorY = y + titleH
    doc.setDrawColor(...GREEN_BORDER)
    doc.setLineWidth(0.3)
    doc.line(x + 5, separatorY, x + w - 5, separatorY)

    // Conteúdo
    let cy = separatorY + 8
    lines.forEach(({ label, value }) => {
      if (value) {
        doc.setTextColor(...GRAY_TEXT)
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'normal')
        doc.text(label, x + cardPadding, cy)

        doc.setTextColor(...DARK_TEXT)
        doc.setFontSize(10)
        const valueLines = doc.splitTextToSize(value, w - cardPadding * 2 - 50)
        doc.text(valueLines, x + cardPadding + 40, cy)
        cy += lineH * valueLines.length
      }
    })

    // Info box para PF
    if (hasInfo && infoText) {
      cy += 4
      const infoBoxH = 24
      doc.setFillColor(...GREEN_LIGHT)
      doc.setDrawColor(...GREEN_BORDER)
      doc.setLineWidth(0.3)
      doc.roundedRect(x + cardPadding, cy, w - cardPadding * 2, infoBoxH, 2, 2, 'FD')

      // Ícone info
      doc.setFillColor(...GREEN)
      doc.circle(x + cardPadding + 8, cy + infoBoxH / 2, 5, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('i', x + cardPadding + 8, cy + infoBoxH / 2 + 2.5, { align: 'center' })

      // Texto info
      doc.setTextColor(...DARK_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const infoLines = doc.splitTextToSize(infoText, w - cardPadding * 2 - 22)
      doc.text(infoLines, x + cardPadding + 18, cy + infoBoxH / 2 - 1)
    }

    return cardH
  }

  // Identificar cliente
  const cliente = orcamento.contato || orcamento.lead

  // Montar endereço completo do contato
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
    { label: 'Conselho / Nº:', value: (orcamento.contato?.tipo_conselho && orcamento.contato?.numero_conselho)
      ? `${orcamento.contato.tipo_conselho} ${orcamento.contato.numero_conselho}${orcamento.contato.uf_conselho ? ` - ${orcamento.contato.uf_conselho}` : ''}`
      : '' },
    { label: 'Tipo de pessoa:', value: (orcamento.contato?.tipo_pessoa && orcamento.contato?.categoria_cliente)
      ? `${orcamento.contato.tipo_pessoa} - ${orcamento.contato.categoria_cliente}`
      : '' },
  ].filter(l => l.value)

  // Endereço separado com label próprio
  col1Lines.push({ label: 'Endereço:', value: endereco || '' })

  const col1H = drawCard(margin, y, colWidth, 'DADOS DO CLIENTE / CONTATO', col1Lines.filter(l => l.value))

  // COLUNA 2: DADOS PARA EMISSÃO DA NOTA
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
  const col2H = drawCard(margin + colWidth + colGap, y, colWidth, 'DADOS PARA EMISSÃO DA NOTA', col2Lines, showInfoPF, 'Para Pessoa Física, os dados da nota fiscal são utilizados conforme o cadastro do contato.')

  // COLUNA 3: ENDEREÇO DE ENTREGA
  const temEntrega = orcamento.endereco_entrega && orcamento.endereco_entrega.trim().length > 0
  let col3H = 0

  if (temEntrega) {
    // Endereço de entrega estruturado
    const entregaText = orcamento.endereco_entrega!
    const entregaLines: { label: string; value: string }[] = [
      { label: 'Nome / Destinatário:', value: cliente?.nome || '' },
      { label: 'Telefone:', value: cliente?.telefone || '' },
      { label: 'Endereço:', value: entregaText },
    ]

    if (orcamento.contato?.endereco_bairro) {
      entregaLines.push({ label: 'Bairro:', value: orcamento.contato.endereco_bairro })
    }
    if (orcamento.contato?.endereco_cidade) {
      const cidadeUF = orcamento.contato.endereco_estado
        ? `${orcamento.contato.endereco_cidade} - ${orcamento.contato.endereco_estado}`
        : orcamento.contato.endereco_cidade
      entregaLines.push({ label: 'Cidade / UF:', value: cidadeUF })
    }
    if (orcamento.contato?.endereco_cep) {
      entregaLines.push({ label: 'CEP:', value: orcamento.contato.endereco_cep })
    }

    col3H = drawCard(margin + (colWidth + colGap) * 2, y, colWidth, 'ENDEREÇO DE ENTREGA', entregaLines.filter(l => l.value))
  }

  // Altura máxima das colunas
  const maxColH = Math.max(col1H, col2H, col3H)
  y += maxColH + 10

  // === FORNECEDOR E FRETE ===
  if (orcamento.fornecedor || orcamento.carrier) {
    const fornecY = y
    const fornecH = 24

    // Card
    doc.setDrawColor(...GREEN_BORDER)
    doc.setLineWidth(0.5)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin, fornecY, contentWidth, fornecH, 4, 4, 'FD')

    // Conteúdo
    let fx = margin + 14

    if (orcamento.fornecedor) {
      // Ícone fornecedor (prédio)
      doc.setFillColor(...GREEN)
      doc.circle(fx + 5, fornecY + fornecH / 2, 6, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.text('🏢', fx + 5, fornecY + fornecH / 2 + 2.5, { align: 'center' })

      doc.setTextColor(...GREEN)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('FORNECEDOR:', fx + 16, fornecY + fornecH / 2 - 1)
      doc.setTextColor(...DARK_TEXT)
      doc.setFont('helvetica', 'normal')
      doc.text(orcamento.fornecedor.nome, fx + 16 + 35, fornecY + fornecH / 2 - 1)

      fx += 90
    }

    if (orcamento.carrier) {
      // Linha vertical
      doc.setDrawColor(...GREEN_BORDER)
      doc.setLineWidth(0.3)
      doc.line(fx - 10, fornecY + 5, fx - 10, fornecY + fornecH - 5)

      // Ícone caminhão
      doc.setFillColor(...GREEN)
      doc.circle(fx + 5, fornecY + fornecH / 2, 6, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.text('🚚', fx + 5, fornecY + fornecH / 2 + 2.5, { align: 'center' })

      doc.setTextColor(...GREEN)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('FRETE POR:', fx + 16, fornecY + fornecH / 2 - 1)
      doc.setTextColor(...DARK_TEXT)
      doc.setFont('helvetica', 'normal')
      doc.text(orcamento.carrier.nome, fx + 16 + 30, fornecY + fornecH / 2 - 1)
    }

    y += fornecH + 10
  }

  // === PRODUTOS ===
  const prodY = y
  const prodH = 24

  // Card header
  doc.setDrawColor(...GREEN_BORDER)
  doc.setLineWidth(0.5)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(margin, prodY, contentWidth, prodH, 4, 4, 'FD')

  // Ícone carrinho
  doc.setFillColor(...GREEN)
  doc.circle(margin + 18, prodY + prodH / 2, 6, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.text('🛒', margin + 18, prodY + prodH / 2 + 2.5, { align: 'center' })

  // Título
  doc.setTextColor(...GREEN)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTOS', margin + 30, prodY + prodH / 2 + 2)

  y += prodH + 2

  // Tabela
  autoTable(doc, {
    startY: y,
    head: [['#', 'DESCRIÇÃO', 'APRESENTAÇÃO', 'QTD', 'VALOR UNIT.', 'DESC.', 'VALOR TOTAL']],
    body: orcamento.itens.map((item, i) => {
      const descHtml = `<b>${item.descricao}</b>` +
        (item.marca ? `\nMarca: ${item.marca}` : '') +
        (item.codigo ? `\nCódigo: ${item.codigo}` : '')
      return [
        (i + 1).toString(),
        descHtml,
        item.unidade || '—',
        item.quantidade.toString(),
        formatarMoeda(item.preco_unitario),
        item.desconto_item > 0 ? `${item.desconto_item}%` : '—',
        formatarMoeda(item.subtotal),
      ]
    }),
    styles: {
      fontSize: 9,
      cellPadding: 5,
      lineColor: [...GREEN_BORDER],
      lineWidth: 0.3,
      textColor: [...DARK_TEXT],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [...GREEN],
      textColor: [...WHITE],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 40 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 32, halign: 'right' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        // Renderizar com negrito na primeira linha
        if (data.cell.raw && typeof data.cell.raw === 'string') {
          (data.cell as any).text = data.cell.raw
        }
      }
    },
    margin: { left: margin, right: margin },
  })

  // === RESUMO FINANCEIRO ===
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
  let ty = finalY + 10

  const rightAlign = pageWidth - margin
  const labelX = rightAlign - 90
  const valueX = rightAlign

  // Card de resumo
  const resumoW = 110
  const resumoH = 60
  const resumoX = rightAlign - resumoW
  const resumoY = ty

  doc.setDrawColor(...GREEN_BORDER)
  doc.setLineWidth(0.5)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(resumoX, resumoY, resumoW, resumoH, 3, 3, 'FD')

  let ry = resumoY + 8
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // Subtotal
  doc.setTextColor(...DARK_TEXT)
  doc.text('Subtotal:', resumoX + 8, ry)
  doc.text(formatarMoeda(orcamento.valor_subtotal), rightAlign - 4, ry, { align: 'right' })
  ry += 8

  // Desconto
  if (orcamento.desconto_geral > 0) {
    doc.text(`Desconto:`, resumoX + 8, ry)
    doc.text(`-${formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}`, rightAlign - 4, ry, { align: 'right' })
    ry += 8
  } else {
    doc.text('Desconto:', resumoX + 8, ry)
    doc.text('R$ 0,00', rightAlign - 4, ry, { align: 'right' })
    ry += 8
  }

  // Frete
  doc.text('Frete:', resumoX + 8, ry)
  doc.text(`+${formatarMoeda(orcamento.frete)}`, rightAlign - 4, ry, { align: 'right' })
  ry += 8

  // TOTAL - destaque verde
  doc.setFillColor(...GREEN)
  doc.roundedRect(resumoX, ry - 5, resumoW, 14, 2, 2, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', resumoX + 8, ry + 4)
  doc.setFontSize(13)
  doc.text(formatarMoeda(orcamento.valor_total), rightAlign - 4, ry + 4, { align: 'right' })

  // === RODAPÉ ===
  const footerY = pageHeight - 12

  // Linha verde
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)

  // Ícone escudo
  doc.setFillColor(...GREEN)
  doc.circle(margin + 4, footerY - 1, 4, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6)
  doc.text('🛡', margin + 4, footerY, { align: 'center' })

  // Texto
  doc.setTextColor(...DARK_TEXT)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const dataGeracao = new Date().toLocaleDateString('pt-BR')
  const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  doc.text(`Proposta gerada em ${dataGeracao} às ${horaGeracao}`, margin + 12, footerY - 1)
  doc.text('Documento gerado automaticamente pelo CRM DPRIME.', margin + 12, footerY + 4)

  return Buffer.from(doc.output('arraybuffer'))
}
