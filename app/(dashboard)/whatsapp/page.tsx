import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ListaConversas } from '@/components/whatsapp/lista-conversas'
import { ModalNovaConversa } from '@/components/whatsapp/modal-nova-conversa'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, BarChart3, AlertTriangle } from 'lucide-react'
import { WhatsAppInstanceManager } from '@/components/whatsapp/whatsapp-instance-manager'

export default async function WhatsappPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('profiles')
    .select('id, cargo, organization_id')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  // Buscar instâncias
  const { data: instancias } = await supabase
    .from('whatsapp_instances')
    .select('id, nome, status_conexao, evolution_instance_name')
    .eq('organization_id', perfil.organization_id)

  // Verificar se há instâncias conectadas
  const hasConnectedInstances = instancias?.some(inst => inst.status_conexao === 'conectado') || false

  // Se não houver instâncias, mostrar tela de configuração
  if (!instancias || instancias.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">WhatsApp</h1>
          <p className="text-muted-foreground">Gerencie suas conversas do WhatsApp</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span>Nenhuma instância configurada</span>
              </CardTitle>
              <CardDescription>
                Para começar a usar o WhatsApp, você precisa primeiro configurar uma instância.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Siga estes passos para configurar sua integração com o WhatsApp:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Acesse as configurações do WhatsApp</li>
                <li>Crie uma nova instância</li>
                <li>Escaneie o QR code com o WhatsApp do seu celular</li>
                <li>Comece a enviar e receber mensagens</li>
              </ol>
              <div className="flex space-x-2">
                <Link href="/configuracoes-whatsapp">
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar WhatsApp
                  </Button>
                </Link>
                <Link href="/monitoramento-whatsapp">
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Ver Monitoramento
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Buscar conversas com status e responsável
  let query = supabase
    .from('conversations')
    .select(`
      id,
      telefone_externo,
      ultima_mensagem_em,
      status,
      responsavel_id,
      responsavel:profiles!responsavel_id(nome),
      lead:leads!lead_id(id, nome),
      instancia:whatsapp_instances!whatsapp_instance_id(nome)
    `)
    .eq('organization_id', perfil.organization_id)
    .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
    .limit(100)

  // Vendedor só vê conversas das instâncias atribuídas a ele ou onde é responsável
  if (perfil.cargo === 'vendedor' || perfil.cargo === 'atendimento') {
    const { data: userInstances } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('organization_id', perfil.organization_id)
      .or(`vendedor_id.eq.${perfil.id},compartilhado.eq.true`)
    const ids = (userInstances ?? []).map((i) => i.id as string)
    if (ids.length === 0) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma instância atribuída</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Você não tem acesso a nenhuma instância de WhatsApp.
            </p>
            <Link href="/configuracoes-whatsapp">
              <Button>
                <Settings className="h-4 w-4 mr-2" />
                Solicitar Acesso
              </Button>
            </Link>
          </div>
        </div>
      )
    }
    query = query.in('whatsapp_instance_id', ids)
  }

  const { data: conversasRaw } = await query

  // Buscar última mensagem por conversa via RPC
  const conversaIds = (conversasRaw ?? []).map((c) => c.id as string)
  const ultimasMensagens: Record<string, string> = {}
  if (conversaIds.length > 0) {
    const { data: msgs } = await supabase.rpc('ultimas_mensagens_por_conversa', {
      p_conversation_ids: conversaIds,
      p_org_id: perfil.organization_id,
    })
    ;(msgs ?? []).forEach((m: { conversation_id: string; conteudo: string | null }) => {
      if (m.conteudo) ultimasMensagens[m.conversation_id] = m.conteudo
    })
  }

  // Buscar tags de todas as conversas
  const tagsMap: Record<string, { id: string; nome: string; cor: string }[]> = {}
  if (conversaIds.length > 0) {
    const { data: tagLinks } = await supabase
      .from('conversation_tag_links')
      .select('conversation_id, tag:conversation_tags!tag_id(id, nome, cor)')
      .in('conversation_id', conversaIds)

    ;(tagLinks ?? []).forEach((link) => {
      const cid = link.conversation_id as string
      const tag = (Array.isArray(link.tag) ? link.tag[0] : link.tag) as { id: string; nome: string; cor: string } | null
      if (tag) {
        if (!tagsMap[cid]) tagsMap[cid] = []
        tagsMap[cid].push(tag)
      }
    })
  }

  // Todas as tags da org (para filtros)
  const { data: todasTagsRaw } = await supabase
    .from('conversation_tags')
    .select('id, nome, cor')
    .eq('organization_id', perfil.organization_id)
    .order('nome')

  const todasTags = (todasTagsRaw ?? []) as { id: string; nome: string; cor: string }[]

  // Usuários da org (para filtros)
  const { data: usuariosRaw } = await supabase
    .from('profiles')
    .select('id, nome')

  const usuarios = (usuariosRaw ?? []) as { id: string; nome: string }[]

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r bg-muted/10">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">WhatsApp</h2>
            <div className="flex space-x-1">
              <Link href="/configuracoes-whatsapp">
                <Button size="sm" variant="ghost">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/monitoramento-whatsapp">
                <Button size="sm" variant="ghost">
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Status das instâncias */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Instâncias</h3>
            <div className="space-y-2">
              {instancias?.map((inst) => (
                <div
                  key={inst.id}
                  className={`p-2 rounded text-sm ${
                    inst.status_conexao === 'conectado'
                      ? 'bg-green-100 text-green-800'
                      : inst.status_conexao === 'aguardando_qr'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {inst.nome} - {inst.status_conexao === 'conectado' ? 'Online' : inst.status_conexao === 'aguardando_qr' ? 'Aguardando QR' : 'Offline'}
                </div>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select className="w-full p-2 border rounded text-sm">
                <option value="">Todos</option>
                <option value="nao_atendida">Não Atendida</option>
                <option value="em_atendimento">Em Atendimento</option>
                <option value="aguardando_resposta">Aguardando Resposta</option>
                <option value="finalizada">Finalizada</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-1">
                {todasTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-1 rounded text-xs cursor-pointer hover:bg-gray-200"
                    style={{ backgroundColor: tag.cor + '20', color: tag.cor }}
                  >
                    {tag.nome}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Responsável</label>
              <select className="w-full p-2 border rounded text-sm">
                <option value="">Todos</option>
                {usuarios.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Conversas</h1>
            <ModalNovaConversa instancias={instancias} />
          </div>
        </div>

        {/* Lista de conversas */}
        <div className="flex-1 overflow-auto">
          <ListaConversas
            conversas={conversasRaw ?? []}
            ultimasMensagens={ultimasMensagens}
            tagsMap={tagsMap}
            todasTags={todasTags}
            usuarios={usuarios}
            cargoUsuario={perfil.cargo}
          />
        </div>
      </div>
    </div>
  )
}