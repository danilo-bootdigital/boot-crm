import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TabelaContatos } from '@/components/contatos/tabela-contatos'
import { ModalNovoContato } from '@/components/contatos/modal-novo-contato'
import { BotaoImportarExportar } from '@/components/contatos/botao-importar-exportar'
import { Paginacao } from '@/components/ui/paginacao'
import type { Contact, Company } from '@/types/database'

type ContatoComEmpresa = Contact & { empresa: Pick<Company, 'id' | 'nome'> | null }

type SearchParams = Promise<{
  pagina?: string
}>

const POR_PAGINA = 50

export default async function ContatosPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const pagina = Math.max(1, parseInt(params.pagina ?? '1', 10) || 1)
  const from = (pagina - 1) * POR_PAGINA
  const to = from + POR_PAGINA - 1

  const { data: contatos, count } = await supabase
    .from('contacts')
    .select('*, empresa:companies!empresa_id(id, nome)', { count: 'exact' })
    .eq('organization_id', perfil.organization_id)
    .order('nome')
    .range(from, to) as { data: ContatoComEmpresa[] | null; count: number | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contatos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Contatos qualificados vinculados a negociações.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BotaoImportarExportar />
          <ModalNovoContato />
        </div>
      </div>

      <TabelaContatos contatos={contatos ?? []} isAdmin={perfil.cargo === 'admin'} />

      <Paginacao
        paginaAtual={pagina}
        totalRegistros={count ?? 0}
        porPagina={POR_PAGINA}
        baseUrl="/contatos"
        searchParams={params as Record<string, string | undefined>}
      />
    </div>
  )
}
