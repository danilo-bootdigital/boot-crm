'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ModalNovoProduto } from './modal-novo-produto'
import { alternarAtivoProduto } from '@/app/(dashboard)/configuracoes/produtos/actions'
import { formatarMoeda } from '@/lib/utils'
import type { Product } from '@/types/database'

type Props = {
  produtos: Product[]
  fornecedores: { id: string; nome: string }[]
  categorias: { id: string; nome: string; supplier_id: string }[]
}

export function TabelaProdutos({ produtos, fornecedores, categorias }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleAlternarAtivo(id: string, ativoAtual: boolean) {
    startTransition(async () => {
      try {
        await alternarAtivoProduto(id, !ativoAtual)
        router.refresh()
      } catch {
        toast.error('Erro ao alterar status do produto.')
      }
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 font-medium text-slate-600">Descrição</th>
            <th className="px-4 py-3 font-medium text-slate-600">Preço</th>
            <th className="px-4 py-3 font-medium text-slate-600">Unidade</th>
            <th className="px-4 py-3 font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 font-medium text-slate-600">Ações</th>
          </tr>
        </thead>
        <tbody>
          {produtos.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                Nenhum produto cadastrado.
              </td>
            </tr>
          )}
          {produtos.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium text-slate-900">{p.nome}</td>
              <td className="px-4 py-3 text-slate-600">{p.descricao ?? '—'}</td>
              <td className="px-4 py-3 text-slate-700">{formatarMoeda(p.preco_unitario)}</td>
              <td className="px-4 py-3 text-slate-600">{p.unidade}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <ModalNovoProduto produto={p} fornecedores={fornecedores} categorias={categorias} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleAlternarAtivo(p.id, p.ativo)}
                    disabled={isPending}
                  >
                    {p.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
