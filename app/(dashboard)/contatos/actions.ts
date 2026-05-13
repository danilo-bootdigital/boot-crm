'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getUsuarioEOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  return { supabase, user, perfil }
}

async function resolverEmpresa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organization_id: string,
  empresa_nome: string | null
): Promise<string | null> {
  if (!empresa_nome) return null

  const { data: existente } = await supabase
    .from('companies')
    .select('id')
    .eq('organization_id', organization_id)
    .ilike('nome', empresa_nome)
    .single()

  if (existente) return existente.id

  const { data: nova, error } = await supabase
    .from('companies')
    .insert({ organization_id, nome: empresa_nome })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar empresa: ${error.message}`)
  return nova.id
}

export async function criarContato(formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const nome = formData.get('nome') as string
  if (!nome?.trim()) throw new Error('O nome do contato é obrigatório.')
  const email = formData.get('email') as string | null
  const telefone = formData.get('telefone') as string | null
  const cargo = formData.get('cargo') as string | null
  const empresa_nome = formData.get('empresa_nome') as string | null
  const observacoes = formData.get('observacoes') as string | null

  const empresa_id = await resolverEmpresa(supabase, perfil.organization_id, empresa_nome)

  const { data: contato, error } = await supabase
    .from('contacts')
    .insert({
      organization_id: perfil.organization_id,
      nome,
      email: email || null,
      telefone: telefone || null,
      cargo: cargo || null,
      empresa_id,
      responsavel_id: perfil.id,
      observacoes: observacoes || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar contato: ${error.message}`)

  await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'contato_criado',
    descricao: `Contato "${nome}" criado.`,
    contato_id: contato.id,
  })

  revalidatePath('/contatos')
  redirect(`/contatos/${contato.id}`)
}

export async function editarContato(contatoId: string, formData: FormData) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const nome = formData.get('nome') as string
  if (!nome?.trim()) throw new Error('O nome do contato é obrigatório.')
  const email = formData.get('email') as string | null
  const telefone = formData.get('telefone') as string | null
  const cargo = formData.get('cargo') as string | null
  const empresa_nome = formData.get('empresa_nome') as string | null
  const observacoes = formData.get('observacoes') as string | null

  const empresa_id = await resolverEmpresa(supabase, perfil.organization_id, empresa_nome)

  const { error } = await supabase
    .from('contacts')
    .update({
      nome,
      email: email || null,
      telefone: telefone || null,
      cargo: cargo || null,
      empresa_id,
      observacoes: observacoes || null,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', contatoId).eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao editar contato: ${error.message}`)

  revalidatePath('/contatos')
  revalidatePath(`/contatos/${contatoId}`)
}

export async function adicionarObservacaoContato(contatoId: string, texto: string) {
  const { supabase, perfil } = await getUsuarioEOrg()

  const { data: contatoExiste } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', contatoId)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!contatoExiste) throw new Error('Contato não encontrado.')

  const { error: errAtividade } = await supabase.from('activities').insert({
    organization_id: perfil.organization_id,
    autor_id: perfil.id,
    tipo: 'observacao',
    descricao: texto,
    contato_id: contatoId,
  })
  if (errAtividade) throw new Error(`Erro ao registrar observação: ${errAtividade.message}`)

  revalidatePath(`/contatos/${contatoId}`)
}

type ContatoImportado = {
  nome: string
  telefone: string | null
  email: string | null
  observacoes: string | null
}

export async function importarContatos(contatos: ContatoImportado[]) {
  const { supabase, perfil } = await getUsuarioEOrg()

  if (!contatos || contatos.length === 0) {
    throw new Error('Nenhum contato para importar.')
  }

  if (contatos.length > 5000) {
    throw new Error('Máximo de 5000 contatos por importação.')
  }

  // Validar que todos têm nome
  const validos = contatos.filter((c) => c.nome?.trim())
  if (validos.length === 0) {
    throw new Error('Nenhum contato válido encontrado (nome é obrigatório).')
  }

  // Inserir em lotes de 500
  const BATCH_SIZE = 500
  let importados = 0

  for (let i = 0; i < validos.length; i += BATCH_SIZE) {
    const lote = validos.slice(i, i + BATCH_SIZE).map((c) => ({
      organization_id: perfil.organization_id,
      nome: c.nome.trim(),
      telefone: c.telefone?.trim() || null,
      email: c.email?.trim() || null,
      observacoes: c.observacoes || null,
    }))

    const { error } = await supabase.from('contacts').insert(lote)
    if (error) throw new Error(`Erro ao importar lote: ${error.message}`)
    importados += lote.length
  }

  revalidatePath('/contatos')
  return { importados }
}
