'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  startOfMonth, endOfMonth, subMonths, startOfYear, subDays, format,
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, ChevronDown, X, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_OPCOES, STATUS_PADRAO } from '@/lib/relatorios/pedidos-por-fornecedor'

const ATALHOS = [
  { valor: 'hoje', label: 'Hoje' },
  { valor: '7', label: 'Últimos 7 dias' },
  { valor: '30', label: 'Últimos 30 dias' },
  { valor: 'mes_atual', label: 'Mês atual' },
  { valor: 'mes_anterior', label: 'Mês anterior' },
  { valor: 'ano_atual', label: 'Ano atual' },
  { valor: 'custom', label: 'Personalizado' },
]

function calcularAtalho(valor: string): { inicio: string; fim: string } | null {
  const hoje = new Date()
  const iso = (d: Date) => format(d, 'yyyy-MM-dd')
  switch (valor) {
    case 'hoje': return { inicio: iso(hoje), fim: iso(hoje) }
    case '7': return { inicio: iso(subDays(hoje, 6)), fim: iso(hoje) }
    case '30': return { inicio: iso(subDays(hoje, 29)), fim: iso(hoje) }
    case 'mes_atual': return { inicio: iso(startOfMonth(hoje)), fim: iso(hoje) }
    case 'mes_anterior': {
      const ref = subMonths(hoje, 1)
      return { inicio: iso(startOfMonth(ref)), fim: iso(endOfMonth(ref)) }
    }
    case 'ano_atual': return { inicio: iso(startOfYear(hoje)), fim: iso(hoje) }
    default: return null
  }
}

type Props = {
  fornecedores: { id: string; nome: string }[]
  responsaveis: { id: string; nome: string }[]
  mostrarResponsavel: boolean
}

