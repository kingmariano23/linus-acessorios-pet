/* Cliente da API do Asaas — com MODO DEMONSTRAÇÃO embutido.
 *
 * Sem ASAAS_API_KEY configurada (ou com ASAAS_ENV=mock), nenhuma chamada
 * externa é feita: as cobranças são simuladas com a mesma forma de resposta
 * do Asaas real (PIX com QR verdadeiro escaneável, cartão aprovado na hora)
 * e o pedido é confirmado automaticamente ~40s depois, como se o webhook
 * tivesse chegado. Configurar a chave real liga o Asaas de verdade sem
 * mudar uma linha de código.
 */
import crypto from "node:crypto";

const MOCK = !process.env.ASAAS_API_KEY || process.env.ASAAS_ENV === "mock";

const BASE =
  process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

export const isMock = () => MOCK;

async function asaas(path, { method = "GET", body } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "linus-acessorios-pet",
      access_token: process.env.ASAAS_API_KEY,
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
const mockId = (prefixo) => `${prefixo}_${crypto.randomBytes(8).toString("hex")}`;

/* payload PIX de demonstração no formato EMV (escaneável, mas sem cobrança real) */
function mockPixPayload(value) {
  const valor = value.toFixed(2);
  const merchant = "LINUS DEMO";
  const cidade = "NATAL";
  const campo = (id, conteudo) => id + String(conteudo.length).padStart(2, "0") + conteudo;
  const gui = campo("00", "br.gov.bcb.pix") + campo("01", "demo@linusacessoriospet.com.br");
  let p =
    campo("00", "01") +
    campo("26", gui) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("54", valor) +
    campo("58", "BR") +
    campo("59", merchant) +
    campo("60", cidade) +
    campo("62", campo("05", "LINUSDEMO")) +
    "6304";
  /* CRC16-CCITT do payload */
  let crc = 0xffff;
  for (const ch of p) {
    crc ^= ch.charCodeAt(0) << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return p + crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Busca (por CPF) ou cria o cliente no Asaas; retorna o id. */
export async function ensureCustomer({ name, email, cpf, phone }) {
  if (MOCK) return mockId("mockcus");
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
  if (MOCK) {
    const payload = mockPixPayload(value);
    const { default: QRCode } = await import("qrcode");
    const dataUrl = await QRCode.toDataURL(payload, { width: 480, margin: 2 });
    return {
      payment: { id: mockId("mockpay"), status: "PENDING" },
      qr: { encodedImage: dataUrl.replace(/^data:image\/png;base64,/, ""), payload },
    };
  }
  const payment = await asaas("/payments", {
    method: "POST",
    body: { customer, billingType: "PIX", value, dueDate: hoje(), description, externalReference },
  });
  const qr = await asaas(`/payments/${payment.id}/pixQrCode`);
  return { payment, qr };
}

/** Cobrança transparente no cartão: dados vão direto na criação do pagamento. */
export async function createCardPayment({
  customer,
  value,
  description,
  externalReference,
  card,
  holderInfo,
  remoteIp,
}) {
  if (MOCK) {
    /* CVV 999 simula recusa, para demonstrar o fluxo de erro */
    if (card?.ccv === "999") {
      const err = new Error("Transação não autorizada pela emissora do cartão (demonstração)");
      err.status = 402;
      throw err;
    }
    return { id: mockId("mockpay"), status: "CONFIRMED" };
  }
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
  if (MOCK) return { id, status: "PENDING" };
  return asaas(`/payments/${id}`);
}
