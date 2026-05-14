import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  em_producao: { label: 'Em Produção', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  pronto: { label: 'Pronto', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  enviado: { label: 'Enviado', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  entregue: { label: 'Entregue', className: 'bg-teal-100 text-teal-800 border-teal-200' },
  concluido: { label: 'Concluído', className: 'bg-green-100 text-green-800 border-green-200' },
  cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800 border-red-200' },
}

export function BadgeStatusPedido({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-800 border-slate-200' }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}
