// Tipos que espelham o schema do Supabase (001_schema_completo.sql)
// Para regenerar via CLI: npx supabase gen types typescript --project-id SEU-ID > types/database.ts

export type UserRole = 'admin' | 'gestor' | 'vendedor' | 'atendimento' | 'financeiro' | 'suporte'
export type LeadOrigem = 'whatsapp' | 'instagram_lead_ad' | 'facebook_lead_ad' | 'site' | 'indicacao' | 'evento' | 'manual'
export type LeadStatus = 'novo' | 'em_atendimento' | 'qualificado' | 'descartado'
export type TaskTipo = 'ligacao' | 'email' | 'reuniao' | 'whatsapp'
export type WhatsappStatus = 'conectado' | 'desconectado' | 'aguardando_qr'
export type MessageDirecao = 'enviada' | 'recebida'
export type MessageTipoMidia = 'texto' | 'audio' | 'imagem' | 'documento' | 'sticker' | 'localizacao'
export type MessageStatus = 'enviada' | 'entregue' | 'lida' | 'falhou'
export type DistribuicaoModo = 'manual' | 'rotativo' | 'por_carga'
export type QuoteStatus =
  | 'rascunho'
  | 'aguardando_aprovacao_interna'
  | 'aprovado_internamente'
  | 'rejeitado_internamente'
  | 'enviado_ao_cliente'
  | 'aprovado_pelo_cliente'
  | 'recusado_pelo_cliente'

