'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BadgeStatusOrcamento } from './badge-status-orcamento'
import { formatarMoeda } from '@/lib/utils'
import type { QuoteStatus } from '@/types/database'

type OrcamentoLista = {
  id: string
  numero: number
  status: QuoteStatus
  valor_total: number
  criado_em: string
  responsavel: { nome: string } | null
  lead: { nome: string | null } | null
  deal: { titulo: string } | null
}

type Props = { orcamentos: OrcamentoLista[] }

export function TabelaOrcamentos({ orcamentos }: Props) {
  const router = useRouter()

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">#</th>
            <th className="px-4 py-3 font-medium text-slate-600">Cliente/Lead</th>
            <th className="px-4 py-3 font-medium text-slate-600">Negociação</th>
            <th className="px-4 py-3 font-medium text-slate-600">Valor</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Responsável</th>
            <th className="px-4 py-3 font-medium text-slate-600">Data</th>
          </tr>
        </thead>
        <tbody>
          {orcamentos.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                Nenhum orçamento encontrado.
              </td>
            </tr>
          )}
          {orcamentos.map((o) => (
            <tr
              key={o.id}
              className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
              onClick={() => router.push(`/orcamentos/${o.id}`)}
            >
              <td className="px-4 py-3 font-medium text-slate-900">#{o.numero}</td>
              <td className="px-4 py-3 text-slate-700">{o.lead?.nome ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{o.deal?.titulo ?? '—'}</td>
              <td className="px-4 py-3 font-medium text-slate-900">{formatarMoeda(o.valor_total)}</td>
              <td className="px-4 py-3"><BadgeStatusOrcamento status={o.status} /></td>
              <td className="px-4 py-3 text-slate-600">{o.responsavel?.nome ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">
                {format(new Date(o.criado_em), 'dd/MM/yyyy', { locale: ptBR })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
