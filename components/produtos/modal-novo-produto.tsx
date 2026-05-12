'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { criarProduto, editarProduto } from '@/app/(dashboard)/configuracoes/produtos/actions'
import { Plus, Pencil } from 'lucide-react'
import type { Product } from '@/types/database'

type Props = { produto?: Product }

export function ModalNovoProduto({ produto }: Props) {
  const [aberto, setAberto] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const editando = !!produto

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        if (editando) {
          await editarProduto(produto.id, formData)
        } else {
          await criarProduto(formData)
        }
        setAberto(false)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar produto.')
      }
    })
  }

  return (
    <>
      {editando ? (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAberto(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button size="sm" className="gap-1.5" onClick={() => setAberto(true)}>
          <Plus className="h-4 w-4" />
          Novo produto
        </Button>
      )}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar produto' : 'Novo produto'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" defaultValue={produto?.nome ?? ''} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" name="descricao" defaultValue={produto?.descricao ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="preco_unitario">Preço unitário (R$)</Label>
              <Input
                id="preco_unitario"
                name="preco_unitario"
                type="number"
                step="0.01"
                min="0"
                defaultValue={produto?.preco_unitario ?? ''}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unidade">Unidade</Label>
              <Input id="unidade" name="unidade" defaultValue={produto?.unidade ?? 'un'} placeholder="un, h, m²..." />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar produto'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
