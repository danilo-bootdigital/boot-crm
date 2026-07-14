-- ============================================================
-- 056: Corrige nome_contato gravado com o nome do DONO da linha
-- ============================================================
-- Bug: o webhook usava pushName tambem em mensagens fromMe (ex.: broadcast).
-- Em mensagem fromMe, pushName e o nome de quem ENVIOU (dono da linha),
-- nao do destinatario. Resultado: conversas ficaram com
-- nome_contato = nome do dono (ex.: "Juliane Foreze") e name_source = 'pushname'.
--
-- Fix de codigo: app/api/webhook/evolution/route.ts passou a usar
-- pushNameContato = fromMe ? null : pushName.
--
-- Este backfill RE-RESOLVE todas as conversas com name_source = 'pushname'
-- (nao editadas manualmente) pela regra oficial SEM o tier pushname:
--     contact > lead > phone
-- Isso e seguro porque um pushName legitimo (nome do cliente vindo de
-- mensagem RECEBIDA) sempre gera tambem um lead com esse nome -> essas
-- conversas ficam com name_source = 'lead', nao 'pushname'. Logo, toda
-- conversa 'pushname' teve o nome sobrescrito por uma mensagem enviada.
--
-- NAO altera a tabela leads (decisao de negocio: nomes de lead poluidos
-- sao tratados separadamente).
--
-- Efeito medido nos dados de producao (2026-07):
--   contact ~8  | lead ~248 (recupera nome real) | phone ~195
-- ============================================================

-- Regra de nome valido (por coluna): nao vazio, nao 'Contato WhatsApp',
-- nao puramente numerico. Mesma ideia de isValidName() em
-- resolver-nome-conversa.ts. Em SQL: contem ao menos um caractere nao-digito
-- => regexp_replace(x,'\D','','g') <> TRIM(x).
UPDATE conversations c
SET
  nome_contato = COALESCE(
    CASE WHEN TRIM(ct.nome) <> '' AND TRIM(ct.nome) <> 'Contato WhatsApp'
              AND regexp_replace(ct.nome, '\D', '', 'g') <> TRIM(ct.nome)
         THEN TRIM(ct.nome) END,                                      -- 1) contact
    CASE WHEN TRIM(l.nome) <> '' AND TRIM(l.nome) <> 'Contato WhatsApp'
              AND regexp_replace(l.nome, '\D', '', 'g') <> TRIM(l.nome)
         THEN TRIM(l.nome) END,                                       -- 2) lead
    'Contato ' || c.telefone_externo                                  -- 3) phone
  ),
  name_source = CASE
    WHEN TRIM(ct.nome) <> '' AND TRIM(ct.nome) <> 'Contato WhatsApp'
         AND regexp_replace(ct.nome, '\D', '', 'g') <> TRIM(ct.nome) THEN 'contact'
    WHEN TRIM(l.nome) <> '' AND TRIM(l.nome) <> 'Contato WhatsApp'
         AND regexp_replace(l.nome, '\D', '', 'g') <> TRIM(l.nome) THEN 'lead'
    ELSE 'phone'
  END,
  -- whatsapp_push_name guardava o nome do dono da linha: limpar
  whatsapp_push_name = NULL,
  atualizado_em = now()
FROM conversations c2
  LEFT JOIN contacts ct
    ON ct.id = c2.contato_id
    AND ct.organization_id = c2.organization_id
  LEFT JOIN leads l
    ON l.id = c2.lead_id
    AND l.organization_id = c2.organization_id
WHERE c.id = c2.id
  AND c.name_source = 'pushname'
  AND COALESCE(c.is_name_manually_edited, false) = false;   -- respeita manual
