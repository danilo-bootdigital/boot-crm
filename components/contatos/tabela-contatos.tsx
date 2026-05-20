'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Trash2, Search } from 'lucide-react'
import { excluirContatosEmLote } from '@/app/(dashboard)/contatos/actions'
import type { Contact, Company } from '@/types/database'

type ContatoComEmpresa = Contact & { empresa: Pick<Company, 'id' | 'nome'> | null }

type Props = {
  contatos: ContatoComEmpresa[]
  isAdmin: boolean
}

export function TabelaContatos({ contatos, isAdmin }: Props) {
  const router = useRouter()
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [busca, setBusca] = useState('')

  const contatosFiltrados = useMemo(() => {
    if (!busca.trim()) return contatos
    const termo = busca.toLowerCase().trim()
    return contatos.filter((c) =>
      c.nome.toLowerCase().includes(termo) ||
      c.cpf_cnpj?.toLowerCase().includes(termo) ||
      c.telefone?.toLowerCase().includes(termo)
    )
  }, [contatos, busca])

  const todosSelecionados = contatosFiltrados.length > 0 && selecionados.size === contatosFiltrados.length

  function toggleTodos() {
    if (todosSelecionados) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(contatosFiltrados.map((c) => c.id)))
    }
  }

  function toggleContato(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const novo = new Set(selecionados)
    if (novo.has(id)) novo.delete(id)
    else novo.add(id)
    setSelecionados(novo)
  }

  function handleExcluirSelecionados() {
    if (selecionados.size === 0) return
    startTransition(async () => {
      try {
        await excluirContatosEmLote(Array.from(selecionados))
        toast.success(`${selecionados.size} contato(s) excluído(s).`)
        setSelecionados(new Set())
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
      }
    })
  }

  function handleExcluirTodos() {
    const ids = contatos.map((c) => c.id)
    if (ids.length === 0) return
    startTransition(async () => {
      try {
        await excluirContatosEmLote(ids)
        toast.success(`${ids.length} contato(s) excluído(s).`)
        setSelecionados(new Set())
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isAdmin && (selecionados.size > 0 || contatosFiltrados.length > 0) && (
        <div className="flex items-center gap-3">
          {selecionados.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={handleExcluirSelecionados}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
              Excluir {selecionados.size} selecionado(s)
            </Button>
          )}
          {contatos.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-600 hover:text-red-700"
              onClick={handleExcluirTodos}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
              Excluir todos ({contatos.length})
            </Button>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              {isAdmin && (
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={todosSelecionados}
                    onChange={toggleTodos}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
              )}
              <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="px-4 py-3 font-medium text-slate-600">Empresa</th>
              <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
              <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
              <th className="px-4 py-3 font-medium text-slate-600">Cargo</th>
              <th className="px-4 py-3 font-medium text-slate-600">Cadastrado em</th>
            </tr>
          </thead>
          <tbody>
            {contatosFiltrados.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-slate-400">
                  Nenhum contato encontrado.
                </td>
              </tr>
            )}
            {contatosFiltrados.map((contato) => (
              <tr
                key={contato.id}
                className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
                onClick={() => router.push(`/contatos/${contato.id}`)}
              >
                {isAdmin && (
                  <td className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selecionados.has(contato.id)}
                      onChange={() => {}}
                      onClick={(e) => toggleContato(contato.id, e)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                )}
                <td className="px-4 py-3 font-medium text-slate-900">{contato.nome}</td>
                <td className="px-4 py-3 text-slate-600">{contato.empresa?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{contato.telefone ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{contato.email ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{contato.cargo ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {format(new Date(contato.criado_em), 'dd/MM/yyyy', { locale: ptBR })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
