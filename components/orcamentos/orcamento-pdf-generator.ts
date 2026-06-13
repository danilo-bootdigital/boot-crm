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

  // === SEÇÃO CLIENTE (dados cadastrais) ===
  let y = headerBottom + 10

  // Barra verde "DADOS DO COMPRADOR"
  doc.setFillColor(...GREEN_MID)
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont(undefined!, 'bold')
  doc.text('DADOS DO COMPRADOR', margin + 4, y + 5.5)

  y += 12

  // Identificar cliente (contato ou lead)
  const cliente = orcamento.contato ? {
    tipo: 'contato' as const,
    nome: orcamento.contato.nome,
    telefone: orcamento.contato.telefone,
    email: orcamento.contato.email,
    // Endereço completo do contato
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
    // Endereço simples do lead (logradouro único)
    logradouro: orcamento.lead.endereco,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,
    estado: null,
    cep: null,
  } : null

  const nomeCliente = cliente?.nome || 'Não informado'

  // Montar endereço completo do cliente (para exibir no bloco de dados)
  function montarEnderecoCliente(): string | null {
    if (!cliente) return null
    if (cliente.tipo === 'contato') {
      // Contato tem endereço estruturado
      const partes: string[] = []
      if (cliente.logradouro) partes.push(cliente.logradouro)
      if (cliente.numero) partes.push(cliente.numero)
      if (cliente.complemento) partes.push(cliente.complemento)
      if (cliente.bairro) partes.push(cliente.bairro)
      if (cliente.cidade || cliente.estado || cliente.cep) {
        const cidadeUFCEP: string[] = []
        if (cliente.cidade) cidadeUFCEP.push(cliente.cidade)
        if (cliente.estado) cidadeUFCEP.push(cliente.estado)
        if (cliente.cep) cidadeUFCEP.push(cliente.cep)
        if (cidadeUFCEP.length > 0) partes.push(cidadeUFCEP.join(' - '))
      }
      return partes.length > 0 ? partes.join(', ') : null
    } else {
      // Lead tem endereço simples
      return cliente.logradouro || null
    }
  }

  const enderecoCliente = montarEnderecoCliente()

  // Calcular altura do bloco de dados do comprador (sem CPF/CNPJ)
  let clienteLines = 1 // nome sempre presente
  if (enderecoCliente) clienteLines++
  if (cliente?.telefone) clienteLines++
  if (cliente?.email) clienteLines++
  const clienteHeight = 6 + clienteLines * 5.5

  // Fundo verde claro para dados do cliente
  doc.setFillColor(...GREEN_LIGHT)
  doc.rect(margin, y - 4, pageWidth - margin * 2, clienteHeight, 'F')

  let cy = y + 1

  // Nome do comprador
  doc.setTextColor(...DARK_TEXT)
  doc.setFontSize(8.5)
  doc.setFont(undefined!, 'bold')
  doc.text('Nome:', margin + 4, cy)
  doc.setFont(undefined!, 'normal')
  doc.text(nomeCliente.trim(), margin + 28, cy)
  cy += 5.5

  // Endereço cadastral completo
  if (enderecoCliente) {
    doc.setFont(undefined!, 'bold')
    doc.text('Endereço:', margin + 4, cy)
    doc.setFont(undefined!, 'normal')
    const linhasEnd = doc.splitTextToSize(enderecoCliente.trim(), pageWidth - margin * 2 - 32)
    doc.text(linhasEnd, margin + 28, cy)
    cy += linhasEnd.length * 5
  }

  // Telefone
  if (cliente?.telefone) {
    doc.setFont(undefined!, 'bold')
    doc.text('Telefone:', margin + 4, cy)
    doc.setFont(undefined!, 'normal')
    doc.text(cliente.telefone.trim(), margin + 28, cy)
    cy += 5.5
  }

  // E-mail
  if (cliente?.email) {
    doc.setFont(undefined!, 'bold')
    doc.text('E-mail:', margin + 4, cy)
    doc.setFont(undefined!, 'normal')
    doc.text(cliente.email.trim(), margin + 28, cy)
    cy += 5.5
  }

  y += clienteHeight + 6

  // === DADOS PARA EMISSÃO DA NOTA (Migration 049) ===
  const temNota = orcamento.nota_tipo_pessoa && orcamento.nota_nome

  if (temNota) {
    // Barra azul "DADOS PARA EMISSÃO DA NOTA"
    doc.setFillColor(37, 99, 235) // blue-600
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
    doc.setTextColor(255, 255, 255) // white
    doc.setFontSize(9)
    doc.setFont(undefined!, 'bold')
    doc.text('DADOS PARA EMISSÃO DA NOTA', margin + 4, y + 5.5)

    y += 12

    // Calcular altura do bloco de nota
    let notaLines = 2 // tipo + nome sempre presentes
    if (orcamento.nota_documento) notaLines++
    if (orcamento.nota_razao_social) notaLines++
    if (orcamento.nota_nome_fantasia) notaLines++
    if (orcamento.nota_endereco) notaLines++
    if (orcamento.nota_ie) notaLines++
    if (orcamento.nota_im) notaLines++
    const notaHeight = 6 + notaLines * 5.5

    // Fundo azul claro para dados da nota
    doc.setFillColor(239, 246, 255) // blue-50
    doc.rect(margin, y - 4, pageWidth - margin * 2, notaHeight, 'F')

    let ny = y + 1

    // Tipo de pessoa
    doc.setTextColor(...DARK_TEXT)
    doc.setFontSize(8.5)
    doc.setFont(undefined!, 'bold')
    doc.text('Tipo:', margin + 4, ny)
    doc.setFont(undefined!, 'normal')
    doc.text(orcamento.nota_tipo_pessoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física', margin + 28, ny)
    ny += 5.5

    // Nome/Razão Social
    doc.setFont(undefined!, 'bold')
    doc.text('Nome:', margin + 4, ny)
    doc.setFont(undefined!, 'normal')
    doc.text(orcamento.nota_nome?.trim() || '—', margin + 28, ny)
    ny += 5.5

    // Documento
    if (orcamento.nota_documento) {
      doc.setFont(undefined!, 'bold')
      doc.text(orcamento.nota_tipo_pessoa === 'PJ' ? 'CNPJ:' : 'CPF:', margin + 4, ny)
      doc.setFont(undefined!, 'normal')
      doc.text(orcamento.nota_documento.trim(), margin + 28, ny)
      ny += 5.5
    }

    // Razão Social (para PJ)
    if (orcamento.nota_razao_social) {
      doc.setFont(undefined!, 'bold')
      doc.text('Razão Social:', margin + 4, ny)
      doc.setFont(undefined!, 'normal')
      doc.text(orcamento.nota_razao_social.trim(), margin + 28, ny)
      ny += 5.5
    }

    // Nome Fantasia (para PJ)
    if (orcamento.nota_nome_fantasia) {
      doc.setFont(undefined!, 'bold')
      doc.text('Nome Fantasia:', margin + 4, ny)
      doc.setFont(undefined!, 'normal')
      doc.text(orcamento.nota_nome_fantasia.trim(), margin + 28, ny)
      ny += 5.5
    }

    // Endereço
    if (orcamento.nota_endereco) {
      doc.setFont(undefined!, 'bold')
      doc.text('Endereço:', margin + 4, ny)
      doc.setFont(undefined!, 'normal')
      const linhasEndNota = doc.splitTextToSize(orcamento.nota_endereco.trim(), pageWidth - margin * 2 - 32)
      doc.text(linhasEndNota, margin + 28, ny)
      ny += linhasEndNota.length * 5
    }

    // Inscrição Estadual
    if (orcamento.nota_ie) {
      doc.setFont(undefined!, 'bold')
      doc.text('IE:', margin + 4, ny)
      doc.setFont(undefined!, 'normal')
      doc.text(orcamento.nota_ie.trim(), margin + 28, ny)
      ny += 5.5
    }

    // Inscrição Municipal
    if (orcamento.nota_im) {
      doc.setFont(undefined!, 'bold')
      doc.text('IM:', margin + 4, ny)
      doc.setFont(undefined!, 'normal')
      doc.text(orcamento.nota_im.trim(), margin + 28, ny)
      ny += 5.5
    }

    y += notaHeight + 6
  } else {
    // Aviso quando não há dados de nota
    doc.setFillColor(254, 252, 232) // amber-50
    doc.rect(margin, y, pageWidth - margin * 2, 14, 'F')
    doc.setFillColor(245, 158, 11) // amber-500
    doc.rect(margin, y, 3, 14, 'F')
    doc.setFontSize(8)
    doc.setTextColor(180, 83, 9) // amber-900
    doc.text('Dados para emissão da nota não preenchidos no orçamento.', margin + 6, y + 9)
    y += 18
  }

  // === ENDEREÇO DE ENTREGA (bloco separado) ===
  const temEntrega = orcamento.endereco_entrega && orcamento.endereco_entrega.trim().length > 0

  // Calcular altura do bloco de entrega
  let entregaLines = 1
  if (temEntrega) {
    // Quebrar endereço em múltiplas linhas se necessário
    const linhasEntrega = doc.splitTextToSize(orcamento.endereco_entrega!, pageWidth - margin * 2 - 34)
    entregaLines = linhasEntrega.length
  }
  const entregaHeight = 10 + entregaLines * 5

  // Barra de fundo para endereço de entrega
  doc.setFillColor(...GREEN_LIGHT)
  doc.rect(margin, y - 4, pageWidth - margin * 2, entregaHeight, 'F')

  // Barra lateral verde para título
  doc.setFillColor(...GREEN_DARK)
  doc.rect(margin, y - 4, 3, entregaHeight, 'F')

  // Título
  doc.setFontSize(8.5)
  doc.setFont(undefined!, 'bold')
  doc.setTextColor(...GREEN_DARK)
  doc.text('ENDEREÇO DE ENTREGA', margin + 6, y + 2)

  // Conteúdo do endereço
  doc.setFont(undefined!, 'normal')
  doc.setTextColor(...DARK_TEXT)
  if (temEntrega) {
    const linhasEntrega = doc.splitTextToSize(orcamento.endereco_entrega!, pageWidth - margin * 2 - 34)
    doc.text(linhasEntrega, margin + 6, y + 7)
  } else {
    doc.text('Mesmo endereço do comprador', margin + 6, y + 7)
  }

  y += entregaHeight + 6

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