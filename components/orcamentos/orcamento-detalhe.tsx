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
    itens: QuoteItem[]
  }
}

export function OrcamentoDetalhe({ orcamento }: OrcamentoDetalheProps) {
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Orçamento #{orcamento.numero}</h1>
          <BadgeStatusOrcamento status={orcamento.status} />
        </div>
      </div>

      {/* Dados do Orçamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Orçamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">ID:</span>
              <p className="font-mono text-xs">{orcamento.id}</p>
            </div>
            <div>
              <span className="text-slate-500">Número:</span>
              <p>#{orcamento.numero}</p>
            </div>
            <div>
              <span className="text-slate-500">Status:</span>
              <p>{orcamento.status}</p>
            </div>
            <div>
              <span className="text-slate-500">Criado em:</span>
              <p>{new Date(orcamento.criado_em).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do Fornecedor */}
      {orcamento.fornecedor ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fornecedor/Laboratório</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{orcamento.fornecedor.nome}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fornecedor/Laboratório</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Fornecedor não informado
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dados do Cliente/Lead */}
      {orcamento.lead ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <>
              <p className="font-medium">{orcamento.lead.nome}</p>
              {orcamento.lead.telefone && (
                <p className="text-sm text-slate-600">Telefone: {orcamento.lead.telefone}</p>
              )}
              {orcamento.lead.email && (
                <p className="text-sm text-slate-600">E-mail: {orcamento.lead.email}</p>
              )}
              {orcamento.lead.endereco && (
                <p className="text-sm text-slate-600">Endereço: {orcamento.lead.endereco}</p>
              )}
            </>
          </CardContent>
        </Card>
      ) : orcamento.contato ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <>
              <p className="font-medium">{orcamento.contato.nome}</p>
              {orcamento.contato.telefone && (
                <p className="text-sm text-slate-600">Telefone: {orcamento.contato.telefone}</p>
              )}
              {orcamento.contato.email && (
                <p className="text-sm text-slate-600">E-mail: {orcamento.contato.email}</p>
              )}
            </>
          </CardContent>
        </Card>
      ) : orcamento.contato_id ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Contato vinculado, dados não carregados
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Nenhum cliente vinculado a este orçamento
            </p>
          </CardContent>
        </Card>
      )}

      {/* Negociação/Deal */}
      {orcamento.deal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Negociação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{orcamento.deal.titulo}</p>
          </CardContent>
        </Card>
      )}

      {/* Endereço de Entrega */}
      {orcamento.endereco_entrega ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Endereço de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{orcamento.endereco_entrega}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Endereço de Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Endereço de entrega não informado
            </p>
          </CardContent>
        </Card>
      )}

      {/* Itens do Orçamento */}
      {orcamento.itens && orcamento.itens.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens do Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens do Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Nenhum item encontrado neste orçamento
            </p>
          </CardContent>
        </Card>
      )}

      {/* Valores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Valores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatarMoeda(orcamento.valor_subtotal)}</span>
          </div>
          {orcamento.desconto_geral > 0 && (
            <div className="flex justify-between text-sm">
              <span>Desconto ({orcamento.desconto_geral}%):</span>
              <span>-{formatarMoeda(orcamento.valor_subtotal * orcamento.desconto_geral / 100)}</span>
            </div>
          )}
          {orcamento.frete > 0 && (
            <div className="flex justify-between text-sm">
              <span>Frete:</span>
              <span>{formatarMoeda(orcamento.frete)}</span>
            </div>
          )}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>{formatarMoeda(orcamento.valor_total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      {orcamento.observacoes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{orcamento.observacoes}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Nenhuma observação informada
            </p>
          </CardContent>
        </Card>
      )}

      {/* Forma de Pagamento */}
      {orcamento.forma_pagamento ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{orcamento.forma_pagamento}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Forma de pagamento não informada
            </p>
          </CardContent>
        </Card>
      )}

      {/* Responsável */}
      {orcamento.responsavel ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Responsável</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{orcamento.responsavel.nome}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Responsável</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Responsável não informado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}