import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CardInstancia } from '@/components/whatsapp/card-instancia'
import { AdicionarInstanciaButton } from '@/components/whatsapp/adicionar-instancia-button'

export default async function WhatsappConfigPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.cargo !== 'admin') redirect('/painel')

  const { data: instancias } = await supabase
    .from('whatsapp_instances')
    .select(`
      id, nome, numero, status_conexao, compartilhado,
      vendedor:profiles!vendedor_id(nome)
    `)
    .eq('organization_id', perfil.organization_id)
    .order('criado_em', { ascending: true })

  const { data: vendedores } = await supabase
    .from('profiles')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)
    .eq('ativo', true)
    .in('cargo', ['vendedor', 'atendimento'])
    .order('nome')

  const instanciasFormatadas = (instancias ?? []).map((i) => ({
    id: i.id as string,
    nome: i.nome as string,
    numero: i.numero as string | null,
    status_conexao: i.status_conexao as import('@/types/database').WhatsappStatus,
    compartilhado: i.compartilhado as boolean,
    vendedor: (Array.isArray(i.vendedor) ? i.vendedor[0] : i.vendedor) as { nome: string } | null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Conexões WhatsApp</h1>
          <p className="mt-0.5 text-sm text-slate-500">Gerencie as instâncias conectadas ao sistema.</p>
        </div>
        <AdicionarInstanciaButton vendedores={vendedores ?? []} />
      </div>

      {instanciasFormatadas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm text-slate-400">Nenhuma instância configurada. Adicione a primeira para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {instanciasFormatadas.map((i) => (
            <CardInstancia key={i.id} instancia={i} />
          ))}
        </div>
      )}
    </div>
  )
}
