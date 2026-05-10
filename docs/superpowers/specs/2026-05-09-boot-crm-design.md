# BOOT-CRM — Especificação Técnica Completa (V1)
**Data:** 09/05/2026
**Versão:** 1.1 (revisada após code review)
**Projeto:** BOOT-CRM — CRM Comercial da Boot Digital

---

## Histórico de Revisões

| Versão | Data | Motivo |
|---|---|---|
| 1.0 | 09/05/2026 | Especificação inicial |
| 1.1 | 09/05/2026 | Correções pós code review: banco de dados, escopo, cronograma |
| 1.2 | 09/05/2026 | Distribuição automática de leads restaurada na V1 — requisito operacional crítico |

---

## Decisões de Escopo — O Que Foi Retirado da V1 e Por Quê

Esta seção documenta as decisões tomadas para tornar a V1 realizável por um solo developer. Nada foi removido por falta de importância — foi removido para garantir que o projeto seja entregue com qualidade.

### Retirado da V1 → Vai para a V2

| Funcionalidade | Motivo da Retirada |
|---|---|
| **Captura de DMs do Instagram** | Exige aprovação do app pela Meta (processo que pode levar semanas ou ser negado). Instagram Lead Ads (mais simples) permanece na V1. |
| **Assinatura digital em orçamentos** | Requer integração com plataforma externa (DocuSign, ClickSign) ou infraestrutura jurídica própria. Não é funcionalidade central do CRM. |
| **Hash SHA-256 criptográfico na exportação** | Implementação correta para uso legal é complexa e exige definição jurídica do payload. V1 entrega exportação com cabeçalho de auditoria completo. V2 adiciona hash. |
| **Distribuição por disponibilidade** | Requer sistema de presença em tempo real (status online/offline ativo). Os modos Manual e Rotativo cobrem 90% dos casos da V1. |
| **Redistribuição automática de leads por inatividade** | Complexidade adicional — gestor faz manualmente na V1. Distribuição automática na chegada do lead está na V1. |
| **Relatório de WhatsApp com tempo médio de resposta** | Depende de modelo bidirecional de mensagens completamente implementado e testado. Entra na V2 após estabilização do módulo WhatsApp. |
| **Link de aprovação do orçamento pelo cliente** | Requer geração de URL única, controle de expiração e UX separada para o cliente. O PDF enviado por WhatsApp cumpre a função na V1. |

### Simplificado (permanece na V1, mas em versão reduzida)

| Funcionalidade | Versão V1 | Versão completa (V2) |
|---|---|---|
| Distribuição de leads | Manual + Rotativo + Por carga | + Por disponibilidade |
| Exportação de conversa | PNG e TXT com cabeçalho de auditoria | + Hash SHA-256 criptográfico |
| Integrações de captura | WhatsApp + Facebook Lead Ads + Instagram Lead Ads | + Instagram DMs |
| Relatórios | 4 relatórios essenciais | + WhatsApp + personalizados |
| Stack ORM | Apenas Supabase Client (sem Prisma) | — |

---

## 1. Visão Geral

O BOOT-CRM é um sistema de gestão de relacionamento com clientes (CRM) comercial completo, moderno e escalável. Criado inicialmente para a Boot Digital, com arquitetura preparada para multi-tenancy desde a V1 (outras empresas poderão usar o sistema no futuro sem refatoração estrutural).

**Objetivo:** Centralizar em um único sistema o controle de leads, vendedores, clientes, negociações, tarefas, follow-ups, orçamentos e histórico de relacionamento.

**Princípios:**
- Interface 100% em português — zero palavras em inglês para o usuário final
- Datas no formato DD/MM/AAAA, moeda em R$ com vírgula decimal, fuso horário America/Sao_Paulo
- Suporte a 10+ vendedores simultâneos com login próprio
- Captura automática de leads de múltiplos canais
- Histórico completo e imutável de todas as interações
- Multi-tenancy estrutural desde a V1 (coluna `organization_id` em todas as tabelas de dados)

