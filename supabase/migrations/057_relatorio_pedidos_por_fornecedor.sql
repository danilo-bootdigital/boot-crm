-- ============================================================
-- MIGRATION 057: Relatório de Pedidos por Fornecedor
-- ============================================================
-- Apenas funções (RPC). NÃO altera schema de tabelas.
--
-- Modelo confirmado na auditoria:
--   * orders NÃO tem supplier_id. O fornecedor vem de
--     orders.quote_id -> quotes.supplier_id -> suppliers.
--     => 1 pedido tem no máximo 1 fornecedor (ou "Sem fornecedor").
--   * Data do pedido = orders.criado_em (data de emissão efetiva:
--     o pedido só nasce ao transformar o orçamento aprovado).
--   * Valores (snapshot congelado do orçamento):
--       valor_final    = orders.valor_total  (autoritativo)
--       frete          = orders.frete
--       subtotal_itens = SUM(order_items.subtotal)
--       desconto (R$)  = (subtotal_itens + frete) - valor_final
--                        (identidade exata: subtotal - desconto + frete = valor_final)
--       acréscimo      = NÃO EXISTE no modelo (omitido)
--   * Isolamento: RLS por organization_id via get_organization_id().
--     Vendedor: restrito aos próprios pedidos (responsavel_id = auth.uid()).
--     -> Enforcado DENTRO da função (mais forte que só no app).
--
-- SECURITY INVOKER: as consultas rodam como o usuário chamador,
-- portanto as políticas RLS de orders/order_items/quotes/suppliers
-- são aplicadas automaticamente.
-- ============================================================

-- ------------------------------------------------------------
-- 1) TOTAIS GLOBAIS (cards do topo do relatório)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION relatorio_pedidos_fornecedor_totais(
  p_inicio          timestamptz,
  p_fim             timestamptz,
  p_supplier_id     uuid    DEFAULT NULL,
  p_status          text[]  DEFAULT NULL,
  p_cliente_id      uuid    DEFAULT NULL,
  p_responsavel_id  uuid    DEFAULT NULL
)
RETURNS TABLE (
  qtd_pedidos       bigint,
  valor_total       numeric,
  ticket_medio      numeric,
  qtd_itens         numeric,
  qtd_clientes      bigint,
  qtd_fornecedores  bigint,
  total_subtotal    numeric,
  total_desconto    numeric,
  total_frete       numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      o.id,
      o.valor_total,
      o.frete,
      -- cliente resolvido nas mesmas fontes da tabela detalhada
      COALESCE(o.contato_id, o.lead_id, q.contato_id, q.lead_id) AS cliente_ref,
      q.supplier_id,
      COALESCE(it.subtotal_itens, 0) AS subtotal_itens,
      COALESCE(it.qtd_itens, 0)      AS qtd_itens
    FROM orders o
    JOIN quotes q ON q.id = o.quote_id
    LEFT JOIN (
      SELECT order_id,
             SUM(subtotal)   AS subtotal_itens,
             SUM(quantidade) AS qtd_itens
      FROM order_items
      GROUP BY order_id
    ) it ON it.order_id = o.id
    WHERE o.organization_id = get_organization_id()
      AND o.criado_em >= p_inicio
      AND o.criado_em <= p_fim
      AND (p_status IS NULL OR o.status = ANY (p_status::order_status[]))
      AND (p_supplier_id IS NULL OR q.supplier_id = p_supplier_id)
      AND (p_cliente_id IS NULL OR o.contato_id = p_cliente_id OR o.lead_id = p_cliente_id)
      AND (
        CASE WHEN get_user_role() = 'vendedor'
          THEN o.responsavel_id = auth.uid()
          ELSE (p_responsavel_id IS NULL OR o.responsavel_id = p_responsavel_id)
        END
      )
  )
  SELECT
    COUNT(*)::bigint                                                        AS qtd_pedidos,
    COALESCE(SUM(valor_total), 0)                                          AS valor_total,
    CASE WHEN COUNT(*) > 0 THEN SUM(valor_total) / COUNT(*) ELSE 0 END     AS ticket_medio,
    COALESCE(SUM(qtd_itens), 0)                                           AS qtd_itens,
    COUNT(DISTINCT cliente_ref)::bigint                                    AS qtd_clientes,
    COUNT(DISTINCT COALESCE(supplier_id::text, '__sem__'))::bigint         AS qtd_fornecedores,
    COALESCE(SUM(subtotal_itens), 0)                                     AS total_subtotal,
    COALESCE(SUM(subtotal_itens) + SUM(frete) - SUM(valor_total), 0)       AS total_desconto,
    COALESCE(SUM(frete), 0)                                               AS total_frete
  FROM base;
