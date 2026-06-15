// Lança uma instância do Chromium compatível com o ambiente atual.
// - Em produção (Vercel/Fluid Compute): usa @sparticuz/chromium (empacotado).
// - Em dev local: tenta CHROME_PATH (env) ou cai no Chromium do sistema.
//
// @sparticuz/chromium@149+ detecta Vercel Fluid Compute nativamente
// via isRunningInAmazonLinux2023 (helper.js), extrai al2023.tar.br
// automaticamente, e configura LD_LIBRARY_PATH / FONTCONFIG_PATH.
//
// API pública da v149:
//   const chromium = (await import('@sparticuz/chromium')).default
//   const executablePath = await chromium.executablePath()

import puppeteer, { type Browser } from 'puppeteer-core'

const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV

export async function launchBrowser(): Promise<Browser> {
  if (isVercel) {
    // API pública única — não usar subpaths.
    const chromium = (await import('@sparticuz/chromium')).default

    // Desativa graphics stack (lib mais leve, ~1s mais rápido no cold start)
    chromium.setGraphicsMode = false

    // Detecta Vercel automaticamente e extrai al2023.tar.br
    // (que contém libnss3.so, libatk, libxkbcommon, etc).
    const executablePath = await chromium.executablePath()
    console.log('[pdf] chromium executablePath:', executablePath)
    console.log('[pdf] graphics:', chromium.graphics)
    console.log('[pdf] args count:', chromium.args.length)
    console.log('[pdf] LD_LIBRARY_PATH:', process.env.LD_LIBRARY_PATH)
    console.log('[pdf] FONTCONFIG_PATH:', process.env.FONTCONFIG_PATH)

    return puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      executablePath,
      headless: true,
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
