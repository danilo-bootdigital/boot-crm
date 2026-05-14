'use client'

import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'
import { formatarMoeda } from '@/lib/utils'

type Item = {
  descricao: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
  subtotal: number
}

type Props = {
  numero: number
  responsavel: string
  lead: string | null
  fornecedor: string | null
  cliente: {
    nome: string
    telefone: string | null
    email: string | null
    endereco: string | null
  } | null
  empresa: {
    nome_fantasia: string | null
    cnpj: string | null
    telefone: string | null
    email: string | null
    endereco: string | null
    logo_url: string | null
  } | null
  itens: Item[]
  valorSubtotal: number
  descontoGeral: number
  frete: number
  valorTotal: number
  formaPagamento: string | null
  observacoes: string | null
  criadoEm: string
}

// Cores do layout verde (baseado na imagem de referência)
const GREEN_DARK = [34, 120, 15] as const   // #22780F - verde escuro
const GREEN_MID = [56, 142, 60] as const    // #388E3C - verde médio
const GREEN_LIGHT = [232, 245, 233] as const // #E8F5E9 - verde claro fundo
const GREEN_ACCENT = [76, 175, 80] as const  // #4CAF50 - verde destaque
const DARK_TEXT = [33, 33, 33] as const      // #212121
const GRAY_TEXT = [97, 97, 97] as const      // #616161
const WHITE = [255, 255, 255] as const

