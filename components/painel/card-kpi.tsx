import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  valor: string | number
  icone: LucideIcon
  descricao?: string
}

export function CardKPI({ label, valor, icone: Icone, descricao }: Props) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <Icone className="h-5 w-5 text-slate-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{valor}</p>
          {descricao && <p className="text-xs text-slate-400">{descricao}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
