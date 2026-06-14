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
  // 1. HEADER PREMIUM
  // ==========================================================
  const headerTop = 10
  const org = orcamento.organizacao

  // Logo da empresa
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

  // Nome da empresa
  setText(DARK_TEXT)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(org?.nome_fantasia || org?.nome || 'DPRIME', margin, headerTop + 26)

  // CNPJ
  if (org?.cnpj) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`CNPJ: ${org.cnpj}`, margin, headerTop + 32)
  }

  // Contatos (sem emojis)
  const contactY = headerTop + 38
  let contactX = margin

  if (org?.email) {
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(org.email, contactX, contactY)
    contactX += doc.getTextWidth(org.email) + 8
  }

  if (org?.telefone) {
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.text(org.telefone, contactX, contactY)
    contactX += doc.getTextWidth(org.telefone) + 8
  }

  if (org?.site) {
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.text(org.site, contactX, contactY)
  }

  // Lado direito: PROPOSTA COMERCIAL
  setText(GREEN)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('PROPOSTA COMERCIAL', pageWidth - margin, headerTop + 8, { align: 'right' })

  // Número e data
  const numBoxW = 60
  const numBoxH = 12
  const numBoxX = pageWidth - margin - numBoxW
  const numBoxY = headerTop + 14

  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  setFill(GREEN_LIGHT2)
  doc.roundedRect(numBoxX, numBoxY, numBoxW, numBoxH, 2, 2, 'FD')

  setText(GREEN)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`N. ${orcamento.numero.toString().padStart(3, '0')}`, numBoxX + numBoxW / 2, numBoxY + 8, { align: 'center' })

  // Data formatada
  const dataFormatada = new Date(orcamento.criado_em).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  setText(GRAY_TEXT)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(dataFormatada, pageWidth - margin, numBoxY + numBoxH + 6, { align: 'right' })

  // Responsável
  if (orcamento.responsavel?.nome) {
    doc.text(`Responsavel: ${orcamento.responsavel.nome}`, pageWidth - margin, numBoxY + numBoxH + 11, { align: 'right' })
  }

  // Linha separadora
  const headerBottom = headerTop + 52
  setDraw(GREEN)
  doc.setLineWidth(1)
  doc.line(margin, headerBottom, pageWidth - margin, headerBottom)

  // ==========================================================
  // 2. DADOS DO CLIENTE
  // ==========================================================
  const cliente = orcamento.contato || orcamento.lead
  let currentY = headerBottom + 8

  // Título da seção
  setText(GRAY_TEXT)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('DADOS DO CLIENTE', margin, currentY)
  currentY += 4

  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.3)
  doc.line(margin, currentY, margin + 40, currentY)
  currentY += 6

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

  // Card do cliente
  const cardW = contentWidth
  const cardH = 38

  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.3)
  setFill(WHITE)
  doc.roundedRect(margin, currentY, cardW, cardH, 2, 2, 'FD')

  let cardY = currentY + 6
  const leftColX = margin + 4
  const rightColX = margin + cardW / 2 + 4

  // Coluna esquerda - dados principais
  setText(DARK_TEXT)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(cliente?.nome || '—', leftColX, cardY)
  cardY += 5

  // CPF/CNPJ
  const docCliente = orcamento.contato?.cpf_cnpj || orcamento.lead?.cpf_cnpj
  if (docCliente) {
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`CPF/CNPJ: ${docCliente}`, leftColX, cardY)
    cardY += 4
  }

  // Telefone e Email
  if (cliente?.telefone || cliente?.email) {
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    if (cliente?.telefone) doc.text(`Tel: ${cliente.telefone}`, leftColX, cardY)
    if (cliente?.email) {
      const emailX = cliente?.telefone ? leftColX + 45 : leftColX
      doc.text(`Email: ${cliente.email}`, emailX, cardY)
    }
    cardY += 4
  }

  // Conselho e especialidade
  if (orcamento.contato?.tipo_conselho && orcamento.contato?.numero_conselho) {
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const conselho = `${orcamento.contato.tipo_conselho} ${orcamento.contato.numero_conselho}${orcamento.contato.uf_conselho ? `/${orcamento.contato.uf_conselho}` : ''}`
    doc.text(conselho, leftColX, cardY)
    cardY += 4
  }

  if (orcamento.contato?.especialidade) {
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text(orcamento.contato.especialidade, leftColX, cardY)
  }

  // Coluna direita - empresa e endereço
  let rightCardY = currentY + 6

  // Empresa
  if (orcamento.contato?.empresa?.nome || orcamento.contato?.categoria_cliente) {
    setText(DARK_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    const empresaNome = orcamento.contato?.empresa?.nome || orcamento.contato?.categoria_cliente || ''
    doc.text(empresaNome, rightColX, rightCardY)
    rightCardY += 5
  }

  // Tipo de pessoa
  if (orcamento.contato?.tipo_pessoa && orcamento.contato?.categoria_cliente) {
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`${orcamento.contato.tipo_pessoa} - ${orcamento.contato.categoria_cliente}`, rightColX, rightCardY)
    rightCardY += 4
  }

  // Endereço
  if (endereco) {
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const endLines = quebrarEnderecoInteligente(endereco).split('\n')
    endLines.forEach((line) => {
      if (line.trim()) {
        doc.text(line.trim(), rightColX, rightCardY)
        rightCardY += 4
      }
    })
  }

  currentY += cardH + 6

  // ==========================================================
  // 3. DADOS PARA EMISSÃO DA NOTA (se existirem)
  // ==========================================================
  const isPF = orcamento.nota_tipo_pessoa === 'PF'
  const temNota = !!(orcamento.nota_nome || orcamento.nota_documento)

  if (temNota) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS PARA EMISSAO DA NOTA', margin, currentY)
    currentY += 4

    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.3)
    doc.line(margin, currentY, margin + 60, currentY)
    currentY += 6

    // Card de nota
    const notaCardH = isPF ? 28 : 32

    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.3)
    setFill(WHITE)
    doc.roundedRect(margin, currentY, cardW, notaCardH, 2, 2, 'FD')

    let notaY = currentY + 6
    const notaLeftX = margin + 4
    const notaRightX = margin + cardW / 2 + 4

    // Coluna esquerda
    setText(DARK_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(isPF ? 'Pessoa Fisica' : 'Pessoa Juridica', notaLeftX, notaY)
    notaY += 5

    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    if (orcamento.nota_nome) {
      doc.text(isPF ? 'Nome:' : 'Razao Social:', notaLeftX, notaY)
      setText(DARK_TEXT)
      doc.text(orcamento.nota_nome, notaLeftX + 35, notaY)
      notaY += 4
    }

    if (orcamento.nota_documento) {
      setText(GRAY_TEXT)
      doc.text(isPF ? 'CPF:' : 'CNPJ:', notaLeftX, notaY)
      setText(DARK_TEXT)
      doc.text(orcamento.nota_documento, notaLeftX + 15, notaY)
      notaY += 4
    }

    if (isPF && cliente?.telefone) {
      setText(GRAY_TEXT)
      doc.text('Telefone:', notaLeftX, notaY)
      setText(DARK_TEXT)
      doc.text(cliente.telefone, notaLeftX + 25, notaY)
    }

    // Coluna direita
    let notaRightY = currentY + 6

    if (!isPF && orcamento.nota_nome_fantasia) {
      setText(GRAY_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Nome Fantasia:', notaRightX, notaRightY)
      setText(DARK_TEXT)
      doc.text(orcamento.nota_nome_fantasia, notaRightX + 35, notaRightY)
      notaRightY += 4
    }

    if (!isPF && (orcamento.nota_ie || orcamento.nota_im)) {
      setText(GRAY_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      if (orcamento.nota_ie) {
        doc.text('IE:', notaRightX, notaRightY)
        setText(DARK_TEXT)
        doc.text(orcamento.nota_ie, notaRightX + 8, notaRightY)
        notaRightY += 4
      }
      if (orcamento.nota_im) {
        setText(GRAY_TEXT)
        doc.text('IM:', notaRightX, notaRightY)
        setText(DARK_TEXT)
        doc.text(orcamento.nota_im, notaRightX + 8, notaRightY)
      }
    }

    if (orcamento.nota_endereco) {
      setText(GRAY_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const notaEndLines = quebrarEnderecoInteligente(orcamento.nota_endereco).split('\n')
      notaEndLines.forEach((line) => {
        if (line.trim()) {
          doc.text(line.trim(), notaRightX, notaRightY)
          notaRightY += 4
        }
      })
    }

    currentY += notaCardH + 6
  }

  // ==========================================================
  // 4. ENDEREÇO DE ENTREGA (se existir)
  // ==========================================================
  const temEntrega = !!(orcamento.endereco_entrega && orcamento.endereco_entrega.trim().length > 0)

  if (temEntrega) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ENDERECO DE ENTREGA', margin, currentY)
    currentY += 4

    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.3)
    doc.line(margin, currentY, margin + 50, currentY)
    currentY += 6

    // Calcular altura dinâmica
    const entregaLines = orcamento.endereco_entrega!.split('\n').filter(l => l.trim()).length
    const temComplementos = !!(orcamento.contato?.endereco_bairro || orcamento.contato?.endereco_cidade)
    const entregaH = Math.max(20, 14 + (entregaLines * 4) + (temComplementos ? 6 : 0))

    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.3)
    setFill(GREEN_LIGHT2)
    doc.roundedRect(margin, currentY, cardW, entregaH, 2, 2, 'FD')

    let entregaY = currentY + 6
    const entregaX = margin + 4

    // Destinatário
    setText(DARK_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`Destinatario: ${cliente?.nome || '—'}`, entregaX, entregaY)
    entregaY += 5

    // Endereço
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
      doc.setFontSize(8)
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

    currentY += entregaH + 6
  }

  // ==========================================================
  // 5. DADOS COMERCIAIS (Fornecedor, Hub, Transportadora, Pagamento)
  // ==========================================================
  const temFornecedor = !!(orcamento.fornecedor?.nome || orcamento.carrier?.nome)
  const temFormaPagamento = !!(orcamento.forma_pagamento)
  const temObs = !!(orcamento.observacoes)

  if (temFornecedor || temFormaPagamento || temObs) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS COMERCIAIS', margin, currentY)
    currentY += 4

    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.3)
    doc.line(margin, currentY, margin + 45, currentY)
    currentY += 6

    // Cards na mesma linha
    const cardComH = 18
    let cardX = margin

    // Card Fornecedor
    if (temFornecedor) {
      const fornW = 70
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(cardX, currentY, fornW, cardComH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('FORNECEDOR', cardX + 3, currentY + 5)

      setText(DARK_TEXT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(orcamento.fornecedor?.nome || '', cardX + 3, currentY + 12)

      cardX += fornW + 4
    }

    // Card Transportadora
    if (orcamento.carrier?.nome) {
      const transW = 60
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(cardX, currentY, transW, cardComH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('TRANSPORTADORA', cardX + 3, currentY + 5)

      setText(DARK_TEXT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(orcamento.carrier.nome, cardX + 3, currentY + 12)

      cardX += transW + 4
    }

    // Card Forma de Pagamento
    if (temFormaPagamento) {
      const pagW = 60
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(cardX, currentY, pagW, cardComH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('PAGAMENTO', cardX + 3, currentY + 5)

      setText(DARK_TEXT)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(orcamento.forma_pagamento!, cardX + 3, currentY + 12)
    }

    currentY += cardComH + 6

    // Observações (se existirem)
    if (temObs) {
      const obsH = Math.max(14, 8 + (Math.min(orcamento.observacoes!.split('\n').length, 2) * 5))

      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(margin, currentY, cardW, obsH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('OBSERVACOES', margin + 3, currentY + 5)

      setText(DARK_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const obsLines = orcamento.observacoes!.split('\n').slice(0, 2)
      const obsText = obsLines.join(' | ')
      const wrappedObs = doc.splitTextToSize(obsText, cardW - 10)
      doc.text(wrappedObs.slice(0, 2), margin + 3, currentY + 11)

      currentY += obsH + 6
    }
  }

  // ==========================================================
  // 6. TABELA DE PRODUTOS
  // ==========================================================
  const prodY = currentY
  const prodH = 14

  // Barra de título
  setFill(GREEN)
  doc.roundedRect(margin, prodY, contentWidth, prodH, 2, 2, 'F')
  doc.rect(margin, prodY + prodH - 3, contentWidth, 3, 'F')

  setText(WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTOS', margin + 4, prodY + prodH / 2 + 1.5)

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
    pageBreak: 'avoid',
    showHead: 'everyPage',
    margin: { left: margin, right: margin, bottom: 50 },
  })

  // ==========================================================
  // 7. RESUMO FINANCEIRO
  // ==========================================================
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 20
  let ry = finalY + 6

  // Verificar espaço
  if (ry + 40 > pageHeight - 30) {
    doc.addPage()
    ry = 20
  }

  const rightAlign = pageWidth - margin
  const resumoW = 90
  const resumoX = rightAlign - resumoW
  const resumoH = 40

  // Card resumo
  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  setFill(WHITE)
  doc.roundedRect(resumoX, ry, resumoW, resumoH, 3, 3, 'FD')

  let ryi = ry + 8
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')

  // Subtotal
  setText(DARK_TEXT)
  doc.text('Subtotal:', resumoX + 6, ryi)
  doc.text(formatarMoeda(orcamento.valor_subtotal), rightAlign - 4, ryi, { align: 'right' })
  ryi += 6

  // Desconto
  doc.text('Desconto:', resumoX + 6, ryi)
  if (orcamento.desconto_geral > 0) {
    doc.setTextColor(200, 50, 50)
    doc.text(`-${formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}`, rightAlign - 4, ryi, { align: 'right' })
  } else {
    setText(DARK_TEXT)
    doc.text('R$ 0,00', rightAlign - 4, ryi, { align: 'right' })
  }
  ryi += 6

  // Frete
  setText(DARK_TEXT)
  doc.text('Frete:', resumoX + 6, ryi)
  doc.text(`+${formatarMoeda(orcamento.frete)}`, rightAlign - 4, ryi, { align: 'right' })
  ryi += 6

  // Linha separadora
  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  doc.line(resumoX + 6, ryi, rightAlign - 4, ryi)
  ryi += 7

  // Total
  setFill(GREEN)
  doc.roundedRect(resumoX, ryi - 4, resumoW, 14, 2, 2, 'F')
  setText(WHITE)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('VALOR TOTAL', resumoX + 6, ryi + 5)
  doc.setFontSize(14)
  doc.text(formatarMoeda(orcamento.valor_total), rightAlign - 4, ryi + 5, { align: 'right' })

  // ==========================================================
  // 8. RODAPÉ
  // ==========================================================
  const footerY = pageHeight - 10

  // Linha
  setDraw(GREEN)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)

  // Data e hora
  setText(GRAY_TEXT)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const dataGeracao = new Date().toLocaleDateString('pt-BR')
  const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  doc.text(`Proposta gerada em ${dataGeracao} as ${horaGeracao}`, margin, footerY - 2)

  // Disclaimer
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  const disclaimer = 'Medicamentos requerem prescricao medica. DPRIME - Representacao Farmaceutica.'
  doc.text(disclaimer, margin, footerY + 3)

  return Buffer.from(doc.output('arraybuffer'))
}