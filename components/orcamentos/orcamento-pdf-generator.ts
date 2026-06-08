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
  contato: { id: string; nome: string; telefone: string; email: string } | null
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

  // Logo à esquerda (área generosa)
  let logoAreaEnd = margin + 44
  const organizacao = orcamento.organizacao

  // Carregar logo se existir
  if (organizacao?.logo_url) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject()
        img.src = organizacao.logo_url!
      })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imgData = canvas.toDataURL('image/png')

      const maxW = 40
      const maxH = 30
      const ratio = img.naturalWidth / img.naturalHeight
      let logoW = maxW
      let logoH = logoW / ratio
      if (logoH > maxH) {
        logoH = maxH
        logoW = logoH * ratio
      }
      const logoY = 6 + (headerBottom - 12 - logoH) / 2
      doc.addImage(imgData, 'PNG', margin + 2, logoY, logoW, logoH)
      logoAreaEnd = margin + logoW + 8
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

  // === SEÇÃO CLIENTE ===
  let y = headerBottom + 10

  // Barra verde "CLIENTE"
  doc.setFillColor(...GREEN_MID)
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(9)
  doc.setFont(undefined!, 'bold')
  doc.text('DADOS DO COMPRADOR', margin + 4, y + 5.5)

  y += 12

  // Fundo verde claro para dados do cliente
  const cliente = orcamento.contato ? {
    nome: orcamento.contato.nome,
    telefone: orcamento.contato.telefone,
    email: orcamento.contato.email,
    endereco: undefined,
    cpf_cnpj: undefined
  } : orcamento.lead ? {
    nome: orcamento.lead.nome,
    telefone: orcamento.lead.telefone,
    email: orcamento.lead.email,
    endereco: orcamento.lead.endereco,
    cpf_cnpj: orcamento.lead.cpf_cnpj
  } : null

  const nomeCliente = cliente?.nome || 'Não informado'

  // Calcular altura do bloco baseado nos dados disponíveis
  let clienteLines = 1 // nome sempre presente
  if (cliente?.cpf_cnpj) clienteLines++
  if (cliente?.endereco) clienteLines++
  if (cliente?.telefone) clienteLines++
  const clienteHeight = 6 + clienteLines * 6

  doc.setFillColor(...GREEN_LIGHT)
  doc.rect(margin, y - 4, pageWidth - margin * 2, clienteHeight, 'F')

  let cy = y + 1
  // Cliente:
  doc.setTextColor(...DARK_TEXT)
  doc.setFontSize(8.5)
  doc.setFont(undefined!, 'bold')
  doc.text('Cliente:', margin + 4, cy)
  doc.setFont(undefined!, 'normal')
  doc.text(nomeCliente.trim(), margin + 28, cy)
  cy += 6

  // CPF/CNPJ:
  if (cliente?.cpf_cnpj) {
    doc.setFont(undefined!, 'bold')
    doc.text('CPF/CNPJ:', margin + 4, cy)
    doc.setFont(undefined!, 'normal')
    doc.text(cliente.cpf_cnpj.trim(), margin + 28, cy)
    cy += 6
  }

  // Endereço do cliente:
  if (cliente?.endereco) {
    doc.setFont(undefined!, 'bold')
    doc.text('Endereço:', margin + 4, cy)
    doc.setFont(undefined!, 'normal')
    doc.text(cliente.endereco.trim(), margin + 28, cy)
    cy += 6
  }

  // Telefone:
  if (cliente?.telefone) {
    doc.setFont(undefined!, 'bold')
    doc.text('Telefone:', margin + 4, cy)
    doc.setFont(undefined!, 'normal')
    doc.text(cliente.telefone.trim(), margin + 28, cy)
    cy += 6
  }

  y += clienteHeight + 6

  // === ENDEREÇO DE ENTREGA ===
  const enderecoEntrega = orcamento.endereco_entrega || cliente?.endereco || 'Endereço não informado'
  const enderecoEntregaHeight = enderecoEntrega === 'Endereço não informado' ? 20 : 26

  doc.setFillColor(...GREEN_LIGHT)
  doc.rect(margin, y - 4, pageWidth - margin * 2, enderecoEntregaHeight, 'F')
  doc.setFontSize(8.5)
  doc.setFont(undefined!, 'bold')
  doc.setTextColor(...GREEN_DARK)
  doc.text('ENDEREÇO DE ENTREGA:', margin + 4, y + 2)
  doc.setFont(undefined!, 'normal')
  doc.setTextColor(...DARK_TEXT)
  doc.text(enderecoEntrega, margin + 28, y + 7)
  y += enderecoEntregaHeight + 6

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