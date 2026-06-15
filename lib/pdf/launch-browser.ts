// Lança uma instância do Chromium compatível com o ambiente atual.
// - Em produção (Vercel/Fluid Compute): usa @sparticuz/chromium (empacotado).
// - Em dev local: tenta CHROME_PATH (env) ou cai no Chromium do sistema.
//
// IMPORTANTE (Vercel Fluid Compute):
// @sparticuz/chromium decide se extrai al2.tar.br (que contém libnss3.so,
// libatk, libxkbcommon, etc) checando helper.isRunningInAwsLambda() que
// verifica process.env.AWS_EXECUTION_ENV. No Vercel Fluid Compute essa
// env var NÃO existe, então as libs nunca são extraídas e o binário
// falha com "error while loading shared libraries: libnss3.so".
//
// Workaround: chamamos setupLambdaEnvironment(baseLibPath) passando o
// caminho após extrair al2.tar.br via lambdafs.inflate().

import puppeteer, { type Browser } from 'puppeteer-core'
import helper from '@sparticuz/chromium/build/helper.js'
import lambdafsMod from '@sparticuz/chromium/build/lambdafs.js'
import { join, dirname } from 'node:path'

const lambdafs = (lambdafsMod as { default?: { inflate: (p: string) => Promise<string> } }).default
  ?? (lambdafsMod as unknown as { inflate: (p: string) => Promise<string> })

const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL_ENV

export async function launchBrowser(): Promise<Browser> {
  if (isVercel) {
    const chromium = (await import('@sparticuz/chromium')).default

    // 1) Configura headless + graphics
    chromium.setHeadlessMode = true
    chromium.setGraphicsMode = false

    // 2) Resolve caminho do bin/ e extrai al2.tar.br manualmente
    //    (já que isRunningInAwsLambda() retorna false no Vercel Fluid Compute)
    const pkgUrl = new URL(import.meta.resolve('@sparticuz/chromium/package.json'))
    const binPath = join(dirname(pkgUrl.pathname), 'bin')
    const al2Path = await lambdafs.inflate(join(binPath, 'al2.tar.br'))
    console.log('[pdf] al2 libs extraídas em:', al2Path)

    // 3) Configura LD_LIBRARY_PATH / FONTCONFIG_PATH com base no diretório extraído
    helper.setupLambdaEnvironment(al2Path)
    console.log('[pdf] LD_LIBRARY_PATH:', process.env.LD_LIBRARY_PATH)
    console.log('[pdf] FONTCONFIG_PATH:', process.env.FONTCONFIG_PATH)

    // 4) Executa o chromium
    const executablePath = await chromium.executablePath()
    console.log('[pdf] chromium executablePath:', executablePath)

    return puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      executablePath,
      defaultViewport: chromium.defaultViewport,
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
