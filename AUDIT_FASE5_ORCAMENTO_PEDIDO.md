# AUDIT: Fluxo de Conversão Orçamento → Pedido
# CRM DPRIME - Fase 5

---

## 1. COMO FUNCIONA HOJE

### Fluxo de Conversão

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USUÁRIO CLIQUE "CONVERTER EM PEDIDO"             │
│                    (status = aprovado_pelo_cliente)                      │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    components/orcamentos/acoes-orcamento-detalhe.tsx     │
│                         converterParaPedido()                            │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            app/api/orcamentos/transformar-em-pedido/route.ts              │
│                      POST /api/orcamentos/transformar-em-pedido           │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    app/(dashboard)/orcamentos/actions.ts                  │
│                         transformarEmPedido()                            │
│                         (função server action)                           │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌───────────────────────┐         ┌───────────────────────┐
│  1. Validar orçamento│         │  2. Verificar pedido   │
│     - status          │         │     existente          │
│     - itens           │         │     (quote_id)         │
│     - contato/lead    │         └───────────────────────┘
└───────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    3. Criar pedido na tabela orders                      │
│                    4. Copiar itens para order_items                      │
│                    5. Registrar histórico de status                      │
│                    6. Registrar atividade                                │
│                    7. Atualizar orçamento                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ARQUIVOS QUE PARTICIPAM

### Server Actions
- `app/(dashboard)/orcamentos/actions.ts`
  - Função: `transformarEmPedido(orcamentoId, motivo?)`
  - Função: `marcarAprovadoCliente(orcamentoId)` - wrapper que chama transformarEmPedido

### API Route
- `app/api/orcamentos/transformar-em-pedido/route.ts`
  - POST endpoint que valida e delega para server action
  - Retorna JSON com sucesso ou erro

### UI Components
- `components/orcamentos/acoes-orcamento-detalhe.tsx`
  - Botão "Converter em Pedido" (apenas quando status = aprovado_pelo_cliente)
  - Input para motivo (opcional)
  - Mensagem quando pedido já foi gerado

### Order Management
- `app/(dashboard)/pedidos/actions.ts`
  - Funções para editar, avançar status, cancelar pedidos
  - Função `editarPedido()` para admin com senha
- `app/(dashboard)/pedidos/page.tsx`
  - Lista de pedidos
- `app/(dashboard)/pedidos/[id]/page.tsx`
  - Detalhes do pedido

### Audit
- `lib/auditoria-pedido.ts`
  - `registrarAuditoriaPedido()` - registra em pedido_audit_logs
  - `compararAlteracoes()` - compara objetos para auditoria

---

## 3. TABELAS UTILIZADAS

### Tabelas de Orçamento (Fonte)
| Tabela | Uso |
|--------|-----|
| `quotes` | Fonte principal do orçamento |
| `quote_items` | Itens do orçamento (cópia será feita) |

### Tabelas de Pedido (Destino)
| Tabela | Uso |
|--------|-----|
| `orders` | Tabela principal do pedido |
| `order_items` | Itens do pedido (cópia congelada) |
| `order_status_history` | Histórico de mudanças de status |
| `pedido_audit_logs` | Auditoria detalhada de alterações |

### Tabelas de Referência
| Tabela | Uso |
|--------|-----|
| `profiles` | Responsável pelo pedido |
| `leads` | Lead vinculado |
| `contacts` | Contato vinculado |
| `deals` | Deal vinculado |
| `activities` | Log de atividades |

---

## 4. CAMPOS DO ORÇAMENTO QUE SÃO COPIADOS PARA PEDIDO

### Tabela: `orders`

| Campo Orçamento | Campo Pedido | Valor Copiado | Notas |
|-----------------|--------------|---------------|-------|
| `numero` | `numero` | `orcamento.numero` | Número do orçamento |
| `quote_id` | `quote_id` | `orcamento.id` | **Vínculo obrigatório** |
| `lead_id` | `lead_id` | `orcamento.lead_id` | Ou null |
| `contato_id` | `contato_id` | `orcamento.contato_id` | Ou derivado do lead |
| `deal_id` | `deal_id` | `orcamento.deal_id` | Ou null |
| `responsavel_id` | `responsavel_id` | `orcamento.responsavel_id` | **Vínculo obrigatório** |
| `valor_total` | `valor_total` | `orcamento.valor_total` | Valor total do orçamento |
| `desconto_geral` | `desconto_geral` | `orcamento.desconto_geral` | Desconto geral aplicado |
| `frete` | `frete` | `orcamento.frete` | Valor do frete |
| `observacoes` | `observacoes` | `orcamento.observacoes` | Observações do orçamento |
| `endereco_entrega` | `endereco_entrega` | `orcamento.endereco_entrega` | Endereço de entrega |
| `forma_pagamento` | `forma_pagamento` | `orcamento.forma_pagamento` | Forma de pagamento |

