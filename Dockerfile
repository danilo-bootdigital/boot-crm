FROM node:20-alpine AS base

# Instalar dependências
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_PUBLIC_SUPABASE_URL=https://zjhapezbcqoqwrwolcju.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqaGFwZXpiY3FvcXdyd29sY2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjI3NzEsImV4cCI6MjA5NDAzODc3MX0.ANkRf5Z6T4LdqUOtfPK7EVbZjah03BbBURrGKl2ZK_0
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Produção
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SUPABASE_URL=https://zjhapezbcqoqwrwolcju.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqaGFwZXpiY3FvcXdyd29sY2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NjI3NzEsImV4cCI6MjA5NDAzODc3MX0.ANkRf5Z6T4LdqUOtfPK7EVbZjah03BbBURrGKl2ZK_0
ENV SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqaGFwZXpiY3FvcXdyd29sY2p1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ2Mjc3MSwiZXhwIjoyMDk0MDM4NzcxfQ.CX_bGtp9ueJ2JRSE0qFE61NPjL8WkbABF6fI3E9T73Y

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
