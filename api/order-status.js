/* GET /api/order-status?id=LPxxxx — status público do pedido (para a tela de sucesso/PIX).
 * No modo demonstração, pedidos PIX pendentes são confirmados sozinhos ~40s
 * depois da criação, simulando a chegada do webhook do Asaas. */
import { sql } from "../lib/db.js";

const DEMO_CONFIRMA_MS = 40 * 1000;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });
  const id = String(req.query.id || "");
  if (!/^LP[0-9A-F]{10}$/.test(id)) return res.status(400).json({ error: "Pedido inválido" });

  try {
    let [pedido] = await sql`
      SELECT id, public_id, status, payment_method, subtotal::float, shipping_cost::float, total::float,
             pix_qr, pix_payload, asaas_payment_id, created_at, paid_at
      FROM orders WHERE public_id = ${id}
    `;
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

    const demo = (pedido.asaas_payment_id || "").startsWith("mockpay_");

    /* modo demonstração: "webhook" chega sozinho */
    if (
      demo &&
      pedido.status === "pendente" &&
      Date.now() - new Date(pedido.created_at).getTime() > DEMO_CONFIRMA_MS
    ) {
      const rows = await sql`
        UPDATE orders SET status = 'pago', paid_at = COALESCE(paid_at, now())
        WHERE id = ${pedido.id} AND status = 'pendente'
        RETURNING id
      `;
      for (const r of rows) {
        await sql`
          UPDATE products p SET stock = p.stock - i.qty
          FROM order_items i
          WHERE i.order_id = ${r.id} AND i.product_id = p.id AND p.stock IS NOT NULL
        `;
      }
      pedido = { ...pedido, status: "pago", paid_at: new Date().toISOString() };
    }

    const itens = await sql`
      SELECT i.name, i.price::float, i.qty
      FROM order_items i JOIN orders o ON o.id = i.order_id
      WHERE o.public_id = ${id}
    `;
    const { id: _interno, asaas_payment_id: _asaas, ...publico } = pedido;
    return res.status(200).json({ ...publico, demo, items: itens });
  } catch (err) {
    console.error("order-status:", err);
    return res.status(500).json({ error: "Erro ao consultar o pedido" });
  }
}
