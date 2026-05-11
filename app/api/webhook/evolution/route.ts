import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distribuirLead } from '@/lib/distribuicao'

function normalizarTelefone(jid: string): string {
  return jid.replace(/@.*$/, '').replace(/:\d+$/, '')
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET
  if (!webhookSecret || secret !== webhookSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { event, instance: instanceName, data } = body as {
    event: string
    instance: string
    data: Record<string, unknown>
  }

  const supabase = createAdminClient()

  const { data: instancia } = await supabase
    .from('whatsapp_instances')
    .select('id, organization_id, vendedor_id')
    .eq('evolution_instance_name', instanceName)
    .single()

  if (!instancia) return NextResponse.json({ ok: true })

  // ── connection.update ──────────────────────────────────────────
  if (event === 'connection.update') {
    const state = (data?.state as string) ?? 'close'
    const statusMap: Record<string, string> = {
      open: 'conectado',
      connecting: 'aguardando_qr',
      close: 'desconectado',
    }
    await supabase
      .from('whatsapp_instances')
      .update({ status_conexao: statusMap[state] ?? 'desconectado', atualizado_em: new Date().toISOString() })
      .eq('id', instancia.id)
      .eq('organization_id', instancia.organization_id)
    return NextResponse.json({ ok: true })
  }

  // ── messages.upsert ───────────────────────────────────────────
  if (event === 'messages.upsert') {
    const key = (data?.key ?? {}) as Record<string, unknown>
    const remoteJid = (key.remoteJid as string) ?? ''
    const fromMe = (key.fromMe as boolean) ?? false
    const messageIdExterno = (key.id as string) ?? ''
    const pushName = (data?.pushName as string) ?? ''
    const messageTimestamp = (data?.messageTimestamp as number) ?? Math.floor(Date.now() / 1000)
    const messageType = (data?.messageType as string) ?? 'conversation'
    const message = (data?.message ?? {}) as Record<string, unknown>
    const conteudo =
      (message?.conversation as string) ??
      ((message?.extendedTextMessage as Record<string, unknown>)?.text as string) ??
      null

    // Ignorar grupos
    if (remoteJid.endsWith('@g.us')) return NextResponse.json({ ok: true })

    const telefone = normalizarTelefone(remoteJid)
    const enviadoEm = new Date(messageTimestamp * 1000).toISOString()

    // Checar deduplicação
    if (messageIdExterno) {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('message_id_externo', messageIdExterno)
        .eq('organization_id', instancia.organization_id)
      if ((count ?? 0) > 0) return NextResponse.json({ ok: true })
    }

    // Buscar ou criar conversa
    let { data: conversa } = await supabase
      .from('conversations')
      .select('id, lead_id')
      .eq('whatsapp_instance_id', instancia.id)
      .eq('telefone_externo', telefone)
      .single()

    let leadId: string | null = (conversa?.lead_id as string) ?? null

    if (!conversa) {
      // Checar se lead já existe com este telefone
      const { data: leadExistente } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', instancia.organization_id)
        .eq('telefone', telefone)
        .limit(1)
        .single()

      leadId = (leadExistente?.id as string) ?? null

      if (!leadId && !fromMe) {
        // Criar novo lead
        const { data: novoLead } = await supabase
          .from('leads')
          .insert({
            organization_id: instancia.organization_id,
            nome: pushName || null,
            telefone,
            origem: 'whatsapp',
            status: 'novo',
            whatsapp_instance_id: instancia.id,
          })
          .select('id')
          .single()
        leadId = (novoLead?.id as string) ?? null

        if (leadId) {
          // Buscar admin da org para autorId
          const { data: adminPerfil } = await supabase
            .from('profiles')
            .select('id')
            .eq('organization_id', instancia.organization_id)
            .eq('cargo', 'admin')
            .eq('ativo', true)
            .limit(1)
            .single()

          if (adminPerfil) {
            await supabase.from('activities').insert({
              organization_id: instancia.organization_id,
              tipo: 'lead_criado',
              descricao: `Lead criado via WhatsApp: ${telefone}${pushName ? ` (${pushName})` : ''}.`,
              lead_id: leadId,
              autor_id: adminPerfil.id,
            })
            await distribuirLead(supabase, leadId, instancia.organization_id, adminPerfil.id)
          }
        }
      }

      // Criar conversa
      const { data: novaConversa } = await supabase
        .from('conversations')
        .insert({
          organization_id: instancia.organization_id,
          whatsapp_instance_id: instancia.id,
          lead_id: leadId,
          telefone_externo: telefone,
          ultima_mensagem_em: enviadoEm,
        })
        .select('id, lead_id')
        .single()
      conversa = novaConversa
    } else {
      await supabase
        .from('conversations')
        .update({ ultima_mensagem_em: enviadoEm, atualizado_em: new Date().toISOString() })
        .eq('id', conversa.id)
    }

    if (!conversa) return NextResponse.json({ ok: true })

    const tipoMidiaMap: Record<string, string> = {
      conversation: 'texto',
      extendedTextMessage: 'texto',
      imageMessage: 'imagem',
      audioMessage: 'audio',
      documentMessage: 'documento',
      stickerMessage: 'sticker',
      locationMessage: 'localizacao',
    }

    const { error: errMsg } = await supabase.from('messages').insert({
      organization_id: instancia.organization_id,
      conversation_id: conversa.id,
      message_id_externo: messageIdExterno || null,
      direcao: fromMe ? 'enviada' : 'recebida',
      tipo_midia: tipoMidiaMap[messageType] ?? 'texto',
      conteudo,
      telefone_remetente: fromMe ? null : telefone,
      telefone_destinatario: fromMe ? telefone : null,
      responsavel_id: instancia.vendedor_id ?? null,
      status: fromMe ? 'enviada' : 'entregue',
      enviado_em: enviadoEm,
    })
    if (errMsg) console.error('[webhook] Falha ao inserir mensagem:', errMsg.message)
  }

  return NextResponse.json({ ok: true })
}
