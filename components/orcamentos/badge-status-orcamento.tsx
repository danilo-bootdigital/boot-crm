import type { QuoteStatus } from '@/types/database'

const CONFIG: Record<QuoteStatus, { label: string; classe: string; descricao?: string }> = {
  rascunho: {
    label: 'Rascunho',
    classe: 'bg-slate-100 text-slate-600',
    descricao: 'Orçamento em elaboração'
  },
  aguardando_aprovacao_interna: {
    label: 'Aguardando aprovação',
    classe: 'bg-amber-100 text-amber-700',
    descricao: 'Em análise interna'
  },
  aguardando_confirmacao_vendedor: {
    label: 'Aguardando confirmação',
    classe: 'bg-orange-100 text-orange-700',
    descricao: 'Cliente aprovou, aguardando vendedor'
  },
  aprovado_internamente: {
    label: 'Aprovado internamente',
    classe: 'bg-blue-100 text-blue-700',
    descricao: 'Aprovado pela equipe'
  },
  rejeitado_internamente: {
    label: 'Rejeitado',
    classe: 'bg-red-100 text-red-700',
    descricao: 'Não aprovado internamente'
  },
  enviado_ao_cliente: {
    label: 'Enviado ao cliente',
    classe: 'bg-purple-100 text-purple-700',
    descricao: 'Aguardando aprovação do cliente'
  },
  aprovado_pelo_cliente: {
    label: 'Orçamento Aprovado',
    classe: 'bg-green-100 text-green-700',
    descricao: 'Cliente aprovou o orçamento'
  },
  recusado_pelo_cliente: {
    label: 'Recusado',
    classe: 'bg-red-100 text-red-600',
    descricao: 'Cliente não aceitou o orçamento'
  },
}

export function BadgeStatusOrcamento({ status }: { status: QuoteStatus }) {
  const config = CONFIG[status] ?? { label: status, classe: 'bg-slate-100 text-slate-600', descricao: status }
  return (
    <div className="flex flex-col">
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.classe}`}>
        {config.label}
      </span>
      {config.descricao && (
        <span className="text-xs text-slate-500 mt-1">{config.descricao}</span>
      )}
    </div>
  )
}
