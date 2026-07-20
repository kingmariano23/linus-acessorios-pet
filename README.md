# Linus Acessórios Pet — E-commerce

Loja online completa da **Linus Acessórios Pet** — ateliê de acessórios para pets em cartelas de 5 e 10 unidades (laços, gravatas, gargantilhas, bandanas e itens de penteado). Checkout transparente com **Pix e cartão de crédito via Asaas**, painel admin para a dona gerenciar produtos, pedidos e frete — e o WhatsApp continua como canal alternativo.

## Arquitetura

Diagramas completos (gerados com [Archify](https://github.com/tt-a1i/archify)) em [`docs/architecture/`](docs/architecture/):

- `linus-ecommerce.architecture.html` — visão geral do sistema
- `checkout.sequence.html` — sequência do checkout transparente

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS + JS estático (sem build), identidade do "patch costurado" |
| Backend | Vercel Serverless Functions (Node, `/api/*`) |
| Banco | Neon Postgres (integração Vercel Marketplace) |
| Fotos | Vercel Blob (uploads do admin) + `/assets/products` (catálogo original) |
| Pagamentos | Asaas — Pix (QR + copia-e-cola) e cartão transparente, webhook de confirmação |

## Páginas

| Página | Função |
|---|---|
| `index.html` | Catálogo com filtros, busca e **sacola de compras** |
| `checkout.html` | Checkout transparente: dados, endereço (ViaCEP), frete por região, Pix/cartão |
| `pedido.html?p=ID` | Acompanhamento do pedido: QR do Pix, confirmação automática |
| `admin.html` | Painel da dona: produtos (CRUD + fotos), pedidos, frete — protegido por senha |
| `links.html` | Página de links (estilo linktree) para a bio do Instagram |

## API

| Rota | Método | Função |
|---|---|---|
| `/api/products` | GET | Catálogo público (produtos ativos) |
| `/api/shipping` | GET | Tabela de frete por região |
| `/api/checkout` | POST | Cria pedido + cobrança no Asaas (preços validados no servidor) |
| `/api/order-status?id=` | GET | Status público do pedido |
| `/api/asaas-webhook` | POST | Confirmação de pagamento (token secreto) |
| `/api/admin/*` | * | Login, CRUD de produtos, upload de fotos, pedidos, frete |

## Variáveis de ambiente

| Variável | O que é |
|---|---|
| `DATABASE_URL` | Neon Postgres (criada pela integração da Vercel) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (criada ao linkar o store) |
| `ADMIN_PASSWORD` | Senha do painel admin |
| `SESSION_SECRET` | Assinatura do cookie de sessão do admin |
| `ASAAS_API_KEY` | Chave da API do Asaas |
| `ASAAS_ENV` | `production` para valer dinheiro de verdade; qualquer outro valor = sandbox |
| `ASAAS_WEBHOOK_TOKEN` | Token conferido no webhook (configure o mesmo valor no painel do Asaas) |

## Rodando localmente

```bash
npm install
vercel env pull .env.local   # puxa as variáveis do projeto
npm run migrate              # cria as tabelas
npm run seed                 # importa os produtos do products.js
vercel dev                   # http://localhost:3000
```

## Deploy

Deploy automático: cada push na branch `main` publica em produção via integração GitHub ↔ Vercel.

## Contato da loja

- WhatsApp: [(84) 99682-7176](https://wa.me/5584996827176)
- Instagram: [@linus.acessoriospet](https://instagram.com/linus.acessoriospet)
