import {
  LayoutDashboard, Users, TrendingUp, UserCheck,
  MessageCircle, CheckSquare,
  Settings, type LucideIcon
} from 'lucide-react'

export type ItemNavegacao = {
  label: string
  href: string
  icone: LucideIcon
}

export const navegacao: ItemNavegacao[] = [
  { label: 'Painel Principal', href: '/painel', icone: LayoutDashboard },
  { label: 'Leads', href: '/leads', icone: Users },
  { label: 'Pipeline de Vendas', href: '/pipeline', icone: TrendingUp },
  { label: 'Contatos', href: '/contatos', icone: UserCheck },
  { label: 'WhatsApp', href: '/whatsapp', icone: MessageCircle },
  { label: 'Tarefas', href: '/tarefas', icone: CheckSquare },
  { label: 'Configurações', href: '/configuracoes', icone: Settings },
]
