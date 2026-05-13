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

export async function criarFornecedor(formData: FormData) {
  const { supabase, perfil } = await getAdminOuGestor()

  const nome = formData.get('nome') as string
  if (!nome?.trim()) throw new Error('Nome é obrigatório.')

  const { error } = await supabase.from('suppliers').insert({
    organization_id: perfil.organization_id,
    nome: nome.trim(),
    cnpj: (formData.get('cnpj') as string)?.trim() || null,
    telefone: (formData.get('telefone') as string)?.trim() || null,
    email: (formData.get('email') as string)?.trim() || null,
  })

  if (error) throw new Error(`Erro ao criar fornecedor: ${error.message}`)
  revalidatePath('/configuracoes/fornecedores')
}

export async function excluirFornecedor(id: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  // Verificar se há produtos vinculados
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', id)
    .eq('organization_id', perfil.organization_id)

  if (count && count > 0) {
    throw new Error(`Não é possível excluir: ${count} produto(s) vinculado(s).`)
  }

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir: ${error.message}`)
  revalidatePath('/configuracoes/fornecedores')
}

type ProdutoImportado = {
  fornecedor: string
  nome: string
  descricao: string | null
  preco_unitario: number
  unidade: string
}

export async function importarProdutosComFornecedor(produtos: ProdutoImportado[]) {
  const { supabase, perfil } = await getAdminOuGestor()

  if (!produtos || produtos.length === 0) throw new Error('Nenhum produto para importar.')
  if (produtos.length > 5000) throw new Error('Máximo de 5000 produtos por importação.')

  // Agrupar por fornecedor
  const fornecedoresUnicos = [...new Set(produtos.map((p) => p.fornecedor.trim()))]

  // Buscar fornecedores existentes
  const { data: existentes } = await supabase
    .from('suppliers')
    .select('id, nome')
    .eq('organization_id', perfil.organization_id)

  const fornecedorMap = new Map<string, string>()
  ;(existentes ?? []).forEach((f) => fornecedorMap.set(f.nome.toLowerCase(), f.id))

  // Criar fornecedores que não existem
  for (const nome of fornecedoresUnicos) {
    if (!fornecedorMap.has(nome.toLowerCase())) {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ organization_id: perfil.organization_id, nome })
        .select('id')
        .single()
      if (error) throw new Error(`Erro ao criar fornecedor "${nome}": ${error.message}`)
      fornecedorMap.set(nome.toLowerCase(), data.id)
    }
  }

  // Inserir produtos em lotes
  const BATCH_SIZE = 500
  let importados = 0

  for (let i = 0; i < produtos.length; i += BATCH_SIZE) {
    const lote = produtos.slice(i, i + BATCH_SIZE).map((p) => ({
      organization_id: perfil.organization_id,
      supplier_id: fornecedorMap.get(p.fornecedor.trim().toLowerCase()) ?? null,
      nome: p.nome.trim(),
      descricao: p.descricao || null,
      preco_unitario: p.preco_unitario,
      unidade: p.unidade || 'un',
      ativo: true,
    }))

    const { error } = await supabase.from('products').insert(lote)
    if (error) throw new Error(`Erro ao importar lote: ${error.message}`)
    importados += lote.length
  }

  revalidatePath('/configuracoes/produtos')
  revalidatePath('/configuracoes/fornecedores')
  return { importados, fornecedoresCriados: fornecedoresUnicos.length }
}

// --- Categorias ---

export async function criarCategoria(fornecedorId: string, nome: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  if (!nome?.trim()) throw new Error('Nome da categoria é obrigatório.')

  const { error } = await supabase.from('supplier_categories').insert({
    organization_id: perfil.organization_id,
    supplier_id: fornecedorId,
    nome: nome.trim(),
  })

  if (error) throw new Error(`Erro ao criar categoria: ${error.message}`)
  revalidatePath(`/configuracoes/fornecedores/${fornecedorId}`)
}

export async function excluirCategoria(categoriaId: string, fornecedorId: string) {
  const { supabase, perfil } = await getAdminOuGestor()

  // Verificar se há produtos vinculados
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoriaId)

  if (count && count > 0) {
    throw new Error(`Não é possível excluir: ${count} produto(s) vinculado(s) a esta categoria.`)
  }

  const { error } = await supabase
    .from('supplier_categories')
    .delete()
    .eq('id', categoriaId)
    .eq('organization_id', perfil.organization_id)

  if (error) throw new Error(`Erro ao excluir: ${error.message}`)
  revalidatePath(`/configuracoes/fornecedores/${fornecedorId}`)
}

// Importar produtos para um fornecedor + categoria específica
type ProdutoImportadoCategoria = {
  nome: string
  descricao: string | null
  preco_unitario: number
  unidade: string
}

export async function importarProdutosParaCategoria(
  fornecedorId: string,
  categoriaId: string,
  produtos: ProdutoImportadoCategoria[]
) {
  const { supabase, perfil } = await getAdminOuGestor()

  if (!produtos || produtos.length === 0) throw new Error('Nenhum produto para importar.')
  if (produtos.length > 5000) throw new Error('Máximo de 5000 produtos por importação.')

  const BATCH_SIZE = 500
  let importados = 0

  for (let i = 0; i < produtos.length; i += BATCH_SIZE) {
    const lote = produtos.slice(i, i + BATCH_SIZE).map((p) => ({
      organization_id: perfil.organization_id,
      supplier_id: fornecedorId,
      category_id: categoriaId,
      nome: p.nome.trim(),
      descricao: p.descricao || null,
      preco_unitario: p.preco_unitario,
      unidade: p.unidade || 'un',
      ativo: true,
    }))

    const { error } = await supabase.from('products').insert(lote)
    if (error) throw new Error(`Erro ao importar lote: ${error.message}`)
    importados += lote.length
  }

  revalidatePath(`/configuracoes/fornecedores/${fornecedorId}`)
  revalidatePath('/configuracoes/produtos')
  return { importados }
}
