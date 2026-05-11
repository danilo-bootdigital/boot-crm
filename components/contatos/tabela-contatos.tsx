'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Contact, Company } from '@/types/database'

type ContatoComEmpresa = Contact & { empresa: Pick<Company, 'id' | 'nome'> | null }

export function TabelaContatos({ contatos }: { contatos: ContatoComEmpresa[] }) {
  const router = useRouter()

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
            <th className="px-4 py-3 font-medium text-slate-600">Empresa</th>
            <th className="px-4 py-3 font-medium text-slate-600">Telefone</th>
            <th className="px-4 py-3 font-medium text-slate-600">E-mail</th>
            <th className="px-4 py-3 font-medium text-slate-600">Cargo</th>
            <th className="px-4 py-3 font-medium text-slate-600">Cadastrado em</th>
          </tr>
        </thead>
        <tbody>
          {contatos.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                Nenhum contato encontrado.
              </td>
            </tr>
          )}
          {contatos.map((contato) => (
            <tr
              key={contato.id}
              className="border-b last:border-0 hover:bg-slate-50 cursor-pointer"
              onClick={() => router.push(`/contatos/${contato.id}`)}
            >
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
  )
}
