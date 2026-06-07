'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { transformarEmPedido } from '@/app/(dashboard)/orcamentos/actions'
import Link from 'next/link'
import type { QuoteStatus, UserRole } from '@/types/database'

type Props = {
  orcamentoId: string
  status: QuoteStatus
  cargo: UserRole
}

export function AcoesOrcamentoDetalhe({ orcamentoId, status, cargo }: Props) {
  const [isPending, startTransition] = useTransition()
  const [motivo, setMotivo] = useState('')
  const [pedidoGerado, setPedidoGerado] = useState(false)

  const isAdminGestor = cargo === 'admin' || cargo === 'gestor'

  const converterParaPedido = () => {
    startTransition(async () => {
      try {
        await transformarEmPedido(orcamentoId, motivo)
        toast.success('Pedido gerado com sucesso!')
        setPedidoGerado(true)
        // Forçar refresh dos dados
        setTimeout(() => window.location.reload(), 1000)
      } catch (error: any) {
        toast.error(error.message || 'Erro ao gerar pedido.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Botão para converter em pedido - apenas quando status for aprovado pelo cliente */}
        {status === 'aprovado_pelo_cliente' && !pedidoGerado && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">Converter este orçamento em pedido:</p>
            <Input
              placeholder="Motivo da conversão (opcional)"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1"
            />
            <Button
              onClick={converterParaPedido}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? 'Gerando pedido...' : 'Converter em Pedido'}
            </Button>
          </div>
        )}

        {/* Mensagem quando pedido já foi gerado */}
        {status === 'aprovado_pelo_cliente' && pedidoGerado && (
          <div className="text-center space-y-2">
            <p className="text-sm text-green-600 font-medium">✓ Pedido Gerado</p>
            <p className="text-xs text-slate-500">Este orçamento já foi convertido em pedido</p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Link href={`/pedidos?quote_id=${orcamentoId}`}>Ver Pedidos Gerados</Link>
            </Button>
          </div>
        )}

        {/* Botão para enviar aprovação - quando status for rascunho */}
        {status === 'rascunho' && (
          <form action={async () => {
            'use server'
            await transformarEmPedido(orcamentoId, 'Aprovação automática')
            toast.success('Pedido gerado com sucesso!')
            setPedidoGerado(true)
            setTimeout(() => window.location.reload(), 1000)
          }}>
            <Button
              type="submit"
              disabled={isPending}
              variant="default"
              className="w-full"
            >
              {isPending ? 'Processando...' : 'Enviar para Aprovação'}
            </Button>
          </form>
        )}

        {/* Botão para aprovar internamente - quando status for aguardando aprovação */}
        {status === 'aguardando_aprovacao_interna' && isAdminGestor && (
          <div className="space-y-2">
            <form action={async () => {
              'use server'
              await transformarEmPedido(orcamentoId, 'Aprovação interna')
              toast.success('Pedido gerado com sucesso!')
              setPedidoGerado(true)
              setTimeout(() => window.location.reload(), 1000)
            }}>
              <Button
                type="submit"
                disabled={isPending}
                variant="default"
                className="w-full"
              >
                {isPending ? 'Processando...' : 'Aprovar Internamente'}
              </Button>
            </form>
          </div>
        )}

        {/* Botão para enviar ao cliente - quando status for aprovado internamente */}
        {status === 'aprovado_internamente' && (
          <form action={async () => {
            'use server'
            await transformarEmPedido(orcamentoId, 'Envio ao cliente')
            toast.success('Pedido gerado com sucesso!')
            setPedidoGerado(true)
            setTimeout(() => window.location.reload(), 1000)
          }}>
            <Button
              type="submit"
              disabled={isPending}
              variant="default"
              className="w-full"
            >
              {isPending ? 'Processando...' : 'Enviar ao Cliente'}
            </Button>
          </form>
        )}

        {/* Botão para marcar como aprovado pelo cliente */}
        {status === 'enviado_ao_cliente' && (
          <form action={async () => {
            'use server'
            await transformarEmPedido(orcamentoId, 'Cliente aprovou')
            toast.success('Pedido gerado com sucesso!')
            setPedidoGerado(true)
            setTimeout(() => window.location.reload(), 1000)
          }}>
            <Button
              type="submit"
              disabled={isPending}
              variant="default"
              className="w-full"
            >
              {isPending ? 'Processando...' : 'Cliente Aprovou'}
            </Button>
          </form>
        )}

        {/* Cliente recusou */}
        {status === 'recusado_pelo_cliente' && (
          <p className="text-center text-sm text-slate-400">Orçamento recusado pelo cliente.</p>
        )}

        {/* Orçamento finalizado (aprovado e convertido) */}
        {status === 'aprovado_pelo_cliente' && pedidoGerado && (
          <div className="text-center space-y-2">
            <p className="text-sm text-green-600 font-medium">✓ Orçamento Aprovado</p>
            <p className="text-xs text-slate-500">O orçamento foi aprovado pelo cliente</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}