import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BadgeOrigem } from '@/components/leads/badge-origem'
import { BadgeStatusLead } from '@/components/leads/badge-status-lead'
import { ModalConverterLead } from '@/components/leads/modal-converter-lead'
import { FormObservacao } from '@/components/leads/form-observacao'
import { TimelineAtividades } from '@/components/shared/timeline-atividades'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { descartarLead } from '@/app/(dashboard)/leads/actions'
import { ChevronLeft } from 'lucide-react'
import type { Lead, Profile } from '@/types/database'

type LeadComResponsavel = Lead & { responsavel: Pick<Profile, 'id' | 'nome'> | null }

export default async function LeadDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: lead } = await supabase
    .from('leads')
    .select('*, responsavel:profiles!responsavel_id(id, nome)')
    .eq('id', id)
    .single() as { data: LeadComResponsavel | null }

  if (!lead) notFound()

  const podeConverter = lead.status !== 'qualificado' && lead.status !== 'descartado'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/leads">
          <Button variant="ghost" size="sm" className="gap-1 pl-0 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
            Leads
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {lead.nome ?? <span className="italic text-slate-400">Sem nome</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-2">
                <BadgeOrigem origem={lead.origem} />
                <BadgeStatusLead status={lead.status} />
              </div>
              {lead.telefone && (
                <div>
                  <p className="text-xs text-slate-500">Telefone</p>
                  <p className="font-medium">{lead.telefone}</p>
                </div>
              )}
              {lead.email && (
                <div>
                  <p className="text-xs text-slate-500">E-mail</p>
                  <p className="font-medium">{lead.email}</p>
                </div>
              )}
              {lead.empresa && (
                <div>
                  <p className="text-xs text-slate-500">Empresa</p>
                  <p className="font-medium">{lead.empresa}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Responsável</p>
                <p className="font-medium">{lead.responsavel?.nome ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cadastrado em</p>
                <p className="font-medium">{format(new Date(lead.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              {lead.observacoes && (
                <div>
                  <p className="text-xs text-slate-500">Observações</p>
                  <p className="text-slate-700">{lead.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            {podeConverter && <ModalConverterLead lead={lead} />}
            {lead.status !== 'descartado' && (
              <form action={descartarLead.bind(null, lead.id, 'Descartado manualmente.')}>
                <Button type="submit" variant="outline" className="w-full text-red-600 hover:text-red-700">
                  Descartar Lead
                </Button>
              </form>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar observação</CardTitle>
            </CardHeader>
            <CardContent>
              <FormObservacao leadId={lead.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineAtividades leadId={lead.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
