# PLANO TÉCNICO - BLINDAGEM CONVERSÃO ORÇAMENTO → PEDIDO
# Fase 5 - Enxuto e Focado

---

## 1. ARQUIVOS QUE PRECISAM SER ALTERADOS

### Backend (Server Action Principal)
- **`app/(dashboard)/orcamentos/actions.ts`**
  - Função: `transformarEmPedido()`
  - Implementar transação completa com rollback
  - Adicionar verificação de constraint única
  - Melhorar mensagens de erro
  - Adicionar campos opcionais (se migration existir)

### Backend (API Route)
- **`app/api/orcamentos/transformar-em-pedido/route.ts`**
  - Adicionar tratamento de erro mais robusto
  - Validar constraint única antes de tentar criar
  - Retornar status 409 se pedido já existir

### Backend (Audit)
- **`lib/auditoria-pedido.ts`**
  - Adicionar ação: `'CONVERSAO_ORCAMENTO'`
  - Garantir que auditoria seja registrada mesmo em rollback

### Database
- **`supabase/migrations/`**
  - Verificar se constraint única existe
  - Se não existir, criar migration mínima
  - Adicionar campos opcionais se migration 038 já foi aplicada

---

## 2. PRECISA MIGRATION?

### Constraint Única - SIM (se não existir)
```sql
-- Migration necessária: 042_orders_quote_unique_constraint.sql
ALTER TABLE orders 
ADD CONSTRAINT orders_quote_id_unique UNIQUE (quote_id);

-- Índice já existe, mas constraint garante integridade
```

### Campos Opcionais - DEPENDENTE
```sql
-- Verificar se migration 038 foi aplicada
-- Se sim, adicionar campos em migration separada:
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES carriers(id),
ADD COLUMN IF NOT EXISTS frete_regiao TEXT,
ADD COLUMN IF NOT EXISTS aprovado_cliente_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS aprovado_cliente_por UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS convertido_em TIMESTAMPTZ;
```

### Status
- ✅ **Constraint única**: Verificar se existe
- ⚠️ **Campos opcionais**: Depende de migration 038
- ❌ **Não mexer em**: PDF, WhatsApp, dashboard, UI

---

## 3. QUAL CONSTRAINT PRECISA EXISTIR

### Constraint Obrigatória
```sql
-- Garante que um orçamento só tenha um pedido
ALTER TABLE orders 
ADD CONSTRAINT orders_quote_id_unique UNIQUE (quote_id);
```

### Índices Obrigatórios (já existentes)
```sql
-- Já existem nas migrações anteriores
CREATE INDEX ON orders(quote_id);
CREATE INDEX ON orders(organization_id);
CREATE INDEX ON order_items(order_id);
```

### Verificação Atual
```typescript
// Verificar se constraint existe no banco
const { data: constraints } = await supabase
  .from('information_schema.table_constraints')
  .select('constraint_name')
  .eq('table_name', 'orders')
  .eq('constraint_type', 'UNIQUE')
  .eq('constraint_name', 'orders_quote_id_unique')
```

---

## 4. ESTRATÉGIA DE ROLLBACK

### Transação Completa com Supabase
```typescript
// Supabace não suporta transações nativas em server actions
// Precisar usar RPC ou função PostgreSQL

// Estratégia 1: RPC com função PostgreSQL
const { data, error } = await supabase.rpc('transformar_em_pedido_com_transacao', {
  orcamento_id: orcamentoId,
  motivo: motivo || 'Conversão manual'
})

// Estratégia 2: Server action com rollback manual (menos robusto)
async function transformarEmPedido(orcamentoId: string, motivo?: string) {
  const { supabase, perfil } = await getUsuarioEOrg()
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
    // Rollback manual
    if (pedidoId) {
      await supabase.from('order_items').delete().eq('order_id', pedidoId)
      await supabase.from('orders').delete().eq('id', pedidoId)
    }
    throw error
  }
}
```

