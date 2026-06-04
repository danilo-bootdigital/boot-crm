'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  enviarParaAprovacao,
  aprovarInterno,
  rejeitarInterno,
  enviarAoCliente,
  aprovarOrcamento,
  transformarEmPedido,
  verificarPedidoGerado,
  marcarRecusadoCliente,
  excluirOrcamento,
} from '@/app/(dashboard)/orcamentos/actions'
import type { QuoteStatus, UserRole } from '@/types/database'
import Link from 'next/link'

type Props = {
  orcamentoId: string
  status: QuoteStatus
  cargo: UserRole
  isResponsavel: boolean
}

export function AcoesOrcamento({ orcamentoId, status, cargo, isResponsavel }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [comentario, setComentario] = useState('')
  const [confirmExcluir, setConfirmExcluir] = useState(false)
  const [showConfirmacaoConversao, setShowConfirmacaoConversao] = useState(false)
  const [motivoConversao, setMotivoConversao] = useState('')

  const isAdminGestor = cargo === 'admin' || cargo === 'gestor'
  const podeAgir = isAdminGestor || isResponsavel

  async function verificarEPedirConfirmacao() {
    const pedido = await verificarPedidoGerado(orcamentoId)
    if (pedido) {
      // Já existe pedido, mostrar link
      toast.success(`Pedido #${pedido.numero} já foi gerado!`)
      router.push(`/pedidos/${pedido.id}`)
      return
    }

    // Não existe pedido, pedir confirmação
    setShowConfirmacaoConversao(true)
  }

  function executar(action: () => Promise<void>, mensagem: string) {
    startTransition(async () => {
      try {
        await action()
        toast.success(mensagem)
        router.refresh()
      } catch (e: unknown) {
        if (isRedirectError(e)) throw e
        toast.error(e instanceof Error ? e.message : 'Erro ao executar ação.')
      }
    })
  }

  function handleTransformarPedido() {
    if (!motivoConversao.trim()) {
      toast.error('Informe o motivo da conversão para gerar o pedido.')
      return
    }

    executar(
      () => transformarEmPedido(orcamentoId, motivoConversao.trim()),
      'Pedido gerado com sucesso!'
    )
    setShowConfirmacaoConversao(false)
    setMotivoConversao('')
  }

  // Fluxo simplificado
  const fluxoSimplificado = {
    rascunho: {
      acao: 'Enviar para aprovação',
      onClick: () => executar(() => enviarParaAprovacao(orcamentoId), 'Enviado para aprovação.'),
      cor: 'default',
    },
    aguardando_aprovacao_interna: {
      acao: isAdminGestor ? 'Aprovar Internamente' : null,
      onClick: isAdminGestor
        ? () => executar(() => aprovarInterno(orcamentoId, comentario), 'Aprovado internamente.')
        : null,
      cor: 'default',
    },
    aprovado_internamente: {
      acao: 'Enviar ao Cliente',
      onClick: () => executar(() => enviarAoCliente(orcamentoId), 'Enviado ao cliente.'),
      cor: 'default',
    },
    enviado_ao_cliente: {
      acao: 'Aprovar Orçamento',
      onClick: () => executar(() => aprovarOrcamento(orcamentoId), 'Orçamento aprovado!'),
      cor: 'default',
    },
    aprovado_pelo_cliente: {
      acao: 'Transformar em Pedido',
      onClick: verificarEPedirConfirmacao,
      cor: 'default',
    },
    recusado_pelo_cliente: {
      acao: null,
      onClick: null,
      cor: 'secondary',
    },
    rejeitado_internamente: {
      acao: 'Reenviar para Aprovação',
      onClick: () => executar(() => enviarParaAprovacao(orcamentoId), 'Reenviado para aprovação.'),
      cor: 'default',
    },
  }

  const fluxoAtual = fluxoSimplificado[status]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Fluxo principal */}
        {fluxoAtual.acao && fluxoAtual.onClick && (
          <Button
            className="w-full"
            onClick={fluxoAtual.onClick}
            disabled={isPending}
            variant={fluxoAtual.cor === 'destructive' ? 'destructive' : 'default'}
          >
            {fluxoAtual.acao}
          </Button>
        )}

        {/* Ações específicas por status */}
        {status === 'aguardando_aprovacao_interna' && isAdminGestor && (
          <>
            <Input
              placeholder="Motivo da rejeição..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => executar(() => rejeitarInterno(orcamentoId, comentario), 'Rejeitado.')}
              disabled={isPending || !comentario.trim()}
            >
              Rejeitar
            </Button>
          </>
        )}

        {/* Confirmação de conversão */}
        {showConfirmacaoConversao && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-800 mb-3">
                ⚠️ Este orçamento será convertido em pedido. Após isso, alterações no pedido exigirão autorização de administrador.
              </p>
              <Input
                placeholder="Informe o motivo da conversão..."
                value={motivoConversao}
                onChange={(e) => setMotivoConversao(e.target.value)}
                className="mb-3"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleTransformarPedido}
                  disabled={isPending || !motivoConversao.trim()}
                >
                  Confirmar Conversão
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowConfirmacaoConversao(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cliente recusou */}
        {status === 'recusado_pelo_cliente' && (
          <p className="text-center text-sm text-slate-400">Orçamento recusado pelo cliente.</p>
        )}

        {/* Orçamento finalizado (aprovado e convertido) */}
        {status === 'aprovado_pelo_cliente' && !showConfirmacaoConversao && (
          <div className="text-center space-y-2">
            <p className="text-sm text-green-600 font-medium">✓ Orçamento Aprovado</p>
            <p className="text-xs text-slate-500">Clique em "Transformar em Pedido" para continuar</p>
          </div>
        )}

        {/* Ações de exclusão */}
        {(status === 'rascunho' || status === 'rejeitado_internamente') && podeAgir && (
          <>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => {
                if (!confirmExcluir) { setConfirmExcluir(true); return }
                executar(() => excluirOrcamento(orcamentoId), 'Orçamento excluído.')
              }}
              disabled={isPending}
            >
              {confirmExcluir ? 'Confirmar exclusão' : 'Excluir orçamento'}
            </Button>
            {confirmExcluir && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setConfirmExcluir(false)}>
                Cancelar
              </Button>
            )}
          </>
        )}

        {/* Link para pedido existente */}
        {status === 'aprovado_pelo_cliente' && (
          <div className="pt-2 border-t">
            <Link href={`/pedidos?quote_id=${orcamentoId}`}>
              <Button variant="outline" size="sm" className="w-full">
                Ver Pedidos Gerados
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
