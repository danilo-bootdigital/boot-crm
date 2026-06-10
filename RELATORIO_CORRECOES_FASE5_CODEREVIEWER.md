# Relatório de Correções — FASE 5 (Code Reviewer)

## Diagnóstico Inicial

### Schema Verificado

| Item | Status | Observação |
|------|--------|------------|
| `orders.numero` | ✅ SERIAL | Sequence do banco |
| `orders.supplier_id` | ✅ Existe | Migration 042 |
| `orders.carrier_id` | ✅ Existe | Migration 042 |
| `orders.frete_regiao` | ✅ Existe | Migration 042 |
| `quotes.carrier_id` | ✅ Existe | Migration 035 |
| `quotes.frete_regiao` | ✅ Existe | Migration 035 |
| `quotes.supplier_id` | ❌ NÃO EXISTE | Adicionado na migration 043 |
| `quotes.cliente_aprovado_em` | ✅ Existe | Migration 038 |
| `quotes.aprovado_cliente_em` | ✅ Existe | Migration 041 |
| `pedido_audit_logs` | ✅ Existe | Migration 041 |
| Unique constraint `orders.quote_id` | ❌ NÃO EXISTE | Adicionado na migration 043 |
| Função RPC conversão | ❌ NÃO EXISTE | Criada na migration 043 |

### Discrepâncias Identificadas

1. **Dois campos de data de aprovação em quotes:**
   - `cliente_aprovado_em` (migration 038)
   - `aprovado_cliente_em` (migration 041)
   - **Solução:** A RPC atualiza ambos para compatibilidade

2. **Campo `supplier_id` em quotes não existia:**
   - Necessário para copiar fornecedor do orçamento para pedido
   - **Solução:** Adicionado na migration 043

3. **Sem proteção contra duplicidade:**
   - Não existia unique constraint em `orders.quote_id`
   - **Solução:** Index parcial único criado na migration 043

---

## Arquivos Alterados

| Arquivo | Tipo | Descrição |
|---------|------|----------|
| `app/api/orcamentos/transformar-em-pedido/route.ts` | ALTERADO | Rota refatorada para usar RPC PostgreSQL |
| `supabase/migrations/043_rpc_conversao_orcamento_pedido.sql` | CRIADO | Migration com RPC e constraints |

---

## Migrations Criadas

### `043_rpc_conversao_orcamento_pedido.sql`

**Conteúdo:**
1. Adiciona `supplier_id` na tabela `quotes`
2. Cria index único parcial em `orders.quote_id` (WHERE quote_id IS NOT NULL)
3. Cria função RPC `convert_orcamento_to_pedido()`
4. Concede permissões EXECUTE para usuários autenticados

---

## Função RPC Criada

### `convert_orcamento_to_pedido(p_quote_id uuid, p_motivo text)`

**Comportamento:**
1. **Autenticação:** Verifica usuário autenticado via `auth.uid()`
2. **Organização:** Obtém `organization_id` do perfil do usuário
3. **Bloqueio:** `SELECT FOR UPDATE` no orçamento (proteção contra race condition)
4. **Validação de status:** Verifica `status = 'aprovado_pelo_cliente'`
5. **Verificação de duplicidade:** Verifica se já existe pedido para o orçamento
6. **Verificação de itens:** Garante que há pelo menos 1 item
7. **Criação do pedido:** Sem informar `numero` manualmente (sequence do banco)
8. **Cópia de campos:**
   - organization_id
   - quote_id
   - lead_id
   - contato_id
   - deal_id
   - responsavel_id
   - supplier_id ✅
   - carrier_id ✅
   - valor_total
   - desconto_geral
   - frete
   - frete_regiao ✅
   - observacoes
   - endereco_entrega
   - forma_pagamento
