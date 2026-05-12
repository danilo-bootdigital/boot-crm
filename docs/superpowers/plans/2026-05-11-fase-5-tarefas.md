# Fase 5 — Tarefas e Follow-ups

> **Para agentes autônomos:** SUB-SKILL OBRIGATÓRIA: Use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar este plano tarefa a tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Objetivo:** Criar o módulo de tarefas e follow-ups — listagem com filtros, cards com alerta vermelho para tarefas vencidas, criação vinculada a leads/contatos/negociações, e sugestão de próximo follow-up ao concluir uma tarefa.

**Arquitetura:** A página `/tarefas` é Server Component que carrega as tarefas visíveis para o usuário (vendedor vê só as próprias; admin/gestor veem todas da organização). `ListaTarefas` (Client Component) filtra por tab no cliente e gerencia o estado de conclusão e o modal de próximo follow-up. `ModalNovaTarefa` pode ser chamado de qualquer página passando IDs opcionais de lead/contato/deal. A tabela `tasks` já existe no banco — **não há migration nesta fase**.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Tailwind CSS v4 · shadcn/ui · Supabase SSR

---

## ATENÇÕES CRÍTICAS PARA O IMPLEMENTADOR

1. **`createClient()` é async no servidor** — sempre `await createClient()`.
2. **Tabela `tasks` já existe** — não criar migration, não alterar schema.
3. **`data_vencimento` é `timestamptz`** — comparar com `new Date()` para checar atraso; input HTML usa `YYYY-MM-DD`, converter para ISO ao salvar.
4. **Sem `any`** — usar `unknown` em catch blocks.
5. **Interface 100% em português** — zero palavras em inglês visíveis ao usuário.
6. **Vendedor vê apenas as próprias tarefas** — filtrar no servidor com `.eq('responsavel_id', perfil.id)` quando `cargo === 'vendedor'`.
7. **`TaskTipo`** já existe em `types/database.ts`: `'ligacao' | 'email' | 'reuniao' | 'whatsapp'`.

---

## Estrutura de Arquivos

```
app/(dashboard)/tarefas/
  page.tsx                                    # CRIAR: Server Component — carrega tarefas
  actions.ts                                  # CRIAR: criarTarefa, concluirTarefa, reabrirTarefa, excluirTarefa

components/tarefas/
  card-tarefa.tsx                             # CRIAR: card com alerta de vencimento + toggle
  modal-nova-tarefa.tsx                       # CRIAR: criar tarefa (aceita lead/contato/deal opcional)
  modal-proximo-follow-up.tsx                 # CRIAR: sugestão de próximo follow-up
  lista-tarefas.tsx                           # CRIAR: Client Component com filtros e estado

components/shared/
  timeline-atividades.tsx                     # MODIFICAR: adicionar dealId + ícones de deal/tarefa

app/(dashboard)/leads/[id]/
  page.tsx                                    # MODIFICAR: adicionar seção de tarefas do lead
```

---

## Tarefa 1: Server Actions de tarefas

**Arquivos:**
- Criar: `app/(dashboard)/tarefas/actions.ts`

- [ ] **Passo 1: Criar `app/(dashboard)/tarefas/actions.ts`**

Verificar se o diretório existe:
```bash
ls /Users/danilo/Documents/BOOT-CRM/app/\(dashboard\)/tarefas/ 2>/dev/null || mkdir -p /Users/danilo/Documents/BOOT-CRM/app/\(dashboard\)/tarefas
```