---

## 2. Stack Técnica

| Camada | Tecnologia | Finalidade |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack, rotas, server actions |
| Linguagem | TypeScript | Tipagem e segurança de código |
| Estilo | Tailwind CSS | Estilização moderna e rápida |
| Componentes | shadcn/ui | Biblioteca de componentes profissionais |
| Banco de dados | Supabase (PostgreSQL) | Dados, autenticação, tempo real, storage |
| Client do banco | Supabase Client (@supabase/ssr) | Acesso tipado ao banco — sem Prisma |
| WhatsApp | Evolution API (self-hosted) | Integração via QR Code |
| Deploy app | Vercel | Hospedagem do Next.js |
| Deploy WhatsApp | Railway | Hospedagem da Evolution API |

> **Por que sem Prisma:** O Supabase possui cliente JavaScript nativo com geração automática de tipos via `supabase gen types`. Adicionar Prisma sobre o Supabase cria atrito desnecessário com o pool de conexões (Supavisor) em ambiente serverless do Vercel e duplica o trabalho de tipagem. Para um solo developer aprendendo a stack, usar apenas o cliente Supabase reduz a curva de aprendizado sem perder tipagem.

---

## 3. Arquitetura

```
┌─────────────────────────────────────────────┐
│              NAVEGADOR DO USUÁRIO            │
│         (Next.js – React + TypeScript)       │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│            NEXT.JS (App Router)              │
│  • Páginas e rotas                           │
│  • Server Actions (lógica de negócio)        │
│  • Proteção de rotas por perfil              │
└──────────────┬───────────────┬──────────────┘
               │               │
┌──────────────▼──────┐ ┌──────▼──────────────┐
│  SUPABASE           │ │  EVOLUTION API       │
│  • PostgreSQL       │ │  • WhatsApp por      │
│  • Autenticação     │ │    QR Code           │
│  • Tempo real       │ │  • Webhooks          │
│  • Storage (fotos)  │ │  • Histórico         │
│  • RLS policies     │ └─────────────────────┘
└─────────────────────┘
```

---

## 4. Glossário de Entidades

Para evitar ambiguidade durante a implementação:

- **Lead:** contato que chegou ao sistema (via WhatsApp, Instagram, formulário ou cadastro manual). Ainda não foi qualificado. Pode ser apenas um número de telefone com uma mensagem.
- **Contato:** lead que foi qualificado — tem nome, empresa e informações suficientes para uma negociação. Um lead vira contato quando o vendedor o converte.
- **Negociação (Deal):** oportunidade de venda vinculada a um contato. Uma negociação percorre as etapas do pipeline. Um contato pode ter múltiplas negociações ao longo do tempo.
- **Atividade:** registro imutável de qualquer interação (mensagem enviada, ligação feita, tarefa concluída, lead reatribuído). Nunca pode ser editada ou excluída.

---

## 5. Módulos da V1

### Módulo 1 — Autenticação e Usuários
- Login com e-mail e senha
- 6 perfis de acesso com permissões diferentes
- Sessão expira após 8 horas de inatividade
- Gestão de usuários pelo administrador (criar, editar, ativar/desativar, redefinir senha)
- Senhas: mínimo 8 caracteres com letras e números
- Campo `disponivel` (bool) em cada perfil — vendedor pode marcar como indisponível sem deslogar

### Módulo 2 — Leads
- Cadastro manual de leads
- Captura automática via WhatsApp, Instagram Lead Ads e Facebook Lead Ads
- Listagem com filtros por responsável, origem, status e data
- Busca por nome, telefone ou e-mail
- Perfil completo com histórico de atividades e foto de perfil
- Indicação automática de contato anterior ao receber lead de número já cadastrado
- Conversão de lead para contato e negociação
- Alerta visual para leads sem interação há mais de 7 dias
- Reatribuição por admin ou gestor com registro automático no histórico

