import { createClient } from '@/lib/supabase/server'
import { TabelaContatos } from '@/components/contatos/tabela-contatos'
import { ModalNovoContato } from '@/components/contatos/modal-novo-contato'
import type { Contact, Company } from '@/types/database'

type ContatoComEmpresa = Contact & { empresa: Pick<Company, 'id' | 'nome'> | null }

export default async function ContatosPage() {
  const supabase = await createClient()

  const { data: contatos } = await supabase
    .from('contacts')
    .select('*, empresa:companies!empresa_id(id, nome)')
    .order('nome') as { data: ContatoComEmpresa[] | null }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contatos</h1>
          <p className="mt-1 text-sm text-slate-500">
            Contatos qualificados vinculados a negociações.
          </p>
        </div>
        <ModalNovoContato />
      </div>

      <TabelaContatos contatos={contatos ?? []} />
    </div>
  )
}
