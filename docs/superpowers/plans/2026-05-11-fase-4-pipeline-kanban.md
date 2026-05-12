# Fase 4 — Pipeline Kanban com Drag-and-Drop

> **Para agentes autônomos:** SUB-SKILL OBRIGATÓRIA: Use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar este plano tarefa a tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Objetivo:** Criar o Pipeline de Vendas — quadro Kanban com drag-and-drop de negociações entre etapas, atualização em tempo real via Supabase Realtime, validações de fechamento/perda e página de configuração de etapas para admin e gestor.

**Arquitetura:** A página `/pipeline` é Server Component que busca o pipeline padrão com etapas e negociações. O `KanbanBoard` (Client Component) gerencia estado local e subscrição Realtime. Drag-and-drop usa `@dnd-kit/core`. Etapas especiais ("Fechado", "Perdido") são identificadas via coluna `tipo_especial` em `pipeline_stages` — adicionada por migration nesta fase. Configuração de etapas fica em `/pipeline/configurar` (admin e gestor).

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Tailwind CSS v4 · shadcn/ui · @dnd-kit/core · Supabase SSR + Realtime

---

## ATENÇÕES CRÍTICAS PARA O IMPLEMENTADOR

1. **`createClient()` é async no servidor** — sempre `await createClient()`.
2. **Tailwind v4** — não usar `@tailwind base/components/utilities`. CSS já tem `@import "tailwindcss"`.
3. **Sem `any`** — usar `unknown` em catch blocks.
4. **Interface 100% em português** — zero palavras em inglês visíveis ao usuário.
5. **Supabase Realtime em Client Component** — usar `createBrowserClient` via `@/lib/supabase/client`.
6. **Join no select do Supabase** — `contato:contato_id(id, nome)` retorna objeto (não array) para FK many-to-one.
7. **Permissões do pipeline:** ver = admin+gestor+vendedor; mover cards = admin+gestor+vendedor (atendimento NÃO); editar etapas = admin+gestor; vendedor vê apenas os próprios deals.
8. **`@dnd-kit/core` ativaçãod istância 8px** — evita cliques acidentais virarem drag.

---

## Estrutura de Arquivos

```
supabase/migrations/
  002_pipeline_tipo_etapa.sql             # CRIAR: ADD COLUMN tipo_especial

types/
  database.ts                             # MODIFICAR: adicionar tipo_especial em PipelineStage

app/(dashboard)/pipeline/
  page.tsx                                # CRIAR: Server Component — carrega dados do pipeline
  actions.ts                              # CRIAR: criarDeal, moverDeal
  configurar/
    page.tsx                              # CRIAR: Server Component — configurar etapas
    actions.ts                            # CRIAR: adicionarEtapa, renomearEtapa, alterarCor,
                                          #        reordenarEtapas, alternarOculto, excluirEtapa

components/pipeline/
  kanban-board.tsx                        # CRIAR: Client Component — DndContext + Realtime + estado
  kanban-coluna.tsx                       # CRIAR: Client Component — useDroppable
  kanban-card.tsx                         # CRIAR: Client Component — useDraggable
  modal-nova-negociacao.tsx               # CRIAR: Client Component — criar deal em uma coluna
  modal-fechado.tsx                       # CRIAR: Client Component — exige valor_estimado
  modal-perdido.tsx                       # CRIAR: Client Component — exige motivo_perda
  form-etapas.tsx                         # CRIAR: Client Component — gerenciar etapas
```

---

## Tarefa 1: Migration, tipos e instalação de dependência

**Arquivos:**
- Criar: `supabase/migrations/002_pipeline_tipo_etapa.sql`
- Modificar: `types/database.ts`

- [ ] **Passo 1: Instalar `@dnd-kit/core`**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npm install @dnd-kit/core
```

- [ ] **Passo 2: Criar a migration `002_pipeline_tipo_etapa.sql`**

Criar `supabase/migrations/002_pipeline_tipo_etapa.sql`:

```sql
-- Adiciona coluna para identificar etapas especiais do pipeline
ALTER TABLE pipeline_stages
  ADD COLUMN IF NOT EXISTS tipo_especial text
  CHECK (tipo_especial IN ('fechado', 'perdido'));

-- Marca etapas padrão existentes
UPDATE pipeline_stages SET tipo_especial = 'fechado'
WHERE LOWER(nome) = 'fechado' AND tipo_especial IS NULL;

UPDATE pipeline_stages SET tipo_especial = 'perdido'
WHERE LOWER(nome) = 'perdido' AND tipo_especial IS NULL;
```

- [ ] **Passo 3: Executar a migration no Supabase**

No painel do Supabase → SQL Editor → New query → colar o conteúdo acima → Run.

Verificar que `pipeline_stages` agora tem a coluna `tipo_especial` com `'fechado'` e `'perdido'` nas etapas correspondentes.

- [ ] **Passo 4: Atualizar `types/database.ts` — adicionar `tipo_especial` em `PipelineStage`**

Localizar a definição de `PipelineStage` e adicionar o campo:

```typescript
export type PipelineStage = {
  id: string
  organization_id: string
  pipeline_id: string
  nome: string
  ordem: number
  cor: string
  oculto: boolean
  tipo_especial: 'fechado' | 'perdido' | null   // ← ADICIONAR ESTA LINHA
  criado_em: string
  atualizado_em: string
}
```

- [ ] **Passo 5: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Passo 6: Commit**

```bash
cd /Users/danilo/Documents/BOOT-CRM
git add supabase/migrations/002_pipeline_tipo_etapa.sql types/database.ts
git commit -m "feat: adicionar coluna tipo_especial nas etapas do pipeline"
```

---

## Tarefa 2: Server Actions de negociações (`criarDeal`, `moverDeal`)

**Arquivos:**
- Criar: `app/(dashboard)/pipeline/actions.ts`

- [ ] **Passo 1: Criar `app/(dashboard)/pipeline/actions.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getVendedorOuSuperior() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (!['admin', 'gestor', 'vendedor'].includes(perfil.cargo)) redirect('/painel')

  return { supabase, perfil }
}

