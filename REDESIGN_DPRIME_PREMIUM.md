# REDESIGN DPRIME PREMIUM - BOOT CRM

## Visão Geral

Este documento detalha a estratégia de evolução visual do BOOT CRM para um padrão SaaS Premium, inspirado em HubSpot, Pipedrive, Attio, Linear e Stripe Dashboard.

---

## AJUSTES APÓS APROVAÇÃO

1. **FASE 0 adicionada:** Branch + screenshots de referência
2. **Pipeline:** Melhorar aparência sem aumentar altura dos cards
3. **Prioridade máxima:** Detalhe do Orçamento e Detalhe do Pedido
4. **Sidebar:** Manter entre 240px-250px de largura
5. **Escopo:** Apenas visual, sem alterações funcionais

---

## 1. MOCKUPS TEXTUAIS

### 1.1 Sidebar (Atual → Proposto)

**ATUAL:**
```
┌─────────────────────────┐
│ BOOT CRM                 │
├─────────────────────────┤
│ ▸ Caixa de Entrada       │
│   Painel Principal       │
│   Leads                  │
│   Pipeline de Vendas     │
│   Contatos               │
│   WhatsApp               │
│   Tarefas                │
│   Orçamentos             │
│   Pedidos                │
│   Relatórios             │
│   Configurações          │
└─────────────────────────┘
```

**PROPOSTO:**
```
┌─────────────────────────────────────────┐
│  LOGO (240px-250px)                     │
├─────────────────────────────────────────┤
│ ▌ Caixa de Entrada          ● 12       │
│ ▌ Painel Principal                     │
│ ▌ Leads                                │
│ ▌ Pipeline de Vendas                   │
│ ▌ Contatos                             │
│ ▌ WhatsApp                   ● 5      │
│ ▌ Tarefas                              │
│ ▌ Orçamentos                           │
│ ▌ Pedidos                              │
│ ▌ Relatórios                           │
│ ▌ Configurações                        │
└─────────────────────────────────────────┘

Estilo:
- Largura: 240px-250px (manter consistente)
- Item ativo: fundo #ECFDF5, barra lateral verde 3px #059669
- Hover: fundo #F6F8FA, transição 200ms
- Ícones Lucide 20px, cor #475569
- Padding: 10px 16px
- Border-radius: 8px
- Font-weight ativo: 500
- Espaçamento entre itens: 2px
```

### 1.2 Header (Atual → Proposto)

**ATUAL:**
```
┌──────────────────────────────────────────────────────────────┐
│  [Avatar] Nome                              [Badge] [Sair] │
└──────────────────────────────────────────────────────────────┘
```

**PROPOSTO:**
```
┌──────────────────────────────────────────────────────────────┐
│  [●]  Badge Perfil              [Avatar] [Nome ▾]          │
│                                    dropdown com:             │
│                                    • Meu perfil              │
│                                    • Configurações          │
│                                    ─────────                 │
│                                    • Sair                    │
└──────────────────────────────────────────────────────────────┘

Estilo:
- Avatar: 36px, border-radius 50%, borda sutil #E2E8F0
- Badge: background suave conforme cargo (pill style)
- Dropdown: shadow-lg, border-radius 12px, padding 8px
- Altura header: 64px
- Border bottom: 1px solid #E2E8F0
```

### 1.3 KPI Cards Dashboard (Atual → Proposto)

**ATUAL:**
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  Icon   │ │  Icon   │ │  Icon   │ │  Icon   │ │  Icon   │ │  Icon   │
│  Label  │ │  Label  │ │  Label  │ │  Label  │ │  Label  │ │  Label  │
│  Value  │ │  Value  │ │  Value  │ │  Value  │ │  Value  │ │  Value  │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

**PROPOSTO:**
```
┌──────────────────────────────────────────────────────────────┐
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│
│  │  (●)           │  │  (●)           │  │  (●)           ││
│  │  Icon in       │  │  Icon in       │  │  Icon in       ││
│  │  circle        │  │  circle        │  │  circle        ││
│  │                │  │                │  │                ││
│  │  Label         │  │  Label         │  │  Label         ││
│  │  R$ 125.000    │  │  +15% ↑        │  │  85%          ││
│  │  ▴ variação    │  │                │  │  ▴ variação    ││
│  └────────────────┘  └────────────────┘  └────────────────┘│
└──────────────────────────────────────────────────────────────┘

Estilo:
- Cards: radius 16px, border 1px solid #E2E8F0
- Ícone: container circular 44px com fundo #ECFDF5
- Ícone cor: #059669
- Valor: font-weight 700, font-size 22px, cor #0F172A
- Label: font-weight 500, font-size 13px, cor #475569
- Variação: badge pequeno + verde / - vermelho
- Padding: 20px
- Gap entre cards: 16px
```

