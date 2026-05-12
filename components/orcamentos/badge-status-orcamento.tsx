import type { QuoteStatus } from '@/types/database'

const CONFIG: Record<QuoteStatus, { label: string; classe: string }> = {
  rascunho: { label: 'Rascunho', classe: 'bg-slate-100 text-slate-600' },
  aguardando_aprovacao_interna: { label: 'Aguardando aprovação', classe: 'bg-amber-100 text-amber-700' },
  aprovado_internamente: { label: 'Aprovado internamente', classe: 'bg-blue-100 text-blue-700' },
  rejeitado_internamente: { label: 'Rejeitado', classe: 'bg-red-100 text-red-700' },
  enviado_ao_cliente: { label: 'Enviado ao cliente', classe: 'bg-purple-100 text-purple-700' },
  aprovado_pelo_cliente: { label: 'Aprovado pelo cliente', classe: 'bg-green-100 text-green-700' },
  recusado_pelo_cliente: { label: 'Recusado pelo cliente', classe: 'bg-red-100 text-red-600' },
}

export function BadgeStatusOrcamento({ status }: { status: QuoteStatus }) {
  const { label, classe } = CONFIG[status] ?? { label: status, classe: 'bg-slate-100 text-slate-600' }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${classe}`}>
      {label}
    </span>
  )
}
