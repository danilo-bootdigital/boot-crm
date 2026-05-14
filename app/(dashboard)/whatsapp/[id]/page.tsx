import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ConversaLayout } from '@/components/whatsapp/conversa-layout'

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, nome')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: conversa } = await supabase
    .from('conversations')
    .select(`
      id, telefone_externo, status, responsavel_id, deal_id,
      lead:leads!lead_id(id, nome),
      instancia:whatsapp_instances!whatsapp_instance_id(nome, status_conexao)
    `)
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!conversa) notFound()

  // Mensagens
  const { data: mensagensRaw } = await supabase
    .from('messages')
    .select('id, direcao, conteudo, enviado_em, responsavel:profiles!responsavel_id(nome)')
    .eq('conversation_id', id)
    .eq('organization_id', perfil.organization_id)
    .order('enviado_em', { ascending: true })
    .limit(200)

  const mensagens = (mensagensRaw ?? []).map((m) => ({
    id: m.id as string,
    direcao: m.direcao as 'enviada' | 'recebida',
    conteudo: m.conteudo as string | null,
    enviado_em: m.enviado_em as string,
    responsavel: (Array.isArray(m.responsavel) ? m.responsavel[0] : m.responsavel) as { nome: string } | null,
  }))

  // Tags da conversa
  const { data: tagLinksRaw } = await supabase
    .from('conversation_tag_links')
    .select('tag:conversation_tags!tag_id(id, nome, cor)')
    .eq('conversation_id', id)

  const tags = (tagLinksRaw ?? []).map((l) => {
    const t = (Array.isArray(l.tag) ? l.tag[0] : l.tag) as { id: string; nome: string; cor: string }
    return t
  }).filter(Boolean)

  // Todas as tags da org
  const { data: todasTagsRaw } = await supabase
    .from('conversation_tags')
    .select('id, nome, cor')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const todasTags = (todasTagsRaw ?? []) as { id: string; nome: string; cor: string }[]

  // Anotações
  const { data: notasRaw } = await supabase
    .from('conversation_notes')
    .select('id, conteudo, criado_em, autor:profiles!autor_id(nome)')
    .eq('conversation_id', id)
    .eq('organization_id', perfil.organization_id)
    .order('criado_em', { ascending: false })
    .limit(50)

  const notas = (notasRaw ?? []).map((n) => ({
    id: n.id as string,
    conteudo: n.conteudo as string,
    criado_em: n.criado_em as string,
    autor_nome: ((Array.isArray(n.autor) ? n.autor[0] : n.autor) as { nome: string } | null)?.nome ?? 'Desconhecido',
  }))

  // Usuários da org (para transferência)
  const { data: usuariosRaw } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('ativo', true)
    .order('nome')

  const usuarios = (usuariosRaw ?? []) as { id: string; nome: string }[]

  // Deal vinculado
  let dealVinculado: { id: string; titulo: string; valor_estimado: number | null; estagio_nome: string } | null = null
  if (conversa.deal_id) {
    const { data: dealRaw } = await supabase
      .from('deals')
      .select('id, titulo, valor_estimado, estagio:pipeline_stages!estagio_id(nome)')
      .eq('id', conversa.deal_id as string)
      .eq('organization_id', perfil.organization_id)
      .single()
    if (dealRaw) {
      const estagio = (Array.isArray(dealRaw.estagio) ? dealRaw.estagio[0] : dealRaw.estagio) as { nome: string } | null
      dealVinculado = {
        id: dealRaw.id as string,
        titulo: dealRaw.titulo as string,
        valor_estimado: dealRaw.valor_estimado as number | null,
        estagio_nome: estagio?.nome ?? '',
      }
    }
  }

  // Responsável
  let responsavel: { id: string; nome: string } | null = null
  if (conversa.responsavel_id) {
    responsavel = usuarios.find((u) => u.id === (conversa.responsavel_id as string)) ?? null
  }

  const lead = (Array.isArray(conversa.lead) ? conversa.lead[0] : conversa.lead) as { id: string; nome: string | null } | null
  const instancia = (Array.isArray(conversa.instancia) ? conversa.instancia[0] : conversa.instancia) as { nome: string; status_conexao: string } | null
  const titulo = lead?.nome ?? conversa.telefone_externo as string

  return (
    <ConversaLayout
      conversaId={id}
      titulo={titulo}
      telefone={conversa.telefone_externo as string}
      instanciaNome={instancia?.nome ?? null}
      instanciaConectada={instancia?.status_conexao === 'conectado'}
      leadId={lead?.id ?? null}
      status={(conversa.status as 'nao_atendida' | 'em_atendimento' | 'aguardando_cliente' | 'finalizada') ?? 'nao_atendida'}
      responsavel={responsavel}
      tags={tags}
      todasTags={todasTags}
      notas={notas}
      usuarios={usuarios}
      dealVinculado={dealVinculado}
      mensagens={mensagens}
      organizationId={perfil.organization_id}
      perfilId={perfil.id}
      perfilNome={perfil.nome as string}
    />
  )
}