### 1.4 Pipeline Kanban (Atual → Proposto)

**IMPORTANTE:** Não aumentar densidade visual. Melhorar aparência mantendo altura similar.

**ATUAL:**
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Etapa 1  │ │ Etapa 2  │ │ Etapa 3  │ │ Fechado  │
│ (5)      │ │ (3)      │ │ (2)      │ │ (1)      │
├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤
│ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │
│ │ Card │ │ │ │ Card │ │ │ │ Card │ │ │ │ Card │ │
│ └──────┘ │ │ └──────┘ │ │ └──────┘ │ │ └──────┘ │
│ ┌──────┐ │ │          │ │          │ │          │
│ │ Card │ │ │          │ │          │ │          │
│ └──────┘ │ │          │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**PROPOSTO:**
```
┌──────────────────────────────────────────────────────────────┐
│  ● Etapa 1                          (5)   R$ 45.000  [+]  │
│  ─────────────────────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────┐    │
│  │  (A)  Ana Silva                                    │    │
│  │       📱 11 9999-9999                              │    │
│  │       💬 "Olá, gostaria de..."                     │    │
│  │       💰 R$ 15.000          📅 há 2h              │    │
│  │       [Tag: Quente] [Tag: VIP]   [WhatsApp]       │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘

Estilo:
- Colunas: bg #F6F8FA, radius 12px, padding 12px
- Cards: bg white, radius 12px, border 1px solid #E2E8F0
- Cards: padding 14px (não aumentar altura)
- Hover: box-shadow sutil, sem mudança de tamanho
- Avatar: 32px, sem borda colorida extra
- Tags: font-size 11px, padding 3px 8px
- Espaçamento interno consistente
- NÃO adicionar informações extras nos cards
```

### 1.5 Tabela de Orçamentos (Atual → Proposto)

**ATUAL:**
```
┌────┬───────────┬─────────┬────────┬───────┬────────┬──────┬──┐
│ #  │ Cliente   │ Negociação│ Valor │Status │Responsável│Data│  │
├────┼───────────┼─────────┼────────┼───────┼──────────┼──────┼──┤
│ 1  │ João      │ Deal A   │R$ 5k  │badge  │ Maria     │05/06│🗑│
│ 2  │ Maria     │ Deal B   │R$ 8k  │badge  │ Pedro     │06/06│  │
└────┴───────────┴─────────┴────────┴───────┴──────────┴──────┴──┘
```

**PROPOSTO:**
```
┌────────────────────────────────────────────────────────────────────┐
│  #      Cliente / Lead    Negociação    Valor       Status    Res│
├────────────────────────────────────────────────────────────────────┤
│  001   (A) Ana Silva      Proposta A    R$ 15.000   [Aprovado]   │
│        ●●●                             ▴ +12%                    │
│                                                                     │
│  002   (B) Bruno Costa     Proposta B    R$ 8.500    [Enviado]     │
│                                             [Aguardando]          │
│                                                                     │
│  003   (C) Carlos Mendes  Proposta C    R$ 22.000   [Rascunho]   │
│                                             [Pendente revisão]    │
└────────────────────────────────────────────────────────────────────┘

Estilo:
- Header: bg #F6F8FA, font-weight 600, text #475569, font-size 13px
- Header padding: 12px 16px
- Rows: hover bg #F6F8FA, padding 16px
- Border: 1px solid #E2E8F0 entre linhas
- Container: radius 16px, overflow hidden
- Status badges: pill style com cores suaves
```

### 1.6 Caixa de Entrada (Atual → Proposto)

**ATUAL:**
```
┌────────────────────────────────────────────────────────────────────┐
│  [Tudo (17)] [Mensagens (5)] [Tarefas (8)] [Atividades (4)]      │
├────────────────────────────────────────────────────────────────────┤
│  📱 João - 11 9999-9999                              há 2min      │
│     "Olá, preciso de informações sobre..."                        │
│                                                                     │
│  ✓ Tarefa: Revisar proposta                          Hoje         │
│    Responsável: Maria                                             │
│                                                                     │
│  📝 Carlos editou uma negociação                     há 15min     │
└────────────────────────────────────────────────────────────────────┘
```

**PROPOSTO:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ●   Tudo        Mensagens        Tarefas        Atividades        │
│      (17)           (5)             (8)             (4)            │
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ (A)  Ana Silva                              há 5min   │ 📱 │ │
│  │      11 9999-8888                                           │ │
│  │      "Olá, gostaria de saber mais sobre..."                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  ☐  Revisar orçamento #42                    ⚠ Vence hoje  │ │
│  │     Cliente: Carlos Mendes                                   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  📊   Maria fechou negociação "Projeto X"      há 2h       │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘

