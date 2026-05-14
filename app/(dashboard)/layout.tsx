import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  let logoUrl: string | null = null
  if (perfil) {
    const { data: org } = await supabase
      .from('organizations')
      .select('logo_url')
      .eq('id', perfil.organization_id)
      .single()
    logoUrl = org?.logo_url ?? null
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar logoUrl={logoUrl} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header logoUrl={logoUrl} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
