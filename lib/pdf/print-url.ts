// Constrói a URL absoluta da rota /preview-pdf que o Puppeteer vai abrir.
// Em produção usa NEXT_PUBLIC_APP_URL. Em dev usa http://localhost:3000.

export function buildPrintUrl(id: string, origin?: string): string {
  const base =
    origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return `${base.replace(/\/$/, '')}/orcamentos/${id}/preview-pdf?print=1`
}
