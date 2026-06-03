'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { QrCode, Trash2, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { excluirInstanciaSegura } from '@/app/(dashboard)/configuracoes/whatsapp/actions-seguras'
import { ModalExcluirInstancia } from './modal-excluir-instancia'
import { QrCodeDialog } from './qr-code-dialog'

type WhatsappStatus = 'conectado' | 'desconectado' | 'aguardando_qr' | 'inativa'

type Props = {
  instancia: {
    id: string
    nome: string
    numero: string | null
    status_conexao: WhatsappStatus
    compartilhado: boolean
    vendedor: { nome: string } | null
  }
}

const STATUS_CONFIG: Record<WhatsappStatus, { label: string; cor: string; icone: React.ReactNode }> = {
  conectado: { label: 'Conectado', cor: 'text-green-600 bg-green-50', icone: <Wifi className="h-3.5 w-3.5" /> },
  desconectado: { label: 'Desconectado', cor: 'text-slate-500 bg-slate-100', icone: <WifiOff className="h-3.5 w-3.5" /> },
  aguardando_qr: { label: 'Aguardando QR', cor: 'text-amber-600 bg-amber-50', icone: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  inativa: { label: 'Inativa', cor: 'text-gray-500 bg-gray-100', icone: <WifiOff className="h-3.5 w-3.5" /> },
}

export function CardInstancia({ instancia }: Props) {
  const router = useRouter()
  const [qrAberto, setQrAberto] = useState(false)
  const [excluirAberto, setExcluirAberto] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const status = STATUS_CONFIG[instancia.status_conexao]

  async function handleExcluir() {
    setExcluirAberto(true)
  }

  async function handleConfirmarExclusao() {
    setExcluindo(true)
    try {
      await excluirInstanciaSegura(instancia.id)
      router.refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir instância.')
      setExcluindo(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border bg-white p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-900">{instancia.nome}</p>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', status.cor)}>
              {status.icone}
              {status.label}
            </span>
          </div>
          {instancia.numero && <p className="text-sm text-slate-500">{instancia.numero}</p>}
          <p className="text-xs text-slate-400">
            {instancia.compartilhado ? 'Compartilhado pela equipe' : `Vendedor: ${instancia.vendedor?.nome ?? '—'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {instancia.status_conexao !== 'conectado' && instancia.status_conexao !== 'inativa' && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQrAberto(true)}>
              <QrCode className="h-4 w-4" />
              Conectar
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-red-500"
            onClick={handleExcluir}
            disabled={excluindo}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <QrCodeDialog
        instanceId={instancia.id}
        aberto={qrAberto}
        onConectado={() => { setQrAberto(false); window.location.reload() }}
        onFechar={() => setQrAberto(false)}
      />

      <ModalExcluirInstancia
        aberto={excluirAberto}
        onFechar={() => setExcluirAberto(false)}
        instancia={instancia}
      />
    </>
  )
}
