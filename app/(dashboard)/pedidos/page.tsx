import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { BadgeStatusPedido } from '@/components/pedidos/badge-status-pedido'

export default async function PedidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  let query = supabase
    .from('orders')
    .select(`
      id, numero, status, valor_total, criado_em,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(nome, telefone),
      contato:contacts!contato_id(nome, telefone)
    `)
    .eq('organization_id', perfil.organization_id)
    .order('criado_em', { ascending: false })
    .limit(100)

  if (perfil.cargo === 'vendedor') {
    query = query.eq('responsavel_id', perfil.id)
  }

  const { data: pedidos } = await query

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe o status operacional dos pedidos aprovados.
          </p>
        </div>
      </div>

      {(!pedidos || pedidos.length === 0) ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-16">
          <Package className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Nenhum pedido ainda.</p>
          <p className="text-xs text-slate-400">Pedidos são gerados automaticamente ao aprovar um orçamento.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pedidos.map((pedido) => {
                const lead = Array.isArray(pedido.lead) ? pedido.lead[0] : pedido.lead
                const contato = Array.isArray(pedido.contato) ? pedido.contato[0] : pedido.contato
                const responsavel = Array.isArray(pedido.responsavel) ? pedido.responsavel[0] : pedido.responsavel
                const cliente = contato?.nome || lead?.nome || lead?.telefone || '—'

                return (
                  <tr key={pedido.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/pedidos/${pedido.id}`} className="font-medium text-blue-600 hover:underline">
                        #{pedido.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{cliente}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {Number(pedido.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-4 py-3">
                      <BadgeStatusPedido status={pedido.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{responsavel?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(pedido.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
