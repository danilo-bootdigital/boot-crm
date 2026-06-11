'use client'

// ============================================================
// WhatsappShell: container principal da Central de Atendimento
// Layout: Header + Linha Instâncias + KPIs + Busca + Lista + Chat
// Estado de URL (searchParams) é a fonte da verdade
// SEM Zustand, SEM fetch próprio
// ============================================================

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { HeaderKPIs } from './header-kpis'
import { ListaConversas } from './lista-conversas'
import { ChatArea } from './chat-area'
import { PainelCliente } from './painel-cliente'
import { ModalNovaConversa } from './modal-nova-conversa'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Plus, Settings, BarChart3, Search, Wifi, WifiOff, Loader2 } from 'lucide-react'
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
  const [apenasOnline, setApenasOnline] = useState(true)

  // Atualizar URL (filtros e estado de UI)
  const setParam = (key: string, value: string | null): void => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`?${params.toString()}`)
  }

  const instanciaAtiva: string | null = searchParams.get('instanciaId')
  const kpiAtivo = (searchParams.get('status') as ConversaStatus | null) ?? null

  const listaItens: ListaConversaItem[] = props.conversas.map(toListaItem)

  // Instâncias filtradas
  const visiveis = apenasOnline
    ? props.instancias.filter((i) => i.status_conexao === 'conectado')
    : props.instancias

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
  }, [buscaInput])

  return (
    <div className="flex h-screen bg-white">
      {/* Coluna 1: Área principal (sem sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 border-r">
        {/* Header de ações */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/5">
          <h1 className="text-lg font-semibold">Conversas</h1>
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

        {/* Linha horizontal de instâncias */}
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/10">
          <span className="text-sm font-medium shrink-0">Instâncias:</span>
          <span className="text-xs text-muted-foreground shrink-0">{totalOnline} ativa{totalOnline !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-1 shrink-0">
            <label htmlFor="apenas-online" className="text-xs cursor-pointer">Apenas online</label>
            <Switch
              id="apenas-online"
              checked={apenasOnline}
              onCheckedChange={setApenasOnline}
            />
          </div>
          <Button
            variant={instanciaAtiva === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setParam('instanciaId', null)}
          >
            Todas
          </Button>
          <div className="flex items-center gap-2 overflow-x-auto flex-1">
            {visiveis.map((inst) => (
              <button
                key={inst.id}
                onClick={() => setParam('instanciaId', inst.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs whitespace-nowrap transition-colors',
                  instanciaAtiva === inst.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent hover:bg-muted/50'
                )}
              >
                <span className={cn('p-0.5 rounded', statusClass(inst.status_conexao))}>
                  {statusIcon(inst.status_conexao)}
                </span>
                <span className="font-medium">{inst.nome}</span>
                <span className="text-muted-foreground">{statusLabel(inst.status_conexao)}</span>
              </button>
            ))}
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