Estilo:
- Tabs: bg suave, indicator underline verde 2px
- Cards: bg white, radius 12px, border 1px solid #E2E8F0
- Cards padding: 14px 16px
- Hover: box-shadow 0 2px 8px rgba(0,0,0,0.06)
- Ícones em containers circulares 32px
- Timestamps: cor #94A3B8, font-size 12px
- Gap entre cards: 8px
```

### 1.7 DETALHE DO ORÇAMENTO (PRIORIDADE MÁXIMA)

**ATUAL:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ← Voltar                                    [Ações]               │
├────────────────────────────────────────────────────────────────────┤
│  ORÇAMENTO #001                                                    │
│  Cliente: Ana Silva                                               │
│  Status: [Badge]                                                  │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ Valor Total │  │ Criado em   │  │ Responsável │               │
│  │ R$ 15.000   │  │ 10/06/2024  │  │ Maria       │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                     │
│  ITENS DO ORÇAMENTO                                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Produto           Qtd      Valor Unit.    Subtotal          │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ Item 1            10        R$ 500          R$ 5.000        │  │
│  │ Item 2            20        R$ 500          R$ 10.000       │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

**PROPOSTO:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ← Voltar                               [●●●] Ações              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                              │ │
│  │  ORÇAMENTO #001                                    [Aprovado] │ │
│  │  Ana Silva • anasilva@email.com • (11) 9999-8888             │ │
│  │                                                              │ │
│  │  Proposta: Desenvolvimento Sistema ERP                       │ │
│  │  Responsável: Maria Santos                                   │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │   💰 R$ 125.000,00                    📅 Criado em         │  │
│  │      valor total                       10 Jun 2024        │  │
│  │                                                            │  │
│  │   ──────────────────                  ──────────────────   │  │
│  │                                                            │  │
│  │   📦 15 itens                      ✅ Válido até          │  │
│  │      produtos                       30 Jun 2024            │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ITENS DO ORÇAMENTO                               [Adicionar]│  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ 1 │ Sistema ERP Completo                           │ │  │
│  │  │   │ Qtd: 1 • R$ 50.000,00 cada                      │ │  │
│  │  │   │ Subtotal: R$ 50.000,00                          │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ 2 │ Implementação e Treinamento                     │ │  │
│  │  │   │ Qtd: 1 • R$ 25.000,00 cada                      │ │  │
│  │  │   │ Subtotal: R$ 25.000,00                          │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  RESUMO FINANCEIRO                                         │  │
│  │                                                            │  │
│  │  Subtotal                          R$ 125.000,00           │  │
│  │  Desconto (0%)                     -R$ 0,00                 │  │
│  │  Frete                            R$ 0,00                   │  │
│  │  ─────────────────────────────────────────                │  │
│  │  TOTAL                            R$ 125.000,00            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  HISTÓRICO DE AÇÕES                                        │  │
│  │                                                            │  │
│  │  📧 10/06 - Enviado ao cliente                             │  │
│  │  ✏️  08/06 - Editado por Maria Santos                      │  │
│  │  📝 05/06 - Criado                                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

Estilo:
- Header card: bg white, radius 16px, border 1px solid #E2E8F0, padding 24px
- Info cards: grid 2 colunas, gap 24px
- Ícones: 24px, cor #059669 em container circular 48px
- Labels: font-size 13px, font-weight 500, cor #475569
- Valores: font-size 20px, font-weight 700, cor #0F172A
- Seções: cards separados com margin-bottom 24px
- Tabela de itens: header bg #F6F8FA, rows com hover
- Resumo financeiro: destaque visual para total
- Histórico: timeline vertical com dots conectados
- Espaçamento generoso entre seções (32px)
```

### 1.8 DETALHE DO PEDIDO (PRIORIDADE MÁXIMA)