### Módulo 3 — Pipeline de Vendas (Kanban)
- Quadro visual com colunas editáveis (arrastar e soltar)
- Etapas padrão: Novo Lead • Primeiro Contato • Diagnóstico • Proposta Enviada • Negociação • Fechado • Perdido
- Colunas 100% configuráveis: adicionar, renomear, reordenar, alterar cor, ocultar, excluir
- Ao excluir coluna com cards, sistema solicita destino dos cards antes de confirmar
- Cards arrastáveis entre colunas com atualização em tempo real para todos os usuários
- Obrigatório preencher valor estimado para mover para "Fechado"
- Obrigatório informar motivo da perda ao mover para "Perdido"
- Arquitetura preparada para múltiplos pipelines — tabela `pipelines` já criada na V1 com um pipeline default "Principal"

### Módulo 4 — Contatos e Empresas
- Cadastro de contatos qualificados
- Vinculação com leads, negociações e histórico completo
- Acesso ao histórico de qualquer atendimento anterior, conforme configuração de visibilidade

### Módulo 5 — Tarefas e Follow-ups
- Criação de tarefas vinculadas a leads, contatos ou negociações
- Tipos: Ligação, E-mail, Reunião, WhatsApp
- Prazo de vencimento com alertas de tarefas atrasadas (destacadas em vermelho)
- Ao concluir um follow-up, sistema sugere criar o próximo
- Vendedor vê apenas as próprias tarefas; gestor e admin veem todas

### Módulo 6 — Histórico de Atividades
- Registro automático de todas as ações do sistema
- Timeline por lead, contato ou negociação
- Anotações manuais pelos usuários
- Registros imutáveis — nenhuma entrada pode ser editada ou excluída (garantido por RLS policy no Supabase com `SECURITY DEFINER`)

### Módulo 7 — WhatsApp
- Integração via Evolution API com conexão por QR Code (como WhatsApp Web)
- **Modos de operação (configurável pelo Admin):**
  - Um número único compartilhado por toda a equipe
  - Número individual por vendedor (cada um escaneia seu próprio QR Code)
  - Modo misto (alguns compartilham, outros têm número próprio)
- Ao conectar, histórico completo de conversas anteriores é carregado
- Caixa de mensagens unificada visível para gestores e admins
- Mensagem de número desconhecido → cria card automaticamente na coluna "Novo Lead"
- Card criado automaticamente inclui:
  - Nome do contato (do perfil WhatsApp)
  - Número de telefone completo
  - Foto de perfil (quando disponível, salva no Supabase Storage)
  - Canal de origem
  - Indicação de contato anterior com botão de ver histórico
  - Botão "Abrir Conversa" e botão "Atribuir Vendedor"
- Se vendedor responsável ficar offline por mais de 30 minutos, gestor recebe alerta
- Modelos de mensagem em português
- Status de conexão visível por vendedor
- **Exportação de conversa (V1 — sem hash criptográfico):**
  - Formatos: Imagem (PNG) ou Texto (.txt)
  - Data e hora de cada mensagem individualmente (formato DD/MM/AAAA HH:mm)
  - Nome do remetente em cada mensagem
  - Cabeçalho com: nome do lead, número, vendedor, data/hora da exportação, total de mensagens
  - Log de auditoria: quem exportou, quando e em qual formato
  - Sem opção de edição antes do download
  - *(Hash SHA-256 criptográfico entra na V2)*

### Módulo 8 — Integrações de Captura de Leads
- **WhatsApp:** captura automática via webhook da Evolution API
- **Instagram Lead Ads:** captura via webhook da Meta Graph API (formulários de anúncio)
- **Facebook Lead Ads:** captura via webhook da Meta Graph API
- **Site/Landing pages:** endpoint de API público para formulários externos enviarem leads
- Reconhecimento automático de contato anterior por número de telefone
- Origem do lead registrada automaticamente em todos os casos
- *(Instagram DMs entra na V2 — requer aprovação da Meta)*

