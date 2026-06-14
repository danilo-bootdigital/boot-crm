'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Pencil } from 'lucide-react'
import { editarHub } from '@/app/(dashboard)/configuracoes/hubs-de-saude/actions'

type Hub = {
  id: string
  nome: string
  status: string
}

type Props = {
  hub: Hub
}

export function ModalEditarHub({ hub }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [nome, setNome] = useState(hub.nome)
  const [status, setStatus] = useState(hub.status)
  const router = useRouter()

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (open) {
      setNome(hub.nome)
      setStatus(hub.status)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Nome é obrigatório.')
      return
    }
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set('nome', nome.trim())
        formData.set('status', status)
        await editarHub(hub.id, formData)
        toast.success('Hub atualizado.')
        setIsOpen(false)
        router.refresh()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao atualizar hub.')
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-slate-400 hover:text-blue-600"
        onClick={() => setIsOpen(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Hub de Saúde</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor={`nome-${hub.id}`}>Nome do Hub *</Label>
              <Input
                id={`nome-${hub.id}`}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Smart Health Company"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`status-${hub.id}`}>Status</Label>
              <select
                id={`status-${hub.id}`}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
