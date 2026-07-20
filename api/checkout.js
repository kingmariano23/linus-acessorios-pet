/* POST /api/checkout — cria o pedido e a cobrança transparente no Asaas (PIX ou cartão) */
import crypto from "node:crypto";
import { sql } from "../lib/db.js";
import { ensureCustomer, createPixPayment, createCardPayment } from "../lib/asaas.js";

const REGIAO_POR_UF = {
  AC: "norte", AP: "norte", AM: "norte", PA: "norte", RO: "norte", RR: "norte", TO: "norte",
  AL: "nordeste", BA: "nordeste", CE: "nordeste", MA: "nordeste", PB: "nordeste",
  PE: "nordeste", PI: "nordeste", RN: "nordeste", SE: "nordeste",
  DF: "centro-oeste", GO: "centro-oeste", MT: "centro-oeste", MS: "centro-oeste",
  ES: "sudeste", MG: "sudeste", RJ: "sudeste", SP: "sudeste",
  PR: "sul", RS: "sul", SC: "sul",
};

const publicId = () => "LP" + crypto.randomBytes(5).toString("hex").toUpperCase();
const round2 = (v) => Math.round(v * 100) / 100;
const cpfValido = (cpf) => /^\d{11}$/.test((cpf || "").replace(/\D/g, ""));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { items, customer, address, payment } = req.body || {};

    /* validações */
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Carrinho vazio" });
    if (!customer?.name || !customer?.email || !cpfValido(customer?.cpf))
      return res.status(400).json({ error: "Preencha nome, e-mail e um CPF válido" });
    const uf = (address?.uf || "").toUpperCase();
    if (!REGIAO_POR_UF[uf] || !address?.cep || !address?.logradouro || !address?.numero || !address?.cidade)
      return res.status(400).json({ error: "Endereço incompleto" });
    if (!["PIX", "CARD"].includes(payment?.method))
      return res.status(400).json({ error: "Escolha PIX ou cartão" });

    /* preços vêm do banco, nunca do cliente */
    const slugs = items.map((i) => String(i.slug));
    const produtos = await sql`
      SELECT id, slug, name, price::float, stock FROM products WHERE active AND slug = ANY(${slugs})
    `;
    const porSlug = Object.fromEntries(produtos.map((p) => [p.slug, p]));

    let subtotal = 0;
    const linhas = [];
    for (const item of items) {
      const p = porSlug[item.slug];
      const qty = Math.max(1, Math.min(99, parseInt(item.qty, 10) || 1));
      if (!p) return res.status(400).json({ error: `Produto indisponível: ${item.slug}` });
      if (p.stock !== null && p.stock < qty)
        return res.status(400).json({ error: `Estoque insuficiente de "${p.name}" (restam ${p.stock})` });
      subtotal += p.price * qty;
      linhas.push({ product_id: p.id, name: p.name, price: p.price, qty });
    }
    subtotal = round2(subtotal);

    /* frete por região */
    const regiao = REGIAO_POR_UF[uf];
    const [zona] = await sql`SELECT label, cost::float, free_above::float FROM shipping_zones WHERE region = ${regiao}`;
    if (!zona) return res.status(400).json({ error: "Região de entrega não configurada" });
    const frete = zona.free_above !== null && subtotal >= zona.free_above ? 0 : zona.cost;
    const total = round2(subtotal + frete);
    if (total < 5) return res.status(400).json({ error: "O pedido mínimo é R$ 5,00" });

    /* grava o pedido pendente */
    const pid = publicId();
    const [pedido] = await sql`
      INSERT INTO orders (public_id, customer_name, customer_email, customer_phone, customer_cpf,
                          address, shipping_region, shipping_cost, subtotal, total, payment_method)
      VALUES (${pid}, ${customer.name}, ${customer.email}, ${customer.phone || null},
              ${customer.cpf.replace(/\D/g, "")}, ${JSON.stringify(address)}, ${regiao},
              ${frete}, ${subtotal}, ${total}, ${payment.method})
      RETURNING id
    `;
    for (const l of linhas) {
      await sql`INSERT INTO order_items (order_id, product_id, name, price, qty)
                VALUES (${pedido.id}, ${l.product_id}, ${l.name}, ${l.price}, ${l.qty})`;
    }

    /* cobrança no Asaas */
    const asaasCustomer = await ensureCustomer(customer);
    const descricao = `Pedido ${pid} — Linus Acessórios Pet`;

    if (payment.method === "PIX") {
      const { payment: cobranca, qr } = await createPixPayment({
        customer: asaasCustomer,
        value: total,
        description: descricao,
        externalReference: pid,
      });
      await sql`UPDATE orders SET asaas_payment_id = ${cobranca.id}, asaas_customer_id = ${asaasCustomer},
                pix_qr = ${qr.encodedImage}, pix_payload = ${qr.payload} WHERE id = ${pedido.id}`;
      return res.status(200).json({ order: pid, status: "pendente", pix: { image: qr.encodedImage, payload: qr.payload } });
    }

    /* cartão transparente */
    const { card } = payment;
    if (!card?.number || !card?.holderName || !card?.expiryMonth || !card?.expiryYear || !card?.ccv)
      return res.status(400).json({ error: "Dados do cartão incompletos" });

    const remoteIp =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "";

    let cobranca;
    try {
      cobranca = await createCardPayment({
        customer: asaasCustomer,
        value: total,
        description: descricao,
        externalReference: pid,
        card: {
          holderName: card.holderName,
          number: String(card.number).replace(/\s/g, ""),
          expiryMonth: card.expiryMonth,
          expiryYear: card.expiryYear,
          ccv: card.ccv,
        },
        holderInfo: {
          name: customer.name,
          email: customer.email,
          cpfCnpj: customer.cpf.replace(/\D/g, ""),
          postalCode: address.cep.replace(/\D/g, ""),
          addressNumber: address.numero,
          phone: (customer.phone || "").replace(/\D/g, ""),
        },
        remoteIp,
      });
    } catch (err) {
      await sql`UPDATE orders SET status = 'recusado' WHERE id = ${pedido.id}`;
      return res.status(402).json({ error: `Pagamento recusado: ${err.message}`, order: pid });
    }

    const pago = ["CONFIRMED", "RECEIVED"].includes(cobranca.status);
    await sql`UPDATE orders SET asaas_payment_id = ${cobranca.id}, asaas_customer_id = ${asaasCustomer},
              status = ${pago ? "pago" : "pendente"}, paid_at = ${pago ? new Date().toISOString() : null}
              WHERE id = ${pedido.id}`;
    if (pago) await baixaEstoque(pedido.id);

    return res.status(200).json({ order: pid, status: pago ? "pago" : "pendente" });
  } catch (err) {
    console.error("checkout:", err);
    return res.status(500).json({ error: err.message || "Erro ao processar o pedido" });
  }
}

async function baixaEstoque(orderId) {
  await sql`
    UPDATE products p SET stock = p.stock - i.qty
    FROM order_items i
    WHERE i.order_id = ${orderId} AND i.product_id = p.id AND p.stock IS NOT NULL
  `;
}
