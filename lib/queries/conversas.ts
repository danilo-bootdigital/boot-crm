// ============================================================
// Queries de Conversas para a Central de Atendimento WhatsApp
// ============================================================
// Sub-fase 2.1: Camada de dados (Fase 2)
// Suporta filtros via URL search params (status, busca, etc.)
// Respeita regra de permissão: vendedor vê só instâncias próprias
//   + compartilhadas; se tem instância própria, vê SÓ ela.
// ============================================================

import { createClient } from '@/lib/supabase/server'
import type { Conversation, ConversaStatus, WhatsappInstance, Profile } from '@/types/database'

// ------------------------------------------------------------
// Tipos públicos
// ------------------------------------------------------------

/**
 * Filtros aceitos pela query de conversas.
 * Todos os campos são opcionais; combinações são permitidas.
 */
export type FiltrosConversa = {
  busca?: string
  status?: ConversaStatus | null
  responsavelId?: string | null
  tagIds?: string[]
  instanciaId?: string | null
  somenteNaoLidas?: boolean
  semResponsavel?: boolean
  comLead?: boolean | null
  comContato?: boolean | null
  arquivada?: boolean
}

/**
 * Conversa resumida para a lista da Central.
 * Inclui relações desnormalizadas (responsavel, lead, contato, instancia)
 * e tags agregadas.
 */
export type ConversaResumo = Pick<
  Conversation,
  | 'id'
  | 'organization_id'
  | 'whatsapp_instance_id'
  | 'lead_id'
  | 'contato_id'
  | 'telefone_externo'
  | 'status'
  | 'responsavel_id'
  | 'ultima_mensagem_em'
  | 'nao_lidas'
  | 'arquivada_em'
  | 'nome_contato'
  | 'name_source'
  | 'criado_em'
  | 'atualizado_em'
> & {
  responsavel: Pick<Profile, 'id' | 'nome'> | null
  lead: { id: string; nome: string } | null
  contato: { id: string; nome: string } | null
  instancia: Pick<WhatsappInstance, 'id' | 'nome' | 'status_conexao'> | null
  tags: Array<{ id: string; nome: string; cor: string }>
}

export type ListarConversasOptions = {
  limite?: number
  offset?: number
}

// ------------------------------------------------------------
// Helpers internos
// ------------------------------------------------------------

/**
 * Aplica a regra de permissão de instâncias:
 * - admin/gestor: veem todas
 * - vendedor/atendimento: veem instancias onde vendedor_id = userId OU compartilhado = true
 * - vendedor com instancia propria (compartilhado=false): vei SÓ a dele
 */
async function resolverInstanciasPermitidas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string,
  cargo: string
): Promise<string[] | null> {
  // admin e gestor: sem restricao
  if (cargo !== 'vendedor' && cargo !== 'atendimento') {
    return null // null = sem filtro
  }

  // Verifica se tem instancia PROPRIA (compartilhado = false)
  const { data: instanciaPropria } = await supabase
    .from('whatsapp_instances')
    .select('id')
    .eq('organization_id', orgId)
    .eq('vendedor_id', userId)
    .eq('compartilhado', false)
    .limit(1)

  // Se tem instancia propria exclusiva, retorna SÓ ela
  if (instanciaPropria && instanciaPropria.length > 0) {
    return instanciaPropria.map((i) => i.id as string)
  }

  // Senao, retorna as compartilhadas + as marcadas para ele
  const { data: instances } = await supabase
    .from('whatsapp_instances')
    .select('id')
    .eq('organization_id', orgId)
    .or(`vendedor_id.eq.${userId},compartilhado.eq.true`)

  return (instances ?? []).map((i) => i.id as string)
}

// ------------------------------------------------------------
// Funções públicas
// ------------------------------------------------------------

/**
 * Lista conversas com filtros aplicados no servidor.
 * Retorna um array vazio se o usuário não tem permissão
 * para ver nenhuma instância.
 * Retorna debug info junto com o resultado.
 */
