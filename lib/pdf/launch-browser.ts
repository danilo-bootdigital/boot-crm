// Lança uma instância do Chromium compatível com o ambiente atual.
// - Em produção (Vercel/Fluid Compute): usa @sparticuz/chromium (empacotado).
// - Em dev local: tenta CHROME_PATH (env) ou cai no Chromium do sistema.
//
// Esta é a única função que importa @sparticuz/chromium, isolando o
// custo de cold start em um único ponto.

import puppeteer, { type Browser } from 'puppeteer-core'

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV

export async function launchBrowser(): Promise<Browser> {
  if (isVercel) {
    // Produção: usa Chromium empacotado para serverless.
    const chromium = (await import('@sparticuz/chromium')).default
    const executablePath = await chromium.executablePath()
    return puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      executablePath,
      headless: chromium.headless,
    })
  }

  // Dev local: usa o Chrome/Chromium instalado na máquina.
  const executablePath =
    process.env.CHROME_PATH ||
    (process.platform === 'darwin'
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined)

  return puppeteer.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  })
}
