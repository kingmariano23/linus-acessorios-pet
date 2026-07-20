/* Sessão do admin: cookie HMAC assinado, sem banco */
import crypto from "node:crypto";

const COOKIE = "linus_admin";
const secret = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";

function sign(exp) {
  return crypto.createHmac("sha256", secret()).update(String(exp)).digest("hex");
}

export function makeToken(days = 7) {
  const exp = Date.now() + days * 864e5;
  return `${exp}.${sign(exp)}`;
}

export function checkToken(token) {
  if (!token || !secret()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(exp)));
  } catch {
    return false;
  }
}

export function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function setSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${makeToken()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 86400}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}

export function isAdmin(req) {
  return checkToken(getCookie(req, COOKIE));
}

export function requireAdmin(req, res) {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Não autorizado" });
    return false;
  }
  return true;
}
