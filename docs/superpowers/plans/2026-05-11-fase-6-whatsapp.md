# Fase 6 — WhatsApp (Evolution API)

> **Para agentes autônomos:** SUB-SKILL OBRIGATÓRIA: Use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar este plano tarefa a tarefa. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** Integrar WhatsApp via Evolution API — gerenciar instâncias com QR Code, receber mensagens via webhook (criando leads automaticamente), visualizar e responder conversas em tempo real, gerenciar modelos de mensagem e exportar conversas em TXT e PNG.

**Arquitetura:** A Evolution API (self-hosted) envia eventos para `POST /api/webhook/evolution` — essa rota usa `createAdminClient()` (service role, sem sessão de usuário) para criar leads, conversas e acionar `distribuirLead()`. A UI usa Supabase Realtime na tabela `messages` para atualizações ao vivo. O gerenciamento de instâncias fica em `/configuracoes/whatsapp` (admin-only), com QR Code exibido via polling de server action.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Tailwind CSS v4 · shadcn/ui · Supabase SSR + Admin Client · Evolution API REST · html2canvas (export PNG)

---

## ATENÇÕES CRÍTICAS

1. **`createAdminClient()`** — usar APENAS em `app/api/webhook/evolution/route.ts` e em server actions que chamam Evolution API. Já existe em `lib/supabase/admin.ts`. NUNCA importar em Client Components.
2. **Sem migration** — `whatsapp_instances`, `conversations`, `messages`, `message_templates`, `conversation_exports` já existem em `001_schema_completo.sql`.
3. **Variáveis de ambiente** — adicionar ao `.env.local`:
   ```
   EVOLUTION_API_URL=https://sua-evolution.exemplo.com
   EVOLUTION_API_KEY=sua-chave-api
   EVOLUTION_WEBHOOK_SECRET=string-aleatoria-segura
   NEXT_PUBLIC_APP_URL=https://seu-dominio.com
   ```
4. **Deduplicação** — checar `message_id_externo` antes de inserir mensagem.
5. **Número de telefone** — remover `@s.whatsapp.net` do `remoteJid`: `jid.replace(/@.*$/, '')`.
6. **`distribuirLead(supabase, leadId, orgId, autorId)`** já existe em `lib/distribuicao.ts`.
7. **Grupos** — ignorar mensagens cujo `remoteJid` termina em `@g.us`.
8. **Realtime** — rodar SQL no Supabase antes de Task 4:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE messages;
   ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
   ```
9. **html2canvas** — instalar em Task 7: `npm install html2canvas`.
10. **Interface 100% em português** — zero inglês para o usuário.

---

## Estrutura de Arquivos

```
lib/
  evolution.ts                                    # CRIAR: cliente REST da Evolution API

app/api/webhook/evolution/
  route.ts                                        # CRIAR: POST — recebe eventos da Evolution API

app/(dashboard)/configuracoes/whatsapp/
  page.tsx                                        # CRIAR: listar/gerenciar instâncias (admin)
  actions.ts                                      # CRIAR: criarInstancia, excluirInstancia, verificarQRCode

app/(dashboard)/configuracoes/
  page.tsx                                        # MODIFICAR: adicionar link WhatsApp

app/(dashboard)/whatsapp/
  page.tsx                                        # CRIAR: lista de conversas
  actions.ts                                      # CRIAR: enviarMensagem
  [id]/
    page.tsx                                      # CRIAR: thread de mensagens
  modelos/
    page.tsx                                      # CRIAR: listar modelos
    actions.ts                                    # CRIAR: criarModelo, editarModelo, excluirModelo

components/whatsapp/
  card-instancia.tsx                              # CRIAR: card com status e botões
  modal-nova-instancia.tsx                        # CRIAR: formulário criação de instância
  qr-code-dialog.tsx                              # CRIAR: dialog QR Code com polling
  lista-conversas.tsx                             # CRIAR: lista com Realtime
  item-conversa.tsx                               # CRIAR: item de lista com preview
  thread-mensagens.tsx                            # CRIAR: lista de mensagens com Realtime
  balao-mensagem.tsx                              # CRIAR: bolha de mensagem (enviada/recebida)
  form-envio-mensagem.tsx                         # CRIAR: input de envio com modelos
  modal-modelo.tsx                                # CRIAR: criar/editar modelo
  modal-exportar-conversa.tsx                     # CRIAR: exportar TXT ou PNG
```

---

## Tarefa 1: `lib/evolution.ts` — cliente REST da Evolution API

**Arquivos:**
- Criar: `lib/evolution.ts`

- [ ] **Passo 1: Criar `lib/evolution.ts`**

```typescript
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
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Passo 3: Commit**

```bash
git add lib/evolution.ts
git commit -m "feat: adicionar cliente REST da Evolution API"
```

---

## Tarefa 2: Webhook de recebimento de mensagens

**Arquivos:**
- Criar: `app/api/webhook/evolution/route.ts`