**ATUAL:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ← Voltar                                    [Ações]               │
├────────────────────────────────────────────────────────────────────┤
│  PEDIDO #001                                                       │
│  Cliente: Ana Silva                                               │
│  Status: [Badge]                                                  │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ Valor Total │  │ Data Pedido │  │ Fornecedor  │               │
│  │ R$ 15.000   │  │ 15/06/2024  │  │ Fornec. A   │               │
│  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                     │
│  ITENS DO PEDIDO                                                   │
│  ...                                                               │
└────────────────────────────────────────────────────────────────────┘
```

**PROPOSTO:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ← Voltar                               [●●●] Ações               │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                              │ │
│  │  PEDIDO #001-2024                           [Confirmado]     │ │
│  │                                                              │ │
│  │  Cliente: Ana Silva                                          │ │
│  │  CPF/CNPJ: 12.345.678/0001-90                               │ │
│  │  📧 anasilva@email.com • 📱 (11) 9999-8888                  │ │
│  │                                                              │ │
│  │  Negociação: Proposta Sistema ERP                           │ │
│  │  Responsável: Maria Santos                                  │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐  │
│  │  📋 INFORMAÇÕES             │ │  🚚 ENTREGA                 │  │
│  │                             │ │                             │  │
│  │  💰 Total: R$ 125.000,00   │ │  Transportadora: Correios  │  │
│  │  📦 15 itens                │ │  Rastreio: AB123456789BR   │  │
│  │  📅 Criado: 15 Jun 2024     │ │  Previsto: 25 Jun 2024     │  │
│  │  ✅ Vencimento: 30 Jun      │ │  Status: Em trânsito       │  │
│  │                             │ │                             │  │
│  └─────────────────────────────┘ └─────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  💳 PAGAMENTO                                         [Pago]│  │
│  │                                                            │  │
│  │  Forma: Boleto bancário                                   │  │
│  │  Parcelas: 3x de R$ 41.666,67                             │  │
│  │                                                            │  │
│  │  ✓ Parc. 1 - R$ 41.666,67 - 15/06/2024 - Confirmado       │  │
│  │  ✓ Parc. 2 - R$ 41.666,67 - 15/07/2024 - Confirmado       │  │
│  │  ⏳ Parc. 3 - R$ 41.666,67 - 15/08/2024 - Pendente        │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  📦 ITENS DO PEDIDO                               [Adicionar]│  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ 1 │ Sistema ERP Completo                           │ │  │
│  │  │   │ Fornecedor: Tech Solutions                      │ │  │
│  │  │   │ Qtd: 1 • Custo: R$ 40.000 • Venda: R$ 50.000  │ │  │
│  │  │   │ Lucro: R$ 10.000 (25%)                        │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  📊 RESUMO FINANCEIRO                                      │  │
│  │                                                            │  │
│  │  Custo Total                      R$ 100.000,00           │  │
│  │  Valor de Venda                   R$ 125.000,00           │  │
│  │  ─────────────────────────────────────────                │  │
│  │  LUCRO TOTAL                      R$ 25.000,00           │  │
│  │                                    Margem: 20%            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

Estilo:
- Similar ao Detalhe do Orçamento, com seções específicas
- Cards de informações em grid 2 colunas
- Seção de pagamento com timeline de parcelas
- Indicadores visuais de status (checkmarks, ícones)
- Cores de status consistentes com badges
- Resumo com destaque para lucro/margem
```

---

## 2. DESIGN TOKENS GLOBAIS

### 2.1 Cores

```css
/* Primárias */
--color-primary: #059669;        /* Verde principal */
--color-primary-soft: #ECFDF5;   /* Verde suave para backgrounds */
--color-primary-hover: #047857;  /* Verde para hover */

/* Backgrounds */
--color-background: #F6F8FA;     /* Cinza muito claro */
--color-surface: #FFFFFF;        /* Branco para cards */
--color-surface-hover: #F1F5F9;  /* Hover state */

/* Bordas */
--color-border: #E2E8F0;         /* Cinza claro */
--color-border-strong: #CBD5E1;   /* Bordas mais escuras */

/* Textos */
--color-heading: #0F172A;       /* Títulos - quase preto */
--color-body: #475569;           /* Corpo - cinza escuro */
--color-muted: #94A3B8;          /* Texto secundário */

/* Status */
--color-blue: #2563EB;           /* Informativo */
--color-blue-soft: #EFF6FF;
--color-orange: #F59E0B;         /* Aviso/Pendente */
--color-orange-soft: #FFFBEB;
--color-red: #DC2626;            /* Erro/Alerta */
--color-red-soft: #FEF2F2;
--color-green: #059669;          /* Sucesso */
--color-green-soft: #ECFDF5;
--color-purple: #7C3AED;         /* Enviado */
--color-purple-soft: #F5F3FF;

/* Variantes de Status para Badges */
--status-aprovado-bg: #ECFDF5;
--status-aprovado-text: #059669;
--status-enviado-bg: #EFF6FF;
--status-enviado-text: #2563EB;
--status-aguardando-bg: #FFFBEB;
--status-aguardando-text: #F59E0B;
--status-cancelado-bg: #FEF2F2;
--status-cancelado-text: #DC2626;
```

### 2.2 Tipografia

