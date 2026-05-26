import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/login'
  const isPainelRoute = request.nextUrl.pathname.startsWith('/painel')
  const isWebhookRoute = request.nextUrl.pathname.startsWith('/api/webhook')
  const isOrcamentoPublico = request.nextUrl.pathname.startsWith('/orcamento/')
  const isStaticAsset = request.nextUrl.pathname.startsWith('/_next') ||
                       request.nextUrl.pathname.startsWith('/favicon.ico') ||
                       request.nextUrl.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)

  try {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Rotas públicas que não requerem verificação
    if (isStaticAsset || isWebhookRoute || isOrcamentoPublico) {
      return supabaseResponse
    }

    // Usuário autenticado tentando acessar login - redirecionar para painel
    if (user && isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/painel'
      return NextResponse.redirect(url)
    }

    // Usuário não autenticado tentando acessar rotas protegidas
    if (!user && !isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}