### Tabela: `order_items`

| Campo Quote Item | Campo Order Item | Valor Copiado | Notas |
|------------------|------------------|---------------|-------|
| `id` | - | - | **Ignorado** (novo ID será gerado) |
| `quote_id` | - | - | **Ignorado** |
| `product_id` | `product_id` | `item.product_id` | Ou null |
| `descricao` | `descricao` | `item.descricao` | Descrição do item |
| `quantidade` | `quantidade` | `item.quantidade` | Quantidade do item |
| `preco_unitario` | `preco_unitario` | `item.preco_unitario` | Preço unitário |
| `desconto_item` | `desconto_item` | `item.desconto_item` | Desconto do item |
| `subtotal` | `subtotal` | `item.subtotal` | Subtotal do item |

---

## 5. CAMPOS QUE FICAM FALTANDO

### Tabela: `orders`

| Campo Orçamento | Campo Pedido | Copiado? | Problema |
|-----------------|--------------|----------|----------|
| `supplier_id` | - | ❌ Não | **Falta vínculo com fornecedor** - importante para rastreabilidade |
| `carrier_id` | - | ❌ Não | **Falta transportadora** - usada em orçamento |
| `frete_regiao` | - | ❌ Não | **Falta região do frete** - usada em orçamento |
| `validade_em` | - | ❌ Não | **Falta validade do orçamento** - pode ser relevante |
| `aprovado_cliente_em` | - | ❌ Não | **Falta data de aprovação** - importante para auditoria |
| `aprovado_cliente_por` | - | ❌ Não | **Falta quem aprovou** - importante para auditoria |

### Tabela: `order_items`

| Campo Quote Item | Campo Order Item | Copiado? | Problema |
|------------------|------------------|----------|----------|
| - | - | - | **Nenhum campo faltando** - todos os campos relevantes são copiados |

---

## 6. COMO EVITAR PEDIDO DUPLICADO

### Implementação Atual ✅

```typescript
// Verificação em duas camadas:

// 1. Em app/api/orcamentos/transformar-em-pedido/route.ts (linha 67-85)
const { data: pedidoExistente } = await supabase
  .from('orders')
  .select('id, numero, status')
  .eq('quote_id', orcamentoId)
  .eq('organization_id', perfil.organization_id)
  .single()

if (pedidoExistente) {
  return NextResponse.json({
    error: `Já existe um pedido gerado para este orçamento (Pedido #${pedidoExistente.numero}). Entre em contato com o administrador para gerar um novo.`
  }, { status: 400 })
}

// 2. Em app/(dashboard)/orcamentos/actions.ts (linha 418-434)
const { data: pedidoExistente } = await supabase
  .from('orders')
  .select('id, numero, status')
  .eq('quote_id', orcamentoId)
  .eq('organization_id', perfil.organization_id)
  .single()

if (pedidoExistente) {
  throw new Error(`Já existe um pedido gerado para este orçamento (Pedido #${pedidoExistente.numero}). Entre em contato com o administrador para gerar um novo.`)
}
```

### Pontos Fortes
- ✅ Verificação duplicada em API route e server action
- ✅ Usa `quote_id` como identificador único
- ✅ Retorna erro claro com número do pedido existente
- ✅ Validação acontece antes de criar qualquer dado

### Pontos Fracos
- ⚠️ `single()` lança erro se não encontrar - tratamento diferenciado entre os dois pontos
- ⚠️ Não há verificação de status do pedido existente (poderia ser 'cancelado' ou 'concluido')

---

## 7. COMO GARANTIR VÍNCULO quote_id

### Implementação Atual ✅

```typescript
// Em app/api/orcamentos/transformar-em-pedido/route.ts (linha 108-109)
const { data: pedido, error: errPedido } = await supabase
  .from('orders')
  .insert({
    organization_id: perfil.organization_id,
    numero: orcamento.numero,
    quote_id: orcamentoId,  // ← VÍNCULO OBRIGATÓRIO
    // ... outros campos
  })