$$;

COMMENT ON FUNCTION relatorio_pedidos_fornecedor_totais IS
  'KPIs globais do Relatório de Pedidos por Fornecedor. Considera todos os pedidos dos filtros (independe de paginação).';

-- ------------------------------------------------------------
-- 2) CONSOLIDADO POR FORNECEDOR (tabela consolidada + % participação)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION relatorio_pedidos_fornecedor_consolidado(
  p_inicio          timestamptz,
  p_fim             timestamptz,
  p_supplier_id     uuid    DEFAULT NULL,
  p_status          text[]  DEFAULT NULL,
  p_cliente_id      uuid    DEFAULT NULL,
  p_responsavel_id  uuid    DEFAULT NULL
)
RETURNS TABLE (
  supplier_id   uuid,
  fornecedor    text,
  qtd_pedidos   bigint,
  qtd_itens     numeric,
  subtotal      numeric,
  desconto      numeric,
  frete         numeric,
  valor_final   numeric,
  ticket_medio  numeric,
  participacao  numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      o.id,
      o.valor_total,
      o.frete,
      q.supplier_id AS sup_id,
      COALESCE(s.nome, 'Sem fornecedor') AS forn_nome,
      COALESCE(it.subtotal_itens, 0) AS subtotal_itens,
      COALESCE(it.qtd_itens, 0)      AS qtd_itens
    FROM orders o
    JOIN quotes q ON q.id = o.quote_id
    LEFT JOIN suppliers s ON s.id = q.supplier_id
    LEFT JOIN (
      SELECT order_id,
             SUM(subtotal)   AS subtotal_itens,
             SUM(quantidade) AS qtd_itens
      FROM order_items
      GROUP BY order_id
    ) it ON it.order_id = o.id
    WHERE o.organization_id = get_organization_id()
      AND o.criado_em >= p_inicio
      AND o.criado_em <= p_fim
      AND (p_status IS NULL OR o.status = ANY (p_status::order_status[]))
      AND (p_supplier_id IS NULL OR q.supplier_id = p_supplier_id)
      AND (p_cliente_id IS NULL OR o.contato_id = p_cliente_id OR o.lead_id = p_cliente_id)
      AND (
        CASE WHEN get_user_role() = 'vendedor'
          THEN o.responsavel_id = auth.uid()
          ELSE (p_responsavel_id IS NULL OR o.responsavel_id = p_responsavel_id)
        END
      )
  ),
  total AS ( SELECT NULLIF(SUM(valor_total), 0) AS vf_total FROM base )
  SELECT
    b.sup_id,
    b.forn_nome,
    COUNT(*)::bigint,
    SUM(b.qtd_itens),
    SUM(b.subtotal_itens),
    (SUM(b.subtotal_itens) + SUM(b.frete) - SUM(b.valor_total)),
    SUM(b.frete),
    SUM(b.valor_total),
    CASE WHEN COUNT(*) > 0 THEN SUM(b.valor_total) / COUNT(*) ELSE 0 END,
    CASE WHEN (SELECT vf_total FROM total) IS NOT NULL
      THEN ROUND(SUM(b.valor_total) / (SELECT vf_total FROM total) * 100, 2)
      ELSE 0 END
  FROM base b
  GROUP BY b.sup_id, b.forn_nome
  ORDER BY SUM(b.valor_total) DESC;
