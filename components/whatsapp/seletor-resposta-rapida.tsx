'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Zap, X, Search } from 'lucide-react'
import { listarTemplates } from '@/app/(dashboard)/whatsapp/actions-conversa'

type Template = {
  id: string
  nome: string
  conteudo: string
  categoria: string | null
}

type Variaveis = {
  nome?: string
  vendedor?: string
  empresa?: string
  telefone?: string
}

type Props = {
  variaveis: Variaveis
  onSelecionar: (texto: string) => void
}

function substituirVariaveis(conteudo: string, variaveis: Variaveis): string {
  return conteudo
    .replace(/\{\{nome\}\}/gi, variaveis.nome || '{{nome}}')
    .replace(/\{\{vendedor\}\}/gi, variaveis.vendedor || '{{vendedor}}')
    .replace(/\{\{empresa\}\}/gi, variaveis.empresa || '{{empresa}}')
    .replace(/\{\{telefone\}\}/gi, variaveis.telefone || '{{telefone}}')
}

export function SeletorRespostaRapida({ variaveis, onSelecionar }: Props) {
  const [aberto, setAberto] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    setCarregando(true)
    listarTemplates()
      .then((data) => setTemplates(data))
      .finally(() => setCarregando(false))
  }, [aberto])

  function handleSelecionar(template: Template) {
    const texto = substituirVariaveis(template.conteudo, variaveis)
    onSelecionar(texto)
    setAberto(false)
    setBusca('')
  }

  const filtrados = templates.filter((t) => {
    if (!busca) return true
    const termo = busca.toLowerCase()
    return t.nome.toLowerCase().includes(termo) || t.conteudo.toLowerCase().includes(termo) || (t.categoria?.toLowerCase().includes(termo) ?? false)
  })

  const categorias = [...new Set(filtrados.map((t) => t.categoria || 'Sem categoria'))]

  if (!aberto) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setAberto(true)}
        title="Respostas rápidas"
      >
        <Zap className="h-4 w-4 text-amber-500" />
      </Button>
    )
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border bg-white shadow-lg z-10 max-h-80 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Search className="h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar modelo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 text-sm outline-none placeholder:text-slate-400"
          autoFocus
        />
        <button onClick={() => { setAberto(false); setBusca('') }} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-2">
        {carregando ? (
          <p className="text-center text-xs text-slate-400 py-4">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-4">Nenhum modelo encontrado.</p>
        ) : (
          categorias.map((cat) => (
            <div key={cat} className="mb-2">
              <p className="text-[12px] font-medium text-slate-400 uppercase px-2 mb-1">{cat}</p>
              {filtrados.filter((t) => (t.categoria || 'Sem categoria') === cat).map((t) => {
                const preview = substituirVariaveis(t.conteudo, variaveis)
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelecionar(t)}
                    className="w-full text-left rounded-md px-2 py-1.5 hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-xs font-medium text-slate-700">{t.nome}</p>
                    <p className="text-[11px] text-slate-500 truncate">{preview}</p>
                  </button>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Dica de variáveis */}
      <div className="border-t px-3 py-1.5">
        <p className="text-[12px] text-slate-400">
          Variáveis: {'{{nome}}'} {'{{vendedor}}'} {'{{empresa}}'} {'{{telefone}}'}
        </p>
      </div>
    </div>
  )
}
