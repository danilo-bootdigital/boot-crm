'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { criarOrcamento, editarOrcamento } from '@/app/(dashboard)/orcamentos/actions'
import { formatarMoeda } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import type { Product, Supplier, SupplierCategory } from '@/types/database'

type ItemForm = {
  key: string
  product_id: string | null
  descricao: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
}

type Lead = { id: string; nome: string | null }
type Deal = { id: string; titulo: string }

type Props = {
  produtos: Product[]
  fornecedores: Supplier[]
  categorias: SupplierCategory[]
  leads: Lead[]
  deals: Deal[]
  orcamentoId?: string
  defaultValues?: {
    lead_id: string | null
    deal_id: string | null
    supplier_id: string | null
    observacoes: string | null
    endereco_entrega: string | null
    desconto_geral: number
    frete: number
    itens: Omit<ItemForm, 'key'>[]
  }
}

function calcularSubtotal(item: ItemForm) {
  return item.quantidade * item.preco_unitario * (1 - item.desconto_item / 100)
}

export function FormOrcamento({ produtos, fornecedores, categorias, leads, deals, orcamentoId, defaultValues }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const editando = !!orcamentoId

  const [leadId, setLeadId] = useState(defaultValues?.lead_id ?? '')
  const [dealId, setDealId] = useState(defaultValues?.deal_id ?? '')
  const [supplierId, setSupplierId] = useState(defaultValues?.supplier_id ?? '')
  const [categoryId, setCategoryId] = useState('')
  const [observacoes, setObservacoes] = useState(defaultValues?.observacoes ?? '')
  const [enderecoEntrega, setEnderecoEntrega] = useState(defaultValues?.endereco_entrega ?? '')
  const [descontoGeral, setDescontoGeral] = useState(defaultValues?.desconto_geral ?? 0)
  const [frete, setFrete] = useState(defaultValues?.frete ?? 0)
  const [itens, setItens] = useState<ItemForm[]>(
    defaultValues?.itens.map((item, i) => ({ ...item, key: `item-${i}` })) ?? [
      { key: 'item-0', product_id: null, descricao: '', quantidade: 1, preco_unitario: 0, desconto_item: 0 },
    ]
  )

  // Filtrar categorias pelo fornecedor selecionado
  const categoriasFiltradas = supplierId
    ? categorias.filter((c) => c.supplier_id === supplierId)
    : []

  // Filtrar produtos pelo fornecedor e categoria selecionados
  const produtosFiltrados = produtos.filter((p) => {
    if (!p.ativo) return false
    if (supplierId && p.supplier_id !== supplierId) return false
    if (categoryId && p.category_id !== categoryId) return false
    return true
  })

  function handleFornecedorChange(novoId: string | null) {
    const id = (!novoId || novoId === '__none__') ? '' : novoId
    // Se já tem itens com produto selecionado de outro fornecedor, avisar
    const temProdutoSelecionado = itens.some((i) => i.product_id)
    if (temProdutoSelecionado && id !== supplierId) {
      const confirmar = window.confirm(
        'Trocar de fornecedor vai limpar os produtos selecionados nos itens. Continuar?'
      )
      if (!confirmar) return
      // Limpar produtos dos itens
      setItens((prev) =>
        prev.map((i) => ({ ...i, product_id: null, descricao: '', preco_unitario: 0 }))
      )
    }
    setSupplierId(id)
    setCategoryId('')
  }

  function adicionarItem() {
    setItens((prev) => [
      ...prev,
      { key: `item-${Date.now()}`, product_id: null, descricao: '', quantidade: 1, preco_unitario: 0, desconto_item: 0 },
    ])
  }

  function removerItem(key: string) {
    setItens((prev) => prev.filter((i) => i.key !== key))
  }

  function atualizarItem(key: string, campo: keyof ItemForm, valor: unknown) {
    setItens((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [campo]: valor } : i))
    )
  }

  function selecionarProduto(key: string, produtoId: string) {
    const produto = produtosFiltrados.find((p) => p.id === produtoId)
    if (!produto) return
    setItens((prev) =>
      prev.map((i) =>
        i.key === key
          ? { ...i, product_id: produtoId, descricao: produto.nome, preco_unitario: produto.preco_unitario }
          : i
      )
    )
  }

  const valorSubtotal = itens.reduce((acc, item) => acc + calcularSubtotal(item), 0)
  const valorTotal = valorSubtotal * (1 - descontoGeral / 100) + frete

  function handleSubmit() {
    if (itens.length === 0) {
      toast.error('Adicione ao menos um item.')
      return
    }
    const itensInvalidos = itens.some((i) => !i.descricao.trim())
    if (itensInvalidos) {
      toast.error('Todos os itens precisam de uma descrição.')
      return
    }

    startTransition(async () => {
      try {
        const dados = {
          lead_id: leadId || null,
          deal_id: dealId || null,
          supplier_id: supplierId || null,
          observacoes: observacoes || null,
          endereco_entrega: enderecoEntrega || null,
          desconto_geral: descontoGeral,
          frete,
          itens: itens.map(({ product_id, descricao, quantidade, preco_unitario, desconto_item }) => ({
            product_id,
            descricao,
            quantidade,
            preco_unitario,
            desconto_item,
          })),
        }
        if (editando) {
          await editarOrcamento(orcamentoId, dados)
          toast.success('Orçamento atualizado.')
        } else {
          await criarOrcamento(dados)
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar orçamento.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-1">
          <Label>Fornecedor *</Label>
          <Select value={supplierId || '__none__'} onValueChange={handleFornecedorChange}>
            <SelectTrigger>
              <span className="flex flex-1 text-left truncate">
                {supplierId ? fornecedores.find(f => f.id === supplierId)?.nome ?? 'Selecionar...' : 'Todos (sem filtro)'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Todos (sem filtro)</SelectItem>
              {fornecedores.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {supplierId && (
            <p className="text-xs text-slate-500">Apenas produtos deste fornecedor serão exibidos.</p>
          )}
        </div>
        {supplierId && categoriasFiltradas.length > 0 && (
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={categoryId || '__all__'} onValueChange={(v) => setCategoryId(v === '__all__' ? '' : (v ?? ''))}>
              <SelectTrigger>
                <span className="flex flex-1 text-left truncate">
                  {categoryId ? categoriasFiltradas.find(c => c.id === categoryId)?.nome ?? 'Todas' : 'Todas as categorias'}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as categorias</SelectItem>
                {categoriasFiltradas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label>Lead (opcional)</Label>
          <Select value={leadId || '__none__'} onValueChange={(v) => setLeadId(v === '__none__' ? '' : (v ?? ''))}>
            <SelectTrigger>
              <span className="flex flex-1 text-left truncate">
                {leadId ? leads.find(l => l.id === leadId)?.nome ?? 'Selecionar...' : 'Nenhum'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {leads.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.nome ?? l.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Negociação (opcional)</Label>
          <Select value={dealId || '__none__'} onValueChange={(v) => setDealId(v === '__none__' ? '' : (v ?? ''))}>
            <SelectTrigger>
              <span className="flex flex-1 text-left truncate">
                {dealId ? deals.find(d => d.id === dealId)?.titulo ?? 'Selecionar...' : 'Nenhuma'}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhuma</SelectItem>
              {deals.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.titulo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Itens</Label>
          <Button type="button" variant="outline" size="sm" onClick={adicionarItem} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Adicionar item
          </Button>
        </div>

        {itens.map((item) => (
          <Card key={item.key}>
            <CardContent className="grid gap-3 p-4 md:grid-cols-12">
              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs">Produto</Label>
                <Select
                  value={item.product_id || '__livre__'}
                  onValueChange={(v) => {
                    if (v && v !== '__livre__') selecionarProduto(item.key, v)
                    else atualizarItem(item.key, 'product_id', null)
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <span className="flex flex-1 text-left truncate">
                      {item.product_id ? produtosFiltrados.find(p => p.id === item.product_id)?.nome ?? 'Produto' : 'Descrição livre'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__livre__">Descrição livre</SelectItem>
                    {produtosFiltrados.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3 space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Input
                  className="h-8 text-xs"
                  value={item.descricao}
                  onChange={(e) => atualizarItem(item.key, 'descricao', e.target.value)}
                  placeholder="Descrição do item"
                />
              </div>
              <div className="md:col-span-1 space-y-1">
                <Label className="text-xs">Qtd</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={item.quantidade}
                  onChange={(e) => atualizarItem(item.key, 'quantidade', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">Preço unit.</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.preco_unitario}
                  onChange={(e) => atualizarItem(item.key, 'preco_unitario', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="md:col-span-1 space-y-1">
                <Label className="text-xs">Desc %</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={item.desconto_item}
                  onChange={(e) => atualizarItem(item.key, 'desconto_item', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="md:col-span-1 flex items-end justify-between">
                <span className="text-xs font-medium text-slate-700">{formatarMoeda(calcularSubtotal(item))}</span>
              </div>
              <div className="md:col-span-1 flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-600"
                  onClick={() => removerItem(item.key)}
                  disabled={itens.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Endereço de entrega</Label>
            <Input
              value={enderecoEntrega}
              onChange={(e) => setEnderecoEntrega(e.target.value)}
              placeholder="Rua, número, bairro, cidade - UF"
            />
          </div>
          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Condições de pagamento, prazo de entrega..."
              rows={3}
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Desconto geral (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={descontoGeral}
                onChange={(e) => setDescontoGeral(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label>Frete (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={frete}
                onChange={(e) => setFrete(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 space-y-1">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{formatarMoeda(valorSubtotal)}</span>
            </div>
            {descontoGeral > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Desconto ({descontoGeral}%)</span>
                <span>-{formatarMoeda(valorSubtotal * descontoGeral / 100)}</span>
              </div>
            )}
            {frete > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>Frete</span>
                <span>+{formatarMoeda(frete)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 border-t pt-1">
              <span>Total</span>
              <span>{formatarMoeda(valorTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={isPending} className="w-full md:w-auto">
        {isPending ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar orçamento'}
      </Button>
    </div>
  )
}
