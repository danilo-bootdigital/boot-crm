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

export function BotaoExportarPdf(props: Props) {
  async function handleExportar() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14

    // Carregar logo se disponível
    let logoLoaded = false
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

        // Fundo do cabeçalho - cinza claro
        doc.setFillColor(241, 245, 249) // slate-100
        doc.rect(0, 0, pageWidth, 42, 'F')

        // Logo proporcional (max 50mm largura, max 24mm altura)
        const maxW = 50
        const maxH = 24
        const ratio = img.naturalWidth / img.naturalHeight
        let logoW = maxW
        let logoH = logoW / ratio
        if (logoH > maxH) {
          logoH = maxH
          logoW = logoH * ratio
        }
        doc.addImage(imgData, 'PNG', margin, 9, logoW, logoH)
        logoLoaded = true
      } catch {
        // Se falhar, segue sem logo
      }
    }

    if (!logoLoaded) {
      // Fundo do cabeçalho sem logo - cinza claro
      doc.setFillColor(241, 245, 249) // slate-100
      doc.rect(0, 0, pageWidth, 42, 'F')
    }

    // Nome da empresa (após logo ou no início) - texto preto
    const textStartX = logoLoaded ? margin + 54 : margin
    doc.setTextColor(30, 41, 59) // slate-800
    doc.setFontSize(14)
    doc.setFont(undefined!, 'bold')
    const nomeEmpresa = props.empresa?.nome_fantasia || 'ORÇAMENTO'
    doc.text(nomeEmpresa, textStartX, 14)

    // Dados da empresa abaixo do nome
    doc.setFontSize(8)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(71, 85, 105) // slate-600
    let headerY = 20
    if (props.empresa?.cnpj) {
      doc.text(`CNPJ: ${props.empresa.cnpj}`, textStartX, headerY)
      headerY += 4
    }
    if (props.empresa?.telefone || props.empresa?.email) {
      const info = [props.empresa?.telefone, props.empresa?.email].filter(Boolean).join(' | ')
      doc.text(info, textStartX, headerY)
      headerY += 4
    }
    if (props.empresa?.endereco) {
      doc.text(props.empresa.endereco, textStartX, headerY)
    }

    // Número e data (direita)
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(10)
    doc.setFont(undefined!, 'bold')
    doc.text(`ORÇAMENTO Nº ${props.numero}`, pageWidth - margin, 14, { align: 'right' })
    doc.setFontSize(9)
    doc.setFont(undefined!, 'normal')
    doc.setTextColor(71, 85, 105)
    doc.text(`Data: ${props.criadoEm}`, pageWidth - margin, 21, { align: 'right' })
    doc.text(`Responsável: ${props.responsavel}`, pageWidth - margin, 27, { align: 'right' })

    // Fornecedor
    if (props.fornecedor) {
      doc.text(`Fornecedor: ${props.fornecedor}`, pageWidth - margin, 33, { align: 'right' })
    }

    // === DADOS DO CLIENTE ===
    let y = 52
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

    // === FORMA DE PAGAMENTO ===
    if (props.formaPagamento) {
      ty += 14
      doc.setFillColor(241, 245, 249) // slate-100
      doc.roundedRect(margin, ty - 4, pageWidth - margin * 2, 14, 2, 2, 'F')
      doc.setFontSize(9)
      doc.setFont(undefined!, 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Forma de Pagamento:', margin + 4, ty + 2)
      doc.setFont(undefined!, 'normal')
      const labelPagamento = props.formaPagamento === 'pix' ? 'PIX'
        : props.formaPagamento === 'credito_1x' ? 'Cartão de Crédito - 1x'
        : props.formaPagamento === 'credito_2x' ? 'Cartão de Crédito - 2x'
        : props.formaPagamento === 'credito_3x' ? 'Cartão de Crédito - 3x'
        : props.formaPagamento === 'credito_4x' ? 'Cartão de Crédito - 4x'
        : props.formaPagamento === 'credito_5x' ? 'Cartão de Crédito - 5x'
        : props.formaPagamento
      doc.text(labelPagamento, margin + 50, ty + 2)
    }

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