```css
/* Font Family */
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Hierarquia */
--font-size-xs: 0.75rem;      /* 12px */
--font-size-sm: 0.875rem;     /* 14px */
--font-size-base: 1rem;       /* 16px */
--font-size-lg: 1.125rem;     /* 18px */
--font-size-xl: 1.25rem;      /* 20px */
--font-size-2xl: 1.5rem;      /* 24px */
--font-size-3xl: 1.875rem;    /* 30px */

/* Font Weights */
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line Heights */
--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;
```

### 2.3 Espaçamento

```css
/* Spacing Scale */
--spacing-1: 0.25rem;   /* 4px */
--spacing-2: 0.5rem;    /* 8px */
--spacing-3: 0.75rem;   /* 12px */
--spacing-4: 1rem;      /* 16px */
--spacing-5: 1.25rem;   /* 20px */
--spacing-6: 1.5rem;    /* 24px */
--spacing-8: 2rem;      /* 32px */
--spacing-10: 2.5rem;   /* 40px */
--spacing-12: 3rem;     /* 48px */
```

### 2.4 Border Radius

```css
/* Radius Scale */
--radius-sm: 0.375rem;   /* 6px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-2xl: 1.5rem;    /* 24px */
--radius-full: 9999px;
```

### 2.5 Sombras

```css
/* Shadows - Estilo Premium Leve */
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.04);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.05), 0 4px 6px rgba(0, 0, 0, 0.04);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.05), 0 8px 10px rgba(0, 0, 0, 0.04);

/* Hover Elevation */
--shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.08);
```

### 2.6 Transições

```css
/* Transitions */
--transition-fast: 150ms ease;
--transition-normal: 200ms ease;
--transition-slow: 300ms ease;
```

---

## 3. COMPONENTES A SEREM ALTERADOS

### 3.1 Layout
| Componente | Arquivo | Alterações |
|------------|---------|------------|
| Sidebar | `components/layout/sidebar.tsx` | Estilo ativo, hover, ícones, largura 240-250px |
| Header | `components/layout/header.tsx` | Avatar, dropdown menu, badge |
| Layout Principal | `app/(dashboard)/layout.tsx` | Background, espaçamento |

### 3.2 UI Base
| Componente | Arquivo | Alterações |
|------------|---------|------------|
| Card | `components/ui/card.tsx` | Radius 16px, border, shadow |
| Button | `components/ui/button.tsx` | Radius, padding, transition |
| Badge | `components/ui/badge.tsx` | Variantes de cores suaves |
| Input | `components/ui/input.tsx` | Border, focus ring |
| Avatar | `components/ui/avatar.tsx` | Border, shadow sutil |

### 3.3 Dashboard/Painel
| Componente | Arquivo | Alterações |
|------------|---------|------------|
| CardKPI | `components/painel/card-kpi.tsx` | Redesign completo estilo Stripe |
| TabelaDesempenho | `components/painel/tabela-desempenho.tsx` | Estilo tabela premium |
| Gráficos | `components/painel/*.tsx` | Cards com estilo consistente |

### 3.4 Pipeline
| Componente | Arquivo | Alterações |
|------------|---------|------------|
| KanbanBoard | `components/pipeline/kanban-board.tsx` | Layout, spacing |
| KanbanColuna | `components/pipeline/kanban-coluna.tsx` | Header, cards |
| KanbanCard | `components/pipeline/kanban-card.tsx` | Visual premium, **sem aumentar altura** |
| BadgeOrigem | `components/leads/badge-origem.tsx` | Padronização de badges |

### 3.5 Orçamentos e Pedidos (PRIORIDADE)
| Componente | Arquivo | Alterações |
|------------|---------|------------|
| **Detalhe Orçamento** | `app/(dashboard)/orcamentos/[id]/page.tsx` | **MÁXIMA PRIORIDADE** |
| **Detalhe Pedido** | `app/(dashboard)/pedidos/[id]/page.tsx` | **MÁXIMA PRIORIDADE** |
| TabelaOrcamentos | `components/orcamentos/tabela-orcamentos.tsx` | Novo visual estilo Pipedrive |
| BadgeStatusOrcamento | `components/orcamentos/badge-status-orcamento.tsx` | Paleta de cores suaves |
| OrcamentoDetalhe | `components/orcamentos/orcamento-detalhe.tsx` | Cards informativos premium |
| AcoesOrcamento | `components/orcamentos/acoes-orcamento.tsx` | Botões padronizados |

### 3.6 Caixa de Entrada
| Componente | Arquivo | Alterações |
|------------|---------|------------|
| ListaItensInbox | `components/caixa-de-entrada/lista-itens-inbox.tsx` | Tabs e cards |
| ItemMensagemPendente | `components/caixa-de-entrada/item-mensagem-pendente.tsx` | Avatar, preview |
| ItemTarefaPendente | `components/caixa-de-entrada/item-tarefa-pendente.tsx` | Visual consistente |
| ItemAtividadeRecente | `components/caixa-de-entrada/item-atividade-recente.tsx` | Cards unificados |

