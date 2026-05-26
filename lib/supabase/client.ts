'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // O Supabase SSR injeta automaticamente as variáveis de ambiente no navegador
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
