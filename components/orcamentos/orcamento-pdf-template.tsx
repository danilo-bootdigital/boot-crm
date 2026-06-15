// Template HTML/Tailwind para preview/PDF de orçamento.
// Server Component puro: sem 'use client', sem hooks, sem estado.
// Estrutura: Grid + Flexbox + fluxo natural. Zero position:absolute estrutural.
// Fidelidade visual à imagem aprovada, sem rigidez de coordenadas.

import {
  User,
  FileText,
  Truck,
  ShoppingCart,
  ClipboardList,
  MessageSquare,
  Info,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  UserCircle2,
} from 'lucide-react'

// Aliases semânticos (sem renomear imports para evitar shadowing).
const IconeCliente = User
const IconeDocumento = FileText
const IconeCaminhao = Truck
const IconeCarrinho = ShoppingCart
const IconeDocTexto = ClipboardList
const IconeBalao = MessageSquare
const IconeInfo = Info
const IconePin = MapPin
const IconeTelefone = Phone
const IconeEmail = Mail
const IconeGlobo = Globe
const IconeCalendario = Calendar
const IconeNota = FileText
const IconeUsuario = UserCircle2

// Ícone Instagram não está disponível no lucide-react 1.17; mantido como SVG inline
// (regra da auditoria rápida: não adicionar nova dependência).
const IconeInstagram = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

type OrcamentoItem = {
  id: string
  descricao: string
  quantidade: number
  preco_unitario: number
  desconto_item: number
  subtotal: number
  product_id: string | null
  marca?: string | null
  codigo?: string | null
  unidade?: string | null
}

type OrcamentoTemplateData = {
  id: string
  numero: number
  status: string
  criado_em: string
  responsavel: { nome: string } | null
  lead: {
    id: string
    nome: string
    telefone: string
    email: string
    endereco: string
    cpf_cnpj: string
  } | null
  contato: {
    id: string
    nome: string
    telefone: string | null
    email: string | null
    cpf_cnpj: string | null
    cargo: string | null
    tipo_pessoa: string | null
    categoria_cliente: string | null
    especialidade: string | null
    tipo_conselho: string | null
    numero_conselho: string | null
    uf_conselho: string | null
    observacoes: string | null
    empresa_id: string | null
    empresa: { id: string; nome: string } | null
    endereco: string | null
    endereco_numero: string | null
    endereco_complemento: string | null
    endereco_bairro: string | null
    endereco_cidade: string | null
    endereco_estado: string | null
    endereco_cep: string | null
  } | null
  deal: { id: string; titulo: string; contato_id: string } | null
  aprovador: { nome: string } | null
  fornecedor: {
    id: string
    nome: string
    hub_id: string | null
    health_hubs: { id: string; nome: string; logo_url: string | null } | null
  } | null
  carrier: { nome: string } | null
  organizacao: {
    nome: string
    nome_fantasia: string | null
    cnpj: string | null
    telefone: string | null
    email: string | null
    endereco: string | null
    logo_url: string | null
    site: string | null
    instagram: string | null
  } | null
  itens: OrcamentoItem[]
  valor_subtotal: number
  desconto_geral: number
  frete: number
  frete_regiao: string | null
  endereco_entrega: string | null
  forma_pagamento: string | null
  valor_total: number
  observacoes: string | null
  nota_tipo_pessoa: string | null
  nota_nome: string | null
  nota_documento: string | null
  nota_razao_social: string | null
  nota_nome_fantasia: string | null
  nota_endereco: string | null
  nota_ie: string | null
  nota_im: string | null
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n ?? 0)

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR')
  } catch {
    return iso
  }
}

const formatDocumento = (doc: string | null | undefined) => {
  if (!doc) return '—'
  const d = doc.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return doc
}

const formatPhone = (phone: string | null | undefined) => {
  if (!phone) return '—'
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return phone
}

const formatCEP = (cep: string | null | undefined) => {
  if (!cep) return ''
  const d = cep.replace(/\D/g, '')
  if (d.length === 8) return d.replace(/(\d{5})(\d{3})/, '$1-$2')
  return cep
}