### 3.7 Globais
| Arquivo | Alterações |
|---------|------------|
| `app/globals.css` | Adicionar design tokens como CSS custom properties |
| `tailwind.config.ts` | Atualizar com nova paleta e extensões |

---

## 4. ARQUIVOS IMPACTADOS

### 4.1 Arquivos de Estilo
```
app/globals.css                    - Design tokens + base styles
tailwind.config.ts                 - Configuração da theme
```

### 4.2 Componentes de Layout
```
components/layout/sidebar.tsx
components/layout/header.tsx
components/layout/sidebar-mobile.tsx
components/layout/botao-sair.tsx
```

### 4.3 Componentes UI
```
components/ui/card.tsx
components/ui/button.tsx
components/ui/badge.tsx
components/ui/input.tsx
components/ui/avatar.tsx
components/ui/dropdown-menu.tsx
components/ui/tabs.tsx
```

### 4.4 Componentes de Página - PRIORIDADE MÁXIMA
```
app/(dashboard)/orcamentos/[id]/page.tsx    ← DETALHE ORÇAMENTO
app/(dashboard)/pedidos/[id]/page.tsx       ← DETALHE PEDIDO
```

### 4.5 Componentes de Página - Secondary
```
components/painel/card-kpi.tsx
components/painel/tabela-desempenho.tsx
components/pipeline/kanban-board.tsx
components/pipeline/kanban-coluna.tsx
components/pipeline/kanban-card.tsx
components/orcamentos/tabela-orcamentos.tsx
components/orcamentos/badge-status-orcamento.tsx
components/orcamentos/orcamento-detalhe.tsx
components/orcamentos/acoes-orcamento.tsx
components/caixa-de-entrada/lista-itens-inbox.tsx
components/caixa-de-entrada/item-mensagem-pendente.tsx
components/caixa-de-entrada/item-tarefa-pendente.tsx
```

### 4.6 Páginas (para ajustes pontuais)
```
app/(dashboard)/layout.tsx
app/(dashboard)/page.tsx
app/(dashboard)/painel/page.tsx
app/(dashboard)/pipeline/page.tsx
app/(dashboard)/orcamentos/page.tsx
app/(dashboard)/pedidos/page.tsx
app/(dashboard)/caixa-de-entrada/page.tsx
```

---

## 5. ESTRATÉGIA DE IMPLEMENTAÇÃO

### FASE 0: Preparação
**Objetivo:** Criar branch e capturar estado atual

**Ações:**
1. Criar branch: `git checkout -b feature/redesign-premium`
2. Capturar screenshots de cada tela atual:
   - Dashboard/Painel
   - Pipeline
   - Lista de Orçamentos
   - Detalhe do Orçamento
   - Lista de Pedidos
   - Detalhe do Pedido
   - Caixa de Entrada
   - Sidebar e Header
3. Documentar observações visuais de cada tela

**Entregáveis:**
- Branch criada e pronta para开发
- Screenshots salvos para referência
- Documentação do estado atual

**Tempo estimado:** 30 minutos - 1 hora

---

### FASE 1: Design System Global
**Objetivo:** Criar base de tokens e variáveis CSS

**Arquivos:**
- `app/globals.css` - Adicionar CSS custom properties
- `tailwind.config.ts` - Atualizar com nova paleta

**Entregáveis:**
- Variáveis CSS para cores, espaçamento, radius, sombras
- Classes utilitárias para tipografia
- Mixins/patterns reutilizáveis

**Tempo estimado:** 2-4 horas

---

### FASE 2: Layout Base
**Objetivo:** Atualizar sidebar e header com novo estilo

**Arquivos:**
- `components/layout/sidebar.tsx`
- `components/layout/header.tsx`

**Entregáveis:**
- Sidebar com item ativo em verde suave + barra lateral
- Largura: 240px-250px (manter consistente)
- Hover states elegantes
- Header com avatar melhorado e dropdown

**Tempo estimado:** 2-3 horas

---

### FASE 3: Componentes UI Base
**Objetivo:** Atualizar componentes fundamentais

**Arquivos:**
- `components/ui/card.tsx`
- `components/ui/button.tsx`
- `components/ui/badge.tsx`

**Entregáveis:**
- Cards com radius 16px, border sutil, shadow leve
- Botões com altura padrão 40px, radius 10px
- Badges com cores suaves (não saturadas)

**Tempo estimado:** 3-4 horas

---

