-- ============================================================
-- 056: Corrige nome_contato gravado com o nome do DONO da linha
-- ============================================================
-- Bug: o webhook usava pushName tambem em mensagens fromMe (ex.: broadcast).
-- Em mensagem fromMe, pushName e o nome de quem ENVIOU (dono da linha),
-- nao do destinatario. Resultado: conversas de broadcast para numeros nao
-- cadastrados ficaram com nome_contato = nome do dono (ex.: "Juliane Foreze")
-- e name_source = 'pushname'.
--
-- Fix de codigo: app/api/webhook/evolution/route.ts passou a usar
-- pushNameContato = fromMe ? null : pushName.
--
-- Este backfill reseta APENAS as conversas afetadas:
--   name_source = 'pushname'
--   AND sem lead vinculado (lead_id IS NULL)
--   AND sem contato vinculado (contato_id IS NULL)
--   AND nao editadas manualmente
-- Essas sao conversas criadas so por mensagem enviada (broadcast/prospeccao),
-- onde o pushName so pode ter vindo do dono da linha.
--
-- Pushnames LEGITIMOS (capturados de mensagens recebidas) tem lead_id
-- preenchido (o webhook cria lead ao receber) e NAO sao tocados aqui.
--
-- Novo nome = fallback de telefone ("Contato " + telefone_externo),
-- identico ao passo 5 de lib/whatsapp/resolver-nome-conversa.ts.
-- whatsapp_push_name tambem e limpo (guardava o nome do dono).
-- ============================================================

UPDATE conversations
SET
  nome_contato = 'Contato ' || telefone_externo,
  name_source = 'phone',
  whatsapp_push_name = NULL,
  atualizado_em = now()
WHERE name_source = 'pushname'
  AND lead_id IS NULL
  AND contato_id IS NULL
  AND COALESCE(is_name_manually_edited, false) = false;
