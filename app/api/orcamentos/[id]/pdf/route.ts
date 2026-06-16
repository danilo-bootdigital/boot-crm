import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { launchBrowser } from '@/lib/pdf/launch-browser'
import { buildPrintUrl } from '@/lib/pdf/print-url'
import { extractCookieHeader } from '@/lib/pdf/auth-cookie'

// Rota de download do PDF do orçamento.
// PR 2: usa Puppeteer + template HTML/Tailwind (preview).
//
// IMPORTANTE — SEM FALLBACK SILENCIOSO:
// O botão "Baixar PDF" SEMPRE gera o PDF a partir do template HTML
// novo (preview-pdf). Se o Puppeteer falhar, a rota retorna 500
// com a mensagem de erro — NUNCA gera o PDF antigo (jsPDF).
//
// Para diagnóstico, USE_HTML_PDF=false desabilita Puppeteer e
// retorna 503 com mensagem clara (ao invés de fallback silencioso).

// Default: Puppeteer ativo. O gerador antigo (jsPDF) está preservado
// em components/orcamentos/orcamento-pdf-generator.ts mas não é mais
// importado aqui — qualquer tentativa de usá-lo resultaria em erro
// de build.
const PUPPETEER_DISABLED = process.env.USE_HTML_PDF === 'false'

// Defesa em profundidade: Puppeteer requer Node.js (não Edge) e
// resposta dinâmica (não cacheável) por construção.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Modo diagnóstico: USE_HTML_PDF=false → Puppeteer desligado, 503 claro
  if (PUPPETEER_DISABLED) {
    return new NextResponse(
      'Geração de PDF via Puppeteer está desabilitada (USE_HTML_PDF=false). ' +
        'O PR 2 (HTML/Tailwind) está em desenvolvimento. ' +
        'Veja components/orcamentos/orcamento-pdf-generator.ts (jsPDF legado, preservado).',
      { status: 503 }
    )
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { id } = await params
    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('id', user.id)
      .single()
    if (!perfil) return new NextResponse('Unauthorized', { status: 401 })

    const { data: orcamento, error } = await supabase
      .from('quotes')
      .select(`
        *,
        responsavel:profiles!responsavel_id(nome),
        lead:leads!lead_id(id, nome, telefone, email, endereco, cpf_cnpj),
        contato:contacts!contato_id(
          id, nome, telefone, email, cpf_cnpj, cargo, tipo_pessoa, categoria_cliente,
          especialidade, tipo_conselho, numero_conselho, uf_conselho, observacoes,
          empresa_id, empresa:companies!empresa_id(id, nome),
          endereco, endereco_numero, endereco_complemento, endereco_bairro,
          endereco_cidade, endereco_estado, endereco_cep
        ),
        deal:deals!deal_id(id, titulo, contato_id),
        aprovador:profiles!aprovacao_interna_por(nome),
        fornecedor:suppliers!supplier_id(
          id, nome, hub_id, health_hubs:health_hubs(id, nome, logo_url)
        ),
        carrier:freight_carriers!carrier_id(nome),
        organizacao:organizations!organization_id(
          nome, nome_fantasia, cnpj, telefone, email, endereco, logo_url, site, instagram
        ),
        itens:quote_items!quote_id(
          id, descricao, quantidade, preco_unitario, desconto_item, subtotal, product_id
        )
      `)
      .eq('id', id)
      .eq('organization_id', perfil.organization_id)
      .single()

    if (error || !orcamento) {
      return new NextResponse('Orçamento não encontrado', { status: 404 })
    }

    // Geração via Puppeteer (PR 2) — SEM fallback silencioso.
    const url = buildPrintUrl(id, new URL(request.url).origin)
    const cookieHeader = extractCookieHeader(request)

    const browser = await launchBrowser()
    let pdf: Uint8Array | null = null
    try {
      const page = await browser.newPage()
      if (cookieHeader) {
        await page.setExtraHTTPHeaders({ Cookie: cookieHeader })
      }
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 })
      // data-pdf-template="ready" é emitido server-side pelo <article> raiz;
      // garante que o Puppeteer só captura depois do template montado.
      await page.waitForSelector('[data-pdf-template="ready"]', { timeout: 10_000 })
      pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        // Honra as margens do CSS @page (inclui @page :first), garantindo
        // margem superior apenas da página 2 em diante. Sem margem fixa aqui,
        // que seria aplicada uniformemente a todas as páginas (inclusive a 1ª).
        preferCSSPageSize: true,
      })
    } finally {
      await browser.close()
    }

    if (!pdf) {
      return new NextResponse('Falha ao gerar PDF', { status: 500 })
    }

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="orcamento-${orcamento.numero}.pdf"`,
        'Content-Length': pdf.byteLength.toString(),
      },
    })
  } catch (error) {
    // Sem fallback silencioso. Retorna 500 com mensagem clara.
    console.error('[pdf route] erro:', error)
    const msg = error instanceof Error ? error.message : 'Erro interno'
    return new NextResponse(`Erro interno (PR 2): ${msg.slice(0, 300)}`, { status: 500 })
  }
}
