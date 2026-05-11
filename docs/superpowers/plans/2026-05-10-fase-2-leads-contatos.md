# Fase 2 — Leads, Contatos e Empresas

> **Para agentes autônomos:** SUB-SKILL OBRIGATÓRIA: Use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar este plano tarefa a tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Objetivo:** Construir o módulo central do CRM — listagem, detalhe, criação e edição de leads; conversão de lead em contato; e gestão de contatos e empresas.

**Arquitetura:** Server Components buscam dados via `createClient()` do Supabase. Filtros e busca são armazenados em URL search params para permitir deep linking e back button. Client Components gerenciam modais e formulários. Server Actions executam todas as mutações e registram atividades. RLS do Supabase garante isolamento por organização sem código adicional.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Tailwind CSS v4 · shadcn/ui com `@base-ui/react` · Supabase · date-fns

---

## ATENÇÕES CRÍTICAS PARA O IMPLEMENTADOR

1. **shadcn/ui usa `@base-ui/react`** — NÃO existe `asChild`. Use `render={<Elemento />}` em DialogTrigger, SheetTrigger, etc.
2. **`createClient()` é async** — sempre `await createClient()` em Server Components e Actions.
3. **Tailwind v4** — não usar `@tailwind base/components/utilities`. CSS já tem `@import "tailwindcss"` em `globals.css`.
4. **Sem `any`** — usar `unknown` em catch blocks. Tipos em `types/database.ts`.
5. **Sem comentários** exceto onde o "porquê" é não-óbvio.
6. **Interface 100% em português** — zero palavras em inglês visíveis ao usuário.

---

## Estrutura de Arquivos

```
app/(dashboard)/
  leads/
    page.tsx                     # Listagem de leads (Server Component)
    [id]/page.tsx                # Detalhe do lead (Server Component)
    actions.ts                   # criar, editar, atribuir, descartar, converter
  contatos/
    page.tsx                     # Listagem de contatos (Server Component)
    [id]/page.tsx                # Detalhe do contato (Server Component)
    actions.ts                   # criar, editar contato + empresa inline
components/
  leads/
    tabela-leads.tsx             # Tabela com filtros e busca (Client Component)
    modal-novo-lead.tsx          # Modal criar/editar lead (Client Component)
    modal-converter-lead.tsx     # Modal converter lead → contato (Client Component)
    badge-origem.tsx             # Badge colorido de origem (Server-safe)
    badge-status-lead.tsx        # Badge colorido de status (Server-safe)
  contatos/
    tabela-contatos.tsx          # Tabela de contatos (Client Component)
    modal-novo-contato.tsx       # Modal criar contato com empresa inline (Client)
  shared/
    timeline-atividades.tsx      # Timeline de atividades reutilizável (Server Component)
lib/
  navegacao.ts                   # Array de navegação extraído dos dois sidebars
components/ui/
  textarea.tsx                   # Instalado via shadcn add textarea
```

---

## Tarefa 1: Preparar base — extrair navegação e instalar textarea

**Arquivos:**
- Criar: `lib/navegacao.ts`
- Modificar: `components/layout/sidebar.tsx`
- Modificar: `components/layout/sidebar-mobile.tsx`
- Criar: `components/ui/textarea.tsx` (via shadcn)

- [ ] **Passo 1: Instalar componente textarea do shadcn**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx shadcn add textarea
```

Confirmar que criou `components/ui/textarea.tsx`.

- [ ] **Passo 2: Criar `lib/navegacao.ts`**

```typescript
import {
  LayoutDashboard, Users, TrendingUp, UserCheck,
  Briefcase, MessageCircle, Inbox, CheckSquare, FileText,
  BarChart2, Settings, type LucideIcon
} from 'lucide-react'

export type ItemNavegacao = {
  label: string
  href: string
  icone: LucideIcon
}

export const navegacao: ItemNavegacao[] = [
  { label: 'Painel Principal', href: '/painel', icone: LayoutDashboard },
  { label: 'Caixa de Entrada', href: '/caixa-de-entrada', icone: Inbox },
  { label: 'Leads', href: '/leads', icone: Users },
  { label: 'Pipeline de Vendas', href: '/pipeline', icone: TrendingUp },
  { label: 'Contatos', href: '/contatos', icone: UserCheck },
  { label: 'Negociações', href: '/negociacoes', icone: Briefcase },
  { label: 'WhatsApp', href: '/whatsapp', icone: MessageCircle },
  { label: 'Tarefas', href: '/tarefas', icone: CheckSquare },
  { label: 'Orçamentos', href: '/orcamentos', icone: FileText },
  { label: 'Relatórios', href: '/relatorios', icone: BarChart2 },
  { label: 'Configurações', href: '/configuracoes', icone: Settings },
]
```

- [ ] **Passo 3: Atualizar `components/layout/sidebar.tsx` para importar de `lib/navegacao.ts`**

Substituir o conteúdo completo:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navegacao } from '@/lib/navegacao'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-xl font-bold text-slate-900">BOOT CRM</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navegacao.map((item) => {
            const Icone = item.icone
            const ativo = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    ativo
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icone className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
```

- [ ] **Passo 4: Atualizar `components/layout/sidebar-mobile.tsx` para importar de `lib/navegacao.ts`**

