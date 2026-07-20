/* GET /api/order-status?id=LPxxxx — status público do pedido (para a tela de sucesso/PIX) */
import { sql } from "../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });
  const id = String(req.query.id || "");
  if (!/^LP[0-9A-F]{10}$/.test(id)) return res.status(400).json({ error: "Pedido inválido" });

  try {
    const [pedido] = await sql`
      SELECT public_id, status, payment_method, subtotal::float, shipping_cost::float, total::float,
             pix_qr, pix_payload, created_at, paid_at
      FROM orders WHERE public_id = ${id}
    `;
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

    const itens = await sql`
      SELECT i.name, i.price::float, i.qty
      FROM order_items i JOIN orders o ON o.id = i.order_id
      WHERE o.public_id = ${id}
    `;
    return res.status(200).json({ ...pedido, items: itens });
  } catch (err) {
    console.error("order-status:", err);
    return res.status(500).json({ error: "Erro ao consultar o pedido" });
  }
}
