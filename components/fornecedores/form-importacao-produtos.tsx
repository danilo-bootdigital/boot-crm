'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { read, utils } from 'xlsx'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { importarProdutosComFornecedor } from '@/app/(dashboard)/configuracoes/fornecedores/actions'
import { Upload, FileSpreadsheet, Check } from 'lucide-react'

type ProdutoImportado = {
  fornecedor: string
  nome: string
  descricao: string | null
  preco_unitario: number
  unidade: string
}

const MAPEAMENTO: Record<string, 'fornecedor' | 'nome' | 'descricao' | 'preco' | 'unidade'> = {
  'fornecedor': 'fornecedor',
  'supplier': 'fornecedor',
  'fabricante': 'fornecedor',
  'marca': 'fornecedor',
  'produto': 'nome',
  'nome': 'nome',
  'name': 'nome',
  'descricao': 'descricao',
  'descrição': 'descricao',
  'description': 'descricao',
  'preco': 'preco',
  'preço': 'preco',
  'preco_unitario': 'preco',
  'valor': 'preco',
  'price': 'preco',
  'unidade': 'unidade',
  'un': 'unidade',
  'unit': 'unidade',
}

function detectarColuna(header: string): string | null {
  const normalizado = header.toLowerCase().trim()
  return MAPEAMENTO[normalizado] ?? null
}

function parsearPlanilha(data: ArrayBuffer): { headers: string[]; rows: string[][] } {
  const wb = read(data, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
  const headers = (raw[0] ?? []).map(String)
  const rows = raw.slice(1).map((r) => r.map(String))
  return { headers, rows }
}

function mapearProdutos(headers: string[], rows: string[][]): ProdutoImportado[] {
  const indices: Record<string, number> = {}
  headers.forEach((h, i) => {
    const campo = detectarColuna(h)
    if (campo && !(campo in indices)) {
      indices[campo] = i
    }
  })

  if (!('fornecedor' in indices) || !('nome' in indices)) return []

  return rows
    .map((row) => {
      const fornecedor = row[indices.fornecedor]?.trim()
      const nome = row[indices.nome]?.trim()
      if (!fornecedor || !nome) return null

      const precoStr = indices.preco !== undefined ? row[indices.preco]?.trim() : '0'
      const preco = parseFloat(precoStr.replace(/[^\d.,]/g, '').replace(',', '.')) || 0

      const descricao = indices.descricao !== undefined ? row[indices.descricao]?.trim() || null : null
      const unidade = indices.unidade !== undefined ? row[indices.unidade]?.trim() || 'un' : 'un'

      return { fornecedor, nome, descricao, preco_unitario: preco, unidade } as ProdutoImportado
    })
    .filter((p): p is ProdutoImportado => p !== null)
}

export function FormImportacaoProdutos() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [produtos, setProdutos] = useState<ProdutoImportado[]>([])
  const [totalLinhas, setTotalLinhas] = useState(0)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setArquivo(file)
    const buffer = await file.arrayBuffer()
    const { headers, rows } = parsearPlanilha(buffer)
    const mapeados = mapearProdutos(headers, rows)
    setProdutos(mapeados)
    setTotalLinhas(rows.length)
  }

  function handleConfirmar() {
    if (produtos.length === 0) return

    startTransition(async () => {
      try {
        const resultado = await importarProdutosComFornecedor(produtos)
        toast.success(`${resultado.importados} produtos importados de ${resultado.fornecedoresCriados} fornecedor(es).`)
        router.push('/configuracoes/fornecedores')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao importar.')
      }
    })
  }

  // Agrupar por fornecedor para preview
  const porFornecedor = produtos.reduce<Record<string, ProdutoImportado[]>>((acc, p) => {
    if (!acc[p.fornecedor]) acc[p.fornecedor] = []
    acc[p.fornecedor].push(p)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload do arquivo</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 p-8 hover:border-slate-400 transition-colors">
            {arquivo ? (
              <>
                <FileSpreadsheet className="h-10 w-10 text-green-500" />
                <span className="text-sm font-medium text-slate-700">{arquivo.name}</span>
                <span className="text-xs text-slate-400">
                  {totalLinhas} linhas · {produtos.length} produtos · {Object.keys(porFornecedor).length} fornecedor(es)
                </span>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-slate-300" />
                <span className="text-sm text-slate-500">Clique ou arraste um arquivo XLSX ou CSV</span>
                <span className="text-xs text-slate-400">Colunas: Fornecedor, Produto, Preço, Unidade, Descrição</span>
              </>
            )}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </CardContent>
      </Card>

      {produtos.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview por fornecedor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(porFornecedor).slice(0, 5).map(([fornecedor, prods]) => (
                <div key={fornecedor}>
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">{fornecedor} ({prods.length} produtos)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="pb-1 pr-3">Produto</th>
                          <th className="pb-1 pr-3">Preço</th>
                          <th className="pb-1">Unidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prods.slice(0, 5).map((p, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-1 pr-3 text-slate-700">{p.nome}</td>
                            <td className="py-1 pr-3 text-slate-600">
                              {p.preco_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="py-1 text-slate-500">{p.unidade}</td>
                          </tr>
                        ))}
                        {prods.length > 5 && (
                          <tr><td colSpan={3} className="py-1 text-slate-400">... e mais {prods.length - 5}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {Object.keys(porFornecedor).length > 5 && (
                <p className="text-xs text-slate-400">... e mais {Object.keys(porFornecedor).length - 5} fornecedor(es)</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleConfirmar} disabled={isPending} className="gap-1.5">
              <Check className="h-4 w-4" />
              {isPending ? 'Importando...' : `Importar ${produtos.length} produtos`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
