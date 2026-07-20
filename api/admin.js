/* /api/admin/* — login, CRUD de produtos, upload de fotos, pedidos e frete (tudo protegido) */
import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { sql } from "../lib/db.js";
import { requireAdmin, isAdmin, setSessionCookie, clearSessionCookie } from "../lib/auth.js";

export default async function handler(req, res) {
  /* rota vem do rewrite no vercel.json: /api/admin/(.*) → /api/admin?route=$1 */
  const rota_raw = String(req.query.route || req.query["...slug"] || req.query.slug || "");
  const [rota, id] = rota_raw.split("/").filter(Boolean);

  try {
    /* ── sessão ── */
    if (rota === "login" && req.method === "POST") {
      const senha = process.env.ADMIN_PASSWORD;
      if (!senha) return res.status(500).json({ error: "ADMIN_PASSWORD não configurada" });
      const tentativa = String(req.body?.password || "");
      const ok =
        tentativa.length === senha.length &&
        crypto.timingSafeEqual(Buffer.from(tentativa), Buffer.from(senha));
      if (!ok) {
        await new Promise((r) => setTimeout(r, 800));
        return res.status(401).json({ error: "Senha incorreta" });
      }
      setSessionCookie(res);
      return res.status(200).json({ ok: true });
    }
    if (rota === "logout" && req.method === "POST") {
      clearSessionCookie(res);
      return res.status(200).json({ ok: true });
    }
    if (rota === "session" && req.method === "GET") {
      return res.status(200).json({ ok: isAdmin(req) });
    }

    /* ── daqui pra baixo, só autenticado ── */
    if (!requireAdmin(req, res)) return;

    /* produtos */
    if (rota === "products" && !id && req.method === "GET") {
      const rows = await sql`
        SELECT id, slug, name, description, price::float, compare::float, cat, tags, gen, qty, img, img2, stock, active
        FROM products ORDER BY cat, name
      `;
      return res.status(200).json(rows);
    }
    if (rota === "products" && !id && req.method === "POST") {
      const p = validaProduto(req.body);
      if (p.error) return res.status(400).json({ error: p.error });
      const slugBase = slugify(p.name);
      const slugFinal = `${slugBase}-${crypto.randomBytes(2).toString("hex")}`;
      const [row] = await sql`
        INSERT INTO products (slug, name, description, price, compare, cat, tags, gen, qty, img, img2, stock, active)
        VALUES (${slugFinal}, ${p.name}, ${p.description}, ${p.price}, ${p.compare}, ${p.cat},
                ${p.tags}, ${p.gen}, ${p.qty}, ${p.img}, ${p.img2}, ${p.stock}, ${p.active})
        RETURNING id, slug
      `;
      return res.status(201).json(row);
    }
    if (rota === "products" && id && req.method === "PUT") {
      const p = validaProduto(req.body);
      if (p.error) return res.status(400).json({ error: p.error });
      const [row] = await sql`
        UPDATE products SET name = ${p.name}, description = ${p.description}, price = ${p.price},
          compare = ${p.compare}, cat = ${p.cat}, tags = ${p.tags}, gen = ${p.gen}, qty = ${p.qty},
          img = ${p.img}, img2 = ${p.img2}, stock = ${p.stock}, active = ${p.active}, updated_at = now()
        WHERE id = ${Number(id)} RETURNING id
      `;
      if (!row) return res.status(404).json({ error: "Produto não encontrado" });
      return res.status(200).json(row);
    }
    if (rota === "products" && id && req.method === "DELETE") {
      await sql`DELETE FROM products WHERE id = ${Number(id)}`;
      return res.status(200).json({ ok: true });
    }

    /* upload de foto → Vercel Blob */
    if (rota === "upload" && req.method === "POST") {
      const filename = String(req.query.filename || "foto.webp").replace(/[^\w.\-]/g, "_");
      const tipo = req.headers["content-type"] || "application/octet-stream";
      if (!/^image\//.test(tipo)) return res.status(400).json({ error: "Envie uma imagem" });
      const corpo = req.body;
      if (!corpo || !corpo.length) return res.status(400).json({ error: "Arquivo vazio" });
      if (corpo.length > 4.5 * 1024 * 1024) return res.status(413).json({ error: "Imagem acima de 4,5 MB" });
      const blob = await put(`produtos/${filename}`, corpo, {
        access: "public",
        addRandomSuffix: true,
        contentType: tipo,
      });
      return res.status(200).json({ url: blob.url });
    }

    /* pedidos */
    if (rota === "orders" && !id && req.method === "GET") {
      const rows = await sql`
        SELECT o.id, o.public_id, o.customer_name, o.customer_email, o.customer_phone,
               o.address, o.shipping_region, o.shipping_cost::float, o.subtotal::float, o.total::float,
               o.payment_method, o.status, o.created_at, o.paid_at,
               COALESCE(json_agg(json_build_object('name', i.name, 'qty', i.qty, 'price', i.price::float))
                        FILTER (WHERE i.id IS NOT NULL), '[]') AS items
        FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
        GROUP BY o.id ORDER BY o.created_at DESC LIMIT 200
      `;
      return res.status(200).json(rows);
    }
    if (rota === "orders" && id && req.method === "PUT") {
      const status = String(req.body?.status || "");
      const validos = ["pendente", "pago", "enviado", "entregue", "cancelado", "estornado", "expirado", "recusado"];
      if (!validos.includes(status)) return res.status(400).json({ error: "Status inválido" });
      await sql`UPDATE orders SET status = ${status} WHERE id = ${Number(id)}`;
      return res.status(200).json({ ok: true });
    }

    /* frete */
    if (rota === "shipping" && req.method === "GET") {
      const rows = await sql`SELECT region, label, cost::float, free_above::float, sort FROM shipping_zones ORDER BY sort`;
      return res.status(200).json(rows);
    }
    if (rota === "shipping" && req.method === "PUT") {
      const zonas = req.body?.zones;
      if (!Array.isArray(zonas)) return res.status(400).json({ error: "Formato inválido" });
      for (const z of zonas) {
        const cost = Number(z.cost);
        const freeAbove = z.free_above === null || z.free_above === "" ? null : Number(z.free_above);
        if (!z.region || !Number.isFinite(cost) || cost < 0)
          return res.status(400).json({ error: `Valor de frete inválido em ${z.region || "?"}` });
        await sql`UPDATE shipping_zones SET cost = ${cost}, free_above = ${freeAbove} WHERE region = ${z.region}`;
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: "Rota não encontrada" });
  } catch (err) {
    console.error("admin:", err);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

function validaProduto(b = {}) {
  const price = Number(b.price);
  if (!b.name || !String(b.name).trim()) return { error: "Informe o nome do produto" };
  if (!Number.isFinite(price) || price <= 0) return { error: "Preço inválido" };
  if (!b.cat) return { error: "Escolha a categoria" };
  const compare = b.compare === null || b.compare === "" || b.compare === undefined ? null : Number(b.compare);
  if (compare !== null && (!Number.isFinite(compare) || compare <= price))
    return { error: "O preço 'de' (promoção) deve ser maior que o preço atual" };
  return {
    name: String(b.name).trim(),
    description: b.description ? String(b.description).trim() : null,
    price,
    compare,
    cat: String(b.cat),
    tags: Array.isArray(b.tags) ? b.tags.map(String) : [],
    gen: b.gen === "fêmea" || b.gen === "macho" ? b.gen : null,
    qty: b.qty ? parseInt(b.qty, 10) : null,
    img: b.img ? String(b.img) : null,
    img2: b.img2 ? String(b.img2) : null,
    stock: b.stock === null || b.stock === "" || b.stock === undefined ? null : Math.max(0, parseInt(b.stock, 10) || 0),
    active: b.active !== false,
  };
}

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
