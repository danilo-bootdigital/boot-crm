'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // O Supabase SSR injeta automaticamente as variáveis de ambiente no navegador
  // Não precisamos acessar process.env diretamente
  return createBrowserClient(
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL!,
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
