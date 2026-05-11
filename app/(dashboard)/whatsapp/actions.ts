'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { enviarTexto } from '@/lib/evolution'

export async function enviarMensagem(conversaId: string, texto: string) {
  if (!texto.trim()) throw new Error('Mensagem não pode estar vazia.')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: conversa } = await supabase
    .from('conversations')
    .select('id, telefone_externo, whatsapp_instance_id')
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!conversa) throw new Error('Conversa não encontrada.')

  const { data: instancia } = await supabase
    .from('whatsapp_instances')
    .select('evolution_instance_name, status_conexao')
    .eq('id', conversa.whatsapp_instance_id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!instancia?.evolution_instance_name) throw new Error('Instância não configurada.')
  if (instancia.status_conexao !== 'conectado') throw new Error('WhatsApp desconectado. Reconecte a instância.')

  const messageIdExterno = await enviarTexto(
    instancia.evolution_instance_name,
    conversa.telefone_externo,
    texto.trim()
  )

  const agora = new Date().toISOString()

  await supabase.from('messages').insert({
    organization_id: perfil.organization_id,
    conversation_id: conversaId,
    message_id_externo: messageIdExterno,
    direcao: 'enviada',
    tipo_midia: 'texto',
    conteudo: texto.trim(),
    responsavel_id: perfil.id,
    status: 'enviada',
    enviado_em: agora,
  })

  await supabase
    .from('conversations')
    .update({ ultima_mensagem_em: agora, atualizado_em: agora })
    .eq('id', conversaId)
    .eq('organization_id', perfil.organization_id)

  revalidatePath('/whatsapp')
}