const laboratorioItem = (
  item: OrcamentoItem,
  fornecedor: OrcamentoTemplateData['fornecedor']
): string => {
  if (item.marca && item.marca.trim()) return item.marca
  if (fornecedor?.nome) return fornecedor.nome
  return '—'
}

function CampoRotulo({ rotulo, valor, valorNegrito = true }: { rotulo: string; valor?: string | null; valorNegrito?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{rotulo}</span>
      <span className={`text-[12px] text-slate-800 break-words ${valorNegrito ? 'font-bold' : 'font-normal'}`}>
        {valor || '—'}
      </span>
    </div>
  )
}

function Cabecalho({ data }: { data: OrcamentoTemplateData }) {
  const org = data.organizacao
  return (
    <header className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b-2 border-emerald-700 pb-4">
      {/* Bloco esquerda: logo + empresa */}
      <div className="md:col-span-5 flex flex-col gap-1">
        {org?.logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={org.logo_url}
            alt={org.nome_fantasia || org.nome || 'Logo'}
            className="h-12 w-auto object-contain self-start"
          />
        ) : (
          <div className="text-2xl font-extrabold text-slate-800">
            {(org?.nome_fantasia || org?.nome || 'DPRIME').split(' ')[0]}
            <span className="text-emerald-700">
              {(org?.nome_fantasia || org?.nome || 'DPRIME').split(' ').slice(1).join(' ')}
            </span>
          </div>
        )}
        <div className="text-[15px] font-bold text-emerald-700 mt-1">Representação Farmacêutica</div>
      </div>

      {/* Bloco centro: contatos */}
      <div className="md:col-span-4 flex flex-col gap-1.5 text-[11px] text-slate-700 md:border-l md:border-slate-200 md:pl-4">
        {org?.telefone && (
          <div className="flex items-center gap-2">
            <span className="text-emerald-700" aria-hidden><IconeTelefone /></span>
            <span>{org.telefone}</span>
          </div>
        )}
        {org?.email && (
          <div className="flex items-center gap-2 break-all">
            <span className="text-emerald-700" aria-hidden><IconeEmail /></span>
            <span>{org.email}</span>
          </div>
        )}
        {org?.site && (
          <div className="flex items-center gap-2 break-all">
            <span className="text-emerald-700" aria-hidden><IconeGlobo /></span>
            <span>{org.site}</span>
          </div>
        )}
        {org?.instagram && (
          <div className="flex items-center gap-2">
            <span className="text-emerald-700" aria-hidden><IconeInstagram /></span>
            <span>{org.instagram}</span>
          </div>
        )}
      </div>

      {/* Bloco direita: ORÇAMENTO + dados */}
      <div className="md:col-span-3 flex flex-col items-start md:items-end gap-1.5">
        <h1 className="text-3xl font-extrabold text-emerald-700 leading-none">ORÇAMENTO</h1>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="text-emerald-700" aria-hidden><IconeCalendario /></span>
          <span>Data: <strong className="text-slate-800">{formatDate(data.criado_em)}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="text-emerald-700" aria-hidden><IconeNota /></span>
          <span>Proposta: <strong className="text-slate-800">{data.numero}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span className="text-emerald-700" aria-hidden><IconeUsuario /></span>
          <span>Vendedor: <strong className="text-slate-800">{data.responsavel?.nome || '—'}</strong></span>
        </div>
      </div>
    </header>
  )
}

