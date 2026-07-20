/* GET /api/shipping — tabela de frete por região (pública) */
import { sql } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });
  try {
    const rows = await sql`
      SELECT region, label, cost::float, free_above::float
      FROM shipping_zones
      ORDER BY sort
    `;
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(rows);
  } catch (err) {
    console.error("shipping:", err);
    return res.status(500).json({ error: "Erro ao carregar o frete" });
  }
}
