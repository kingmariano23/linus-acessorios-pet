/* Conexão com o Neon Postgres (via integração da Vercel) — inicialização preguiçosa */
import { neon } from "@neondatabase/serverless";

let _sql = null;

function conectar() {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Provisione o Neon Postgres na Vercel (aba Storage) e rode `vercel env pull`."
    );
  }
  return neon(url);
}

/** Tagged template: sql`SELECT ...` — conecta na primeira query. */
export function sql(strings, ...values) {
  if (!_sql) _sql = conectar();
  return _sql(strings, ...values);
}
