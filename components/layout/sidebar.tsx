'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navegacao } from '@/lib/navegacao'

type Props = {
  logoUrl?: string | null
}

export function Sidebar({ logoUrl }: Props) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
        ) : (
          <span className="text-xl font-bold text-slate-900">BOOT CRM</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navegacao.map((item) => {
            const Icone = item.icone
            const ativo = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    ativo
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icone className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