export function FiltrosPedidosFornecedor({ fornecedores, responsaveis, mostrarResponsavel }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const atalhoInicial = searchParams.get('atalho') ?? '30'
  const datasIniciais = useMemo(() => {
    const dInicio = searchParams.get('inicio')
    const dFim = searchParams.get('fim')
    if (dInicio && dFim) return { inicio: dInicio, fim: dFim }
    return calcularAtalho(atalhoInicial) ?? calcularAtalho('30')!
  }, [searchParams, atalhoInicial])

  const [atalho, setAtalho] = useState(atalhoInicial)
  const [inicio, setInicio] = useState(datasIniciais.inicio)
  const [fim, setFim] = useState(datasIniciais.fim)
  const [fornecedor, setFornecedor] = useState(searchParams.get('fornecedor') ?? '')
  const [responsavel, setResponsavel] = useState(searchParams.get('responsavel') ?? '')
  const [status, setStatus] = useState<string[]>(() => {
    const raw = searchParams.get('status')
    if (!raw) return [...STATUS_PADRAO]
    return raw.split(',').filter(Boolean)
  })

  const dataInvalida = Boolean(inicio && fim && fim < inicio)
  const podeGerar = Boolean(inicio && fim) && !dataInvalida

  function selecionarAtalho(valor: string) {
    setAtalho(valor)
    const datas = calcularAtalho(valor)
    if (datas) {
      setInicio(datas.inicio)
      setFim(datas.fim)
    }
  }

  function toggleStatus(valor: string) {
    setStatus((prev) =>
      prev.includes(valor) ? prev.filter((s) => s !== valor) : [...prev, valor]
    )
  }

  function gerarRelatorio() {
    if (!podeGerar) return
    const params = new URLSearchParams()
    params.set('atalho', atalho)
    params.set('inicio', inicio)
    params.set('fim', fim)
    if (fornecedor) params.set('fornecedor', fornecedor)
    if (responsavel) params.set('responsavel', responsavel)
    // status: só grava se diferente do padrão (mantém URL limpa)
    const statusOrdenado = [...status].sort()
    const padraoOrdenado = [...STATUS_PADRAO].sort()
    if (JSON.stringify(statusOrdenado) !== JSON.stringify(padraoOrdenado)) {
      params.set('status', status.join(','))
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      {/* Fornecedor + Responsável */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[240px]">
          <Label className="mb-1.5 block text-xs text-slate-500">Fornecedor</Label>
          <ComboFornecedor
            fornecedores={fornecedores}
            valor={fornecedor}
            onChange={setFornecedor}
          />
        </div>

        {mostrarResponsavel && (
          <div className="min-w-[200px]">
            <Label className="mb-1.5 block text-xs text-slate-500">Responsável</Label>
            <select
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">Todos os responsáveis</option>
              {responsaveis.map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Atalhos de período */}
      <div>
        <Label className="mb-1.5 block text-xs text-slate-500">Período</Label>
        <div className="flex flex-wrap gap-1.5">
          {ATALHOS.map((a) => (
            <button
              key={a.valor}
              type="button"
              onClick={() => selecionarAtalho(a.valor)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                atalho === a.valor
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Datas */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="mb-1.5 block text-xs text-slate-500">Data inicial *</Label>
          <Input
            type="date"
            value={inicio}
            max={fim || undefined}
            onChange={(e) => { setInicio(e.target.value); setAtalho('custom') }}
            className="w-40"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-slate-500">Data final *</Label>
          <Input
            type="date"
            value={fim}
            min={inicio || undefined}
            onChange={(e) => { setFim(e.target.value); setAtalho('custom') }}
            className="w-40"
          />
        </div>
        {dataInvalida && (
          <p className="pb-2 text-xs text-red-600">A data final não pode ser anterior à inicial.</p>
        )}
      </div>

      {/* Status */}
      <div>
        <Label className="mb-1.5 block text-xs text-slate-500">Status do pedido</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatus(status.length === STATUS_OPCOES.length ? [...STATUS_PADRAO] : STATUS_OPCOES.map((s) => s.valor))}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              status.length === STATUS_OPCOES.length
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            Todos os status
          </button>
          {STATUS_OPCOES.map((s) => (
            <button
              key={s.valor}
              type="button"
              onClick={() => toggleStatus(s.valor)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                status.includes(s.valor)
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ação */}
      <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
        <Button onClick={gerarRelatorio} disabled={!podeGerar} className="gap-1.5">
          <BarChart3 className="h-4 w-4" />
          Gerar relatório
        </Button>
        {status.length === 0 && (
          <span className="text-xs text-amber-600">Selecione ao menos um status.</span>
        )}
      </div>
    </div>
  )
}

/** Combobox de fornecedor com busca por nome + opção "Todos os fornecedores". */
function ComboFornecedor({
  fornecedores, valor, onChange,
}: {
  fornecedores: { id: string; nome: string }[]
  valor: string
  onChange: (id: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora (em vez de onBlur, que fechava ao focar o input de busca)
  useEffect(() => {
    if (!aberto) return
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false)
        setBusca('')
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [aberto])

  const selecionado = fornecedores.find((f) => f.id === valor)
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return fornecedores
    return fornecedores.filter((f) => f.nome.toLowerCase().includes(q))
  }, [busca, fornecedores])

  function selecionar(id: string) {
    onChange(id)
    setAberto(false)
    setBusca('')
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm"
      >
        <span className={cn('truncate', !selecionado && 'text-slate-500')}>
          {selecionado ? selecionado.nome : 'Todos os fornecedores'}
        </span>
        {selecionado ? (
          <X
            className="h-3.5 w-3.5 shrink-0 text-slate-400 hover:text-slate-600"
            onClick={(e) => { e.stopPropagation(); selecionar('') }}
          />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {aberto && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar fornecedor..."
              className="h-8 w-full rounded border border-slate-200 pl-7 pr-2 text-sm outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selecionar('') }}
              className="block w-full px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50"
            >
              Todos os fornecedores
            </button>
            {filtrados.map((f) => (
              <button
                key={f.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selecionar(f.id) }}
                className={cn(
                  'block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-slate-50',
                  f.id === valor ? 'font-medium text-blue-700' : 'text-slate-700'
                )}
              >
                {f.nome}
              </button>
            ))}
            {filtrados.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400">Nenhum fornecedor encontrado.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
