# Olive Reading Program — 배포 안내

학생 사이트 + 선생님 대시보드를 **GitHub → Vercel**로 배포하고, 학생·과제 기록은 **Supabase**에 저장해요.
AI 라이팅 첨삭은 **Claude API 키**로 동작해요. 약 30분이면 끝나요.

## 폴더 구성

| 파일 | 하는 일 |
|---|---|
| `public/index.html` | 사이트 화면 전체 (지문·단어·퀴즈·말하기·라이팅 콘텐츠 포함) |
| `api/login.js` | 로그인 (선생님 비밀번호 / 학생 PIN) |
| `api/me.js` | 새로고침해도 로그인 유지 |
| `api/db.js` | 학생·과제·검사 기록 읽기/저장 (학생은 자기 기록만) |
| `api/evaluate.js` | AI 라이팅 첨삭 (API 키는 서버에만 있어요) |
| `lib/server.js` | 위 기능들이 함께 쓰는 코드 |
| `supabase.sql` | Supabase에 저장 표를 만드는 명령 |
| `.env.example` | Vercel에 넣을 환경변수 5개 목록 |

## 1단계 · Supabase (저장소, 무료)

1. https://supabase.com → **New project** (지역: Seoul 또는 Singapore)
2. 왼쪽 **SQL Editor** → `supabase.sql` 내용을 붙여 넣고 **Run**
3. **Project Settings → API**에서 두 가지를 복사해 둬요
   - `Project URL` → `SUPABASE_URL`
   - `service_role` 키 → `SUPABASE_SERVICE_KEY` (**절대 다른 곳에 공개하지 마세요**)

## 2단계 · Claude API 키

1. https://console.anthropic.com → **API Keys → Create Key**
2. 복사해 둬요 → `ANTHROPIC_API_KEY`
3. Billing에서 결제 수단·사용 한도를 정해 두면 안심이에요. (AI 첨삭 1회에 보통 몇 원 수준)

## 3단계 · GitHub에 올리기

1. GitHub → **New repository** (이름 예: `olive-reading`, **Private** 추천)
2. **uploading an existing file** → 이 폴더 안의 파일·폴더를 모두 끌어다 놓고 **Commit**
   (`public`, `api`, `lib` 폴더 구조가 그대로 올라가야 해요)

## 4단계 · Vercel 배포

1. https://vercel.com → **Add New → Project** → 방금 만든 GitHub 저장소 **Import**
2. Framework Preset: **Other** (그대로 두면 돼요)
3. **Environment Variables**에 5개를 넣어요

   | 이름 | 값 |
   |---|---|
   | `SUPABASE_URL` | 1단계 Project URL |
   | `SUPABASE_SERVICE_KEY` | 1단계 service_role 키 |
   | `TEACHER_PASSWORD` | 선생님 비밀번호 (8자 이상, 영문+숫자) |
   | `SESSION_SECRET` | 아무 긴 무작위 문자열 40자 이상 |
   | `ANTHROPIC_API_KEY` | 2단계 API 키 |

4. **Deploy** → 끝나면 `https://olive-reading-xxxx.vercel.app` 주소가 생겨요
5. 원하는 도메인이 있으면 **Settings → Domains**에서 연결해요

## 5단계 · 처음 사용

1. 사이트 첫 화면 로그인 칸에 **선생님 비밀번호** → 선생님 대시보드
2. **학생 관리 → 새 학생 추가** (레벨 선택) → PIN이 자동으로 만들어져요. PIN 칸에서 직접 바꾸고 [변경 저장]도 돼요
3. 학생·학부모에게 사이트 주소와 PIN을 보내면 끝

## 알아 두실 점

- **콘텐츠 수정**: 엑셀(레벨별 콘텐츠)을 고쳐서 Claude에게 주면 새 `public/index.html`을 만들어 줘요. GitHub에서 그 파일만 바꿔 올리면 Vercel이 자동으로 다시 배포해요. 학생 기록은 Supabase에 있어서 지워지지 않아요.
- **선생님 비밀번호 변경**: Vercel → Settings → Environment Variables에서 `TEACHER_PASSWORD`를 바꾸고 **Redeploy**.
- **녹음 파일**: 지금은 녹음 "제출 기록(파일 이름·길이)"만 저장돼요. 실제 음성 파일 보관·발음 채점은 다음 단계 작업이에요.
- **요금**: Supabase 무료 요금제로 시작할 수 있어요. Vercel 무료(Hobby) 요금제는 개인·비상업용이라, 유료 수업에 쓸 때는 Pro 요금제를 확인해 주세요.
- **지문 저작권**: 지금 들어 있는 Level 3–6 지문은 테스트용이에요. 판매용 지문으로 바꾼 뒤 공개해 주세요.
