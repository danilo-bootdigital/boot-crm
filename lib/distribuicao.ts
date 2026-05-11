import type { createClient } from '@/lib/supabase/server'
import type { DistribuicaoModo } from '@/types/database'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type ConfigDistribuicao = {
  id: string
  modo: DistribuicaoModo
  apenas_disponiveis: boolean
  limite_por_vendedor: number | null
  proximo_vendedor_idx: number
}

type VendedorElegivel = {
  id: string
  nome: string
}

const CARGOS_ELEGÍVEIS = ['vendedor', 'atendimento'] as const

async function buscarConfig(
  supabase: SupabaseClient,
  orgId: string
): Promise<ConfigDistribuicao> {
  const { data } = await supabase
    .from('lead_distribution_config')
    .select('id, modo, apenas_disponiveis, limite_por_vendedor, proximo_vendedor_idx')
    .eq('organization_id', orgId)
    .single()

  if (data) return data

  const { data: nova } = await supabase
    .from('lead_distribution_config')
    .insert({
      organization_id: orgId,
      modo: 'manual',
      apenas_disponiveis: false,
      limite_por_vendedor: null,
      proximo_vendedor_idx: 0,
    })
    .select('id, modo, apenas_disponiveis, limite_por_vendedor, proximo_vendedor_idx')
    .single()

  if (!nova) throw new Error('Falha ao criar configuração de distribuição.')
  return nova
}

async function buscarVendedoresElegiveis(
  supabase: SupabaseClient,
  orgId: string,
  apenasDisponiveis: boolean
): Promise<VendedorElegivel[]> {
  let query = supabase
    .from('profiles')
    .select('id, nome')
    .eq('organization_id', orgId)
    .eq('ativo', true)
    .in('cargo', CARGOS_ELEGÍVEIS)
    .order('id')

  if (apenasDisponiveis) {
    query = query.eq('disponivel', true)
  }

  const { data } = await query
  return data ?? []
}

async function contarLeadsAbertos(
  supabase: SupabaseClient,
  orgId: string,
  vendedorId: string
): Promise<number> {
  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('responsavel_id', vendedorId)
    .in('status', ['novo', 'em_atendimento'])

  return count ?? 0
}

async function filtrarPorLimite(
  supabase: SupabaseClient,
  orgId: string,
  vendedores: VendedorElegivel[],
  limite: number | null
): Promise<VendedorElegivel[]> {
  if (limite === null) return vendedores

  const resultados = await Promise.all(
    vendedores.map(async (v) => ({
      vendedor: v,
      carga: await contarLeadsAbertos(supabase, orgId, v.id),
    }))
  )

  return resultados
    .filter(({ carga }) => carga < limite)
    .map(({ vendedor }) => vendedor)
}

async function selecionarRotativo(
  supabase: SupabaseClient,
  configId: string,
  vendedores: VendedorElegivel[],
  indiceAtual: number
): Promise<VendedorElegivel> {
  const indice = indiceAtual % vendedores.length
  const vendedor = vendedores[indice]

  const { error: errIdx } = await supabase
    .from('lead_distribution_config')
    .update({ proximo_vendedor_idx: indiceAtual + 1 })
    .eq('id', configId)

  if (errIdx) throw new Error(`Falha ao atualizar índice rotativo: ${errIdx.message}`)

  return vendedor
}

async function selecionarPorCarga(
  supabase: SupabaseClient,
  orgId: string,
  vendedores: VendedorElegivel[]
): Promise<VendedorElegivel> {
  const cargas = await Promise.all(
    vendedores.map(async (v) => ({
      vendedor: v,
      carga: await contarLeadsAbertos(supabase, orgId, v.id),
    }))
  )

  cargas.sort((a, b) => a.carga - b.carga)
  return cargas[0].vendedor
}

export async function distribuirLead(
  supabase: SupabaseClient,
  leadId: string,
  orgId: string,
  autorId: string
): Promise<void> {
  const config = await buscarConfig(supabase, orgId)

  if (config.modo === 'manual') return

  const vendedoresBase = await buscarVendedoresElegiveis(
    supabase,
    orgId,
    config.apenas_disponiveis
  )

  const vendedoresElegiveis = await filtrarPorLimite(
    supabase,
    orgId,
    vendedoresBase,
    config.limite_por_vendedor
  )

  if (vendedoresElegiveis.length === 0) {
    await supabase.from('activities').insert({
      organization_id: orgId,
      autor_id: autorId,
      tipo: 'lead_sem_responsavel',
      descricao: 'Lead criado sem responsável — nenhum vendedor disponível no momento.',
      lead_id: leadId,
    })
    return
  }

  let vendedorSelecionado: VendedorElegivel

  if (config.modo === 'rotativo') {
    vendedorSelecionado = await selecionarRotativo(
      supabase,
      config.id,
      vendedoresElegiveis,
      config.proximo_vendedor_idx
    )
  } else {
    vendedorSelecionado = await selecionarPorCarga(
      supabase,
      orgId,
      vendedoresElegiveis
    )
  }

  await supabase
    .from('leads')
    .update({
      responsavel_id: vendedorSelecionado.id,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', leadId)

  await supabase.from('activities').insert({
    organization_id: orgId,
    autor_id: autorId,
    tipo: 'responsavel_atribuido_automaticamente',
    descricao: `Lead atribuído automaticamente a ${vendedorSelecionado.nome} (modo: ${config.modo}).`,
    lead_id: leadId,
  })
}