export async function criarDeal(formData: FormData) {
  const { supabase, perfil } = await getVendedorOuSuperior()

  const titulo = formData.get('titulo') as string
  const pipeline_id = formData.get('pipeline_id') as string
  const estagio_id = formData.get('estagio_id') as string
  const valorBruto = formData.get('valor_estimado') as string | null
  const contato_id = formData.get('contato_id') as string | null
  const responsavel_id_form = formData.get('responsavel_id') as string | null
  const data_fechamento = formData.get('data_fechamento_prevista') as string | null
  const observacoes = formData.get('observacoes') as string | null

  if (!titulo?.trim()) throw new Error('Título é obrigatório.')
  if (!pipeline_id || !estagio_id) throw new Error('Pipeline e etapa são obrigatórios.')

  const valor_estimado =
    valorBruto && valorBruto.trim() !== '' ? parseFloat(valorBruto) : null

  // Vendedor só cria no próprio nome; admin/gestor podem escolher responsável
  const responsavel_id =
    perfil.cargo === 'vendedor' ? perfil.id : (responsavel_id_form || null)

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      organization_id: perfil.organization_id,
      titulo: titulo.trim(),
      pipeline_id,
      estagio_id,
      valor_estimado,
      contato_id: contato_id || null,
      responsavel_id,
      data_fechamento_prevista: data_fechamento || null,
      observacoes: observacoes || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar negociação: ${error.message}`)

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'deal_criado',
    descricao: `Negociação "${titulo.trim()}" criada.`,
    deal_id: deal.id,
  })

  revalidatePath('/pipeline')
}

export async function moverDeal(
  dealId: string,
  estagioDestinoId: string,
  extras: { valor_estimado?: number; motivo_perda?: string } = {}
): Promise<void> {
  const { supabase, perfil } = await getVendedorOuSuperior()

  const { data: deal } = await supabase
    .from('deals')
    .select('id, titulo, estagio_id, responsavel_id, valor_estimado')
    .eq('id', dealId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!deal) throw new Error('Negociação não encontrada.')

  // Vendedor só move os próprios deals
  if (perfil.cargo === 'vendedor' && deal.responsavel_id !== perfil.id) {
    throw new Error('Você não tem permissão para mover esta negociação.')
  }

  const { data: etapaDestino } = await supabase
    .from('pipeline_stages')
    .select('id, nome, tipo_especial')
    .eq('id', estagioDestinoId)
    .single()

  if (!etapaDestino) throw new Error('Etapa de destino não encontrada.')

  const updates: Record<string, unknown> = {
    estagio_id: estagioDestinoId,
    atualizado_em: new Date().toISOString(),
  }

  let tipoAtividade = 'deal_movido'
  let descAtividade = `Negociação movida para "${etapaDestino.nome}".`

  if (etapaDestino.tipo_especial === 'fechado') {
    const novoValor = extras.valor_estimado ?? deal.valor_estimado
    if (!novoValor || novoValor <= 0) {
      throw new Error('Valor estimado é obrigatório para fechar a negociação.')
    }
    updates.valor_estimado = novoValor
    updates.ganho = true
    tipoAtividade = 'deal_ganho'
    descAtividade = `Negociação fechada. Valor: ${novoValor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })}`
  }

  if (etapaDestino.tipo_especial === 'perdido') {
    if (!extras.motivo_perda?.trim()) {
      throw new Error('Motivo da perda é obrigatório.')
    }
    updates.ganho = false
    updates.motivo_perda = extras.motivo_perda.trim()
    tipoAtividade = 'deal_perdido'
    descAtividade = `Negociação perdida. Motivo: ${extras.motivo_perda.trim()}`
  }

  const { error } = await supabase
    .from('deals')
    .update(updates)
    .eq('id', dealId)

  if (error) throw new Error(`Erro ao mover negociação: ${error.message}`)

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: tipoAtividade,
    descricao: descAtividade,
    deal_id: dealId,
  })

  revalidatePath('/pipeline')
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Passo 3: Commit**

```bash
cd /Users/danilo/Documents/BOOT-CRM
git add "app/(dashboard)/pipeline/actions.ts"
git commit -m "feat: adicionar server actions criarDeal e moverDeal"
```

---

## Tarefa 3: `KanbanCard` — card draggable

**Arquivos:**
- Criar: `components/pipeline/kanban-card.tsx`

- [ ] **Passo 1: Criar a pasta e o arquivo**

```bash
mkdir -p /Users/danilo/Documents/BOOT-CRM/components/pipeline
```

Criar `components/pipeline/kanban-card.tsx`:

```typescript
'use client'

import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, DollarSign } from 'lucide-react'

export type DealCard = {
  id: string
  titulo: string
  valor_estimado: number | null
  ganho: boolean | null
  motivo_perda: string | null
  data_fechamento_prevista: string | null
  estagio_id: string
  contato: { id: string; nome: string } | null
  responsavel: { id: string; nome: string } | null
}

type Props = {
  deal: DealCard
  podeArrastar: boolean
}

