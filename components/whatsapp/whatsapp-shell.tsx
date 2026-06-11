'use client'

// ============================================================
// WhatsappShell: container principal da Central de Atendimento
// Layout: Header + Linha Instâncias + KPIs + Busca + Lista + Chat
// Estado de URL (searchParams) é a fonte da verdade
// SEM Zustand, SEM fetch próprio
// ============================================================

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { HeaderKPIs } from './header-kpis'
import { ListaConversas } from './lista-conversas'
import { ChatArea } from './chat-area'
import { PainelCliente } from './painel-cliente'
import { ModalNovaConversa } from './modal-nova-conversa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Settings, BarChart3, Search, Wifi, WifiOff, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ConversaResumo } from '@/lib/queries/conversas'
import type { KPIWhatsApp, ConversaStatus } from '@/types/database'
import type {
  WhatsappInstanciaResumo,
  ConversaCompleta,
  PerfilCentral,
  UsuarioResumo,
  TagConversa,
} from '@/types/whatsapp-central'
import type { TotaisCliente } from '@/types/database'

type Props = {
  instancias: WhatsappInstanciaResumo[]
  conversas: ConversaResumo[]
  kpis: KPIWhatsApp
  usuarios: UsuarioResumo[]
  tags: TagConversa[]
  perfil: PerfilCentral
  conversaAtiva: ConversaCompleta | null
  totais: TotaisCliente | null
  painelAberto: boolean
  notasAtivas: Array<{ id: string; conteudo: string; criado_em: string; autor_nome: string | null }>
  dealAtivo: { id: string; titulo: string; valor_estimado: number | null; estagio_nome: string | null } | null
  tagsAtivas: TagConversa[]
  mensagensIniciais: Array<{
    id: string; conteudo: string | null; direcao: 'enviada' | 'recebida'
    tipo_midia: string; url_midia: string | null; enviado_em: string
  }>
  pagination: {
    offset: number
    limite: number
    total: number
  }
}

// Adapter: ConversaResumo -> formato esperado por ListaConversas
type ListaConversaItem = {
  id: string
  nome_contato: string
  telefone: string
  ultima_mensagem_em: string | null
  status: string
}

function toListaItem(c: ConversaResumo & {
  ultima_mensagem?: string
  ultima_mensagem_em_formatada?: string | null
}): ListaConversaItem {
  return {
    id: c.id,
    nome_contato: c.nome_contato ?? c.telefone_externo,
    telefone: c.telefone_externo,
    ultima_mensagem_em: c.ultima_mensagem_em,
    status: c.status,
  }
}

function statusIcon(status: string) {
  if (status === 'conectado') return <Wifi className="h-3 w-3" />
  if (status === 'aguardando_qr') return <Loader2 className="h-3 w-3 animate-spin" />
  return <WifiOff className="h-3 w-3" />
}

function statusClass(status: string): string {
  if (status === 'conectado') return 'text-green-600 bg-green-50'
  if (status === 'aguardando_qr') return 'text-amber-600 bg-amber-50'
  return 'text-slate-400 bg-slate-100'
}

function statusLabel(status: string): string {
  if (status === 'conectado') return 'Online'
  if (status === 'aguardando_qr') return 'Aguardando QR'
  return 'Offline'
}

export function WhatsappShell(props: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Estado para debounce da busca
  const [buscaInput, setBuscaInput] = useState(searchParams.get('busca') ?? '')

  // Atualizar URL (filtros e estado de UI)
  const setParam = useCallback((key: string, value: string | null): void => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`?${params.toString()}`)
  }, [searchParams, router])

  const instanciaAtiva: string | null = searchParams.get('instanciaId')
  const kpiAtivo = (searchParams.get('status') as ConversaStatus | null) ?? null

  const listaItens: ListaConversaItem[] = props.conversas.map(toListaItem)

  const totalOnline = props.instancias.filter((i) => i.status_conexao === 'conectado').length

  // Conversas para ModalNovaConversa
  const instanciasParaModal = props.instancias.map((i) => ({
    id: i.id,
    nome: i.nome,
    numero: i.numero,
    status_conexao: i.status_conexao,
  }))

  // Debounce: aplicar busca após 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setParam('busca', buscaInput || null)
    }, 400)
    return () => clearTimeout(timer)
  }, [buscaInput, setParam])

  return (
    <div className="flex h-screen bg-white">
      {/* Coluna 1: Área principal (sem sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 border-r">
        {/* Header de ações com dropdown de instâncias */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/5">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Conversas</h1>
            <Select
              value={instanciaAtiva ?? 'todas'}
              onValueChange={(value) => setParam('instanciaId', value === 'todas' ? null : value)}
            >
              <SelectTrigger className="h-7 text-xs w-auto min-w-[140px]">
                <SelectValue placeholder="Todas as instâncias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Todas ({totalOnline} online)</span>
                  </div>
                </SelectItem>
                {props.instancias.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    <div className="flex items-center gap-2">
                      <span className={cn('p-0.5 rounded', statusClass(inst.status_conexao))}>
                        {statusIcon(inst.status_conexao)}
                      </span>
                      <span>{inst.nome}</span>
                      <span className="text-muted-foreground text-xs">({statusLabel(inst.status_conexao)})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/configuracoes-whatsapp">
              <Button size="sm" variant="ghost" title="Configuracoes">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/monitoramento-whatsapp">
              <Button size="sm" variant="ghost" title="Monitoramento">
                <BarChart3 className="h-4 w-4" />
              </Button>
            </Link>
            <ModalNovaConversa instancias={instanciasParaModal} />
          </div>
        </div>

        {/* KPIs */}
        <HeaderKPIs
          kpis={props.kpis}
          kpiAtivo={kpiAtivo}
          onSelect={(status) => setParam('status', status)}
        />

        {/* Campo de busca com debounce */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              className="pl-9"
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
            />
          </div>
        </div>

        {/* Lista */}
        <ListaConversas
          conversasIniciais={listaItens}
          conversaAtivaId={props.conversaAtiva?.id ?? undefined}
        />

        {/* Paginação */}
        <div className="flex items-center justify-center gap-4 px-4 py-3 border-t bg-muted/5">
          <Button
            variant="outline"
            size="sm"
            disabled={props.pagination.offset === 0}
            onClick={() => setParam('offset', String(props.pagination.offset - props.pagination.limite))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {props.pagination.offset + 1} - {Math.min(props.pagination.offset + props.pagination.limite, props.pagination.total)} de {props.pagination.total}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={props.pagination.offset + props.pagination.limite >= props.pagination.total}
            onClick={() => setParam('offset', String(props.pagination.offset + props.pagination.limite))}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Coluna 2: Chat (se conversa ativa) */}
      {props.conversaAtiva && (
        <ChatArea
          conversa={props.conversaAtiva}
          mensagensIniciais={props.mensagensIniciais}
          onFechar={() => setParam('conversaId', null)}
          onAbrirPainel={() => setParam('painel', '1')}
        />
      )}

      {/* Coluna 3: Painel lateral (se painel aberto) */}
      {props.painelAberto && props.conversaAtiva && (
        <PainelCliente
          conversa={props.conversaAtiva}
          totais={props.totais}
          notas={props.notasAtivas}
          deal={props.dealAtivo}
          tagsAtivas={props.tagsAtivas}
          todasTags={props.tags}
          usuarios={props.usuarios}
          onFechar={() => setParam('painel', null)}
        />
      )}
    </div>
  )
}