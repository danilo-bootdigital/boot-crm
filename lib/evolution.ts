function getConfig() {
  const url = process.env.EVOLUTION_API_URL
  const key = process.env.EVOLUTION_API_KEY
  if (!url) throw new Error('EVOLUTION_API_URL não configurada')
  if (!key) throw new Error('EVOLUTION_API_KEY não configurada')
  return { baseUrl: url.replace(/\/$/, ''), apiKey: key }
}

function apiHeaders() {
  const { apiKey } = getConfig()
  return { 'Content-Type': 'application/json', apikey: apiKey }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { baseUrl } = getConfig()
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...apiHeaders(), ...options?.headers },
    signal: options?.signal ?? AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 400 && text.includes('"exists":false')) {
      throw new Error('Este número não possui WhatsApp.')
    }
    throw new Error(`Evolution API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export type EstadoConexao = 'open' | 'connecting' | 'close'

export async function criarInstancia(instanceName: string, webhookUrl: string): Promise<void> {
  await apiFetch('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: webhookUrl,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'MESSAGES_UPDATE'],
      },
    }),
  })
}

export async function obterQRCode(instanceName: string): Promise<string | null | 'not_found'> {
  try {
    const data = await apiFetch<{ base64?: string }>(
      `/instance/connect/${instanceName}`
    )
    return data.base64 ?? null
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('404') && msg.includes('does not exist')) {
      return 'not_found'
    }
    console.error('[evolution] obterQRCode:', err)
    return null
  }
}

export async function obterEstadoConexao(instanceName: string): Promise<EstadoConexao> {
  try {
    const data = await apiFetch<{ instance?: { state?: string } }>(
      `/instance/connectionState/${instanceName}`
    )
    return (data.instance?.state as EstadoConexao) ?? 'close'
  } catch (err) {
    console.error('[evolution] obterEstadoConexao:', err)
    return 'close'
  }
}

export async function deletarInstancia(instanceName: string): Promise<void> {
  await apiFetch(`/instance/delete/${instanceName}`, { method: 'DELETE' })
}

export async function enviarTexto(
  instanceName: string,
  numero: string,
  texto: string
): Promise<string> {
  const data = await apiFetch<{ key?: { id?: string } }>(
    `/message/sendText/${instanceName}`,
    { method: 'POST', body: JSON.stringify({ number: numero, text: texto }) }
  )
  const id = data.key?.id
  if (!id) throw new Error('Evolution API não retornou key.id para a mensagem enviada')
  return id
}

export async function enviarImagem(
  instanceName: string,
  numero: string,
  mediaBase64: string,
  mimeType: string,
  caption?: string
): Promise<string> {
  const data = await apiFetch<{ key?: { id?: string } }>(
    `/message/sendMedia/${instanceName}`,
    {
      method: 'POST',
      body: JSON.stringify({
        number: numero,
        mediatype: 'image',
        media: mediaBase64,
        mimetype: mimeType,
        caption: caption || '',
      }),
    }
  )
  const id = data.key?.id
  if (!id) throw new Error('Evolution API não retornou key.id para imagem enviada')
  return id
}

export async function enviarAudio(
  instanceName: string,
  numero: string,
  mediaBase64: string,
  mimeType: string
): Promise<string> {
  const data = await apiFetch<{ key?: { id?: string } }>(
    `/message/sendWhatsAppAudio/${instanceName}`,
    {
      method: 'POST',
      body: JSON.stringify({
        number: numero,
        audio: mediaBase64,
        mimetype: mimeType,
      }),
    }
  )
  const id = data.key?.id
  if (!id) throw new Error('Evolution API não retornou key.id para áudio enviado')
  return id
}

export async function enviarDocumento(
  instanceName: string,
  numero: string,
  mediaBase64: string,
  mimeType: string,
  fileName: string
): Promise<string> {
  const data = await apiFetch<{ key?: { id?: string } }>(
    `/message/sendMedia/${instanceName}`,
    {
      method: 'POST',
      body: JSON.stringify({
        number: numero,
        mediatype: 'document',
        media: mediaBase64,
        mimetype: mimeType,
        fileName,
      }),
    }
  )
  const id = data.key?.id
  if (!id) throw new Error('Evolution API não retornou key.id para documento enviado')
  return id
}

export async function baixarMidia(
  instanceName: string,
  messageData: Record<string, unknown>
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const data = await apiFetch<{ base64?: string; mimetype?: string; mediaType?: string }>(
      `/chat/getBase64FromMediaMessage/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({ message: messageData }),
      }
    )
    if (!data.base64) return null
    return { base64: data.base64, mimeType: data.mimetype || 'application/octet-stream' }
  } catch (err) {
    console.error('[evolution] baixarMidia:', err)
    return null
  }
}
