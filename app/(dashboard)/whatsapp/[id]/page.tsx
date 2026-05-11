import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ThreadMensagens } from '@/components/whatsapp/thread-mensagens'
import { FormEnvioMensagem } from '@/components/whatsapp/form-envio-mensagem'
import { ModalExportarConversaButton } from '@/components/whatsapp/modal-exportar-conversa-button'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
      id, telefone_externo,
      lead:leads!lead_id(id, nome),
      instancia:whatsapp_instances!whatsapp_instance_id(nome, status_conexao)
    `)
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!conversa) notFound()

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

  const lead = (Array.isArray(conversa.lead) ? conversa.lead[0] : conversa.lead) as { id: string; nome: string | null } | null
  const instancia = (Array.isArray(conversa.instancia) ? conversa.instancia[0] : conversa.instancia) as { nome: string; status_conexao: string } | null
  const titulo = lead?.nome ?? conversa.telefone_externo as string

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
        <Link href="/whatsapp">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700 font-semibold text-sm">
          {titulo.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{titulo}</p>
          <p className="text-xs text-slate-400">
            {conversa.telefone_externo as string}
            {instancia && ` · ${instancia.nome}`}
            {instancia?.status_conexao !== 'conectado' && ' · ⚠ Desconectado'}
          </p>
        </div>
        <div className="ml-auto">
          <ModalExportarConversaButton
            conversaId={id}
            telefone={conversa.telefone_externo as string}
            nomeContato={titulo}
            mensagens={mensagens}
            organizationId={perfil.organization_id}
            perfilId={perfil.id}
            perfilNome={perfil.nome as string}
            leadId={lead?.id ?? null}
          />
        </div>
      </div>

      {/* Thread */}
      <ThreadMensagens mensagensIniciais={mensagens} conversaId={id} />

      {/* Envio */}
      <FormEnvioMensagem conversaId={id} />
    </div>
  )
}
