import { formatarMoeda } from '@/lib/utils'

// Cores do layout verde DPRIME
const GREEN_DARK = [34, 120, 15] as const   // #22780F - verde escuro
const GREEN_MID = [56, 142, 60] as const    // #388E3C - verde médio
const GREEN_LIGHT = [232, 245, 233] as const // #E8F5E9 - verde claro fundo
const GREEN_ACCENT = [76, 175, 80] as const  // #4CAF50 - verde destaque
const DARK_TEXT = [33, 33, 33] as const      // #212121
const GRAY_TEXT = [97, 97, 97] as const      // #616161
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
  validade_em: string | null
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
  fornecedor: { nome: string; cnpj?: string | null; inscricao_estadual?: string | null; telefone?: string | null; email?: string | null; endereco?: string | null } | null
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
  const margin = 12
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

  // === CABEÇALHO ===
  const headerTop = 8
  const headerBottom = 42

  // Logo à esquerda
  const logoAreaWidth = 70
  const org = orcamento.organizacao

  if (org?.logo_url) {
    const logoData = await loadLogo(org.logo_url)
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', margin, headerTop, 35, 20)
      } catch {
        // Logo não carregado
      }
    }
  }

  // Nome da empresa abaixo do logo
  let logoBottom = headerTop + 22
  doc.setTextColor(...GREEN_DARK)
  doc.setFontSize(10)
  doc.setFont(undefined!, 'bold')
  doc.text(org?.nome_fantasia || org?.nome || 'DPRIME', margin, logoBottom)

  doc.setFontSize(7.5)
  doc.setFont(undefined!, 'normal')
  doc.setTextColor(...GRAY_TEXT)
  doc.text('Representação Farmacêutica', margin, logoBottom + 4)

  // Contatos da empresa
  let contactY = logoBottom + 7
  if (org?.telefone) {
    doc.text(`Tel: ${org.telefone}`, margin, contactY)
    contactY += 3.5
  }
  if (org?.email) {
    doc.text(org.email, margin, contactY)
    contactY += 3.5
  }
  if (org?.site) {
    doc.text(org.site, margin, contactY)
    contactY += 3.5
  }
  if (org?.instagram) {
    doc.text(org.instagram, margin, contactY)
  }

  // Título ORÇAMENTO à direita
  const rightX = pageWidth - margin

  doc.setTextColor(...GREEN_DARK)
  doc.setFontSize(22)
  doc.setFont(undefined!, 'bold')
  doc.text('ORÇAMENTO', rightX, headerTop + 6, { align: 'right' })

  // Linha decorativa verde
  const titleWidth = doc.getTextWidth('ORÇAMENTO')
  doc.setDrawColor(...GREEN_ACCENT)
  doc.setLineWidth(1.5)
  doc.line(rightX - titleWidth, headerTop + 8, rightX, headerTop + 8)

  // Dados do orçamento
  doc.setFontSize(9)
  doc.setFont(undefined!, 'normal')
  doc.setTextColor(...DARK_TEXT)

  const dataFormatada = new Date(orcamento.criado_em).toLocaleDateString('pt-BR')
  const validadeFormatada = orcamento.validade_em
    ? new Date(orcamento.validade_em).toLocaleDateString('pt-BR')
    : '30 dias'

  let rightY = headerTop + 14
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont(undefined!, 'bold')
  doc.text('Nº', rightX, rightY, { align: 'right' })
  doc.setTextColor(...DARK_TEXT)
  doc.setFont(undefined!, 'normal')
  doc.text(orcamento.numero.toString().padStart(3, '0'), rightX - 8, rightY, { align: 'right' })

  rightY += 5
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont(undefined!, 'bold')
  doc.text('Data:', rightX, rightY, { align: 'right' })
  doc.setTextColor(...DARK_TEXT)
  doc.setFont(undefined!, 'normal')
  doc.text(dataFormatada, rightX - 22, rightY, { align: 'right' })

  rightY += 5
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont(undefined!, 'bold')
  doc.text('Validade:', rightX, rightY, { align: 'right' })
  doc.setTextColor(...DARK_TEXT)
  doc.setFont(undefined!, 'normal')
  doc.text(validadeFormatada, rightX - 22, rightY, { align: 'right' })

  rightY += 5
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont(undefined!, 'bold')
  doc.text('Responsável:', rightX, rightY, { align: 'right' })
  doc.setTextColor(...DARK_TEXT)
  doc.setFont(undefined!, 'normal')
  doc.text(orcamento.responsavel?.nome || '—', rightX - 30, rightY, { align: 'right' })

  // Linha horizontal verde abaixo do cabeçalho
  doc.setDrawColor(...GREEN_DARK)
  doc.setLineWidth(2)
  doc.line(margin, headerBottom, pageWidth - margin, headerBottom)

  // === TRÊS COLUNAS PRINCIPAIS ===
  let y = headerBottom + 6
  const colGap = 6
  const colWidth = (contentWidth - colGap * 2) / 3

  // Helper para desenhar card com título
  const drawCard = (x: number, y: number, w: number, title: string, icon: string, lines: { label: string; value: string }[]) => {
    const lineH = 4
    const titleH = 10
    const contentH = lines.length * lineH + 4
    const cardH = titleH + contentH

    // Fundo branco com borda suave
    doc.setFillColor(250, 250, 250)
    doc.setDrawColor(230, 230, 230)
    doc.roundedRect(x, y, w, cardH, 2, 2, 'FD')

    // Barra de título verde
    doc.setFillColor(...GREEN_MID)
    doc.roundedRect(x, y, w, titleH, 2, 2, 'F')
    doc.rect(x, y + titleH - 2, w, 2, 'F') // Cantos inferiores quadrados

    // Título
    doc.setTextColor(...WHITE)
    doc.setFontSize(7.5)
    doc.setFont(undefined!, 'bold')
    doc.text(`${icon} ${title}`, x + 4, y + 6.5)

    // Conteúdo
    let cy = y + titleH + 4
    doc.setTextColor(...GRAY_TEXT)
    doc.setFontSize(7)
    lines.forEach(({ label, value }) => {
      if (value) {
        doc.setFont(undefined!, 'bold')
        doc.text(label, x + 4, cy)
        doc.setFont(undefined!, 'normal')
        doc.setTextColor(...DARK_TEXT)
        const valueLines = doc.splitTextToSize(value, w - 12)
        doc.text(valueLines, x + 28, cy)
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

  const col1H = drawCard(margin, y, colWidth, 'DADOS DO CLIENTE', '👤', col1Lines)

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

  // Adicionar aviso para PF
  if (isPF && !orcamento.nota_nome) {
    col2Lines.push({ label: '', value: 'Dados conforme cadastro do contato' })
  }

  const col2H = drawCard(margin + colWidth + colGap, y, colWidth, 'DADOS PARA EMISSÃO DA NOTA', '📋', col2Lines)

  // COLUNA 3: ENDEREÇO DE ENTREGA
  const temEntrega = orcamento.endereco_entrega && orcamento.endereco_entrega.trim().length > 0
  let col3H = 0

  if (temEntrega) {
    const col3Lines: { label: string; value: string }[] = [
      { label: 'Endereço:', value: orcamento.endereco_entrega! },
    ].filter(l => l.value)

    col3H = drawCard(margin + (colWidth + colGap) * 2, y, colWidth, 'ENDEREÇO DE ENTREGA', '📦', col3Lines)
  }

  // Altura máxima das colunas
  const maxColH = Math.max(col1H, col2H, col3H)
  y += maxColH + 8

  // === FORNECEDOR ===
  if (orcamento.fornecedor) {
    const fornecH = 28

    // Card fornecedor
    doc.setFillColor(250, 250, 250)
    doc.setDrawColor(230, 230, 230)
    doc.roundedRect(margin, y, contentWidth, fornecH, 2, 2, 'FD')

    // Barra de título
    doc.setFillColor(...GREEN_MID)
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F')
    doc.rect(margin, y + 8, contentWidth, 2, 'F')

    doc.setTextColor(...WHITE)
    doc.setFontSize(7.5)
    doc.setFont(undefined!, 'bold')
    doc.text('🏢 FORNECEDOR', margin + 4, y + 6.5)

    // Dados do fornecedor em linha
    let forY = y + 16
    doc.setFontSize(7)
    doc.setTextColor(...GRAY_TEXT)

    const fornecFields: { label: string; value: string }[] = [
      { label: 'Fornecedor:', value: orcamento.fornecedor.nome },
      { label: 'CNPJ:', value: orcamento.fornecedor.cnpj || '' },
      { label: 'IE:', value: orcamento.fornecedor.inscricao_estadual || '' },
      { label: 'Tel:', value: orcamento.fornecedor.telefone || '' },
      { label: 'E-mail:', value: orcamento.fornecedor.email || '' },
    ].filter(f => f.value)

    // Distribuir em 2 linhas
    const line1 = fornecFields.slice(0, 3)
    const line2 = fornecFields.slice(3)

    let fx = margin + 4
    line1.forEach(({ label, value }) => {
      doc.setFont(undefined!, 'bold')
      doc.text(label, fx, forY)
      doc.setFont(undefined!, 'normal')
      doc.setTextColor(...DARK_TEXT)
      doc.text(value, fx + 22, forY)
      doc.setTextColor(...GRAY_TEXT)
      fx += 90
    })

    if (line2.length > 0) {
      forY += 5
      fx = margin + 4
      line2.forEach(({ label, value }) => {
        doc.setFont(undefined!, 'bold')
        doc.text(label, fx, forY)
        doc.setFont(undefined!, 'normal')
        doc.setTextColor(...DARK_TEXT)
        doc.text(value, fx + 22, forY)
        doc.setTextColor(...GRAY_TEXT)
        fx += 90
      })
    }

    y += fornecH + 8
  }

  // === PRODUTOS ===
  doc.setFillColor(...GREEN_MID)
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F')
  doc.rect(margin, y + 8, contentWidth, 2, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(7.5)
  doc.setFont(undefined!, 'bold')
  doc.text('💊 PRODUTOS', margin + 4, y + 6.5)

  y += 12

  // Tabela de produtos
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
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [220, 220, 220],
      lineWidth: 0.2,
      textColor: [...DARK_TEXT],
    },
    headStyles: {
      fillColor: [...GREEN_DARK],
      textColor: [...WHITE],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [252, 252, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35, fontSize: 6.5 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 28, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  })

  // === RESUMO FINANCEIRO ===
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
  let ty = finalY + 8

  const rightAlign = pageWidth - margin
  const labelX = rightAlign - 70
  const valueX = rightAlign

  doc.setFontSize(8)
  doc.setTextColor(...GRAY_TEXT)

  // Subtotal
  doc.setFont(undefined!, 'normal')
  doc.text('Subtotal:', labelX, ty)
  doc.setTextColor(...DARK_TEXT)
  doc.text(formatarMoeda(orcamento.valor_subtotal), valueX, ty, { align: 'right' })
  ty += 5

  // Desconto
  if (orcamento.desconto_geral > 0) {
    doc.setTextColor(...GRAY_TEXT)
    doc.setFont(undefined!, 'normal')
    doc.text(`Desconto (${orcamento.desconto_geral}%):`, labelX, ty)
    doc.setTextColor(220, 50, 50)
    doc.text(`-${formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}`, valueX, ty, { align: 'right' })
    ty += 5
  }

  // Frete
  if (orcamento.frete > 0) {
    doc.setTextColor(...GRAY_TEXT)
    doc.setFont(undefined!, 'normal')
    doc.text('Frete:', labelX, ty)
    doc.setTextColor(...DARK_TEXT)
    doc.text(`+${formatarMoeda(orcamento.frete)}`, valueX, ty, { align: 'right' })
    ty += 5
  }

  // TOTAL
  ty += 3
  const totalW = 80
  const totalH = 14
  doc.setFillColor(...GREEN_DARK)
  doc.roundedRect(rightAlign - totalW, ty - 5, totalW, totalH, 2, 2, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont(undefined!, 'bold')
  doc.text('TOTAL', rightAlign - totalW + 6, ty + 3)
  doc.setFontSize(12)
  doc.text(formatarMoeda(orcamento.valor_total), rightAlign - 4, ty + 3, { align: 'right' })

  // === RODAPÉ ===
  const footerY = pageHeight - 12
  doc.setFontSize(7)
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont(undefined!, 'normal')

  const dataGeracao = new Date().toLocaleDateString('pt-BR')
  const horaGeracao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  doc.text('📄', margin, footerY)
  doc.text(`Proposta gerada em ${dataGeracao} ${horaGeracao}`, margin + 6, footerY)
  doc.text('Documento gerado automaticamente pelo CRM DPRIME.', margin + 6, footerY + 4)

  // Linha superior do rodapé
  doc.setDrawColor(230, 230, 230)
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6)

  return Buffer.from(doc.output('arraybuffer'))
}
