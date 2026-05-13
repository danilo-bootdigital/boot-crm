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
  itens: Item[]
  valorSubtotal: number
  descontoGeral: number
  frete: number
  valorTotal: number
  observacoes: string | null
  criadoEm: string
}

export function BotaoExportarPdf(props: Props) {
  async function handleExportar() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14

    // === CABEÇALHO ===
    // Fundo do cabeçalho
    doc.setFillColor(30, 41, 59) // slate-800
    doc.rect(0, 0, pageWidth, 35, 'F')

    // Título da empresa (esquerda)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont(undefined!, 'bold')
    doc.text('ORÇAMENTO', margin, 15)

    // Número e data (direita)
    doc.setFontSize(10)
    doc.setFont(undefined!, 'normal')
    doc.text(`Nº ${props.numero}`, pageWidth - margin, 12, { align: 'right' })
    doc.text(`Data: ${props.criadoEm}`, pageWidth - margin, 18, { align: 'right' })
    doc.text(`Responsável: ${props.responsavel}`, pageWidth - margin, 24, { align: 'right' })

    // Fornecedor no cabeçalho
    if (props.fornecedor) {
      doc.setFontSize(11)
      doc.setFont(undefined!, 'bold')
      doc.text(`Fornecedor: ${props.fornecedor}`, margin, 28)
    }

    // === DADOS DO CLIENTE ===
    let y = 45
    doc.setTextColor(30, 41, 59)

    const cliente = props.cliente
    if (cliente || props.lead) {
      doc.setFillColor(248, 250, 252) // slate-50
      doc.roundedRect(margin, y - 4, pageWidth - margin * 2, cliente ? 28 : 14, 2, 2, 'F')

      doc.setFontSize(9)
      doc.setFont(undefined!, 'bold')
      doc.text('CLIENTE', margin + 4, y + 2)
      doc.setFont(undefined!, 'normal')

      const nomeCliente = cliente?.nome ?? props.lead ?? ''
      doc.setFontSize(10)
      doc.text(nomeCliente, margin + 30, y + 2)

      if (cliente) {
        y += 7
        doc.setFontSize(8.5)
        doc.setTextColor(71, 85, 105)
        if (cliente.telefone) {
          doc.text(`Tel: ${cliente.telefone}`, margin + 4, y + 2)
        }
        if (cliente.email) {
          doc.text(`E-mail: ${cliente.email}`, margin + 60, y + 2)
        }
        if (cliente.endereco) {
          y += 7
          doc.text(`Endereço de entrega: ${cliente.endereco}`, margin + 4, y + 2)
        }
      }

      y += 16
    }

    // === TABELA DE ITENS ===
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['#', 'Descrição', 'Qtd', 'Valor Unit.', 'Desc.', 'Valor Total']],
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
        cellPadding: 3,
        lineColor: [226, 232, 240], // slate-200
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [51, 65, 85], // slate-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 32, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    })

    // === TOTAIS ===
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    const totaisX = pageWidth - margin - 70

    doc.setFontSize(9)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(71, 85, 105) // slate-600

    let ty = finalY
    // Subtotal
    doc.text('Subtotal:', totaisX, ty)
    doc.text(formatarMoeda(props.valorSubtotal), pageWidth - margin, ty, { align: 'right' })
    ty += 6

    // Desconto
    if (props.descontoGeral > 0) {
      doc.setTextColor(220, 38, 38) // red-600
      doc.text(`Desconto (${props.descontoGeral}%):`, totaisX, ty)
      doc.text(`-${formatarMoeda(props.valorSubtotal * props.descontoGeral / 100)}`, pageWidth - margin, ty, { align: 'right' })
      doc.setTextColor(71, 85, 105)
      ty += 6
    }

    // Frete
    if (props.frete > 0) {
      doc.text('Frete:', totaisX, ty)
      doc.text(`+${formatarMoeda(props.frete)}`, pageWidth - margin, ty, { align: 'right' })
      ty += 6
    }

    // Linha separadora
    ty += 2
    doc.setDrawColor(30, 41, 59)
    doc.setLineWidth(0.5)
    doc.line(totaisX, ty, pageWidth - margin, ty)
    ty += 6

    // Total
    doc.setFontSize(12)
    doc.setFont(undefined!, 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('TOTAL:', totaisX, ty)
    doc.text(formatarMoeda(props.valorTotal), pageWidth - margin, ty, { align: 'right' })

    // === OBSERVAÇÕES ===
    if (props.observacoes) {
      ty += 14
      doc.setFontSize(9)
      doc.setFont(undefined!, 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Observações:', margin, ty)
      ty += 5
      doc.setFont(undefined!, 'normal')
      doc.setTextColor(71, 85, 105)
      const linhas = doc.splitTextToSize(props.observacoes, pageWidth - margin * 2)
      doc.text(linhas, margin, ty)
    }

    // === RODAPÉ ===
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFillColor(248, 250, 252) // slate-50
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184) // slate-400
    doc.text('Documento gerado automaticamente pelo sistema.', pageWidth / 2, pageHeight - 6, { align: 'center' })

    doc.save(`orcamento-${props.numero}.pdf`)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExportar} className="gap-1.5">
      <FileDown className="h-4 w-4" />
      Exportar PDF
    </Button>
  )
}
