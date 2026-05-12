'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  enviarParaAprovacao,
  aprovarInterno,
  rejeitarInterno,
  enviarAoCliente,
  marcarAprovadoCliente,
  marcarRecusadoCliente,
  excluirOrcamento,
} from '@/app/(dashboard)/orcamentos/actions'
import type { QuoteStatus, UserRole } from '@/types/database'

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

  const isAdminGestor = cargo === 'admin' || cargo === 'gestor'
  const podeAgir = isAdminGestor || isResponsavel

  function executar(action: () => Promise<void>, mensagem: string) {
    startTransition(async () => {
      try {
        await action()
        toast.success(mensagem)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao executar ação.')
      }
    })
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Ações</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {status === 'rascunho' && podeAgir && (
          <>
            <Button
              className="w-full"
              onClick={() => executar(() => enviarParaAprovacao(orcamentoId), 'Enviado para aprovação.')}
              disabled={isPending}
            >
              Enviar para aprovação
            </Button>
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

        {status === 'rejeitado_internamente' && podeAgir && (
          <Button
            className="w-full"
            onClick={() => executar(() => enviarParaAprovacao(orcamentoId), 'Reenviado para aprovação.')}
            disabled={isPending}
          >
            Reenviar para aprovação
          </Button>
        )}

        {status === 'aguardando_aprovacao_interna' && isAdminGestor && (
          <>
            <Button
              className="w-full"
              onClick={() => executar(() => aprovarInterno(orcamentoId, comentario), 'Aprovado internamente.')}
              disabled={isPending}
            >
              Aprovar
            </Button>
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

        {status === 'aprovado_internamente' && podeAgir && (
          <Button
            className="w-full"
            onClick={() => executar(() => enviarAoCliente(orcamentoId), 'Enviado ao cliente.')}
            disabled={isPending}
          >
            Marcar como enviado ao cliente
          </Button>
        )}

        {status === 'enviado_ao_cliente' && podeAgir && (
          <>
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => executar(() => marcarAprovadoCliente(orcamentoId), 'Aprovado pelo cliente!')}
              disabled={isPending}
            >
              Cliente aprovou
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => executar(() => marcarRecusadoCliente(orcamentoId), 'Recusado pelo cliente.')}
              disabled={isPending}
            >
              Cliente recusou
            </Button>
          </>
        )}

        {(status === 'aprovado_pelo_cliente' || status === 'recusado_pelo_cliente') && (
          <p className="text-center text-sm text-slate-400">Orçamento finalizado.</p>
        )}
      </CardContent>
    </Card>
  )
}
