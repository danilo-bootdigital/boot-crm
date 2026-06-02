'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Save, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ConfiguracaoWhatsApp {
  id?: string
  organization_id: string
  max_tamanho_mensagem: number
  tempo_retencao_midia: number
  max_tentativas_envio: number
  palavras_urgentes: string[]
  habilitar_cache_contatos: boolean
  tempo_cache_contatos: number
  rate_limit_por_minuto: number
  webhook_timeout: number
  habilitar_monitoramento: boolean
}

const defaultConfig: ConfiguracaoWhatsApp = {
  organization_id: '',
  max_tamanho_mensagem: 4096,
  tempo_retencao_midia: 30,
  max_tentativas_envio: 3,
  palavras_urgentes: ['urgente', 'emergência', 'problema', 'falha', 'erro'],
  habilitar_cache_contatos: true,
  tempo_cache_contatos: 300,
  rate_limit_por_minuto: 60,
  webhook_timeout: 15,
  habilitar_monitoramento: true,
}

export default function ConfiguracaoAvancada() {
  const [config, setConfig] = useState<ConfiguracaoWhatsApp>(defaultConfig)
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    carregarConfiguracao()
  }, [])

  const carregarConfiguracao = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!perfil) return

      const { data: configExistente } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('organization_id', perfil.organization_id)
        .single()

      if (configExistente) {
        setConfig({
          ...defaultConfig,
          ...configExistente,
          palavras_urgentes: configExistente.palavras_urgentes || defaultConfig.palavras_urgentes,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error)
    } finally {
      setLoading(false)
    }
  }

  const salvarConfiguracao = async () => {
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!perfil) return

      const configParaSalvar = {
        ...config,
        organization_id: perfil.organization_id,
        atualizado_em: new Date().toISOString(),
      }

      const { data: configExistente } = await supabase
        .from('whatsapp_config')
        .select('id')
        .eq('organization_id', perfil.organization_id)
        .single()

      if (configExistente) {
        await supabase
          .from('whatsapp_config')
          .update(configParaSalvar)
          .eq('id', configExistente.id)
      } else {
        await supabase
          .from('whatsapp_config')
          .insert(configParaSalvar)
      }

      toast.success('Configuração salva com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      toast.error('Erro ao salvar configuração')
    } finally {
      setSalvando(false)
    }
  }

  const adicionarPalavraUrgente = (palavra: string) => {
    if (palavra && !config.palavras_urgentes.includes(palavra)) {
      setConfig({
        ...config,
        palavras_urgentes: [...config.palavras_urgentes, palavra],
      })
    }
  }

  const removerPalavraUrgente = (palavra: string) => {
    setConfig({
      ...config,
      palavras_urgentes: config.palavras_urgentes.filter(p => p !== palavra),
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações Avançadas WhatsApp</h1>
          <p className="mt-0.5 text-sm text-slate-500">Configure opções avançadas de segurança e performance.</p>
        </div>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Configure limites e comportamentos gerais do WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-tamanho-mensagem">
                    Tamanho máximo da mensagem (caracteres)
                  </Label>
                  <Input
                    id="max-tamanho-mensagem"
                    type="number"
                    value={config.max_tamanho_mensagem}
                    onChange={(e) => setConfig({ ...config, max_tamanho_mensagem: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-slate-500">
                    Limite de caracteres por mensagem
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tempo-retencao-midia">
                    Tempo de retenção de mídia (dias)
                  </Label>
                  <Input
                    id="tempo-retencao-midia"
                    type="number"
                    value={config.tempo_retencao_midia}
                    onChange={(e) => setConfig({ ...config, tempo_retencao_midia: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-slate-500">
                    Mídia será automaticamente removida após este período
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-tentativas-envio">
                    Máximo de tentativas de envio
                  </Label>
                  <Input
                    id="max-tentativas-envio"
                    type="number"
                    value={config.max_tentativas_envio}
                    onChange={(e) => setConfig({ ...config, max_tentativas_envio: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-slate-500">
                    Número máximo de tentativas para enviar mensagens
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate-limit">
                    Rate limit (mensagens por minuto)
                  </Label>
                  <Input
                    id="rate-limit"
                    type="number"
                    value={config.rate_limit_por_minuto}
                    onChange={(e) => setConfig({ ...config, rate_limit_por_minuto: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-slate-500">
                    Limite de mensagens por minuto por instância
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Palavras urgentes</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar palavra urgente"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement
                        adicionarPalavraUrgente(input.value)
                        input.value = ''
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Adicionar palavra urgente"]') as HTMLInputElement
                      if (input?.value) {
                        adicionarPalavraUrgente(input.value)
                        input.value = ''
                      }
                    }}
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {config.palavras_urgentes.map((palavra) => (
                    <Badge key={palavra} variant="secondary" className="cursor-pointer">
                      {palavra}
                      <button
                        onClick={() => removerPalavraUrgente(palavra)}
                        className="ml-2 text-xs hover:text-red-500"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Segurança</CardTitle>
              <CardDescription>
                Configure opções de segurança para o webhook e mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-timeout">
                  Timeout do Webhook (segundos)
                </Label>
                <Input
                  id="webhook-timeout"
                  type="number"
                  value={config.webhook_timeout}
                  onChange={(e) => setConfig({ ...config, webhook_timeout: parseInt(e.target.value) })}
                />
                <p className="text-xs text-slate-500">
                  Tempo máximo de espera para respostas do webhook
                </p>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Importante:</strong> Para segurança adicional, configure um webhook secret no arquivo .env:
                  <code className="block mt-2 p-2 bg-slate-100 rounded text-sm">
                    EVOLUTION_WEBHOOK_SECRET=seu-secret-aqui
                  </code>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Otimização de Performance</CardTitle>
              <CardDescription>
                Configure opções para melhorar a performance do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Habilitar cache de contatos</Label>
                  <p className="text-sm text-slate-500">
                    Armazena temporariamente contatos para evitar buscas repetidas
                  </p>
                </div>
                <Switch
                  checked={config.habilitar_cache_contatos}
                  onCheckedChange={(checked) => setConfig({ ...config, habilitar_cache_contatos: checked })}
                />
              </div>

              {config.habilitar_cache_contatos && (
                <div className="space-y-2">
                  <Label htmlFor="tempo-cache-contatos">
                    Tempo de cache (segundos)
                  </Label>
                  <Input
                    id="tempo-cache-contatos"
                    type="number"
                    value={config.tempo_cache_contatos}
                    onChange={(e) => setConfig({ ...config, tempo_cache_contatos: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-slate-500">
                    Contatos serão mantidos no cache por este tempo
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoramento">
          <Card>
            <CardHeader>
              <CardTitle>Monitoramento</CardTitle>
              <CardDescription>
                Configure opções de monitoramento e alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Habilitar monitoramento</Label>
                  <p className="text-sm text-slate-500">
                    Ativa logs e monitoramento de eventos do WhatsApp
                  </p>
                </div>
                <Switch
                  checked={config.habilitar_monitoramento}
                  onCheckedChange={(checked) => setConfig({ ...config, habilitar_monitoramento: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={carregarConfiguracao}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reverter
        </Button>
        <Button onClick={salvarConfiguracao} disabled={salvando}>
          <Save className="h-4 w-4 mr-2" />
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  )
}