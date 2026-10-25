// POST {text, task, lexile} with a student token -> AI writing feedback (Claude API key stays on the server)
import { handle, send, readToken } from "../lib/server.js";

export default handle(async (req, res, body) => {
  const t = readToken(req);
  if (!t) return send(res, 401, { error: "로그인이 필요해요", code: "auth" });
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 500, { error: "ANTHROPIC_API_KEY가 설정되지 않았어요", code: "config" });

  const text = String(body.text || "").slice(0, 3000);
  const task = String(body.task || "").slice(0, 600);
  const lexile = String(body.lexile || "").slice(0, 20);
  if (text.trim().length < 10) return send(res, 400, { error: "글이 너무 짧아요", code: "short" });

  const prompt = `You are a kind, careful English writing teacher for Korean elementary and middle school students (reading level about ${lexile}L).
Task prompt the student answered: "${task}"
Correct ONLY grammar, spelling, punctuation, word choice, and unclear sentence connections. Keep the student's ideas, sentence order, and sentence count. Do not make sentences more advanced than needed for this level. If a sentence is already correct, return it unchanged.
Split the student's text into sentences exactly as written.
Return ONLY JSON in this shape:
{"good":"한국어 1~2문장: 잘한 점 (구체적으로)","fix":"한국어 1~2문장: 가장 중요한 고칠 점","sentences":[{"original":"student sentence exactly","corrected":"corrected sentence","why":"한국어 한 줄 설명 (고친 것이 없으면 빈 문자열)"}]}
Student text:
${text}`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const j = await r.json();
  if (!r.ok) {
    console.error(j);
    return send(res, r.status === 429 ? 429 : 502, { error: "AI 평가 서버 오류", code: r.status === 429 ? "rate_limited" : "ai" });
  }
  const out = (j.content || []).map((c) => c.text || "").join("");
  const m = out.match(/\{[\s\S]*\}/);
  let data;
  try { data = JSON.parse(m ? m[0] : out); } catch { return send(res, 502, { error: "AI 응답을 읽지 못했어요", code: "bad" }); }
  return send(res, 200, data);
});