Conteúdo de `app/(dashboard)/tarefas/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TaskTipo } from '@/types/database'

async function getUsuarioEOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  return { supabase, perfil }
}

export async function criarTarefa(formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const titulo = (formData.get('titulo') as string)?.trim()
  const tipo = formData.get('tipo') as TaskTipo
  const descricao = (formData.get('descricao') as string | null)?.trim() || null
  const dataVencimentoRaw = formData.get('data_vencimento') as string | null
  const responsavel_id_form = formData.get('responsavel_id') as string | null
  const lead_id = formData.get('lead_id') as string | null
  const contato_id = formData.get('contato_id') as string | null
  const deal_id = formData.get('deal_id') as string | null

  if (!titulo) throw new Error('Título é obrigatório.')
  if (!['ligacao', 'email', 'reuniao', 'whatsapp'].includes(tipo)) {
    throw new Error('Tipo de tarefa inválido.')
  }

  const data_vencimento = dataVencimentoRaw
    ? new Date(dataVencimentoRaw + 'T12:00:00').toISOString()
    : null

  // Vendedor só cria para si mesmo
  const responsavel_id =
    perfil.cargo === 'vendedor' || perfil.cargo === 'atendimento'
      ? perfil.id
      : (responsavel_id_form || perfil.id)

  const { data: tarefa, error } = await supabase
    .from('tasks')
    .insert({
      organization_id: perfil.organization_id,
      titulo,
      tipo,
      descricao,
      data_vencimento,
      concluida: false,
      responsavel_id,
      lead_id: lead_id || null,
      contato_id: contato_id || null,
      deal_id: deal_id || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar tarefa: ${error.message}`)

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'tarefa_criada',
    descricao: `Tarefa "${titulo}" criada (${tipo}).`,
    lead_id: lead_id || null,
    contato_id: contato_id || null,
    deal_id: deal_id || null,
  })

  revalidatePath('/tarefas')
  if (lead_id) revalidatePath(`/leads/${lead_id}`)
  if (contato_id) revalidatePath(`/contatos/${contato_id}`)
  if (deal_id) revalidatePath('/pipeline')
}

export async function concluirTarefa(tarefaId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: tarefa } = await supabase
    .from('tasks')
    .select('id, titulo, tipo, responsavel_id, lead_id, contato_id, deal_id')
    .eq('id', tarefaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!tarefa) throw new Error('Tarefa não encontrada.')

  if (perfil.cargo === 'vendedor' && tarefa.responsavel_id !== perfil.id) {
    throw new Error('Você não tem permissão para concluir esta tarefa.')
  }

  const { error } = await supabase
    .from('tasks')
    .update({ concluida: true, atualizado_em: new Date().toISOString() })
    .eq('id', tarefaId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao concluir tarefa: ${error.message}`)

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'tarefa_concluida',
    descricao: `Tarefa "${tarefa.titulo}" concluída.`,
    lead_id: tarefa.lead_id,
    contato_id: tarefa.contato_id,
    deal_id: tarefa.deal_id,
  })

  revalidatePath('/tarefas')
  if (tarefa.lead_id) revalidatePath(`/leads/${tarefa.lead_id}`)
  if (tarefa.contato_id) revalidatePath(`/contatos/${tarefa.contato_id}`)
}

export async function reabrirTarefa(tarefaId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: tarefa } = await supabase
    .from('tasks')
    .select('id, responsavel_id')
    .eq('id', tarefaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!tarefa) throw new Error('Tarefa não encontrada.')

  if (perfil.cargo === 'vendedor' && tarefa.responsavel_id !== perfil.id) {
    throw new Error('Você não tem permissão para reabrir esta tarefa.')
  }

  const { error } = await supabase
    .from('tasks')
    .update({ concluida: false, atualizado_em: new Date().toISOString() })
    .eq('id', tarefaId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao reabrir tarefa: ${error.message}`)

  revalidatePath('/tarefas')
}

export async function excluirTarefa(tarefaId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: tarefa } = await supabase
    .from('tasks')
    .select('id, responsavel_id, lead_id, contato_id, deal_id')
    .eq('id', tarefaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!tarefa) throw new Error('Tarefa não encontrada.')

  const podeExcluir =
    ['admin', 'gestor'].includes(perfil.cargo) || tarefa.responsavel_id === perfil.id

  if (!podeExcluir) throw new Error('Você não tem permissão para excluir esta tarefa.')

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', tarefaId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir tarefa: ${error.message}`)

  revalidatePath('/tarefas')
  if (tarefa.lead_id) revalidatePath(`/leads/${tarefa.lead_id}`)
  if (tarefa.contato_id) revalidatePath(`/contatos/${tarefa.contato_id}`)
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
git add "app/(dashboard)/tarefas/actions.ts"
git commit -m "feat: adicionar server actions de tarefas"
```

---

## Tarefa 2: `CardTarefa` — card com alerta de vencimento

**Arquivos:**
- Criar: `components/tarefas/card-tarefa.tsx`

- [ ] **Passo 1: Criar a pasta e o arquivo**

```bash
mkdir -p /Users/danilo/Documents/BOOT-CRM/components/tarefas
```

Criar `components/tarefas/card-tarefa.tsx`:

```typescript
'use client'

