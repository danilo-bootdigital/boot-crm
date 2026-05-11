# Fase 3 — Distribuição de Leads e Disponibilidade

> **Para agentes autônomos:** SUB-SKILL OBRIGATÓRIA: Use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar este plano tarefa a tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Goal:** Implementar o sistema de distribuição automática de leads (manual, rotativo e por carga de trabalho) com página de configuração acessível a admins e gestores, toggle de disponibilidade no header para vendedores e atendimento, e hub de configurações na raiz `/configuracoes`.

**Architecture:** A lógica de seleção de vendedor fica em `lib/distribuicao.ts`, um módulo puro sem efeitos colaterais de UI. A Server Action `criarLead` em `app/(dashboard)/leads/actions.ts` chama essa função após inserir o lead. A página de configuração é Server Component que lê do banco e renderiza um Client Component de formulário. O toggle de disponibilidade no header é um Client Component separado que usa Server Action e `router.refresh()` para refletir o novo estado.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Tailwind CSS v4 · shadcn/ui com `@base-ui/react` · Supabase SSR

---

## ATENÇÕES CRÍTICAS PARA O IMPLEMENTADOR

1. **`DialogTrigger` usa `render={<Elemento />}`** — NÃO existe `asChild` nesta versão do `@base-ui/react`.
2. **`createClient()` é async no servidor** — sempre `await createClient()` em Server Components e Actions.
3. **Tailwind v4** — não usar `@tailwind base/components/utilities`. CSS já tem `@import "tailwindcss"` em `globals.css`.
4. **Sem `any`** — usar `unknown` em catch blocks. Tipos em `types/database.ts`.
5. **Interface 100% em português** — zero palavras em inglês visíveis ao usuário.
6. **`lead_distribution_config` tem 1 linha por organização** — busca usa `.single()`. Se não existir, `distribuirLead` cria com defaults via upsert.
7. **Roles que podem ser atribuídos a leads:** `vendedor` e `atendimento`.

---

## Estrutura de Arquivos

```
lib/
  distribuicao.ts                                # CRIAR: lógica pura de seleção de vendedor

app/(dashboard)/
  configuracoes/
    page.tsx                                     # CRIAR: hub de links (Usuários, Distribuição)
    distribuicao/
      page.tsx                                   # CRIAR: página de configuração (Server Component)
      actions.ts                                 # CRIAR: salvarConfigDistribuicao + alternarDisponibilidade

components/
  distribuicao/
    form-config-distribuicao.tsx                 # CRIAR: formulário de configuração (Client Component)
    botao-disponibilidade.tsx                    # CRIAR: toggle no header (Client Component)
  layout/
    header.tsx                                   # MODIFICAR: buscar disponivel+cargo, renderizar BotaoDisponibilidade

app/(dashboard)/leads/
  actions.ts                                     # MODIFICAR: chamar distribuirLead após criarLead
```

---

## Tarefa 1: Criar `lib/distribuicao.ts` — módulo de lógica de distribuição

**Arquivos:**
- Criar: `lib/distribuicao.ts`

- [ ] **Passo 1: Criar o arquivo `lib/distribuicao.ts`**