export function BotaoExportarPdf(props: Props) {
  async function handleExportar() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14

    // === CABEÇALHO ===
    // Fundo branco do cabeçalho com borda inferior verde
    doc.setDrawColor(...GREEN_MID)
    doc.setLineWidth(0.8)
    doc.line(margin, 44, pageWidth - margin, 44)

    // Logo à esquerda
    let logoEndX = margin
    if (props.empresa?.logo_url) {
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject()
          img.src = props.empresa!.logo_url!
        })
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const imgData = canvas.toDataURL('image/png')

        const maxW = 40
        const maxH = 20
        const ratio = img.naturalWidth / img.naturalHeight
        let logoW = maxW
        let logoH = logoW / ratio
        if (logoH > maxH) {
          logoH = maxH
          logoW = logoH * ratio
        }
        doc.addImage(imgData, 'PNG', margin, 8, logoW, logoH)
        logoEndX = margin + logoW + 4
      } catch {
        // segue sem logo
      }
    }

    // Dados da empresa ao lado do logo
    doc.setTextColor(...DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont(undefined!, 'bold')
    const nomeEmpresa = props.empresa?.nome_fantasia || 'Empresa'
    doc.text(nomeEmpresa, logoEndX, 14)

    doc.setFontSize(7.5)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...GRAY_TEXT)
    let infoY = 19
    if (props.empresa?.telefone) {
      doc.text(props.empresa.telefone, logoEndX, infoY)
      infoY += 4
    }
    if (props.empresa?.email) {
      doc.text(props.empresa.email, logoEndX, infoY)
      infoY += 4
    }
    if (props.empresa?.endereco) {
      doc.text(props.empresa.endereco, logoEndX, infoY)
      infoY += 4
    }
    if (props.empresa?.cnpj) {
      doc.text(`CNPJ: ${props.empresa.cnpj}`, logoEndX, infoY)
    }

    // "ORÇAMENTO" grande à direita
    doc.setTextColor(...GREEN_DARK)
    doc.setFontSize(22)
    doc.setFont(undefined!, 'bold')
    doc.text('ORÇAMENTO', pageWidth - margin, 16, { align: 'right' })

    // Número, data e responsável à direita
    doc.setFontSize(9)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...GRAY_TEXT)
    doc.text(`Nº ${props.numero}`, pageWidth - margin, 23, { align: 'right' })
    doc.text(`Data: ${props.criadoEm}`, pageWidth - margin, 29, { align: 'right' })
    doc.text(`Responsável:`, pageWidth - margin, 35, { align: 'right' })
    doc.setFont(undefined!, 'bold')
    doc.text(props.responsavel, pageWidth - margin, 40, { align: 'right' })

    // === SEÇÃO CLIENTE ===
    let y = 50

    // Barra verde "CLIENTE"
    doc.setFillColor(...GREEN_MID)
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
    doc.setTextColor(...WHITE)
    doc.setFontSize(9)
    doc.setFont(undefined!, 'bold')
    doc.text('CLIENTE', margin + 4, y + 5.5)

    y += 12

    // Fundo verde claro para dados do cliente
    const cliente = props.cliente
    const nomeCliente = cliente?.nome ?? props.lead ?? 'Não informado'
    const clienteHeight = cliente?.telefone ? 16 : 10
    doc.setFillColor(...GREEN_LIGHT)
    doc.rect(margin, y - 4, pageWidth - margin * 2, clienteHeight, 'F')

    doc.setTextColor(...DARK_TEXT)
    doc.setFontSize(11)
    doc.setFont(undefined!, 'bold')
    doc.text(nomeCliente, margin + 4, y + 2)

    if (cliente?.telefone) {
      doc.setFontSize(8)
      doc.setFont(undefined!, 'normal')
      doc.setTextColor(...GRAY_TEXT)
      doc.text(`Tel: ${cliente.telefone}`, margin + 4, y + 8)
    }

    y += clienteHeight + 6

    // === TABELA DE ITENS ===
    autoTable(doc, {
      startY: y,
      head: [['#', 'DESCRIÇÃO', 'QTD', 'VALOR UNIT.', 'DESC.', 'VALOR TOTAL']],
      body: props.itens.map((item, i) => [
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
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
    let ty = finalY

    // Subtotal alinhado à direita
    doc.setFontSize(9)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(...GRAY_TEXT)
    doc.text('SUBTOTAL', pageWidth - margin - 50, ty)
    doc.text(formatarMoeda(props.valorSubtotal), pageWidth - margin, ty, { align: 'right' })
    ty += 6

    // Desconto
    if (props.descontoGeral > 0) {
      doc.text(`Desconto (${props.descontoGeral}%)`, pageWidth - margin - 50, ty)
      doc.setTextColor(220, 38, 38)
      doc.text(`-${formatarMoeda(props.valorSubtotal * props.descontoGeral / 100)}`, pageWidth - margin, ty, { align: 'right' })
      doc.setTextColor(...GRAY_TEXT)
      ty += 6
    }

    // Frete
    if (props.frete > 0) {
      doc.text('Frete', pageWidth - margin - 50, ty)
      doc.text(`+${formatarMoeda(props.frete)}`, pageWidth - margin, ty, { align: 'right' })
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
    doc.text(formatarMoeda(props.valorTotal), pageWidth - margin - 4, ty + 2, { align: 'right' })

    ty += 18

    // === FORMA DE PAGAMENTO ===
    if (props.formaPagamento) {
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
      const labelPagamento = props.formaPagamento === 'pix' ? 'PIX'
        : props.formaPagamento === 'credito_1x' ? 'Cartão de Crédito - 1x'
        : props.formaPagamento === 'credito_2x' ? 'Cartão de Crédito - 2x'
        : props.formaPagamento === 'credito_3x' ? 'Cartão de Crédito - 3x'
        : props.formaPagamento === 'credito_4x' ? 'Cartão de Crédito - 4x'
        : props.formaPagamento === 'credito_5x' ? 'Cartão de Crédito - 5x'
        : props.formaPagamento
      doc.text(labelPagamento, margin + 4, ty + 7)
      ty += 18
    }

    // === OBSERVAÇÕES ===
    if (props.observacoes) {
      doc.setFillColor(...GREEN_LIGHT)
      const linhas = doc.splitTextToSize(props.observacoes, pageWidth - margin * 2 - 8)
      const obsHeight = 10 + linhas.length * 4
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

    doc.save(`orcamento-${props.numero}.pdf`)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExportar} className="gap-1.5">
      <FileDown className="h-4 w-4" />
      Exportar PDF
    </Button>
  )
}
