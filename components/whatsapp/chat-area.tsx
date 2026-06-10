'use client'

// ============================================================
// ChatArea: coluna 3 com header + thread + form de envio
// Sub-fase 2.2.1 (com paridade funcional restaurada)
// ============================================================
// - Recebe conversa COMPLETA via props (sem fetch)
// - Recebe mensagensIniciais do server (sem loading visivel)
// - Reusa ThreadMensagens e FormEnvioMensagem existentes
// - Header com nome_contato + name_source + acoes
// ============================================================

import { X, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { iniciais } from '@/lib/telefone'
import { ThreadMensagens } from './thread-mensagens'
import { FormEnvioMensagem } from './form-envio-mensagem'
import type { ConversaCompleta } from '@/types/whatsapp-central'

const STATUS_BADGE: Record<string, { label: string; classe: string }> = {
  nao_atendida: { label: 'Nao atendida', classe: 'bg-red-100 text-red-700' },
  em_atendimento: { label: 'Em atendimento', classe: 'bg-blue-100 text-blue-700' },
  aguardando_cliente: { label: 'Aguardando', classe: 'bg-amber-100 text-amber-700' },
  finalizada: { label: 'Finalizada', classe: 'bg-green-100 text-green-700' },
}

type MensagemInicial = {
  id: string
  conteudo: string | null
  direcao: 'enviada' | 'recebida'
  tipo_midia: string
  url_midia: string | null
  enviado_em: string
}

type Props = {
  conversa: ConversaCompleta
  mensagensIniciais: MensagemInicial[]
  onFechar: () => void
  onAbrirPainel: () => void
}

export function ChatArea({ conversa, mensagensIniciais, onFechar, onAbrirPainel }: Props) {
  const badge = STATUS_BADGE[conversa.status] ?? STATUS_BADGE.nao_atendida
  const nomeExibicao = conversa.nome_contato ?? conversa.telefone_externo

  return (
    <div className="w-[480px] flex flex-col h-full border-l bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b">
        <Button size="icon" variant="ghost" onClick={onFechar}>
          <X className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-green-100 text-green-700 text-xs">
            {iniciais(nomeExibicao)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{nomeExibicao}</p>
          <p className="text-xs text-muted-foreground truncate">
            {conversa.telefone_externo}
            {conversa.name_source && (
              <span className="ml-1 text-[10px] uppercase">
                · {conversa.name_source}
              </span>
            )}
          </p>
        </div>
        <Badge className={badge.classe} variant="secondary">
          {badge.label}
        </Badge>
        <Button size="icon" variant="ghost" onClick={onAbrirPainel} title="Abrir painel">
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      </div>

      {/* Thread */}
      <ThreadMensagens conversaId={conversa.id} mensagensIniciais={mensagensIniciais as any} />

      {/* Form de envio */}
      <FormEnvioMensagem conversaId={conversa.id} />
    </div>
  )
}
