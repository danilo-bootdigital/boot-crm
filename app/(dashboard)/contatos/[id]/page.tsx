import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TimelineAtividades } from '@/components/shared/timeline-atividades'
import { FormObservacaoContato } from '@/components/contatos/form-observacao-contato'
import { AcoesContato } from '@/components/contatos/acoes-contato'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'
import type { Contact, Company, Profile } from '@/types/database'

type ContatoCompleto = Contact & {
  empresa: Pick<Company, 'id' | 'nome'> | null
  responsavel: Pick<Profile, 'id' | 'nome'> | null
}

export default async function ContatoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const { data: contato } = await supabase
    .from('contacts')
    .select('*, empresa:companies!empresa_id(id, nome), responsavel:profiles!responsavel_id(id, nome)')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single() as { data: ContatoCompleto | null }

  if (!contato) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/contatos">
          <Button variant="ghost" size="sm" className="gap-1 pl-0 text-slate-600">
            <ChevronLeft className="h-4 w-4" />
            Contatos
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{contato.nome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {contato.cargo && (
                <div>
                  <p className="text-xs text-slate-500">Cargo</p>
                  <p className="font-medium">{contato.cargo}</p>
                </div>
              )}
              {contato.empresa && (
                <div>
                  <p className="text-xs text-slate-500">Empresa</p>
                  <p className="font-medium">{contato.empresa.nome}</p>
                </div>
              )}
              {contato.telefone && (
                <div>
                  <p className="text-xs text-slate-500">Telefone</p>
                  <p className="font-medium">{contato.telefone}</p>
                </div>
              )}
              {contato.email && (
                <div>
                  <p className="text-xs text-slate-500">E-mail</p>
                  <p className="font-medium">{contato.email}</p>
                </div>
              )}
              {contato.endereco && (
                <div>
                  <p className="text-xs text-slate-500">Endereço</p>
                  <p className="font-medium">{contato.endereco}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Responsável</p>
                <p className="font-medium">{contato.responsavel?.nome ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cadastrado em</p>
                <p className="font-medium">{format(new Date(contato.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              {contato.cpf_cnpj && (
                <div>
                  <p className="text-xs text-slate-500">CPF/CNPJ</p>
                  <p className="font-medium">{contato.cpf_cnpj}</p>
                </div>
              )}
              <hr className="my-3" />
              <AcoesContato contatoId={contato.id} contatoNome={contato.nome} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar observação</CardTitle>
            </CardHeader>
            <CardContent>
              <FormObservacaoContato contatoId={contato.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineAtividades contatoId={contato.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
