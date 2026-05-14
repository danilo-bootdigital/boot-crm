'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Search, X } from 'lucide-react'
import type { Product } from '@/types/database'

type Props = {
  produtos: Product[]
  value: string | null
  onSelect: (produtoId: string | null) => void
}

export function BuscaProduto({ produtos, value, onSelect }: Props) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const produtoSelecionado = value ? produtos.find(p => p.id === value) : null

  const filtrados = busca.trim()
    ? produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 10)
    : produtos.slice(0, 10)

  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  function handleSelect(produtoId: string) {
    onSelect(produtoId)
    setBusca('')
    setAberto(false)
  }

  function handleLimpar() {
    onSelect(null)
    setBusca('')
  }

  if (produtoSelecionado) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-lg border bg-slate-50 px-3">
        <span className="flex-1 text-sm text-slate-900 truncate">{produtoSelecionado.nome}</span>
        <button type="button" onClick={handleLimpar} className="text-slate-400 hover:text-slate-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          className="h-9 text-sm pl-8"
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setAberto(true)
          }}
          onFocus={() => setAberto(true)}
        />
      </div>
      {aberto && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto">
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
            onClick={() => { onSelect(null); setAberto(false) }}
          >
            Descricao livre
          </button>
          {filtrados.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-400">Nenhum produto encontrado</div>
          )}
          {filtrados.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700 truncate"
              onClick={() => handleSelect(p.id)}
            >
              {p.nome}
              {p.preco_unitario > 0 && (
                <span className="ml-2 text-xs text-slate-400">
                  R$ {p.preco_unitario.toFixed(2)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
