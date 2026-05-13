'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { read, utils } from 'xlsx'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { importarContatos } from '@/app/(dashboard)/contatos/actions'
import { Upload, FileSpreadsheet, Check } from 'lucide-react'

type ContatoImportado = {
  nome: string
  telefone: string | null
  email: string | null
  observacoes: string | null
}

const MAPEAMENTO_NOME: Record<string, 'nome' | 'telefone' | 'email' | 'endereco' | 'municipio' | 'estado' | 'cpf'> = {
  'nome': 'nome',
  'name': 'nome',
  'razao social': 'nome',
  'n fantasia': 'nome',
  'telefone': 'telefone',
  'phone': 'telefone',
  'celular': 'telefone',
  'fone': 'telefone',
  'e-mail': 'email',
  'email': 'email',
  'endereco': 'endereco',
  'endereço': 'endereco',
  'municipio': 'municipio',
  'município': 'municipio',
  'cidade': 'municipio',
  'estado': 'estado',
  'uf': 'estado',
  'cnpj/cpf': 'cpf',
  'cpf': 'cpf',
  'cnpj': 'cpf',
}

function detectarColuna(header: string): string | null {
  const normalizado = header.toLowerCase().trim()
  return MAPEAMENTO_NOME[normalizado] ?? null
}

function parsearPlanilha(data: ArrayBuffer): { headers: string[]; rows: string[][] } {
  const wb = read(data, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
  const headers = (raw[0] ?? []).map(String)
  const rows = raw.slice(1).map((r) => r.map(String))
  return { headers, rows }
}

function mapearContatos(headers: string[], rows: string[][]): ContatoImportado[] {
  const indices: Record<string, number> = {}
  headers.forEach((h, i) => {
    const campo = detectarColuna(h)
    if (campo && !(campo in indices)) {
      indices[campo] = i
    }
  })

  if (!('nome' in indices)) return []

  return rows
    .map((row) => {
      const nome = row[indices.nome]?.trim()
      if (!nome) return null

      const telefone = indices.telefone !== undefined ? row[indices.telefone]?.trim() || null : null
      const email = indices.email !== undefined ? row[indices.email]?.trim() || null : null

      const partes: string[] = []
      if (indices.endereco !== undefined && row[indices.endereco]?.trim()) partes.push(row[indices.endereco].trim())
      if (indices.municipio !== undefined && row[indices.municipio]?.trim()) partes.push(row[indices.municipio].trim())
      if (indices.estado !== undefined && row[indices.estado]?.trim()) partes.push(row[indices.estado].trim())
      if (indices.cpf !== undefined && row[indices.cpf]?.trim()) partes.push(`Doc: ${row[indices.cpf].trim()}`)

      const observacoes = partes.length > 0 ? partes.join(' — ') : null

      return { nome, telefone, email, observacoes } as ContatoImportado
    })
    .filter((c): c is ContatoImportado => c !== null)
}

export function FormImportacao() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [contatos, setContatos] = useState<ContatoImportado[]>([])
  const [totalLinhas, setTotalLinhas] = useState(0)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setArquivo(file)
    const buffer = await file.arrayBuffer()
    const { headers, rows } = parsearPlanilha(buffer)
    const mapeados = mapearContatos(headers, rows)
    setContatos(mapeados)
    setTotalLinhas(rows.length)
  }

  function handleConfirmar() {
    if (contatos.length === 0) return

    startTransition(async () => {
      try {
        const resultado = await importarContatos(contatos)
        toast.success(`${resultado.importados} contatos importados com sucesso.`)
        router.push('/contatos')
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Erro ao importar.')
      }
    })
  }

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
                <span className="text-xs text-slate-400">{totalLinhas} linhas · {contatos.length} contatos válidos</span>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-slate-300" />
                <span className="text-sm text-slate-500">Clique ou arraste um arquivo XLSX ou CSV</span>
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

      {contatos.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview ({Math.min(10, contatos.length)} de {contatos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-slate-500">
                      <th className="pb-2 pr-4">Nome</th>
                      <th className="pb-2 pr-4">Telefone</th>
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contatos.slice(0, 10).map((c, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium text-slate-900">{c.nome}</td>
                        <td className="py-2 pr-4 text-slate-600">{c.telefone ?? '—'}</td>
                        <td className="py-2 pr-4 text-slate-600">{c.email ?? '—'}</td>
                        <td className="py-2 text-slate-500 text-xs max-w-xs truncate">{c.observacoes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleConfirmar} disabled={isPending} className="gap-1.5">
              <Check className="h-4 w-4" />
              {isPending ? 'Importando...' : `Importar ${contatos.length} contatos`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
