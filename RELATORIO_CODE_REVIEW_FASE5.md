# RELATORIO_CODE_REVIEW_FASE5.md

## Estado Real do Banco (Supabase - aplicado manualmente)

### ✅ Campos já existentes no banco real:
- Constraint UNIQUE em `orders.quote_id`
- Campos em `order_items`: `product_id`, `descricao`, `quantidade`, `preco_unitario`
- Campos em `quotes`: `aprovado_cliente_em`, `aprovado_cliente_por`
- Campos em `orders`: `supplier_id`, `carrier_id`, `frete_regiao`

### ❌ Campos que NÃO existem no banco:
- RPC `converter_orcamento_em_pedido`
- API utilizando RPC
- Botão de conversão na interface

## Estado Real do Repositório

### Arquivos não rastreados (untracked):
```
?? AUDIT_FASE5_ORCAMENTO_PEDIDO.md
?? PLANO_BLINDAGEM_FASE5.md
?? supabase/migrations/042_orders_supplier_carrier_frete.sql
```

### Migrations existentes no repositório:
- Migration 042: `042_orders_supplier_carrier_frete.sql` - CORRETA
- Migration 043: REMOVIDA (estava quebrada)
- Migration 046: NÃO existe

## Arquivos Suspeitos

### 1. `supabase/migrations/042_orders_supplier_carrier_frete.sql`
- **Status**: CORRETA e segura
- **Conteúdo**: Adiciona supplier_id, carrier_id, frete_regiao em orders
- **Risco**: NENHUM - migration simples e segura

### 2. `components/orcamentos/acoes-orcamento.tsx`
- **Status**: MODIFICADO mas sem contexto
- **Problema**: Não sabemos o que foi alterado
- **Risco**: DESCONHECIDO - precisa de diff

## Divergências Entre Banco Real e Migrations

### 1. Migrations faltando no repositório:
- Migration para adicionar `aprovado_cliente_em` e `aprovado_cliente_por` em quotes
- Migration para adicionar campos em `order_items` (se aplicável)
- Migration para criar constraint UNIQUE em `orders.quote_id`

### 2. Schema atual vs migrations:
- O banco real tem campos que não estão refletidos nas migrations originais
- As migrations 001-041 não incluem os campos manuais aplicados

## Migrations Incorretas

### 1. Migration 043 (REMOVIDA)
- Problemas: nome truncado, queries cortadas, COMMIT/ROLLBACK indevido, uso incorreto de auth.uid()
- Status: APAGADA - correto

### 2. Tentativa de migration 046
- Status: NÃO existe - nenhum risco

## Riscos Atuais

### 1. Risco de divergência de schema:
- O banco real tem campos que não estão nas migrations
- Se alguém clonar o repositório, o schema será diferente

### 2. Risco de perda de migrações:
- As alterações manuais no Supabase não estão versionadas
- Não há como reproduzir o ambiente atual

### 3. Risco na componente alterada:
- `acoes-orcamento.tsx` foi modificado sem contexto
- Pode conter bugs ou implementações incompletas

## Próxima Ação Recomendada

### 1. Criar migrations faltantes:
```sql
-- Migration: 044_aprovacao_cliente_quotes.sql
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS aprovado_cliente_em TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS aprovado_cliente_por UUID REFERENCES profiles(id);

-- Migration: 045_order_items_campos.sql
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS quantidade NUMERIC(10,3);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS preco_unitario NUMERIC(12,2);

-- Migration: 046_orders_quote_unique.sql
ALTER TABLE orders ADD CONSTRAINT orders_quote_id_unique UNIQUE(quote_id);
```

### 2. Criar RPC correta:
- Criar migration 047 com RPC segura
- Sem COMMIT/ROLLBACK dentro da função
- Sem uso de auth.uid()
- Parâmetros corretos: p_orcamento_id UUID, p_usuario_id UUID, p_motivo TEXT DEFAULT NULL

### 3. Auditoria da componente alterada:
- Verificar o que foi alterado em `acoes-orcamento.tsx`
- Validar se está completo e seguro

## O Que NÃO Deve Ser Feito

### 1. NÃO executar migrations existentes sem verificar:
- As migrations manuais já foram aplicadas
- Executá-lais novamente pode causar erros

### 2. NÃO criar RPC com:
- COMMIT/ROLLBACK dentro da função
- Uso de auth.uid()
- Queries truncadas ou incompletas

### 3. NÃO assumir que o repositório está atualizado:
- O schema real está à frente das migrations
- Precisamos sincronizar as migrations com o banco real

### 4. NÃO apagar a migration 042:
- Ela está correta e reflete o estado atual do banco
- É necessária para manter o repositório consistente

## Conclusão

O estado atual está em uma posição de transição:
- O banco real tem funcionalidades que o repositório não reflete
- Precisamos criar migrations faltantes para sincronizar
- A RPC ainda não existe e precisa ser implementada com segurança

A estratégia deve focar em:
1. Sincronizar migrations com o banco real
2. Implementar RPC segura
3. Validar as alterações existentes
4. Criar API e interface após a RPC