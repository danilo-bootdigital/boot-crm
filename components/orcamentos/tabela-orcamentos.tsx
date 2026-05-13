'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BadgeStatusOrcamento } from './badge-status-orcamento'
import { formatarMoeda } from '@/lib/utils'
import { excluirOrcamento } from '@/app/(dashboard)/orcamentos/actions'
import { Trash2, Search } from 'lucide-react'
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
  const [isPending, startTransition] = useTransition()
  const [busca, setBusca] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  // Filtrar
  const filtrados = orcamentos.filter((o) => {
    // Filtro por texto (nome do lead ou número)
    if (busca) {
      const termo = busca.toLowerCase()
      const matchNome = o.lead?.nome?.toLowerCase().includes(termo)
      const matchNumero = o.numero.toString().includes(termo)
      const matchDeal = o.deal?.titulo?.toLowerCase().includes(termo)
      if (!matchNome && !matchNumero && !matchDeal) return false
    }
    // Filtro por data
    if (dataInicio) {
      const inicio = new Date(dataInicio + 'T00:00:00')
      if (new Date(o.criado_em) < inicio) return false
    }
    if (dataFim) {
      const fim = new Date(dataFim + 'T23:59:59')
      if (new Date(o.criado_em) > fim) return false
    }
    return true
  })

  function handleExcluir(id: string, numero: number, e: React.MouseEvent) {
    e.stopPropagation()
    const confirmar = window.confirm(`Excluir orçamento #${numero}? Esta ação não pode ser desfeita.`)
    if (!confirmar) return

    startTransition(async () => {
      try {
        await excluirOrcamento(id)
        toast.success(`Orçamento #${numero} excluído.`)
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por cliente, negociação ou número..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-36"
          />
          <span className="text-sm text-slate-400">até</span>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-36"
          />
        </div>
      </div>

      {/* Tabela */}
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
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  Nenhum orçamento encontrado.
                </td>
              </tr>
            )}
            {filtrados.map((o) => (
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
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600"
                    onClick={(e) => handleExcluir(o.id, o.numero, e)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {busca || dataInicio || dataFim ? (
        <p className="text-xs text-slate-400">
          Mostrando {filtrados.length} de {orcamentos.length} orçamentos
        </p>
      ) : null}
    </div>
  )
}