```typescript
import type { createClient } from '@/lib/supabase/server'
import type { DistribuicaoModo } from '@/types/database'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type ConfigDistribuicao = {
  id: string
  modo: DistribuicaoModo
  apenas_disponiveis: boolean
  limite_por_vendedor: number | null
  proximo_vendedor_idx: number
}

type VendedorElegivel = {
  id: string
  nome: string
}

const CARGOS_ELEGÍVEIS = ['vendedor', 'atendimento'] as const

async function buscarConfig(
  supabase: SupabaseClient,
  orgId: string
): Promise<ConfigDistribuicao> {
  const { data } = await supabase
    .from('lead_distribution_config')
    .select('id, modo, apenas_disponiveis, limite_por_vendedor, proximo_vendedor_idx')
    .eq('organization_id', orgId)
    .single()

  if (data) return data

  const { data: nova } = await supabase
    .from('lead_distribution_config')
    .insert({
      organization_id: orgId,
      modo: 'manual',
      apenas_disponiveis: false,
      limite_por_vendedor: null,
      proximo_vendedor_idx: 0,
    })
    .select('id, modo, apenas_disponiveis, limite_por_vendedor, proximo_vendedor_idx')
    .single()

  return nova!
}

async function buscarVendedoresElegiveis(
  supabase: SupabaseClient,
  orgId: string,
  apenasDisponiveis: boolean
): Promise<VendedorElegivel[]> {
  let query = supabase
    .from('profiles')
    .select('id, nome')
    .eq('organization_id', orgId)
    .eq('ativo', true)
    .in('cargo', CARGOS_ELEGÍVEIS)
    .order('id')

  if (apenasDisponiveis) {
    query = query.eq('disponivel', true)
  }

  const { data } = await query
  return data ?? []
}

async function contarLeadsAbertos(
  supabase: SupabaseClient,
  orgId: string,
  vendedorId: string
): Promise<number> {
  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('responsavel_id', vendedorId)
    .in('status', ['novo', 'em_atendimento'])

  return count ?? 0
}

async function filtrarPorLimite(
  supabase: SupabaseClient,
  orgId: string,
  vendedores: VendedorElegivel[],
  limite: number | null
): Promise<VendedorElegivel[]> {
  if (limite === null) return vendedores

  const resultados = await Promise.all(
    vendedores.map(async (v) => ({
      vendedor: v,
      carga: await contarLeadsAbertos(supabase, orgId, v.id),
    }))
  )

  return resultados
    .filter(({ carga }) => carga < limite)
    .map(({ vendedor }) => vendedor)
}

async function selecionarRotativo(
  supabase: SupabaseClient,
  configId: string,
  vendedores: VendedorElegivel[],
  indiceAtual: number
): Promise<VendedorElegivel> {
  const indice = indiceAtual % vendedores.length
  const vendedor = vendedores[indice]

  await supabase
    .from('lead_distribution_config')
    .update({ proximo_vendedor_idx: indiceAtual + 1 })
    .eq('id', configId)

  return vendedor
}

async function selecionarPorCarga(
  supabase: SupabaseClient,
  orgId: string,
  vendedores: VendedorElegivel[]
): Promise<VendedorElegivel> {
  const cargas = await Promise.all(
    vendedores.map(async (v) => ({
      vendedor: v,
      carga: await contarLeadsAbertos(supabase, orgId, v.id),
    }))
  )

  cargas.sort((a, b) => a.carga - b.carga)
  return cargas[0].vendedor
}

export async function distribuirLead(
  supabase: SupabaseClient,
  leadId: string,
  orgId: string,
  autorId: string
): Promise<void> {
  const config = await buscarConfig(supabase, orgId)

  if (config.modo === 'manual') return

  const vendedoresBase = await buscarVendedoresElegiveis(
    supabase,
    orgId,
    config.apenas_disponiveis
  )

  const vendedoresElegiveis = await filtrarPorLimite(
    supabase,
    orgId,
    vendedoresBase,
    config.limite_por_vendedor
  )

  if (vendedoresElegiveis.length === 0) {
    await supabase.from('activities').insert({
      organization_id: orgId,
      autor_id: autorId,
      tipo: 'lead_sem_responsavel',
      descricao: 'Lead criado sem responsável — nenhum vendedor disponível no momento.',
      lead_id: leadId,
    })
    return
  }

  let vendedorSelecionado: VendedorElegivel

  if (config.modo === 'rotativo') {
    vendedorSelecionado = await selecionarRotativo(
      supabase,
      config.id,
      vendedoresElegiveis,
      config.proximo_vendedor_idx
    )
  } else {
    vendedorSelecionado = await selecionarPorCarga(
      supabase,
      orgId,
      vendedoresElegiveis
    )
  }

  await supabase
    .from('leads')
    .update({
      responsavel_id: vendedorSelecionado.id,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', leadId)

  await supabase.from('activities').insert({
    organization_id: orgId,
    autor_id: autorId,
    tipo: 'responsavel_atribuido_automaticamente',
    descricao: `Lead atribuído automaticamente a ${vendedorSelecionado.nome} (modo: ${config.modo}).`,
    lead_id: leadId,
  })
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -40
```