Leia o arquivo atual e substitua o array `navegacao` inline pela importação:
```typescript
import { navegacao } from '@/lib/navegacao'
```
E remova a declaração inline do array `navegacao` dentro do componente.

- [ ] **Passo 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Passo 6: Commit**

```bash
git add lib/navegacao.ts components/layout/sidebar.tsx components/layout/sidebar-mobile.tsx components/ui/textarea.tsx
git commit -m "refactor: extrai navegacao para lib e instala textarea"
```

---

## Tarefa 2: Criar badges de origem e status do lead

**Arquivos:**
- Criar: `components/leads/badge-origem.tsx`
- Criar: `components/leads/badge-status-lead.tsx`

- [ ] **Passo 1: Criar `components/leads/badge-origem.tsx`**

```typescript
import type { LeadOrigem } from '@/types/database'

const config: Record<LeadOrigem, { label: string; classe: string }> = {
  whatsapp:           { label: 'WhatsApp',      classe: 'bg-green-100 text-green-700' },
  instagram_lead_ad:  { label: 'Instagram',     classe: 'bg-purple-100 text-purple-700' },
  facebook_lead_ad:   { label: 'Facebook',      classe: 'bg-blue-100 text-blue-700' },
  site:               { label: 'Site',           classe: 'bg-cyan-100 text-cyan-700' },
  indicacao:          { label: 'Indicação',     classe: 'bg-yellow-100 text-yellow-700' },
  evento:             { label: 'Evento',         classe: 'bg-orange-100 text-orange-700' },
  manual:             { label: 'Manual',         classe: 'bg-slate-100 text-slate-700' },
}

export function BadgeOrigem({ origem }: { origem: LeadOrigem }) {
  const { label, classe } = config[origem]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classe}`}>
      {label}
    </span>
  )
}
```

- [ ] **Passo 2: Criar `components/leads/badge-status-lead.tsx`**

```typescript
import type { LeadStatus } from '@/types/database'

const config: Record<LeadStatus, { label: string; classe: string }> = {
  novo:           { label: 'Novo',           classe: 'bg-blue-100 text-blue-700' },
  em_atendimento: { label: 'Em atendimento', classe: 'bg-yellow-100 text-yellow-700' },
  qualificado:    { label: 'Qualificado',    classe: 'bg-green-100 text-green-700' },
  descartado:     { label: 'Descartado',     classe: 'bg-red-100 text-red-700' },
}

export function BadgeStatusLead({ status }: { status: LeadStatus }) {
  const { label, classe } = config[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classe}`}>
      {label}
    </span>
  )
}
```

- [ ] **Passo 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Passo 4: Commit**

```bash
git add components/leads/
git commit -m "feat: cria badges de origem e status do lead"
```

---

## Tarefa 3: Server Actions de leads

**Arquivos:**
- Criar: `app/(dashboard)/leads/actions.ts`

- [ ] **Passo 1: Criar `app/(dashboard)/leads/actions.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { LeadOrigem, LeadStatus } from '@/types/database'

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
  return { supabase, user, perfil }
}

async function registrarAtividade(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    organization_id: string
    autor_id: string
    tipo: string
    descricao: string
    lead_id?: string
    contato_id?: string
  }
) {
  await supabase.from('activities').insert({
    organization_id: params.organization_id,
    autor_id: params.autor_id,
    tipo: params.tipo,
    descricao: params.descricao,
    lead_id: params.lead_id ?? null,
    contato_id: params.contato_id ?? null,
  })
}

export async function criarLead(formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const nome = formData.get('nome') as string | null
  const email = formData.get('email') as string | null
  const telefone = formData.get('telefone') as string | null
  const empresa = formData.get('empresa') as string | null
  const origem = (formData.get('origem') as LeadOrigem) ?? 'manual'
  const responsavel_id = formData.get('responsavel_id') as string | null
  const observacoes = formData.get('observacoes') as string | null

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      organization_id: perfil.organization_id,
      nome: nome || null,
      email: email || null,
      telefone: telefone || null,
      empresa: empresa || null,
      origem,
      status: 'novo' as LeadStatus,
      responsavel_id: responsavel_id || null,
      observacoes: observacoes || null,
      ultima_interacao_em: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar lead: ${error.message}`)

  await registrarAtividade(supabase, {
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'lead_criado',
    descricao: `Lead "${nome ?? telefone ?? 'sem nome'}" criado manualmente.`,
    lead_id: lead.id,
  })

  revalidatePath('/leads')
  redirect(`/leads/${lead.id}`)
}

