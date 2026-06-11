'use client'

// ============================================================
// WhatsappShell: container principal da Central de Atendimento
// Sub-fase 2.2.1 (com paridade funcional restaurada)
// ============================================================
// - Layout 3 colunas (Sidebar + Lista+KPIs + Chat + Painel opcional)
// - Estado de URL (searchParams) e' a fonte da verdade
// - SEM Zustand, SEM fetch proprio
// ============================================================

import { useRouter, useSearchParams } from 'next/navigation'
import { SidebarInstancias } from './sidebar-instancias'
import { HeaderKPIs } from './header-kpis'
import { ListaConversas } from './lista-conversas'
import { ChatArea } from './chat-area'
import { PainelCliente } from './painel-cliente'
import { ModalNovaConversa } from './modal-nova-conversa'
import { Button } from '@/components/ui/button'
import { Plus, Settings, BarChart3 } from 'lucide-react'
import Link from 'next/link'
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
  // Paridade funcional: dados extras da conversa ativa
  notasAtivas: Array<{ id: string; conteudo: string; criado_em: string; autor_nome: string | null }>
  dealAtivo: { id: string; titulo: string; valor_estimado: number | null; estagio_nome: string | null } | null
  tagsAtivas: TagConversa[]
  mensagensIniciais: Array<{
    id: string; conteudo: string | null; direcao: 'enviada' | 'recebida'
    tipo_midia: string; url_midia: string | null; enviado_em: string
  }>
}

// Adapter: ConversaResumo -> formato esperado por ListaConversas (com ultima mensagem)
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

export function WhatsappShell(props: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

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

  // Conversas para ModalNovaConversa (formato esperado: id, nome, numero, status_conexao)
  const instanciasParaModal = props.instancias.map((i) => ({
    id: i.id,
    nome: i.nome,
    numero: i.numero,
    status_conexao: i.status_conexao,
  }))

  return (
    <div className="flex h-screen bg-white">
      {/* Coluna 1: Sidebar de instancias */}
      <SidebarInstancias
        instancias={props.instancias}
        instanciaAtiva={instanciaAtiva}
        onSelect={(id) => setParam('instanciaId', id)}
        onConectar={() => router.push('/configuracoes-whatsapp')}
      />

      {/* Coluna 2: KPIs + Lista de conversas */}
      <div className="flex-1 flex flex-col min-w-0 border-r">
        {/* Header de acoes (com botoes originais restaurados) */}
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

        {/* KPIs */}
        <HeaderKPIs
          kpis={props.kpis}
          kpiAtivo={kpiAtivo}
          onSelect={(status) => setParam('status', status)}
        />

        {/* Lista */}
        <div data-debug="whatsapp_shell_count" className="p-2 text-xs text-red-600">
          DEBUG shell props.conversas: {props.conversas.length} | listaItens: {listaItens.length}
        </div>
        <ListaConversas
          conversasIniciais={listaItens}
          conversaAtivaId={props.conversaAtiva?.id ?? undefined}
        />
      </div>

      {/* Coluna 3: Chat (se conversa ativa) */}
      {props.conversaAtiva && (
        <ChatArea
          conversa={props.conversaAtiva}
          mensagensIniciais={props.mensagensIniciais}
          onFechar={() => setParam('conversaId', null)}
          onAbrirPainel={() => setParam('painel', '1')}
        />
      )}

      {/* Coluna 4: Painel lateral (se painel aberto) */}
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
