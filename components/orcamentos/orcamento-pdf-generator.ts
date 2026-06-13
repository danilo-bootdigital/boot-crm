import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/utils'

// Cores do layout verde (baseado no botao-exportar-pdf.tsx)
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
  // Migration 049: dados para emissão da nota fiscal
  nota_tipo_pessoa: string | null
  nota_nome: string | null
  nota_documento: string | null
  nota_razao_social: string | null
  nota_nome_fantasia: string | null
  nota_endereco: string | null
  nota_ie: string | null
  nota_im: string | null
}

interface Cliente {
  nome: string
  telefone?: string
  email?: string
  endereco?: string
  cpf_cnpj?: string
}

export async function gerarPdf(orcamento: OrcamentoData) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const headerBottom = 44

  // === CABEÇALHO (com dados reais da organização) ===

  // Helper para extrair dimensões de PNG ou JPEG via buffer (server-side)
async function getImageDimensions(
  logoUrl: string
): Promise<{ data: string; width: number; height: number } | null> {
  const response = await fetch(logoUrl)
  if (!response.ok) return null

  const contentType = response.headers.get('content-type') || 'image/png'
  const buffer = await response.arrayBuffer()
  const uint8 = new Uint8Array(buffer)
  let width = 40
  let height = 40

  // PNG: dimensões nos bytes 16-23
  if (contentType.includes('png') || uint8[0] === 0x89) {
    width = (uint8[16] << 24) | (uint8[17] << 16) | (uint8[18] << 8) | uint8[19]
    height = (uint8[20] << 24) | (uint8[21] << 16) | (uint8[22] << 8) | uint8[23]
  }
  // JPEG: procurar marcadores SOF0/SOF1/SOF2 (0xFF 0xC0-0xC2)
  else if (contentType.includes('jpeg') || uint8[0] === 0xff && uint8[1] === 0xd8) {
    let i = 2
    while (i < uint8.length - 8) {
      if (uint8[i] !== 0xff) { i++; continue }
      const marker = uint8[i + 1]
      // SOF0, SOF1, SOF2
      if (marker >= 0xc0 && marker <= 0xc2) {
        height = (uint8[i + 5] << 8) | uint8[i + 6]
        width = (uint8[i + 7] << 8) | uint8[i + 8]
        break
      }
      const len = (uint8[i + 2] << 8) | uint8[i + 3]
      i += 2 + len
    }
  }

  const base64 = Buffer.from(buffer).toString('base64')
  return { data: `data:${contentType};base64,${base64}`, width, height }
}

// Logo à esquerda (área generosa)
let logoAreaEnd = margin + 44
const organizacao = orcamento.organizacao