```

### Pontos Fortes
- ✅ `quote_id` é obrigatório na tabela (`NOT NULL REFERENCES quotes(id)`)
- ✅ Campo é copiado corretamente
- ✅ Índice existe: `CREATE INDEX ON orders(quote_id);`

### Pontos Fracos
- ⚠️ Não há validação adicional (ex: verificar se quote_id existe)
- ⚠️ Quando editando pedido, não é possível saber qual orçamento originou (apenas via query inversa)

---

## 8. COMO GARANTIR ROLLBACK EM FALHA PARCIAL

### Rollback Atual - Parcial ✅

```typescript
// Em app/api/orcamentos/transformar-em-pedido/route.ts (linha 140-145)
const { error: errItens } = await supabase.from('order_items').insert(itensParaInserir)
if (errItens) {
  // Rollback: deletar pedido criado sem itens
  await supabase.from('orders').delete().eq('id', pedido.id)
  throw new Error(`Erro ao copiar itens para o pedido: ${errItens.message}`)
}
```

### Pontos Fortes
- ✅ Rollback implementado para falha na inserção de itens
- ✅ Deleta o pedido criado antes de falhar

### Pontos Fracos
- ⚠️ Rollback só existe para falha na inserção de itens
- ⚠️ Se a inserção do pedido falhar, **não há rollback** (pedido não é criado)
- ⚠️ Se a inserção do histórico falhar, **não há rollback** (pedido existe sem histórico)
- ⚠️ Se a inserção da atividade falhar, **não há rollback** (pedido existe sem atividade)
- ⚠️ Rollback não é idempotente (se executado novamente, falhará ao tentar deletar pedido inexistente)

### Fluxo de Rollback Completo (Recomendado)
```
1. Inserir pedido → OK
2. Inserir itens → OK
3. Inserir histórico → OK
4. Inserir atividade → OK
5. Atualizar orçamento → OK

Se qualquer passo falhar:
   4.3: Deletar pedido (já com itens) ✓
   4.2: Deletar pedido (já com histórico) ✓
   4.1: Deletar pedido (já com atividade) ✓
   4.0: Deletar pedido (vazio) ✓
```

---

## 9. SE PRECISA MIGRATION

### Status Atual
- ✅ **Não precisa de migration** para a funcionalidade atual
- ✅ Todas as tabelas já existem
- ✅ Todas as migrations necessárias já foram aplicadas

### Migrations Relacionadas
1. `supabase/migrations/025_orders.sql` - Criação de tabelas orders, order_items, order_status_history
2. `supabase/migrations/041_orcamento_pedido_auditoria.sql` - Criação de pedido_audit_logs e campos de aprovação no quote

### Campos Adicionais que Poderiam Ser Considerados (Future)
```sql
-- Se quiser vincular pedido ao fornecedor
ALTER TABLE orders ADD COLUMN supplier_id UUID REFERENCES suppliers(id);

-- Se quiser registrar quem gerou o pedido (além do responsável)
ALTER TABLE orders ADD COLUMN gerado_por UUID REFERENCES profiles(id);

-- Se quiser registrar data/hora exata da conversão
ALTER TABLE orders ADD COLUMN convertido_em TIMESTAMPTZ;
```

---

## 10. PLANO TÉCNICO DA FASE 5

### Objetivos
1. Completar a conversão orçamento → pedido com dados completos
2. Garantir integridade de dados
3. Implementar rollback robusto
4. Melhorar auditoria
5. Adicionar proteções contra duplicação

### Pré-requisitos (Verificados)
- ✅ Fase 4 totalmente congelada
- ✅ Página pública desabilitada
- ✅ Actions da Fase 4 sem acesso pela UI
- ✅ Typecheck passou
- ✅ Build passou
- ✅ Módulo de orçamentos protegido
- ✅ Módulo de pedidos preservado

### Abordagem Recomendada

#### 1. Melhorar Validação de Pedido Existente
```typescript
// Verificar também se pedido não está cancelado/concluído
const { data: pedidoExistente } = await supabase
  .from('orders')
  .select('id, numero, status')
  .eq('quote_id', orcamentoId)
  .eq('organization_id', perfil.organization_id)
  .neq('status', 'concluido')  // Excluir pedidos concluídos
  .neq('status', 'cancelado')  // Excluir pedidos cancelados
  .maybeSingle()  // Não lançar erro se não encontrar