export async function editarLead(leadId: string, formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const nome = formData.get('nome') as string | null
  const email = formData.get('email') as string | null
  const telefone = formData.get('telefone') as string | null
  const empresa = formData.get('empresa') as string | null
  const origem = formData.get('origem') as LeadOrigem
  const responsavel_id = formData.get('responsavel_id') as string | null
  const observacoes = formData.get('observacoes') as string | null

  const { error } = await supabase
    .from('leads')
    .update({
      nome: nome || null,
      email: email || null,
      telefone: telefone || null,
      empresa: empresa || null,
      origem,
      responsavel_id: responsavel_id || null,
      observacoes: observacoes || null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (error) throw new Error(`Erro ao editar lead: ${error.message}`)

  await registrarAtividade(supabase, {
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'lead_editado',
    descricao: 'Informações do lead atualizadas.',
    lead_id: leadId,
  })

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

export async function atribuirResponsavel(leadId: string, responsavelId: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: responsavel } = await supabase
    .from('profiles')
    .select('nome')
    .eq('id', responsavelId)
    .single()

  const { error } = await supabase
    .from('leads')
    .update({ responsavel_id: responsavelId, atualizado_em: new Date().toISOString() })
    .eq('id', leadId)

  if (error) throw new Error(`Erro ao atribuir responsável: ${error.message}`)

  await registrarAtividade(supabase, {
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'responsavel_alterado',
    descricao: `Lead atribuído a ${responsavel?.nome ?? 'usuário desconhecido'}.`,
    lead_id: leadId,
  })

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

export async function descartarLead(leadId: string, motivo: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { error } = await supabase
    .from('leads')
    .update({ status: 'descartado', atualizado_em: new Date().toISOString() })
    .eq('id', leadId)

  if (error) throw new Error(`Erro ao descartar lead: ${error.message}`)

  await registrarAtividade(supabase, {
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'lead_descartado',
    descricao: `Lead descartado. Motivo: ${motivo}`,
    lead_id: leadId,
  })

  revalidatePath('/leads')
  revalidatePath(`/leads/${leadId}`)
}

export async function adicionarObservacao(leadId: string, texto: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  await registrarAtividade(supabase, {
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'observacao',
    descricao: texto,
    lead_id: leadId,
  })

  await supabase
    .from('leads')
    .update({ ultima_interacao_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
    .eq('id', leadId)

  revalidatePath(`/leads/${leadId}`)
}

export async function converterLeadEmContato(leadId: string, formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const nome = formData.get('nome') as string
  const email = formData.get('email') as string | null
  const telefone = formData.get('telefone') as string | null
  const cargo = formData.get('cargo') as string | null
  const empresa_nome = formData.get('empresa_nome') as string | null

  let empresa_id: string | null = null

  if (empresa_nome) {
    const { data: existente } = await supabase
      .from('companies')
      .select('id')
      .eq('organization_id', perfil.organization_id)
      .ilike('nome', empresa_nome)
      .single()

    if (existente) {
      empresa_id = existente.id
    } else {
      const { data: nova, error: errEmpresa } = await supabase
        .from('companies')
        .insert({ organization_id: perfil.organization_id, nome: empresa_nome })
        .select('id')
        .single()
      if (errEmpresa) throw new Error(`Erro ao criar empresa: ${errEmpresa.message}`)
      empresa_id = nova.id
    }
  }

  const { data: contato, error } = await supabase
    .from('contacts')
    .insert({
      organization_id: perfil.organization_id,
      nome,
      email: email || null,
      telefone: telefone || null,
      cargo: cargo || null,
      empresa_id,
      responsavel_id: perfil.id,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar contato: ${error.message}`)

  await supabase
    .from('leads')
    .update({ status: 'qualificado', atualizado_em: new Date().toISOString() })
    .eq('id', leadId)

  await registrarAtividade(supabase, {
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'lead_convertido',
    descricao: `Lead convertido em contato "${nome}".`,
    lead_id: leadId,
    contato_id: contato.id,
  })

  revalidatePath('/leads')
  revalidatePath('/contatos')
  redirect(`/contatos/${contato.id}`)
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Passo 3: Commit**

```bash
git add app/'(dashboard)'/leads/actions.ts
git commit -m "feat: cria server actions de leads"
```

---

## Tarefa 4: Componente TabelaLeads com filtros e busca

**Arquivos:**
- Criar: `components/leads/tabela-leads.tsx`

- [ ] **Passo 1: Criar `components/leads/tabela-leads.tsx`**

```typescript
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { differenceInDays } from 'date-fns'
import { BadgeOrigem } from './badge-origem'
import { BadgeStatusLead } from './badge-status-lead'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Lead, LeadOrigem, LeadStatus, Profile } from '@/types/database'

type LeadComResponsavel = Lead & { responsavel: Pick<Profile, 'id' | 'nome'> | null }

type Props = {
  leads: LeadComResponsavel[]
  responsaveis: Pick<Profile, 'id' | 'nome'>[]
}

const STATUS_OPTIONS: { valor: LeadStatus | ''; label: string }[] = [
  { valor: '', label: 'Todos os status' },
  { valor: 'novo', label: 'Novo' },
  { valor: 'em_atendimento', label: 'Em atendimento' },
  { valor: 'qualificado', label: 'Qualificado' },
  { valor: 'descartado', label: 'Descartado' },
]

const ORIGEM_OPTIONS: { valor: LeadOrigem | ''; label: string }[] = [
  { valor: '', label: 'Todas as origens' },
  { valor: 'whatsapp', label: 'WhatsApp' },
  { valor: 'instagram_lead_ad', label: 'Instagram' },
  { valor: 'facebook_lead_ad', label: 'Facebook' },
  { valor: 'site', label: 'Site' },
  { valor: 'indicacao', label: 'Indicação' },
  { valor: 'evento', label: 'Evento' },
  { valor: 'manual', label: 'Manual' },
]

export function TabelaLeads({ leads, responsaveis }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const atualizarFiltro = useCallback((chave: string, valor: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (valor) {
      params.set(chave, valor)
    } else {
      params.delete(chave)
    }
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nome, telefone ou e-mail..."
          defaultValue={searchParams.get('busca') ?? ''}
          onChange={(e) => atualizarFiltro('busca', e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={searchParams.get('status') ?? ''}
          onValueChange={(v) => atualizarFiltro('status', v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.valor || '__todos__'} value={o.valor}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get('origem') ?? ''}
          onValueChange={(v) => atualizarFiltro('origem', v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas as origens" />
          </SelectTrigger>
          <SelectContent>
            {ORIGEM_OPTIONS.map((o) => (
              <SelectItem key={o.valor || '__todas__'} value={o.valor}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get('responsavel') ?? ''}
          onValueChange={(v) => atualizarFiltro('responsavel', v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os responsáveis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os responsáveis</SelectItem>
            {responsaveis.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
              <th className="px-4 py-3 font-medium text-slate-600">Origem</th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600">Responsável</th>
              <th className="px-4 py-3 font-medium text-slate-600">Última interação</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
            {leads.map((lead) => {
              const diasSemInteracao = lead.ultima_interacao_em
                ? differenceInDays(new Date(), new Date(lead.ultima_interacao_em))
                : differenceInDays(new Date(), new Date(lead.criado_em))
              const semInteracao = diasSemInteracao > 7 && lead.status !== 'descartado' && lead.status !== 'qualificado'
              return (
                <tr
                  key={lead.id}
                  className={`border-b last:border-0 hover:bg-slate-50 cursor-pointer ${semInteracao ? 'bg-amber-50' : ''}`}
                  onClick={() => router.push(`/leads/${lead.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {semInteracao && (
                        <span title="Sem interação há mais de 7 dias" className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                      {lead.nome ?? <span className="text-slate-400 italic">Sem nome</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{lead.telefone ?? '—'}</td>
                  <td className="px-4 py-3"><BadgeOrigem origem={lead.origem} /></td>
                  <td className="px-4 py-3"><BadgeStatusLead status={lead.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{lead.responsavel?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.ultima_interacao_em
                      ? format(new Date(lead.ultima_interacao_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                      : format(new Date(lead.criado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {leads.length > 0 && (
        <p className="text-xs text-slate-400">{leads.length} lead{leads.length !== 1 ? 's' : ''} encontrado{leads.length !== 1 ? 's' : ''}.</p>
      )}
    </div>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Passo 3: Commit**

```bash
git add components/leads/tabela-leads.tsx
git commit -m "feat: cria tabela de leads com filtros e alerta de inatividade"
```

---

## Tarefa 5: Página de listagem de leads

**Arquivos:**
- Criar: `app/(dashboard)/leads/page.tsx`

- [ ] **Passo 1: Criar `app/(dashboard)/leads/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { TabelaLeads } from '@/components/leads/tabela-leads'
import { ModalNovoLead } from '@/components/leads/modal-novo-lead'
import type { Lead, Profile } from '@/types/database'

type SearchParams = Promise<{
  busca?: string
  status?: string
  origem?: string
  responsavel?: string
}>

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const params = await searchParams

  let query = supabase
    .from('leads')
    .select('*, responsavel:profiles!responsavel_id(id, nome)')
    .order('criado_em', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  if (params.origem) query = query.eq('origem', params.origem)
  if (params.responsavel) query = query.eq('responsavel_id', params.responsavel)
  if (params.busca) {
    query = query.or(
      `nome.ilike.%${params.busca}%,telefone.ilike.%${params.busca}%,email.ilike.%${params.busca}%`
    )
  }

  const { data: leads } = await query as { data: (Lead & { responsavel: Pick<Profile, 'id' | 'nome'> | null })[] | null }

  const { data: responsaveis } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome') as { data: Pick<Profile, 'id' | 'nome'>[] | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie os leads e acompanhe o progresso de cada um.
          </p>
        </div>
        <ModalNovoLead responsaveis={responsaveis ?? []} />
      </div>

      <TabelaLeads leads={leads ?? []} responsaveis={responsaveis ?? []} />
    </div>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Vai falhar com "Cannot find module '@/components/leads/modal-novo-lead'" — isso é esperado, o modal é criado na próxima tarefa. Confirme que o único erro é esse antes de prosseguir.

- [ ] **Passo 3: Commit**

```bash
git add app/'(dashboard)'/leads/page.tsx
git commit -m "feat: cria pagina de listagem de leads"
```

---

## Tarefa 6: Modal de cadastro de lead

**Arquivos:**
- Criar: `components/leads/modal-novo-lead.tsx`

- [ ] **Passo 1: Criar `components/leads/modal-novo-lead.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarLead } from '@/app/(dashboard)/leads/actions'
import { Plus } from 'lucide-react'
import type { Profile, LeadOrigem } from '@/types/database'

const ORIGENS: { valor: LeadOrigem; label: string }[] = [
  { valor: 'manual', label: 'Manual' },
  { valor: 'indicacao', label: 'Indicação' },
  { valor: 'evento', label: 'Evento' },
  { valor: 'site', label: 'Site' },
  { valor: 'whatsapp', label: 'WhatsApp' },
  { valor: 'instagram_lead_ad', label: 'Instagram Lead Ad' },
  { valor: 'facebook_lead_ad', label: 'Facebook Lead Ad' },
]

type Props = {
  responsaveis: Pick<Profile, 'id' | 'nome'>[]
}

export function ModalNovoLead({ responsaveis }: Props) {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [origemSelecionada, setOrigemSelecionada] = useState<LeadOrigem>('manual')
  const [responsavelSelecionado, setResponsavelSelecionado] = useState('')

  async function handleSubmit(formData: FormData) {
    formData.set('origem', origemSelecionada)
    if (responsavelSelecionado) formData.set('responsavel_id', responsavelSelecionado)
    setCarregando(true)
    setErro(null)
    try {
      await criarLead(formData)
      setAberto(false)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar lead.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" />Novo Lead</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Lead</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" placeholder="João Silva" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="joao@email.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa</Label>
            <Input id="empresa" name="empresa" placeholder="Nome da empresa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={origemSelecionada} onValueChange={(v) => setOrigemSelecionada(v as LeadOrigem)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENS.map((o) => (
                    <SelectItem key={o.valor} value={o.valor}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={responsavelSelecionado} onValueChange={setResponsavelSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem responsável</SelectItem>
                  {responsaveis.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" name="observacoes" placeholder="Contexto inicial do lead..." rows={3} />
          </div>
          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript sem erros**

```bash
npx tsc --noEmit
```

- [ ] **Passo 3: Commit**

```bash
git add components/leads/modal-novo-lead.tsx
git commit -m "feat: cria modal de cadastro de lead"
```

---

## Tarefa 7: Componente TimelineAtividades

**Arquivos:**
- Criar: `components/shared/timeline-atividades.tsx`

- [ ] **Passo 1: Criar `components/shared/timeline-atividades.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Activity, Profile } from '@/types/database'

type AtividadeComAutor = Activity & { autor: Pick<Profile, 'nome'> | null }

const ICONES_TIPO: Record<string, string> = {
  lead_criado: '✦',
  lead_editado: '✎',
  lead_descartado: '✕',
  lead_convertido: '→',
  responsavel_alterado: '⇄',
  observacao: '✉',
  status_alterado: '◉',
}

type Props = {
  leadId?: string
  contatoId?: string
}

export async function TimelineAtividades({ leadId, contatoId }: Props) {
  const supabase = await createClient()

  let query = supabase
    .from('activities')
    .select('*, autor:profiles!autor_id(nome)')
    .order('criado_em', { ascending: false })
    .limit(50)

  if (leadId) query = query.eq('lead_id', leadId)
  if (contatoId) query = query.eq('contato_id', contatoId)

  const { data: atividades } = await query as { data: AtividadeComAutor[] | null }

  if (!atividades || atividades.length === 0) {
    return (
      <p className="text-sm text-slate-400">Nenhuma atividade registrada ainda.</p>
    )
  }

  return (
    <ol className="relative border-l border-slate-200 space-y-6">
      {atividades.map((atividade) => (
        <li key={atividade.id} className="ml-6">
          <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 text-xs text-slate-500">
            {ICONES_TIPO[atividade.tipo] ?? '·'}
          </span>
          <p className="text-sm text-slate-900">{atividade.descricao}</p>
          <p className="mt-1 text-xs text-slate-400">
            {atividade.autor?.nome ?? 'Sistema'} · {format(new Date(atividade.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Passo 3: Commit**

```bash
git add components/shared/timeline-atividades.tsx
git commit -m "feat: cria componente de timeline de atividades"
```

---

## Tarefa 8: Página de detalhe do lead

**Arquivos:**
- Criar: `app/(dashboard)/leads/[id]/page.tsx`
- Criar: `components/leads/modal-converter-lead.tsx`

- [ ] **Passo 1: Criar `components/leads/modal-converter-lead.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { converterLeadEmContato } from '@/app/(dashboard)/leads/actions'
import { UserCheck } from 'lucide-react'
import type { Lead } from '@/types/database'

type Props = {
  lead: Pick<Lead, 'id' | 'nome' | 'email' | 'telefone' | 'empresa'>
}

export function ModalConverterLead({ lead }: Props) {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    try {
      await converterLeadEmContato(lead.id, formData)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao converter lead.')
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={
        <Button variant="outline">
          <UserCheck className="mr-2 h-4 w-4" />
          Converter em Contato
        </Button>
      } />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Converter em Contato</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input id="nome" name="nome" defaultValue={lead.nome ?? ''} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" defaultValue={lead.telefone ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={lead.email ?? ''} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input id="cargo" name="cargo" placeholder="Ex: Diretor Comercial" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="empresa_nome">Empresa</Label>
            <Input id="empresa_nome" name="empresa_nome" defaultValue={lead.empresa ?? ''} placeholder="Nome da empresa" />
          </div>
          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Convertendo...' : 'Converter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 2: Criar `app/(dashboard)/leads/[id]/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BadgeOrigem } from '@/components/leads/badge-origem'
import { BadgeStatusLead } from '@/components/leads/badge-status-lead'
import { ModalConverterLead } from '@/components/leads/modal-converter-lead'
import { TimelineAtividades } from '@/components/shared/timeline-atividades'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { descartarLead, adicionarObservacao } from '@/app/(dashboard)/leads/actions'
import { ChevronLeft } from 'lucide-react'
import type { Lead, Profile } from '@/types/database'

type LeadComResponsavel = Lead & { responsavel: Pick<Profile, 'id' | 'nome'> | null }

export default async function LeadDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: lead } = await supabase
    .from('leads')
    .select('*, responsavel:profiles!responsavel_id(id, nome)')
    .eq('id', id)
    .single() as { data: LeadComResponsavel | null }

  if (!lead) notFound()

  const podeConverter = lead.status !== 'qualificado' && lead.status !== 'descartado'

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/leads">
          <Button variant="ghost" size="sm" className="gap-1 pl-0 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
            Leads
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna esquerda — dados do lead */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {lead.nome ?? <span className="italic text-slate-400">Sem nome</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-2">
                <BadgeOrigem origem={lead.origem} />
                <BadgeStatusLead status={lead.status} />
              </div>
              {lead.telefone && (
                <div>
                  <p className="text-xs text-slate-500">Telefone</p>
                  <p className="font-medium">{lead.telefone}</p>
                </div>
              )}
              {lead.email && (
                <div>
                  <p className="text-xs text-slate-500">E-mail</p>
                  <p className="font-medium">{lead.email}</p>
                </div>
              )}
              {lead.empresa && (
                <div>
                  <p className="text-xs text-slate-500">Empresa</p>
                  <p className="font-medium">{lead.empresa}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Responsável</p>
                <p className="font-medium">{lead.responsavel?.nome ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cadastrado em</p>
                <p className="font-medium">{format(new Date(lead.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              {lead.observacoes && (
                <div>
                  <p className="text-xs text-slate-500">Observações</p>
                  <p className="text-slate-700">{lead.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex flex-col gap-2">
            {podeConverter && <ModalConverterLead lead={lead} />}
            {lead.status !== 'descartado' && (
              <form action={descartarLead.bind(null, lead.id, 'Descartado manualmente.')}>
                <Button type="submit" variant="outline" className="w-full text-red-600 hover:text-red-700">
                  Descartar Lead
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Coluna direita — timeline */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar observação</CardTitle>
            </CardHeader>
            <CardContent>
              <FormObservacao leadId={lead.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineAtividades leadId={lead.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function FormObservacao({ leadId }: { leadId: string }) {
  return (
    <form action={adicionarObservacao.bind(null, leadId, '')} className="flex gap-2">
      <input
        type="hidden"
        name="texto"
      />
      <ObservacaoInput leadId={leadId} />
    </form>
  )
}
```

**ATENÇÃO:** O `FormObservacao` acima precisa ser um Client Component para capturar o texto do textarea. Substitua `FormObservacao` e `ObservacaoInput` pelo seguinte Client Component separado no mesmo arquivo (adicione `'use client'` apenas neste componente usando a estratégia de arquivo separado):

Crie `components/leads/form-observacao.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { adicionarObservacao } from '@/app/(dashboard)/leads/actions'

export function FormObservacao({ leadId }: { leadId: string }) {
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit() {
    if (!texto.trim()) return
    setCarregando(true)
    try {
      await adicionarObservacao(leadId, texto.trim())
      setTexto('')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escreva uma observação sobre este lead..."
        rows={3}
      />
      <Button onClick={handleSubmit} disabled={carregando || !texto.trim()} size="sm">
        {carregando ? 'Salvando...' : 'Adicionar'}
      </Button>
    </div>
  )
}
```

Agora atualize `app/(dashboard)/leads/[id]/page.tsx` para importar `FormObservacao` de `@/components/leads/form-observacao` e remova a definição inline:

```typescript
import { FormObservacao } from '@/components/leads/form-observacao'
// Remova o FormObservacao e ObservacaoInput definidos inline
```

- [ ] **Passo 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Passo 4: Commit**

```bash
git add app/'(dashboard)'/leads/ components/leads/modal-converter-lead.tsx components/leads/form-observacao.tsx
git commit -m "feat: cria pagina de detalhe do lead com timeline e acoes"
```

---

## Tarefa 9: Server Actions de contatos e empresas

**Arquivos:**
- Criar: `app/(dashboard)/contatos/actions.ts`

- [ ] **Passo 1: Criar `app/(dashboard)/contatos/actions.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
  return { supabase, user, perfil }
}

async function resolverEmpresa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organization_id: string,
  empresa_nome: string | null
): Promise<string | null> {
  if (!empresa_nome) return null

  const { data: existente } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organization_id)
    .ilike('nome', empresa_nome)
    .single()

  if (existente) return existente.id

  const { data: nova, error } = await supabase
    .from('companies')
    .insert({ organization_id, nome: empresa_nome })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar empresa: ${error.message}`)
  return nova.id
}

export async function criarContato(formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const nome = formData.get('nome') as string
  const email = formData.get('email') as string | null
  const telefone = formData.get('telefone') as string | null
  const cargo = formData.get('cargo') as string | null
  const empresa_nome = formData.get('empresa_nome') as string | null
  const observacoes = formData.get('observacoes') as string | null

  const empresa_id = await resolverEmpresa(supabase, perfil.organization_id, empresa_nome)

  const { data: contato, error } = await supabase
    .from('contacts')
    .insert({
      organization_id: perfil.organization_id,
      nome,
      email: email || null,
      telefone: telefone || null,
      cargo: cargo || null,
      empresa_id,
      responsavel_id: perfil.id,
      observacoes: observacoes || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar contato: ${error.message}`)

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'contato_criado',
    descricao: `Contato "${nome}" criado.`,
    contato_id: contato.id,
  })

  revalidatePath('/contatos')
  redirect(`/contatos/${contato.id}`)
}

export async function editarContato(contatoId: string, formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const nome = formData.get('nome') as string
  const email = formData.get('email') as string | null
  const telefone = formData.get('telefone') as string | null
  const cargo = formData.get('cargo') as string | null
  const empresa_nome = formData.get('empresa_nome') as string | null
  const observacoes = formData.get('observacoes') as string | null

  const empresa_id = await resolverEmpresa(supabase, perfil.organization_id, empresa_nome)

  const { error } = await supabase
    .from('contacts')
    .update({
      nome,
      email: email || null,
      telefone: telefone || null,
      cargo: cargo || null,
      empresa_id,
      observacoes: observacoes || null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', contatoId)

  if (error) throw new Error(`Erro ao editar contato: ${error.message}`)

  revalidatePath('/contatos')
  revalidatePath(`/contatos/${contatoId}`)
}

export async function adicionarObservacaoContato(contatoId: string, texto: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'observacao',
    descricao: texto,
    contato_id: contatoId,
  })

  revalidatePath(`/contatos/${contatoId}`)
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Passo 3: Commit**

```bash
git add app/'(dashboard)'/contatos/actions.ts
git commit -m "feat: cria server actions de contatos e empresas"
```

---

## Tarefa 10: Listagem de contatos

**Arquivos:**
- Criar: `components/contatos/tabela-contatos.tsx`
- Criar: `app/(dashboard)/contatos/page.tsx`

- [ ] **Passo 1: Criar `components/contatos/tabela-contatos.tsx`**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Contact, Company } from '@/types/database'

type ContatoComEmpresa = Contact & { empresa: Pick<Company, 'id' | 'nome'> | null }

export function TabelaContatos({ contatos }: { contatos: ContatoComEmpresa[] }) {
  const router = useRouter()

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 font-medium text-slate-600">Empresa</th>
            <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
            <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
            <th className="px-4 py-3 font-medium text-slate-600">Cargo</th>
            <th className="px-4 py-3 font-medium text-slate-600">Cadastrado em</th>
          </tr>
        </thead>
        <tbody>
          {contatos.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                Nenhum contato encontrado.
              </td>
            </tr>
          )}
          {contatos.map((contato) => (
            <tr
              key={contato.id}
              className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
              onClick={() => router.push(`/contatos/${contato.id}`)}
            >
              <td className="px-4 py-3 font-medium text-slate-900">{contato.nome}</td>
              <td className="px-4 py-3 text-slate-600">{contato.empresa?.nome ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{contato.telefone ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{contato.email ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{contato.cargo ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">
                {format(new Date(contato.criado_em), 'dd/MM/yyyy', { locale: ptBR })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Passo 2: Criar `app/(dashboard)/contatos/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { TabelaContatos } from '@/components/contatos/tabela-contatos'
import { ModalNovoContato } from '@/components/contatos/modal-novo-contato'
import type { Contact, Company } from '@/types/database'

type ContatoComEmpresa = Contact & { empresa: Pick<Company, 'id' | 'nome'> | null }

export default async function ContatosPage() {
  const supabase = await createClient()

  const { data: contatos } = await supabase
    .from('contacts')
    .select('*, empresa:companies!empresa_id(id, nome)')
    .order('nome') as { data: ContatoComEmpresa[] | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contatos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Contatos qualificados vinculados a negociações.
          </p>
        </div>
        <ModalNovoContato />
      </div>

      <TabelaContatos contatos={contatos ?? []} />
    </div>
  )
}
```

- [ ] **Passo 3: Verificar TypeScript (vai falhar no modal ainda)**

```bash
npx tsc --noEmit
```

Confirme que o único erro é "Cannot find module '@/components/contatos/modal-novo-contato'" — esperado.

- [ ] **Passo 4: Commit**

```bash
git add components/contatos/tabela-contatos.tsx app/'(dashboard)'/contatos/page.tsx
git commit -m "feat: cria listagem de contatos"
```

---

## Tarefa 11: Modal de novo contato

**Arquivos:**
- Criar: `components/contatos/modal-novo-contato.tsx`

- [ ] **Passo 1: Criar `components/contatos/modal-novo-contato.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { criarContato } from '@/app/(dashboard)/contatos/actions'
import { Plus } from 'lucide-react'

export function ModalNovoContato() {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    try {
      await criarContato(formData)
      setAberto(false)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar contato.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" />Novo Contato</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Contato</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input id="nome" name="nome" placeholder="João Silva" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" placeholder="joao@email.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input id="cargo" name="cargo" placeholder="Ex: Diretor" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa_nome">Empresa</Label>
              <Input id="empresa_nome" name="empresa_nome" placeholder="Nome da empresa" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" name="observacoes" placeholder="Contexto do contato..." rows={3} />
          </div>
          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar Contato'}
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
npx tsc --noEmit
```

- [ ] **Passo 3: Commit**

```bash
git add components/contatos/modal-novo-contato.tsx
git commit -m "feat: cria modal de novo contato"
```

---

## Tarefa 12: Página de detalhe do contato

**Arquivos:**
- Criar: `app/(dashboard)/contatos/[id]/page.tsx`
- Criar: `components/contatos/form-observacao-contato.tsx`

- [ ] **Passo 1: Criar `components/contatos/form-observacao-contato.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { adicionarObservacaoContato } from '@/app/(dashboard)/contatos/actions'

export function FormObservacaoContato({ contatoId }: { contatoId: string }) {
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit() {
    if (!texto.trim()) return
    setCarregando(true)
    try {
      await adicionarObservacaoContato(contatoId, texto.trim())
      setTexto('')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escreva uma observação sobre este contato..."
        rows={3}
      />
      <Button onClick={handleSubmit} disabled={carregando || !texto.trim()} size="sm">
        {carregando ? 'Salvando...' : 'Adicionar'}
      </Button>
    </div>
  )
}
```

- [ ] **Passo 2: Criar `app/(dashboard)/contatos/[id]/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TimelineAtividades } from '@/components/shared/timeline-atividades'
import { FormObservacaoContato } from '@/components/contatos/form-observacao-contato'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import type { Contact, Company, Profile } from '@/types/database'

type ContatoCompleto = Contact & {
  empresa: Pick<Company, 'id' | 'nome'> | null
  responsavel: Pick<Profile, 'id' | 'nome'> | null
}

export default async function ContatoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: contato } = await supabase
    .from('contacts')
    .select('*, empresa:companies!empresa_id(id, nome), responsavel:profiles!responsavel_id(id, nome)')
    .eq('id', id)
    .single() as { data: ContatoCompleto | null }

  if (!contato) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/contatos">
          <Button variant="ghost" size="sm" className="gap-1 pl-0 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
            Contatos
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{contato.nome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {contato.cargo && (
                <div>
                  <p className="text-xs text-slate-500">Cargo</p>
                  <p className="font-medium">{contato.cargo}</p>
                </div>
              )}
              {contato.empresa && (
                <div>
                  <p className="text-xs text-slate-500">Empresa</p>
                  <p className="font-medium">{contato.empresa.nome}</p>
                </div>
              )}
              {contato.telefone && (
                <div>
                  <p className="text-xs text-slate-500">Telefone</p>
                  <p className="font-medium">{contato.telefone}</p>
                </div>
              )}
              {contato.email && (
                <div>
                  <p className="text-xs text-slate-500">E-mail</p>
                  <p className="font-medium">{contato.email}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Responsável</p>
                <p className="font-medium">{contato.responsavel?.nome ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cadastrado em</p>
                <p className="font-medium">{format(new Date(contato.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              {contato.observacoes && (
                <div>
                  <p className="text-xs text-slate-500">Observações</p>
                  <p className="text-slate-700">{contato.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar observação</CardTitle>
            </CardHeader>
            <CardContent>
              <FormObservacaoContato contatoId={contato.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineAtividades contatoId={contato.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Passo 3: Verificar TypeScript sem erros**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Passo 4: Verificar ESLint**

```bash
npm run lint
```

Esperado: zero erros.

- [ ] **Passo 5: Iniciar o servidor e testar o fluxo completo**

```bash
npm run dev
```

Verificar:
1. `/leads` — tabela de leads abre, filtros funcionam
2. "Novo Lead" — modal abre, formulário correto, criação redireciona para detalhe
3. `/leads/[id]` — perfil do lead mostra dados e timeline
4. "Converter em Contato" — modal abre, conversão redireciona para `/contatos/[id]`
5. "Descartar Lead" — status muda, botão desaparece
6. `/contatos` — tabela de contatos aparece com empresa
7. "Novo Contato" — modal funciona, empresa criada automaticamente
8. `/contatos/[id]` — perfil do contato com timeline

- [ ] **Passo 6: Commit final**

```bash
git add app/'(dashboard)'/contatos/  components/contatos/
git commit -m "feat: cria paginas de detalhe de lead e contato"
```

---

## Verificação Final da Fase 2

- [ ] Tabela de leads com filtros por status, origem e responsável
- [ ] Busca por nome, telefone ou e-mail
- [ ] Alerta visual (ponto âmbar) para leads sem interação > 7 dias
- [ ] Cadastro manual de leads via modal
- [ ] Página de detalhe do lead com dados e timeline de atividades
- [ ] Adição de observações no lead registradas na timeline
- [ ] Conversão de lead em contato com criação automática de empresa
- [ ] Descarte de lead registrado na timeline
- [ ] Listagem de contatos com empresa vinculada
- [ ] Cadastro de contato via modal (empresa criada/reutilizada automaticamente)
- [ ] Página de detalhe do contato com timeline
- [ ] Navegação extraída para `lib/navegacao.ts` (sem duplicação)

---

## Próximas Fases

| Fase | Plano |
|---|---|
| **Fase 3** | `2026-05-10-fase-3-distribuicao-leads.md` — Distribuição automática de leads |
| **Fase 4** | `2026-05-10-fase-4-pipeline-kanban.md` — Pipeline Kanban com tempo real |
| **Fase 5** | `2026-05-10-fase-5-tarefas.md` — Tarefas e follow-ups |

---

*Plano criado em 10/05/2026. Spec de referência: `docs/superpowers/specs/2026-05-09-boot-crm-design.md`*