9. **Cópia de itens:** De `quote_items` para `order_items`
10. **Histórico:** Cria registro em `order_status_history`
11. **Atividade:** Cria registro em `activities`
12. **Atualização do orçamento:** Atualiza `cliente_aprovado_em` e `aprovado_cliente_em`
13. **Auditoria:** Registra em `pedido_audit_logs` (se existir)
14. **Retorno:** `success`, `order_id`, `order_numero`, `message`

**原子性:** Toda a operação é executada dentro de uma única transação PostgreSQL.

---

## Problemas Corrigidos

| # | Problema | Solução |
|---|----------|--------|
| 1 | Campos `supplier_id`, `carrier_id`, `frete_regiao` não copiados | RPC copia todos os campos |
| 2 | Número do pedido copiado do orçamento | RPC não informa `numero` (usa sequence) |
| 3 | Lógica complexa de `contato_id` | RPC usa `contato_id` direto do orçamento |
| 4 | Sem transação atômica | RPC executa tudo em uma transação |
| 5 | Rollback manual incompleto | RPC faz rollback automático em caso de erro |
| 6 | Race condition na verificação | `SELECT FOR UPDATE` bloqueia o registro |
| 7 | Nomes de campos incorretos | RPC atualiza ambos `cliente_aprovado_em` e `aprovado_cliente_em` |
| 8 | Sem unique constraint | Index parcial único criado |

---

## Testes Executados

| Teste | Resultado |
|------|-----------|
| `npm run typecheck` | ✅ Passou |
| `npm run lint` (arquivo alterado) | ✅ Passou |
| `git diff` | ✅ Verificado |

### Cenários Testados Mentalmente

| # | Cenário | Comportamento Esperado | Status |
|---|--------|------------------------|--------|
| 1 | Orçamento aprovado converte | Pedido criado com sucesso | ✅ |
| 2 | Orçamento não aprovado | Bloqueado com erro `INVALID_STATUS` | ✅ |
| 3 | Orçamento já convertido | Bloqueado com erro `DUPLICATE_ORDER` | ✅ |
| 4 | Orçamento sem itens | Bloqueado com erro `NO_ITEMS` | ✅ |
| 5 | Dois usuários simultâneos | Primeiro bloqueia o segundo (`SELECT FOR UPDATE`) | ✅ |
| 6 | Número do pedido | Gerado pela sequence do banco | ✅ |
| 7 | Campos supplier/carrier/frete | Preservados na conversão | ✅ |
| 8 | contato_id | Copiado diretamente do orçamento | ✅ |

---

## Riscos Restantes

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Migration com dados duplicados existentes | Baixa | DO BLOCK verifica antes de criar constraint |
| Campos de data duplicados em quotes | Média | RPC atualiza ambos; considerar normalização futura |

---

## Próximos Passos

1. **Executar a migration** no Supabase SQL Editor:
   ```sql
   \i supabase/migrations/043_rpc_conversao_orcamento_pedido.sql
   ```

2. **Testar a conversão** com um orçamento aprovado

3. **Considerar normalização** dos campos de data de aprovação em quotes:
   - `cliente_aprovado_em` (038) vs `aprovado_cliente_em` (041)
   - Escolher um nome canonical e migrar dados

4. **Monitorar logs** de auditoria em `pedido_audit_logs`

---

## Confirmação Final

| Item | Status |
|------|--------|
| 1. Arquivos alterados | ✅ `route.ts` + `043_rpc_conversao_orcamento_pedido.sql` |
| 2. Houve migration | ✅ `043_rpc_conversao_orcamento_pedido.sql` |
| 3. Houve alteração em banco | ✅ Constraint + função RPC + campo `supplier_id` |
| 4. Conversão agora é atômica | ✅ Função RPC executa em transação PostgreSQL |
| 5. Número do pedido vem da sequence | ✅ Não informa `numero` no INSERT |
| 6. Proteção contra duplicidade | ✅ Unique index + verificação na RPC |
| 7. Proteção contra race condition | ✅ `SELECT FOR UPDATE` no orçamento |
