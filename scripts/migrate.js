/* Cria/atualiza o schema no Neon Postgres. Uso: npm run migrate */
try {
  process.loadEnvFile(".env.local");
} catch {}
try {
  process.loadEnvFile(".env.development.local");
} catch {}

const { sql } = await import("../lib/db.js");

await sql`
  CREATE TABLE IF NOT EXISTS products (
    id          serial PRIMARY KEY,
    slug        text UNIQUE NOT NULL,
    name        text NOT NULL,
    description text,
    price       numeric(10,2) NOT NULL,
    compare     numeric(10,2),
    cat         text NOT NULL,
    tags        text[] NOT NULL DEFAULT '{}',
    gen         text,
    qty         int,
    img         text,
    img2        text,
    stock       int,
    active      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS orders (
    id               serial PRIMARY KEY,
    public_id        text UNIQUE NOT NULL,
    customer_name    text NOT NULL,
    customer_email   text NOT NULL,
    customer_phone   text,
    customer_cpf     text NOT NULL,
    address          jsonb NOT NULL,
    shipping_region  text,
    shipping_cost    numeric(10,2) NOT NULL DEFAULT 0,
    subtotal         numeric(10,2) NOT NULL,
    total            numeric(10,2) NOT NULL,
    payment_method   text NOT NULL,
    status           text NOT NULL DEFAULT 'pendente',
    asaas_payment_id text,
    asaas_customer_id text,
    pix_qr           text,
    pix_payload      text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    paid_at          timestamptz
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS order_items (
    id         serial PRIMARY KEY,
    order_id   int NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id int REFERENCES products(id),
    name       text NOT NULL,
    price      numeric(10,2) NOT NULL,
    qty        int NOT NULL
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS shipping_zones (
    region     text PRIMARY KEY,
    label      text NOT NULL,
    cost       numeric(10,2) NOT NULL,
    free_above numeric(10,2),
    sort       int NOT NULL DEFAULT 0
  )
`;

await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS img2 text`;
await sql`CREATE INDEX IF NOT EXISTS idx_orders_asaas ON orders (asaas_payment_id)`;
await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)`;

/* frete padrão por região — a dona edita no admin */
const zonas = [
  ["nordeste", "Nordeste", 16.9, null, 1],
  ["norte", "Norte", 24.9, null, 2],
  ["centro-oeste", "Centro-Oeste", 21.9, null, 3],
  ["sudeste", "Sudeste", 19.9, null, 4],
  ["sul", "Sul", 22.9, null, 5],
];
for (const [region, label, cost, freeAbove, sort] of zonas) {
  await sql`
    INSERT INTO shipping_zones (region, label, cost, free_above, sort)
    VALUES (${region}, ${label}, ${cost}, ${freeAbove}, ${sort})
    ON CONFLICT (region) DO NOTHING
  `;
}

console.log("✓ Schema criado/atualizado com sucesso.");
