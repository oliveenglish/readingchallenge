// POST {op:"paper"|"submit"|"sets"} — level test. Answers are graded here so the key never reaches students.
import { handle, send, readToken, getDoc, setDoc } from "../lib/server.js";
import { LT_SETS } from "../lib/ltsets.js";

const strip = (s) => ({ id: s.id, lv: s.lv, title: s.title, text: s.text, reading: s.reading.map((r) => ({ q: r.q, o: r.o, t: r.t })),
  match: { w: s.match.w, m: s.match.m }, bank: s.bank, fill: s.fill.map((f) => ({ s: f.s })), make: s.make, prompt: s.prompt, check: s.check, wlen: s.wlen, wt: s.wt });
const nb = (x) => String(x ?? "").trim().toLowerCase();
const stamp = () => { const d = new Date(Date.now() + 9 * 3600e3); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`; };

export default handle(async (req, res, body) => {
  const t = readToken(req);
  if (!t) return send(res, 401, { error: "로그인이 필요해요", code: "auth" });
  if (body.op === "sets") {
    if (t.role !== "teacher") return send(res, 403, { error: "권한이 없어요", code: "forbidden" });
    return send(res, 200, { sets: LT_SETS });
  }
  if (t.role !== "student") return send(res, 403, { error: "권한이 없어요", code: "forbidden" });
  const st = await getDoc(`students/${t.sid}`);
  if (!st || !st.lt) return send(res, 404, { error: "레벨 테스트 정보가 없어요", code: "none" });
  const set = LT_SETS.find((s) => s.id === st.lt.set);
  if (!set) return send(res, 404, { error: "이 Set은 아직 준비 중이에요. 선생님께 문의해 주세요.", code: "not_ready" });
  if (st.lt.status !== "응시 전") return send(res, 409, { error: "이미 제출한 테스트예요", code: "done" });
  if (body.op === "paper") return send(res, 200, { paper: strip(set) });
  if (body.op === "submit") {
    const a = body.ans || {};
    const arr = (x, n) => (Array.isArray(x) ? x.slice(0, n) : []).concat(Array(n).fill(null)).slice(0, n);
    const ans = { r: arr(a.r, 5).map((v) => (v === null || v === "" ? null : +v)), m: arr(a.m, 5).map((v) => (v === null || v === "" ? null : +v)),
      f: arr(a.f, 5).map((v) => String(v ?? "").slice(0, 40)), k: arr(a.k, 5).map((v) => String(v ?? "").slice(0, 400)), w: String(a.w ?? "").slice(0, 6000) };
    const rd = set.reading.map((r, i) => ans.r[i] === r.a), md = set.match.a.map((x, i) => ans.m[i] === x), fd = set.fill.map((f, i) => nb(ans.f[i]) === nb(f.a));
    const auto = { r: rd.filter(Boolean).length, rd, v1: md.filter(Boolean).length, md, v2: fd.filter(Boolean).length, fd };
    const at = stamp();
    await setDoc(`leveltests/${t.sid}`, { sid: t.sid, name: st.name, set: set.id, ar: st.lt.ar, at, ts: Date.now(), minutes: Math.max(1, Math.min(300, +body.minutes || 0)), ans, auto, status: "제출" });
    const st2 = { ...st, lt: { ...st.lt, status: "제출", submittedAt: at } };
    await setDoc(`students/${t.sid}`, st2);
    return send(res, 200, { ok: true, student: { id: t.sid, ...st2 } });
  }
  return send(res, 400, { error: "bad op", code: "bad" });
});