Esperado: sem erros.

- [ ] **Passo 3: Commit**

```bash
git add lib/distribuicao.ts
git commit -m "feat: adicionar modulo de logica de distribuicao de leads"
```

---

## Tarefa 2: Integrar `distribuirLead` na action `criarLead`

**Arquivos:**
- Modificar: `app/(dashboard)/leads/actions.ts`

- [ ] **Passo 1: Adicionar import de `distribuirLead` no topo do arquivo**

Leia `app/(dashboard)/leads/actions.ts`. Após os imports existentes, adicione:

```typescript
import { distribuirLead } from '@/lib/distribuicao'
```

- [ ] **Passo 2: Chamar `distribuirLead` após registrar a atividade `lead_criado`**

Na função `criarLead`, logo após o bloco `await registrarAtividade(...)` e antes do `revalidatePath('/leads')`, insira:

```typescript
  await distribuirLead(supabase, lead.id, perfil.organization_id, perfil.id)
```

- [ ] **Passo 3: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -40
```

Esperado: sem erros.

- [ ] **Passo 4: Commit**

```bash
git add app/'(dashboard)'/leads/actions.ts
git commit -m "feat: integrar distribuicao automatica ao fluxo de criacao de lead"
```

---

## Tarefa 3: Criar Server Actions de configuração de distribuição e disponibilidade

**Arquivos:**
- Criar: `app/(dashboard)/configuracoes/distribuicao/actions.ts`

- [ ] **Passo 1: Criar o diretório e o arquivo**

```bash
mkdir -p /Users/danilo/Documents/BOOT-CRM/app/\(dashboard\)/configuracoes/distribuicao
```

Conteúdo do arquivo:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { DistribuicaoModo } from '@/types/database'

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

export async function salvarConfigDistribuicao(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const modo = formData.get('modo') as DistribuicaoModo
  const apenasDisponiveisRaw = formData.get('apenas_disponiveis')
  const limiteBruto = formData.get('limite_por_vendedor') as string | null

  const apenas_disponiveis = apenasDisponiveisRaw === 'on'
  const limite_por_vendedor =
    limiteBruto && limiteBruto.trim() !== '' ? parseInt(limiteBruto, 10) : null

  if (!['manual', 'rotativo', 'por_carga'].includes(modo)) {
    throw new Error('Modo de distribuição inválido.')
  }

  if (limite_por_vendedor !== null && (isNaN(limite_por_vendedor) || limite_por_vendedor < 1)) {
    throw new Error('Limite por vendedor deve ser um número inteiro maior que zero.')
  }

  const { error } = await supabase
    .from('lead_distribution_config')
    .upsert(
      {
        organization_id: perfil.organization_id,
        modo,
        apenas_disponiveis,
        limite_por_vendedor,
        atualizado_por: perfil.id,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'organization_id' }
    )

  if (error) throw new Error(`Erro ao salvar configuração: ${error.message}`)

  revalidatePath('/configuracoes/distribuicao')
}

export async function alternarDisponibilidade() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, disponivel')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  if (perfil.cargo !== 'vendedor' && perfil.cargo !== 'atendimento') {
    throw new Error('Apenas vendedores e atendimento podem alterar disponibilidade.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      disponivel: !perfil.disponivel,
      ultimo_status_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', perfil.id)

  if (error) throw new Error(`Erro ao alterar disponibilidade: ${error.message}`)

  revalidatePath('/leads')
  revalidatePath('/configuracoes/distribuicao')
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -40
```

Esperado: sem erros.

- [ ] **Passo 3: Commit**

