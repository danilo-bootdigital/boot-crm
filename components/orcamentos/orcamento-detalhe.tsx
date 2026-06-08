'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BadgeStatusOrcamento } from './badge-status-orcamento'
import { formatarMoeda } from '@/lib/utils'
import type { Quote, QuoteItem } from '@/types/database'

type OrcamentoDetalheProps = {
  orcamento: Quote & {
    responsavel: { nome: string } | null
    lead: { id: string; nome: string; telefone: string; email: string; endereco: string; cpf_cnpj: string } | null
    contato: { id: string; nome: string; telefone: string; email: string } | null
    deal: { id: string; titulo: string; contato_id: string } | null
    fornecedor: { nome: string } | null
    carrier: { nome: string } | null
    itens: QuoteItem[]
  }
}

export function OrcamentoDetalhe({ orcamento }: OrcamentoDetalheProps) {
  return (
    <div className="space-y-6">
      {/* Grid organizado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dados do Orçamento */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-slate-700">Dados do Orçamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <span className="text-slate-500">Número:</span>
              <p className="font-medium">#{orcamento.numero}</p>
            </div>
            <div className="text-sm">
              <span className="text-slate-500">Status:</span>
              <p className="font-medium">{orcamento.status}</p>
            </div>
            <div className="text-sm">
              <span className="text-slate-500">Criado em:</span>
              <p className="font-medium">{new Date(orcamento.criado_em).toLocaleDateString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Cliente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-slate-700">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orcamento.lead ? (
              <>
                <p className="font-medium text-sm">{orcamento.lead.nome}</p>
                {orcamento.lead.telefone && (
                  <p className="text-xs text-slate-600">Telefone: {orcamento.lead.telefone}</p>
                )}
                {orcamento.lead.email && (
                  <p className="text-xs text-slate-600">E-mail: {orcamento.lead.email}</p>
                )}
              </>
            ) : orcamento.contato ? (
              <>
                <p className="font-medium text-sm">{orcamento.contato.nome}</p>
                {orcamento.contato.telefone && (
                  <p className="text-xs text-slate-600">Telefone: {orcamento.contato.telefone}</p>
                )}
                {orcamento.contato.email && (
                  <p className="text-xs text-slate-600">E-mail: {orcamento.contato.email}</p>
                )}
              </>
            ) : orcamento.contato_id ? (
              <p className="text-xs text-slate-500">Contato vinculado, dados não carregados</p>
            ) : (
              <p className="text-xs text-slate-500">Nenhum cliente vinculado</p>
            )}
          </CardContent>
        </Card>

        {/* Fornecedor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-slate-700">Fornecedor/Laboratório</CardTitle>
          </CardHeader>
          <CardContent>
            {orcamento.fornecedor ? (
              <p className="font-medium text-sm">{orcamento.fornecedor.nome}</p>
            ) : (
              <p className="text-xs text-slate-500">Fornecedor não informado</p>
            )}
          </CardContent>
        </Card>

        {/* Responsável */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-slate-700">Responsável</CardTitle>
          </CardHeader>
          <CardContent>
            {orcamento.responsavel ? (
              <p className="font-medium text-sm">{orcamento.responsavel.nome}</p>
            ) : (
              <p className="text-xs text-slate-500">Não informado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grid de Endereços e Logística */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Endereço do Cliente */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-slate-700">Endereço do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {orcamento.lead?.endereco ? (
              <p className="text-sm whitespace-pre-wrap">{orcamento.lead.endereco}</p>
            ) : (
              <p className="text-xs text-slate-500">Endereço do cliente não informado</p>
            )}
          </CardContent>
        </Card>

        {/* Endereço de Entrega */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-slate-700">Endereço de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            {orcamento.endereco_entrega ? (
              <p className="text-sm whitespace-pre-wrap">{orcamento.endereco_entrega}</p>
            ) : orcamento.lead?.endereco ? (
              <p className="text-sm text-slate-500">Utilizando endereço do cliente</p>
            ) : (
              <p className="text-xs text-slate-500">Endereço de entrega não informado</p>
            )}
          </CardContent>
        </Card>

        {/* Logística */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-slate-700">Logística</CardTitle>
          </CardHeader>
          <CardContent>
            {orcamento.carrier?.nome ? (
              <p className="font-medium text-sm">{orcamento.carrier.nome}</p>
            ) : (
              <p className="text-xs text-slate-500">Transportadora não informada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Itens do Orçamento - Largura total */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-slate-700">Itens do Orçamento</CardTitle>
        </CardHeader>
        <CardContent>
          {orcamento.itens && orcamento.itens.length > 0 ? (
            <div className="space-y-3">
              {orcamento.itens.map((item) => (
                <div key={item.id} className="border rounded p-3 text-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{item.descricao}</p>
                      <p className="text-slate-500">
                        {item.quantidade} × {formatarMoeda(item.preco_unitario)}
                      </p>
                      {item.desconto_item > 0 && (
                        <p className="text-slate-500 text-xs">
                          Desconto: {item.desconto_item}%
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatarMoeda(item.subtotal)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhum item encontrado neste orçamento</p>
          )}
        </CardContent>
      </Card>

      {/* Valores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium text-slate-700">Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatarMoeda(orcamento.valor_subtotal)}</span>
          </div>
          {orcamento.desconto_geral > 0 && (
            <div className="flex justify-between text-sm">
              <span>Desconto ({orcamento.desconto_geral}%):</span>
              <span className="text-red-600">-{formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}</span>
            </div>
          )}
          {orcamento.frete > 0 ? (
            <div className="flex justify-between text-sm">
              <span>Frete:</span>
              <span>{formatarMoeda(orcamento.frete)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <span>Frete:</span>
              <span className="text-slate-500">R$ 0,00</span>
            </div>
          )}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-medium text-base">
              <span>Total:</span>
              <span className="text-blue-600">{formatarMoeda(orcamento.valor_total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações - Apenas se tiver conteúdo */}
      {orcamento.observacoes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-slate-700">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{orcamento.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}