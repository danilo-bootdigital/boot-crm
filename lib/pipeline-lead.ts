import type { SupabaseClient } from '@supabase/supabase-js'

export async function criarDealParaLead(
  supabase: SupabaseClient,
  params: {
    organization_id: string
    lead_id: string
    lead_nome: string | null
    lead_telefone: string | null
    responsavel_id: string | null
    origem: string
    autor_id: string
  }
): Promise<string | null> {
  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('id')
    .eq('organization_id', params.organization_id)
    .eq('padrao', true)
    .eq('ativo', true)
    .single()

  if (!pipeline) return null

  const { data: primeiraEtapa } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('pipeline_id', pipeline.id)
    .eq('oculto', false)
    .is('tipo_especial', null)
    .order('ordem', { ascending: true })
    .limit(1)
    .single()

  if (!primeiraEtapa) return null

  const titulo = params.lead_nome || params.lead_telefone || 'Novo Lead'

  const { data: deal, error } = await supabase
    .from('deals')
    .insert({
      organization_id: params.organization_id,
      titulo,
      pipeline_id: pipeline.id,
      estagio_id: primeiraEtapa.id,
      lead_id: params.lead_id,
      responsavel_id: params.responsavel_id,
      origem_lead: params.origem,
    })
    .select('id')
    .single()

  if (error) {
    // 23505 = unique violation (deal já existe para este lead)
    if (error.code === '23505') return null
    console.error('[criarDealParaLead] Erro:', error.message)
    return null
  }

  await supabase.from('deal_stage_logs').insert({
    organization_id: params.organization_id,
    deal_id: deal.id,
    usuario_id: params.autor_id,
    estagio_anterior_id: null,
    estagio_novo_id: primeiraEtapa.id,
  })

  await supabase.from('activities').insert({
    organization_id: params.organization_id,
    autor_id: params.autor_id,
    tipo: 'deal_criado',
    descricao: `Card "${titulo}" criado automaticamente no pipeline.`,
    deal_id: deal.id,
    lead_id: params.lead_id,
  })

  return deal.id
}
