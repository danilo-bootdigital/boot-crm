import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distribuirLead } from '@/lib/distribuicao'
import { criarDealParaLead } from '@/lib/pipeline-lead'
import { baixarMidia } from '@/lib/evolution'

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
      (messageType === 'imageMessage' ? '[Imagem]' : null) ??
      (messageType === 'audioMessage' ? '[Áudio]' : null) ??
      (messageType === 'videoMessage' ? '[Vídeo]' : null) ??
      (messageType === 'documentMessage' ? '[Documento]' : null) ??
      (messageType === 'stickerMessage' ? '[Sticker]' : null) ??
      (messageType === 'locationMessage' ? '[Localização]' : null) ??
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
    const { data: conversa, error: errConversa } = await supabase
      .from('conversations')
      .select('id, lead_id, status')
      .eq('whatsapp_instance_id', instancia.id)
      .eq('telefone_externo', telefone)
      .single()

    if (errConversa && errConversa.code !== 'PGRST116') {
      console.error('[webhook] Erro ao buscar conversa:', errConversa.message)
      return NextResponse.json({ error: 'Internal' }, { status: 500 })
    }

    let conversaAtual = conversa

    let leadId: string | null = (conversaAtual?.lead_id as string) ?? null

    if (!conversaAtual) {
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
        // Criar novo lead apenas para mensagens recebidas
        const nomeLead = pushName?.trim() || 'Contato WhatsApp'
        const { data: novoLead } = await supabase
          .from('leads')
          .insert({
            organization_id: instancia.organization_id,
            nome: nomeLead,
            telefone,
            origem: 'whatsapp',
            status: 'novo',
            whatsapp_instance_id: instancia.id,
          })
          .select('id')
          .single()
        leadId = (novoLead?.id as string) ?? null

        if (leadId) {
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

            // Buscar responsável atualizado após distribuição
            const { data: leadAtualizado } = await supabase
              .from('leads')
              .select('responsavel_id')
              .eq('id', leadId)
              .single()

            await criarDealParaLead(supabase, {
              organization_id: instancia.organization_id,
              lead_id: leadId,
              lead_nome: pushName || null,
              lead_telefone: telefone,
              responsavel_id: leadAtualizado?.responsavel_id ?? instancia.vendedor_id ?? null,
              origem: 'whatsapp',
              autor_id: adminPerfil.id,
            })
          }
        }
      }

      // Criar conversa — mensagem recebida inicia como nao_atendida, enviada como em_atendimento
      const { data: novaConversa } = await supabase
        .from('conversations')
        .insert({
          organization_id: instancia.organization_id,
          whatsapp_instance_id: instancia.id,
          lead_id: leadId,
          telefone_externo: telefone,
          ultima_mensagem_em: enviadoEm,
          status: fromMe ? 'em_atendimento' : 'nao_atendida',
          responsavel_id: fromMe ? instancia.vendedor_id : null,
        })
        .select('id, lead_id, status')
        .single()
      conversaAtual = novaConversa
    } else {
      // Atualizar conversa existente
      const updateData: Record<string, unknown> = {
        ultima_mensagem_em: enviadoEm,
        atualizado_em: new Date().toISOString(),
      }

      // Atualizar nome do lead se pushName disponível e lead tem nome genérico
      if (!fromMe && pushName?.trim() && leadId) {
        const { data: leadAtual } = await supabase
          .from('leads')
          .select('nome')
          .eq('id', leadId)
          .single()

        if (leadAtual) {
          const nomeAtual = leadAtual.nome?.trim() ?? ''
          const ehGenerico = !nomeAtual
            || nomeAtual === 'Contato WhatsApp'
            || /^\d{8,15}$/.test(nomeAtual.replace(/\D/g, ''))
          if (ehGenerico) {
            await supabase
              .from('leads')
              .update({ nome: pushName.trim(), atualizado_em: new Date().toISOString() })
              .eq('id', leadId)
          }
        }
      }

      if (!fromMe) {
        // Mensagem recebida: se estava finalizada, reabrir como nao_atendida
        if (conversaAtual.status === 'finalizada') {
          updateData.status = 'nao_atendida'
        }

        // Sincronizar deal: atualizar timestamp para subir no topo do pipeline
        if (leadId) {
          const { data: dealAtivo } = await supabase
            .from('deals')
            .select('id, ganho, estagio_id')
            .eq('lead_id', leadId)
            .is('ganho', null)
            .single()

          if (dealAtivo) {
            await supabase
              .from('deals')
              .update({ atualizado_em: new Date().toISOString() })
              .eq('id', dealAtivo.id)
          } else if (conversaAtual.status === 'finalizada') {
            // Lead finalizado recebeu nova mensagem — reabrir deal
            const { data: adminPerfil } = await supabase
              .from('profiles')
              .select('id')
              .eq('organization_id', instancia.organization_id)
              .eq('cargo', 'admin')
              .eq('ativo', true)
              .limit(1)
              .single()

            if (adminPerfil) {
              await criarDealParaLead(supabase, {
                organization_id: instancia.organization_id,
                lead_id: leadId,
                lead_nome: pushName || null,
                lead_telefone: telefone,
                responsavel_id: instancia.vendedor_id ?? null,
                origem: 'whatsapp',
                autor_id: adminPerfil.id,
              })
            }
          }
        }
      } else {
        // Mensagem enviada pelo vendedor: marcar como em_atendimento se estava nao_atendida
        if (conversaAtual.status === 'nao_atendida') {
          updateData.status = 'em_atendimento'
        }
      }

      await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversaAtual.id)
    }

    if (!conversaAtual) return NextResponse.json({ ok: true })

    const tipoMidiaMap: Record<string, string> = {
      conversation: 'texto',
      extendedTextMessage: 'texto',
      imageMessage: 'imagem',
      audioMessage: 'audio',
      documentMessage: 'documento',
      videoMessage: 'video',
      stickerMessage: 'sticker',
      locationMessage: 'localizacao',
    }

    const tipoMidia = tipoMidiaMap[messageType] ?? 'texto'
    let urlMidia: string | null = null

    if (['imagem', 'audio', 'documento', 'video'].includes(tipoMidia)) {
      try {
        const mediaPayload = {
          key: {
            id: messageIdExterno,
            remoteJid,
            fromMe,
          },
          message,
        }
        const resultado = await baixarMidia(instanceName, mediaPayload)
        if (resultado) {
          const ext = tipoMidia === 'imagem' ? 'jpg' : tipoMidia === 'audio' ? 'ogg' : tipoMidia === 'video' ? 'mp4' : 'pdf'
          const path = `${instancia.organization_id}/${conversaAtual.id}/${messageIdExterno || Date.now()}.${ext}`
          const buffer = Buffer.from(resultado.base64, 'base64')

          const { error: uploadErr } = await supabase.storage
            .from('whatsapp-media')
            .upload(path, buffer, { contentType: resultado.mimeType, upsert: false })

          if (!uploadErr) {
            const { data: urlData } = supabase.storage
              .from('whatsapp-media')
              .getPublicUrl(path)
            urlMidia = urlData.publicUrl
          } else {
            console.error('[webhook] Upload mídia falhou:', uploadErr.message)
          }
        }
      } catch (err) {
        console.error('[webhook] Erro ao processar mídia:', err)
      }
    }

    const { error: errMsg } = await supabase.from('messages').insert({
      organization_id: instancia.organization_id,
      conversation_id: conversaAtual.id,
      message_id_externo: messageIdExterno || null,
      direcao: fromMe ? 'enviada' : 'recebida',
      tipo_midia: tipoMidia,
      conteudo,
      url_midia: urlMidia,
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
