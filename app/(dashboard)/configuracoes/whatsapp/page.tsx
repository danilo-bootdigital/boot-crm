'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Plus } from 'lucide-react'
import { toast } from 'sonner'
import ConfiguracaoAvancada from './config-avancada'
import { CardInstancia } from '@/components/whatsapp/card-instancia'
import { AdicionarInstanciaButton } from '@/components/whatsapp/adicionar-instancia-button'

export default function WhatsappConfigPage() {
  const [activeTab, setActiveTab] = useState('conexoes')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configurações WhatsApp</h1>
          <p className="mt-0.5 text-sm text-slate-500">Gerencie instâncias e configurações avançadas.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="conexoes" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Instâncias
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações Avançadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conexoes">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Conexões WhatsApp</h2>
                <p className="mt-0.5 text-sm text-slate-500">Gerencie as instâncias conectadas ao sistema.</p>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-4">Nenhuma instância configurada</p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Instância
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="configuracoes">
          <ConfiguracaoAvancada />
        </TabsContent>
      </Tabs>
    </div>
  )
}
