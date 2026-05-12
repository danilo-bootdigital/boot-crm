import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import type { UserRole } from '@/types/database'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  if (!['admin', 'gestor', 'vendedor'].includes(perfil.cargo)) redirect('/painel')

  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('padrao', true)
    .single()

  if (!pipeline) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Nenhum pipeline configurado.
      </div>
    )
  }

  const { data: etapas } = await supabase
    .from('pipeline_stages')
    .select('id, nome, cor, ordem, tipo_especial')
    .eq('pipeline_id', pipeline.id)
    .eq('oculto', false)
    .order('ordem')

  // Vendedor vê apenas os próprios deals
  let dealsQuery = supabase
    .from('deals')
    .select(`
      id,
      titulo,
      valor_estimado,
      estagio_id,
      ganho,
      motivo_perda,
      data_fechamento_prevista,
      contato:contato_id(id, nome),
      responsavel:responsavel_id(id, nome)
    `)
    .eq('pipeline_id', pipeline.id)
    .eq('organization_id', perfil.organization_id)
    .is('ganho', null)

  if (perfil.cargo === 'vendedor') {
    dealsQuery = dealsQuery.eq('responsavel_id', perfil.id)
  }

  const { data: dealsRaw } = await dealsQuery

  const deals = (dealsRaw ?? []).map((d) => ({
    id: d.id as string,
    titulo: d.titulo as string,
    valor_estimado: d.valor_estimado as number | null,
    estagio_id: d.estagio_id as string,
    ganho: d.ganho as boolean | null,
    motivo_perda: d.motivo_perda as string | null,
    data_fechamento_prevista: d.data_fechamento_prevista as string | null,
    contato: Array.isArray(d.contato) ? d.contato[0] ?? null : d.contato as { id: string; nome: string } | null,
    responsavel: Array.isArray(d.responsavel) ? d.responsavel[0] ?? null : d.responsavel as { id: string; nome: string } | null,
  }))

  const podeEditarEtapas = perfil.cargo === 'admin' || perfil.cargo === 'gestor'

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline de Vendas</h1>
          <p className="mt-0.5 text-sm text-slate-500">{pipeline.nome}</p>
        </div>
        {podeEditarEtapas && (
          <Link
            href="/pipeline/configurar"
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" />
            Configurar etapas
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          pipelineId={pipeline.id}
          etapas={etapas ?? []}
          dealsIniciais={deals}
          cargo={perfil.cargo as UserRole}
          organizationId={perfil.organization_id}
        />
      </div>
    </div>
  )
}