export async function listarConversas(
  orgId: string,
  userId: string,
  cargo: string,
  filtros: FiltrosConversa = {},
  options: ListarConversasOptions = {}
): Promise<{ conversas: ConversaResumo[]; debug: { minCount: number; queryError: string | null } }> {
  const supabase = await createClient()
  const { limite = 100, offset = 0 } = options

  // 1) Regra de permissão de instâncias
  const instanciasPermitidas = await resolverInstanciasPermitidas(
    supabase,
    orgId,
    userId,
    cargo
  )

  // Se vendedor nao tem nenhuma instancia, retorna vazio
  if (instanciasPermitidas !== null && instanciasPermitidas.length === 0) {
    return { conversas: [], debug: { minCount: 0, queryError: null } }
  }

  // 2) Query base
  let query = supabase
    .from('conversations')
    .select(
      `
      id, organization_id, whatsapp_instance_id, lead_id, contato_id,
      telefone_externo, status, responsavel_id, ultima_mensagem_em,
      nao_lidas, arquivada_em, nome_contato, name_source,
      criado_em, atualizado_em,
      responsavel:profiles!conversations_responsavel_id_fkey ( id, nome, avatar_url ),
      lead:leads!conversations_lead_id_fkey ( id, nome ),
      contato:contacts!conversations_contato_id_fkey ( id, nome ),
      instancia:whatsapp_instances!conversations_whatsapp_instance_id_fkey ( id, nome, status_conexao ),
      conversation_tag_links (
        tag:conversation_tags ( id, nome, cor )
      )
      `
    )
    .eq('organization_id', orgId)
    .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
    .range(offset, offset + limite - 1)

  // 3) Aplicar permissão de instâncias
  if (instanciasPermitidas !== null) {
    query = query.in('whatsapp_instance_id', instanciasPermitidas)
  }

  // 4) Aplicar filtros
  if (filtros.instanciaId) {
    query = query.eq('whatsapp_instance_id', filtros.instanciaId)
  }

  if (filtros.status) {
    query = query.eq('status', filtros.status)
  }

  if (filtros.responsavelId !== undefined && filtros.responsavelId !== null) {
    query = query.eq('responsavel_id', filtros.responsavelId)
  } else if (filtros.semResponsavel) {
    query = query.is('responsavel_id', null)
  }

  if (filtros.somenteNaoLidas) {
    query = query.gt('nao_lidas', 0)
  }

  if (filtros.comLead === true) {
    query = query.not('lead_id', 'is', null)
  } else if (filtros.comLead === false) {
    query = query.is('lead_id', null)
  }

  if (filtros.comContato === true) {
    query = query.not('contato_id', 'is', null)
  } else if (filtros.comContato === false) {
    query = query.is('contato_id', null)
  }

  // Arquivada: padrao e NAO arquivada (NULL)
  if (filtros.arquivada === true) {
    query = query.not('arquivada_em', 'is', null)
  } else {
    query = query.is('arquivada_em', null)
  }

  // Busca textual: nome_contato OR lead.nome OR contato.nome OR telefone
  if (filtros.busca && filtros.busca.trim().length > 0) {
    const termo = `%${filtros.busca.trim()}%`
    // OR em colunas de tabelas relacionadas exige filtro extra
    // Aqui filtramos por nome_contato e telefone (campos diretos da conversa)
    query = query.or(
      `nome_contato.ilike.${termo},telefone_externo.ilike.${termo}`
    )
  }

  // 5) Filtrar por tags (in-memory apos query se tagIds presente)

  // DEBUG: Query mínima comparativa (sem JOINs)
  const { count: minCount, error: minError } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('arquivada_em', null)
    .limit(100)

  console.log('[listarConversas] DEBUG minQuery count:', minCount, 'minError:', minError?.message)

  // Query completa com JOINs
  let data: any = null
  let error: any = null
  try {
    const result = await query
    data = result.data
    error = result.error
  } catch (err: any) {
    console.error('[listarConversas] ERRO na query com JOINs:', err)
    error = { message: err.message || String(err) }
  }

  console.log('[listarConversas] orgId:', orgId, 'cargo:', cargo, 'data?.length:', data?.length, 'minCount:', minCount, 'error:', error?.message)

  let resultado = (data ?? []) as unknown as ConversaResumo[]

  // Filtro de tags (client-side apos JOIN, pois Supabase
  // não suporta filter-by-array-relacionado em query unica)
  if (filtros.tagIds && filtros.tagIds.length > 0) {
    resultado = resultado.filter((c) => {
      const tagIdsDaConversa = c.tags?.map((t) => t.id) ?? []
      return filtros.tagIds!.some((id) => tagIdsDaConversa.includes(id))
    })
  }

  return { conversas: resultado, debug: { minCount: minCount ?? 0, queryError: error?.message ?? null } }
}
