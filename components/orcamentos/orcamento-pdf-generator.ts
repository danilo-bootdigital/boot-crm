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
  fornecedor: {
    id: string
    nome: string
    hub_id: string | null
    health_hubs: { id: string; nome: string; logo_url: string | null } | null
  } | null
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
    .replace(/,\s*(\d+)/g, ',\n$1')
    .replace(/\s+-\s+/g, '\n')
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

  // Timeout para carregamento de logos
  async function loadLogo(url: string, timeoutMs = 5000): Promise<string | null> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
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
  // 1. HEADER PDF — GRID FIXO 3 COLUNAS
  // ==========================================================

  // --- HELPERS DE TEXTO ---
  // Trunca texto com "..." se ultrapassar maxWidth
  function truncateText(text: string, maxWidth: number): string {
    if (!text) return ''
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    if (doc.getTextWidth(text) <= maxWidth) return text
    let truncated = text
    while (truncated.length > 3 && doc.getTextWidth(truncated + '...') > maxWidth) {
      truncated = truncated.slice(0, -1)
    }
    return truncated + '...'
  }

  // Desenha campo label + valor com espaçamento correto
  // Retorna o próximo Y após o campo
  function drawField(label: string, value: string, x: number, y: number, maxWidth: number): number {
    const labelY = y
    const valueY = y + 7  // 7mm abaixo do label

    // Label: 9pt, cinza
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(label, x, labelY)

    // Valor: 11pt, grafite
    setText(DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const truncatedValue = truncateText(value, maxWidth)
    doc.text(truncatedValue, x, valueY)

    // Próximo campo: 11mm abaixo
    return valueY + 11
  }

  // Calcula dimensões proporcionais do logo
  function getLogoDimensions(originalWidth: number, originalHeight: number, maxW: number, maxH: number) {
    const ratio = originalWidth / originalHeight
    if (ratio > maxW / maxH) {
      // Mais largo - ajustar por largura
      return { width: maxW, height: maxW / ratio }
    } else {
      // Mais alto - ajustar por altura
      return { width: maxH * ratio, height: maxH }
    }
  }

  // --- DIMENSÕES FIXAS DO HEADER ---
  const H = {
    x: margin,                           // 15
    y: 8,                                  // 8
    w: contentWidth,                       // 180
    h: 52,                                 // 52mm altura
    col1: { x: 15, w: 52 },              // Empresa
    col2: { x: 72, w: 52 },              // Contatos
    col3: { x: 130, w: 65 },             // Proposta
    lineY: 60                              // y da linha separadora
  }

  const org = orcamento.organizacao

  // --- LINHA VERDE FINA NO TOPO (1mm) ---
  setFill(GREEN)
  doc.setLineWidth(0)
  doc.rect(H.x, H.y, H.w, 1, 'F')

  // --- COLUNA 1: EMPRESA ---
  const c1 = H.col1
  const logoMaxW = 45
  const logoMaxH = 22

  // Logo (proporção preservada)
  if (org?.logo_url) {
    const logoData = await loadLogo(org.logo_url)
    if (logoData) {
      try {
        // Obter dimensões da imagem (supondo ~200x80 como exemplo)
        // Como não temos acesso direto às dimensões, usamos a função de ajuste proporcional
        const logoDims = getLogoDimensions(200, 80, logoMaxW, logoMaxH) // proporção 2.5:1
        doc.addImage(logoData, 'PNG', c1.x, H.y + 3, logoDims.width, logoDims.height)
      } catch {
        // Logo falhou - mostra texto
        setText(GREEN)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text(truncateText(org.nome_fantasia || org.nome || 'DPRIME', c1.w), c1.x, H.y + 16)
      }
    }
  } else {
    // Sem logo - mostra texto
    setText(GREEN)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(truncateText(org?.nome_fantasia || org?.nome || 'DPRIME', c1.w), c1.x, H.y + 16)
  }

  // Subtítulo "Representação Farmacêutica" (11pt, bold, verde)
  setText(GREEN)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Representacao Farmaceutica', c1.x, H.y + 30)

  // CNPJ
  if (org?.cnpj) {
    doc.setFontSize(9)
    doc.text(`CNPJ: ${org.cnpj}`, c1.x, H.y + 31)
  }

  // --- SEPARADOR 1 ---
  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.3)
  doc.line(c1.x + c1.w + 3, H.y + 4, c1.x + c1.w + 3, H.y + H.h - 4)

  // --- COLUNA 2: CONTATOS (drawField com espaçamento 11mm) ---
  const c2 = H.col2
  let cy = H.y + 6

  // Telefone
  if (org?.telefone) {
    cy = drawField('Tel:', org.telefone, c2.x, cy, c2.w)
  }

  // E-mail
  if (org?.email) {
    cy = drawField('E-mail:', org.email, c2.x, cy, c2.w)
  }

  // Site
  if (org?.site) {
    cy = drawField('Site:', org.site, c2.x, cy, c2.w)
  }

  // Instagram
  if (org?.instagram) {
    cy = drawField('Insta:', org.instagram, c2.x, cy, c2.w)
  }

  // --- SEPARADOR 2 ---
  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.3)
  doc.line(c2.x + c2.w + 3, H.y + 4, c2.x + c2.w + 3, H.y + H.h - 4)

  // --- COLUNA 3: PROPOSTA ---
  const c3 = { x: pageWidth - margin - H.col3.w, w: H.col3.w }
  const rightEdge = pageWidth - margin

  // Título "PROPOSTA COMERCIAL" (16pt, não encostar no topo)
  setText(GREEN)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('PROPOSTA', rightEdge, H.y + 10, { align: 'right' })
  doc.setFontSize(13)
  doc.text('COMERCIAL', rightEdge, H.y + 18, { align: 'right' })

  // Número da proposta (texto simples, sem box exagerado)
  setText(GREEN)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Proposta N. ${orcamento.numero.toString().padStart(3, '0')}`, rightEdge, H.y + 28, { align: 'right' })

  // Data
  const dataFormatada = new Date(orcamento.criado_em).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  setText(GRAY_TEXT)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Data:', rightEdge - 28, H.y + 38, { align: 'right' })
  setText(DARK_TEXT)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(dataFormatada, rightEdge, H.y + 38, { align: 'right' })

  // Responsável/Vendedor
  if (orcamento.responsavel?.nome) {
    setText(GRAY_TEXT)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Vendedor:', rightEdge - 32, H.y + 45, { align: 'right' })
    setText(DARK_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    const vendedor = truncateText(orcamento.responsavel.nome, 30)
    doc.text(vendedor, rightEdge, H.y + 45, { align: 'right' })
  }

  // --- LINHA SEPARADORA FINAL ---
  setDraw(GREEN)
  doc.setLineWidth(1)
  doc.line(H.x, H.lineY, pageWidth - margin, H.lineY)

  const headerBottom = H.lineY + 4

  // ==========================================================
  // 2. DADOS DO CLIENTE (3 colunas)
  // ==========================================================
  const cliente = orcamento.contato || orcamento.lead
  let currentY = headerBottom + 6

  // Título da seção
  setText(GREEN)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('DADOS DO CLIENTE', margin, currentY)
  currentY += 5

  // Montar endereço
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

  // Card do cliente (altura baseada no conteúdo)
  const cardW = contentWidth
  const cardH = 50  // altura maior para comportar campos espaçados

  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  setFill(WHITE)
  doc.roundedRect(margin, currentY, cardW, cardH, 2, 2, 'FD')

  // Divisores verticais
  const col1X = margin + cardW / 3
  const col2X = margin + (cardW * 2) / 3

  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.2)
  doc.line(col1X - 2, currentY + 5, col1X - 2, currentY + cardH - 5)
  doc.line(col2X - 2, currentY + 5, col2X - 2, currentY + cardH - 5)

  const cardPadding = 7
  const colWidth = cardW / 3 - cardPadding

  // ========== COLUNA 1 ==========
  let col1Y = currentY + cardPadding + 4

  // Nome / Razão Social
  col1Y = drawField('NOME / RAZAO SOCIAL', cliente?.nome || '—', margin + cardPadding, col1Y, colWidth)

  // CPF/CNPJ
  const docCliente = orcamento.contato?.cpf_cnpj || orcamento.lead?.cpf_cnpj
  if (docCliente) {
    col1Y = drawField('CPF / CNPJ', docCliente, margin + cardPadding, col1Y, colWidth)
  }

  // ========== COLUNA 2 ==========
  let col2Y = currentY + cardPadding + 4

  // Telefone
  if (cliente?.telefone) {
    col2Y = drawField('TELEFONE', cliente.telefone, col1X + cardPadding, col2Y, colWidth)
  }

  // Email
  if (cliente?.email) {
    col2Y = drawField('E-MAIL', cliente.email, col1X + cardPadding, col2Y, colWidth)
  }

  // Conselho
  if (orcamento.contato?.tipo_conselho && orcamento.contato?.numero_conselho) {
    const conselhoUF = orcamento.contato.uf_conselho ? `/${orcamento.contato.uf_conselho}` : ''
    col2Y = drawField(`${orcamento.contato.tipo_conselho} / NUMERO`, `${orcamento.contato.numero_conselho}${conselhoUF}`, col1X + cardPadding, col2Y, colWidth)
  }

  // ========== COLUNA 3 ==========
  let col3Y = currentY + cardPadding + 4

  // Empresa / Categoria
  if (orcamento.contato?.empresa?.nome || orcamento.contato?.categoria_cliente) {
    const empresaNome = orcamento.contato?.empresa?.nome || orcamento.contato?.categoria_cliente || ''
    col3Y = drawField('EMPRESA / CATEGORIA', empresaNome, col2X + cardPadding, col3Y, colWidth)
  }

  // Especialidade
  if (orcamento.contato?.especialidade) {
    // Especialidade em itálico - não usa drawField padrão
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ESPECIALIDADE', col2X + cardPadding, col3Y)
    col3Y += 7
    setText(DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    doc.text(orcamento.contato.especialidade, col2X + cardPadding, col3Y)
    col3Y += 11
  }

  // Endereço
  if (endereco) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ENDERECO', col2X + cardPadding, col3Y)
    col3Y += 7
    setText(DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const endLines = quebrarEnderecoInteligente(endereco).split('\n')
    endLines.slice(0, 2).forEach((line) => {
      if (line.trim()) {
        doc.text(line.trim(), col2X + cardPadding, col3Y)
        col3Y += 11
      }
    })
  }

  currentY += cardH + 5

  // ==========================================================
  // 3. DADOS PARA EMISSÃO DA NOTA (3 colunas)
  // ==========================================================
  const isPF = orcamento.nota_tipo_pessoa === 'PF'
  const temNota = !!(orcamento.nota_nome || orcamento.nota_documento)

  if (temNota) {
    setText(GREEN)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS PARA EMISSAO DA NOTA', margin, currentY)
    currentY += 5

    // Card de nota
    const notaCardH = isPF ? 26 : 32

    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.5)
    setFill(WHITE)
    doc.roundedRect(margin, currentY, cardW, notaCardH, 2, 2, 'FD')

    // Divisores verticais
    const notaCol1X = margin + cardW / 3
    const notaCol2X = margin + (cardW * 2) / 3

    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.2)
    doc.line(notaCol1X - 2, currentY + 4, notaCol1X - 2, currentY + notaCardH - 4)
    doc.line(notaCol2X - 2, currentY + 4, notaCol2X - 2, currentY + notaCardH - 4)

    const notaPadding = 6
    const notaLabelSpacing = 3.5

    // ========== COLUNA 1 ==========
    let nota1Y = currentY + notaPadding + 4

    // Tipo de pessoa
    setText(GRAY_TEXT)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('TIPO DE PESSOA', margin + notaPadding, nota1Y)
    nota1Y += notaLabelSpacing
    setText(DARK_TEXT)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(isPF ? 'Pessoa Fisica' : 'Pessoa Juridica', margin + notaPadding, nota1Y)
    nota1Y += 8

    // CPF/CNPJ
    if (orcamento.nota_documento) {
      setText(GRAY_TEXT)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text(isPF ? 'CPF' : 'CNPJ', margin + notaPadding, nota1Y)
      nota1Y += notaLabelSpacing
      setText(DARK_TEXT)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.text(orcamento.nota_documento, margin + notaPadding, nota1Y)
    }

    // ========== COLUNA 2 ==========
    let nota2Y = currentY + notaPadding + 4

    // Nome / Razão Social
    if (orcamento.nota_nome) {
      setText(GRAY_TEXT)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text(isPF ? 'NOME' : 'RAZAO SOCIAL', notaCol1X + notaPadding, nota2Y)
      nota2Y += notaLabelSpacing
      setText(DARK_TEXT)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      doc.text(orcamento.nota_nome, notaCol1X + notaPadding, nota2Y)
      nota2Y += 8
    }

    // Nome Fantasia / IE / IM (para PJ)
    if (!isPF) {
      if (orcamento.nota_nome_fantasia) {
        setText(GRAY_TEXT)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        doc.text('NOME FANTASIA', notaCol1X + notaPadding, nota2Y)
        nota2Y += notaLabelSpacing
        setText(DARK_TEXT)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(orcamento.nota_nome_fantasia, notaCol1X + notaPadding, nota2Y)
        nota2Y += 8
      }

      if (orcamento.nota_ie || orcamento.nota_im) {
        setText(GRAY_TEXT)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        const inscLabel = orcamento.nota_ie && orcamento.nota_im ? 'IE / IM' : (orcamento.nota_ie ? 'IE' : 'IM')
        const inscValue = orcamento.nota_ie && orcamento.nota_im
          ? `${orcamento.nota_ie} / ${orcamento.nota_im}`
          : (orcamento.nota_ie || orcamento.nota_im || '')
        doc.text(inscLabel, notaCol1X + notaPadding, nota2Y)
        nota2Y += notaLabelSpacing
        setText(DARK_TEXT)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(inscValue, notaCol1X + notaPadding, nota2Y)
      }
    }

    // ========== COLUNA 3 ==========
    let nota3Y = currentY + notaPadding + 4

    // Endereço fiscal
    if (orcamento.nota_endereco) {
      setText(GRAY_TEXT)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text('ENDERECO FISCAL', notaCol2X + notaPadding, nota3Y)
      nota3Y += notaLabelSpacing
      setText(DARK_TEXT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const notaEndLines = quebrarEnderecoInteligente(orcamento.nota_endereco).split('\n')
      notaEndLines.slice(0, 3).forEach((line) => {
        if (line.trim()) {
          doc.text(line.trim(), notaCol2X + notaPadding, nota3Y)
          nota3Y += 4
        }
      })
    }

    currentY += notaCardH + 5
  }

  // ==========================================================
  // 4. ENDEREÇO DE ENTREGA (padrão visual)
  // ==========================================================
  const temEntrega = !!(orcamento.endereco_entrega && orcamento.endereco_entrega.trim().length > 0)

  if (temEntrega) {
    setText(GREEN)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ENDERECO DE ENTREGA', margin, currentY)
    currentY += 6

    // Calcular altura dinâmica
    const entregaLines = orcamento.endereco_entrega!.split('\n').filter(l => l.trim()).length
    const temComplementos = !!(orcamento.contato?.endereco_bairro || orcamento.contato?.endereco_cidade)
    const entregaH = Math.max(28, 20 + (entregaLines * 5) + (temComplementos ? 6 : 0))

    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.5)
    setFill(GREEN_LIGHT2)
    doc.roundedRect(margin, currentY, cardW, entregaH, 2, 2, 'FD')

    let entregaY = currentY + 6
    const entregaX = margin + 6

    // Destinatário
    setText(GRAY_TEXT)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('DESTINATARIO', entregaX, entregaY)
    entregaY += 4
    setText(DARK_TEXT)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(cliente?.nome || '—', entregaX, entregaY)
    entregaY += 8

    // Endereço
    setText(GRAY_TEXT)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text('ENDERECO', entregaX, entregaY)
    entregaY += 4
    setText(DARK_TEXT)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    const entregaLinesContent = orcamento.endereco_entrega!.split('\n')
    entregaLinesContent.forEach((line) => {
      if (line.trim()) {
        doc.text(line.trim(), entregaX, entregaY)
        entregaY += 4
      }
    })

    // Complementos
    if (temComplementos) {
      setText(GRAY_TEXT)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text('BAIRRO / CIDADE / CEP', entregaX, entregaY)
      entregaY += 4
      setText(DARK_TEXT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const compParts: string[] = []
      if (orcamento.contato?.endereco_bairro) compParts.push(orcamento.contato.endereco_bairro)
      if (orcamento.contato?.endereco_cidade) {
        const cidadeUF = orcamento.contato.endereco_estado
          ? `${orcamento.contato.endereco_cidade} - ${orcamento.contato.endereco_estado}`
          : orcamento.contato.endereco_cidade
        compParts.push(cidadeUF)
      }
      if (orcamento.contato?.endereco_cep) compParts.push(`CEP: ${orcamento.contato.endereco_cep}`)
      if (compParts.length > 0) {
        doc.text(compParts.join(' | '), entregaX, entregaY)
      }
    }

    currentY += entregaH + 5
  }

  // ==========================================================
  // 5. DADOS COMERCIAIS (Fornecedor, Hub, Transportadora, Pagamento)
  // ==========================================================
  const temFornecedor = !!(orcamento.fornecedor?.nome)
  const temTransportadora = !!(orcamento.carrier?.nome)
  const temFormaPagamento = !!(orcamento.forma_pagamento)
  const temObs = !!(orcamento.observacoes)
  const temHub = !!(orcamento.fornecedor?.health_hubs?.nome)

  if (temFornecedor || temTransportadora || temFormaPagamento) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS COMERCIAIS', margin, currentY)
    currentY += 5

    // Cards na mesma linha
    const cardComH = 16
    let cardX = margin

    // Card Fornecedor
    if (temFornecedor) {
      const fornW = 65
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(cardX, currentY, fornW, cardComH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text('FORNECEDOR', cardX + 3, currentY + 4)

      setText(DARK_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(orcamento.fornecedor!.nome, cardX + 3, currentY + 10)

      // Hub (se existir)
      if (temHub) {
        setText(GRAY_TEXT)
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.text(`Hub: ${orcamento.fornecedor!.health_hubs!.nome}`, cardX + 3, currentY + 14)
      }

      cardX += fornW + 3
    }

    // Card Transportadora
    if (temTransportadora) {
      const transW = 55
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(cardX, currentY, transW, cardComH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text('TRANSPORTADORA', cardX + 3, currentY + 4)

      setText(DARK_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(orcamento.carrier!.nome, cardX + 3, currentY + 10)

      cardX += transW + 3
    }

    // Card Forma de Pagamento
    if (temFormaPagamento) {
      const pagW = 55
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(cardX, currentY, pagW, cardComH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text('PAGAMENTO', cardX + 3, currentY + 4)

      setText(DARK_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(orcamento.forma_pagamento!, cardX + 3, currentY + 10)
    }

    currentY += cardComH + 5

    // Observações (se existirem)
    if (temObs) {
      const obsH = Math.max(12, 6 + (Math.min(orcamento.observacoes!.split('\n').length, 2) * 4))

      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(margin, currentY, cardW, obsH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'bold')
      doc.text('OBSERVACOES', margin + 3, currentY + 4)

      setText(DARK_TEXT)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      const obsLines = orcamento.observacoes!.split('\n').slice(0, 2)
      const obsText = obsLines.join(' | ')
      const wrappedObs = doc.splitTextToSize(obsText, cardW - 10)
      doc.text(wrappedObs.slice(0, 2), margin + 3, currentY + 9)

      currentY += obsH + 5
    }
  }

  // ==========================================================
  // 6. TABELA DE PRODUTOS
  // ==========================================================
  const prodY = currentY
  const prodH = 12

  // Barra de título
  setFill(GREEN)
  doc.roundedRect(margin, prodY, contentWidth, prodH, 2, 2, 'F')
  doc.rect(margin, prodY + prodH - 2, contentWidth, 2, 'F')

  setText(WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTOS', margin + 4, prodY + prodH / 2 + 1)

  currentY = prodY + prodH + 2

  // Dados da tabela
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
    startY: currentY,
    head: [['#', 'DESCRICAO', 'APRESENTACAO', 'QTD', 'VALOR UNIT.', 'DESC.', 'VALOR TOTAL']],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [GREEN_BORDER[0], GREEN_BORDER[1], GREEN_BORDER[2]],
      lineWidth: 0.2,
      textColor: [DARK_TEXT[0], DARK_TEXT[1], DARK_TEXT[2]],
      valign: 'middle',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [GREEN[0], GREEN[1], GREEN[2]],
      textColor: [WHITE[0], WHITE[1], WHITE[2]],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 8,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', minCellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 30, fontSize: 6, textColor: [GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]], fontStyle: 'normal' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    pageBreak: 'avoid',
    showHead: 'everyPage',
    margin: { left: margin, right: margin, bottom: 45 },
  })

  // ==========================================================
  // 7. RESUMO FINANCEIRO
  // ==========================================================
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 20
  let ry = finalY + 5

  // Verificar espaço
  if (ry + 35 > pageHeight - 25) {
    doc.addPage()
    ry = 15
  }

  const rightAlign = pageWidth - margin
  const resumoW = 85
  const resumoX = rightAlign - resumoW
  const resumoH = 36

  // Card resumo
  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  setFill(WHITE)
  doc.roundedRect(resumoX, ry, resumoW, resumoH, 3, 3, 'FD')

  let ryi = ry + 6
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')

  // Subtotal
  setText(DARK_TEXT)
  doc.text('Subtotal:', resumoX + 5, ryi)
  doc.text(formatarMoeda(orcamento.valor_subtotal), rightAlign - 3, ryi, { align: 'right' })
  ryi += 5

  // Desconto
  doc.text('Desconto:', resumoX + 5, ryi)
  if (orcamento.desconto_geral > 0) {
    doc.setTextColor(200, 50, 50)
    doc.text(`-${formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}`, rightAlign - 3, ryi, { align: 'right' })
  } else {
    setText(DARK_TEXT)
    doc.text('R$ 0,00', rightAlign - 3, ryi, { align: 'right' })
  }
  ryi += 5

  // Frete
  setText(DARK_TEXT)
  doc.text('Frete:', resumoX + 5, ryi)
  doc.text(`+${formatarMoeda(orcamento.frete)}`, rightAlign - 3, ryi, { align: 'right' })
  ryi += 5

  // Linha separadora
  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.3)
  doc.line(resumoX + 5, ryi, rightAlign - 3, ryi)
  ryi += 6

  // Total
  setFill(GREEN)
  doc.roundedRect(resumoX, ryi - 3, resumoW, 12, 2, 2, 'F')
  setText(WHITE)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('VALOR TOTAL', resumoX + 5, ryi + 4)
  doc.setFontSize(12)
  doc.text(formatarMoeda(orcamento.valor_total), rightAlign - 3, ryi + 4, { align: 'right' })

  // ==========================================================
  // 8. RODAPÉ
  // ==========================================================
  const footerY = pageHeight - 8

  // Linha
  setDraw(GREEN)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)

  // Data e hora
  setText(GRAY_TEXT)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  const dataGeracao = new Date().toLocaleDateString('pt-BR')
  const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  doc.text(`Proposta gerada em ${dataGeracao} as ${horaGeracao}`, margin, footerY - 1)

  // Disclaimer
  doc.setFontSize(6)
  doc.setFont('helvetica', 'italic')
  const disclaimer = 'Medicamentos requerem prescricao medica. DPRIME - Representacao Farmaceutica.'
  doc.text(disclaimer, margin, footerY + 3)

  return Buffer.from(doc.output('arraybuffer'))
}