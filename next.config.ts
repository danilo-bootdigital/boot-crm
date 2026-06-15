import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // IMPORTANTE: NÃO usar 'standalone' aqui.
  //
  // O tracer estático de output: 'standalone' só copia arquivos JS que
  // são referenciados estaticamente pelo código. Os binários .br do
  // @sparticuz/chromium (chromium.br, al2023.tar.br, fonts.tar.br,
  // swiftshader.tar.br) são lidos em runtime via lambdafs.inflate() e
  // NÃO são detectados pelo tracer. Resultado: em produção, o
  // diretório bin/ não existe e a geração de PDF falha com
  // "input directory does not exist".
  //
  // Saída padrão (sem 'standalone') inclui TODO o node_modules no
  // bundle, garantindo que os binários cheguem na Vercel.
  //
  // O custo é um bundle ~50MB maior (Chromium inteiro), mas a Vercel
  // aceita e o cold start é similar.
  outputFileTracingIncludes: {
    './app/api/orcamentos/[id]/pdf/route.ts': [
      './node_modules/@sparticuz/chromium/bin/**/*',
      './node_modules/@sparticuz/chromium/package.json',
    ],
  },
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
}

export default nextConfig