```bash
git add app/'(dashboard)'/configuracoes/distribuicao/actions.ts
git commit -m "feat: adicionar server actions de configuracao de distribuicao e disponibilidade"
```

---

## Tarefa 4: Criar `FormConfigDistribuicao` — formulário Client Component

**Arquivos:**
- Criar: `components/distribuicao/form-config-distribuicao.tsx`

- [ ] **Passo 1: Criar o diretório e o arquivo**

```bash
mkdir -p /Users/danilo/Documents/BOOT-CRM/components/distribuicao
```

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { salvarConfigDistribuicao } from '@/app/(dashboard)/configuracoes/distribuicao/actions'
import type { DistribuicaoModo } from '@/types/database'

type Props = {
  config: {
    modo: DistribuicaoModo
    apenas_disponiveis: boolean
    limite_por_vendedor: number | null
  }
}

const MODOS: { valor: DistribuicaoModo; label: string; descricao: string }[] = [
  {
    valor: 'manual',
    label: 'Manual',
    descricao: 'Leads criados sem responsável. Atribuição feita manualmente pelo gestor ou admin.',
  },
  {
    valor: 'rotativo',
    label: 'Rotativo',
    descricao: 'Leads distribuídos em sequência circular entre os vendedores elegíveis.',
  },
  {
    valor: 'por_carga',
    label: 'Por carga de trabalho',
    descricao: 'Lead atribuído ao vendedor com menos leads abertos no momento.',
  },
]

