'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { excluirHub, editarHub } from '@/app/(dashboard)/configuracoes/hubs-de-saude/actions'
import { ModalEditarHub } from './modal-editar-hub'

type Hub = {
  id: string
  nome: string
  status: string
  criado_em: string
}

type Props = {
  hubs: Hub[]
  fornecedoresPorHub: Record<string, number>
}

export function TabelaHubs({ hubs, fornecedoresPorHub }: Props) {
  const [isPending, startTransition] = useTransition()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const router = useRouter()

  function iniciarEdicao(hub: Hub, e: React.MouseEvent) {
    e.stopPropagation()
    setEditandoId(hub.id)
    setEditNome(hub.nome)
    setEditStatus(hub.status)
  }

  function cancelarEdicao(e: React.MouseEvent) {
    e.stopPropagation()
    setEditandoId(null)
  }

  function salvarEdicao(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!editNome.trim()) {
      toast.error('Nome é obrigatório.')
      return
    }
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('nome', editNome.trim())
        formData.set('status', editStatus)
        await editarHub(id, formData)
        toast.success('Hub atualizado.')
        setEditandoId(null)
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao editar.')
      }
    })
  }

  function handleExcluir(id: string, nome: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm(`Excluir hub "${nome}"?`)) return
    startTransition(async () => {
      try {
        await excluirHub(id)
        toast.success('Hub excluído.')
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao excluir.')
      }
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Fornecedores</th>
            <th className="px-4 py-3 w-24">Ações</th>
          </tr>
        </thead>
        <tbody>
          {hubs.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                Nenhum hub de saúde cadastrado.
              </td>
            </tr>
          )}
          {hubs.map((hub) => (
            <tr
              key={hub.id}
              className="border-b last:border-0 hover:bg-slate-50"
            >
              <td className="px-4 py-3">
                {editandoId === hub.id ? (
                  <div className="flex flex-col gap-2">
                    <Input
                      className="h-8 text-sm"
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') salvarEdicao(hub.id, e as unknown as React.MouseEvent)
                        if (e.key === 'Escape') setEditandoId(null)
                      }}
                      autoFocus
                    />
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </div>
                ) : (
                  <span className="font-medium text-slate-900">{hub.nome}</span>
                )}
              </td>
              <td className="px-4 py-3">
                {editandoId === hub.id ? null : (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    hub.status === 'ativo'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {hub.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {fornecedoresPorHub[hub.id] || 0}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {editandoId === hub.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-600"
                        onClick={(e) => salvarEdicao(hub.id, e)}
                        disabled={isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400"
                        onClick={cancelarEdicao}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-blue-600"
                        onClick={(e) => iniciarEdicao(hub, e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={(e) => handleExcluir(hub.id, hub.nome, e)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