export type Organization = {
  id: string
  nome: string
  slug: string
  plano: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type Profile = {
  id: string
  organization_id: string
  nome: string
  email: string
  telefone: string | null
  cargo: UserRole
  disponivel: boolean
  ativo: boolean
  ultimo_status_em: string | null
  criado_em: string
  atualizado_em: string
}

export type Lead = {
  id: string
  organization_id: string
  nome: string | null
  email: string | null
  telefone: string | null
  empresa: string | null
  cpf_cnpj: string | null
  origem: LeadOrigem
  status: LeadStatus
  responsavel_id: string | null
  foto_perfil_url: string | null
  contato_anterior_id: string | null
  whatsapp_instance_id: string | null
  observacoes: string | null
  ultima_interacao_em: string | null
  criado_em: string
  atualizado_em: string
}

export type Company = {
  id: string
  organization_id: string
  nome: string
  cnpj: string | null
  site: string | null
  telefone: string | null
  endereco: string | null
  criado_em: string
  atualizado_em: string
}

export type Contact = {
  id: string
  organization_id: string
  nome: string
  email: string | null
  telefone: string | null
  cargo: string | null
  cpf_cnpj: string | null
  empresa_id: string | null
  responsavel_id: string | null
  foto_perfil_url: string | null
  endereco: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
}

export type Pipeline = {
  id: string
  organization_id: string
  nome: string
  descricao: string | null
  padrao: boolean
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type PipelineStage = {
  id: string
  organization_id: string
  pipeline_id: string
  nome: string
  ordem: number
  cor: string
  oculto: boolean
  tipo_especial: 'fechado' | 'perdido' | null
  criado_em: string
  atualizado_em: string
}

export type Deal = {
  id: string
  organization_id: string
  titulo: string
  valor_estimado: number | null
  contato_id: string | null
  responsavel_id: string | null
  pipeline_id: string
  estagio_id: string
  lead_id: string | null
  data_fechamento_prevista: string | null
  origem_lead: LeadOrigem | null
  motivo_perda: string | null
  ganho: boolean | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
}

export type Task = {
  id: string
  organization_id: string
  titulo: string
  descricao: string | null
  tipo: TaskTipo
  data_vencimento: string | null
  concluida: boolean
  responsavel_id: string
  lead_id: string | null
  contato_id: string | null
  deal_id: string | null
  criado_em: string
  atualizado_em: string
}

export type Activity = {
  id: string
  organization_id: string
  tipo: string
  descricao: string
  lead_id: string | null
  deal_id: string | null
  contato_id: string | null
  autor_id: string
  criado_em: string
}

export type WhatsappInstance = {
  id: string
  organization_id: string
  nome: string
  numero: string | null
  evolution_instance_name: string | null
  vendedor_id: string | null
  compartilhado: boolean
  status_conexao: WhatsappStatus
  criado_em: string
  atualizado_em: string
}

export type Conversation = {
  id: string
  organization_id: string
  whatsapp_instance_id: string
  lead_id: string | null
  contato_id: string | null
  telefone_externo: string
  ultima_mensagem_em: string | null
  criado_em: string
  atualizado_em: string
}

export type Message = {
  id: string
  organization_id: string
  conversation_id: string
  message_id_externo: string | null
  direcao: MessageDirecao
  tipo_midia: MessageTipoMidia
  conteudo: string | null
  url_midia: string | null
  telefone_remetente: string | null
  telefone_destinatario: string | null
  responsavel_id: string | null
  status: MessageStatus
  enviado_em: string
  entregue_em: string | null
  lida_em: string | null
}

export type MessageTemplate = {
  id: string
  organization_id: string
  nome: string
  conteudo: string
  categoria: string | null
  criado_por: string
  criado_em: string
  atualizado_em: string
}

export type ConversationExport = {
  id: string
  organization_id: string
  conversation_id: string
  lead_id: string | null
  exportado_por: string
  formato: 'png' | 'txt'
  periodo_inicio: string | null
  periodo_fim: string | null
  total_mensagens: number | null
  criado_em: string
}

export type Supplier = {
  id: string
  organization_id: string
  nome: string
  cnpj: string | null
  telefone: string | null
  email: string | null
  observacoes: string | null
  criado_em: string
}

export type SupplierCategory = {
  id: string
  organization_id: string
  supplier_id: string
  nome: string
  criado_em: string
}

export type Product = {
  id: string
  organization_id: string
  supplier_id: string | null
  category_id: string | null
  nome: string
  descricao: string | null
  composicao: string | null
  apresentacao: string | null
  preco_unitario: number
  unidade: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type Quote = {
  id: string
  organization_id: string
  supplier_id: string | null
  numero: number
  lead_id: string | null
  deal_id: string | null
  responsavel_id: string
  status: QuoteStatus
  valor_subtotal: number
  desconto_geral: number
  frete: number
  endereco_entrega: string | null
  valor_total: number
  aprovacao_interna_por: string | null
  aprovacao_interna_em: string | null
  aprovacao_interna_comentario: string | null
  observacoes: string | null
  criado_em: string
  atualizado_em: string
}

export type QuoteItem = {
  id: string
  quote_id: string
  product_id: string | null
  descricao: string
  unidade: string | null
  quantidade: number
  preco_unitario: number
  desconto_item: number
  subtotal: number
}

export type LeadDistributionConfig = {
  id: string
  organization_id: string
  modo: DistribuicaoModo
  apenas_disponiveis: boolean
  limite_por_vendedor: number | null
  proximo_vendedor_idx: number
  atualizado_por: string | null
  atualizado_em: string
}

export type SystemConfig = {
  id: string
  organization_id: string
  chave: string
  valor: string
  tipo_valor: 'texto' | 'numero' | 'booleano' | 'json'
  descricao: string | null
  atualizado_por: string | null
  atualizado_em: string
}

export type AuditLog = {
  id: string
  organization_id: string
  usuario_id: string | null
  acao: string
  tabela_afetada: string | null
  registro_id: string | null
  dados_anteriores: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
  ip: string | null
  criado_em: string
}

export type DealStageLog = {
  id: string
  organization_id: string
  deal_id: string
  usuario_id: string
  estagio_anterior_id: string | null
  estagio_novo_id: string
  criado_em: string
}
