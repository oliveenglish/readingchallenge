// POST {op:"get"|"set"|"list"|"delete", path|col, data}
// Teacher: everything. Student: only their own student record (read) and their own submissions (read/write).
import { handle, send, readToken, getDoc, setDoc, listCol, deleteDoc, validPath, colOf } from "../lib/server.js";

const COLS = new Set(["students", "submissions", "checks", "settings", "testers", "leveltests"]);

function allowed(t, op, path) {
  if (!t) return false;
  if (t.role === "teacher") return true;
  if (t.role !== "student" || !t.sid) return false;
  if (path === `students/${t.sid}`) return op === "get";
  if (path.startsWith(`submissions/${t.sid}__`)) return op === "get" || op === "set";
  if (path === `leveltests/${t.sid}`) return op === "get";
  return false;
}

export default handle(async (req, res, body) => {
  const t = readToken(req);
  const { op } = body;
  if (op === "list") {
    if (!t || t.role !== "teacher") return send(res, 403, { error: "권한이 없어요", code: "forbidden" });
    if (!COLS.has(body.col)) return send(res, 400, { error: "bad collection", code: "bad" });
    return send(res, 200, { rows: await listCol(body.col) });
  }
  const path = body.path;
  if (!validPath(path) || !COLS.has(colOf(path))) return send(res, 400, { error: "bad path", code: "bad" });
  if (!allowed(t, op, path)) return send(res, t ? 403 : 401, { error: "권한이 없어요", code: t ? "forbidden" : "auth" });

  if (op === "get") {
    const data = await getDoc(path);
    // students see their level test only after the teacher confirms it (report), never the raw answer record before that
    if (t.role === "student" && colOf(path) === "leveltests") return send(res, 200, { data: data && data.final ? { final: data.final } : null });
    return send(res, 200, { data });
  }
  if (op === "set") {
    // the 6-week course stays locked until the level test is confirmed
    if (t.role === "student") {
      const st = await getDoc(`students/${t.sid}`);
      if (st && st.lt && st.lt.status !== "확정") return send(res, 403, { error: "레벨 테스트 결과가 확정되면 열려요", code: "lt_locked" });
    }
    const data = body.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) return send(res, 400, { error: "bad data", code: "bad" });
    if (JSON.stringify(data).length > 200000) return send(res, 413, { error: "too large", code: "too_large" });
    await setDoc(path, data);
    return send(res, 200, { ok: true });
  }
  if (op === "delete") { await deleteDoc(path); return send(res, 200, { ok: true }); }
  return send(res, 400, { error: "bad op", code: "bad" });
});
