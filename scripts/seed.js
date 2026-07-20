/* Importa os 77 produtos do products.js para o Postgres. Uso: npm run seed */
import { readFileSync } from "node:fs";

try {
  process.loadEnvFile(".env.local");
} catch {}
try {
  process.loadEnvFile(".env.development.local");
} catch {}

const { sql } = await import("../lib/db.js");

const raw = readFileSync(new URL("../products.js", import.meta.url), "utf8");
const json = raw.replace(/^\s*const\s+PRODUCTS\s*=\s*/, "").replace(/;\s*$/, "");
const products = JSON.parse(json);

let inseridos = 0;
let atualizados = 0;
for (const p of products) {
  const rows = await sql`
    INSERT INTO products (slug, name, price, compare, cat, tags, gen, qty, img)
    VALUES (${p.slug}, ${p.name}, ${p.price}, ${p.compare}, ${p.cat}, ${p.tags}, ${p.gen}, ${p.qty}, ${p.img})
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      compare = EXCLUDED.compare,
      cat = EXCLUDED.cat,
      tags = EXCLUDED.tags,
      gen = EXCLUDED.gen,
      qty = EXCLUDED.qty,
      img = EXCLUDED.img,
      updated_at = now()
    RETURNING (xmax = 0) AS inserted
  `;
  rows[0].inserted ? inseridos++ : atualizados++;
}

const [{ count }] = await sql`SELECT count(*)::int AS count FROM products`;
console.log(`✓ Seed concluído: ${inseridos} inseridos, ${atualizados} atualizados. Total no banco: ${count}.`);
