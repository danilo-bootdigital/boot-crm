// ============================================================
// Relatório de Pedidos por Fornecedor — tipos e regras compartilhadas
// Usado por: página (server), rota de exportação (CSV/XLSX/PDF).
// Centraliza a montagem de filtros para garantir que TELA = EXPORTAÇÃO.
// ============================================================

export const STATUS_OPCOES = [
  { valor: 'pendente', label: 'Pendente' },
  { valor: 'em_producao', label: 'Em Produção' },
  { valor: 'pronto', label: 'Pronto' },
  { valor: 'enviado', label: 'Enviado' },
  { valor: 'entregue', label: 'Entregue' },
  { valor: 'concluido', label: 'Concluído' },
  { valor: 'cancelado', label: 'Cancelado' },
] as const

// Padrão do relatório: todos os status operacionais, exceto cancelado.
export const STATUS_PADRAO: string[] = STATUS_OPCOES
  .filter((s) => s.valor !== 'cancelado')
  .map((s) => s.valor)

export const TODOS_STATUS: string[] = STATUS_OPCOES.map((s) => s.valor)

// ---- Tipos de retorno das RPCs ----
export type TotaisPedidosFornecedor = {
  qtd_pedidos: number
  valor_total: number
  ticket_medio: number
  qtd_itens: number
  qtd_clientes: number
  qtd_fornecedores: number
  total_subtotal: number
  total_desconto: number
  total_frete: number
}

export type ConsolidadoFornecedor = {
  supplier_id: string | null
  fornecedor: string
  qtd_pedidos: number
  qtd_itens: number
  subtotal: number
  desconto: number
  frete: number
  valor_final: number
  ticket_medio: number
  participacao: number
}

export type DetalhePedido = {
  id: string
  numero: number
  criado_em: string
  status: string
  fornecedor: string
  cliente: string
  responsavel: string
  qtd_itens: number
  subtotal: number
  desconto: number
  frete: number
  valor_final: number
  total_rows: number
}

export const POR_PAGINA = 25

export type FiltrosRelatorio = {
  valido: boolean
  motivoInvalido?: string
  inicioData: string // YYYY-MM-DD (para exibição)
  fimData: string
  fornecedorId: string | null
  responsavelId: string | null
  statusSelecionados: string[]
  // Parâmetros já prontos para as RPCs:
  rpc: {
    p_inicio: string
    p_fim: string
    p_supplier_id: string | null
    p_status: string[]
    p_cliente_id: string | null
    p_responsavel_id: string | null
  }
}

/**
 * Monta os filtros do relatório a partir dos searchParams da URL.
 * A mesma função é usada pela tela e pela exportação → garante consistência.
 */
export function montarFiltros(
  params: Record<string, string | undefined>
): FiltrosRelatorio {
  const inicioData = (params.inicio ?? '').trim()
  const fimData = (params.fim ?? '').trim()

  const fornecedorId = params.fornecedor?.trim() || null
  const responsavelId = params.responsavel?.trim() || null
  const clienteId = params.cliente?.trim() || null

  const statusSelecionados = params.status?.trim()
    ? params.status.split(',').map((s) => s.trim()).filter(Boolean)
    : [...STATUS_PADRAO]

  let valido = true
  let motivoInvalido: string | undefined

  if (!inicioData || !fimData) {
    valido = false
    motivoInvalido = 'Selecione a data inicial e a data final.'
  } else if (fimData < inicioData) {
    valido = false
    motivoInvalido = 'A data final não pode ser anterior à data inicial.'
  } else if (statusSelecionados.length === 0) {
    valido = false
    motivoInvalido = 'Selecione ao menos um status.'
  }

  // Intervalo do dia inteiro (00:00:00 → 23:59:59) no fuso do servidor.
  const p_inicio = inicioData ? new Date(`${inicioData}T00:00:00`).toISOString() : ''
  const p_fim = fimData ? new Date(`${fimData}T23:59:59`).toISOString() : ''

  return {
    valido,
    motivoInvalido,
    inicioData,
    fimData,
    fornecedorId,
    responsavelId,
    statusSelecionados,
    rpc: {
      p_inicio,
      p_fim,
      p_supplier_id: fornecedorId,
      p_status: statusSelecionados,
      p_cliente_id: clienteId,
      p_responsavel_id: responsavelId,
    },
  }
}

/** Rótulo legível do período para cabeçalhos de exportação. */
export function rotuloPeriodo(inicioData: string, fimData: string): string {
  const fmt = (d: string) => {
    const [y, m, dia] = d.split('-')
    return `${dia}/${m}/${y}`
  }
  if (!inicioData || !fimData) return '—'
  return `${fmt(inicioData)} a ${fmt(fimData)}`
}
