'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { excluirFornecedor } from '@/app/(dashboard)/configuracoes/fornecedores/actions'
import type { Supplier } from '@/types/database'

export function TabelaFornecedores({ fornecedores }: { fornecedores: Supplier[] }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleExcluir(id: string) {
    startTransition(async () => {
      try {
        await excluirFornecedor(id)
        toast.success('Fornecedor excluído.')
        router.refresh()
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.')
      }
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 font-medium text-slate-600">CNPJ</th>
            <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
            <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
            <th className="px-4 py-3 w-16"></th>
          </tr>
        </thead>
        <tbody>
          {fornecedores.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                Nenhum fornecedor cadastrado.
              </td>
            </tr>
          )}
          {fornecedores.map((f) => (
            <tr key={f.id} className="border-b last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{f.nome}</td>
              <td className="px-4 py-3 text-slate-600">{f.cnpj ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{f.telefone ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600">{f.email ?? '—'}</td>
              <td className="px-4 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-700"
                  onClick={() => handleExcluir(f.id)}
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
  )
}
