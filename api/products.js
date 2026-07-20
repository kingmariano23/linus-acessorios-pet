/* GET /api/products — catálogo público (só produtos ativos) */
import { sql } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });
  try {
    const rows = await sql`
      SELECT slug, name, description, price::float, compare::float, cat, tags, gen, qty, img, img2, stock
      FROM products
      WHERE active
      ORDER BY cat, name
    `;
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(rows);
  } catch (err) {
    console.error("products:", err);
    return res.status(500).json({ error: "Erro ao carregar o catálogo" });
  }
}