export function FormConfigDistribuicao({ config }: Props) {
  const [modo, setModo] = useState<DistribuicaoModo>(config.modo)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const descricaoModo = MODOS.find((m) => m.valor === modo)?.descricao ?? ''

  async function handleSubmit(formData: FormData) {
    formData.set('modo', modo)
    setCarregando(true)
    setErro(null)
    setSucesso(false)
    try {
      await salvarConfigDistribuicao(formData)
      setSucesso(true)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar configuração.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Modo de distribuição</Label>
        <Select
          value={modo}
          onValueChange={(v: string | null) => setModo((v ?? 'manual') as DistribuicaoModo)}
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODOS.map((m) => (
              <SelectItem key={m.valor} value={m.valor}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {descricaoModo && (
          <p className="text-sm text-slate-500">{descricaoModo}</p>
        )}
      </div>

      {modo !== 'manual' && (
        <>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="apenas_disponiveis"
              name="apenas_disponiveis"
              defaultChecked={config.apenas_disponiveis}
              className="h-4 w-4 rounded border-slate-300"
            />
            <Label htmlFor="apenas_disponiveis" className="cursor-pointer">
              Atribuir apenas a vendedores disponíveis
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limite_por_vendedor">
              Limite de leads abertos por vendedor{' '}
              <span className="text-slate-400 font-normal">(opcional)</span>
            </Label>
            <Input
              id="limite_por_vendedor"
              name="limite_por_vendedor"
              type="number"
              min="1"
              defaultValue={config.limite_por_vendedor ?? ''}
              placeholder="Sem limite"
              className="max-w-xs"
            />
            <p className="text-sm text-slate-500">
              Vendedores que atingirem este limite não receberão novos leads.
            </p>
          </div>
        </>
      )}

      {erro && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
      )}
      {sucesso && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Configuração salva com sucesso.
        </div>
      )}

      <Button type="submit" disabled={carregando}>
        {carregando ? 'Salvando...' : 'Salvar configuração'}
      </Button>
    </form>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -40
```

Esperado: sem erros.

- [ ] **Passo 3: Commit**

```bash
git add components/distribuicao/form-config-distribuicao.tsx
git commit -m "feat: adicionar formulario de configuracao de distribuicao de leads"
```

---

## Tarefa 5: Criar página `/configuracoes/distribuicao`

**Arquivos:**
- Criar: `app/(dashboard)/configuracoes/distribuicao/page.tsx`

- [ ] **Passo 1: Criar a página**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FormConfigDistribuicao } from '@/components/distribuicao/form-config-distribuicao'
import type { DistribuicaoModo } from '@/types/database'

export default async function DistribuicaoPage() {
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

  const { data: config } = await supabase
    .from('lead_distribution_config')
    .select('modo, apenas_disponiveis, limite_por_vendedor')
    .eq('organization_id', perfil.organization_id)
    .single()

  const configAtual = config ?? {
    modo: 'manual' as DistribuicaoModo,
    apenas_disponiveis: false,
    limite_por_vendedor: null,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Distribuição de Leads</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure como os novos leads são atribuídos aos vendedores automaticamente.
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <FormConfigDistribuicao config={configAtual} />
      </div>
    </div>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -40
```

Esperado: sem erros.

- [ ] **Passo 3: Commit**

```bash
git add app/'(dashboard)'/configuracoes/distribuicao/page.tsx
git commit -m "feat: adicionar pagina de configuracao de distribuicao de leads"
```

---

## Tarefa 6: Criar hub de configurações `/configuracoes`

**Arquivos:**
- Criar: `app/(dashboard)/configuracoes/page.tsx`

- [ ] **Passo 1: Criar a página**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, GitBranch } from 'lucide-react'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const isAdmin = perfil.cargo === 'admin'
  const isAdminOuGestor = perfil.cargo === 'admin' || perfil.cargo === 'gestor'

  if (!isAdminOuGestor) redirect('/painel')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie as configurações do sistema.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isAdmin && (
          <Link
            href="/configuracoes/usuarios"
            className="flex items-start gap-4 rounded-lg border bg-white p-5 transition-colors hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <div className="font-medium text-slate-900">Usuários e Permissões</div>
              <div className="mt-0.5 text-sm text-slate-500">
                Gerencie usuários, perfis de acesso e status.
              </div>
            </div>
          </Link>
        )}

        <Link
          href="/configuracoes/distribuicao"
          className="flex items-start gap-4 rounded-lg border bg-white p-5 transition-colors hover:bg-slate-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <GitBranch className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <div className="font-medium text-slate-900">Distribuição de Leads</div>
            <div className="mt-0.5 text-sm text-slate-500">
              Configure o modo de atribuição automática de leads.
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -40
```

Esperado: sem erros.

- [ ] **Passo 3: Commit**

```bash
git add app/'(dashboard)'/configuracoes/page.tsx
git commit -m "feat: adicionar hub de configuracoes com links para usuarios e distribuicao"
```

---

## Tarefa 7: Criar `BotaoDisponibilidade` — toggle no header

**Arquivos:**
- Criar: `components/distribuicao/botao-disponibilidade.tsx`

- [ ] **Passo 1: Criar o arquivo**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { alternarDisponibilidade } from '@/app/(dashboard)/configuracoes/distribuicao/actions'
import type { UserRole } from '@/types/database'

type Props = {
  disponivel: boolean
  cargo: UserRole
}

const CARGOS_COM_DISPONIBILIDADE: UserRole[] = ['vendedor', 'atendimento']

export function BotaoDisponibilidade({ disponivel, cargo }: Props) {
  if (!CARGOS_COM_DISPONIBILIDADE.includes(cargo)) return null

  return <BotaoDisponibilidadeInterativo disponivel={disponivel} />
}

function BotaoDisponibilidadeInterativo({ disponivel: inicial }: { disponivel: boolean }) {
  const [disponivel, setDisponivel] = useState(inicial)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      try {
        await alternarDisponibilidade()
        setDisponivel((prev) => !prev)
        router.refresh()
      } catch {
        // estado não muda se a action falhar
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={
        disponivel
          ? 'Você está disponível — clique para ficar indisponível'
          : 'Você está indisponível — clique para ficar disponível'
      }
      className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
      style={
        disponivel
          ? { borderColor: '#16a34a', color: '#15803d', backgroundColor: '#f0fdf4' }
          : { borderColor: '#94a3b8', color: '#475569', backgroundColor: '#f8fafc' }
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: disponivel ? '#16a34a' : '#94a3b8' }}
      />
      {isPending ? '...' : disponivel ? 'Disponível' : 'Indisponível'}
    </button>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -40
```

Esperado: sem erros.

- [ ] **Passo 3: Commit**

```bash
git add components/distribuicao/botao-disponibilidade.tsx
git commit -m "feat: adicionar botao de toggle de disponibilidade para vendedores e atendimento"
```

---

## Tarefa 8: Modificar `Header` para exibir `BotaoDisponibilidade`

**Arquivos:**
- Modificar: `components/layout/header.tsx`

- [ ] **Passo 1: Atualizar o arquivo completo**

Leia o arquivo atual. O header busca `select('nome, cargo')`. Precisa incluir `disponivel`. Substituir o conteúdo completo por:

```typescript
import { createClient } from '@/lib/supabase/server'
import { BadgePerfil } from '@/components/usuarios/badge-perfil'
import { SidebarMobile } from '@/components/layout/sidebar-mobile'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BotaoSair } from '@/components/layout/botao-sair'
import { BotaoDisponibilidade } from '@/components/distribuicao/botao-disponibilidade'
import type { UserRole } from '@/types/database'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, cargo, disponivel')
    .eq('id', user?.id ?? '')
    .single()

  const iniciais = profile?.nome
    ?.split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() ?? '?'

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
      <SidebarMobile />

      <div className="flex items-center gap-3 md:gap-4">
        {profile?.cargo && (
          <BotaoDisponibilidade
            disponivel={profile.disponivel ?? true}
            cargo={profile.cargo as UserRole}
          />
        )}
        {profile?.cargo && (
          <span className="hidden sm:block">
            <BadgePerfil perfil={profile.cargo as UserRole} />
          </span>
        )}
        <div className="flex items-center gap-2 md:gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
              {iniciais}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-sm font-medium text-slate-700">
            {profile?.nome ?? user?.email}
          </span>
        </div>
        <BotaoSair />
      </div>
    </header>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -40
```

Esperado: sem erros.

- [ ] **Passo 3: Commit final da fase**

```bash
git add components/layout/header.tsx
git commit -m "feat: exibir botao de disponibilidade no header para vendedores e atendimento"
```

---

## Verificação Final da Fase 3

- [ ] Lógica de distribuição em `lib/distribuicao.ts` — manual, rotativo, por carga
- [ ] Modo rotativo atualiza `proximo_vendedor_idx` no banco após cada atribuição
- [ ] Modo por carga seleciona vendedor com menos leads abertos
- [ ] Respeita `apenas_disponiveis` e `limite_por_vendedor` nos dois modos automáticos
- [ ] Se nenhum vendedor disponível, registra atividade `lead_sem_responsavel`
- [ ] `criarLead` chama `distribuirLead` após criar o lead
- [ ] Página `/configuracoes` acessível a admin e gestor (outros → `/painel`)
- [ ] Link "Usuários" visível apenas para admin; "Distribuição" para admin e gestor
- [ ] Página `/configuracoes/distribuicao` com formulário funcional
- [ ] Campos de limite e apenas_disponíveis ocultos no modo manual
- [ ] `salvarConfigDistribuicao` usa upsert por `organization_id`
- [ ] `alternarDisponibilidade` só funciona para vendedor e atendimento
- [ ] `BotaoDisponibilidade` visível no header apenas para vendedor e atendimento
- [ ] Estado visual verde (disponível) / cinza (indisponível)
- [ ] TypeScript: zero erros em todo o projeto

---

## Próximas Fases

| Fase | Plano |
|---|---|
| **Fase 4** | `2026-05-11-fase-4-pipeline-kanban.md` — Pipeline Kanban com arrastar e soltar |
| **Fase 5** | `2026-05-11-fase-5-tarefas.md` — Tarefas e follow-ups |

---

*Plano criado em 11/05/2026. Spec de referência: `docs/superpowers/specs/2026-05-09-boot-crm-design.md`*