> **Atenção na implementação da Fase 6:** Instagram Lead Ads e Facebook Lead Ads exigem que o app seja verificado pela Meta antes de ir para produção. O processo de verificação pode levar de 5 a 15 dias úteis. Iniciar o processo de verificação do app Meta no início da Fase 5 (WhatsApp) para não bloquear a Fase 6.

### Módulo 9 — Orçamentos
- Catálogo de produtos e serviços cadastráveis
- Importação do catálogo via planilha Excel (.xlsx) ou CSV
  - Colunas esperadas: `nome`, `descricao`, `preco_unitario`, `unidade`
  - Importação incremental: adiciona novos produtos sem apagar os existentes
  - Erros de formato mostrados linha a linha antes de confirmar importação
- Criação de orçamento vinculado a lead ou negociação
- Itens, quantidades, valores unitários, descontos por item e total calculado automaticamente
- **Fluxo de aprovação interna:**
  - Vendedor cria orçamento (status: Rascunho)
  - Vendedor solicita aprovação interna (status: Aguardando Aprovação Interna)
  - Gestor ou Financeiro aprova ou rejeita com comentário (status: Aprovado Internamente ou Rejeitado Internamente)
  - Após aprovação interna, vendedor envia ao cliente (status: Enviado ao Cliente)
  - Gestão do retorno: Aprovado pelo Cliente ou Recusado pelo Cliente
- Orçamentos com status "Aprovado pelo Cliente" ficam bloqueados para edição
- Geração de PDF do orçamento
- Histórico de orçamentos por lead e negociação
- *(Link de aprovação para o cliente entra na V2)*
- *(Assinatura digital entra na V2)*

### Módulo 10 — Dashboard e Relatórios

**Painel Principal (tempo real):**
- Leads novos (hoje / semana / mês)
- Negociações abertas por vendedor
- Valor total em negociação
- Propostas enviadas
- Vendas fechadas
- Tarefas atrasadas
- Próximos follow-ups do dia
- Atividades recentes da equipe

**Relatórios da V1 (4 relatórios com filtros, gráficos e exportação em PDF ou Excel):**

1. **Relatório de Leads:** total por período, por origem, por vendedor, taxa de conversão lead→negociação, leads perdidos com motivo
2. **Relatório de Vendas:** negociações ganhas x perdidas, valor fechado por vendedor, tempo médio por etapa do funil, ranking de vendedores
3. **Relatório de Atividades:** tarefas concluídas x atrasadas por vendedor, follow-ups realizados, atividades por tipo
4. **Relatório de Orçamentos:** gerados x aprovados x recusados, valor total orçado e aprovado, taxa de aprovação por vendedor

*(Relatório de WhatsApp com tempo médio de resposta entra na V2)*

---

## 6. Distribuição de Leads (V1)

**Princípio:** nenhum lead fica parado em fila esperando um humano agir. A distribuição acontece automaticamente no momento em que o lead entra no sistema — seja às 8h da manhã ou à meia-noite. O Admin define o modo, o sistema executa.

A distribuição é disparada por uma **Supabase Edge Function** acionada automaticamente sempre que um novo lead é criado (via webhook do WhatsApp, Lead Ads ou qualquer canal). Nenhuma intervenção humana é necessária.

### Modos de Distribuição (configurável pelo Admin)

| Modo | Comportamento | Quando Usar |
|---|---|---|
| **Manual** | Lead entra na fila — gestor ou admin atribui | Quando a equipe é pequena e o gestor prefere controle total |
| **Automático Rotativo** | Sistema distribui em sequência: João → Maria → Pedro → João... | Equipe equilibrada, volume uniforme de leads |
| **Automático por Carga** | Lead vai sempre para o vendedor com menos leads abertos no momento | Equipe com ritmos diferentes, garante distribuição justa |

### Como Funciona na Prática

