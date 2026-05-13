'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ItemMensagemPendente } from './item-mensagem-pendente'
import { ItemTarefaPendente } from './item-tarefa-pendente'
import { ItemAtividadeRecente } from './item-atividade-recente'

type MensagemPendente = {
  conversa_id: string
  telefone_externo: string
  lead_nome: string | null
  lead_id: string | null
  conteudo: string | null
  enviado_em: string
}

type TarefaPendente = {
  id: string
  titulo: string
  data_vencimento: string | null
  responsavel: { nome: string } | null
  lead: { id: string; nome: string | null } | null
}

type AtividadeRecente = {
  id: string
  tipo: string
  descricao: string
  criado_em: string
  lead: { id: string; nome: string | null } | null
}

type Props = {
  mensagens: MensagemPendente[]
  tarefas: TarefaPendente[]
  atividades: AtividadeRecente[]
}

type Tab = 'tudo' | 'mensagens' | 'tarefas' | 'atividades'

export function ListaItensInbox({ mensagens, tarefas, atividades }: Props) {
  const [tab, setTab] = useState<Tab>('tudo')

  const tabs: { valor: Tab; label: string; contagem: number }[] = [
    { valor: 'tudo', label: 'Tudo', contagem: mensagens.length + tarefas.length + atividades.length },
    { valor: 'mensagens', label: 'Mensagens', contagem: mensagens.length },
    { valor: 'tarefas', label: 'Tarefas', contagem: tarefas.length },
    { valor: 'atividades', label: 'Atividades', contagem: atividades.length },
  ]

  const mostrarMensagens = tab === 'tudo' || tab === 'mensagens'
  const mostrarTarefas = tab === 'tudo' || tab === 'tarefas'
  const mostrarAtividades = tab === 'tudo' || tab === 'atividades'

  const temItens = (mostrarMensagens && mensagens.length > 0) ||
    (mostrarTarefas && tarefas.length > 0) ||
    (mostrarAtividades && atividades.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {tabs.map((t) => (
          <Button
            key={t.valor}
            variant={tab === t.valor ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={() => setTab(t.valor)}
          >
            {t.label}
            {t.contagem > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === t.valor ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {t.contagem}
              </span>
            )}
          </Button>
        ))}
      </div>

      {!temItens && (
        <div className="py-12 text-center">
          <p className="text-sm text-slate-400">Nenhum item pendente. Tudo em dia! 🎉</p>
        </div>
      )}

      <div className="space-y-2">
        {mostrarMensagens && mensagens.map((m) => (
          <ItemMensagemPendente
            key={m.conversa_id}
            conversaId={m.conversa_id}
            leadNome={m.lead_nome}
            telefone={m.telefone_externo}
            conteudo={m.conteudo}
            enviadoEm={m.enviado_em}
          />
        ))}

        {mostrarTarefas && tarefas.map((t) => (
          <ItemTarefaPendente
            key={t.id}
            id={t.id}
            titulo={t.titulo}
            dataVencimento={t.data_vencimento}
            responsavelNome={t.responsavel?.nome ?? null}
            leadNome={t.lead?.nome ?? null}
            leadId={t.lead?.id ?? null}
          />
        ))}

        {mostrarAtividades && atividades.map((a) => (
          <ItemAtividadeRecente
            key={a.id}
            id={a.id}
            tipo={a.tipo}
            descricao={a.descricao}
            criadoEm={a.criado_em}
            leadId={a.lead?.id ?? null}
            leadNome={a.lead?.nome ?? null}
          />
        ))}
      </div>
    </div>
  )
}