import { cn } from '@/lib/utils'
import { format, isPast, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Phone, Mail, Users, MessageCircle, Calendar, Trash2, RotateCcw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TaskTipo } from '@/types/database'

export type TarefaCard = {
  id: string
  titulo: string
  descricao: string | null
  tipo: TaskTipo
  data_vencimento: string | null
  concluida: boolean
  responsavel: { id: string; nome: string } | null
  lead_id: string | null
  contato_id: string | null
  deal_id: string | null
}

const ICONES_TIPO: Record<TaskTipo, React.ReactNode> = {
  ligacao: <Phone className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  reuniao: <Users className="h-3.5 w-3.5" />,
  whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
}

const LABELS_TIPO: Record<TaskTipo, string> = {
  ligacao: 'Ligação',
  email: 'E-mail',
  reuniao: 'Reunião',
  whatsapp: 'WhatsApp',
}

type Props = {
  tarefa: TarefaCard
  onConcluir: (tarefa: TarefaCard) => void
  onReabrir: (tarefaId: string) => void
  onExcluir: (tarefaId: string) => void
  carregando?: boolean
}

export function CardTarefa({ tarefa, onConcluir, onReabrir, onExcluir, carregando }: Props) {
  const vencimento = tarefa.data_vencimento ? new Date(tarefa.data_vencimento) : null
  const atrasada = !tarefa.concluida && vencimento !== null && isPast(vencimento) && !isToday(vencimento)
  const hoje = !tarefa.concluida && vencimento !== null && isToday(vencimento)

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-white p-3 transition-colors',
        tarefa.concluida && 'opacity-60',
        atrasada && 'border-red-200 bg-red-50',
        hoje && 'border-amber-200 bg-amber-50',
      )}
    >
      {/* Ícone do tipo */}
      <div
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
          tarefa.concluida ? 'bg-slate-100 text-slate-400' :
          atrasada ? 'bg-red-100 text-red-600' :
          hoje ? 'bg-amber-100 text-amber-600' :
          'bg-slate-100 text-slate-600',
        )}
      >
        {ICONES_TIPO[tarefa.tipo]}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            tarefa.concluida ? 'line-through text-slate-400' : 'text-slate-900',
            atrasada && 'text-red-800',
          )}
        >
          {tarefa.titulo}
        </p>

        {tarefa.descricao && (
          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{tarefa.descricao}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              tarefa.concluida ? 'bg-slate-100 text-slate-400' :
              atrasada ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-600',
            )}
          >
            {LABELS_TIPO[tarefa.tipo]}
          </span>

          {vencimento && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                atrasada ? 'font-medium text-red-600' :
                hoje ? 'font-medium text-amber-600' :
                'text-slate-400',
              )}
            >
              <Calendar className="h-3 w-3" />
              {atrasada && 'Atrasada — '}
              {hoje ? 'Hoje' : format(vencimento, 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          )}

          {tarefa.responsavel && (
            <span className="text-xs text-slate-400">
              {tarefa.responsavel.nome.split(' ')[0]}
            </span>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex shrink-0 items-center gap-1">
        {!tarefa.concluida ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-green-600"
            onClick={() => onConcluir(tarefa)}
            disabled={carregando}
            title="Marcar como concluída"
          >
            <Check className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-400 hover:text-slate-600"
            onClick={() => onReabrir(tarefa.id)}
            disabled={carregando}
            title="Reabrir tarefa"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-300 hover:text-red-500"
          onClick={() => onExcluir(tarefa.id)}
          disabled={carregando}
          title="Excluir tarefa"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
git add components/tarefas/card-tarefa.tsx
git commit -m "feat: adicionar componente CardTarefa com alerta de vencimento"
```

---

## Tarefa 3: `ModalNovaTarefa` — criar tarefa

**Arquivos:**
- Criar: `components/tarefas/modal-nova-tarefa.tsx`

- [ ] **Passo 1: Criar `components/tarefas/modal-nova-tarefa.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarTarefa } from '@/app/(dashboard)/tarefas/actions'
import type { TaskTipo, UserRole } from '@/types/database'

type Vendedor = { id: string; nome: string }

type Props = {
  aberto: boolean
  onFechar: () => void
  cargo: UserRole
  vendedores: Vendedor[]
  perfilId: string
  leadId?: string
  contatoId?: string
  dealId?: string
}

const TIPOS_TAREFA: { valor: TaskTipo; label: string }[] = [
  { valor: 'ligacao', label: 'Ligação' },
  { valor: 'email', label: 'E-mail' },
  { valor: 'reuniao', label: 'Reunião' },
  { valor: 'whatsapp', label: 'WhatsApp' },
]

export function ModalNovaTarefa({
  aberto,
  onFechar,
  cargo,
  vendedores,
  perfilId,
  leadId,
  contatoId,
  dealId,
}: Props) {
  const [tipo, setTipo] = useState<TaskTipo>('ligacao')
  const [responsavelId, setResponsavelId] = useState(perfilId)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const podeEscolherResponsavel = cargo === 'admin' || cargo === 'gestor'

  async function handleSubmit(formData: FormData) {
    formData.set('tipo', tipo)
    if (podeEscolherResponsavel) formData.set('responsavel_id', responsavelId)
    if (leadId) formData.set('lead_id', leadId)
    if (contatoId) formData.set('contato_id', contatoId)
    if (dealId) formData.set('deal_id', dealId)

    setCarregando(true)
    setErro(null)
    try {
      await criarTarefa(formData)
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar tarefa.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo_tarefa">Título *</Label>
            <Input
              id="titulo_tarefa"
              name="titulo"
              placeholder="Ex: Ligar para confirmar reunião"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TaskTipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_TAREFA.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_vencimento_tarefa">Vencimento</Label>
              <Input
                id="data_vencimento_tarefa"
                name="data_vencimento"
                type="date"
              />
            </div>
          </div>

          {podeEscolherResponsavel && vendedores.length > 0 && (
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="descricao_tarefa">Descrição</Label>
            <Textarea
              id="descricao_tarefa"
              name="descricao"
              rows={2}
              placeholder="Detalhes adicionais sobre esta tarefa..."
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
              {carregando ? 'Criando...' : 'Criar Tarefa'}
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
git add components/tarefas/modal-nova-tarefa.tsx
git commit -m "feat: adicionar modal de criacao de tarefa"
```

---

## Tarefa 4: `ModalProximoFollowUp` — sugestão após conclusão

**Arquivos:**
- Criar: `components/tarefas/modal-proximo-follow-up.tsx`

- [ ] **Passo 1: Criar `components/tarefas/modal-proximo-follow-up.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarTarefa } from '@/app/(dashboard)/tarefas/actions'
import type { TaskTipo } from '@/types/database'

type Props = {
  tarefaAnterior: {
    tipo: TaskTipo
    lead_id: string | null
    contato_id: string | null
    deal_id: string | null
    responsavel_id: string
  }
  aberto: boolean
  onFechar: () => void
}

const TIPOS_TAREFA: { valor: TaskTipo; label: string }[] = [
  { valor: 'ligacao', label: 'Ligação' },
  { valor: 'email', label: 'E-mail' },
  { valor: 'reuniao', label: 'Reunião' },
  { valor: 'whatsapp', label: 'WhatsApp' },
]

export function ModalProximoFollowUp({ tarefaAnterior, aberto, onFechar }: Props) {
  const [tipo, setTipo] = useState<TaskTipo>(tarefaAnterior.tipo)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    formData.set('tipo', tipo)
    formData.set('responsavel_id', tarefaAnterior.responsavel_id)
    if (tarefaAnterior.lead_id) formData.set('lead_id', tarefaAnterior.lead_id)
    if (tarefaAnterior.contato_id) formData.set('contato_id', tarefaAnterior.contato_id)
    if (tarefaAnterior.deal_id) formData.set('deal_id', tarefaAnterior.deal_id)

    setCarregando(true)
    setErro(null)
    try {
      await criarTarefa(formData)
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar próximo follow-up.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar próximo follow-up?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          Tarefa concluída! Deseja agendar um próximo contato?
        </p>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo_followup">Título *</Label>
            <Input
              id="titulo_followup"
              name="titulo"
              placeholder="Ex: Retornar ligação"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TaskTipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_TAREFA.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_followup">Vencimento</Label>
              <Input
                id="data_followup"
                name="data_vencimento"
                type="date"
              />
            </div>
          </div>

          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Não, obrigado
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar Follow-up'}
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
git add components/tarefas/modal-proximo-follow-up.tsx
git commit -m "feat: adicionar modal de sugestao de proximo follow-up"
```

---

## Tarefa 5: `ListaTarefas` — Client Component com filtros e estado

**Arquivos:**
- Criar: `components/tarefas/lista-tarefas.tsx`

- [ ] **Passo 1: Criar `components/tarefas/lista-tarefas.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { isPast, isToday } from 'date-fns'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardTarefa, type TarefaCard } from './card-tarefa'
import { ModalNovaTarefa } from './modal-nova-tarefa'
import { ModalProximoFollowUp } from './modal-proximo-follow-up'
import { concluirTarefa, reabrirTarefa, excluirTarefa } from '@/app/(dashboard)/tarefas/actions'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/database'

type Vendedor = { id: string; nome: string }

type Props = {
  tarefas: TarefaCard[]
  cargo: UserRole
  vendedores: Vendedor[]
  perfilId: string
  leadId?: string
  contatoId?: string
  dealId?: string
}

type Aba = 'todas' | 'hoje' | 'atrasadas' | 'concluidas'

const ABAS: { valor: Aba; label: string }[] = [
  { valor: 'todas', label: 'Todas' },
  { valor: 'hoje', label: 'Hoje' },
  { valor: 'atrasadas', label: 'Atrasadas' },
  { valor: 'concluidas', label: 'Concluídas' },
]

type TarefaConcluida = {
  tipo: TarefaCard['tipo']
  lead_id: string | null
  contato_id: string | null
  deal_id: string | null
  responsavel_id: string
}

export function ListaTarefas({
  tarefas,
  cargo,
  vendedores,
  perfilId,
  leadId,
  contatoId,
  dealId,
}: Props) {
  const router = useRouter()
  const [abaAtiva, setAbaAtiva] = useState<Aba>('todas')
  const [modalNova, setModalNova] = useState(false)
  const [tarefaConcluida, setTarefaConcluida] = useState<TarefaConcluida | null>(null)
  const [isPending, startTransition] = useTransition()

  function filtrar(tarefas: TarefaCard[]): TarefaCard[] {
    switch (abaAtiva) {
      case 'hoje':
        return tarefas.filter(
          (t) => !t.concluida && t.data_vencimento && isToday(new Date(t.data_vencimento))
        )
      case 'atrasadas':
        return tarefas.filter(
          (t) =>
            !t.concluida &&
            t.data_vencimento &&
            isPast(new Date(t.data_vencimento)) &&
            !isToday(new Date(t.data_vencimento))
        )
      case 'concluidas':
        return tarefas.filter((t) => t.concluida)
      default:
        return tarefas.filter((t) => !t.concluida)
    }
  }

  function handleConcluir(tarefa: TarefaCard) {
    startTransition(async () => {
      try {
        await concluirTarefa(tarefa.id)
        setTarefaConcluida({
          tipo: tarefa.tipo,
          lead_id: tarefa.lead_id,
          contato_id: tarefa.contato_id,
          deal_id: tarefa.deal_id,
          responsavel_id: perfilId,
        })
        router.refresh()
      } catch {
        // erro silencioso — o servidor não atualizou
      }
    })
  }

  function handleReabrir(tarefaId: string) {
    startTransition(async () => {
      try {
        await reabrirTarefa(tarefaId)
        router.refresh()
      } catch {
        // erro silencioso
      }
    })
  }

  function handleExcluir(tarefaId: string) {
    startTransition(async () => {
      try {
        await excluirTarefa(tarefaId)
        router.refresh()
      } catch {
        // erro silencioso
      }
    })
  }

  const tarefasFiltradas = filtrar(tarefas)

  const contadores: Record<Aba, number> = {
    todas: tarefas.filter((t) => !t.concluida).length,
    hoje: tarefas.filter(
      (t) => !t.concluida && t.data_vencimento && isToday(new Date(t.data_vencimento))
    ).length,
    atrasadas: tarefas.filter(
      (t) =>
        !t.concluida &&
        t.data_vencimento &&
        isPast(new Date(t.data_vencimento)) &&
        !isToday(new Date(t.data_vencimento))
    ).length,
    concluidas: tarefas.filter((t) => t.concluida).length,
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {ABAS.map((aba) => (
            <button
              key={aba.valor}
              onClick={() => setAbaAtiva(aba.valor)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                abaAtiva === aba.valor
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
              )}
            >
              {aba.label}
              {contadores[aba.valor] > 0 && (
                <span
                  className={cn(
                    'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]',
                    abaAtiva === aba.valor
                      ? 'bg-white/20 text-white'
                      : aba.valor === 'atrasadas'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-slate-200 text-slate-600',
                  )}
                >
                  {contadores[aba.valor]}
                </span>
              )}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setModalNova(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Nova tarefa
        </Button>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {tarefasFiltradas.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {abaAtiva === 'concluidas' ? 'Nenhuma tarefa concluída.' :
             abaAtiva === 'atrasadas' ? 'Sem tarefas atrasadas.' :
             abaAtiva === 'hoje' ? 'Nenhuma tarefa para hoje.' :
             'Nenhuma tarefa pendente.'}
          </p>
        ) : (
          tarefasFiltradas.map((tarefa) => (
            <CardTarefa
              key={tarefa.id}
              tarefa={tarefa}
              onConcluir={handleConcluir}
              onReabrir={handleReabrir}
              onExcluir={handleExcluir}
              carregando={isPending}
            />
          ))
        )}
      </div>

      {/* Modais */}
      {modalNova && (
        <ModalNovaTarefa
          aberto={true}
          onFechar={() => { setModalNova(false); router.refresh() }}
          cargo={cargo}
          vendedores={vendedores}
          perfilId={perfilId}
          leadId={leadId}
          contatoId={contatoId}
          dealId={dealId}
        />
      )}

      {tarefaConcluida && (
        <ModalProximoFollowUp
          tarefaAnterior={tarefaConcluida}
          aberto={true}
          onFechar={() => { setTarefaConcluida(null); router.refresh() }}
        />
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
git add components/tarefas/lista-tarefas.tsx
git commit -m "feat: adicionar ListaTarefas com filtros e gerenciamento de estado"
```

---

## Tarefa 6: Página `/tarefas`

**Arquivos:**
- Criar: `app/(dashboard)/tarefas/page.tsx`

- [ ] **Passo 1: Criar `app/(dashboard)/tarefas/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ListaTarefas } from '@/components/tarefas/lista-tarefas'
import type { UserRole } from '@/types/database'

export default async function TarefasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  // Buscar tarefas com join de responsável
  let tarefasQuery = supabase
    .from('tasks')
    .select(`
      id,
      titulo,
      descricao,
      tipo,
      data_vencimento,
      concluida,
      lead_id,
      contato_id,
      deal_id,
      responsavel_id,
      responsavel:profiles!responsavel_id(id, nome)
    `)
    .eq('organization_id', perfil.organization_id)
    .order('concluida', { ascending: true })
    .order('data_vencimento', { ascending: true, nullsFirst: false })

  // Vendedor e atendimento veem apenas as próprias
  if (perfil.cargo === 'vendedor' || perfil.cargo === 'atendimento') {
    tarefasQuery = tarefasQuery.eq('responsavel_id', perfil.id)
  }

  const { data: tarefasRaw } = await tarefasQuery

  const tarefas = (tarefasRaw ?? []).map((t) => ({
    id: t.id as string,
    titulo: t.titulo as string,
    descricao: t.descricao as string | null,
    tipo: t.tipo as 'ligacao' | 'email' | 'reuniao' | 'whatsapp',
    data_vencimento: t.data_vencimento as string | null,
    concluida: t.concluida as boolean,
    lead_id: t.lead_id as string | null,
    contato_id: t.contato_id as string | null,
    deal_id: t.deal_id as string | null,
    responsavel: t.responsavel as { id: string; nome: string } | null,
  }))

  // Admin/gestor podem atribuir tarefas a outros
  let vendedores: { id: string; nome: string }[] = []
  if (perfil.cargo === 'admin' || perfil.cargo === 'gestor') {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('organization_id', perfil.organization_id)
      .eq('ativo', true)
      .in('cargo', ['vendedor', 'atendimento', 'gestor', 'admin'])
      .order('nome')
    vendedores = data ?? []
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tarefas</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Gerencie suas tarefas e follow-ups.
        </p>
      </div>

      <ListaTarefas
        tarefas={tarefas}
        cargo={perfil.cargo as UserRole}
        vendedores={vendedores}
        perfilId={perfil.id}
      />
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
git add "app/(dashboard)/tarefas/page.tsx"
git commit -m "feat: criar pagina de tarefas com filtros e follow-ups"
```

---

## Tarefa 7: Integração na página de detalhe do lead + atualizar TimelineAtividades

**Arquivos:**
- Modificar: `app/(dashboard)/leads/[id]/page.tsx`
- Modificar: `components/shared/timeline-atividades.tsx`

- [ ] **Passo 1: Atualizar `components/shared/timeline-atividades.tsx`**

Adicionar suporte a `dealId` e novos ícones de tipo. Leia o arquivo atual primeiro e aplique as mudanças abaixo:

Localizar:
```typescript
const ICONES_TIPO: Record<string, string> = {
  lead_criado: '✦',
  lead_editado: '✎',
  lead_descartado: '✕',
  lead_convertido: '→',
  responsavel_alterado: '⇄',
  observacao: '✉',
  status_alterado: '◉',
  contato_criado: '✦',
}
```

Substituir por:
```typescript
const ICONES_TIPO: Record<string, string> = {
  lead_criado: '✦',
  lead_editado: '✎',
  lead_descartado: '✕',
  lead_convertido: '→',
  responsavel_alterado: '⇄',
  responsavel_atribuido_automaticamente: '⇄',
  lead_sem_responsavel: '⚠',
  observacao: '✉',
  status_alterado: '◉',
  contato_criado: '✦',
  deal_criado: '✦',
  deal_movido: '→',
  deal_ganho: '★',
  deal_perdido: '✕',
  tarefa_criada: '☐',
  tarefa_concluida: '☑',
}
```

Localizar:
```typescript
type Props = {
  leadId?: string
  contatoId?: string
}
```

Substituir por:
```typescript
type Props = {
  leadId?: string
  contatoId?: string
  dealId?: string
}
```

Localizar:
```typescript
export async function TimelineAtividades({ leadId, contatoId }: Props) {
```

Substituir por:
```typescript
export async function TimelineAtividades({ leadId, contatoId, dealId }: Props) {
```

Localizar:
```typescript
  if (leadId) query = query.eq('lead_id', leadId)
  if (contatoId) query = query.eq('contato_id', contatoId)

  if (!leadId && !contatoId) return (
    <p className="text-sm text-slate-400">Nenhuma atividade disponível.</p>
  )
```

Substituir por:
```typescript
  if (leadId) query = query.eq('lead_id', leadId)
  if (contatoId) query = query.eq('contato_id', contatoId)
  if (dealId) query = query.eq('deal_id', dealId)

  if (!leadId && !contatoId && !dealId) return (
    <p className="text-sm text-slate-400">Nenhuma atividade disponível.</p>
  )
```

- [ ] **Passo 2: Atualizar `app/(dashboard)/leads/[id]/page.tsx`**

Adicionar a seção de tarefas ao lead. Leia o arquivo atual para localizar os pontos exatos de modificação.

Adicionar ao topo dos imports (após os imports existentes). Também adicionar `redirect` ao import de `next/navigation` — o arquivo atual usa `notFound`, precisa também de `redirect`:
```typescript
import { notFound, redirect } from 'next/navigation'
// ...
import { ListaTarefas } from '@/components/tarefas/lista-tarefas'
```

Após buscar o `lead`, adicionar as queries de tarefas e vendedores. Localizar o trecho após `if (!lead) notFound()`:

```typescript
  if (!lead) notFound()
```

Substituir por:
```typescript
  if (!lead) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id')
    .eq('id', user.id)
    .single()

  // Tarefas deste lead
  let tarefasQuery = supabase
    .from('tasks')
    .select(`
      id, titulo, descricao, tipo, data_vencimento, concluida,
      lead_id, contato_id, deal_id, responsavel_id,
      responsavel:profiles!responsavel_id(id, nome)
    `)
    .eq('lead_id', id)
    .eq('organization_id', lead.organization_id)
    .order('concluida', { ascending: true })
    .order('data_vencimento', { ascending: true, nullsFirst: false })

  if (perfilAtual?.cargo === 'vendedor' || perfilAtual?.cargo === 'atendimento') {
    tarefasQuery = tarefasQuery.eq('responsavel_id', perfilAtual.id)
  }

  const { data: tarefasRaw } = await tarefasQuery
  const tarefas = (tarefasRaw ?? []).map((t) => ({
    id: t.id as string,
    titulo: t.titulo as string,
    descricao: t.descricao as string | null,
    tipo: t.tipo as 'ligacao' | 'email' | 'reuniao' | 'whatsapp',
    data_vencimento: t.data_vencimento as string | null,
    concluida: t.concluida as boolean,
    lead_id: t.lead_id as string | null,
    contato_id: t.contato_id as string | null,
    deal_id: t.deal_id as string | null,
    responsavel: t.responsavel as { id: string; nome: string } | null,
  }))

  let vendedores: { id: string; nome: string }[] = []
  if (perfilAtual?.cargo === 'admin' || perfilAtual?.cargo === 'gestor') {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome')
      .eq('organization_id', lead.organization_id)
      .eq('ativo', true)
      .in('cargo', ['vendedor', 'atendimento', 'gestor', 'admin'])
      .order('nome')
    vendedores = data ?? []
  }
```

Adicionar o Card de tarefas antes do Card de histórico de atividades. Localizar:
```typescript
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de atividades</CardTitle>
            </CardHeader>
```

Inserir antes desse bloco:
```typescript
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              {perfilAtual && (
                <ListaTarefas
                  tarefas={tarefas}
                  cargo={perfilAtual.cargo as import('@/types/database').UserRole}
                  vendedores={vendedores}
                  perfilId={perfilAtual.id}
                  leadId={id}
                />
              )}
            </CardContent>
          </Card>

```

- [ ] **Passo 3: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros.

- [ ] **Passo 4: Commit**

```bash
cd /Users/danilo/Documents/BOOT-CRM
git add components/shared/timeline-atividades.tsx \
        "app/(dashboard)/leads/[id]/page.tsx"
git commit -m "feat: adicionar tarefas na pagina do lead e expandir timeline de atividades"
```

---

## Verificação Final da Fase 5

- [ ] Acessar `/tarefas` — página carrega com as abas Todas / Hoje / Atrasadas / Concluídas
- [ ] Clicar em "Nova tarefa" → modal abre com campos tipo, vencimento, descrição
- [ ] Criar tarefa sem vencimento → aparece na aba "Todas"
- [ ] Criar tarefa com data passada → aparece na aba "Atrasadas" com card vermelho
- [ ] Criar tarefa para hoje → aparece na aba "Hoje" com card âmbar
- [ ] Clicar em ✓ (concluir) → modal de próximo follow-up aparece
- [ ] Criar follow-up → aparece na lista; pular → modal fecha
- [ ] Clicar em ↺ (reabrir) em uma tarefa concluída → volta para pendentes
- [ ] Excluir tarefa → some da lista
- [ ] Acessar `/leads/{id}` → seção "Tarefas" aparece com botão "Nova tarefa"
- [ ] Criar tarefa no lead → aparece na seção e na página `/tarefas`
- [ ] Timeline de atividades exibe ícones corretos para `deal_criado`, `tarefa_concluida` etc.
- [ ] TypeScript: zero erros em todo o projeto

---

## Próximas Fases

| Fase | Plano |
|---|---|
| **Fase 6** | `2026-05-11-fase-6-whatsapp.md` — WhatsApp via Evolution API |

---

*Plano criado em 11/05/2026. Spec de referência: `docs/superpowers/specs/2026-05-09-boot-crm-design.md`*
