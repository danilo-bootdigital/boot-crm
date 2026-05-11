import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Activity, Profile } from '@/types/database'

type AtividadeComAutor = Activity & { autor: Pick<Profile, 'nome'> | null }

const ICONES_TIPO: Record<string, string> = {
  lead_criado: '✦',
  lead_editado: '✎',
  lead_descartado: '✕',
  lead_convertido: '→',
  responsavel_alterado: '⇄',
  observacao: '✉',
  status_alterado: '◉',
  contato_criado: '✦',
}

type Props = {
  leadId?: string
  contatoId?: string
}

export async function TimelineAtividades({ leadId, contatoId }: Props) {
  const supabase = await createClient()

  let query = supabase
    .from('activities')
    .select('*, autor:profiles!autor_id(nome)')
    .order('criado_em', { ascending: false })
    .limit(50)

  if (leadId) query = query.eq('lead_id', leadId)
  if (contatoId) query = query.eq('contato_id', contatoId)

  if (!leadId && !contatoId) return (
    <p className="text-sm text-slate-400">Nenhuma atividade disponível.</p>
  )

  const { data: atividades } = await query as { data: AtividadeComAutor[] | null }

  if (!atividades || atividades.length === 0) {
    return (
      <p className="text-sm text-slate-400">Nenhuma atividade registrada ainda.</p>
    )
  }

  return (
    <ol className="relative border-l border-slate-200 space-y-6">
      {atividades.map((atividade) => (
        <li key={atividade.id} className="ml-6">
          <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 text-xs text-slate-500">
            {ICONES_TIPO[atividade.tipo] ?? '·'}
          </span>
          <p className="text-sm text-slate-900">{atividade.descricao}</p>
          <p className="mt-1 text-xs text-slate-400">
            {atividade.autor?.nome ?? 'Sistema'} · {format(new Date(atividade.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </li>
      ))}
    </ol>
  )
}
