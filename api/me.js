// POST {} with token -> who am I (used when the page reloads)
import { handle, send, readToken, getDoc } from "../lib/server.js";

export default handle(async (req, res) => {
  const t = readToken(req);
  if (!t) return send(res, 401, { error: "로그인이 필요해요", code: "auth" });
  if (t.role === "teacher") return send(res, 200, { role: "teacher" });
  const st = await getDoc(`students/${t.sid}`);
  if (!st || st.status === "일시정지") return send(res, 401, { error: "다시 로그인해 주세요", code: "auth" });
  return send(res, 200, { role: "student", student: { id: t.sid, ...st } });
});
