# Fase 1 — Base do Sistema: Autenticação, Usuários e Layout

> **Para agentes autônomos:** SUB-SKILL OBRIGATÓRIA: Use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar este plano tarefa a tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Objetivo:** Criar a estrutura base do BOOT-CRM com projeto Next.js configurado, banco de dados completo no Supabase, autenticação por e-mail/senha, layout da aplicação 100% em português e gestão de usuários com 6 perfis de acesso.

**Arquitetura:** Next.js 15 App Router com Server Actions gerencia toda a lógica de negócio no servidor. O Supabase cuida de autenticação, banco de dados PostgreSQL e Row Level Security (RLS) que isola dados por organização automaticamente. O middleware do Next.js protege todas as rotas do dashboard redirecionando usuários não autenticados para o login.

**Tech Stack:** Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui · @supabase/ssr · @supabase/supabase-js

---

## Estrutura de Arquivos

```
boot-crm/
├── .env.local                                    # Chaves do Supabase (nunca commitar)
├── middleware.ts                                 # Proteção de rotas + refresh de sessão
├── supabase/
│   └── migrations/
│       └── 001_schema_completo.sql              # Todas as tabelas + RLS policies
├── lib/
│   └── supabase/
│       ├── client.ts                            # Cliente para componentes do browser
│       ├── server.ts                            # Cliente para Server Actions
│       └── admin.ts                             # Cliente com service role (criação de usuários)
├── types/
│   └── database.ts                              # Tipos TypeScript espelhando o banco
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx                          # Menu lateral (visível em telas md+)
│   │   ├── sidebar-mobile.tsx                   # Menu lateral para mobile via Sheet
│   │   ├── header.tsx                           # Barra superior com usuário e badge
│   │   └── botao-sair.tsx                       # Botão de logout (Client Component)
│   └── usuarios/
│       ├── lista-usuarios.tsx                   # Tabela de usuários
│       ├── modal-novo-usuario.tsx               # Modal de criação de usuário
│       └── badge-perfil.tsx                     # Badge colorido do perfil (Admin, Gestor...)
└── app/
    ├── layout.tsx                               # Layout raiz HTML
    ├── page.tsx                                 # Redireciona / → /painel
    ├── (auth)/
    │   ├── layout.tsx                           # Layout centralizado para login
    │   └── login/
    │       ├── page.tsx                         # Página de login
    │       └── actions.ts                       # Server Actions: entrar, sair
    └── (dashboard)/
        ├── layout.tsx                           # Layout com sidebar + header
        ├── painel/
        │   └── page.tsx                         # Dashboard principal (placeholder)
        └── configuracoes/
            └── usuarios/
                ├── page.tsx                     # Página de gestão de usuários
                └── actions.ts                   # Server Actions: criar, ativar/desativar
```

---

## Tarefa 1: Criar o projeto Next.js 15

**Arquivos:** Todos os arquivos base do projeto (criados automaticamente)

- [ ] **Passo 1: Abrir o terminal e navegar até a pasta onde o projeto será criado**

```bash
cd ~/Documents
```

- [ ] **Passo 2: Criar o projeto Next.js com todas as opções corretas**

```bash
npx create-next-app@latest boot-crm --typescript --tailwind --eslint --app --src-dir no --import-alias "@/*"
```

Quando perguntar, responda:
- Would you like to use Turbopack? → **No**

- [ ] **Passo 3: Entrar na pasta do projeto**

```bash
cd boot-crm
```

- [ ] **Passo 4: Instalar as dependências do Supabase**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Passo 5: Verificar que o projeto inicia corretamente**

```bash
npm run dev
```

Abrir `http://localhost:3000` no navegador. Deve aparecer a página padrão do Next.js.
Parar o servidor com `Ctrl + C`.

- [ ] **Passo 6: Commit inicial**

```bash
git add .
git commit -m "feat: inicializa projeto Next.js 15 com TypeScript e Tailwind"
```

---

## Tarefa 2: Configurar projeto no Supabase

**Arquivos:** `.env.local`

- [ ] **Passo 1: Criar conta e projeto no Supabase**