```
Lead chega (WhatsApp, Instagram, Facebook, Site)
          ↓
Supabase Edge Function executa automaticamente
          ↓
   [modo configurado pelo Admin]
          ↓
┌─────────────────────────────────────────────┐
│  Rotativo: próximo da sequência             │
│  Por carga: quem tem menos leads abertos    │
│  Manual: vai para a fila sem atribuição     │
└─────────────────────────────────────────────┘
          ↓
Vendedor recebe notificação instantânea no sistema
          ↓
Card aparece no pipeline do vendedor em tempo real
```

### Regras de Distribuição Automática

- **Limite por vendedor:** se o vendedor atingiu o limite máximo de leads ativos configurado, o sistema pula para o próximo da sequência
- **Vendedor inativo:** se o vendedor está com a conta desativada, é ignorado na distribuição
- **Disponibilidade manual:** vendedor pode marcar-se como "indisponível" (ex: em reunião, de férias) — distribuição automática o ignora enquanto indisponível
- **Fila de emergência:** se nenhum vendedor disponível puder receber (todos atingiram o limite ou estão indisponíveis), o lead vai para a fila de espera e **gestor e admin recebem alerta imediato** — ninguém fica sem cobertura silenciosamente
- **Notificação instantânea:** vendedor recebe alerta dentro do CRM no momento da atribuição

### Configurações Disponíveis na V1

- Modo de distribuição: Manual, Rotativo ou Por Carga
- Limite máximo de leads ativos por vendedor (ex: 30) — opcional
- Distribuir apenas para vendedores marcados como disponíveis: sim/não
- Fila de leads sem atribuição — visível e gerenciável por gestor e admin com alertas

*(Distribuição por disponibilidade com presença em tempo real entra na V2)*
*(Redistribuição automática por inatividade de X dias entra na V2)*

---

## 7. Perfis de Acesso — Responsabilidades

| Perfil | Responsabilidades Principais |
|---|---|
| **Admin** | Acesso irrestrito a tudo. Única exceção: não pode apagar registros de auditoria. |
| **Gestor Comercial** | Vê e gerencia toda a equipe, distribui leads, aprova orçamentos, acessa relatórios completos |
| **Vendedor** | Atende os próprios leads, cria tarefas, envia WhatsApp, cria e solicita aprovação de orçamentos |
| **Atendimento** | Recebe mensagens WhatsApp, cria leads, registra atividades. Não move cards no pipeline — o lead é atribuído ao vendedor responsável que então move o card. |
| **Financeiro** | Aprova orçamentos internamente, visualiza negociações e orçamentos. Não atende clientes. |
| **Suporte** | Acessa conversas WhatsApp de contatos que já são clientes (suporte pós-venda). Não vê pipeline de vendas nem leads novos. |

---

## 8. Modelagem do Banco de Dados

### Tabela de Apoio: Organizations (Multi-tenancy)

```
organizations
  id, nome, slug, ativo, plano, criado_em, atualizado_em
```

Todas as tabelas de dados abaixo possuem `organization_id` (FK → organizations). Para a V1, haverá uma única organização (Boot Digital). A estrutura já permite adicionar novas empresas sem refatoração.

---

### Tabelas Principais

**organizations** — organizações (multi-tenancy)
```
id, nome, slug (unique), plano, ativo, criado_em, atualizado_em
```

**profiles** — usuários do sistema
```
id (FK → auth.users), organization_id,
nome, email, telefone, cargo (role), disponivel (bool, default true),
ativo, ultimo_status_em, criado_em, atualizado_em

roles: admin | gestor | vendedor | atendimento | financeiro | suporte
```

**leads** — entrada de novos contatos
```
id, organization_id,
nome, email, telefone, empresa, origem, status,
responsavel_id (FK → profiles),
foto_perfil_url,
contato_anterior_id (FK → leads, nullable — referência ao contato anterior),
whatsapp_instance_id (FK → whatsapp_instances, nullable),
observacoes, criado_em, atualizado_em

origens: whatsapp | instagram_lead_ad | facebook_lead_ad | site | indicacao | evento | manual
```

**contacts** — leads qualificados
```
id, organization_id,
nome, email, telefone, cargo, empresa_id (FK → companies),
responsavel_id (FK → profiles),
foto_perfil_url,
observacoes, criado_em, atualizado_em
```

