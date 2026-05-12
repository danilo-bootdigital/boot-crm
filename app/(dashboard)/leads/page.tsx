import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  let query = supabase
    .from('leads')
    .select('*, responsavel:profiles!responsavel_id(id, nome)')
    .eq('organization_id', perfil.organization_id)
    .order('criado_em', { ascending: false })

  if (perfil.cargo === 'vendedor') query = query.eq('responsavel_id', perfil.id)
  if (params.status) query = query.eq('status', params.status)
  if (params.origem) query = query.eq('origem', params.origem)
  if (params.responsavel) query = query.eq('responsavel_id', params.responsavel)
  if (params.busca) {
    const termo = params.busca.replace(/[%_\\]/g, '\\$&')
    query = query.or(
      `nome.ilike.%${termo}%,telefone.ilike.%${termo}%,email.ilike.%${termo}%`
    )
  }

  const { data: leads } = await query as { data: (Lead & { responsavel: Pick<Profile, 'id' | 'nome'> | null })[] | null }

  const { data: responsaveis } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
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