1. Acessar [supabase.com](https://supabase.com) e criar conta gratuita
2. Clicar em "New project"
3. Nome do projeto: `boot-crm`
4. Senha do banco: criar uma senha forte e guardar em local seguro
5. Região: `South America (São Paulo)`
6. Clicar em "Create new project" e aguardar ~2 minutos

- [ ] **Passo 2: Obter as chaves do projeto**

No painel do Supabase:
1. Clicar em "Project Settings" (ícone de engrenagem no menu lateral)
2. Clicar em "API"
3. Copiar:
   - **Project URL** (ex: `https://abcdefgh.supabase.co`)
   - **anon public** key (chave longa que começa com `eyJ...`)

- [ ] **Passo 3: Criar o arquivo de variáveis de ambiente**

Criar o arquivo `.env.local` na raiz do projeto:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

Substituir pelos valores reais copiados no passo anterior.

- [ ] **Passo 4: Obter também a Service Role Key (necessária para criar usuários)**

No painel do Supabase, ainda em "Project Settings" → "API":
- Copiar a chave **service_role** (atenção: esta chave tem acesso total ao banco — nunca expor no frontend)

Adicionar ao `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui
```

- [ ] **Passo 5: Garantir que .env.local não será commitado**

Verificar que `.gitignore` já contém `.env.local` (o Next.js adiciona automaticamente).

```bash
grep ".env.local" .gitignore
```

Saída esperada: `.env.local`

- [ ] **Passo 6: Commit**

```bash
git add .gitignore
git commit -m "chore: configura variaveis de ambiente do Supabase"
```

---

## Tarefa 3: Criar o schema completo do banco de dados

**Arquivos:** `supabase/migrations/001_schema_completo.sql`

- [ ] **Passo 1: Criar a pasta de migrations**

```bash
mkdir -p supabase/migrations
```

- [ ] **Passo 2: Criar o arquivo de migration com o schema completo**

Criar `supabase/migrations/001_schema_completo.sql`:

```sql
-- ============================================================
-- BOOT-CRM — Schema Completo V1
-- Executar no Supabase SQL Editor
-- ============================================================

-- Habilitar extensão para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- ORGANIZAÇÕES (Multi-tenancy)
-- ============================================================
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  slug text unique not null,
  plano text not null default 'basico',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Inserir a Boot Digital como organização padrão
insert into organizations (nome, slug) values ('Boot Digital', 'boot-digital');

-- ============================================================
-- PERFIS DE USUÁRIO
-- ============================================================
create type user_role as enum ('admin', 'gestor', 'vendedor', 'atendimento', 'financeiro', 'suporte');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  nome text not null,
  email text not null,
  telefone text,
  cargo user_role not null default 'vendedor',
  disponivel boolean not null default true,
  ativo boolean not null default true,
  ultimo_status_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- LEADS
-- ============================================================
create type lead_origem as enum ('whatsapp', 'instagram_lead_ad', 'facebook_lead_ad', 'site', 'indicacao', 'evento', 'manual');
create type lead_status as enum ('novo', 'em_atendimento', 'qualificado', 'descartado');

create table leads (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text,
  email text,
  telefone text,
  empresa text,
  origem lead_origem not null default 'manual',
  status lead_status not null default 'novo',
  responsavel_id uuid references profiles(id),
  foto_perfil_url text,
  contato_anterior_id uuid references leads(id),
  whatsapp_instance_id uuid, -- FK adicionada via ALTER TABLE após criação de whatsapp_instances
  observacoes text,
  ultima_interacao_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- EMPRESAS E CONTATOS
-- ============================================================
create table companies (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  cnpj text,
  site text,
  telefone text,
  endereco text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table contacts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  email text,
  telefone text,
  cargo text,
  empresa_id uuid references companies(id),
  responsavel_id uuid references profiles(id),
  foto_perfil_url text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- PIPELINE DE VENDAS
-- ============================================================
create table pipelines (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  descricao text,
  padrao boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  nome text not null,
  ordem int not null,
  cor text not null default '#6366f1',
  oculto boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table deals (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  titulo text not null,
  valor_estimado numeric(12,2),
  contato_id uuid references contacts(id),
  responsavel_id uuid references profiles(id),
  pipeline_id uuid not null references pipelines(id),
  estagio_id uuid not null references pipeline_stages(id),
  data_fechamento_prevista date,
  origem_lead lead_origem,
  motivo_perda text,
  ganho boolean,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- TAREFAS E ATIVIDADES
-- ============================================================
create type task_tipo as enum ('ligacao', 'email', 'reuniao', 'whatsapp');

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  titulo text not null,
  descricao text,
  tipo task_tipo not null default 'ligacao',
  data_vencimento timestamptz,
  concluida boolean not null default false,
  responsavel_id uuid not null references profiles(id),
  lead_id uuid references leads(id),
  contato_id uuid references contacts(id),
  deal_id uuid references deals(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table activities (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  tipo text not null,
  descricao text not null,
  lead_id uuid references leads(id),
  deal_id uuid references deals(id),
  contato_id uuid references contacts(id),
  autor_id uuid not null references profiles(id),
  criado_em timestamptz not null default now()
  -- Sem atualizado_em: registros de atividade são imutáveis
);

-- ============================================================
-- WHATSAPP
-- ============================================================
create type whatsapp_status as enum ('conectado', 'desconectado', 'aguardando_qr');
create type message_direcao as enum ('enviada', 'recebida');
create type message_tipo_midia as enum ('texto', 'audio', 'imagem', 'documento', 'sticker', 'localizacao');
create type message_status as enum ('enviada', 'entregue', 'lida', 'falhou');

create table whatsapp_instances (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  numero text,
  evolution_instance_name text unique,
  vendedor_id uuid references profiles(id),
  compartilhado boolean not null default false,
  status_conexao whatsapp_status not null default 'desconectado',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table conversations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  whatsapp_instance_id uuid not null references whatsapp_instances(id),
  lead_id uuid references leads(id),
  contato_id uuid references contacts(id),
  telefone_externo text not null,
  ultima_mensagem_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  conversation_id uuid not null references conversations(id),
  message_id_externo text unique,
  direcao message_direcao not null,
  tipo_midia message_tipo_midia not null default 'texto',
  conteudo text,
  url_midia text,
  telefone_remetente text,
  telefone_destinatario text,
  responsavel_id uuid references profiles(id),
  status message_status not null default 'enviada',
  enviado_em timestamptz not null default now(),
  entregue_em timestamptz,
  lida_em timestamptz
);

create table message_templates (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  conteudo text not null,
  categoria text,
  criado_por uuid not null references profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table conversation_exports (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  conversation_id uuid not null references conversations(id),
  lead_id uuid references leads(id),
  exportado_por uuid not null references profiles(id),
  formato text not null check (formato in ('png', 'txt')),
  periodo_inicio timestamptz,
  periodo_fim timestamptz,
  total_mensagens int,
  criado_em timestamptz not null default now()
);

-- ============================================================
-- ORÇAMENTOS
-- ============================================================
create type quote_status as enum (
  'rascunho',
  'aguardando_aprovacao_interna',
  'aprovado_internamente',
  'rejeitado_internamente',
  'enviado_ao_cliente',
  'aprovado_pelo_cliente',
  'recusado_pelo_cliente'
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  nome text not null,
  descricao text,
  preco_unitario numeric(12,2) not null default 0,
  unidade text not null default 'un',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table quotes (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  numero serial,
  lead_id uuid references leads(id),
  deal_id uuid references deals(id),
  responsavel_id uuid not null references profiles(id),
  status quote_status not null default 'rascunho',
  valor_subtotal numeric(12,2) not null default 0,
  desconto_geral numeric(5,2) not null default 0,
  valor_total numeric(12,2) not null default 0,
  aprovacao_interna_por uuid references profiles(id),
  aprovacao_interna_em timestamptz,
  aprovacao_interna_comentario text,
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table quote_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  product_id uuid references products(id),
  descricao text not null,
  quantidade numeric(10,3) not null default 1,
  preco_unitario numeric(12,2) not null,
  desconto_item numeric(5,2) not null default 0,
  subtotal numeric(12,2) not null
);

-- ============================================================
-- CONFIGURAÇÕES DO SISTEMA
-- ============================================================
create type distribuicao_modo as enum ('manual', 'rotativo', 'por_carga');

create table lead_distribution_config (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid unique not null references organizations(id),
  modo distribuicao_modo not null default 'manual',
  apenas_disponiveis boolean not null default false,
  limite_por_vendedor int,
  proximo_vendedor_idx int not null default 0,
  atualizado_por uuid references profiles(id),
  atualizado_em timestamptz not null default now()
);

create table system_config (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  chave text not null,
  valor text not null,
  tipo_valor text not null check (tipo_valor in ('texto', 'numero', 'booleano', 'json')),
  descricao text,
  atualizado_por uuid references profiles(id),
  atualizado_em timestamptz not null default now(),
  unique(organization_id, chave)
);

-- ============================================================
-- LOG DE AUDITORIA (imutável)
-- ============================================================
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  usuario_id uuid references profiles(id),
  acao text not null,
  tabela_afetada text,
  registro_id uuid,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ip text,
  criado_em timestamptz not null default now()
  -- Sem atualizado_em: log é imutável
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
create index on leads(organization_id, responsavel_id);
create index on leads(organization_id, status);
create index on leads(organization_id, criado_em desc);
create index on deals(organization_id, responsavel_id);
create index on deals(organization_id, estagio_id);
create index on tasks(organization_id, responsavel_id, concluida);
create index on tasks(data_vencimento) where concluida = false;
create index on activities(organization_id, lead_id);
create index on activities(organization_id, deal_id);
create index on messages(conversation_id, enviado_em);
create index on messages(message_id_externo);
create index on audit_logs(organization_id, criado_em desc);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table leads enable row level security;
alter table contacts enable row level security;
alter table companies enable row level security;
alter table pipelines enable row level security;
alter table pipeline_stages enable row level security;
alter table deals enable row level security;
alter table tasks enable row level security;
alter table activities enable row level security;
alter table whatsapp_instances enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table message_templates enable row level security;
alter table conversation_exports enable row level security;
alter table products enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table lead_distribution_config enable row level security;
alter table system_config enable row level security;
alter table audit_logs enable row level security;

-- Função auxiliar: retorna organization_id do usuário autenticado
-- SECURITY DEFINER necessário para evitar recursão infinita no RLS de profiles
create or replace function get_organization_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select organization_id from profiles where id = auth.uid()
$$;

-- Função auxiliar: retorna cargo do usuário autenticado
-- SECURITY DEFINER necessário para evitar recursão infinita no RLS de profiles
create or replace function get_user_role()
returns user_role
language sql
stable
security definer set search_path = public
as $$
  select cargo from profiles where id = auth.uid()
$$;

-- Políticas gerais (usuário vê apenas dados da sua organização)
create policy "usuarios veem sua organizacao" on profiles
  for all using (organization_id = get_organization_id());

create policy "leads da organizacao" on leads
  for all using (organization_id = get_organization_id());

create policy "contatos da organizacao" on contacts
  for all using (organization_id = get_organization_id());

create policy "empresas da organizacao" on companies
  for all using (organization_id = get_organization_id());

create policy "pipelines da organizacao" on pipelines
  for all using (organization_id = get_organization_id());

create policy "etapas da organizacao" on pipeline_stages
  for all using (organization_id = get_organization_id());

create policy "negociacoes da organizacao" on deals
  for all using (organization_id = get_organization_id());

create policy "tarefas da organizacao" on tasks
  for all using (organization_id = get_organization_id());

-- Atividades: qualquer um pode inserir, ninguém pode editar ou excluir
create policy "inserir atividades" on activities
  for insert with check (organization_id = get_organization_id());
create policy "ver atividades" on activities
  for select using (organization_id = get_organization_id());

create policy "whatsapp da organizacao" on whatsapp_instances
  for all using (organization_id = get_organization_id());

create policy "conversas da organizacao" on conversations
  for all using (organization_id = get_organization_id());

create policy "mensagens da organizacao" on messages
  for all using (organization_id = get_organization_id());

create policy "templates da organizacao" on message_templates
  for all using (organization_id = get_organization_id());

create policy "exportacoes da organizacao" on conversation_exports
  for all using (organization_id = get_organization_id());

create policy "produtos da organizacao" on products
  for all using (organization_id = get_organization_id());

create policy "orcamentos da organizacao" on quotes
  for all using (organization_id = get_organization_id());

create policy "itens de orcamento" on quote_items
  for all using (
    quote_id in (select id from quotes where organization_id = get_organization_id())
  );

create policy "config distribuicao da organizacao" on lead_distribution_config
  for all using (organization_id = get_organization_id());

create policy "config sistema da organizacao" on system_config
  for all using (organization_id = get_organization_id());

-- Audit logs: inserir permitido, excluir BLOQUEADO para todos incluindo admin
create policy "inserir audit log" on audit_logs
  for insert with check (organization_id = get_organization_id());
create policy "ver audit log" on audit_logs
  for select using (organization_id = get_organization_id());

-- Organizations: leitura pública (necessário para trigger e funções auxiliares)
create policy "ver organizacoes" on organizations
  for select using (true);

-- FK de whatsapp_instance_id em leads (adicionada após criar whatsapp_instances)
alter table leads
  add constraint leads_whatsapp_instance_id_fkey
  foreign key (whatsapp_instance_id) references whatsapp_instances(id);

-- ============================================================
-- TRIGGER: criar perfil automaticamente após cadastro
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  org_id uuid;
begin
  -- Pegar a organização padrão (Boot Digital)
  select id into org_id from organizations where slug = 'boot-digital' limit 1;

  insert into profiles (id, organization_id, nome, email, cargo)
  values (
    new.id,
    org_id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'cargo')::user_role, 'vendedor')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- DADOS INICIAIS
-- ============================================================

-- Pipeline padrão com as 7 etapas
insert into pipelines (organization_id, nome, padrao)
select id, 'Principal', true from organizations where slug = 'boot-digital';

insert into pipeline_stages (organization_id, pipeline_id, nome, ordem, cor)
select
  p.organization_id,
  p.id,
  etapa.nome,
  etapa.ordem,
  etapa.cor
from pipelines p
cross join (values
  ('Novo Lead', 1, '#6366f1'),
  ('Primeiro Contato', 2, '#8b5cf6'),
  ('Diagnóstico', 3, '#f59e0b'),
  ('Proposta Enviada', 4, '#3b82f6'),
  ('Negociação', 5, '#f97316'),
  ('Fechado', 6, '#22c55e'),
  ('Perdido', 7, '#ef4444')
) as etapa(nome, ordem, cor)
where p.padrao = true;

-- Configuração padrão de distribuição
insert into lead_distribution_config (organization_id, modo)
select id, 'manual' from organizations where slug = 'boot-digital';

-- Configurações iniciais do sistema
insert into system_config (organization_id, chave, valor, tipo_valor, descricao)
select
  o.id,
  cfg.chave,
  cfg.valor,
  cfg.tipo,
  cfg.descricao
from organizations o
cross join (values
  ('visibilidade_historico_conversa', 'completo', 'texto', 'Nível de visibilidade do histórico de conversas para vendedores'),
  ('alerta_offline_minutos', '30', 'numero', 'Minutos offline para disparar alerta ao gestor'),
  ('dias_alerta_sem_interacao', '7', 'numero', 'Dias sem interação para destacar lead em vermelho')
) as cfg(chave, valor, tipo, descricao)
where o.slug = 'boot-digital';
```

- [ ] **Passo 3: Executar o schema no Supabase**

1. No painel do Supabase, clicar em "SQL Editor" no menu lateral
2. Clicar em "New query"
3. Colar todo o conteúdo do arquivo `001_schema_completo.sql`
4. Clicar em "Run" (ou `Ctrl + Enter`)
5. Verificar que a mensagem de sucesso aparece sem erros

- [ ] **Passo 4: Promover o primeiro usuário a administrador**

O trigger cria todos os perfis como 'vendedor' por padrão. Antes de criar qualquer usuário pela interface, execute este SQL no Supabase para promover o seu próprio e-mail a admin assim que criar sua conta:

```sql
-- Executar APÓS criar sua conta no Supabase Authentication
-- Substitua pelo seu e-mail real
UPDATE profiles SET cargo = 'admin' WHERE email = 'seu@email.com';
```

> **Importante:** Execute este comando logo após criar a primeira conta. Sem isso, a página `/configuracoes/usuarios` ficará inacessível.

- [ ] **Passo 5: Configurar política de senha no Supabase**

No painel do Supabase:
1. Ir em "Authentication" → "Providers" → "Email"
2. Em "Password" → habilitar "Enable minimum password length"
3. Definir comprimento mínimo: `8`

- [ ] **Passo 6: Verificar as tabelas criadas**

No painel do Supabase, clicar em "Table Editor". As seguintes tabelas devem aparecer:
`organizations`, `profiles`, `leads`, `contacts`, `companies`, `pipelines`, `pipeline_stages`, `deals`, `tasks`, `activities`, `whatsapp_instances`, `conversations`, `messages`, `message_templates`, `conversation_exports`, `products`, `quotes`, `quote_items`, `lead_distribution_config`, `system_config`, `audit_logs`

- [ ] **Passo 7: Commit**

```bash
git add supabase/
git commit -m "feat: cria schema completo do banco de dados com RLS"
```

---

## Tarefa 4: Configurar os clientes Supabase e tipos TypeScript

**Arquivos:** `types/database.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`

- [ ] **Passo 1: Criar os tipos TypeScript do banco de dados**

Criar `types/database.ts`:

```typescript
// Tipos que espelham o schema do Supabase (001_schema_completo.sql)
// Para regenerar via CLI: npx supabase gen types typescript --project-id SEU-ID > types/database.ts

export type UserRole = 'admin' | 'gestor' | 'vendedor' | 'atendimento' | 'financeiro' | 'suporte'
export type LeadOrigem = 'whatsapp' | 'instagram_lead_ad' | 'facebook_lead_ad' | 'site' | 'indicacao' | 'evento' | 'manual'
export type LeadStatus = 'novo' | 'em_atendimento' | 'qualificado' | 'descartado'
export type TaskTipo = 'ligacao' | 'email' | 'reuniao' | 'whatsapp'
export type WhatsappStatus = 'conectado' | 'desconectado' | 'aguardando_qr'
export type MessageDirecao = 'enviada' | 'recebida'
export type MessageTipoMidia = 'texto' | 'audio' | 'imagem' | 'documento' | 'sticker' | 'localizacao'
export type MessageStatus = 'enviada' | 'entregue' | 'lida' | 'falhou'
export type DistribuicaoModo = 'manual' | 'rotativo' | 'por_carga'
export type QuoteStatus =
  | 'rascunho'
  | 'aguardando_aprovacao_interna'
  | 'aprovado_internamente'
  | 'rejeitado_internamente'
  | 'enviado_ao_cliente'
  | 'aprovado_pelo_cliente'
  | 'recusado_pelo_cliente'

export type Organization = {
  id: string
  nome: string
  slug: string
  plano: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type Profile = {
  id: string
  organization_id: string
  nome: string
  email: string
  telefone: string | null
  cargo: UserRole
  disponivel: boolean
  ativo: boolean
  ultimo_status_em: string | null
  criado_em: string
  atualizado_em: string
}

export type Lead = {
  id: string
  organization_id: string
  nome: string | null
  email: string | null
  telefone: string | null
  empresa: string | null
  origem: LeadOrigem
  status: LeadStatus
  responsavel_id: string | null
  foto_perfil_url: string | null
  contato_anterior_id: string | null
  whatsapp_instance_id: string | null
  observacoes: string | null
  ultima_interacao_em: string | null
  criado_em: string
  atualizado_em: string
}

export type Company = {
  id: string
  organization_id: string
  nome: string
  cnpj: string | null
  site: string | null
  telefone: string | null
  endereco: string | null
  criado_em: string
  atualizado_em: string
}

export type Contact = {
  id: string
  organization_id: string
  nome: string
  email: string | null
  telefone: string | null
  cargo: string | null
  empresa_id: string | null
  responsavel_id: string | null
  foto_perfil_url: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
}

export type Pipeline = {
  id: string
  organization_id: string
  nome: string
  descricao: string | null
  padrao: boolean
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type PipelineStage = {
  id: string
  organization_id: string
  pipeline_id: string
  nome: string
  ordem: number
  cor: string
  oculto: boolean
  criado_em: string
  atualizado_em: string
}

export type Deal = {
  id: string
  organization_id: string
  titulo: string
  valor_estimado: number | null
  contato_id: string | null
  responsavel_id: string | null
  pipeline_id: string
  estagio_id: string
  data_fechamento_prevista: string | null
  origem_lead: LeadOrigem | null
  motivo_perda: string | null
  ganho: boolean | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
}

export type Task = {
  id: string
  organization_id: string
  titulo: string
  descricao: string | null
  tipo: TaskTipo
  data_vencimento: string | null
  concluida: boolean
  responsavel_id: string
  lead_id: string | null
  contato_id: string | null
  deal_id: string | null
  criado_em: string
  atualizado_em: string
}

export type Activity = {
  id: string
  organization_id: string
  tipo: string
  descricao: string
  lead_id: string | null
  deal_id: string | null
  contato_id: string | null
  autor_id: string
  criado_em: string
}

export type WhatsappInstance = {
  id: string
  organization_id: string
  nome: string
  numero: string | null
  evolution_instance_name: string | null
  vendedor_id: string | null
  compartilhado: boolean
  status_conexao: WhatsappStatus
  criado_em: string
  atualizado_em: string
}

export type Conversation = {
  id: string
  organization_id: string
  whatsapp_instance_id: string
  lead_id: string | null
  contato_id: string | null
  telefone_externo: string
  ultima_mensagem_em: string | null
  criado_em: string
  atualizado_em: string
}

export type Message = {
  id: string
  organization_id: string
  conversation_id: string
  message_id_externo: string | null
  direcao: MessageDirecao
  tipo_midia: MessageTipoMidia
  conteudo: string | null
  url_midia: string | null
  telefone_remetente: string | null
  telefone_destinatario: string | null
  responsavel_id: string | null
  status: MessageStatus
  enviado_em: string
  entregue_em: string | null
  lida_em: string | null
}

export type MessageTemplate = {
  id: string
  organization_id: string
  nome: string
  conteudo: string
  categoria: string | null
  criado_por: string
  criado_em: string
  atualizado_em: string
}

export type ConversationExport = {
  id: string
  organization_id: string
  conversation_id: string
  lead_id: string | null
  exportado_por: string
  formato: 'png' | 'txt'
  periodo_inicio: string | null
  periodo_fim: string | null
  total_mensagens: number | null
  criado_em: string
}

export type Product = {
  id: string
  organization_id: string
  nome: string
  descricao: string | null
  preco_unitario: number
  unidade: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type Quote = {
  id: string
  organization_id: string
  numero: number
  lead_id: string | null
  deal_id: string | null
  responsavel_id: string
  status: QuoteStatus
  valor_subtotal: number
  desconto_geral: number
  valor_total: number
  aprovacao_interna_por: string | null
  aprovacao_interna_em: string | null
  aprovacao_interna_comentario: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
}

export type QuoteItem = {
  id: string
  quote_id: string
  product_id: string | null
  descricao: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
  subtotal: number
}

export type LeadDistributionConfig = {
  id: string
  organization_id: string
  modo: DistribuicaoModo
  apenas_disponiveis: boolean
  limite_por_vendedor: number | null
  proximo_vendedor_idx: number
  atualizado_por: string | null
  atualizado_em: string
}

export type SystemConfig = {
  id: string
  organization_id: string
  chave: string
  valor: string
  tipo_valor: 'texto' | 'numero' | 'booleano' | 'json'
  descricao: string | null
  atualizado_por: string | null
  atualizado_em: string
}

export type AuditLog = {
  id: string
  organization_id: string
  usuario_id: string | null
  acao: string
  tabela_afetada: string | null
  registro_id: string | null
  dados_anteriores: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
  ip: string | null
  criado_em: string
}
```

- [ ] **Passo 2: Criar a pasta e o cliente para o browser**

Criar `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Passo 3: Criar o cliente administrativo (usa Service Role Key — somente servidor)**

Criar `lib/supabase/admin.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

// Este cliente usa a service role key — NUNCA importar em Client Components
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

- [ ] **Passo 4: Criar o cliente para Server Actions**

Criar `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies só podem ser setados em Server Actions
          }
        },
      },
    }
  )
}
```

- [ ] **Passo 5: Verificar que não há erros de TypeScript**

```bash
npx tsc --noEmit
```

Saída esperada: nenhum erro.

- [ ] **Passo 6: Commit**

```bash
git add lib/ types/
git commit -m "feat: configura clientes Supabase e tipos TypeScript do banco"
```

---

## Tarefa 5: Configurar middleware de proteção de rotas

**Arquivos:** `middleware.ts`

- [ ] **Passo 1: Criar o middleware**

Criar `middleware.ts` na raiz do projeto:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname.startsWith('/login')
  const isPublicRoute = isLoginPage

  // Usuário não autenticado tentando acessar rota protegida
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Usuário autenticado tentando acessar login
  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/painel'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Passo 2: Criar redirecionamento da raiz**

Criar `app/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/painel')
}
```

- [ ] **Passo 3: Verificar que não há erros**

```bash
npx tsc --noEmit
```

- [ ] **Passo 4: Commit**

```bash
git add middleware.ts app/page.tsx
git commit -m "feat: configura middleware de protecao de rotas"
```

---

## Tarefa 6: Instalar e configurar shadcn/ui

**Arquivos:** `components/ui/` (gerado automaticamente)

- [ ] **Passo 1: Inicializar o shadcn/ui**

```bash
npx shadcn@latest init
```

Com Tailwind v4 (instalado neste projeto), o CLI faz apenas **uma** pergunta:
- Which style would you like to use? → **Default**

As perguntas sobre cor base e CSS variables **não aparecem** no Tailwind v4 — o CLI detecta automaticamente e configura tudo sozinho.

- [ ] **Passo 2: Instalar os componentes necessários para a Fase 1**

```bash
npx shadcn@latest add button input label card badge dialog select toast avatar dropdown-menu separator sheet
```

- [ ] **Passo 3: Verificar que os componentes foram criados**

```bash
ls components/ui/
```

Saída esperada: lista com `button.tsx`, `input.tsx`, `label.tsx`, etc.

- [ ] **Passo 4: Commit**

```bash
git add .
git commit -m "feat: instala e configura shadcn/ui com componentes base"
```

---

## Tarefa 7: Criar o layout base (sidebar e header)

**Arquivos:** `components/layout/sidebar.tsx`, `components/layout/header.tsx`, `components/layout/botao-sair.tsx`, `app/(dashboard)/layout.tsx`, `app/(auth)/layout.tsx`

- [ ] **Passo 1: Instalar ícones Lucide (necessário antes de criar os componentes)**

```bash
npm install lucide-react
```

- [ ] **Passo 2: Criar o componente de badge de perfil**

Criar `components/usuarios/badge-perfil.tsx`:

```typescript
import { Badge } from '@/components/ui/badge'
import type { UserRole } from '@/types/database'

const configuracoes: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  admin: { label: 'Administrador', variant: 'destructive' },
  gestor: { label: 'Gestor Comercial', variant: 'default' },
  vendedor: { label: 'Vendedor', variant: 'secondary' },
  atendimento: { label: 'Atendimento', variant: 'outline' },
  financeiro: { label: 'Financeiro', variant: 'secondary' },
  suporte: { label: 'Suporte', variant: 'outline' },
}

export function BadgePerfil({ perfil }: { perfil: UserRole }) {
  const config = configuracoes[perfil]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
```

- [ ] **Passo 3: Criar a sidebar de navegação (desktop)**

Criar `components/layout/sidebar.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, TrendingUp, UserCheck,
  Briefcase, MessageCircle, Inbox, CheckSquare, FileText,
  BarChart2, Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navegacao = [
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

export function Sidebar() {
  const pathname = usePathname()

  return (
    // hidden em mobile, flex em telas md+ (≥768px)
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

- [ ] **Passo 4: Criar a sidebar mobile (Sheet — gaveta lateral)**

Criar `components/layout/sidebar-mobile.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard, Users, TrendingUp, UserCheck,
  Briefcase, MessageCircle, Inbox, CheckSquare, FileText,
  BarChart2, Settings, Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navegacao = [
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

export function SidebarMobile() {
  const [aberto, setAberto] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        {/* Botão hambúrguer: só aparece em mobile (oculto em md+) */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="flex h-16 justify-center border-b px-6">
          <SheetTitle className="text-xl font-bold text-slate-900">BOOT CRM</SheetTitle>
        </SheetHeader>
        <nav className="overflow-y-auto p-4">
          <ul className="space-y-1">
            {navegacao.map((item) => {
              const Icone = item.icone
              const ativo = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setAberto(false)}
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
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Passo 5: Criar o header superior**

Criar `components/layout/header.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { BadgePerfil } from '@/components/usuarios/badge-perfil'
import { SidebarMobile } from '@/components/layout/sidebar-mobile'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BotaoSair } from '@/components/layout/botao-sair'
import type { UserRole } from '@/types/database'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, cargo')
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
      {/* Botão hambúrguer — só renderiza em mobile via SidebarMobile */}
      <SidebarMobile />

      <div className="flex items-center gap-3 md:gap-4">
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

- [ ] **Passo 6: Criar o botão de sair (Client Component separado)**

Criar `components/layout/botao-sair.tsx`:

```typescript
'use client'

import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function BotaoSair() {
  const router = useRouter()
  const supabase = createClient()

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={sair}>
      <LogOut className="h-4 w-4" />
      <span className="ml-2">Sair</span>
    </Button>
  )
}
```

- [ ] **Passo 7: Criar o layout do dashboard**

Criar `app/(dashboard)/layout.tsx`:

```typescript
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar desktop (hidden md:flex definido dentro do componente) */}
      <Sidebar />
      {/* min-w-0 evita overflow em flex no mobile */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Passo 8: Criar o layout de autenticação**

Criar `app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      {children}
    </div>
  )
}
```

- [ ] **Passo 9: Criar página placeholder do painel**

Criar `app/(dashboard)/painel/page.tsx`:

```typescript
export default function PainelPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Painel Principal</h1>
      <p className="mt-2 text-slate-500">
        Bem-vindo ao BOOT CRM. O dashboard completo será construído na Fase 9.
      </p>
    </div>
  )
}
```

- [ ] **Passo 10: Verificar que não há erros**

```bash
npx tsc --noEmit
```

- [ ] **Passo 11: Commit**

```bash
git add .
git commit -m "feat: cria layout responsivo com sidebar desktop e mobile"
```

---

## Tarefa 8: Criar a página de login

**Arquivos:** `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`

- [ ] **Passo 1: Criar o layout raiz**

Substituir o conteúdo de `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BOOT CRM',
  description: 'Sistema de CRM Comercial — Boot Digital',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Passo 2: Criar a Server Action de login**

Criar `app/(auth)/login/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function entrar(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const senha = formData.get('senha') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      redirect('/login?erro=credenciais-invalidas')
    }
    redirect('/login?erro=erro-inesperado')
  }

  redirect('/painel')
}
```

- [ ] **Passo 3: Criar a página de login**

Criar `app/(auth)/login/page.tsx`:

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { entrar } from './actions'

const mensagensErro: Record<string, string> = {
  'credenciais-invalidas': 'E-mail ou senha incorretos. Tente novamente.',
  'erro-inesperado': 'Ocorreu um erro inesperado. Tente novamente.',
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">BOOT CRM</CardTitle>
        <CardDescription>
          Entre com seu e-mail e senha para acessar o sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={entrar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <ErroLogin searchParams={searchParams} />
          <Button type="submit" className="w-full">
            Entrar
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

async function ErroLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const params = await searchParams
  if (!params.erro) return null
  const mensagem = mensagensErro[params.erro] ?? 'Erro ao fazer login.'
  return (
    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
      {mensagem}
    </div>
  )
}
```

- [ ] **Passo 4: Iniciar o servidor de desenvolvimento e testar o login**

```bash
npm run dev
```

1. Acessar `http://localhost:3000` — deve redirecionar para `/login`
2. No painel do Supabase, ir em "Authentication" → "Users" → "Add user" e criar um usuário de teste
3. Tentar fazer login com o usuário criado
4. Deve redirecionar para `/painel` após login bem-sucedido
5. Tentar acessar `/login` com sessão ativa — deve redirecionar para `/painel`

- [ ] **Passo 5: Parar o servidor e fazer commit**

```bash
git add .
git commit -m "feat: cria pagina de login com autenticacao Supabase"
```

---

## Tarefa 9: Criar a página de gestão de usuários

**Arquivos:** `app/(dashboard)/configuracoes/usuarios/page.tsx`, `app/(dashboard)/configuracoes/usuarios/actions.ts`, `components/usuarios/lista-usuarios.tsx`, `components/usuarios/modal-novo-usuario.tsx`

- [ ] **Passo 1: Criar as Server Actions de usuários**

Criar `app/(dashboard)/configuracoes/usuarios/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function criarUsuario(formData: FormData) {
  // Cliente normal: verifica se quem está criando é admin
  const supabase = await createClient()
  const { data: { user: usuarioAtual } } = await supabase.auth.getUser()
  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('cargo')
    .eq('id', usuarioAtual?.id ?? '')
    .single()

  if (perfilAtual?.cargo !== 'admin') {
    throw new Error('Apenas administradores podem criar usuários.')
  }

  const nome = formData.get('nome') as string
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string
  const cargo = formData.get('cargo') as string
  const telefone = formData.get('telefone') as string

  // Cliente admin: necessário para criar usuários via auth.admin
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome, cargo },
  })

  if (error) {
    throw new Error(`Erro ao criar usuário: ${error.message}`)
  }

  // Atualizar telefone no perfil (trigger já criou nome e cargo via handle_new_user)
  if (data.user && telefone) {
    await adminClient
      .from('profiles')
      .update({ telefone, atualizado_em: new Date().toISOString() })
      .eq('id', data.user.id)
  }

  revalidatePath('/configuracoes/usuarios')
}

export async function alternarStatusUsuario(usuarioId: string, ativo: boolean) {
  const supabase = await createClient()

  const { data: { user: usuarioAtual } } = await supabase.auth.getUser()
  const { data: perfilAtual } = await supabase
    .from('profiles')
    .select('cargo')
    .eq('id', usuarioAtual?.id ?? '')
    .single()

  if (perfilAtual?.cargo !== 'admin') {
    throw new Error('Apenas administradores podem alterar status de usuários.')
  }

  await supabase
    .from('profiles')
    .update({ ativo, atualizado_em: new Date().toISOString() })
    .eq('id', usuarioId)

  revalidatePath('/configuracoes/usuarios')
}
```

- [ ] **Passo 2: Criar o componente de modal de novo usuário**

Criar `components/usuarios/modal-novo-usuario.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { criarUsuario } from '@/app/(dashboard)/configuracoes/usuarios/actions'
import { Plus } from 'lucide-react'

const perfis = [
  { valor: 'admin', label: 'Administrador' },
  { valor: 'gestor', label: 'Gestor Comercial' },
  { valor: 'vendedor', label: 'Vendedor' },
  { valor: 'atendimento', label: 'Atendimento' },
  { valor: 'financeiro', label: 'Financeiro' },
  { valor: 'suporte', label: 'Suporte' },
]

export function ModalNovoUsuario() {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  // Select do shadcn/ui não serializa no FormData nativamente — usar estado controlado
  const [cargoSelecionado, setCargoSelecionado] = useState('')

  async function handleSubmit(formData: FormData) {
    if (!cargoSelecionado) {
      setErro('Selecione o perfil de acesso.')
      return
    }
    formData.set('cargo', cargoSelecionado)
    setCarregando(true)
    setErro(null)
    try {
      await criarUsuario(formData)
      setAberto(false)
      setCargoSelecionado('')
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao criar usuário.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" name="nome" placeholder="João Silva" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" placeholder="joao@bootdigital.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" name="telefone" placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-2">
            <Label>Perfil de acesso</Label>
            {/* Select do shadcn/ui não serializa no FormData — valor controlado via estado */}
            <Select value={cargoSelecionado} onValueChange={setCargoSelecionado} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                {perfis.map((p) => (
                  <SelectItem key={p.valor} value={p.valor}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha inicial</Label>
            <Input id="senha" name="senha" type="password" placeholder="Mínimo 8 caracteres" required minLength={8} />
          </div>
          {erro && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 3: Criar o componente de lista de usuários**

Criar `components/usuarios/lista-usuarios.tsx`:

```typescript
'use client'

import { BadgePerfil } from './badge-perfil'
import { Button } from '@/components/ui/button'
import { alternarStatusUsuario } from '@/app/(dashboard)/configuracoes/usuarios/actions'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { UserRole } from '@/types/database'

type Usuario = {
  id: string
  nome: string
  email: string
  telefone: string | null
  cargo: UserRole
  disponivel: boolean
  ativo: boolean
  criado_em: string
}

export function ListaUsuarios({ usuarios }: { usuarios: Usuario[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
            <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
            <th className="px-4 py-3 font-medium text-slate-600">Perfil</th>
            <th className="px-4 py-3 font-medium text-slate-600">Cadastrado em</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                Nenhum usuário encontrado.
              </td>
            </tr>
          )}
          {usuarios.map((usuario) => (
            <tr key={usuario.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{usuario.nome}</td>
              <td className="px-4 py-3 text-slate-600">{usuario.email}</td>
              <td className="px-4 py-3 text-slate-600">{usuario.telefone ?? '—'}</td>
              <td className="px-4 py-3">
                <BadgePerfil perfil={usuario.cargo} />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {format(new Date(usuario.criado_em), "dd/MM/yyyy", { locale: ptBR })}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  usuario.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {usuario.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-4 py-3">
                <form action={alternarStatusUsuario.bind(null, usuario.id, !usuario.ativo)}>
                  <Button type="submit" variant="outline" size="sm">
                    {usuario.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Passo 4: Instalar date-fns para formatação de datas**

```bash
npm install date-fns
```

- [ ] **Passo 5: Criar a página de gestão de usuários**

Criar `app/(dashboard)/configuracoes/usuarios/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { ListaUsuarios } from '@/components/usuarios/lista-usuarios'
import { ModalNovoUsuario } from '@/components/usuarios/modal-novo-usuario'
import { redirect } from 'next/navigation'

export default async function UsuariosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('profiles')
    .select('cargo')
    .eq('id', user?.id ?? '')
    .single()

  // Apenas admin acessa esta página
  if (perfil?.cargo !== 'admin') {
    redirect('/painel')
  }

  const { data: usuarios } = await supabase
    .from('profiles')
    .select('id, nome, email, telefone, cargo, disponivel, ativo, criado_em')
    .order('nome') as { data: import('@/types/database').Profile[] | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuários e Permissões</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie os usuários e perfis de acesso do sistema.
          </p>
        </div>
        <ModalNovoUsuario />
      </div>

      <ListaUsuarios usuarios={usuarios ?? []} />
    </div>
  )
}
```

- [ ] **Passo 6: Verificar que não há erros de TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Passo 7: Iniciar o servidor e testar o fluxo completo**

```bash
npm run dev
```

Verificar:
1. `http://localhost:3000/login` — página de login aparece corretamente
2. Fazer login com o usuário admin criado no Supabase
3. Deve redirecionar para `/painel`
4. Acessar `/configuracoes/usuarios` — lista de usuários aparece
5. Clicar em "Novo Usuário" — modal abre com formulário em português
6. Criar um usuário novo — deve aparecer na lista
7. Clicar em "Desativar" — status muda para inativo
8. Menu lateral deve mostrar todos os itens de navegação

- [ ] **Passo 8: Commit final da Fase 1**

```bash
git add .
git commit -m "feat: implementa gestao de usuarios com 6 perfis de acesso"
```

---

## Verificação Final da Fase 1

Antes de avançar para a Fase 2, confirmar que tudo está funcionando:

- [ ] Login com e-mail e senha funciona
- [ ] Usuário não autenticado é redirecionado para `/login`
- [ ] Usuário autenticado acessando `/login` é redirecionado para `/painel`
- [ ] Sidebar mostra todos os itens de navegação em português
- [ ] Header mostra o nome do usuário e o badge com o perfil
- [ ] Botão "Sair" encerra a sessão e redireciona para o login
- [ ] Página de usuários lista todos os perfis da organização
- [ ] Admin consegue criar novos usuários
- [ ] Admin consegue ativar e desativar usuários
- [ ] Usuário sem perfil admin é redirecionado ao tentar acessar `/configuracoes/usuarios`

---

## Próximas Fases

Cada fase terá seu próprio plano de implementação:

| Fase | Plano |
|---|---|
| **Fase 2** | `2026-05-09-fase-2-leads-contatos.md` — Leads, contatos e empresas |
| **Fase 3** | `2026-05-09-fase-3-distribuicao-leads.md` — Distribuição automática de leads |
| **Fase 4** | `2026-05-09-fase-4-pipeline-kanban.md` — Pipeline Kanban com tempo real |
| **Fase 5** | `2026-05-09-fase-5-tarefas-atividades.md` — Tarefas e histórico |
| **Fase 6** | `2026-05-09-fase-6-whatsapp.md` — WhatsApp via Evolution API |
| **Fase 7** | `2026-05-09-fase-7-integracoes.md` — Facebook e Instagram Lead Ads |
| **Fase 8** | `2026-05-09-fase-8-orcamentos.md` — Orçamentos e catálogo |
| **Fase 9** | `2026-05-09-fase-9-dashboard-relatorios.md` — Dashboard e relatórios |
| **Fase 10** | `2026-05-09-fase-10-deploy.md` — Testes finais e deploy |

---

*Plano criado em 09/05/2026. Spec de referência: `docs/superpowers/specs/2026-05-09-boot-crm-design.md`*