### FASE 4: Dashboard/Painel
**Objetivo:** Reformar cards KPI e gráficos

**Arquivos:**
- `components/painel/card-kpi.tsx`
- `components/painel/tabela-desempenho.tsx`
- Gráficos (se existirem)

**Entregáveis:**
- KPIs com ícone em container circular
- Valor destacado com variação percentual
- Visual estilo Stripe Dashboard

**Tempo estimado:** 3-4 horas

---

### FASE 5: Pipeline
**Objetivo:** Melhorar kanban board sem aumentar densidade

**Arquivos:**
- `components/pipeline/kanban-board.tsx`
- `components/pipeline/kanban-coluna.tsx`
- `components/pipeline/kanban-card.tsx`

**Entregáveis:**
- Colunas com header melhorado
- Cards premium com visual refinado
- Hover com elevação sutil (sem mudança de tamanho)
- **NÃO adicionar informações extras nos cards**

**Tempo estimado:** 2-3 horas

---

### FASE 6: Caixa de Entrada
**Objetivo:** Visual estilo HubSpot Inbox

**Arquivos:**
- `components/caixa-de-entrada/lista-itens-inbox.tsx`
- `components/caixa-de-entrada/item-mensagem-pendente.tsx`
- `components/caixa-de-entrada/item-tarefa-pendente.tsx`
- `components/caixa-de-entrada/item-atividade-recente.tsx`

**Entregáveis:**
- Tabs com indicator
- Cards com avatar, preview, timestamp
- Estados hover elegantes

**Tempo estimado:** 3-4 horas

---

### FASE 7: Orçamentos e Pedidos
**Objetivo:** Visual corporativo premium (SEGUNDA PRIORIDADE)

**Arquivos:**
- `components/orcamentos/tabela-orcamentos.tsx`
- `components/orcamentos/badge-status-orcamento.tsx`
- `components/orcamentos/orcamento-detalhe.tsx`
- `components/orcamentos/acoes-orcamento.tsx`
- `app/(dashboard)/orcamentos/page.tsx`
- `app/(dashboard)/pedidos/page.tsx`

**Entregáveis:**
- Tabela estilo Pipedrive com header elegante
- Badges com cores suaves padronizadas
- Cards informativos premium
- Botões com ícones consistentes

**Tempo estimado:** 4-5 horas

---

### FASE 8: DETALHE ORÇAMENTO (PRIORIDADE MÁXIMA)
**Objetivo:** Tela mais refinada do CRM

**Arquivos:**
- `app/(dashboard)/orcamentos/[id]/page.tsx`
- `components/orcamentos/orcamento-detalhe.tsx`

**Entregáveis:**
- Header card com informações completas do cliente
- Grid de informações (valor, data, responsável)
- Cards de seções bem definidos
- Tabela de itens com header elegante
- Resumo financeiro com destaque visual
- Timeline de histórico de ações
- Espaçamento generoso e consistente

**Tempo estimado:** 4-5 horas

---

### FASE 9: DETALHE PEDIDO (PRIORIDADE MÁXIMA)
**Objetivo:** Tela mais refinada do CRM

**Arquivos:**
- `app/(dashboard)/pedidos/[id]/page.tsx`
- Componentes de detalhe do pedido (se existirem)

**Entregáveis:**
- Similar ao Detalhe do Orçamento
- Seção de informações do pedido
- Seção de entrega/rastreamento
- Seção de pagamento com timeline de parcelas
- Cards de itens com indicadores de fornecedor
- Resumo com destaque para lucro/margem

**Tempo estimado:** 4-5 horas

---

**Tempo Total Estimado:** 28-38 horas

---

## 6. RISCOS E MITIGAÇÕES

### Risco 1: Quebra de Responsividade
**Probabilidade:** Média
**Impacto:** Alto

**Mitigação:**
- Testar em múltiplos breakpoints durante cada fase
- Manter mobile-first approach
- Não usar larguras fixas em elementos de layout
- Manter sidebar em 240px-250px (nãofixo acima disso)

### Risco 2: Inconsistência Visual Durante Transição
**Probabilidade:** Alta
**Impacto:** Médio

**Mitigação:**
- Implementar mudanças incrementalmente por fase
- Cada fase deve resultar em estado visual consistente
- Documentar estado visual esperado ao final de cada fase

### Risco 3: Impacto em Funcionalidades Existentes
**Probabilidade:** Baixa
**Impacto:** Alto

**Mitigação:**
- NÃO alterar lógica de negócio, rotas, ou permissões
- Apenas atualizar classes CSS e estrutura visual
- Manter IDs e data-attributes para funcionalidades JS