```

#### 2. Implementar Rollback Robusto
```typescript
async function transformarEmPedido(orcamentoId: string, motivo?: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  // ... validações ...

  let pedidoId: string | null = null

  try {
    // 1. Criar pedido
    const { data: pedido } = await supabase
      .from('orders')
      .insert({ ... })
      .select('id')
      .single()
    pedidoId = pedido.id

    // 2. Copiar itens
    await supabase.from('order_items').insert(...)

    // 3. Registrar histórico
    await supabase.from('order_status_history').insert(...)

    // 4. Registrar atividade
    await supabase.from('activities').insert(...)

    // 5. Atualizar orçamento
    await supabase.from('quotes').update(...)

  } catch (error) {
    // Rollback sequencial se falhar
    if (pedidoId) {
      await supabase.from('orders').delete().eq('id', pedidoId).maybeSingle()
    }
    throw error
  }
}
```

#### 3. Registrar Auditoria de Conversão
```typescript
// Registrar em pedido_audit_logs
await registrarAuditoriaPedido({
  orderId: pedido.id,
  quoteId: orcamentoId,
  usuarioId: perfil.id,
  acao: 'CONVERSAO_ORCAMENTO',
  dadosAnteriores: { ...orcamento },
  dadosNovos: { ...pedido },
  motivo: motivo || 'Conversão manual',
})
```

#### 4. Adicionar Campos Faltantes (Opcional)
```typescript
// Em orders
await supabase.from('orders').insert({
  // ... campos existentes ...
  supplier_id: orcamento.supplier_id,  // Vincular fornecedor
  convertido_em: new Date().toISOString(),  // Data da conversão
  gerado_por: perfil.id,  // Quem gerou (pode ser diferente do responsável)
})
```

#### 5. Melhorar Mensagens de Erro
```typescript
// Mensagens mais descritivas
throw new Error(`Não é possível converter orçamento #${orcamento.numero} em pedido.
Status atual: ${orcamento.status}. Status esperado: aprovado_pelo_cliente.
Itens: ${orcamento.itens?.length || 0}. Cliente: ${orcamento.contato_id || orcamento.lead_id || 'Nenhum'}`)
```

### Checklist de Implementação

- [ ] Melhorar verificação de pedido existente (excluir concluído/cancelado)
- [ ] Implementar rollback em todos os pontos de falha
- [ ] Registrar auditoria de conversão em pedido_audit_logs
- [ ] Considerar adicionar supplier_id ao pedido
- [ ] Considerar adicionar campos de data de conversão
- [ ] Atualizar mensagens de erro para serem mais descritivas
- [ ] Adicionar índice composto para performance (quote_id + organization_id)
- [ ] Testar fluxo completo end-to-end
- [ ] Testar rollback em cenários de falha
- [ ] Testar proteção contra duplicação

### Considerações de Segurança
- ✅ Validação de status (apenas aprovado_pelo_cliente)
- ✅ Validação de itens (pelo menos um item)
- ✅ Validação de cliente (contato ou lead)
- ✅ Validação de pedido existente
- ✅ RLS aplicado em todas as tabelas
- ✅ Organização_id verificado em todas as queries

### Considerações de Performance
- ✅ Índice em `orders(quote_id)`
- ✅ Índice em `orders(organization_id)`
- ✅ Índice em `order_items(order_id)`
- ✅ Índice em `order_status_history(order_id)`
- ✅ Índice em `pedido_audit_logs(order_id)`

### Considerações de UX
- ✅ Botão só aparece quando status = aprovado_pelo_cliente
- ✅ Campo motivo opcional
- ✅ Mensagem clara quando pedido já foi gerado
- ✅ Link para ver pedidos gerados
- ✅ Feedback de loading durante conversão
- ⚠️ Falta botão para ver orçamento original do pedido

---

## CONCLUSÃO

O fluxo atual de conversão orçamento → pedido está **funcional e protegido contra duplicação**, mas pode ser **melhorado** em:

1. **Rollback** - Implementar rollback completo em todos os pontos de falha
2. **Auditoria** - Registrar conversão em pedido_audit_logs
3. **Dados** - Vincular supplier_id ao pedido (falta atual)
4. **Validação** - Melhorar verificação de pedido existente

A implementação da Fase 5 deve focar nestes pontos, mantendo a estabilidade da base atual.