### Recomendação: Usar RPC
```sql
-- Função PostgreSQL: supabase/migrations/042_transformar_pedido.sql
CREATE OR REPLACE FUNCTION transformar_em_pedido_com_transacao(
  orcamento_id UUID,
  motivo TEXT DEFAULT NULL,
  usuario_id UUID
) RETURNS JSONB AS $$
DECLARE
  pedido_id UUID;
  quote_rec RECORD;
BEGIN
  -- Iniciar transação
  BEGIN
    -- Verificar se já existe pedido
    SELECT id INTO pedido_id FROM orders WHERE quote_id = orcamento_id;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Pedido já existe para este orçamento'
      );
    END IF;
    
    -- Buscar orçamento
    SELECT * INTO quote_rec FROM quotes WHERE id = orcamento_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Orçamento não encontrado'
      );
    END IF;
    
    -- Criar pedido
    INSERT INTO orders (
      organization_id, numero, quote_id, lead_id, contato_id,
      deal_id, responsavel_id, status, valor_total,
      desconto_geral, frete, observacoes, endereco_entrega,
      forma_pagamento, supplier_id, carrier_id, frete_regiao,
      aprovado_cliente_em, aprovado_cliente_por, convertido_em
    ) VALUES (
      quote_rec.organization_id, quote_rec.numero, quote_rec.id,
      quote_rec.lead_id, quote_rec.contato_id, quote_rec.deal_id,
      quote_rec.responsavel_id, 'pendente', quote_rec.valor_total,
      quote_rec.desconto_geral, quote_rec.frete, quote_rec.observacoes,
      quote_rec.endereco_entrega, quote_rec.forma_pagamento,
      quote_rec.supplier_id, quote_rec.carrier_id, quote_rec.frete_regiao,
      quote_rec.aprovado_cliente_em, quote_rec.aprovado_cliente_por,
      NOW()
    ) RETURNING id INTO pedido_id;
    
    -- Copiar itens
    INSERT INTO order_items (
      order_id, product_id, descricao, quantidade,
      preco_unitario, desconto_item, subtotal
    )
    SELECT 
      pedido_id, product_id, descricao, quantidade,
      preco_unitario, desconto_item, subtotal
    FROM quote_items 
    WHERE quote_id = orcamento_id;
    
    -- Registrar histórico
    INSERT INTO order_status_history (
      organization_id, order_id, status_anterior, status_novo,
      observacao, autor_id
    ) VALUES (
      quote_rec.organization_id, pedido_id, NULL, 'pendente',
      'Pedido gerado a partir do orçamento #' || orcamento_id || 
      COALESCE(' - ' || motivo, ''), usuario_id
    );
    
    -- Registrar atividade
    INSERT INTO activities (
      organization_id, tipo, descricao, lead_id, deal_id, autor_id
    ) VALUES (
      quote_rec.organization_id, 'pedido_gerado',
      'Pedido #' || quote_rec.numero || ' gerado a partir do orçamento aprovado.' ||
      COALESCE(' Motivo: ' || motivo, ''),
      quote_rec.lead_id, quote_rec.deal_id, usuario_id
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'pedido_id', pedido_id,
      'pedido_numero', quote_rec.numero,
      'message', 'Pedido gerado com sucesso'
    );
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback automático
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. SUPABASE PERMITE TRANSAÇÃO REAL?

### Limitações do Supabase
- ❌ **Server Actions**: Não suportam transações completas
- ❌ **API Routes**: Não suportam transações completas
- ✅ **RPC**: Suporta transações no PostgreSQL
- ✅ **Edge Functions**: Podem usar transações

### Recomendação
**Usar RPC com função PostgreSQL** para garantir:
- Transação atômica
- Rollback automático em caso de erro
- Performance melhor
- Menos código no frontend

---

## 6. RISCO DE MEXAR APENAS NA SERVER ACTION ATUAL

### Riscos
```typescript
// Risco: Falha parcial sem transação
async function transformarEmPedido(orcamentoId: string, motivo?: string) {
  // 1. Criar pedido - OK
  // 2. Copiar itens - OK
  // 3. Registrar histórico - falha aqui!
  // 4. Registrar atividade - não executa
  // 5. Atualizar orçamento - não executa
  
  // Resultado: Pedido existe sem histórico e sem atividade
  // Dados inconsistententes!
}
```

### Impactos
1. **Dados inconsistentes**: Pedido existe sem histórico
2. **Auditoria incompleta**: Não sabe como foi criado
3. **Orçamento não atualizado**: Fica sem referência ao pedido
4. **Experiência do usuário**: Pedido aparece "fantasma"

### Conclusão
**Risco alto** - a implementação atual não é atômica

---

## 7. PLANO DE IMPLEMENTAÇÃO EM ETAPAS PEQUENAS

### Etapa 1: Verificar e Criar Constraint (1 hora)
```sql
-- Verificar se constraint existe
-- Se não existir, criar migration 042_orders_quote_unique.sql
```

### Etapa 2: Criar Função PostgreSQL RPC (2 horas)
```sql
-- Criar função transformar_em_pedido_com_transacao
-- Testar manualmente via Supabase Studio
```

### Etapa 3: Atualizar Server Action (3 horas)
```typescript
// Substituir implementação atual por chamada RPC
// Manter mesma interface (mesmos parâmetros e retorno)
```

### Etapa 4: Adicionar Campos Opcionais (1 hora)
```sql
// Se migration 038 já foi aplicada:
// Adicionar supplier_id, carrier_id, etc.
```

### Etapa 5: Testes (2 horas)
```bash
# Testar cenários:
# - Conversão normal
# - Tentativa de duplicação
# - Falha no meio do processo
# - Verificar rollback
```

### Etapa 6: Monitorar (contínuo)
```sql
-- Monitorar logs de erro
-- Verificar se constraint está funcionando
```

### Cronograma Total: ~9 horas (distribuídas)

---

## RESUMO DAS DECISÕES TÉCNICAS

1. **Abordagem**: RPC com função PostgreSQL
   - Garante transação atômica
   - Rollback automático
   - Performance superior

2. **Constraint**: Única em `orders.quote_id`
   - Impede duplicação real
   - Garante integridade referencial

3. **Campos opcionais**: Adicionar se migration 038 existir
   - supplier_id
   - carrier_id
   - frete_regiao
   - aprovado_cliente_em (já existe em quotes)
   - convertido_em

4. **Não alterar**: UI, PDF, WhatsApp, dashboard
   - Foco apenas no backend
   - Blindagem primeiro, depois UI

5. **Risco controlado**: Etapas pequenas e verificáveis
   - Cada etapa testada antes da próxima
   - Rollback sempre garantido

---

## CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Verificar constraint única atual
- [ ] Criar migration se necessário
- [ ] Criar função PostgreSQL RPC
- [ ] Atualizar server action para usar RPC
- [ ] Adicionar campos opcionais (se migration 038 aplicada)
- [ ] Testar fluxo completo
- [ ] Testar tentativa de duplicação
- [ ] Testar rollback em falha
- [ ] Monitorar logs de produção