**companies** — empresas dos contatos
```
id, organization_id,
nome, cnpj, site, telefone, endereco,
criado_em, atualizado_em
```

**pipelines** — funis de venda (preparado para múltiplos)
```
id, organization_id,
nome, descricao, padrao (bool), ativo,
criado_em, atualizado_em
```

**pipeline_stages** — etapas do funil
```
id, organization_id, pipeline_id (FK → pipelines),
nome, ordem, cor, oculto (bool),
criado_em, atualizado_em
```

**deals** — negociações no pipeline
```
id, organization_id,
titulo, valor_estimado, contato_id (FK → contacts),
responsavel_id (FK → profiles),
pipeline_id (FK → pipelines),
estagio_id (FK → pipeline_stages),
data_fechamento_prevista,
origem_lead, motivo_perda,
ganho (bool), observacoes,
criado_em, atualizado_em
```

**tasks** — tarefas e follow-ups
```
id, organization_id,
titulo, descricao,
tipo (ligacao | email | reuniao | whatsapp),
data_vencimento, concluida,
responsavel_id (FK → profiles),
lead_id (FK → leads, nullable),
contato_id (FK → contacts, nullable),
deal_id (FK → deals, nullable),
criado_em, atualizado_em
```

**activities** — histórico imutável (sem UPDATE nem DELETE via RLS)
```
id, organization_id,
tipo, descricao,
lead_id (nullable), deal_id (nullable), contato_id (nullable),
autor_id (FK → profiles),
criado_em
```

**whatsapp_instances** — conexões WhatsApp
```
id, organization_id,
nome, numero, evolution_instance_name,
vendedor_id (FK → profiles, nullable — null = compartilhado),
compartilhado (bool),
status_conexao (conectado | desconectado | aguardando_qr),
criado_em, atualizado_em
```

**conversations** — agrupamento de mensagens por contato/instância
```
id, organization_id,
whatsapp_instance_id (FK → whatsapp_instances),
lead_id (FK → leads, nullable),
contato_id (FK → contacts, nullable),
telefone_externo,
ultima_mensagem_em, criado_em, atualizado_em
```

**messages** — mensagens WhatsApp (bidirecionais)
```
id, organization_id,
conversation_id (FK → conversations),
message_id_externo (unique — ID da Evolution API para deduplicação),
direcao (enviada | recebida),
tipo_midia (texto | audio | imagem | documento | sticker | localizacao),
conteudo,
url_midia (nullable — link no Supabase Storage),
telefone_remetente, telefone_destinatario,
responsavel_id (FK → profiles, nullable),
status (enviada | entregue | lida | falhou),
enviado_em, entregue_em, lida_em
```

**message_templates** — modelos de mensagem
```
id, organization_id,
nome, conteudo, categoria,
criado_por (FK → profiles), criado_em, atualizado_em
```

**conversation_exports** — log de exportações (imutável)
```
id, organization_id,
conversation_id (FK → conversations),
lead_id (FK → leads, nullable),
exportado_por (FK → profiles),
formato (png | txt),
periodo_inicio, periodo_fim,
total_mensagens,
criado_em
```

**products** — catálogo de produtos/serviços
```
id, organization_id,
nome, descricao, preco_unitario, unidade, ativo,
criado_em, atualizado_em
```

**quotes** — orçamentos
```
id, organization_id,
numero (sequencial por organization),
lead_id (FK → leads, nullable),
deal_id (FK → deals, nullable),
responsavel_id (FK → profiles),
status (rascunho | aguardando_aprovacao_interna | aprovado_internamente |
        rejeitado_internamente | enviado_ao_cliente |
        aprovado_pelo_cliente | recusado_pelo_cliente),
valor_subtotal, desconto_geral, valor_total,
aprovacao_interna_por (FK → profiles, nullable),
aprovacao_interna_em,
aprovacao_interna_comentario,
observacoes,
criado_em, atualizado_em
```

