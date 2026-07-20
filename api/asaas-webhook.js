/* POST /api/asaas-webhook — confirma pagamentos. Valida o token secreto configurado no painel do Asaas. */
import { sql } from "../lib/db.js";

const MAPA_STATUS = {
  PAYMENT_CONFIRMED: "pago",
  PAYMENT_RECEIVED: "pago",
  PAYMENT_REFUNDED: "estornado",
  PAYMENT_OVERDUE: "expirado",
  PAYMENT_DELETED: "cancelado",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!esperado || req.headers["asaas-access-token"] !== esperado)
    return res.status(401).json({ error: "Token inválido" });

  try {
    const { event, payment } = req.body || {};
    const novo = MAPA_STATUS[event];
    if (!novo || !payment?.id) return res.status(200).json({ ok: true, ignored: true });

    if (novo === "pago") {
      const rows = await sql`
        UPDATE orders SET status = 'pago', paid_at = COALESCE(paid_at, now())
        WHERE asaas_payment_id = ${payment.id} AND status <> 'pago'
        RETURNING id
      `;
      for (const r of rows) {
        await sql`
          UPDATE products p SET stock = p.stock - i.qty
          FROM order_items i
          WHERE i.order_id = ${r.id} AND i.product_id = p.id AND p.stock IS NOT NULL
        `;
      }
    } else {
      await sql`UPDATE orders SET status = ${novo} WHERE asaas_payment_id = ${payment.id} AND status <> 'pago'`;
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("asaas-webhook:", err);
    /* 500 faz o Asaas reenviar o evento depois */
    return res.status(500).json({ error: "Erro interno" });
  }
}
