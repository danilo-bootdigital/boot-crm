import { createClient } from '@/lib/supabase/server'
import { BadgePerfil } from '@/components/usuarios/badge-perfil'
import { SidebarMobile } from '@/components/layout/sidebar-mobile'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BotaoSair } from '@/components/layout/botao-sair'
import type { UserRole } from '@/types/database'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, cargo')
    .eq('id', user?.id ?? '')
    .single()

  const iniciais = profile?.nome
    ?.split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() ?? '?'

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
      {/* Botão hambúrguer — só renderiza em mobile via SidebarMobile */}
      <SidebarMobile />

      <div className="flex items-center gap-3 md:gap-4">
        {profile?.cargo && (
          <span className="hidden sm:block">
            <BadgePerfil perfil={profile.cargo as UserRole} />
          </span>
        )}
        <div className="flex items-center gap-2 md:gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-slate-200 text-slate-700 text-xs">
              {iniciais}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-sm font-medium text-slate-700">
            {profile?.nome ?? user?.email}
          </span>
        </div>
        <BotaoSair />
      </div>
    </header>
  )
}
