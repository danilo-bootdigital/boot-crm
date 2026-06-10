# FASE 0: DOCUMENTAÇÃO DO ESTADO ATUAL

## Branch: `feature/redesign-premium`
## Data: $(date +%Y-%m-%d)

---

## OBSERVAÇÕES DO ESTADO ATUAL

### 1. DETALHE DO ORÇAMENTO
**Arquivo:** `app/(dashboard)/orcamentos/[id]/page.tsx`
**Componente:** `components/orcamentos/orcamento-detalhe.tsx`

**Estrutura atual:**
- Header com número do orçamento + badge de status
- Botões de ação (Exportar PDF, Editar)
- Grid de 4 cards (Dados, Cliente, Fornecedor, Responsável)
- Grid de 3 cards (Endereços, Logística)
- Lista de itens com border rounded
- Resumo financeiro com total em azul
- Observações (se existir)

**Pontos a melhorar:**
- Cards sem hierarquia visual clara
- Falta ícones nos headers dos cards
- Tabela de itens muito simples
- Sem destaque para valor total
- Sem timeline de histórico
- Espaçamento inconsistente entre cards
- Background do page está `bg-slate-50` genérico

---

### 2. DETALHE DO PEDIDO
**Arquivo:** `app/(dashboard)/pedidos/[id]/page.tsx`
**Componente:** `components/pedidos/timeline-status.tsx`

**Estrutura atual:**
- Header com número + badge status
- Timeline de status horizontal (6 etapas)
- Grid 2 colunas: Itens (lg:col-span-2) + Sidebar (info)
- Tabela de itens simples
- Histórico de status em lista
- Cards de Cliente, Detalhes, Orçamento Original

**Pontos a melhorar:**
- Layout "maça" (sidebar à direita) funciona mas pode ser refinado
- Cards sem ícones
- Falta seção de pagamento com parcelas
- Falta seção de entrega/rastreamento
- Sem destaque para lucro/margem
- Timeline funcional mas visual básico

---

### 3. SIDEBAR
**Arquivo:** `components/layout/sidebar.tsx`

**Estado atual:**
- Largura: 256px
- Logo "BOOT CRM" em texto bold
- Lista de links com ícones Lucide
- Item ativo: `bg-slate-100` sem barra lateral
- Hover: `bg-slate-50`

**Pontos a melhorar:**
- Adicionar barra lateral verde para item ativo
- Fundo verde suave para ativo (#ECFDF5)
- Hover mais elegante
- Largura para 240-250px

---

### 4. HEADER
**Arquivo:** `components/layout/header.tsx`

**Estado atual:**
- Avatar simples com iniciais
- Nome do usuário
- Badge de perfil
- Botão sair

**Pontos a melhorar:**
- Avatar com borda sutil
- Dropdown menu para perfil
- Melhor espaçamento

---

### 5. KPI CARDS (PAINEL)
**Arquivo:** `components/painel/card-kpi.tsx`

**Estado atual:**
- Cards com ícone em fundo `bg-slate-100`
- Label, valor, descrição
- Grid 6 colunas

**Pontos a melhorar:**
- Ícone em container circular
- Fundo suave para ícone (#ECFDF5)
- Ícone com cor primária (#059669)
- Valor maior e mais destacado
- Variação percentual

---

### 6. PIPELINE KANBAN
**Arquivos:** `components/pipeline/kanban-board.tsx`, `kanban-coluna.tsx`, `kanban-card.tsx`

**Estado atual:**
- Colunas com fundo `bg-slate-100`
- Cards com border e shadow-sm
- Avatar, nome, telefone, mensagem
- Tags coloridas
- Botão WhatsApp

**Pontos a melhorar:**
- Cards com radius 12px
- Border sutil (#E2E8F0)
- Hover com shadow sutil (sem aumentar altura)
- NÃO adicionar mais informações
- Header da coluna mais elegante

---

### 7. TABELA ORÇAMENTOS
**Arquivo:** `components/orcamentos/tabela-orcamentos.tsx`

**Estado atual:**
- Filtros no topo
- Tabela com header bg-slate-50
- Rows com hover
- Badge de status inline

**Pontos a melhorar:**
- Header mais elegante
- Badges em estilo pill com cores suaves
- Container com radius 16px
- Hover com bg mais suave

---

### 8. CAIXA DE ENTRADA
**Arquivos:** `components/caixa-de-entrada/lista-itens-inbox.tsx` + items

**Estado atual:**
- Tabs com botões
- Lista de cards mistos (mensagens, tarefas, atividades)

**Pontos a melhorar:**
- Tabs com indicator verde
- Cards com border e radius
- Avatar nos cards
- Timestamp mais elegante

---

## PRIORIDADES DE IMPLEMENTAÇÃO

1. **MÁXIMA:** Detalhe Orçamento → Detalhe Pedido
2. **ALTA:** Design Tokens → Sidebar → Header
3. **MÉDIA:** KPI Cards → Tabela Orçamentos
4. **NORMAL:** Pipeline → Caixa de Entrada

---

## CHECKLIST FASE 0

- [x] Branch criada: `feature/redesign-premium`
- [x] Screenshots documentados (via descrição acima)
- [x] Observações registradas
- [ ] Pronto para iniciar FASE 1

---

*Documento de referência para implementação do redesign*