$$;

COMMENT ON FUNCTION relatorio_pedidos_fornecedor_consolidado IS
  'Agregação por fornecedor com % de participação (valor_final do fornecedor / valor_final total). GROUP BY no banco evita duplicidade do join com itens.';

-- ------------------------------------------------------------
-- 3) DETALHE PAGINADO (tabela detalhada de pedidos)
--    p_limit NULL => sem limite (usado na exportação de todos os registros)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION relatorio_pedidos_fornecedor_detalhe(
  p_inicio          timestamptz,
  p_fim             timestamptz,
  p_supplier_id     uuid    DEFAULT NULL,
  p_status          text[]  DEFAULT NULL,
  p_cliente_id      uuid    DEFAULT NULL,
  p_responsavel_id  uuid    DEFAULT NULL,
  p_limit           int     DEFAULT 50,
  p_offset          int     DEFAULT 0
)
RETURNS TABLE (
  id            uuid,
  numero        int,
  criado_em     timestamptz,
  status        order_status,
  fornecedor    text,
  cliente       text,
  responsavel   text,
  qtd_itens     numeric,
  subtotal      numeric,
  desconto      numeric,
  frete         numeric,
  valor_final   numeric,
  total_rows    bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      o.id,
      o.numero,
      o.criado_em,
      o.status,
      o.valor_total,
      o.frete,
      COALESCE(s.nome, 'Sem fornecedor') AS fornecedor,
      COALESCE(c.nome, l.nome, qc.nome, ql.nome, '—') AS cliente,
      COALESCE(p.nome, '—') AS responsavel,
      COALESCE(it.subtotal_itens, 0) AS subtotal_itens,
      COALESCE(it.qtd_itens, 0)      AS qtd_itens,
      COUNT(*) OVER () AS total_rows
    FROM orders o
    JOIN quotes q ON q.id = o.quote_id
    LEFT JOIN suppliers s ON s.id = q.supplier_id
    LEFT JOIN profiles  p ON p.id = o.responsavel_id
    LEFT JOIN contacts  c ON c.id = o.contato_id
    LEFT JOIN leads     l ON l.id = o.lead_id
    LEFT JOIN contacts  qc ON qc.id = q.contato_id
    LEFT JOIN leads     ql ON ql.id = q.lead_id
    LEFT JOIN (
      SELECT order_id,
             SUM(subtotal)   AS subtotal_itens,
             SUM(quantidade) AS qtd_itens
      FROM order_items
      GROUP BY order_id
    ) it ON it.order_id = o.id
    WHERE o.organization_id = get_organization_id()
      AND o.criado_em >= p_inicio
      AND o.criado_em <= p_fim
      AND (p_status IS NULL OR o.status = ANY (p_status::order_status[]))
      AND (p_supplier_id IS NULL OR q.supplier_id = p_supplier_id)
      AND (p_cliente_id IS NULL OR o.contato_id = p_cliente_id OR o.lead_id = p_cliente_id)
      AND (
        CASE WHEN get_user_role() = 'vendedor'
          THEN o.responsavel_id = auth.uid()
          ELSE (p_responsavel_id IS NULL OR o.responsavel_id = p_responsavel_id)
        END
      )
    ORDER BY o.criado_em DESC
    LIMIT p_limit OFFSET p_offset
  )
  SELECT
    b.id,
    b.numero,
    b.criado_em,
    b.status,
    b.fornecedor,
    b.cliente,
    b.responsavel,
    b.qtd_itens,
    b.subtotal_itens,
    (b.subtotal_itens + b.frete - b.valor_total) AS desconto,
    b.frete,
    b.valor_total AS valor_final,
    b.total_rows
  FROM base b
  ORDER BY b.criado_em DESC;
$$;

COMMENT ON FUNCTION relatorio_pedidos_fornecedor_detalhe IS
  'Lista paginada de pedidos do relatório. total_rows (window COUNT) traz o total de registros dos filtros para a paginação não alterar os totais. p_limit NULL = todos (exportação).';