function SecaoCards({ data }: { data: OrcamentoTemplateData }) {
  const cliente = data.contato || data.lead
  const isPF = data.nota_tipo_pessoa === 'PF'
  const temNota = !!(data.nota_nome || data.nota_documento)

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-3 print:break-inside-avoid">
      {/* Card 1: DADOS DO CLIENTE / CONTATO */}
      <article className="border border-emerald-200 rounded-md overflow-hidden bg-white">
        <div className="bg-emerald-700 text-white px-3 py-2 flex items-center gap-2">
          <IconeCliente />
          <h2 className="text-[11px] font-bold tracking-wide">DADOS DO CLIENTE / CONTATO</h2>
        </div>
        <div className="p-3 flex flex-col gap-2.5">
          <CampoRotulo rotulo="Nome" valor={cliente?.nome} />
          <CampoRotulo rotulo="CPF" valor={formatDocumento(data.contato?.cpf_cnpj || data.lead?.cpf_cnpj)} />
          <CampoRotulo rotulo="E-mail" valor={data.contato?.email || data.lead?.email} />
          <CampoRotulo rotulo="Telefone" valor={formatPhone(data.contato?.telefone || data.lead?.telefone)} />
          <CampoRotulo rotulo="Cargo" valor={data.contato?.cargo} />
          {data.contato?.especialidade && (
            <CampoRotulo rotulo="Especialidade" valor={data.contato.especialidade} valorNegrito={false} />
          )}
          {data.contato?.tipo_conselho && data.contato?.numero_conselho && (
            <CampoRotulo
              rotulo="Conselho / Nº"
              valor={`${data.contato.tipo_conselho} ${data.contato.numero_conselho}${data.contato.uf_conselho ? '-' + data.contato.uf_conselho : ''}`}
            />
          )}
          {data.contato?.tipo_pessoa && (
            <CampoRotulo
              rotulo="Tipo de pessoa"
              valor={data.contato.tipo_pessoa === 'PF' ? 'PF - Médico' : data.contato.tipo_pessoa}
            />
          )}
          {data.contato?.endereco && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Endereço</span>
              <span className="text-[11px] text-slate-800 break-words">
                {data.contato.endereco}
                {data.contato.endereco_numero ? `, ${data.contato.endereco_numero}` : ''}
                {data.contato.endereco_bairro ? ` • ${data.contato.endereco_bairro}` : ''}
                {data.contato.endereco_cidade ? ` • ${data.contato.endereco_cidade}` : ''}
                {data.contato.endereco_estado ? `-${data.contato.endereco_estado}` : ''}
                {data.contato.endereco_cep ? ` • ${formatCEP(data.contato.endereco_cep)}` : ''}
              </span>
            </div>
          )}
        </div>
      </article>

      {/* Card 2: DADOS PARA EMISSÃO DA NOTA */}
      {temNota && (
        <article className="border border-emerald-200 rounded-md overflow-hidden bg-white">
          <div className="bg-emerald-700 text-white px-3 py-2 flex items-center gap-2">
            <IconeDocumento />
            <h2 className="text-[11px] font-bold tracking-wide">DADOS PARA EMISSÃO DA NOTA</h2>
          </div>
          <div className="p-3 flex flex-col gap-2.5">
            <CampoRotulo rotulo="Tipo" valor={isPF ? 'Pessoa Física' : 'Pessoa Jurídica'} />
            <CampoRotulo rotulo="Nome" valor={data.nota_nome || ''} />
            <CampoRotulo rotulo={isPF ? 'CPF' : 'CNPJ'} valor={formatDocumento(data.nota_documento)} />
            <CampoRotulo rotulo="E-mail" valor={data.contato?.email} />
            <CampoRotulo rotulo="Telefone" valor={formatPhone(data.contato?.telefone)} />
            {data.nota_endereco && (
              <CampoRotulo rotulo="Endereço" valor={data.nota_endereco} valorNegrito={false} />
            )}
          </div>
          {isPF && (
            <div className="mx-3 mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-800 flex gap-2">
              <span className="shrink-0 mt-0.5"><IconeInfo /></span>
              <span>Para Pessoa Física, os dados da nota fiscal são utilizados conforme o cadastro do contato.</span>
            </div>
          )}
        </article>
      )}

      {/* Card 3: ENDEREÇO DE ENTREGA — sempre visível */}
      <article className="border border-emerald-200 rounded-md overflow-hidden bg-white">
        <div className="bg-emerald-700 text-white px-3 py-2 flex items-center gap-2">
          <IconeCaminhao />
          <h2 className="text-[11px] font-bold tracking-wide">ENDEREÇO DE ENTREGA</h2>
        </div>
        <div className="p-3 flex flex-col gap-2.5">
          <CampoRotulo rotulo="Nome / Destinatário" valor={cliente?.nome} />
          <CampoRotulo rotulo="Telefone" valor={formatPhone(data.contato?.telefone)} />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Endereço</span>
            <span className="text-[11px] text-slate-800 whitespace-pre-wrap break-words">
              {(() => {
                if (data.endereco_entrega && data.endereco_entrega.trim().length > 0) return data.endereco_entrega
                if (data.contato?.endereco) return 'Mesmo endereço do cliente'
                return 'Não informado'
              })()}
            </span>
          </div>
          {data.contato?.endereco_bairro && <CampoRotulo rotulo="Bairro" valor={data.contato.endereco_bairro} />}
          {data.contato?.endereco_cidade && (
            <CampoRotulo
              rotulo="Cidade / UF"
              valor={`${data.contato.endereco_cidade}${data.contato.endereco_estado ? ' - ' + data.contato.endereco_estado : ''}`}
            />
          )}
          {data.contato?.endereco_cep && <CampoRotulo rotulo="CEP" valor={formatCEP(data.contato.endereco_cep)} />}
          {data.contato?.observacoes && (
            <CampoRotulo rotulo="Observações" valor={data.contato.observacoes} valorNegrito={false} />
          )}
        </div>
      </article>
    </section>
  )
}