**quote_items** — itens do orçamento
```
id, quote_id (FK → quotes),
product_id (FK → products, nullable),
descricao, quantidade, preco_unitario, desconto_item, subtotal
```

**lead_distribution_config** — configuração de distribuição de leads
```
id, organization_id (unique),
modo (manual | rotativo | por_carga),
apenas_disponiveis (bool, default false),
limite_por_vendedor (int, nullable),
proximo_vendedor_idx (int, default 0 — controle do round-robin),
atualizado_por (FK → profiles), atualizado_em
```

**system_config** — configurações globais do sistema
```
id, organization_id,
chave (unique por organization), valor, tipo_valor (texto | numero | booleano | json),
descricao, atualizado_por (FK → profiles), atualizado_em

Chaves usadas:
  - visibilidade_historico_conversa: completo | resumido | proprio
  - alerta_offline_minutos: número (padrão: 30)
  - dias_alerta_sem_interacao: número (padrão: 7)
```

**audit_logs** — log de auditoria imutável
```
id, organization_id,
usuario_id (FK → profiles),
acao, tabela_afetada, registro_id,
dados_anteriores (jsonb), dados_novos (jsonb),
ip, criado_em

(RLS: INSERT permitido para usuários autenticados. UPDATE e DELETE bloqueados para todos, incluindo Admin.)
```

---

## 9. Estrutura de Navegação

```
BOOT-CRM
├── Painel Principal
├── Caixa de Entrada (mensagens novas em tempo real)
├── Leads
│   ├── Lista de Leads
│   └── Perfil do Lead
├── Pipeline de Vendas (Kanban)
├── Contatos
│   ├── Lista de Contatos
│   └── Perfil do Contato
├── Negociações
├── WhatsApp
│   ├── Caixa de Mensagens
│   ├── Modelos de Mensagem
│   └── Conexões (QR Code por vendedor)
├── Tarefas e Follow-ups
├── Orçamentos
│   ├── Lista de Orçamentos
│   ├── Catálogo de Produtos
│   └── Novo Orçamento
├── Relatórios
│   ├── Leads
│   ├── Vendas
│   ├── Atividades
│   └── Orçamentos
└── Configurações
    ├── Usuários e Permissões
    ├── Pipelines e Etapas
    ├── Distribuição de Leads
    ├── Conexões WhatsApp
    ├── Integrações (Facebook Lead Ads, Instagram Lead Ads)
    └── Configurações Gerais
```

---

## 10. Permissões por Perfil

| Funcionalidade | Admin | Gestor | Vendedor | Atendimento | Financeiro | Suporte |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Ver todos os leads | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ver apenas os próprios leads | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Criar leads | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Reatribuir leads/contatos | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver pipeline completo | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mover cards no pipeline | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Editar etapas do pipeline | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Criar e editar orçamentos | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Aprovar orçamentos internamente | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Ver orçamentos | ✅ | ✅ | Próprios | ❌ | ✅ | ❌ |
| Enviar WhatsApp | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Exportar conversa | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Criar tarefas | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Ver tarefas de todos | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestão de usuários | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configurações do sistema | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dashboard completo da equipe | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dashboard próprio | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Importar catálogo produtos | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Acessar log de auditoria | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configurar distribuição leads | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**O Administrador tem acesso irrestrito a tudo no sistema, sem exceção. A única limitação técnica é a RLS policy que impede exclusão de registros de auditoria — isso protege inclusive o Admin de apagar evidências acidentalmente.**

**Visibilidade do histórico de conversa:** configurável pelo Admin em `system_config` com chave `visibilidade_historico_conversa`:
- `completo` (padrão): vendedor vê todo o histórico, incluindo atendimentos de outros vendedores
- `resumido`: vendedor vê atividades e anotações, mas não mensagens privadas de outros vendedores
- `proprio`: vendedor só vê o que ele mesmo registrou

---

## 11. Regras de Negócio

