'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adicionarInstancia } from '@/app/(dashboard)/configuracoes/whatsapp/actions'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('id, organization_id, cargo')
      .eq('id', user.id)
      .single()

    if (!perfil || perfil.cargo !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { data: instancias, error } = await supabase
      .from('whatsapp_instances')
      .select(`
        id,
        nome,
        numero,
        status_conexao,
        compartilhado,
        vendedor_id,
        vendedor:vendedor_id (nome)
      `)
      .eq('organization_id', perfil.organization_id)
      .order('nome')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ instancias: instancias || [] })
  } catch (error) {
    console.error('Erro ao listar instâncias:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 400 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    await adicionarInstancia(formData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao criar instância:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 400 }
    )
  }
}