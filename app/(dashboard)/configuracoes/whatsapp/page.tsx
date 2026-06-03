'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Plus } from 'lucide-react'
import ConfiguracaoAvancada from './config-avancada'
import { CardInstancia } from '@/components/whatsapp/card-instancia'
import { AdicionarInstanciaButton } from '@/components/whatsapp/adicionar-instancia-button'

type Instancia = {
  id: string
  nome: string
  numero: string | null
  status_conexao: 'conectado' | 'desconectado' | 'aguardando_qr'
  compartilhado: boolean
  vendedor: { nome: string } | null
}

type Vendedor = { id: string; nome: string }

export default function WhatsappConfigPage() {
  const [activeTab, setActiveTab] = useState('conexoes')
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      const [respInst, respVend] = await Promise.all([
        fetch('/api/whatsapp/instances'),
        fetch('/api/whatsapp/vendedores'),
      ])

      if (respInst.ok) {
        const data = await respInst.json()
        setInstancias(data.instancias || [])
      }

      if (respVend.ok) {
        const data = await respVend.json()
        setVendedores(data.vendedores || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

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
              <AdicionarInstanciaButton vendedores={vendedores} />
            </div>

            {loading ? (
              <Card>
                <CardContent className="pt-6 text-center text-sm text-slate-500">
                  Carregando instâncias...
                </CardContent>
              </Card>
            ) : instancias.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-400 mb-4">Nenhuma instância configurada</p>
                    <AdicionarInstanciaButton vendedores={vendedores} />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {instancias.map((inst) => (
                  <CardInstancia key={inst.id} instancia={inst} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="configuracoes">
          <ConfiguracaoAvancada />
        </TabsContent>
      </Tabs>
    </div>
  )
}