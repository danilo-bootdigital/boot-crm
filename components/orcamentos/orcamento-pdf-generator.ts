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

  // Helpers de cor
  const setFill = (color: readonly number[]) => doc.setFillColor(color[0], color[1], color[2])
  const setText = (color: readonly number[]) => doc.setTextColor(color[0], color[1], color[2])
  const setDraw = (color: readonly number[]) => doc.setDrawColor(color[0], color[1], color[2])

  // Carregar logo como base64 com timeout
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
    } catch (e) {
      // Timeout ou erro de rede - não bloqueia geração
      return null
    }
  }

  // ==========================================================
  // HEADER PREMIUM
  // ==========================================================
  const headerTop = 10
  const org = orcamento.organizacao

  // Logo da empresa (esquerda)
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

  // Nome da empresa e CNPJ
  setText(DARK_TEXT)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(org?.nome_fantasia || org?.nome || 'DPRIME', margin, headerTop + 26)

  if (org?.cnpj) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`CNPJ: ${org.cnpj}`, margin, headerTop + 32)
  }

  // Contatos na mesma linha
  const contactY = headerTop + 38
  let contactX = margin
  const contactSpacing = 60

  if (org?.email) {
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(org.email, contactX, contactY)
    contactX += doc.getTextWidth(org.email) + 10
  }

  if (org?.telefone) {
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.text(org.telefone, contactX, contactY)
    contactX += doc.getTextWidth(org.telefone) + 10
  }

  if (org?.site) {
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.text(org.site, contactX, contactY)
  }

  // Lado direito: PROPOSTA COMERCIAL + Data
  setText(GREEN)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('PROPOSTA COMERCIAL', pageWidth - margin, headerTop + 10, { align: 'right' })

  // Data da proposta
  const dataFormatada = new Date(orcamento.criado_em).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })

  // Cidade/Estado (se disponível no endereço da org)
  const cidadeEstado = org?.endereco
    ? org.endereco.split(',').pop()?.trim()
    : null

  setText(GRAY_TEXT)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  if (cidadeEstado) {
    doc.text(`${cidadeEstado}, ${dataFormatada}`, pageWidth - margin, headerTop + 18, { align: 'right' })
  } else {
    doc.text(dataFormatada, pageWidth - margin, headerTop + 18, { align: 'right' })
  }

  // Linha separadora verde
  const headerBottom = headerTop + 45
  setDraw(GREEN)
  doc.setLineWidth(1)
  doc.line(margin, headerBottom, pageWidth - margin, headerBottom)

  // ==========================================================
  // BLOCO: CLIENTE + ENDEREÇO (2 colunas)
  // ==========================================================
  const cliente = orcamento.contato || orcamento.lead
  let currentY = headerBottom + 8

  // Função para montar endereço completo
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

  // Título da seção
  setText(GRAY_TEXT)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('PROPOSTA ENVIADA A', margin, currentY)
  currentY += 3
  setDraw(GRAY_TEXT)
  doc.setLineWidth(0.3)
  doc.line(margin, currentY, margin + 50, currentY)
  currentY += 6

  // Card cliente (coluna esquerda)
  const colLeftW = contentWidth * 0.45
  const colRightW = contentWidth * 0.55

  // Nome do cliente (destaque)
  setText(DARK_TEXT)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(cliente?.nome || '—', margin, currentY)

  // Conselho e especialidade
  let infoY = currentY + 5
  if (orcamento.contato?.tipo_conselho && orcamento.contato?.numero_conselho) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const conselho = `${orcamento.contato.tipo_conselho} ${orcamento.contato.numero_conselho}${orcamento.contato.uf_conselho ? `/${orcamento.contato.uf_conselho}` : ''}`
    doc.text(conselho, margin, infoY)
    infoY += 4
  }

  if (orcamento.contato?.especialidade) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text(orcamento.contato.especialidade, margin, infoY)
    infoY += 4
  }

  // Email e telefone
  if (cliente?.email || cliente?.telefone) {
    infoY += 2
    setText(GRAY_TEXT)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    if (cliente?.email) doc.text(cliente.email, margin, infoY)
    if (cliente?.telefone) {
      const emailWidth = cliente?.email ? doc.getTextWidth(cliente.email) + 10 : 0
      doc.text(cliente.telefone, margin + emailWidth, infoY)
    }
  }

  // Endereço (coluna direita)
  const rightColX = margin + colLeftW + 5
  const rightColW = colRightW - 5

  if (endereco) {
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ENDERECO', rightColX, currentY - 2)

    setText(DARK_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const enderecoLines = quebrarEnderecoInteligente(endereco).split('\n')
    let endY = currentY + 4
    enderecoLines.forEach((line) => {
      if (line.trim()) doc.text(line.trim(), rightColX, endY)
      endY += 4
    })
  }

  currentY = infoY + 8

  // Linha separadora
  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.3)
  doc.line(margin, currentY, pageWidth - margin, currentY)
  currentY += 8

  // ==========================================================
  // BLOCO: ENDEREÇO DE ENTREGA (condicional)
  // ==========================================================
  const temEntrega = !!(orcamento.endereco_entrega && orcamento.endereco_entrega.trim().length > 0)

  if (temEntrega) {
    // Título
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('ENDERECO DE ENTREGA', margin, currentY)
    currentY += 5

    // Calcular altura dinâmica do box de entrega
    const entregaLines = orcamento.endereco_entrega!.split('\n').filter(l => l.trim()).length
    const temComplementos = !!(orcamento.contato?.endereco_bairro || orcamento.contato?.endereco_cidade || orcamento.contato?.endereco_cep)
    const entregaH = Math.max(20, 12 + (entregaLines * 4) + (temComplementos ? 6 : 0))

    // Box do endereço de entrega
    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.3)
    setFill(GREEN_LIGHT2)
    doc.roundedRect(margin, currentY, contentWidth, entregaH, 2, 2, 'FD')

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

    // Complementos do contato (bairro, cidade, CEP)
    if (temComplementos) {
      let compY = entregaY
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
        doc.text(compParts.join(' | '), entregaX, compY)
      }
    }

    currentY += entregaH + 4
  }

  // ==========================================================
  // BLOCO: CONDIÇÕES COMERCIAIS (Forma de Pagamento + Observações)
  // ==========================================================
  const temFormaPagamento = !!(orcamento.forma_pagamento)
  const temObservacoes = !!(orcamento.observacoes)

  if (temFormaPagamento || temObservacoes) {
    // Título
    setText(GRAY_TEXT)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('CONDICOES COMERCIAIS', margin, currentY)
    currentY += 5

    // Calcular altura dinâmica dos cards
    let condH = 18
    if (temObservacoes) {
      const obsLines = orcamento.observacoes!.split('\n').length
      condH = Math.max(18, 6 + (Math.min(obsLines, 3) * 5))
    }

    // Cards de condições
    const condY = currentY

    if (temFormaPagamento) {
      // Box forma de pagamento
      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(margin, condY, 70, condH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('PAGAMENTO', margin + 4, condY + 5)

      setText(DARK_TEXT)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(orcamento.forma_pagamento!, margin + 4, condY + 12)
    }

    // Observações (se existirem)
    if (temObservacoes) {
      const obsX = temFormaPagamento ? margin + 75 : margin
      const obsW = temFormaPagamento ? contentWidth - 70 : contentWidth

      setDraw(GREEN_BORDER)
      doc.setLineWidth(0.3)
      setFill(GREEN_LIGHT2)
      doc.roundedRect(obsX, condY, obsW, condH, 2, 2, 'FD')

      setText(GREEN)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('OBSERVACOES', obsX + 4, condY + 5)

      setText(DARK_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      // Limitar a 3 linhas
      const obsLinesContent = orcamento.observacoes!.split('\n').slice(0, 3)
      const obsText = obsLinesContent.join(' | ')
      const wrappedObs = doc.splitTextToSize(obsText, obsW - 10)
      doc.text(wrappedObs.slice(0, 3), obsX + 4, condY + 12)
    }

    currentY = condY + condH + 6
  }

  // ==========================================================
  // TABELA: PRODUTOS
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
  doc.text('ITENS DA PROPOSTA', margin + 4, prodY + prodH / 2 + 1.5)

  currentY = prodY + prodH + 2

  // Construir dados da tabela (sem coluna APRESENTAÇÃO)
  const tableBody = orcamento.itens.map((item, i) => {
    return [
      (i + 1).toString(),
      item.descricao,
      item.quantidade.toString(),
      formatarMoeda(item.preco_unitario),
      item.desconto_item > 0 ? `${item.desconto_item}%` : '—',
      formatarMoeda(item.subtotal),
    ]
  })

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'PRODUTO', 'QTD', 'UNITARIO', 'DESC.', 'TOTAL']],
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
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto', minCellWidth: 70, fontStyle: 'bold' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    pageBreak: 'avoid',
    showHead: 'everyPage',
    margin: { left: margin, right: margin, bottom: 60 },
  })

  // ==========================================================
  // RESUMO FINANCEIRO + FORNECEDOR (2 colunas)
  // ==========================================================
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? currentY + 20
  let ry = finalY + 6

  // Verificar espaço para o resumo
  if (ry + 40 > pageHeight - 30) {
    doc.addPage()
    ry = 20
  }

  const rightAlign = pageWidth - margin
  const resumoW = 85
  const resumoX = margin
  const resumoH = 38

  // Card resumo financeiro
  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  setFill(WHITE)
  doc.roundedRect(resumoX, ry, resumoW, resumoH, 3, 3, 'FD')

  let ryi = ry + 7
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
  ryi += 5

  // Linha separadora
  setDraw(GREEN_BORDER)
  doc.setLineWidth(0.5)
  doc.line(resumoX + 6, ryi, rightAlign - 4, ryi)
  ryi += 6

  // Total
  setFill(GREEN)
  doc.roundedRect(resumoX, ryi - 4, resumoW, 12, 2, 2, 'F')
  setText(WHITE)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('VALOR TOTAL', resumoX + 6, ryi + 4)
  doc.setFontSize(14)
  doc.text(formatarMoeda(orcamento.valor_total), rightAlign - 4, ryi + 4, { align: 'right' })

  // ==========================================================
  // FORNECEDOR | HUB | TRANSPORTADORA (condicional)
  // ==========================================================
  const nomeFornecedor = orcamento.fornecedor?.health_hubs?.nome || orcamento.fornecedor?.nome
  const temFornecedor = !!(nomeFornecedor || orcamento.carrier)

  if (temFornecedor) {
    const fornX = resumoX + resumoW + 10
    const fornW = contentWidth - resumoW - 10
    const fornH = 38

    // Card do fornecedor
    setDraw(GREEN_BORDER)
    doc.setLineWidth(0.5)
    setFill(WHITE)
    doc.roundedRect(fornX, ry, fornW, fornH, 3, 3, 'FD')

    let fx = fornX + 6
    const fy = ry + 8

    // Logo do hub (se existir)
    const hubLogo = orcamento.fornecedor?.health_hubs?.logo_url
    if (hubLogo) {
      const hubLogoData = await loadLogo(hubLogo)
      if (hubLogoData) {
        try {
          doc.addImage(hubLogoData, 'PNG', fx, ry + 6, 25, 15)
        } catch {
          // Logo não carregado
        }
      }
    }

    // Nome do fornecedor/hub
    if (nomeFornecedor) {
      const logoOffset = hubLogo ? 30 : 0
      setText(GREEN)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(nomeFornecedor, fx + logoOffset, fy)

      // Transportadora (se existir)
      if (orcamento.carrier) {
        setText(GRAY_TEXT)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`Transportadora: ${orcamento.carrier.nome}`, fx + logoOffset, fy + 8)
      }
    } else if (orcamento.carrier) {
      // Só transportadora, sem fornecedor
      setText(GREEN)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Transportadora', fx, fy)
      setText(GRAY_TEXT)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(orcamento.carrier.nome, fx, fy + 8)
    }
  }

  // ==========================================================
  // RODAPÉ
  // ==========================================================
  const footerY = pageHeight - 8

  // Linha superior do rodapé
  setDraw(GREEN)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)

  // Data e hora de geração
  setText(GRAY_TEXT)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const dataGeracao = new Date().toLocaleDateString('pt-BR')
  const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  doc.text(`Proposta gerada em ${dataGeracao} as ${horaGeracao}`, margin, footerY - 2)

  // Disclaimer
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  const disclaimer = 'Os medicamentos requerem prescricao medica. DPRIME - Representacao Farmaceutica.'
  doc.text(disclaimer, margin, footerY + 3)

  return Buffer.from(doc.output('arraybuffer'))
}