export function KanbanCard({ deal, podeArrastar }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
    disabled: !podeArrastar,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'rounded-lg border bg-white p-3 shadow-sm transition-shadow select-none',
        podeArrastar && 'cursor-grab active:cursor-grabbing hover:shadow-md',
        isDragging && 'opacity-40',
      )}
    >
      <p className="text-sm font-medium text-slate-900 line-clamp-2">{deal.titulo}</p>

      {deal.contato && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">{deal.contato.nome}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {deal.valor_estimado !== null && deal.valor_estimado > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
            <DollarSign className="h-3 w-3 shrink-0" />
            {deal.valor_estimado.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            })}
          </span>
        )}
        {deal.data_fechamento_prevista && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3 shrink-0" />
            {format(new Date(deal.data_fechamento_prevista + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
          </span>
        )}
      </div>

      {deal.responsavel && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
            {deal.responsavel.nome.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-slate-500 truncate">
            {deal.responsavel.nome.split(' ')[0]}
          </span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 3: Commit**

```bash
cd /Users/danilo/Documents/BOOT-CRM
git add components/pipeline/kanban-card.tsx
git commit -m "feat: adicionar componente KanbanCard (draggable)"
```

---

## Tarefa 4: `KanbanColuna` — coluna droppable

**Arquivos:**
- Criar: `components/pipeline/kanban-coluna.tsx`

- [ ] **Passo 1: Criar `components/pipeline/kanban-coluna.tsx`**

```typescript
'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanCard, type DealCard } from './kanban-card'

type Etapa = {
  id: string
  nome: string
  cor: string
  tipo_especial: 'fechado' | 'perdido' | null
}

type Props = {
  etapa: Etapa
  deals: DealCard[]
  podeArrastar: boolean
  podeCriar: boolean
  onNovaNegociacao: (estagioId: string) => void
}

export function KanbanColuna({ etapa, deals, podeArrastar, podeCriar, onNovaNegociacao }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: etapa.id,
    data: { etapa },
  })

  const totalValor = deals.reduce((sum, d) => sum + (d.valor_estimado ?? 0), 0)

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: etapa.cor }}
          />
          <span className="text-sm font-semibold text-slate-800 truncate">{etapa.nome}</span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {deals.length}
          </span>
        </div>
        {podeCriar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onNovaNegociacao(etapa.id)}
            title="Nova negociação"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Total da coluna */}
      {totalValor > 0 && (
        <p className="px-1 text-xs text-slate-400">
          {totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
        </p>
      )}

      {/* Área de drop */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[180px] flex-col gap-2 rounded-xl p-2 transition-colors',
          isOver ? 'bg-slate-200' : 'bg-slate-100',
        )}
      >
        {deals.map((deal) => (
          <KanbanCard key={deal.id} deal={deal} podeArrastar={podeArrastar} />
        ))}

        {deals.length === 0 && (
          <div
            className={cn(
              'flex flex-1 items-center justify-center rounded-lg border-2 border-dashed py-8 text-xs text-slate-400 transition-colors',
              isOver ? 'border-slate-400 text-slate-500' : 'border-slate-300',
            )}
          >
            Solte aqui
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 3: Commit**

```bash
cd /Users/danilo/Documents/BOOT-CRM
git add components/pipeline/kanban-coluna.tsx
git commit -m "feat: adicionar componente KanbanColuna (droppable)"
```

---

## Tarefa 5: Modais de validação `ModalFechado` e `ModalPerdido`

**Arquivos:**
- Criar: `components/pipeline/modal-fechado.tsx`
- Criar: `components/pipeline/modal-perdido.tsx`

- [ ] **Passo 1: Criar `components/pipeline/modal-fechado.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  deal: { id: string; titulo: string; valor_estimado: number | null }
  aberto: boolean
  onConfirmar: (valorEstimado: number) => void
  onCancelar: () => void
}

export function ModalFechado({ deal, aberto, onConfirmar, onCancelar }: Props) {
  const [valor, setValor] = useState(
    deal.valor_estimado && deal.valor_estimado > 0
      ? deal.valor_estimado.toFixed(2)
      : ''
  )
  const [erro, setErro] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(valor.replace(',', '.'))
    if (isNaN(num) || num <= 0) {
      setErro('Informe um valor maior que zero.')
      return
    }
    onConfirmar(num)
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onCancelar() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Fechar Negociação</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Informe o valor final para fechar{' '}
          <span className="font-medium">"{deal.titulo}"</span>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valor_fechado">Valor fechado (R$)</Label>
            <Input
              id="valor_fechado"
              type="number"
              min="0.01"
              step="0.01"
              value={valor}
              onChange={(e) => { setValor(e.target.value); setErro(null) }}
              placeholder="0,00"
              required
              autoFocus
            />
          </div>
          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
              Fechar Negociação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 2: Criar `components/pipeline/modal-perdido.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  deal: { id: string; titulo: string }
  aberto: boolean
  onConfirmar: (motivoPerda: string) => void
  onCancelar: () => void
}

export function ModalPerdido({ deal, aberto, onConfirmar, onCancelar }: Props) {
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!motivo.trim()) {
      setErro('Informe o motivo da perda.')
      return
    }
    onConfirmar(motivo.trim())
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onCancelar() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Perda</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Informe o motivo para{' '}
          <span className="font-medium">"{deal.titulo}"</span> ser marcada como perdida.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motivo_perda">Motivo da perda</Label>
            <Textarea
              id="motivo_perda"
              value={motivo}
              onChange={(e) => { setMotivo(e.target.value); setErro(null) }}
              rows={3}
              placeholder="Ex: Cliente escolheu concorrente, orçamento acima do esperado..."
              autoFocus
            />
          </div>
          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancelar}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive">
              Registrar Perda
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 3: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 4: Commit**

```bash
cd /Users/danilo/Documents/BOOT-CRM
git add components/pipeline/modal-fechado.tsx components/pipeline/modal-perdido.tsx
git commit -m "feat: adicionar modais de validacao de fechamento e perda de negociacao"
```

---

## Tarefa 6: `ModalNovaNegociacao` — criar deal em uma coluna

**Arquivos:**
- Criar: `components/pipeline/modal-nova-negociacao.tsx`

- [ ] **Passo 1: Criar `components/pipeline/modal-nova-negociacao.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { criarDeal } from '@/app/(dashboard)/pipeline/actions'

type Props = {
  pipelineId: string
  estagioId: string
  estagioNome: string
  aberto: boolean
  onFechar: () => void
}

export function ModalNovaNegociacao({ pipelineId, estagioId, estagioNome, aberto, onFechar }: Props) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    formData.set('pipeline_id', pipelineId)
    formData.set('estagio_id', estagioId)
    setCarregando(true)
    setErro(null)
    try {
      await criarDeal(formData)
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar negociação.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Negociação — {estagioNome}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              name="titulo"
              placeholder="Ex: Proposta de licença anual"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_estimado">Valor estimado (R$)</Label>
            <Input
              id="valor_estimado"
              name="valor_estimado"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_fechamento_prevista">Previsão de fechamento</Label>
            <Input
              id="data_fechamento_prevista"
              name="data_fechamento_prevista"
              type="date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              rows={2}
              placeholder="Detalhes relevantes sobre esta negociação..."
            />
          </div>

          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar Negociação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 3: Commit**

```bash
cd /Users/danilo/Documents/BOOT-CRM
git add components/pipeline/modal-nova-negociacao.tsx
git commit -m "feat: adicionar modal de criacao de negociacao no pipeline"
```

---

## Tarefa 7: `KanbanBoard` — componente principal com DndContext e Realtime

**Arquivos:**
- Criar: `components/pipeline/kanban-board.tsx`

- [ ] **Passo 1: Criar `components/pipeline/kanban-board.tsx`**

```typescript
'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { moverDeal } from '@/app/(dashboard)/pipeline/actions'
import { KanbanColuna } from './kanban-coluna'
import { KanbanCard, type DealCard } from './kanban-card'
import { ModalNovaNegociacao } from './modal-nova-negociacao'
import { ModalFechado } from './modal-fechado'
import { ModalPerdido } from './modal-perdido'
import type { UserRole } from '@/types/database'

type Etapa = {
  id: string
  nome: string
  cor: string
  ordem: number
  tipo_especial: 'fechado' | 'perdido' | null
}

type Props = {
  pipelineId: string
  etapas: Etapa[]
  dealsIniciais: DealCard[]
  cargo: UserRole
}

type PendingFechado = { deal: DealCard; estagioDestinoId: string }
type PendingPerdido = { deal: DealCard; estagioDestinoId: string }
type PendingEstagio = { id: string; nome: string }

const CARGOS_QUE_MOVEM: UserRole[] = ['admin', 'gestor', 'vendedor']
const CARGOS_QUE_CRIAM: UserRole[] = ['admin', 'gestor', 'vendedor']

type RealtimeDealPayload = {
  id: string
  estagio_id: string
  valor_estimado: number | null
  ganho: boolean | null
  motivo_perda: string | null
  titulo: string
  pipeline_id: string
}

export function KanbanBoard({ pipelineId, etapas, dealsIniciais, cargo }: Props) {
  const [deals, setDeals] = useState<DealCard[]>(dealsIniciais)
  const [dealArrastando, setDealArrastando] = useState<DealCard | null>(null)
  const [pendingFechado, setPendingFechado] = useState<PendingFechado | null>(null)
  const [pendingPerdido, setPendingPerdido] = useState<PendingPerdido | null>(null)
  const [novaNegoEstagio, setNovaNegoEstagio] = useState<PendingEstagio | null>(null)

  const podeArrastar = CARGOS_QUE_MOVEM.includes(cargo)
  const podeCriar = CARGOS_QUE_CRIAM.includes(cargo)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Supabase Realtime — sincroniza deals de outros usuários
  useEffect(() => {
    const supabase = createClient()
    const canal = supabase
      .channel(`pipeline:${pipelineId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deals',
          filter: `pipeline_id=eq.${pipelineId}`,
        },
        (payload) => {
          const atualizado = payload.new as RealtimeDealPayload
          setDeals((prev) =>
            prev.map((d) =>
              d.id === atualizado.id
                ? {
                    ...d,
                    estagio_id: atualizado.estagio_id,
                    valor_estimado: atualizado.valor_estimado,
                    ganho: atualizado.ganho,
                    motivo_perda: atualizado.motivo_perda,
                    titulo: atualizado.titulo,
                  }
                : d
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deals',
          filter: `pipeline_id=eq.${pipelineId}`,
        },
        (payload) => {
          const novo = payload.new as RealtimeDealPayload
          setDeals((prev) => {
            if (prev.some((d) => d.id === novo.id)) return prev
            return [
              ...prev,
              {
                id: novo.id,
                titulo: novo.titulo,
                estagio_id: novo.estagio_id,
                valor_estimado: novo.valor_estimado,
                ganho: novo.ganho,
                motivo_perda: novo.motivo_perda,
                data_fechamento_prevista: null,
                contato: null,
                responsavel: null,
              },
            ]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [pipelineId])

  function onDragStart(event: DragStartEvent) {
    const deal = event.active.data.current?.deal as DealCard | undefined
    setDealArrastando(deal ?? null)
  }

  function onDragEnd(event: DragEndEvent) {
    setDealArrastando(null)
    const { active, over } = event
    if (!over) return

    const dealId = active.id as string
    const estagioDestinoId = over.id as string
    const deal = active.data.current?.deal as DealCard

    if (estagioDestinoId === deal.estagio_id) return

    const etapaDestino = etapas.find((e) => e.id === estagioDestinoId)
    if (!etapaDestino) return

    if (etapaDestino.tipo_especial === 'fechado' && !deal.valor_estimado) {
      setPendingFechado({ deal, estagioDestinoId })
      return
    }

    if (etapaDestino.tipo_especial === 'perdido') {
      setPendingPerdido({ deal, estagioDestinoId })
      return
    }

    executarMover(dealId, estagioDestinoId, deal.estagio_id)
  }

  function executarMover(
    dealId: string,
    estagioDestinoId: string,
    estagioAtualId: string,
    extras: { valor_estimado?: number; motivo_perda?: string } = {}
  ) {
    // Atualização otimista
    setDeals((prev) =>
      prev.map((d) =>
        d.id === dealId
          ? {
              ...d,
              estagio_id: estagioDestinoId,
              ...(extras.valor_estimado !== undefined ? { valor_estimado: extras.valor_estimado } : {}),
              ...(extras.motivo_perda !== undefined ? { motivo_perda: extras.motivo_perda } : {}),
            }
          : d
      )
    )

    moverDeal(dealId, estagioDestinoId, extras).catch(() => {
      // Reverter em caso de erro
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, estagio_id: estagioAtualId } : d))
      )
    })
  }

  function confirmarFechado(valorEstimado: number) {
    if (!pendingFechado) return
    const { deal, estagioDestinoId } = pendingFechado
    setPendingFechado(null)
    executarMover(deal.id, estagioDestinoId, deal.estagio_id, { valor_estimado: valorEstimado })
  }

  function confirmarPerdido(motivoPerda: string) {
    if (!pendingPerdido) return
    const { deal, estagioDestinoId } = pendingPerdido
    setPendingPerdido(null)
    executarMover(deal.id, estagioDestinoId, deal.estagio_id, { motivo_perda: motivoPerda })
  }

  const colunas = etapas.map((etapa) => ({
    ...etapa,
    deals: deals.filter((d) => d.estagio_id === etapa.id),
  }))

  return (
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6 h-full">
          {colunas.map((col) => (
            <KanbanColuna
              key={col.id}
              etapa={col}
              deals={col.deals}
              podeArrastar={podeArrastar}
              podeCriar={podeCriar}
              onNovaNegociacao={(estagioId) => {
                const etapa = etapas.find((e) => e.id === estagioId)
                if (etapa) setNovaNegoEstagio({ id: estagioId, nome: etapa.nome })
              }}
            />
          ))}
        </div>

        <DragOverlay>
          {dealArrastando ? (
            <div className="rotate-2 opacity-90">
              <KanbanCard deal={dealArrastando} podeArrastar={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {novaNegoEstagio && (
        <ModalNovaNegociacao
          pipelineId={pipelineId}
          estagioId={novaNegoEstagio.id}
          estagioNome={novaNegoEstagio.nome}
          aberto={true}
          onFechar={() => setNovaNegoEstagio(null)}
        />
      )}

      {pendingFechado && (
        <ModalFechado
          deal={pendingFechado.deal}
          aberto={true}
          onConfirmar={confirmarFechado}
          onCancelar={() => setPendingFechado(null)}
        />
      )}

      {pendingPerdido && (
        <ModalPerdido
          deal={pendingPerdido.deal}
          aberto={true}
          onConfirmar={confirmarPerdido}
          onCancelar={() => setPendingPerdido(null)}
        />
      )}
    </>
  )
}
```

- [ ] **Passo 2: Habilitar Realtime para a tabela `deals` no Supabase**

No painel do Supabase:
1. Ir em **Database** → **Replication**
2. Encontrar a tabela `deals`
3. Habilitar **INSERT** e **UPDATE** na coluna Realtime
4. Salvar

(Sem este passo, a subscrição não recebe eventos — o Kanban carregará dados iniciais mas não atualizará em tempo real)

- [ ] **Passo 3: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 4: Commit**

```bash
cd /Users/danilo/Documents/BOOT-CRM
git add components/pipeline/kanban-board.tsx
git commit -m "feat: adicionar KanbanBoard com DndContext e Supabase Realtime"
```

---

## Tarefa 8: Página `/pipeline`

**Arquivos:**
- Criar: `app/(dashboard)/pipeline/page.tsx`

- [ ] **Passo 1: Criar `app/(dashboard)/pipeline/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import type { UserRole } from '@/types/database'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (!['admin', 'gestor', 'vendedor'].includes(perfil.cargo)) redirect('/painel')

  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('padrao', true)
    .single()

  if (!pipeline) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Nenhum pipeline configurado.
      </div>
    )
  }

  const { data: etapas } = await supabase
    .from('pipeline_stages')
    .select('id, nome, cor, ordem, tipo_especial')
    .eq('pipeline_id', pipeline.id)
    .eq('oculto', false)
    .order('ordem')

  // Vendedor vê apenas os próprios deals
  let dealsQuery = supabase
    .from('deals')
    .select(`
      id,
      titulo,
      valor_estimado,
      estagio_id,
      ganho,
      motivo_perda,
      data_fechamento_prevista,
      contato:contato_id(id, nome),
      responsavel:responsavel_id(id, nome)
    `)
    .eq('pipeline_id', pipeline.id)
    .eq('organization_id', perfil.organization_id)
    .is('ganho', null)   // exclui fechados e perdidos da view principal

  if (perfil.cargo === 'vendedor') {
    dealsQuery = dealsQuery.eq('responsavel_id', perfil.id)
  }

  const { data: dealsRaw } = await dealsQuery

  const deals = (dealsRaw ?? []).map((d) => ({
    id: d.id as string,
    titulo: d.titulo as string,
    valor_estimado: d.valor_estimado as number | null,
    estagio_id: d.estagio_id as string,
    ganho: d.ganho as boolean | null,
    motivo_perda: d.motivo_perda as string | null,
    data_fechamento_prevista: d.data_fechamento_prevista as string | null,
    contato: d.contato as { id: string; nome: string } | null,
    responsavel: d.responsavel as { id: string; nome: string } | null,
  }))

  const podeEditarEtapas = perfil.cargo === 'admin' || perfil.cargo === 'gestor'

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline de Vendas</h1>
          <p className="mt-0.5 text-sm text-slate-500">{pipeline.nome}</p>
        </div>
        {podeEditarEtapas && (
          <Link
            href="/pipeline/configurar"
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" />
            Configurar etapas
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          pipelineId={pipeline.id}
          etapas={etapas ?? []}
          dealsIniciais={deals}
          cargo={perfil.cargo as UserRole}
        />
      </div>
    </div>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 3: Testar no browser**

```bash
npm run dev
```

1. Acessar `http://localhost:3000/pipeline`
2. O quadro Kanban deve aparecer com as 7 colunas (sem os deals "Fechado" e "Perdido" que têm `ganho IS NULL`)
3. Clicar em `+` em qualquer coluna → modal abre
4. Criar uma negociação → card aparece na coluna
5. Arrastar o card para outra coluna → move (com atualização no banco)
6. Arrastar para "Perdido" → modal de motivo aparece
7. Parar o servidor

- [ ] **Passo 4: Commit**

```bash
cd /Users/danilo/Documents/BOOT-CRM
git add "app/(dashboard)/pipeline/page.tsx"
git commit -m "feat: criar pagina do pipeline Kanban com drag-and-drop"
```

---

## Tarefa 9: Configuração de etapas — actions, form e página

**Arquivos:**
- Criar: `app/(dashboard)/pipeline/configurar/actions.ts`
- Criar: `components/pipeline/form-etapas.tsx`
- Criar: `app/(dashboard)/pipeline/configurar/page.tsx`

- [ ] **Passo 1: Criar `app/(dashboard)/pipeline/configurar/actions.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAdminOuGestor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') redirect('/painel')

  return { supabase, perfil }
}

async function getMaxOrdem(supabase: Awaited<ReturnType<typeof createClient>>, pipelineId: string): Promise<number> {
  const { data } = await supabase
    .from('pipeline_stages')
    .select('ordem')
    .eq('pipeline_id', pipelineId)
    .order('ordem', { ascending: false })
    .limit(1)
    .single()

  return data?.ordem ?? 0
}

export async function adicionarEtapa(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = (formData.get('nome') as string)?.trim()
  const cor = (formData.get('cor') as string) ?? '#6366f1'
  const pipeline_id = formData.get('pipeline_id') as string

  if (!nome) throw new Error('Nome da etapa é obrigatório.')
  if (!pipeline_id) throw new Error('Pipeline não identificado.')

  const maxOrdem = await getMaxOrdem(supabase, pipeline_id)

  const { error } = await supabase.from('pipeline_stages').insert({
    organization_id: perfil.organization_id,
    pipeline_id,
    nome,
    cor,
    ordem: maxOrdem + 1,
    oculto: false,
  })

  if (error) throw new Error(`Erro ao adicionar etapa: ${error.message}`)

  revalidatePath('/pipeline')
  revalidatePath('/pipeline/configurar')
}

export async function renomearEtapa(estagioId: string, novoNome: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = novoNome.trim()
  if (!nome) throw new Error('Nome não pode estar vazio.')

  const { error } = await supabase
    .from('pipeline_stages')
    .update({ nome, atualizado_em: new Date().toISOString() })
    .eq('id', estagioId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao renomear etapa: ${error.message}`)

  revalidatePath('/pipeline')
  revalidatePath('/pipeline/configurar')
}

export async function alterarCorEtapa(estagioId: string, novaCor: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { error } = await supabase
    .from('pipeline_stages')
    .update({ cor: novaCor, atualizado_em: new Date().toISOString() })
    .eq('id', estagioId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao alterar cor: ${error.message}`)

  revalidatePath('/pipeline')
  revalidatePath('/pipeline/configurar')
}

export async function alternarOculto(estagioId: string, oculto: boolean) {
  const { supabase, perfil } = await getAdminOuGestor()

  const { error } = await supabase
    .from('pipeline_stages')
    .update({ oculto, atualizado_em: new Date().toISOString() })
    .eq('id', estagioId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao alterar visibilidade: ${error.message}`)

  revalidatePath('/pipeline')
  revalidatePath('/pipeline/configurar')
}

export async function moverEtapa(estagioId: string, direcao: 'cima' | 'baixo') {
  const { supabase, perfil } = await getAdminOuGestor()

  const { data: etapa } = await supabase
    .from('pipeline_stages')
    .select('id, ordem, pipeline_id')
    .eq('id', estagioId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!etapa) throw new Error('Etapa não encontrada.')

  const ordemAlvo = direcao === 'cima' ? etapa.ordem - 1 : etapa.ordem + 1

  const { data: vizinha } = await supabase
    .from('pipeline_stages')
    .select('id, ordem')
    .eq('pipeline_id', etapa.pipeline_id)
    .eq('organization_id', perfil.organization_id)
    .eq('ordem', ordemAlvo)
    .single()

  if (!vizinha) return // já é primeiro ou último

  // Trocar ordens
  await supabase
    .from('pipeline_stages')
    .update({ ordem: ordemAlvo, atualizado_em: new Date().toISOString() })
    .eq('id', estagioId)

  await supabase
    .from('pipeline_stages')
    .update({ ordem: etapa.ordem, atualizado_em: new Date().toISOString() })
    .eq('id', vizinha.id)

  revalidatePath('/pipeline')
  revalidatePath('/pipeline/configurar')
}

export async function excluirEtapa(estagioId: string, estagioDestinoId: string | null) {
  const { supabase, perfil } = await getAdminOuGestor()

  // Verificar se há deals nesta etapa
  const { count } = await supabase
    .from('deals')
    .select('id', { count: 'exact', head: true })
    .eq('estagio_id', estagioId)
    .eq('organization_id', perfil.organization_id)

  if ((count ?? 0) > 0) {
    if (!estagioDestinoId) {
      throw new Error(`Esta etapa possui ${count} negociação(ões). Informe a etapa de destino para migrá-las.`)
    }
    // Migrar deals para o destino
    const { error: errMigrar } = await supabase
      .from('deals')
      .update({ estagio_id: estagioDestinoId, atualizado_em: new Date().toISOString() })
      .eq('estagio_id', estagioId)
      .eq('organization_id', perfil.organization_id)

    if (errMigrar) throw new Error(`Erro ao migrar negociações: ${errMigrar.message}`)
  }

  const { error } = await supabase
    .from('pipeline_stages')
    .delete()
    .eq('id', estagioId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir etapa: ${error.message}`)

  revalidatePath('/pipeline')
  revalidatePath('/pipeline/configurar')
}
```

- [ ] **Passo 2: Criar `components/pipeline/form-etapas.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  renomearEtapa,
  alterarCorEtapa,
  alternarOculto,
  moverEtapa,
  excluirEtapa,
  adicionarEtapa,
} from '@/app/(dashboard)/pipeline/configurar/actions'
import { ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Plus } from 'lucide-react'

type Etapa = {
  id: string
  nome: string
  cor: string
  ordem: number
  oculto: boolean
  tipo_especial: 'fechado' | 'perdido' | null
}

type Props = {
  etapas: Etapa[]
  pipelineId: string
}

export function FormEtapas({ etapas: etapasIniciais, pipelineId }: Props) {
  const [etapas, setEtapas] = useState<Etapa[]>(etapasIniciais)
  const [editandoNome, setEditandoNome] = useState<string | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [excluindo, setExcluindo] = useState<string | null>(null)
  const [destinoExclusao, setDestinoExclusao] = useState('')
  const [novaEtapaNome, setNovaEtapaNome] = useState('')
  const [novaEtapaCor, setNovaEtapaCor] = useState('#6366f1')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleRenomear(estagioId: string) {
    if (!novoNome.trim()) return
    setCarregando(true)
    setErro(null)
    try {
      await renomearEtapa(estagioId, novoNome.trim())
      setEtapas((prev) =>
        prev.map((e) => (e.id === estagioId ? { ...e, nome: novoNome.trim() } : e))
      )
      setEditandoNome(null)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao renomear.')
    } finally {
      setCarregando(false)
    }
  }

  async function handleAlterarCor(estagioId: string, cor: string) {
    setEtapas((prev) => prev.map((e) => (e.id === estagioId ? { ...e, cor } : e)))
    try {
      await alterarCorEtapa(estagioId, cor)
    } catch {
      // silencioso — a cor visual já foi atualizada otimisticamente
    }
  }

  async function handleAlternarOculto(estagioId: string, ocultoAtual: boolean) {
    setCarregando(true)
    setErro(null)
    try {
      await alternarOculto(estagioId, !ocultoAtual)
      setEtapas((prev) =>
        prev.map((e) => (e.id === estagioId ? { ...e, oculto: !ocultoAtual } : e))
      )
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao alterar visibilidade.')
    } finally {
      setCarregando(false)
    }
  }

  async function handleMover(estagioId: string, direcao: 'cima' | 'baixo') {
    setCarregando(true)
    setErro(null)
    try {
      await moverEtapa(estagioId, direcao)
      setEtapas((prev) => {
        const sorted = [...prev].sort((a, b) => a.ordem - b.ordem)
        const idx = sorted.findIndex((e) => e.id === estagioId)
        if (idx < 0) return prev
        const swapIdx = direcao === 'cima' ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= sorted.length) return prev
        const novaOrdem = sorted[swapIdx].ordem
        const ordemAtual = sorted[idx].ordem
        return prev.map((e) => {
          if (e.id === estagioId) return { ...e, ordem: novaOrdem }
          if (e.id === sorted[swapIdx].id) return { ...e, ordem: ordemAtual }
          return e
        })
      })
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao reordenar.')
    } finally {
      setCarregando(false)
    }
  }

  async function handleExcluir(estagioId: string) {
    setCarregando(true)
    setErro(null)
    try {
      await excluirEtapa(estagioId, destinoExclusao || null)
      setEtapas((prev) => prev.filter((e) => e.id !== estagioId))
      setExcluindo(null)
      setDestinoExclusao('')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir etapa.')
    } finally {
      setCarregando(false)
    }
  }

  async function handleAdicionarEtapa(formData: FormData) {
    formData.set('pipeline_id', pipelineId)
    setCarregando(true)
    setErro(null)
    try {
      await adicionarEtapa(formData)
      const novaOrdem = Math.max(...etapas.map((e) => e.ordem), 0) + 1
      setEtapas((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          nome: novaEtapaNome.trim(),
          cor: novaEtapaCor,
          ordem: novaOrdem,
          oculto: false,
          tipo_especial: null,
        },
      ])
      setNovaEtapaNome('')
      setNovaEtapaCor('#6366f1')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao adicionar etapa.')
    } finally {
      setCarregando(false)
    }
  }

  const etapasOrdenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
  const etapasParaDestino = etapas.filter((e) => e.id !== excluindo)

  return (
    <div className="space-y-6">
      {erro && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      )}

      {/* Lista de etapas */}
      <div className="space-y-2">
        {etapasOrdenadas.map((etapa, idx) => (
          <div
            key={etapa.id}
            className="flex items-center gap-3 rounded-lg border bg-white p-3"
          >
            {/* Cor */}
            <input
              type="color"
              value={etapa.cor}
              onChange={(e) => handleAlterarCor(etapa.id, e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border-0 p-0"
              title="Alterar cor"
            />

            {/* Nome */}
            {editandoNome === etapa.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenomear(etapa.id)
                    if (e.key === 'Escape') setEditandoNome(null)
                  }}
                />
                <Button size="sm" onClick={() => handleRenomear(etapa.id)} disabled={carregando}>
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditandoNome(null)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <button
                className="flex-1 text-left text-sm font-medium text-slate-800 hover:text-slate-600"
                onClick={() => { setEditandoNome(etapa.id); setNovoNome(etapa.nome) }}
                title="Clique para renomear"
              >
                {etapa.nome}
                {etapa.tipo_especial && (
                  <span className="ml-2 text-xs text-slate-400">({etapa.tipo_especial})</span>
                )}
              </button>
            )}

            {/* Ações */}
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleMover(etapa.id, 'cima')}
                disabled={idx === 0 || carregando}
                title="Mover para cima"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleMover(etapa.id, 'baixo')}
                disabled={idx === etapasOrdenadas.length - 1 || carregando}
                title="Mover para baixo"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleAlternarOculto(etapa.id, etapa.oculto)}
                disabled={carregando}
                title={etapa.oculto ? 'Mostrar etapa' : 'Ocultar etapa'}
              >
                {etapa.oculto ? (
                  <EyeOff className="h-4 w-4 text-slate-400" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              {excluindo === etapa.id ? (
                <div className="flex items-center gap-2">
                  {etapasParaDestino.length > 0 && (
                    <Select value={destinoExclusao} onValueChange={setDestinoExclusao}>
                      <SelectTrigger className="h-7 w-44 text-xs">
                        <SelectValue placeholder="Mover cards para..." />
                      </SelectTrigger>
                      <SelectContent>
                        {etapasParaDestino.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleExcluir(etapa.id)}
                    disabled={carregando}
                  >
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setExcluindo(null); setDestinoExclusao('') }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-600"
                  onClick={() => setExcluindo(etapa.id)}
                  title="Excluir etapa"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Adicionar nova etapa */}
      <div className="rounded-lg border bg-slate-50 p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Adicionar nova etapa</p>
        <form action={handleAdicionarEtapa} className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="nome_nova_etapa" className="text-xs">Nome</Label>
            <Input
              id="nome_nova_etapa"
              name="nome"
              value={novaEtapaNome}
              onChange={(e) => setNovaEtapaNome(e.target.value)}
              placeholder="Ex: Em Negociação"
              className="h-8"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cor</Label>
            <input
              type="color"
              name="cor"
              value={novaEtapaCor}
              onChange={(e) => setNovaEtapaCor(e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border-0 p-0"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={carregando || !novaEtapaNome.trim()}
          >
            <Plus className="mr-1 h-4 w-4" />
            Adicionar
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Passo 3: Criar `app/(dashboard)/pipeline/configurar/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FormEtapas } from '@/components/pipeline/form-etapas'

export default async function ConfigurarPipelinePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') redirect('/painel')

  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('padrao', true)
    .single()

  if (!pipeline) redirect('/pipeline')

  const { data: etapas } = await supabase
    .from('pipeline_stages')
    .select('id, nome, cor, ordem, oculto, tipo_especial')
    .eq('pipeline_id', pipeline.id)
    .order('ordem')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/pipeline"
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Pipeline
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurar Etapas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie as etapas do pipeline <span className="font-medium">{pipeline.nome}</span>.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <FormEtapas etapas={etapas ?? []} pipelineId={pipeline.id} />
      </div>
    </div>
  )
}
```

- [ ] **Passo 4: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 5: Commit**

```bash
cd /Users/danilo/Documents/BOOT-CRM
git add "app/(dashboard)/pipeline/configurar/actions.ts" \
        components/pipeline/form-etapas.tsx \
        "app/(dashboard)/pipeline/configurar/page.tsx"
git commit -m "feat: criar pagina de configuracao de etapas do pipeline"
```

---

## Verificação Final da Fase 4

- [ ] Quadro Kanban aparece com todas as etapas não ocultas
- [ ] Clicar em `+` em uma coluna abre o modal de nova negociação
- [ ] Criar uma negociação adiciona o card na coluna correta
- [ ] Arrastar card entre colunas funciona (toque visual + banco atualizado)
- [ ] Arrastar para "Perdido" abre modal de motivo (obrigatório)
- [ ] Arrastar para "Fechado" sem valor_estimado abre modal para informar valor
- [ ] Arrastar para "Fechado" com valor_estimado já preenchido move diretamente
- [ ] DragOverlay mostra card ligeiramente rotacionado durante o drag
- [ ] Vendedor vê apenas as próprias negociações
- [ ] Atendimento não pode arrastar cards (sem cursor-grab)
- [ ] Link "Configurar etapas" visível apenas para admin e gestor
- [ ] `/pipeline/configurar` lista todas as etapas com cor, ordem, visibilidade
- [ ] Clicar no nome da etapa permite renomear (Enter salva, Escape cancela)
- [ ] Botão de cor altera em tempo real (otimista) e persiste no banco
- [ ] Mover etapa cima/baixo reordena
- [ ] Ocultar etapa a remove do Kanban principal
- [ ] Excluir etapa com cards exige etapa de destino
- [ ] TypeScript: zero erros em todo o projeto

---

## Próximas Fases

| Fase | Plano |
|---|---|
| **Fase 5** | `2026-05-11-fase-5-tarefas.md` — Tarefas e follow-ups |
| **Fase 6** | `2026-05-11-fase-6-whatsapp.md` — WhatsApp via Evolution API |

---

*Plano criado em 11/05/2026. Spec de referência: `docs/superpowers/specs/2026-05-09-boot-crm-design.md`*
