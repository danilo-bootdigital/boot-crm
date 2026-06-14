import { createClient } from '@/lib/supabase/server'
import { gerarPdf } from '@/components/orcamentos/orcamento-pdf-generator'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!perfil) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Buscar dados do orçamento - MESMA QUERY DA PÁGINA ATUAL
    const { data: orcamento, error } = await supabase
      .from('quotes')
      .select(`
        *,
        responsavel:profiles!responsavel_id(nome),
        lead:leads!lead_id(id, nome, telefone, email, endereco, cpf_cnpj),
        contato:contacts!contato_id(
          id,
          nome,
          telefone,
          email,
          cpf_cnpj,
          cargo,
          tipo_pessoa,
          categoria_cliente,
          especialidade,
          tipo_conselho,
          numero_conselho,
          uf_conselho,
          observacoes,
          empresa_id,
          empresa:companies!empresa_id(id, nome),
          endereco,
          endereco_numero,
          endereco_complemento,
          endereco_bairro,
          endereco_cidade,
          endereco_estado,
          endereco_cep
        ),
        deal:deals!deal_id(id, titulo, contato_id),
        aprovador:profiles!aprovacao_interna_por(nome),
        fornecedor:suppliers!supplier_id(id, nome, hub_id, health_hubs(id, nome)),
        carrier:freight_carriers!carrier_id(nome),
        organizacao:organizations!organization_id(
          nome,
          nome_fantasia,
          cnpj,
          telefone,
          email,
          endereco,
          logo_url,
          site,
          instagram
        ),
        itens:quote_items!quote_id(
          id,
          descricao,
          quantidade,
          preco_unitario,
          desconto_item,
          subtotal,
          product_id
        )
      `)
      .eq('id', id)
      .eq('organization_id', perfil.organization_id)
      .single()

    if (error || !orcamento) {
      return new NextResponse('Orçamento não encontrado', { status: 404 })
    }

    // Gerar PDF
    const pdfBuffer = await gerarPdf(orcamento)

    // Retornar PDF com headers corretos
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="orcamento-${orcamento.numero}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    })

  } catch (error) {
    console.error('Erro ao gerar PDF do orçamento:', error)
    return new NextResponse('Erro interno do servidor', { status: 500 })
  }
}