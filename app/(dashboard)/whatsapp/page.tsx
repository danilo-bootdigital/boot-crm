import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ListaConversas } from '@/components/whatsapp/lista-conversas'

export default async function WhatsappPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  // Buscar conversas com última mensagem
  let query = supabase
    .from('conversations')
    .select(`
      id,
      telefone_externo,
      ultima_mensagem_em,
      lead:leads!lead_id(id, nome),
      instancia:whatsapp_instances!whatsapp_instance_id(nome)
    `)
    .eq('organization_id', perfil.organization_id)
    .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
    .limit(100)

  // Vendedor só vê conversas das instâncias atribuídas a ele
  if (perfil.cargo === 'vendedor' || perfil.cargo === 'atendimento') {
    const { data: instancias } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('organization_id', perfil.organization_id)
      .or(`vendedor_id.eq.${perfil.id},compartilhado.eq.true`)
    const ids = (instancias ?? []).map((i) => i.id as string)
    if (ids.length === 0) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-slate-400">Nenhuma instância atribuída.</p>
        </div>
      )
    }
    query = query.in('whatsapp_instance_id', ids)
  }

  const { data: conversasRaw } = await query

  // Buscar última mensagem por conversa via RPC
  const conversaIds = (conversasRaw ?? []).map((c) => c.id as string)
  const ultimasMensagens: Record<string, string> = {}
  if (conversaIds.length > 0) {
    const { data: msgs } = await supabase.rpc('ultimas_mensagens_por_conversa', {
      p_conversation_ids: conversaIds,
      p_org_id: perfil.organization_id,
    })
    ;(msgs ?? []).forEach((m: { conversation_id: string; conteudo: string | null }) => {
      if (m.conteudo) ultimasMensagens[m.conversation_id] = m.conteudo
    })
  }

  const conversas = (conversasRaw ?? []).map((c) => ({
    id: c.id as string,
    telefone_externo: c.telefone_externo as string,
    ultima_mensagem_em: c.ultima_mensagem_em as string | null,
    lead: (Array.isArray(c.lead) ? c.lead[0] : c.lead) as { id: string; nome: string | null } | null,
    instancia: (Array.isArray(c.instancia) ? c.instancia[0] : c.instancia) as { nome: string } | null,
    ultima_mensagem: ultimasMensagens[c.id as string] ?? null,
  }))

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold text-slate-900">WhatsApp</h1>
        <p className="text-xs text-slate-500">{conversas.length} conversa{conversas.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ListaConversas conversasIniciais={conversas} organizationId={perfil.organization_id} />
      </div>
    </div>
  )
}
