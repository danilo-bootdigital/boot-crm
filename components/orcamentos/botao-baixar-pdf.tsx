'use client'

// Botão "Baixar PDF" do preview HTML.
// Comportamento: chama window.print() — o navegador abre a janela
// de impressão nativa, e o usuário escolhe "Salvar como PDF".
// O CSS print.css já cuida do layout A4, @page, e remoção de
// elementos interativos.
//
// Esta é a solução temporária enquanto o serviço externo de PDF
// (Docker + Puppeteer) está sendo construído. Quando o serviço
// estiver pronto, este botão volta a chamar /api/orcamentos/{id}/pdf
// para download direto de PDF.

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  orcamentoId: string
  numero?: number
}

export function BotaoBaixarPdf({ orcamentoId, numero: _numero }: Props) {
  function handleClick() {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      className="gap-2 bg-emerald-700 hover:bg-emerald-800 print:hidden"
      title="Na janela de impressão, selecione 'Salvar como PDF'."
    >
      <Printer className="h-4 w-4" />
      <span>Baixar PDF</span>
    </Button>
  )
}
