'use server'

import { NextResponse } from 'next/server'
import { fetchVendedores } from '@/app/(dashboard)/configuracoes/whatsapp/actions'

export async function GET() {
  try {
    const vendedores = await fetchVendedores()
    return NextResponse.json({ vendedores })
  } catch (error) {
    console.error('Erro ao buscar vendedores:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 400 }
    )
  }
}