import { createClient } from '@/lib/supabase/server'
import { TabelaLeads } from '@/components/leads/tabela-leads'
import { ModalNovoLead } from '@/components/leads/modal-novo-lead'
import type { Lead, Profile } from '@/types/database'

type SearchParams = Promise<{
  busca?: string
  status?: string
  origem?: string
  responsavel?: string
}>

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const params = await searchParams

  let query = supabase
    .from('leads')
    .select('*, responsavel:profiles!responsavel_id(id, nome)')
    .order('criado_em', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  if (params.origem) query = query.eq('origem', params.origem)
  if (params.responsavel) query = query.eq('responsavel_id', params.responsavel)
  if (params.busca) {
    query = query.or(
      `nome.ilike.%${params.busca}%,telefone.ilike.%${params.busca}%,email.ilike.%${params.busca}%`
    )
  }

  const { data: leads } = await query as { data: (Lead & { responsavel: Pick<Profile, 'id' | 'nome'> | null })[] | null }

  const { data: responsaveis } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome') as { data: Pick<Profile, 'id' | 'nome'>[] | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gerencie os leads e acompanhe o progresso de cada um.
          </p>
        </div>
        <ModalNovoLead responsaveis={responsaveis ?? []} />
      </div>

      <TabelaLeads leads={leads ?? []} responsaveis={responsaveis ?? []} />
    </div>
  )
}
