import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, GitBranch } from 'lucide-react'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const isAdmin = perfil.cargo === 'admin'
  const isAdminOuGestor = perfil.cargo === 'admin' || perfil.cargo === 'gestor'

  if (!isAdminOuGestor) redirect('/painel')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gerencie as configurações do sistema.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isAdmin && (
          <Link
            href="/configuracoes/usuarios"
            className="flex items-start gap-4 rounded-lg border bg-white p-5 transition-colors hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <div className="font-medium text-slate-900">Usuários e Permissões</div>
              <div className="mt-0.5 text-sm text-slate-500">
                Gerencie usuários, perfis de acesso e status.
              </div>
            </div>
          </Link>
        )}

        <Link
          href="/configuracoes/distribuicao"
          className="flex items-start gap-4 rounded-lg border bg-white p-5 transition-colors hover:bg-slate-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <GitBranch className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <div className="font-medium text-slate-900">Distribuição de Leads</div>
            <div className="mt-0.5 text-sm text-slate-500">
              Configure o modo de atribuição automática de leads.
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
