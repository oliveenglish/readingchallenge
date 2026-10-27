// POST {op:"upload", key, level, unit, ext} -> signed upload URL (student only)
// POST {op:"url", path} -> signed playback URL (teacher, or the student who owns it)
import { handle, send, readToken, signedUploadUrl, signedDownloadUrl } from "../lib/server.js";
const EXT = new Set(["webm", "m4a", "mp4", "ogg", "mp3", "wav", "aac"]);

export default handle(async (req, res, body) => {
  const t = readToken(req);
  if (!t) return send(res, 401, { error: "로그인이 필요해요", code: "auth" });
  if (body.op === "upload") {
    if (t.role !== "student" || !t.sid) return send(res, 403, { error: "학생만 녹음을 올릴 수 있어요", code: "forbidden" });
    const ext = EXT.has(body.ext) ? body.ext : "webm";
    const key = body.key === "rec2" ? "rec2" : "rec1";
    const lv = parseInt(body.level, 10) || 0, un = parseInt(body.unit, 10) || 0;
    const path = `${t.sid}/L${lv}u${un}_${key}_${Date.now()}.${ext}`;
    return send(res, 200, { path, url: await signedUploadUrl(path) });
  }
  if (body.op === "url") {
    const path = String(body.path || "");
    if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]{1,120}$/.test(path)) return send(res, 400, { error: "bad path", code: "bad" });
    if (t.role !== "teacher" && !path.startsWith(`${t.sid}/`)) return send(res, 403, { error: "권한이 없어요", code: "forbidden" });
    return send(res, 200, { url: await signedDownloadUrl(path) });
  }
  return send(res, 400, { error: "bad op", code: "bad" });
});
