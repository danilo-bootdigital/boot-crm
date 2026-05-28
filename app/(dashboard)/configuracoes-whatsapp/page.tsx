'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Smartphone, BarChart3, FileText, AlertCircle } from 'lucide-react'
import { WhatsAppInstanceManager } from '@/components/whatsapp/whatsapp-instance-manager'
import { WhatsAppMonitor } from '@/components/whatsapp/whatsapp-monitor'
import { useToast } from '@/hooks/use-toast'

export default function WhatsAppSettingsPage() {
  const [activeTab, setActiveTab] = useState('instances')
  const { toast } = useToast()

  // Simulação de dados da organização
  const organizationId = 'org-id-example'

  const handleEnvironmentTest = async () => {
    try {
      // Testar variáveis de ambiente
      const missingVars = []

      if (!process.env.NEXT_PUBLIC_EVOLUTION_API_URL) {
        missingVars.push('EVOLUTION_API_URL')
      }
      if (!process.env.NEXT_PUBLIC_EVOLUTION_API_KEY) {
        missingVars.push('EVOLUTION_API_KEY')
      }
      if (!process.env.NEXT_PUBLIC_EVOLUTION_WEBHOOK_SECRET) {
        missingVars.push('EVOLUTION_WEBHOOK_SECRET')
      }

      if (missingVars.length > 0) {
        toast({
          title: 'Variáveis de ambiente faltando',
          description: `Configure: ${missingVars.join(', ')}`,
          variant: 'destructive'
        })
        return
      }

      // Testar conexão com API
      const response = await fetch(`${process.env.NEXT_PUBLIC_EVOLUTION_API_URL}/api/status`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_EVOLUTION_API_KEY!
        }
      })

      if (response.ok) {
        toast({
          title: 'API Evolution acessível',
          description: 'A conexão com a API está funcionando corretamente.'
        })
      } else {
        toast({
          title: 'Erro na API Evolution',
          description: `Retornou status ${response.status}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Erro ao testar conexão',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Configurações WhatsApp</h1>
        </div>
        <p className="text-muted-foreground">
          Gerencie suas instâncias, monitore o status e configure integrações
        </p>
      </div>

      {/* Alertas iniciais */}
      <div className="mb-6 space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Antes de configurar as instâncias, certifique-se de que todas as variáveis de ambiente
            estão configuradas no arquivo <code className="bg-muted px-1 rounded">.env.local</code>.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Verificação Rápida</span>
            </CardTitle>
            <CardDescription>
              Teste se as configurações básicas estão funcionando
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>API URL</Label>
                <Input
                  placeholder="https://api.evolution-api.com"
                  defaultValue={process.env.NEXT_PUBLIC_EVOLUTION_API_URL || ''}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  placeholder="sua-chave-api"
                  defaultValue={process.env.NEXT_PUBLIC_EVOLUTION_API_KEY ? '***' : ''}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <Input
                  placeholder="seu-secret"
                  defaultValue={process.env.NEXT_PUBLIC_EVOLUTION_WEBHOOK_SECRET ? '***' : ''}
                  readOnly
                />
              </div>
            </div>
            <Button onClick={handleEnvironmentTest} className="w-full md:w-auto">
              Testar Conexão
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Abas principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="instances" className="flex items-center space-x-2">
            <Smartphone className="h-4 w-4" />
            <span>Instâncias</span>
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Monitoramento</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Logs</span>
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Documentação</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instances" className="mt-6">
          <WhatsAppInstanceManager
            organizationId={organizationId}
            onInstanceUpdate={() => setActiveTab('monitor')}
          />
        </TabsContent>

        <TabsContent value="monitor" className="mt-6">
          <WhatsAppMonitor />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Logs do Sistema</CardTitle>
              <CardDescription>
                Veja os logs detalhados do WhatsApp e do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="outline" className="w-full">
                  Baixar Logs Completos
                </Button>
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Logs Recentes</h4>
                  <div className="text-sm space-y-1 font-mono">
                    <div>[2024-01-15 14:30:15] INFO: Instância "WhatsApp Principal" conectada</div>
                    <div>[2024-01-15 14:28:32] INFO: Webhook recebido com sucesso</div>
                    <div>[2024-01-15 14:25:10] WARN: Instância "WhatsApp Secundário" desconectada</div>
                    <div>[2024-01-15 14:20:45] ERROR: Falha ao enviar mensagem para +5511999999999</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Primeiros Passos</CardTitle>
                <CardDescription>
                  Como configurar e usar o WhatsApp Integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">1. Configure as variáveis de ambiente</h4>
                  <p className="text-sm text-muted-foreground">
                    Adicione ao seu arquivo <code className="bg-muted px-1 rounded">.env.local</code>:
                  </p>
                  <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`EVOLUTION_API_URL=https://api.evolution-api.com
EVOLUTION_API_KEY=sua-chave-api
EVOLUTION_WEBHOOK_SECRET=seu-secret`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">2. Crie uma instância</h4>
                  <p className="text-sm text-muted-foreground">
                    Vá para a aba "Instâncias" e crie uma nova instância com um nome único.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">3. Conecte o WhatsApp</h4>
                  <p className="text-sm text-muted-foreground">
                    Clique em "QR Code" e escaneie com o WhatsApp do seu celular.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Solução de Problemas</CardTitle>
                <CardDescription>
                  Problemas comuns e suas soluções
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">QR Code não aparece</h4>
                  <p className="text-sm text-muted-foreground">
                    Verifique se a API Evolution está online e a chave está correta.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Mensagens não são recebidas</h4>
                  <p className="text-sm text-muted-foreground">
                    Verifique se o webhook está acessível e o secret está correto.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Instância desconectada</h4>
                  <p className="text-sm text-muted-foreground">
                    A instância pode ter expirado. Crie uma nova instância.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}