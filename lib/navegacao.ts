import {
  LayoutDashboard, Users, TrendingUp, UserCheck,
  Briefcase, MessageCircle, Inbox, CheckSquare, FileText,
  BarChart2, Settings, type LucideIcon
} from 'lucide-react'

export type ItemNavegacao = {
  label: string
  href: string
  icone: LucideIcon
}

export const navegacao: ItemNavegacao[] = [
  { label: 'Painel Principal', href: '/painel', icone: LayoutDashboard },
  { label: 'Caixa de Entrada', href: '/caixa-de-entrada', icone: Inbox },
  { label: 'Leads', href: '/leads', icone: Users },
  { label: 'Pipeline de Vendas', href: '/pipeline', icone: TrendingUp },
  { label: 'Contatos', href: '/contatos', icone: UserCheck },
  { label: 'Negociações', href: '/negociacoes', icone: Briefcase },
  { label: 'WhatsApp', href: '/whatsapp', icone: MessageCircle },
  { label: 'Tarefas', href: '/tarefas', icone: CheckSquare },
  { label: 'Orçamentos', href: '/orcamentos', icone: FileText },
  { label: 'Relatórios', href: '/relatorios', icone: BarChart2 },
  { label: 'Configurações', href: '/configuracoes', icone: Settings },
]
