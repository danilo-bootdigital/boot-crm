import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Logs de diagnóstico
  console.log('=== DIAGNÓSTICO ORÇAMENTO ===')
  console.log('ID recebido pela rota:', id)

  // Buscar dados do usuário para verificação
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  console.log('Usuário autenticado:', user ? user.id : 'NENHUM')
  console.log('Erro de autenticação:', userError)

  // Buscar perfil do usuário
  let organizationId = null
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    console.log('Perfil encontrado:', profile)
    console.log('Erro de perfil:', profileError)
    organizationId = profile?.organization_id
  }

  console.log('Organization ID do usuário:', organizationId)

  // Query A - Básica (sem joins)
  const { data: orcamentoBasico, error: erroBasico } = await supabase
    .from('quotes')
    .select('id, numero, status, organization_id')
    .eq('id', id)
    .single()

  console.log('Query A - Básica:')
  console.log('Dados retornados:', orcamentoBasico)
  console.log('Erro:', erroBasico)

  // Query B - Completa (com joins)
  const { data: orcamentoCompleto, error: erroCompleto } = await supabase
    .from('quotes')
    .select(`
      *,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(id, nome, telefone, email, endereco, cpf_cnpj),
      contato:contacts!contato_id(id, nome, telefone, email),
      deal:deals!deal_id(id, titulo, contato_id),
      aprovador:profiles!aprovacao_interna_por(nome),
      fornecedor:suppliers!supplier_id(nome),
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
    .single()

  console.log('Query B - Completa:')
  console.log('Dados retornados:', orcamentoCompleto)
  console.log('Erro:', erroCompleto)

  // Tela de diagnóstico segura
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/orcamentos">
          <Button variant="ghost" size="sm" className="gap-1 pl-0 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
            Orçamentos
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Diagnóstico do Orçamento</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações da Requisição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><strong>ID recebido:</strong> {id}</p>
          <p className="text-sm"><strong>Usuário autenticado:</strong> {user ? user.id : 'NENHUM'}</p>
          <p className="text-sm"><strong>Organization ID:</strong> {organizationId || 'NENHUM'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Query A - Básica (sem joins)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><strong>Sucesso:</strong> {orcamentoBasico ? 'SIM' : 'NÃO'}</p>
          <p className="text-sm"><strong>Erro:</strong> {erroBasico ? erroBasico.message : 'NENHUM'}</p>
          {orcamentoBasico && (
            <>
              <p className="text-sm"><strong>ID no banco:</strong> {orcamentoBasico.id}</p>
              <p className="text-sm"><strong>Número:</strong> {orcamentoBasico.numero}</p>
              <p className="text-sm"><strong>Status:</strong> {orcamentoBasico.status}</p>
              <p className="text-sm"><strong>Organization ID:</strong> {orcamentoBasico.organization_id}</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Query B - Completa (com joins)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><strong>Sucesso:</strong> {orcamentoCompleto ? 'SIM' : 'NÃO'}</p>
          <p className="text-sm"><strong>Erro:</strong> {erroCompleto ? erroCompleto.message : 'NENHUM'}</p>
          {orcamentoCompleto && (
            <>
              <p className="text-sm"><strong>Itens encontrados:</strong> {orcamentoCompleto.itens?.length || 0}</p>
              <p className="text-sm"><strong>Lead encontrado:</strong> {orcamentoCompleto.lead ? 'SIM' : 'NÃO'}</p>
              <p className="text-sm"><strong>Fornecedor encontrado:</strong> {orcamentoCompleto.fornecedor ? 'SIM' : 'NÃO'}</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            {orcamentoBasico && orcamentoCompleto && (
              <p className="text-green-600">✅ Ambas as queries funcionaram. O problema pode estar no componente de exibição.</p>
            )}
            {orcamentoBasico && !orcamentoCompleto && (
              <p className="text-red-600">❌ Query A funcionou, mas Query B falhou. Problema nos joins/relacionamentos.</p>
            )}
            {!orcamentoBasico && orcamentoCompleto && (
              <p className="text-red-600">❌ Query A falhou, mas Query B funcionou. Inconsistência detectada.</p>
            )}
            {!orcamentoBasico && !orcamentoCompleto && (
              <p className="text-red-600">❌ Ambas as queries falharam. Problema no acesso ao orçamento.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}