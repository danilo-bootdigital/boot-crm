import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ListaConversas } from '@/components/whatsapp/lista-conversas'
import { ModalNovaConversa } from '@/components/whatsapp/modal-nova-conversa'

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

  // Buscar conversas com status e responsável
  let query = supabase
    .from('conversations')
    .select(`
      id,
      telefone_externo,
      ultima_mensagem_em,
      status,
      responsavel_id,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(id, nome),
      instancia:whatsapp_instances!whatsapp_instance_id(nome)
    `)
    .eq('organization_id', perfil.organization_id)
    .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
    .limit(100)

  // Vendedor só vê conversas das instâncias atribuídas a ele ou onde é responsável
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

  // Buscar tags de todas as conversas
  const tagsMap: Record<string, { id: string; nome: string; cor: string }[]> = {}
  if (conversaIds.length > 0) {
    const { data: tagLinks } = await supabase
      .from('conversation_tag_links')
      .select('conversation_id, tag:conversation_tags!tag_id(id, nome, cor)')
      .in('conversation_id', conversaIds)

    ;(tagLinks ?? []).forEach((link) => {
      const cid = link.conversation_id as string
      const tag = (Array.isArray(link.tag) ? link.tag[0] : link.tag) as { id: string; nome: string; cor: string } | null
      if (tag) {
        if (!tagsMap[cid]) tagsMap[cid] = []
        tagsMap[cid].push(tag)
      }
    })
  }

  // Todas as tags da org (para filtros)
  const { data: todasTagsRaw } = await supabase
    .from('conversation_tags')
    .select('id, nome, cor')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const todasTags = (todasTagsRaw ?? []) as { id: string; nome: string; cor: string }[]

  // Usuários da org (para filtros)
  const { data: usuariosRaw } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('ativo', true)
    .order('nome')

  const usuarios = (usuariosRaw ?? []) as { id: string; nome: string }[]

  // Buscar instâncias autorizadas para o botão Nova Conversa
  let instQuery = supabase
    .from('whatsapp_instances')
    .select('id, nome, numero, status_conexao')
    .eq('organization_id', perfil.organization_id)
    .eq('status_conexao', 'conectado')

  if (perfil.cargo === 'vendedor' || perfil.cargo === 'atendimento') {
    instQuery = instQuery.or(`vendedor_id.eq.${perfil.id},compartilhado.eq.true`)
  }

  const { data: instanciasRaw } = await instQuery
  const instancias = (instanciasRaw ?? []) as { id: string; nome: string; numero: string | null; status_conexao: string }[]

  const conversas = (conversasRaw ?? []).map((c) => {
    const resp = (Array.isArray(c.responsavel) ? c.responsavel[0] : c.responsavel) as { nome: string } | null
    const cid = c.id as string
    return {
      id: cid,
      telefone_externo: c.telefone_externo as string,
      ultima_mensagem_em: c.ultima_mensagem_em as string | null,
      status: (c.status as 'nao_atendida' | 'em_atendimento' | 'aguardando_cliente' | 'finalizada') ?? 'nao_atendida',
      responsavel_id: (c.responsavel_id as string) ?? null,
      responsavel_nome: resp?.nome ?? null,
      lead: (Array.isArray(c.lead) ? c.lead[0] : c.lead) as { id: string; nome: string | null } | null,
      instancia: (Array.isArray(c.instancia) ? c.instancia[0] : c.instancia) as { nome: string } | null,
      ultima_mensagem: ultimasMensagens[cid] ?? null,
      tags: tagsMap[cid] ?? [],
    }
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">WhatsApp</h1>
          <p className="text-xs text-slate-500">{conversas.length} conversa{conversas.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <ModalNovaConversa instancias={instancias} />
          {['admin', 'gestor'].includes(perfil.cargo) && (
            <Link href="/whatsapp/relatorios" className="rounded-md border px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Relatórios
            </Link>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ListaConversas
          conversasIniciais={conversas}
          organizationId={perfil.organization_id}
          usuarios={usuarios}
          todasTags={todasTags}
        />
      </div>
    </div>
  )
}