- [ ] **Passo 1: Criar `app/api/webhook/evolution/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { distribuirLead } from '@/lib/distribuicao'

function normalizarTelefone(jid: string): string {
  return jid.replace(/@.*$/, '').replace(/:\d+$/, '')
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.EVOLUTION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
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

    await supabase.from('messages').insert({
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
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Passo 2: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 3: Testar webhook com curl**

```bash
# Simular mensagem recebida (substitua SEU_SECRET pelo valor em .env.local)
curl -X POST "http://localhost:3000/api/webhook/evolution?secret=SEU_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "instance": "NOME_DA_INSTANCIA",
    "data": {
      "key": { "remoteJid": "5511999999999@s.whatsapp.net", "fromMe": false, "id": "TEST001" },
      "pushName": "João Teste",
      "message": { "conversation": "Olá, quero informações!" },
      "messageType": "conversation",
      "messageTimestamp": 1715436000
    }
  }'
```

Esperado: `{"ok":true}` e novo lead + conversa + mensagem no banco.

- [ ] **Passo 4: Commit**

```bash
git add "app/api/webhook/evolution/route.ts"
git commit -m "feat: adicionar webhook de recebimento de mensagens WhatsApp"
```

---

## Tarefa 3: Configurações — instâncias WhatsApp (admin)

**Arquivos:**
- Criar: `app/(dashboard)/configuracoes/whatsapp/actions.ts`
- Criar: `app/(dashboard)/configuracoes/whatsapp/page.tsx`
- Criar: `components/whatsapp/card-instancia.tsx`
- Criar: `components/whatsapp/modal-nova-instancia.tsx`
- Criar: `components/whatsapp/qr-code-dialog.tsx`
- Modificar: `app/(dashboard)/configuracoes/page.tsx`

- [ ] **Passo 1: Criar `app/(dashboard)/configuracoes/whatsapp/actions.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarInstancia, deletarInstancia, obterQRCode, obterEstadoConexao } from '@/lib/evolution'

async function getSoAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil || perfil.cargo !== 'admin') redirect('/painel')
  return { supabase, perfil }
}

export async function adicionarInstancia(formData: FormData) {
  const { supabase, perfil } = await getSoAdmin()

  const nome = (formData.get('nome') as string)?.trim()
  const compartilhado = formData.get('compartilhado') === 'true'
  const vendedor_id = (formData.get('vendedor_id') as string) || null

  if (!nome) throw new Error('Nome é obrigatório.')

  // Gerar nome único para Evolution API (sem espaços, letras e números)
  const instanceName = `org${perfil.organization_id.slice(0, 8)}-${Date.now()}`

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/evolution?secret=${process.env.EVOLUTION_WEBHOOK_SECRET}`

  await criarInstancia(instanceName, webhookUrl)

  const { error } = await supabase.from('whatsapp_instances').insert({
    organization_id: perfil.organization_id,
    nome,
    evolution_instance_name: instanceName,
    compartilhado,
    vendedor_id: compartilhado ? null : vendedor_id,
    status_conexao: 'desconectado',
  })

  if (error) throw new Error(`Erro ao salvar instância: ${error.message}`)

  revalidatePath('/configuracoes/whatsapp')
}

export async function excluirInstancia(instanceId: string) {
  const { supabase, perfil } = await getSoAdmin()

  const { data: instancia } = await supabase
    .from('whatsapp_instances')
    .select('id, evolution_instance_name')
    .eq('id', instanceId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!instancia) throw new Error('Instância não encontrada.')

  if (instancia.evolution_instance_name) {
    try { await deletarInstancia(instancia.evolution_instance_name) } catch { /* ignorar se não existir na API */ }
  }

  const { error } = await supabase
    .from('whatsapp_instances')
    .delete()
    .eq('id', instanceId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir instância: ${error.message}`)

  revalidatePath('/configuracoes/whatsapp')
}

export async function verificarQRCode(instanceId: string): Promise<
  { estado: 'conectado' } | { estado: 'qr'; base64: string } | { estado: 'aguardando' }