function SecaoProdutos({ itens, fornecedor }: { itens: OrcamentoItem[]; fornecedor: OrcamentoTemplateData['fornecedor'] }) {
  return (
    <section className="flex flex-col gap-0 print:break-inside-avoid">
      <div className="bg-emerald-700 text-white px-3 py-2 rounded-t-md flex items-center gap-2">
        <IconeCarrinho />
        <h2 className="text-[11px] font-bold tracking-wide">PRODUTOS</h2>
      </div>
      <div className="border border-t-0 border-emerald-200 rounded-b-md overflow-hidden bg-white">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-emerald-700 text-white">
              <th className="px-2 py-1.5 text-center w-8 font-bold">#</th>
              <th className="px-2 py-1.5 text-left font-bold">DESCRIÇÃO</th>
              <th className="px-2 py-1.5 text-left font-bold">APRESENTAÇÃO</th>
              <th className="px-2 py-1.5 text-center w-12 font-bold">QTD</th>
              <th className="px-2 py-1.5 text-right w-24 font-bold">VALOR UNIT.</th>
              <th className="px-2 py-1.5 text-center w-16 font-bold">DESC.</th>
              <th className="px-2 py-1.5 text-right w-28 font-bold">VALOR TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, idx) => (
              <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-2 py-2 text-center align-top font-bold border-t border-slate-200">{idx + 1}</td>
                <td className="px-2 py-2 align-top border-t border-slate-200">
                  <div className="font-bold text-slate-800">{item.descricao}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Laboratório: {laboratorioItem(item, fornecedor)}</div>
                </td>
                <td className="px-2 py-2 align-top text-slate-700 border-t border-slate-200">
                  {item.unidade || '—'}
                </td>
                <td className="px-2 py-2 text-center align-top text-slate-700 border-t border-slate-200">
                  {item.quantidade}
                </td>
                <td className="px-2 py-2 text-right align-top text-slate-700 border-t border-slate-200">
                  {formatBRL(item.preco_unitario)}
                </td>
                <td className="px-2 py-2 text-center align-top text-slate-700 border-t border-slate-200">
                  {item.desconto_item > 0 ? `${item.desconto_item}%` : '—'}
                </td>
                <td className="px-2 py-2 text-right align-top font-bold text-slate-800 border-t border-slate-200">
                  {formatBRL(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SecaoTotais({ data }: { data: OrcamentoTemplateData }) {
  return (
    <section className="flex justify-end print:break-inside-avoid">
      <div className="w-full md:w-1/2 lg:w-5/12 border border-emerald-200 rounded-md bg-white">
        <div className="px-3 py-2 flex justify-between text-[11px] text-slate-700 border-b border-slate-200">
          <span>SUBTOTAL</span>
          <span className="font-semibold">{formatBRL(data.valor_subtotal)}</span>
        </div>
        <div className="px-3 py-2 flex justify-between text-[11px] text-slate-700 border-b border-slate-200">
          <span>DESCONTO</span>
          <span className="font-semibold">{formatBRL(0)}</span>
        </div>
        <div className="px-3 py-2 flex justify-between text-[11px] text-slate-700 border-b border-slate-200">
          <span>FRETE</span>
          <span className="font-semibold">{formatBRL(data.frete)}</span>
        </div>
        <div className="bg-emerald-700 text-white px-3 py-2.5 flex justify-between items-center rounded-b-md">
          <span className="text-[12px] font-bold tracking-wide">TOTAL</span>
          <span className="text-base font-extrabold">{formatBRL(data.valor_total)}</span>
        </div>
      </div>
    </section>
  )
}

function SecaoCondicoes({ data }: { data: OrcamentoTemplateData }) {
  const org = data.organizacao
  const condicoes = [
    { rotulo: 'Condição de pagamento', valor: data.forma_pagamento || 'A combinar' },
    { rotulo: 'Prazo de produção', valor: 'Até 5 dias úteis' },
    { rotulo: 'Prazo de entrega', valor: 'A combinar' },
    { rotulo: 'Validade da proposta', valor: '30 dias' },
    { rotulo: 'Frete', valor: 'Por conta do comprador' },
    { rotulo: 'Impostos', valor: 'Inclusos' },
    { rotulo: 'Observações', valor: '—' },
  ]
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-3 print:break-inside-avoid">
      <article className="border border-emerald-200 rounded-md bg-white">
        <div className="bg-emerald-700 text-white px-3 py-2 flex items-center gap-2">
          <IconeDocTexto />
          <h2 className="text-[11px] font-bold tracking-wide">CONDIÇÕES COMERCIAIS</h2>
        </div>
        <div className="p-3 flex flex-col gap-1.5 text-[11px]">
          {condicoes.map((c) => (
            <div key={c.rotulo} className="flex items-baseline gap-2">
              <span className="font-bold text-slate-700 shrink-0">{c.rotulo}:</span>
              <span className="flex-1 border-b border-dotted border-slate-300 translate-y-0.5" aria-hidden />
              <span className="text-slate-800 text-right">{c.valor}</span>
            </div>
          ))}
        </div>
      </article>
      <article className="border border-emerald-200 rounded-md bg-white">
        <div className="bg-emerald-700 text-white px-3 py-2 flex items-center gap-2">
          <IconeBalao />
          <h2 className="text-[11px] font-bold tracking-wide">OBSERVAÇÕES</h2>
        </div>
        <div className="p-3 text-[11px] text-slate-700 flex flex-col gap-1.5 whitespace-pre-wrap break-words">
          <p>Proposta válida mediante confirmação de estoque.</p>
          <p>Valores sujeitos à alteração sem aviso prévio.</p>
          <p>Para confirmar o pedido, entre em contato com o seu representante.</p>
          {data.observacoes && <p className="text-slate-800">{data.observacoes}</p>}
        </div>
      </article>
    </section>
  )
}

function Rodape({ org }: { org: OrcamentoTemplateData['organizacao'] }) {
  return (
    <footer className="bg-emerald-700 text-white px-3 py-2 rounded-md flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] print:break-inside-avoid">
      <span className="flex items-center gap-1.5">
        <IconePin />
        <span>{org?.nome || 'DPRIME Representação Farmacêutica LTDA'}</span>
      </span>
      {org?.cnpj && <span>CNPJ: {org.cnpj}</span>}
      {org?.endereco && <span>{org.endereco}</span>}
      {org?.email && <span>{org.email}</span>}
    </footer>
  )
}

export function OrcamentoPdfTemplate({ data }: { data: OrcamentoTemplateData }) {
  return (
    <article
      data-pdf-template="ready"
      className="grid gap-4 p-6 bg-white text-slate-800"
    >
      <Cabecalho data={data} />
      <SecaoCards data={data} />
      <SecaoProdutos itens={data.itens} fornecedor={data.fornecedor} />
      <SecaoTotais data={data} />
      <SecaoCondicoes data={data} />
      <Rodape org={data.organizacao} />
    </article>
  )
}
