'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bell, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface MensagemUrgente {
  id: string
  conversation_id: string
  conteudo: string
  enviado_em: string
  urgencia: 'alta' | 'normal'
  responsavel_id: string
  lead_id: string
  telefone_remetente: string
}

export default function PainelMonitoramento() {
  const [mensagens, setMensagens] = useState<MensagemUrgente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtrarPor, setFiltrarPor] = useState<'todas' | 'alta' | 'normal'>('todas')
  const [tempoAtualizacao, setTempoAtualizacao] = useState(30) // segundos
  const [autoRefresh, setAutoRefresh] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    carregarMensagens()

    if (autoRefresh) {
      const interval = setInterval(carregarMensagens, tempoAtualizacao * 1000)
      return () => clearInterval(interval)
    }
  }, [filtrarPor, autoRefresh, tempoAtualizacao])

  const carregarMensagens = async () => {
    setCarregando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!perfil) return

      let query = supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          conteudo,
          enviado_em,
          urgencia,
          responsavel_id,
          lead_id,
          telefone_remetente,
          conversation:conversations!conversation_id(
            id,
            lead_id,
            status,
            responsavel_id,
            lead:leads!lead_id(
              id,
              nome,
              telefone
            )
          )
        `)
        .eq('organization_id', perfil.organization_id)
        .order('enviado_em', { ascending: false })
        .limit(50)

      if (filtrarPor === 'alta') {
        query = query.eq('urgencia', 'alta')
      } else if (filtrarPor === 'normal') {
        query = query.eq('urgencia', 'normal')
      }

      const { data, error } = await query

      if (error) throw error

      // Formatar dados
      const mensagensFormatadas = (data || []).map(msg => ({
        ...msg,
        lead_nome: msg.conversation?.lead?.nome || 'Sem nome',
        lead_telefone: msg.conversation?.lead?.telefone || msg.telefone_remetente,
        conversation_status: msg.conversation?.status || 'desconhecido'
      }))

      setMensagens(mensagensFormatadas)
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      toast.error('Erro ao carregar mensagens')
    } finally {
      setCarregando(false)
    }
  }

  const marcarComoProcessada = async (mensagemId: string) => {
    try {
      await supabase
        .from('messages')
        .update({
          processado_em: new Date().toISOString(),
          urgencia: 'normal'
        })
        .eq('id', mensagemId)

      setMensagens(prev => prev.map(msg =>
        msg.id === mensagemId ? { ...msg, urgencia: 'normal' as const } : msg
      ))

      toast.success('Mensagem marcada como processada')
    } catch (error) {
      console.error('Erro ao marcar mensagem:', error)
      toast.error('Erro ao processar mensagem')
    }
  }

  const getIconeUrgencia = (urgencia: 'alta' | 'normal') => {
    if (urgencia === 'alta') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    return <Clock className="h-4 w-4 text-blue-500" />
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'nao_atendida': { label: 'Não Atendida', variant: 'destructive' },
      'em_atendimento': { label: 'Em Atendimento', variant: 'default' },
      'aguardando_resposta': { label: 'Aguardando Resposta', variant: 'secondary' },
      'finalizada': { label: 'Finalizada', variant: 'outline' }
    }

    const config = statusMap[status] || { label: status, variant: 'outline' }
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Monitoramento WhatsApp
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Acompanhe mensagens urgentes e status das conversas</p>
        </div>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Monitoramento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Filtrar por</Label>
              <select
                value={filtrarPor}
                onChange={(e) => setFiltrarPor(e.target.value as any)}
                className="w-full p-2 border rounded"
              >
                <option value="todas">Todas as mensagens</option>
                <option value="alta">Apenas urgentes</option>
                <option value="normal">Apenas normais</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Atualizar a cada</Label>
              <Input
                type="number"
                value={tempoAtualizacao}
                onChange={(e) => setTempoAtualizacao(parseInt(e.target.value) || 30)}
                min="5"
                max="300"
              />
              <p className="text-xs text-slate-500">Segundos</p>
            </div>

            <div className="space-y-2">
              <Label>Auto-refresh</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-refresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="auto-refresh">Atualizar automaticamente</Label>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={carregarMensagens} disabled={carregando}>
              {carregando ? 'Carregando...' : 'Atualizar Agora'}
            </Button>
            <Button variant="outline" onClick={() => setAutoRefresh(!autoRefresh)}>
              {autoRefresh ? 'Pausar Auto-refresh' : 'Iniciar Auto-refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {mensagens.filter(m => m.urgencia === 'alta').length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{mensagens.filter(m => m.urgencia === 'alta').length}</strong> mensagens urgentes não processadas!
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de mensagens */}
      <div className="space-y-4">
        {carregando ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
          </div>
        ) : mensagens.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-slate-500">Nenhuma mensagem encontrada</p>
            </CardContent>
          </Card>
        ) : (
          mensagens.map((mensagem) => (
            <Card key={mensagem.id} className={mensagem.urgencia === 'alta' ? 'border-red-200' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getIconeUrgencia(mensagem.urgencia)}
                    <span className="text-sm text-slate-500">
                      {new Date(mensagem.enviado_em).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(mensagem.conversation_status)}
                    {mensagem.urgencia === 'alta' && (
                      <Badge variant="destructive">Urgente</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">Mensagem:</p>
                    <p className="text-sm bg-slate-50 p-2 rounded">
                      {mensagem.conteudo}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Lead:</p>
                      <p>{mensagem.lead_nome}</p>
                    </div>
                    <div>
                      <p className="font-medium">Telefone:</p>
                      <p>{mensagem.lead_telefone}</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    {mensagem.urgencia === 'alta' && (
                      <Button
                        onClick={() => marcarComoProcessada(mensagem.id)}
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Marcar como Processada
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}