> {
  const { supabase, perfil } = await getSoAdmin()

  const { data: instancia } = await supabase
    .from('whatsapp_instances')
    .select('evolution_instance_name, status_conexao')
    .eq('id', instanceId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!instancia?.evolution_instance_name) return { estado: 'aguardando' }

  if (instancia.status_conexao === 'conectado') return { estado: 'conectado' }

  const base64 = await obterQRCode(instancia.evolution_instance_name)
  if (base64) return { estado: 'qr', base64 }
  return { estado: 'aguardando' }
}
```

- [ ] **Passo 2: Criar `components/whatsapp/card-instancia.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { QrCodeIcon, Trash2, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { excluirInstancia } from '@/app/(dashboard)/configuracoes/whatsapp/actions'
import { QrCodeDialog } from './qr-code-dialog'
import type { WhatsappStatus } from '@/types/database'

type Props = {
  instancia: {
    id: string
    nome: string
    numero: string | null
    status_conexao: WhatsappStatus
    compartilhado: boolean
    vendedor: { nome: string } | null
  }
}

const STATUS_CONFIG: Record<WhatsappStatus, { label: string; cor: string; icone: React.ReactNode }> = {
  conectado: { label: 'Conectado', cor: 'text-green-600 bg-green-50', icone: <Wifi className="h-3.5 w-3.5" /> },
  desconectado: { label: 'Desconectado', cor: 'text-slate-500 bg-slate-100', icone: <WifiOff className="h-3.5 w-3.5" /> },
  aguardando_qr: { label: 'Aguardando QR', cor: 'text-amber-600 bg-amber-50', icone: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
}

export function CardInstancia({ instancia }: Props) {
  const [qrAberto, setQrAberto] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const status = STATUS_CONFIG[instancia.status_conexao]

  async function handleExcluir() {
    if (!confirm(`Excluir a instância "${instancia.nome}"? Esta ação desconectará o número do sistema.`)) return
    setExcluindo(true)
    try {
      await excluirInstancia(instancia.id)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir instância.')
      setExcluindo(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border bg-white p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900">{instancia.nome}</p>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', status.cor)}>
              {status.icone}
              {status.label}
            </span>
          </div>
          {instancia.numero && <p className="text-sm text-slate-500">{instancia.numero}</p>}
          <p className="text-xs text-slate-400">
            {instancia.compartilhado ? 'Compartilhado pela equipe' : `Vendedor: ${instancia.vendedor?.nome ?? '—'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {instancia.status_conexao !== 'conectado' && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQrAberto(true)}>
              <QrCodeIcon className="h-4 w-4" />
              Conectar
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-red-500"
            onClick={handleExcluir}
            disabled={excluindo}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <QrCodeDialog
        instanceId={instancia.id}
        aberto={qrAberto}
        onConectado={() => { setQrAberto(false); window.location.reload() }}
        onFechar={() => setQrAberto(false)}
      />
    </>
  )
}
```

- [ ] **Passo 3: Criar `components/whatsapp/qr-code-dialog.tsx`**

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { verificarQRCode } from '@/app/(dashboard)/configuracoes/whatsapp/actions'

type Props = {
  instanceId: string
  aberto: boolean
  onConectado: () => void
  onFechar: () => void
}

export function QrCodeDialog({ instanceId, aberto, onConectado, onFechar }: Props) {
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [estado, setEstado] = useState<'carregando' | 'qr' | 'conectado'>('carregando')

  const poll = useCallback(async () => {
    const resultado = await verificarQRCode(instanceId)
    if (resultado.estado === 'conectado') {
      setEstado('conectado')
      onConectado()
    } else if (resultado.estado === 'qr') {
      setQrBase64(resultado.base64)
      setEstado('qr')
    }
  }, [instanceId, onConectado])

  useEffect(() => {
    if (!aberto) return
    setEstado('carregando')
    setQrBase64(null)
    poll()
    const interval = setInterval(poll, 4000)
    return () => clearInterval(interval)
  }, [aberto, poll])

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
        </DialogHeader>

        {estado === 'conectado' ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-4xl">✅</p>
            <p className="text-center text-sm font-medium text-green-700">WhatsApp conectado com sucesso!</p>
            <Button onClick={onFechar}>Fechar</Button>
          </div>
        ) : estado === 'qr' && qrBase64 ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-center text-sm text-slate-500">
              Abra o WhatsApp → toque nos três pontos → <strong>Dispositivos Conectados</strong> → <strong>Conectar Dispositivo</strong>
            </p>
            <Image src={qrBase64} alt="QR Code WhatsApp" width={240} height={240} unoptimized />
            <p className="text-xs text-slate-400">Atualizando automaticamente a cada 4 segundos...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
            <p className="text-sm text-slate-500">Gerando QR Code...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 4: Criar `components/whatsapp/modal-nova-instancia.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { adicionarInstancia } from '@/app/(dashboard)/configuracoes/whatsapp/actions'

type Vendedor = { id: string; nome: string }

type Props = {
  aberto: boolean
  onFechar: () => void
  vendedores: Vendedor[]
}

export function ModalNovaInstancia({ aberto, onFechar, vendedores }: Props) {
  const [compartilhado, setCompartilhado] = useState('true')
  const [vendedorId, setVendedorId] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    formData.set('compartilhado', compartilhado)
    if (compartilhado === 'false') formData.set('vendedor_id', vendedorId)

    setCarregando(true)
    setErro(null)
    try {
      await adicionarInstancia(formData)
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar instância.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Instância WhatsApp</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_instancia">Nome *</Label>
            <Input id="nome_instancia" name="nome" placeholder="Ex: Vendas Principal" required autoFocus />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={compartilhado} onValueChange={setCompartilhado}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Compartilhado pela equipe</SelectItem>
                <SelectItem value="false">Individual (um vendedor)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {compartilhado === 'false' && (
            <div className="space-y-2">
              <Label>Vendedor</Label>
              <Select value={vendedorId} onValueChange={(v) => setVendedorId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {erro && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Criando...' : 'Criar Instância'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 5: Criar `app/(dashboard)/configuracoes/whatsapp/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CardInstancia } from '@/components/whatsapp/card-instancia'
import { ModalNovaInstancia } from '@/components/whatsapp/modal-nova-instancia'
import { AdicionarInstanciaButton } from '@/components/whatsapp/adicionar-instancia-button'

export default async function WhatsappConfigPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.cargo !== 'admin') redirect('/painel')

  const { data: instancias } = await supabase
    .from('whatsapp_instances')
    .select(`
      id, nome, numero, status_conexao, compartilhado,
      vendedor:profiles!vendedor_id(nome)
    `)
    .eq('organization_id', perfil.organization_id)
    .order('criado_em', { ascending: true })

  const { data: vendedores } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('ativo', true)
    .in('cargo', ['vendedor', 'atendimento'])
    .order('nome')

  const instanciasFormatadas = (instancias ?? []).map((i) => ({
    id: i.id as string,
    nome: i.nome as string,
    numero: i.numero as string | null,
    status_conexao: i.status_conexao as import('@/types/database').WhatsappStatus,
    compartilhado: i.compartilhado as boolean,
    vendedor: (Array.isArray(i.vendedor) ? i.vendedor[0] : i.vendedor) as { nome: string } | null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Conexões WhatsApp</h1>
          <p className="mt-0.5 text-sm text-slate-500">Gerencie as instâncias conectadas ao sistema.</p>
        </div>
        <AdicionarInstanciaButton vendedores={vendedores ?? []} />
      </div>

      {instanciasFormatadas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-slate-400">Nenhuma instância configurada. Adicione a primeira para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {instanciasFormatadas.map((i) => (
            <CardInstancia key={i.id} instancia={i} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Passo 6: Criar `components/whatsapp/adicionar-instancia-button.tsx`** (Client Component para abrir o modal)

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ModalNovaInstancia } from './modal-nova-instancia'

type Props = { vendedores: { id: string; nome: string }[] }

export function AdicionarInstanciaButton({ vendedores }: Props) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <Button className="gap-1.5" onClick={() => setAberto(true)}>
        <Plus className="h-4 w-4" />
        Nova Instância
      </Button>
      <ModalNovaInstancia
        aberto={aberto}
        onFechar={() => { setAberto(false); window.location.reload() }}
        vendedores={vendedores}
      />
    </>
  )
}
```

- [ ] **Passo 7: Modificar `app/(dashboard)/configuracoes/page.tsx`**

Ler o arquivo atual e adicionar o link de WhatsApp após o link de Distribuição:

```typescript
// Localizar o bloco do link de distribuição e adicionar após ele:
        <Link
          href="/configuracoes/whatsapp"
          className="flex items-center gap-3 rounded-lg border bg-white p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-slate-900">Conexões WhatsApp</p>
            <p className="text-sm text-slate-500">Gerenciar instâncias e QR Code</p>
          </div>
        </Link>
```

Adicionar `MessageCircle` ao import de `lucide-react` no topo do arquivo.

- [ ] **Passo 8: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 9: Commit**

```bash
git add components/whatsapp/ "app/(dashboard)/configuracoes/whatsapp/" "app/(dashboard)/configuracoes/page.tsx"
git commit -m "feat: adicionar pagina de configuracao de instancias WhatsApp com QR Code"
```

---

## Tarefa 4: Caixa de mensagens — lista de conversas

**Arquivos:**
- Criar: `app/(dashboard)/whatsapp/page.tsx`
- Criar: `components/whatsapp/lista-conversas.tsx`
- Criar: `components/whatsapp/item-conversa.tsx`

> **Antes de implementar:** rodar no SQL Editor do Supabase:
> ```sql
> ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
> ALTER PUBLICATION supabase_realtime ADD TABLE messages;
> ```

- [ ] **Passo 1: Criar `components/whatsapp/item-conversa.tsx`**

```typescript
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type Props = {
  conversa: {
    id: string
    telefone_externo: string
    ultima_mensagem_em: string | null
    lead: { id: string; nome: string | null } | null
    instancia: { nome: string } | null
    ultima_mensagem: string | null
  }
  ativa: boolean
}

export function ItemConversa({ conversa, ativa }: Props) {
  const nome = conversa.lead?.nome ?? conversa.telefone_externo
  const hora = conversa.ultima_mensagem_em
    ? format(new Date(conversa.ultima_mensagem_em), 'HH:mm', { locale: ptBR })
    : ''

  return (
    <Link
      href={`/whatsapp/${conversa.id}`}
      className={cn(
        'flex items-start gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 transition-colors',
        ativa && 'bg-slate-100'
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 font-semibold text-sm">
        {nome.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-900 truncate">{nome}</p>
          {hora && <span className="text-xs text-slate-400 shrink-0 ml-2">{hora}</span>}
        </div>
        {conversa.ultima_mensagem && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{conversa.ultima_mensagem}</p>
        )}
        {conversa.instancia && (
          <p className="text-[10px] text-slate-400">{conversa.instancia.nome}</p>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Passo 2: Criar `components/whatsapp/lista-conversas.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { ItemConversa } from './item-conversa'
import { useParams } from 'next/navigation'

type Conversa = {
  id: string
  telefone_externo: string
  ultima_mensagem_em: string | null
  lead: { id: string; nome: string | null } | null
  instancia: { nome: string } | null
  ultima_mensagem: string | null
}

type Props = { conversasIniciais: Conversa[] }

export function ListaConversas({ conversasIniciais }: Props) {
  const [conversas, setConversas] = useState(conversasIniciais)
  const params = useParams()
  const conversaAtivaId = params?.id as string | undefined

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel('conversations-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        // Simplificado: recarregar dados via router.refresh seria ideal,
        // mas para a lista basta reordenar no cliente quando a ultima_mensagem_em mudar
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex flex-col">
      {conversas.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-400">Nenhuma conversa ainda.</p>
      ) : (
        conversas.map((c) => (
          <ItemConversa key={c.id} conversa={c} ativa={c.id === conversaAtivaId} />
        ))
      )}
    </div>
  )
}
```

- [ ] **Passo 3: Criar `app/(dashboard)/whatsapp/page.tsx`**

```typescript
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

  // Para cada conversa, buscar a última mensagem
  const conversaIds = (conversasRaw ?? []).map((c) => c.id as string)
  const ultimasMensagens: Record<string, string> = {}
  if (conversaIds.length > 0) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, conteudo, enviado_em')
      .in('conversation_id', conversaIds)
      .order('enviado_em', { ascending: false })
    // Pegar a primeira (mais recente) por conversa
    ;(msgs ?? []).forEach((m) => {
      const cid = m.conversation_id as string
      if (!ultimasMensagens[cid]) ultimasMensagens[cid] = (m.conteudo as string) ?? ''
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
        <ListaConversas conversasIniciais={conversas} />
      </div>
    </div>
  )
}
```

- [ ] **Passo 4: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 5: Commit**

```bash
git add "app/(dashboard)/whatsapp/page.tsx" components/whatsapp/lista-conversas.tsx components/whatsapp/item-conversa.tsx
git commit -m "feat: adicionar caixa de mensagens com lista de conversas"
```

---

## Tarefa 5: Thread de mensagens e envio

**Arquivos:**
- Criar: `app/(dashboard)/whatsapp/actions.ts`
- Criar: `components/whatsapp/balao-mensagem.tsx`
- Criar: `components/whatsapp/thread-mensagens.tsx`
- Criar: `components/whatsapp/form-envio-mensagem.tsx`
- Criar: `app/(dashboard)/whatsapp/[id]/page.tsx`

- [ ] **Passo 1: Criar `app/(dashboard)/whatsapp/actions.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
}
```

- [ ] **Passo 2: Criar `components/whatsapp/balao-mensagem.tsx`**

```typescript
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

type Props = {
  mensagem: {
    id: string
    direcao: 'enviada' | 'recebida'
    conteudo: string | null
    enviado_em: string
    responsavel: { nome: string } | null
  }
}

export function BalaoMensagem({ mensagem }: Props) {
  const enviada = mensagem.direcao === 'enviada'
  const hora = format(new Date(mensagem.enviado_em), 'HH:mm', { locale: ptBR })

  return (
    <div className={cn('flex', enviada ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm',
          enviada ? 'bg-green-100 text-slate-900' : 'bg-white text-slate-900 border border-slate-100'
        )}
      >
        {!enviada && mensagem.responsavel && (
          <p className="mb-1 text-[10px] font-medium text-green-700">{mensagem.responsavel.nome}</p>
        )}
        <p className="whitespace-pre-wrap break-words">{mensagem.conteudo ?? '(mídia)'}</p>
        <p className={cn('mt-1 text-[10px]', enviada ? 'text-right text-green-700' : 'text-slate-400')}>
          {hora}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Passo 3: Criar `components/whatsapp/thread-mensagens.tsx`**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { BalaoMensagem } from './balao-mensagem'

type Mensagem = {
  id: string
  direcao: 'enviada' | 'recebida'
  conteudo: string | null
  enviado_em: string
  responsavel: { nome: string } | null
}

type Props = {
  mensagensIniciais: Mensagem[]
  conversaId: string
}

export function ThreadMensagens({ mensagensIniciais, conversaId }: Props) {
  const [mensagens, setMensagens] = useState(mensagensIniciais)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel(`thread-${conversaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversaId}` },
        (payload) => {
          const nova = payload.new as Record<string, unknown>
          setMensagens((prev) => [
            ...prev,
            {
              id: nova.id as string,
              direcao: nova.direcao as 'enviada' | 'recebida',
              conteudo: nova.conteudo as string | null,
              enviado_em: nova.enviado_em as string,
              responsavel: null,
            },
          ])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversaId])

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
      {mensagens.map((m) => (
        <BalaoMensagem key={m.id} mensagem={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Passo 4: Criar `components/whatsapp/form-envio-mensagem.tsx`**

```typescript
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import { enviarMensagem } from '@/app/(dashboard)/whatsapp/actions'

type Props = { conversaId: string }

export function FormEnvioMensagem({ conversaId }: Props) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  function handleEnviar() {
    if (!texto.trim()) return
    setErro(null)
    startTransition(async () => {
      try {
        await enviarMensagem(conversaId, texto)
        setTexto('')
      } catch (e: unknown) {
        setErro(e instanceof Error ? e.message : 'Erro ao enviar mensagem.')
      }
    })
  }

  return (
    <div className="border-t bg-white p-3 space-y-2">
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex items-end gap-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem... (Enter para enviar)"
          rows={2}
          className="resize-none"
          disabled={isPending}
        />
        <Button
          size="icon"
          onClick={handleEnviar}
          disabled={isPending || !texto.trim()}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Passo 5: Criar `app/(dashboard)/whatsapp/[id]/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ThreadMensagens } from '@/components/whatsapp/thread-mensagens'
import { FormEnvioMensagem } from '@/components/whatsapp/form-envio-mensagem'
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
    .select('id, organization_id')
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
      </div>

      {/* Thread */}
      <ThreadMensagens mensagensIniciais={mensagens} conversaId={id} />

      {/* Envio */}
      <FormEnvioMensagem conversaId={id} />
    </div>
  )
}
```

- [ ] **Passo 6: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 7: Commit**

```bash
git add "app/(dashboard)/whatsapp/actions.ts" "app/(dashboard)/whatsapp/[id]/page.tsx" \
        components/whatsapp/balao-mensagem.tsx \
        components/whatsapp/thread-mensagens.tsx \
        components/whatsapp/form-envio-mensagem.tsx
git commit -m "feat: adicionar thread de mensagens com Realtime e envio"
```

---

## Tarefa 6: Modelos de mensagem

**Arquivos:**
- Criar: `app/(dashboard)/whatsapp/modelos/actions.ts`
- Criar: `components/whatsapp/modal-modelo.tsx`
- Criar: `app/(dashboard)/whatsapp/modelos/page.tsx`

- [ ] **Passo 1: Criar `app/(dashboard)/whatsapp/modelos/actions.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getPerfil() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  return { supabase, perfil }
}

export async function criarModelo(formData: FormData) {
  const { supabase, perfil } = await getPerfil()

  const nome = (formData.get('nome') as string)?.trim()
  const conteudo = (formData.get('conteudo') as string)?.trim()
  const categoria = (formData.get('categoria') as string)?.trim() || null

  if (!nome) throw new Error('Nome é obrigatório.')
  if (!conteudo) throw new Error('Conteúdo é obrigatório.')

  const { error } = await supabase.from('message_templates').insert({
    organization_id: perfil.organization_id,
    nome,
    conteudo,
    categoria,
    criado_por: perfil.id,
  })

  if (error) throw new Error(`Erro ao criar modelo: ${error.message}`)
  revalidatePath('/whatsapp/modelos')
}

export async function editarModelo(modeloId: string, formData: FormData) {
  const { supabase, perfil } = await getPerfil()

  const nome = (formData.get('nome') as string)?.trim()
  const conteudo = (formData.get('conteudo') as string)?.trim()
  const categoria = (formData.get('categoria') as string)?.trim() || null

  if (!nome) throw new Error('Nome é obrigatório.')
  if (!conteudo) throw new Error('Conteúdo é obrigatório.')

  const { error } = await supabase
    .from('message_templates')
    .update({ nome, conteudo, categoria, atualizado_em: new Date().toISOString() })
    .eq('id', modeloId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao editar modelo: ${error.message}`)
  revalidatePath('/whatsapp/modelos')
}

export async function excluirModelo(modeloId: string) {
  const { supabase, perfil } = await getPerfil()

  const { error } = await supabase
    .from('message_templates')
    .delete()
    .eq('id', modeloId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir modelo: ${error.message}`)
  revalidatePath('/whatsapp/modelos')
}
```

- [ ] **Passo 2: Criar `components/whatsapp/modal-modelo.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { criarModelo, editarModelo } from '@/app/(dashboard)/whatsapp/modelos/actions'
import type { MessageTemplate } from '@/types/database'

type Props = {
  aberto: boolean
  onFechar: () => void
  modelo?: MessageTemplate
}

export function ModalModelo({ aberto, onFechar, modelo }: Props) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    try {
      if (modelo) {
        await editarModelo(modelo.id, formData)
      } else {
        await criarModelo(formData)
      }
      onFechar()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar modelo.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modelo ? 'Editar Modelo' : 'Novo Modelo de Mensagem'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_modelo">Nome *</Label>
            <Input id="nome_modelo" name="nome" defaultValue={modelo?.nome} placeholder="Ex: Saudação inicial" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoria_modelo">Categoria</Label>
            <Input id="categoria_modelo" name="categoria" defaultValue={modelo?.categoria ?? ''} placeholder="Ex: Saudação, Follow-up" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conteudo_modelo">Mensagem *</Label>
            <Textarea
              id="conteudo_modelo"
              name="conteudo"
              defaultValue={modelo?.conteudo}
              rows={4}
              placeholder="Olá! Como posso ajudar?"
              required
            />
          </div>
          {erro && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{erro}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={carregando}>
              {carregando ? 'Salvando...' : modelo ? 'Salvar' : 'Criar Modelo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 3: Criar `app/(dashboard)/whatsapp/modelos/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ModelosClient } from '@/components/whatsapp/modelos-client'

export default async function ModelosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: modelos } = await supabase
    .from('message_templates')
    .select('*')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Modelos de Mensagem</h1>
      <ModelosClient modelos={modelos ?? []} />
    </div>
  )
}
```

- [ ] **Passo 4: Criar `components/whatsapp/modelos-client.tsx`** (Client Component para CRUD)

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ModalModelo } from './modal-modelo'
import { excluirModelo } from '@/app/(dashboard)/whatsapp/modelos/actions'
import { useRouter } from 'next/navigation'
import type { MessageTemplate } from '@/types/database'

type Props = { modelos: MessageTemplate[] }

export function ModelosClient({ modelos }: Props) {
  const router = useRouter()
  const [modalAberto, setModalAberto] = useState(false)
  const [modeloEditando, setModeloEditando] = useState<MessageTemplate | undefined>()

  async function handleExcluir(id: string, nome: string) {
    if (!confirm(`Excluir o modelo "${nome}"?`)) return
    try {
      await excluirModelo(id)
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-1.5" onClick={() => { setModeloEditando(undefined); setModalAberto(true) }}>
          <Plus className="h-4 w-4" />
          Novo Modelo
        </Button>
      </div>

      {modelos.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-slate-400">Nenhum modelo criado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {modelos.map((m) => (
            <div key={m.id} className="flex items-start justify-between rounded-lg border bg-white p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{m.nome}</p>
                  {m.categoria && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{m.categoria}</span>
                  )}
                </div>
                <p className="text-sm text-slate-500 line-clamp-2">{m.conteudo}</p>
              </div>
              <div className="flex items-center gap-1 ml-4 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setModeloEditando(m); setModalAberto(true) }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleExcluir(m.id, m.nome)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalModelo
        aberto={modalAberto}
        onFechar={() => { setModalAberto(false); router.refresh() }}
        modelo={modeloEditando}
      />
    </div>
  )
}
```

- [ ] **Passo 5: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 6: Commit**

```bash
git add "app/(dashboard)/whatsapp/modelos/" components/whatsapp/modal-modelo.tsx components/whatsapp/modelos-client.tsx
git commit -m "feat: adicionar modelos de mensagem WhatsApp"
```

---

## Tarefa 7: Exportação de conversa (TXT e PNG)

**Arquivos:**
- Criar: `components/whatsapp/modal-exportar-conversa.tsx`
- Modificar: `app/(dashboard)/whatsapp/[id]/page.tsx` (adicionar botão exportar)

> **Antes:** instalar html2canvas:
> ```bash
> cd /Users/danilo/Documents/BOOT-CRM && npm install html2canvas
> ```

- [ ] **Passo 1: Instalar html2canvas**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npm install html2canvas
```

Verificar que aparece em `package.json` em `dependencies`.

- [ ] **Passo 2: Criar `components/whatsapp/modal-exportar-conversa.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'

type Mensagem = {
  id: string
  direcao: 'enviada' | 'recebida'
  conteudo: string | null
  enviado_em: string
  responsavel: { nome: string } | null
}

type Props = {
  aberto: boolean
  onFechar: () => void
  conversaId: string
  telefone: string
  nomeContato: string
  mensagens: Mensagem[]
  organizationId: string
  perfilId: string
  perfilNome: string
  leadId: string | null
}

export function ModalExportarConversa({
  aberto,
  onFechar,
  conversaId,
  telefone,
  nomeContato,
  mensagens,
  organizationId,
  perfilId,
  perfilNome,
  leadId,
}: Props) {
  const [carregando, setCarregando] = useState(false)

  function gerarTXT(): string {
    const agora = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    const cabecalho = [
      '========================================',
      'BOOT-CRM — Exportação de Conversa',
      '========================================',
      `Contato: ${nomeContato}`,
      `Número: ${telefone}`,
      `Exportado por: ${perfilNome}`,
      `Data da exportação: ${agora}`,
      `Total de mensagens: ${mensagens.length}`,
      '========================================',
      '',
    ].join('\n')

    const corpo = mensagens
      .map((m) => {
        const hora = format(new Date(m.enviado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })
        const autor = m.direcao === 'enviada'
          ? `${m.responsavel?.nome ?? 'Vendedor'} (enviada)`
          : `${nomeContato} (recebida)`
        return `${hora} — ${autor}:\n${m.conteudo ?? '(mídia)'}`
      })
      .join('\n\n')

    return cabecalho + corpo
  }

  function downloadTXT() {
    setCarregando(true)
    const conteudo = gerarTXT()
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversa-${telefone}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    logExportacao('txt')
    setCarregando(false)
    onFechar()
  }

  async function downloadPNG() {
    setCarregando(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const el = document.getElementById('conversa-export-preview')
      if (!el) return
      const canvas = await html2canvas(el, { scale: 2, useCORS: true })
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `conversa-${telefone}-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
      logExportacao('png')
      onFechar()
    } finally {
      setCarregando(false)
    }
  }

  async function logExportacao(formato: 'txt' | 'png') {
    // Log client-side via fetch para não bloquear o download
    await fetch('/api/exportacao-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversaId, formato, totalMensagens: mensagens.length, leadId }),
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => { if (!open) onFechar() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Conversa</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Escolha o formato de exportação. A exportação fica registrada no log de auditoria.
        </p>

        {/* Preview oculto para html2canvas */}
        <div id="conversa-export-preview" className="absolute -left-[9999px] top-0 w-[600px] bg-slate-50 p-6 font-sans text-sm">
          <div className="mb-4 border-b pb-3">
            <p className="font-bold text-slate-900">BOOT-CRM — Exportação de Conversa</p>
            <p className="text-xs text-slate-500">Contato: {nomeContato} · {telefone}</p>
            <p className="text-xs text-slate-500">Exportado por: {perfilNome} · {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
          <div className="space-y-3">
            {mensagens.map((m) => (
              <div key={m.id} className={`flex ${m.direcao === 'enviada' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${m.direcao === 'enviada' ? 'bg-green-100' : 'bg-white border'}`}>
                  <p>{m.conteudo ?? '(mídia)'}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {format(new Date(m.enviado_em), 'dd/MM HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={downloadTXT} disabled={carregando}>
            Baixar como TXT
          </Button>
          <Button className="flex-1" onClick={downloadPNG} disabled={carregando}>
            {carregando ? 'Gerando...' : 'Baixar como Imagem (PNG)'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Passo 3: Criar `app/api/exportacao-log/route.ts`** (endpoint para registrar exportação no banco)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { conversaId, formato, totalMensagens, leadId } = body as {
    conversaId: string
    formato: 'txt' | 'png'
    totalMensagens: number
    leadId: string | null
  }

  await supabase.from('conversation_exports').insert({
    organization_id: perfil.organization_id,
    conversation_id: conversaId,
    lead_id: leadId ?? null,
    exportado_por: perfil.id,
    formato,
    total_mensagens: totalMensagens,
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Passo 4: Modificar `app/(dashboard)/whatsapp/[id]/page.tsx`** — adicionar botão exportar

Ler o arquivo atual (já criado na Tarefa 5) e localizar o header. Adicionar após o botão de voltar:

```typescript
// Adicionar import no topo:
import { ModalExportarConversaButton } from '@/components/whatsapp/modal-exportar-conversa-button'
```

Adicionar `perfilNome` à query de perfil (`.select('id, organization_id, nome')`).

No header, após o bloco de informações da conversa, adicionar:
```typescript
        <div className="ml-auto">
          <ModalExportarConversaButton
            conversaId={id}
            telefone={conversa.telefone_externo as string}
            nomeContato={titulo}
            mensagens={mensagens}
            organizationId={perfil.organization_id}
            perfilId={perfil.id}
            perfilNome={perfil.nome}
            leadId={lead?.id ?? null}
          />
        </div>
```

- [ ] **Passo 5: Criar `components/whatsapp/modal-exportar-conversa-button.tsx`** (Client Component wrapper para abrir o modal)

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { ModalExportarConversa } from './modal-exportar-conversa'

type Mensagem = {
  id: string
  direcao: 'enviada' | 'recebida'
  conteudo: string | null
  enviado_em: string
  responsavel: { nome: string } | null
}

type Props = {
  conversaId: string
  telefone: string
  nomeContato: string
  mensagens: Mensagem[]
  organizationId: string
  perfilId: string
  perfilNome: string
  leadId: string | null
}

export function ModalExportarConversaButton(props: Props) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAberto(true)} title="Exportar conversa">
        <Download className="h-4 w-4" />
      </Button>
      <ModalExportarConversa aberto={aberto} onFechar={() => setAberto(false)} {...props} />
    </>
  )
}
```

- [ ] **Passo 6: Verificar TypeScript**

```bash
cd /Users/danilo/Documents/BOOT-CRM && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Passo 7: Commit**

```bash
git add components/whatsapp/modal-exportar-conversa.tsx \
        components/whatsapp/modal-exportar-conversa-button.tsx \
        "app/api/exportacao-log/route.ts" \
        "app/(dashboard)/whatsapp/[id]/page.tsx"
git commit -m "feat: adicionar exportacao de conversa em TXT e PNG"
```

---

## Verificação Final da Fase 6

- [ ] Acessar `/configuracoes/whatsapp` — lista instâncias vazias
- [ ] Criar instância → cartão aparece com status "Desconectado"
- [ ] Clicar "Conectar" → QR Code aparece e atualiza automaticamente
- [ ] Escanear com WhatsApp → status muda para "Conectado"
- [ ] Enviar mensagem para o número → webhook cria lead + conversa em `/whatsapp`
- [ ] Abrir conversa → mensagem aparece em `/whatsapp/{id}`
- [ ] Responder via interface → mensagem entregue via Evolution API
- [ ] Criar modelo de mensagem em `/whatsapp/modelos`
- [ ] Exportar conversa como TXT → download correto com cabeçalho
- [ ] Exportar conversa como PNG → imagem da conversa gerada
- [ ] Verificar log em `conversation_exports` no Supabase
- [ ] TypeScript: zero erros

---

## Próximas Fases

| Fase | Conteúdo |
|---|---|
| **Fase 7** | Facebook Lead Ads e Instagram Lead Ads (webhooks Meta Graph API) |
| **Fase 8** | Orçamentos — catálogo, importação de planilha, fluxo de aprovação, PDF |
| **Fase 9** | Dashboard em tempo real e 4 relatórios com exportação |
| **Fase 10** | Testes finais e deploy em produção |

---

*Plano criado em 11/05/2026. Spec de referência: `docs/superpowers/specs/2026-05-09-boot-crm-design.md`*