// Carregar logo se existir (server-side: usar fetch + buffer)
if (organizacao?.logo_url) {
  try {
    const imgInfo = await getImageDimensions(organizacao.logo_url)
    if (imgInfo) {
      const maxW = 40
      const maxH = 30
      const ratio = imgInfo.width / imgInfo.height
      let logoW = maxW
      let logoH = logoW / ratio
      if (logoH > maxH) {
        logoH = maxH
        logoW = logoH * ratio
      }
      const logoY = 6 + (headerBottom - 12 - logoH) / 2
      doc.addImage(imgInfo.data, 'PNG', margin + 2, logoY, logoW, logoH)
      logoAreaEnd = margin + logoW + 8
    }
  } catch {
    // Falha ao carregar logo, continua sem
  }
}

  // Separador vertical verde
  doc.setDrawColor(...GREEN_DARK)
  doc.setLineWidth(0.8)
  doc.line(logoAreaEnd, 8, logoAreaEnd, headerBottom - 6)

  // Dados da empresa (reais)
  const empresaX = logoAreaEnd + 5
  doc.setTextColor(...DARK_TEXT)
  doc.setFontSize(12)
  doc.setFont(undefined!, 'bold')
  const nomeEmpresa = organizacao?.nome_fantasia || organizacao?.nome || 'Empresa'
  doc.text(nomeEmpresa, empresaX, 15)

  doc.setFontSize(8.5)
  doc.setFont(undefined!, 'normal')
  doc.setTextColor(...GRAY_TEXT)
  let empY = 21

  // CNPJ
  if (organizacao?.cnpj) {
    doc.text(`CNPJ: ${organizacao.cnpj}`, empresaX, empY)
    empY += 5
  }

  // Telefone
  if (organizacao?.telefone) {
    doc.text(`Tel: ${organizacao.telefone}`, empresaX, empY)
    empY += 5
  }

  // Email
  if (organizacao?.email) {
    doc.text(`E-mail: ${organizacao.email}`, empresaX, empY)
    empY += 5
  }

  // Site
  if (organizacao?.site) {
    doc.text(`Site: ${organizacao.site}`, empresaX, empY)
    empY += 5
  }

  // Instagram
  if (organizacao?.instagram) {
    doc.text(`Instagram: ${organizacao.instagram}`, empresaX, empY)
  }

  // "ORÇAMENTO" grande em verde escuro (centro-direita)
  doc.setTextColor(...GREEN_DARK)
  doc.setFontSize(22)
  doc.setFont(undefined!, 'bold')
  doc.text('ORÇAMENTO', pageWidth - margin, 16, { align: 'right' })

  // Sublinhado verde
  const orcW = doc.getTextWidth('ORÇAMENTO')
  doc.setDrawColor(...GREEN_ACCENT)
  doc.setLineWidth(1.2)
  doc.line(pageWidth - margin - orcW, 18, pageWidth - margin, 18)

  // Dados do orçamento (abaixo de "ORÇAMENTO", alinhados à direita)
  doc.setFontSize(8.5)
  doc.setFont(undefined!, 'normal')
  doc.setTextColor(...GRAY_TEXT)
  doc.text(`Nº ${orcamento.numero}`, pageWidth - margin, 24, { align: 'right' })
  doc.text(`Data: ${new Date(orcamento.criado_em).toLocaleDateString('pt-BR')}`, pageWidth - margin, 29, { align: 'right' })
  doc.text(`Proposta: ${orcamento.numero}`, pageWidth - margin, 34, { align: 'right' })
  doc.setFont(undefined!, 'bold')
  doc.setTextColor(...DARK_TEXT)
  doc.text(orcamento.responsavel?.nome || '—', pageWidth - margin, 39, { align: 'right' })

  // Barra verde grossa na base do cabeçalho
  doc.setFillColor(...GREEN_DARK)
  doc.rect(margin, headerBottom, pageWidth - margin * 2, 3, 'F')

  // === SEÇÃO CLIENTE (dados cadastrais completos - layout compacto em colunas) ===
  let y = headerBottom + 8

  // Barra verde "DADOS DO CLIENTE / CONTATO"
  doc.setFillColor(...GREEN_MID)
  doc.rect(margin, y, pageWidth - margin * 2, 6, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(8)
  doc.setFont(undefined!, 'bold')
  doc.text('DADOS DO CLIENTE / CONTATO', margin + 3, y + 4)

  y += 8

  // Configuração de colunas
  const colLabelW = 22
  const colGap = 8
  const colValueW = (pageWidth - margin * 2 - colLabelW - colGap) / 2
  const lineH = 4.2
  const innerPadding = 3

  // Identificar cliente (contato ou lead)
  const cliente = orcamento.contato ? {
    tipo: 'contato' as const,
    nome: orcamento.contato.nome,
    telefone: orcamento.contato.telefone,
    email: orcamento.contato.email,
    cpf_cnpj: orcamento.contato.cpf_cnpj,
    cargo: orcamento.contato.cargo,
    tipo_pessoa: orcamento.contato.tipo_pessoa,
    categoria_cliente: orcamento.contato.categoria_cliente,
    especialidade: orcamento.contato.especialidade,
    tipo_conselho: orcamento.contato.tipo_conselho,
    numero_conselho: orcamento.contato.numero_conselho,
    uf_conselho: orcamento.contato.uf_conselho,
    observacoes: orcamento.contato.observacoes,
    empresa: orcamento.contato.empresa?.nome,
    logradouro: orcamento.contato.endereco,
    numero: orcamento.contato.endereco_numero,
    complemento: orcamento.contato.endereco_complemento,
    bairro: orcamento.contato.endereco_bairro,
    cidade: orcamento.contato.endereco_cidade,
    estado: orcamento.contato.endereco_estado,
    cep: orcamento.contato.endereco_cep,
  } : orcamento.lead ? {
    tipo: 'lead' as const,
    nome: orcamento.lead.nome,
    telefone: orcamento.lead.telefone,
    email: orcamento.lead.email,
    cpf_cnpj: orcamento.lead.cpf_cnpj,
    cargo: null,
    tipo_pessoa: null,
    categoria_cliente: null,
    especialidade: null,
    tipo_conselho: null,
    numero_conselho: null,
    uf_conselho: null,
    observacoes: null,
    empresa: null,
    logradouro: orcamento.lead.endereco,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,
    estado: null,
    cep: null,
  } : null

  const nomeCliente = cliente?.nome || '—'

  // Montar endereço completo
  function montarEnderecoCliente(): string | null {
    if (!cliente) return null
    if (cliente.tipo === 'contato') {
      const partes: string[] = []
      if (cliente.logradouro) partes.push(cliente.logradouro)
      if (cliente.numero) partes.push(cliente.numero)
      if (cliente.complemento) partes.push(cliente.complemento)
      if (cliente.bairro) partes.push(cliente.bairro)
      const cidadeUFCEP: string[] = []
      if (cliente.cidade) cidadeUFCEP.push(cliente.cidade)
      if (cliente.estado) cidadeUFCEP.push(cliente.estado)
      if (cliente.cep) cidadeUFCEP.push(cliente.cep)
      if (cidadeUFCEP.length > 0) partes.push(cidadeUFCEP.join(' - '))
      return partes.length > 0 ? partes.join(', ') : null
    }
    return cliente.logradouro || null
  }

  const enderecoCliente = montarEnderecoCliente()

  // Helper para desenhar par de campos lado a lado
  const drawFieldPair = (cy: number, label1: string, val1: string | null, label2: string, val2: string | null) => {
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY_TEXT)
    doc.setFont(undefined!, 'bold')
    doc.text(label1, margin + innerPadding, cy)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...DARK_TEXT)
    doc.text(val1 || '—', margin + innerPadding + colLabelW, cy)

    if (label2 && val2 !== undefined) {
      doc.setTextColor(...GRAY_TEXT)
      doc.setFont(undefined!, 'bold')
      doc.text(label2, margin + colValueW + colLabelW + innerPadding + colGap, cy)
      doc.setFont(undefined!, 'normal')
      doc.setTextColor(...DARK_TEXT)
      doc.text(val2 || '—', margin + colValueW + colLabelW + innerPadding + colGap + colLabelW, cy)
    }
    return cy + lineH
  }

  // Helper para campo único (ocupa linha inteira)
  const drawFieldFull = (cy: number, label: string, val: string | null) => {
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY_TEXT)
    doc.setFont(undefined!, 'bold')
    doc.text(label, margin + innerPadding, cy)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...DARK_TEXT)
    const linhas = doc.splitTextToSize(val || '—', pageWidth - margin * 2 - colLabelW - innerPadding * 2)
    doc.text(linhas, margin + innerPadding + colLabelW, cy)
    return cy + lineH * linhas.length
  }

  let cy = y

  // Linha 1: Nome (full width)
  cy = drawFieldFull(cy, 'Nome:', nomeCliente)

  // Linha 2: CPF/CNPJ + Telefone
  cy = drawFieldPair(cy, 'Doc:', cliente?.cpf_cnpj ?? null, 'Tel:', cliente?.telefone ?? null)

  // Linha 3: E-mail + Empresa
  cy = drawFieldPair(cy, 'E-mail:', cliente?.email ?? null, 'Empresa:', cliente?.empresa ?? null)

  // Linha 4: Cargo + Tipo/Categoria
  const tipoCat = [cliente?.tipo_pessoa, cliente?.categoria_cliente].filter(Boolean).join(' - ')
  cy = drawFieldPair(cy, 'Cargo:', cliente?.cargo ?? null, 'Tipo:', tipoCat || null)

  // Linha 5: Especialidade + Conselho
  const conselho = cliente?.tipo_conselho && cliente?.numero_conselho
    ? `${cliente.tipo_conselho} ${cliente.numero_conselho}${cliente.uf_conselho ? ` - ${cliente.uf_conselho}` : ''}`
    : null
  cy = drawFieldPair(cy, 'Esp.:', cliente?.especialidade ?? null, 'Conselho:', conselho)

  // Linha 6: Endereço (full width)
  if (enderecoCliente) {
    cy = drawFieldFull(cy, 'End.:', enderecoCliente)
  }

  y = cy + 4

  // === DADOS PARA EMISSÃO DA NOTA (sempre visível - layout verde clean) ===
  // Barra verde "DADOS PARA EMISSÃO DA NOTA"
  doc.setFillColor(...GREEN_MID)
  doc.rect(margin, y, pageWidth - margin * 2, 6, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(8)
  doc.setFont(undefined!, 'bold')
  doc.text('DADOS PARA EMISSÃO DA NOTA', margin + 3, y + 4)

  y += 8

  let ny = y

  // Linha 1: Tipo + Nome/Razão Social
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY_TEXT)
  doc.setFont(undefined!, 'bold')
  doc.text('Tipo:', margin + innerPadding, ny)
  doc.setFont(undefined!, 'normal')
  doc.setTextColor(...DARK_TEXT)
  const tipoLabel = orcamento.nota_tipo_pessoa === 'PJ' ? 'Pessoa Jurídica' : (orcamento.nota_tipo_pessoa === 'PF' ? 'Pessoa Física' : '—')
  doc.text(tipoLabel, margin + innerPadding + colLabelW, ny)

  if (orcamento.nota_nome) {
    doc.setTextColor(...GRAY_TEXT)
    doc.setFont(undefined!, 'bold')
    doc.text('Nome:', margin + colValueW + colLabelW + innerPadding + colGap, ny)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...DARK_TEXT)
    const nomeLinhas = doc.splitTextToSize(orcamento.nota_nome.trim(), colValueW - colLabelW)
    doc.text(nomeLinhas, margin + colValueW + colLabelW + innerPadding + colGap + colLabelW, ny)
    ny += lineH * nomeLinhas.length
  } else {
    ny += lineH
  }

  // Linha 2: CNPJ/CPF + Razão Social
  if (orcamento.nota_documento || orcamento.nota_razao_social) {
    doc.setTextColor(...GRAY_TEXT)
    doc.setFont(undefined!, 'bold')
    doc.text(orcamento.nota_tipo_pessoa === 'PJ' ? 'CNPJ:' : 'CPF:', margin + innerPadding, ny)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...DARK_TEXT)
    doc.text(orcamento.nota_documento?.trim() || '—', margin + innerPadding + colLabelW, ny)

    if (orcamento.nota_razao_social) {
      doc.setTextColor(...GRAY_TEXT)
      doc.setFont(undefined!, 'bold')
      doc.text('Razão:', margin + colValueW + colLabelW + innerPadding + colGap, ny)
      doc.setFont(undefined!, 'normal')
      doc.setTextColor(...DARK_TEXT)
      const razaoLinhas = doc.splitTextToSize(orcamento.nota_razao_social.trim(), colValueW - colLabelW)
      doc.text(razaoLinhas, margin + colValueW + colLabelW + innerPadding + colGap + colLabelW, ny)
      ny += lineH * razaoLinhas.length
    } else {
      ny += lineH
    }
  }

  // Linha 3: Nome Fantasia + IE/IM
  if (orcamento.nota_nome_fantasia || orcamento.nota_ie || orcamento.nota_im) {
    doc.setTextColor(...GRAY_TEXT)
    doc.setFont(undefined!, 'bold')
    doc.text('Fantasia:', margin + innerPadding, ny)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...DARK_TEXT)
    doc.text(orcamento.nota_nome_fantasia?.trim() || '—', margin + innerPadding + colLabelW, ny)

    const inscricoes = [orcamento.nota_ie ? `IE: ${orcamento.nota_ie}` : null, orcamento.nota_im ? `IM: ${orcamento.nota_im}` : null].filter(Boolean).join(' | ')
    if (inscricoes) {
      doc.setTextColor(...GRAY_TEXT)
      doc.setFont(undefined!, 'bold')
      doc.text('Insc.:', margin + colValueW + colLabelW + innerPadding + colGap, ny)
      doc.setFont(undefined!, 'normal')
      doc.setTextColor(...DARK_TEXT)
      doc.text(inscricoes, margin + colValueW + colLabelW + innerPadding + colGap + colLabelW, ny)
    }
    ny += lineH
  }

  // Linha 4: Endereço (full width)
  if (orcamento.nota_endereco) {
    doc.setTextColor(...GRAY_TEXT)
    doc.setFont(undefined!, 'bold')
    doc.text('End.:', margin + innerPadding, ny)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...DARK_TEXT)
    const endLinhas = doc.splitTextToSize(orcamento.nota_endereco.trim(), pageWidth - margin * 2 - colLabelW - innerPadding * 2)
    doc.text(endLinhas, margin + innerPadding + colLabelW, ny)
    ny += lineH * endLinhas.length
  }

  y = ny + 4

  // === ENDEREÇO DE ENTREGA (bloco separado - compacto) ===
  const temEntrega = orcamento.endereco_entrega && orcamento.endereco_entrega.trim().length > 0

  if (temEntrega) {
    // Barra verde "ENDEREÇO DE ENTREGA"
    doc.setFillColor(...GREEN_MID)
    doc.rect(margin, y, pageWidth - margin * 2, 6, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(8)
    doc.setFont(undefined!, 'bold')
    doc.text('ENDEREÇO DE ENTREGA', margin + 3, y + 4)

    y += 8

    // Endereço em linha única se possível
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY_TEXT)
    doc.setFont(undefined!, 'bold')
    doc.text('End.:', margin + innerPadding, y)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...DARK_TEXT)
    const linhasEntrega = doc.splitTextToSize(orcamento.endereco_entrega!.trim(), pageWidth - margin * 2 - colLabelW - innerPadding * 2)
    doc.text(linhasEntrega, margin + innerPadding + colLabelW, y)
    y += lineH * linhasEntrega.length + 4
  }

  // entregaHeight removido - ajuste automático

  // === FORNECEDOR ===
  if (orcamento.fornecedor) {
    doc.setFillColor(...GREEN_LIGHT)
    doc.rect(margin, y - 4, pageWidth - margin * 2, 12, 'F')
    doc.setFontSize(8.5)
    doc.setFont(undefined!, 'bold')
    doc.setTextColor(...GREEN_DARK)
    doc.text('FORNECEDOR:', margin + 4, y + 2)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...DARK_TEXT)
    doc.text(orcamento.fornecedor.nome, margin + 34, y + 2)
    y += 14
  }

  // === FRETE (transportadora + localidade) ===
  if (orcamento.carrier?.nome || orcamento.frete_regiao) {
    doc.setFillColor(...GREEN_LIGHT)
    doc.rect(margin, y - 4, pageWidth - margin * 2, 12, 'F')
    doc.setFontSize(8.5)
    doc.setFont(undefined!, 'bold')
    doc.setTextColor(...GREEN_DARK)
    doc.text('FRETE:', margin + 4, y + 2)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...DARK_TEXT)
    const partesFrete: string[] = []
    if (orcamento.carrier?.nome) partesFrete.push(orcamento.carrier.nome)
    if (orcamento.frete_regiao) partesFrete.push(orcamento.frete_regiao)
    doc.text(partesFrete.join(' — '), margin + 22, y + 2)
    y += 14
  }

  // === TABELA DE ITENS ===
  autoTable(doc, {
    startY: y,
    head: [['#', 'DESCRIÇÃO', 'QTD', 'VALOR UNIT.', 'DESC.', 'VALOR TOTAL']],
    body: orcamento.itens.map((item, i) => [
      (i + 1).toString(),
      item.descricao,
      item.quantidade.toString(),
      formatarMoeda(item.preco_unitario),
      item.desconto_item > 0 ? `${item.desconto_item}%` : '—',
      formatarMoeda(item.subtotal),
    ]),
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      lineColor: [200, 230, 201], // verde claro para linhas
      lineWidth: 0.3,
      textColor: [...DARK_TEXT],
    },
    headStyles: {
      fillColor: [...GREEN_DARK],
      textColor: [...WHITE],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 32, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  })

  // === TOTAIS ===
  const finalY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 10) + 6
  let ty = finalY

  // Subtotal alinhado à direita
  doc.setFontSize(9)
  doc.setFont(undefined!, 'normal')
  doc.setTextColor(...GRAY_TEXT)
  doc.text('SUBTOTAL', pageWidth - margin - 50, ty)
  doc.text(formatarMoeda(orcamento.valor_subtotal), pageWidth - margin, ty, { align: 'right' })
  ty += 6

  // Desconto
  if (orcamento.desconto_geral > 0) {
    doc.text(`Desconto (${orcamento.desconto_geral}%)`, pageWidth - margin - 50, ty)
    doc.setTextColor(220, 38, 38)
    doc.text(`-${formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}`, pageWidth - margin, ty, { align: 'right' })
    doc.setTextColor(...GRAY_TEXT)
    ty += 6
  }

  // Frete
  if (orcamento.frete > 0) {
    doc.text('Frete', pageWidth - margin - 50, ty)
    doc.text(`+${formatarMoeda(orcamento.frete)}`, pageWidth - margin, ty, { align: 'right' })
    ty += 6
  }

  // Barra TOTAL verde
  ty += 4
  doc.setFillColor(...GREEN_MID)
  doc.rect(pageWidth - margin - 80, ty - 5, 80, 12, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(10)
  doc.setFont(undefined!, 'bold')
  doc.text('TOTAL', pageWidth - margin - 74, ty + 2)
  doc.setFontSize(12)
  doc.text(formatarMoeda(orcamento.valor_total), pageWidth - margin - 4, ty + 2, { align: 'right' })

  ty += 18

  // Helper: verificar se precisa nova página (reservar 25mm para rodapé)
  const checkPage = (needed: number) => {
    if (ty + needed > pageHeight - 25) {
      doc.addPage()
      ty = 20
    }
  }

  // === FORMA DE PAGAMENTO ===
  if (orcamento.forma_pagamento) {
    checkPage(20)
    // Ícone verde + texto
    doc.setFillColor(...GREEN_LIGHT)
    doc.roundedRect(margin, ty - 4, pageWidth - margin * 2, 14, 2, 2, 'F')

    doc.setDrawColor(...GREEN_MID)
    doc.setLineWidth(0.5)
    doc.roundedRect(margin, ty - 4, pageWidth - margin * 2, 14, 2, 2, 'S')

    doc.setFontSize(8)
    doc.setFont(undefined!, 'bold')
    doc.setTextColor(...GREEN_DARK)
    doc.text('FORMA DE PAGAMENTO', margin + 4, ty + 2)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...DARK_TEXT)
    const labelPagamento = orcamento.forma_pagamento === 'pix' ? 'PIX'
      : orcamento.forma_pagamento === 'credito_1x' ? 'Cartão de Crédito - 1x'
      : orcamento.forma_pagamento === 'credito_2x' ? 'Cartão de Crédito - 2x'
      : orcamento.forma_pagamento === 'credito_3x' ? 'Cartão de Crédito - 3x'
      : orcamento.forma_pagamento === 'credito_4x' ? 'Cartão de Crédito - 4x'
      : orcamento.forma_pagamento === 'credito_5x' ? 'Cartão de Crédito - 5x'
      : orcamento.forma_pagamento
    doc.text(labelPagamento, margin + 4, ty + 7)
    ty += 18
  }

  // === OBSERVAÇÕES ===
  if (orcamento.observacoes) {
    const linhas = doc.splitTextToSize(orcamento.observacoes, pageWidth - margin * 2 - 8)
    const obsHeight = 10 + linhas.length * 4
    checkPage(obsHeight + 5)

    doc.setFillColor(...GREEN_LIGHT)
    doc.roundedRect(margin, ty - 4, pageWidth - margin * 2, obsHeight, 2, 2, 'F')

    doc.setDrawColor(...GREEN_MID)
    doc.setLineWidth(0.5)
    doc.roundedRect(margin, ty - 4, pageWidth - margin * 2, obsHeight, 2, 2, 'S')

    doc.setFontSize(8)
    doc.setFont(undefined!, 'bold')
    doc.setTextColor(...GREEN_DARK)
    doc.text('OBSERVAÇÕES', margin + 4, ty + 2)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...DARK_TEXT)
    doc.setFontSize(8)
    doc.text(linhas, margin + 4, ty + 7)
  }

  // === RODAPÉ VERDE ===
  doc.setFillColor(...GREEN_DARK)
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont(undefined!, 'bold')
  doc.text('Agradecemos a preferência!', pageWidth / 2, pageHeight - 12, { align: 'center' })
  doc.setFontSize(7)
  doc.setFont(undefined!, 'normal')
  doc.text('Estamos à disposição para quaisquer dúvidas.', pageWidth / 2, pageHeight - 7, { align: 'center' })

  // Retornar como buffer
  return Buffer.from(doc.output('arraybuffer'))
}