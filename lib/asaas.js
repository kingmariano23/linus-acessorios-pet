/* Cliente da API do Asaas — sandbox por padrão, produção via ASAAS_ENV=production */

const BASE =
  process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

async function asaas(path, { method = "GET", body } = {}) {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  const r = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "linus-acessorios-pet",
      access_token: key,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.errors?.[0]?.description || `Erro Asaas (HTTP ${r.status})`;
    const err = new Error(msg);
    err.status = r.status;
    err.asaas = data;
    throw err;
  }
  return data;
}

const hoje = () => new Date().toISOString().slice(0, 10);

/** Busca (por CPF) ou cria o cliente no Asaas; retorna o id. */
export async function ensureCustomer({ name, email, cpf, phone }) {
  const cpfCnpj = (cpf || "").replace(/\D/g, "");
  const found = await asaas(`/customers?cpfCnpj=${cpfCnpj}`);
  if (found.data?.length) return found.data[0].id;
  const created = await asaas("/customers", {
    method: "POST",
    body: { name, email, cpfCnpj, mobilePhone: (phone || "").replace(/\D/g, "") },
  });
  return created.id;
}

/** Cobrança PIX: cria o pagamento e busca o QR Code (imagem base64 + copia-e-cola). */
export async function createPixPayment({ customer, value, description, externalReference }) {
  const payment = await asaas("/payments", {
    method: "POST",
    body: { customer, billingType: "PIX", value, dueDate: hoje(), description, externalReference },
  });
  const qr = await asaas(`/payments/${payment.id}/pixQrCode`);
  return { payment, qr };
}

/** Cobrança transparente no cartão: dados do cartão vão direto na criação do pagamento. */
export async function createCardPayment({
  customer,
  value,
  description,
  externalReference,
  card,
  holderInfo,
  remoteIp,
}) {
  return asaas("/payments", {
    method: "POST",
    body: {
      customer,
      billingType: "CREDIT_CARD",
      value,
      dueDate: hoje(),
      description,
      externalReference,
      creditCard: card,
      creditCardHolderInfo: holderInfo,
      remoteIp,
    },
  });
}

export async function getPayment(id) {
  return asaas(`/payments/${id}`);
}
