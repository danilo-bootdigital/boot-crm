'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight, X, Trash2, Edit } from 'lucide-react'
import { avancarStatus, cancelarPedido, excluirPedido } from '@/app/(dashboard)/pedidos/actions'
import { ModalEditarPedido } from '@/components/pedidos/modal-editar-pedido'
import { toast } from 'sonner'

const PROXIMO_LABEL: Record<string, string> = {
  pendente: 'Iniciar Produção',
  em_producao: 'Marcar Pronto',
  pronto: 'Marcar Enviado',
  enviado: 'Marcar Entregue',
  entregue: 'Concluir Pedido',
}

export function BotoesPedido({ pedidoId, status, numero, itens, ...pedidoData }: {
  pedidoId: string;
  status: string;
  numero: number;
  itens: any[];
} & any) {
  const [isPending, startTransition] = useTransition()
  const [showCancelar, setShowCancelar] = useState(false)
  const [showExcluir, setShowExcluir] = useState(false)
  const [showEditar, setShowEditar] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [senhaAdmin, setSenhaAdmin] = useState('')

  const podeAvancar = status in PROXIMO_LABEL
  const podeCancelar = status !== 'cancelado' && status !== 'concluido'
  const podeEditar = status !== 'cancelado' && status !== 'concluido'

  function handleAvancar() {
    startTransition(async () => {
      try {
        await avancarStatus(pedidoId)
        toast.success('Status atualizado.')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao avançar status.')
      }
    })
  }

  function handleCancelar() {
    if (!motivo.trim()) {
      toast.error('Informe o motivo do cancelamento.')
      return
    }
    startTransition(async () => {
      try {
        await cancelarPedido(pedidoId, motivo)
        toast.success('Pedido cancelado.')
        setShowCancelar(false)
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao cancelar.')
      }
    })
  }

  function handleExcluir() {
    if (!senhaAdmin.trim()) {
      toast.error('Informe a senha de administrador.')
      return
    }
    startTransition(async () => {
      try {
        await excluirPedido(pedidoId, senhaAdmin)
        toast.success('Pedido excluído.')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
        setSenhaAdmin('')
      }
    })
  }

  if (!podeAvancar && !podeCancelar && !showExcluir && !showEditar) return null

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {showExcluir ? (
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={senhaAdmin}
              onChange={(e) => setSenhaAdmin(e.target.value)}
              placeholder="Senha de administrador..."
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm w-56"
              autoFocus
            />
            <Button size="sm" variant="destructive" onClick={handleExcluir} disabled={isPending}>
              Confirmar Exclusão
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowExcluir(false); setSenhaAdmin('') }} disabled={isPending}>
              Voltar
            </Button>
          </div>
        ) : showCancelar ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo do cancelamento..."
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm w-56"
              autoFocus
            />
            <Button size="sm" variant="destructive" onClick={handleCancelar} disabled={isPending}>
              Confirmar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCancelar(false)} disabled={isPending}>
              Voltar
            </Button>
          </div>
        ) : (
          <>
            {podeAvancar && (
              <Button size="sm" onClick={handleAvancar} disabled={isPending} className="gap-1">
                <ChevronRight className="h-4 w-4" />
                {PROXIMO_LABEL[status]}
              </Button>
            )}
            {podeEditar && (
              <Button size="sm" variant="outline" onClick={() => setShowEditar(true)} disabled={isPending} className="gap-1">
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            )}
            {podeCancelar && (
              <Button size="sm" variant="outline" onClick={() => setShowCancelar(true)} disabled={isPending} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
                <X className="h-4 w-4" />
                Cancelar
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowExcluir(true)} disabled={isPending} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
              Excluir Pedido
            </Button>
          </>
        )}
      </div>

      {/* Modal de Edição */}
      {showEditar && (
        <ModalEditarPedido
          pedido={{
            pedidoId,
            numero,
            status: status as any,
            itens,
            ...pedidoData,
          }}
          onClose={() => setShowEditar(false)}
        />
      )}
    </>
  )
}