**Leads:**
- Todo lead automático entra sem atribuição e aparece na fila do gestor/admin
- Um lead tem apenas um responsável por vez
- Reatribuição gera registro automático no histórico de atividades
- Leads sem interação há mais de 7 dias recebem alerta visual no card (configurável em `system_config`)

**Pipeline:**
- Mover para "Fechado" exige `valor_estimado` preenchido
- Mover para "Perdido" exige `motivo_perda` (campo obrigatório na interface)
- Negociações fechadas geram atividade de vitória automaticamente no histórico

**Atendimento e pipeline:** O perfil Atendimento cria o lead e registra a primeira mensagem. O gestor ou admin atribui o lead a um vendedor. O vendedor, ao receber, move o card no pipeline. O Atendimento não move cards.

**Tarefas:**
- Tarefas vencidas ficam destacadas em vermelho
- Ao concluir follow-up, sistema sugere criar o próximo
- Vendedor vê apenas as próprias tarefas

**Orçamentos:**
- Exigem aprovação interna antes do envio ao cliente (status `aprovado_internamente`)
- Orçamentos com status `aprovado_pelo_cliente` ficam bloqueados para edição
- Vinculação automática ao lead e negociação ao criar

**WhatsApp:**
- Número desconhecido → card criado automaticamente + notificação ao gestor
- Deduplicação de webhooks via `message_id_externo` (Evolution API pode entregar o mesmo evento mais de uma vez)
- Vendedor offline há mais de 30 minutos → alerta ao gestor (configurável em `system_config`)
- Todas as exportações ficam no log de auditoria

**Segurança:**
- Sessão expira após 8 horas de inatividade
- Todas as ações sensíveis ficam registradas em `audit_logs` (imutável via RLS)
- Senha mínima: 8 caracteres com letras e números
- RLS policies no Supabase filtram todos os dados por `organization_id` automaticamente

---

## 12. Fases de Desenvolvimento (Cronograma Revisado)

| Fase | Conteúdo | Duração Estimada |
|---|---|---|
| 1 | Configuração do projeto, Supabase, autenticação, gestão de usuários, layout base | 2 semanas |
| 2 | Leads, contatos, empresas | 2 semanas |
| 3 | Distribuição de leads (manual + rotativo), fila de leads | 1 semana |
| 4 | Pipeline Kanban editável com tempo real | 2 semanas |
| 5 | Tarefas, follow-ups, histórico de atividades | 1 semana |
| 6 | WhatsApp (Evolution API, QR Code, caixa de mensagens, captura automática, exportação) | 3 semanas |
| 7 | Facebook Lead Ads e Instagram Lead Ads — iniciar verificação do app Meta na Fase 6 | 2 semanas |
| 8 | Orçamentos com catálogo, importação de planilha, fluxo de aprovação e PDF | 2 semanas |
| 9 | Dashboard em tempo real e 4 relatórios com exportação | 2 semanas |
| 10 | Testes completos, ajustes finais e deploy em produção | 1 semana |

**Total estimado: 18 semanas** (cronograma realista para um solo developer aprendendo a stack)

---

## 13. Funcionalidades Fora da V1 (Entram na V2)

- Instagram DMs (requer aprovação Meta)
- Hash SHA-256 criptográfico na exportação de conversas
- Link de aprovação de orçamento para o cliente
- Assinatura digital em orçamentos
- Distribuição de leads por disponibilidade com presença em tempo real
- Redistribuição automática de leads por inatividade de X dias
- Relatório de WhatsApp com tempo médio de resposta
- Múltiplos pipelines ativos simultaneamente
- Multi-tenancy completo (outras empresas no sistema)
- App mobile
- WhatsApp Business API oficial (Meta)
- Automações e chatbot
- Módulo financeiro
- Relatórios personalizados pelo usuário
- Integração com ferramentas de e-mail marketing

---

*Especificação revisada em 09/05/2026 — versão 1.1.*
*Próximo passo: criação do plano de implementação detalhado por fase.*
