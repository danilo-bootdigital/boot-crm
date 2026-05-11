const BASE_URL = process.env.EVOLUTION_API_URL!
const API_KEY = process.env.EVOLUTION_API_KEY!

function apiHeaders() {
  return { 'Content-Type': 'application/json', apikey: API_KEY }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...apiHeaders(), ...options?.headers },
  })
  if (!res.ok) {
    const text = await res.text()
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

export async function obterQRCode(instanceName: string): Promise<string | null> {
  try {
    const data = await apiFetch<{ base64?: string }>(
      `/instance/connect/${instanceName}`
    )
    return data.base64 ?? null
  } catch {
    return null
  }
}

export async function obterEstadoConexao(instanceName: string): Promise<EstadoConexao> {
  try {
    const data = await apiFetch<{ instance?: { state?: string } }>(
      `/instance/connectionState/${instanceName}`
    )
    return (data.instance?.state as EstadoConexao) ?? 'close'
  } catch {
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
  return data.key?.id ?? crypto.randomUUID()
}