### Risco 4: Retrocompatibilidade com shadcn/ui
**Probabilidade:** Média
**Impacto:** Médio

**Mitigação:**
- Verificar versões de dependências antes de iniciar
- Manter estrutura do shadcn/ui intacta
- Extender ao invés de substituir estilos existentes

### Risco 5: Tempo de Implementação Superestimado
**Probabilidade:** Média
**Impacto:** Médio

**Mitigação:**
- Dividir cada fase em tarefas menores
- Implementar subset para validação antes de continuar
- Priorizar componentes mais críticos (Detalhe Orçamento/Pedido)

### Risco 6: Aumento de Densidade no Pipeline
**Probabilidade:** Média
**Impacto:** Médio

**Mitigação:**
- NÃO adicionar informações extras nos cards
- Manter altura similar aos cards atuais
- Melhorar visual com cores, bordas e sombras sutis

---

## 7. PLANO DE ROLLBACK

### Estratégia de Rollback

1. **Checkpoint por Fase:**
   - Cada fase será commitada separadamente com tag descritiva
   - Exemplo: `redesign-phase-0-prep`, `redesign-phase-1-tokens`

2. **Rollback por Fase:**
   ```bash
   # Para reverter para estado antes de uma fase:
   git revert <commit-hash>
   # OU
   git checkout <tag-anterior>
   ```

3. **Rollback de CSS Específico:**
   - Se apenas globals.css causar problemas:
   ```bash
   git diff HEAD~1 -- app/globals.css
   ```

### Checklist de Rollback

- [x] Branch `feature/redesign-premium` criada
- [ ] Backup de globals.css antes de FASE 1
- [ ] Backup de tailwind.config antes de FASE 1
- [ ] Tags no git para cada fase completada
- [ ] Lista de commits por fase documentada

### Recuperação de Emergência

Se o redesign causar problemas críticos em produção:
1. Reverter para tag `before-redesign`
2. Investigar problema específico
3. Implementar correção direcionada
4. Retestar antes de novo deploy

---

## 8. CHECKLIST DE QUALIDADE

### Visual
- [ ] Consistência de cores em todos os componentes
- [ ] Consistência de espaçamento
- [ ] Consistência de tipografia
- [ ] Border-radius uniforme
- [ ] Sombras consistentes
- [ ] Sidebar com largura 240px-250px

### Funcional
- [ ] Todos os botões funcionam
- [ ] Dropdowns abrem/fecham
- [ ] Tabelas ordenáveis
- [ ] Filtros funcionam
- [ ] Navegação funciona

### Responsivo
- [ ] Desktop (1920px+)
- [ ] Laptop (1366px - 1920px)
- [ ] Tablet (768px - 1366px)
- [ ] Mobile (320px - 768px)

### Performance
- [ ] Sem FOUC (flash of unstyled content)
- [ ] Transições suaves (60fps)
- [ ] Sem layout shifts

### Prioridade Máxima (Detalhe Orçamento/Pedido)
- [ ] Header card com informações completas
- [ ] Grid de informações bem definido
- [ ] Seções com cards separados
- [ ] Resumo financeiro com destaque
- [ ] Espaçamento generoso (32px entre seções)
- [ ] Timeline de histórico

---

## 9. PRIORIZAÇÃO

### Must Have (Implementar обязательно):
1. Design tokens globais (FASE 1)
2. Sidebar melhorada (FASE 2) - 240px-250px
3. **Detalhe do Orçamento (FASE 8)** - MÁXIMA PRIORIDADE
4. **Detalhe do Pedido (FASE 9)** - MÁXIMA PRIORIDADE
5. Cards KPI do Painel (FASE 4)
6. Tabela de Orçamentos (FASE 7)
7. BadgeStatusOrcamento (FASE 7)

### Should Have (Importante mas não crítico):
1. Header melhorado (FASE 2)
2. Componentes UI (FASE 3)
3. Pipeline cards (FASE 5) - sem aumentar altura
4. Caixa de Entrada (FASE 6)

### Nice to Have (Se sobrar tempo):
1. Animações de transição
2. Micro-interações
3. Skeleton loaders
4. Empty states melhorados

---

## APROVAÇÃO

Antes de prosseguir com a implementação, por favor:

1. ✅ Revise os mockups textuais
2. ✅ Confirme os design tokens
3. ✅ Verifique os arquivos impactados
4. ✅ Avalie a estratégia de implementação
5. ✅ Considere os riscos e mitigações
6. ✅ Confirme prioridade: Detalhe Orçamento/Pedido

**Após aprovação, começar pela FASE 0: Preparação (branch + screenshots)**

---

*Documento atualizado após aprovação*
*Data: $(date +%Y-%m-%d)*