'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function getAdminOuGestor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, organization_id, cargo')
    .eq('id', user.id)
    .single()
  if (!perfil) redirect('/login')
  if (perfil.cargo !== 'admin' && perfil.cargo !== 'gestor') {
    throw new Error('Sem permissão.')
  }
  return { supabase, perfil }
}

export async function criarHub(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = formData.get('nome') as string
  if (!nome?.trim()) throw new Error('Nome é obrigatório.')

  const { error } = await supabase.from('health_hubs').insert({
    organization_id: perfil.organization_id,
    nome: nome.trim(),
    status: 'ativo',
  })

  if (error) {
    if (error.code === '23505') {
      throw new Error('Já existe um hub com este nome.')
    }
    throw new Error(`Erro ao criar hub: ${error.message}`)
  }
  revalidatePath('/configuracoes/hubs-de-saude')
}

export async function editarHub(id: string, formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = formData.get('nome') as string
  const status = formData.get('status') as string

  if (!nome?.trim()) throw new Error('Nome é obrigatório.')

  // Verificar se hub existe e pertence à organização
  const { data: hubExistente } = await supabase
    .from('health_hubs')
    .select('id')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!hubExistente) throw new Error('Hub não encontrado.')

  const { error } = await supabase
    .from('health_hubs')
    .update({
      nome: nome.trim(),
      status: status || 'ativo',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)

  if (error) {
    if (error.code === '23505') {
      throw new Error('Já existe um hub com este nome.')
    }
    throw new Error(`Erro ao editar hub: ${error.message}`)
  }
  revalidatePath('/configuracoes/hubs-de-saude')
}

export async function excluirHub(id: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  // Verificar se hub existe e pertence à organização
  const { data: hub } = await supabase
    .from('health_hubs')
    .select('id, nome')
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)
    .single()

  if (!hub) throw new Error('Hub não encontrado.')

  // Verificar se há fornecedores vinculados
  const { count } = await supabase
    .from('suppliers')
    .select('id', { count: 'exact', head: true })
    .eq('hub_id', id)
    .eq('organization_id', perfil.organization_id)

  if (count && count > 0) {
    throw new Error(`Não é possível excluir: ${count} fornecedor(es) vinculado(s) a este hub. Remova o vínculo primeiro.`)
  }

  const { error } = await supabase
    .from('health_hubs')
    .delete()
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir hub: ${error.message}`)
  revalidatePath('/configuracoes/hubs-de-saude')
}
