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
  // A chave DEVE ser a rota canônica do manifest
  // (.next/app-path-routes-manifest.json → "/api/orcamentos/[id]/pdf"),
  // NÃO o caminho do arquivo. Com o caminho de arquivo o glob não casava
  // e os binários .br (lidos em runtime via lambdafs, invisíveis ao tracer
  // estático) não eram copiados para a Function — causando
  // "The input directory .../@sparticuz/chromium/bin does not exist".
  // Fallback aprovado: a chave exata "/api/orcamentos/[id]/pdf" não casava
  // (o Next interpreta "[id]" como classe de caractere no glob → 0 refs no
  // trace). O glob "/api/orcamentos/**" casa com a rota com certeza; o custo
  // é incluir os binários do Chromium apenas nas Functions de /api/orcamentos/*.
  outputFileTracingIncludes: {
    '/api/orcamentos/**': [
      './node_modules/@sparticuz/chromium/bin/**',
    ],
  },
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
}

export default nextConfig
