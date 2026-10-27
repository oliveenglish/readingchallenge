// Shared server helpers: Supabase REST (service key stays on the server), signed session tokens.
import crypto from "node:crypto";

const env = (k) => {
  const v = process.env[k];
  if (!v) throw Object.assign(new Error(`환경변수 ${k}가 설정되지 않았어요`), { status: 500, code: "config" });
  return v;
};

// ---------- Supabase (table: docs(path text pk, col text, data jsonb, updated_at timestamptz)) ----------
async function sb(pathAndQuery, init = {}) {
  const base = env("SUPABASE_URL").replace(/\/$/, "");
  const key = env("SUPABASE_SERVICE_KEY");
  const r = await fetch(`${base}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}), "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) {
    const t = await r.text();
    throw Object.assign(new Error(`Supabase ${r.status}: ${t.slice(0, 200)}`), { status: 502, code: "db" });
  }
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}
export const colOf = (p) => p.split("/")[0];
export const validPath = (p) => typeof p === "string" && /^[A-Za-z0-9_-]+\/[A-Za-z0-9_.:@+-]{1,200}$/.test(p);

export async function getDoc(path) {
  const rows = await sb(`docs?path=eq.${encodeURIComponent(path)}&select=data`);
  return rows && rows[0] ? rows[0].data : null;
}
export async function setDoc(path, data) {
  await sb("docs?on_conflict=path", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ path, col: colOf(path), data, updated_at: new Date().toISOString() }]),
  });
}
export async function listCol(col) {
  const rows = await sb(`docs?col=eq.${encodeURIComponent(col)}&select=path,data&order=path.asc&limit=5000`);
  return (rows || []).map((r) => ({ id: r.path.split("/")[1], ...r.data }));
}
export async function deleteDoc(path) {
  await sb(`docs?path=eq.${encodeURIComponent(path)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

// ---------- tokens ----------
const b64 = (s) => Buffer.from(s).toString("base64url");
export function signToken(payload, days = 30) {
  const body = b64(JSON.stringify({ ...payload, exp: Date.now() + days * 864e5 }));
  const mac = crypto.createHmac("sha256", env("SESSION_SECRET")).update(body).digest("base64url");
  return `${body}.${mac}`;
}
export function readToken(req) {
  const h = req.headers.authorization || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [body, mac] = tok.split(".");
  if (!body || !mac) return null;
  const want = crypto.createHmac("sha256", env("SESSION_SECRET")).update(body).digest("base64url");
  if (want.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(mac))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}
export const samePw = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
export const normPin = (s) => String(s || "").trim().toUpperCase();

// ---------- response helpers ----------
export function send(res, status, obj) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}
export function handle(fn) {
  return async (req, res) => {
    if (req.method !== "POST") return send(res, 405, { error: "POST only", code: "method" });
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      await fn(req, res, body);
    } catch (e) {
      console.error(e);
      send(res, e.status || 500, { error: e.message || "server error", code: e.code || "server" });
    }
  };
}
