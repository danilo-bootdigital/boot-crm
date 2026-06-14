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
  doc.text('', dataLabelX + 3, rightDataY - 1, { align: 'center' })
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
  doc.text('', propostaLabelX + 3, rightDataY - 1, { align: 'center' })
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
  doc.text('', dataLabelX + 3, rightDataY + 6, { align: 'center' })
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
  doc.text('', dataLabelX + 3, rightDataY + 12, { align: 'center' })
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
    // Mensagem quebrada em 2 linhas para caber no card
    col3Lines.push({
      label: 'Endereço de entrega',
      value: 'não informado.'
    })
  }

  // === CÁLCULO DE ALTURA DOS BLOCOS ===
  const blockLineH = 5
  const blockPadding = 5
  const blockTitleH = 8
  const blockInfoH = showInfoPF ? 14 : 0

  // Lista de campos que ocupam linha inteira (campos longos)
  const longFieldLabels = ['Nome:', 'E-mail:', 'Endereço:', 'Razão Social:', 'Nome Fantasia:', 'Observações:', 'Bairro:', 'Cidade / UF:']

  // Calcular quantas linhas cada bloco precisa com grid 2 colunas
  const calculateBlockLines = (lines: { label: string; value: string }[]) => {
    let totalLines = 0
    lines.forEach(({ label, value }) => {
      if (value) {
        if (longFieldLabels.includes(label)) {
          // Linha inteira: cada linha do valor conta
          const lineCount = value.split('\n').length
          totalLines += Math.max(1, lineCount)
        } else {
          // Grid 2 colunas: 2 campos por linha
          totalLines += 1
        }
      }
    })
    // Converter para linhas de grid: ceil(total / 2)
    return Math.ceil(totalLines / 2)
  }

  // Altura dos blocos baseada no conteúdo
  const block1Lines = calculateBlockLines(col1Lines)
  const block2Lines = calculateBlockLines(col2Lines)
  const block3Lines = calculateBlockLines(col3Lines)

  // Cada bloco tem sua própria altura
  const block1H = blockTitleH + 4 + (block1Lines * blockLineH * 2) + blockInfoH + 4
  const block2H = blockTitleH + 4 + (block2Lines * blockLineH * 2) + (showInfoPF ? 14 : 0) + 4
  const block3H = blockTitleH + 4 + (block3Lines * blockLineH * 2) + 4

  const blocksY = headerBottom + 6

  // === HELPER: DESENHAR BLOCO HORIZONTAL ===
  const drawBloco = (
    x: number,
    y: number,
    w: number,
    title: string,
    lines: { label: string; value: string }[],
    infoText?: string,
    fixedH?: number
  ) => {
    // Calcular altura do bloco baseada no conteúdo
    let contentH = 4 // padding inicial
    const lineHeight = blockLineH * 2 // 2x para legibilidade

    lines.forEach((line) => {
      if (line.value) {
        if (longFieldLabels.includes(line.label)) {
          // Linha inteira
          const wrapped = doc.splitTextToSize(line.value, w - blockPadding * 2)
          contentH += Math.max(1, wrapped.length) * blockLineH
        } else {
          // Grid 2 colunas - conta como 1 linha
          contentH += blockLineH
        }
      }
    })

    const infoH = infoText ? 14 : 0
    const blocoH = fixedH || (blockTitleH + contentH + infoH + 4)

    // Borda do bloco
    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.5)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(x, y, w, blocoH, 3, 3, 'FD')

    // Barra de título verde (sem ícones, sem círculos)
    setFill(GREEN)
    doc.roundedRect(x, y, w, blockTitleH, 3, 3, 'F')
    doc.rect(x, y + blockTitleH - 3, w, 3, 'F')

    // Título
    setText(WHITE)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(title, x + blockPadding, y + 5.5)

    // Conteúdo
    let cy = y + blockTitleH + 4
    const colW = (w - blockPadding * 2 - 6) / 2 // 2 colunas com gap de 6

    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      if (!line.value) {
        i++
        continue
      }

      if (longFieldLabels.includes(line.label)) {
        // Campo longo: linha inteira
        setText(GRAY_TEXT)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(line.label, x + blockPadding, cy)

        setText(DARK_TEXT)
        doc.setFontSize(10)
        const wrapped = doc.splitTextToSize(line.value, w - blockPadding * 2)
        doc.text(wrapped, x + blockPadding, cy + 3.5)
        cy += blockLineH * Math.max(1, wrapped.length) + 1

        i++
      } else {
        // Campo curto: grid 2 colunas
        const next = lines[i + 1]
        const col1X = x + blockPadding
        const col2X = x + blockPadding + colW + 6

        // Coluna 1
        setText(GRAY_TEXT)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(line.label, col1X, cy)

        setText(DARK_TEXT)
        doc.setFontSize(10)
        const val1Wrapped = doc.splitTextToSize(line.value, colW - 35)
        doc.text(val1Wrapped, col1X + 35, cy)

        // Coluna 2 (se existir próximo campo curto)
        if (next && next.value && !longFieldLabels.includes(next.label)) {
          setText(GRAY_TEXT)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.text(next.label, col2X, cy)

          setText(DARK_TEXT)
          doc.setFontSize(10)
          const val2Wrapped = doc.splitTextToSize(next.value, colW - 35)
          doc.text(val2Wrapped, col2X + 35, cy)
        }

        cy += Math.max(
          val1Wrapped.length,
          (next && next.value && !longFieldLabels.includes(next.label)) ? doc.splitTextToSize(next.value, colW - 35).length : 0
        ) * blockLineH + 1
        i += 2
      }
    }

    // Info box (PF)
    if (infoText) {
      const infoBoxH = 12
      const infoBoxY = y + blocoH - infoBoxH - 2
      setFill(GREEN_LIGHT)
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      doc.roundedRect(x + blockPadding, infoBoxY, w - blockPadding * 2, infoBoxH, 2, 2, 'FD')

      setText(DARK_TEXT)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'italic')
      const safeInfoW = Math.max(w - blockPadding * 2 - 6, 30)
      const infoLines = infoText.split('\n')
      doc.text(infoLines, x + blockPadding + 4, infoBoxY + infoBoxH / 2 + 1)
    }

    return blocoH
  }

  // Desenhar 3 blocos horizontais
  let currentBlockY = blocksY
  const bloco1H = drawBloco(margin, currentBlockY, contentWidth, 'DADOS DO CLIENTE', col1Lines)
  currentBlockY += bloco1H + 4

  const bloco2H = drawBloco(
    margin,
    currentBlockY,
    contentWidth,
    'DADOS PARA EMISSÃO DA NOTA',
    col2Lines,
    showInfoPF ? 'Para Pessoa Física, os dados da nota fiscal são do cadastro do contato.' : undefined
  )
  currentBlockY += bloco2H + 4

  const bloco3H = drawBloco(margin, currentBlockY, contentWidth, 'ENDEREÇO DE ENTREGA', col3Lines)
  currentBlockY += bloco3H + 4

  // ==========================================================
  // FORNECEDOR E FRETE (linha única horizontal)
  // ==========================================================
  if (orcamento.fornecedor || orcamento.carrier) {
    const fornecY = currentBlockY
    const fornecH = 14

    // Borda
    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.5)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin, fornecY, contentWidth, fornecH, 3, 3, 'FD')

    let fx = margin + 4
    const cyMid = fornecY + fornecH / 2 + 1

    // Fornecedor
    if (orcamento.fornecedor) {
      setText(GREEN)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('Fornecedor:', fx, cyMid)
      fx += 22

      setText(DARK_TEXT)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(orcamento.fornecedor.nome, fx, cyMid)
      fx += doc.getTextWidth(orcamento.fornecedor.nome) + 15
    }

    // Separador
    if (orcamento.fornecedor && orcamento.carrier) {
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      doc.line(fx - 8, fornecY + 3, fx - 8, fornecY + fornecH - 3)
    }

    // Frete
    if (orcamento.carrier) {
      setText(GREEN)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('Frete por:', fx, cyMid)
      fx += 22

      setText(DARK_TEXT)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(orcamento.carrier.nome, fx, cyMid)
    }

    currentBlockY += fornecH + 4
  }

  // ==========================================================
  // PRODUTOS
  // ==========================================================
  const prodY = currentBlockY
  const prodH = 14

  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(margin, prodY, contentWidth, prodH, 3, 3, 'FD')

  // Título
  setFill(GREEN)
  doc.roundedRect(margin, prodY, contentWidth, prodH, 3, 3, 'F')
  doc.rect(margin, prodY + prodH - 3, contentWidth, 3, 'F')

  setText(WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTOS', margin + 5, prodY + prodH / 2 + 1)

  currentBlockY += prodH + 2

  // Construir dados da tabela
  const tableBody = orcamento.itens.map((item, i) => {
    return [
      (i + 1).toString(),
      item.descricao,
      item.unidade || '—',
      item.quantidade.toString(),
      formatarMoeda(item.preco_unitario),
      item.desconto_item > 0 ? `${item.desconto_item}%` : '—',
      formatarMoeda(item.subtotal),
    ]
  })

  autoTable(doc, {
    startY: currentBlockY,
    head: [['#', 'DESCRIÇÃO', 'APRESENTAÇÃO', 'QTD', 'VALOR UNIT.', 'DESC.', 'VALOR TOTAL']],
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
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentBlockY + 20
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
  doc.text('', margin + 3, footerY + 0.5, { align: 'center' })

  setText(DARK_TEXT)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const dataGeracao = new Date().toLocaleDateString('pt-BR')
  const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  doc.text(`Proposta gerada em ${dataGeracao} às ${horaGeracao}`, margin + 10, footerY - 0.5)
  doc.text('Documento gerado automaticamente pelo CRM DPRIME.', margin + 10, footerY + 3)

  return Buffer.from(doc.output('arraybuffer'))
}
