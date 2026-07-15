-- ============================================================
-- MIGRATION 058: Índice de performance para o Relatório de
-- Pedidos por Fornecedor.
-- ============================================================
-- O relatório filtra/junta pedidos pelo fornecedor do orçamento
-- (orders.quote_id -> quotes.supplier_id). Hoje NÃO existe índice
-- dedicado em quotes(supplier_id); em volume alto o filtro por
-- fornecedor pode ficar caro.
--
-- CONCURRENTLY evita lock de escrita na tabela durante a criação
-- (rode fora de transação — o SQL Editor do Supabase executa cada
-- statement isoladamente, então funciona).
--
-- Recomendado validar com EXPLAIN ANALYZE antes/depois em produção.
-- ============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_org_supplier
  ON quotes (organization_id, supplier_id);
