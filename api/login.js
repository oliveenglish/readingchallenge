// POST {code} -> teacher password or student PIN -> session token
import { handle, send, listCol, signToken, samePw, normPin } from "../lib/server.js";

export default handle(async (req, res, body) => {
  const code = String(body.code || "").trim();
  if (!code) return send(res, 400, { error: "PIN을 입력해 주세요", code: "empty" });

  if (process.env.TEACHER_PASSWORD && samePw(code, process.env.TEACHER_PASSWORD)) {
    return send(res, 200, { role: "teacher", token: signToken({ role: "teacher" }, 7) });
  }
  const students = await listCol("students");
  const st = students.find((s) => normPin(s.pin) === normPin(code));
  if (!st) return send(res, 401, { error: "PIN을 다시 확인해 주세요.", code: "bad_pin" });
  if (st.status === "일시정지") return send(res, 403, { error: "지금은 수강이 일시정지된 상태예요. 선생님께 문의해 주세요.", code: "paused" });
  return send(res, 200, { role: "student", token: signToken({ role: "student", sid: st.id }), student: st });
});
