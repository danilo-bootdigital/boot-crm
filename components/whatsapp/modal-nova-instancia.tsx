'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { adicionarInstancia } from '@/app/(dashboard)/configuracoes/whatsapp/actions'

type Vendedor = { id: string; nome: string }

type Props = {
  aberto: boolean
  onFechar: () => void
  vendedores: Vendedor[]
}

export function ModalNovaInstancia({ aberto, onFechar, vendedores }: Props) {
  const [compartilhado, setCompartilhado] = useState('true')
  const [vendedorId, setVendedorId] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (aberto) {
      setCompartilhado('true')
      setVendedorId('')
      setErro(null)
    }
  }, [aberto])

  async function handleSubmit(formData: FormData) {
    formData.set('compartilhado', compartilhado)
    if (compartilhado === 'false') formData.set('vendedor_id', vendedorId)

    setCarregando(true)
    setErro(null)
    try {
      await adicionarInstancia(formData)
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar instância.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Instância WhatsApp</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_instancia">Nome *</Label>
            <Input id="nome_instancia" name="nome" placeholder="Ex: Vendas Principal" required autoFocus />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={compartilhado} onValueChange={(v) => setCompartilhado(v ?? 'true')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Compartilhado pela equipe</SelectItem>
                <SelectItem value="false">Individual (um vendedor)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {compartilhado === 'false' && (
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={vendedorId} onValueChange={(v) => setVendedorId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {erro && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar Instância'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
