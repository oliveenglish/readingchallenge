-- Olive Reading: Supabase SQL Editor에 붙여 넣고 [Run]을 누르세요.
-- 학생·과제·검사 기록을 모두 이 표 하나에 저장해요. (path 예: students/s_abc, submissions/s_abc__L4u1)
create table if not exists public.docs (
  path        text primary key,
  col         text not null,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
create index if not exists docs_col_idx on public.docs (col);

-- 브라우저에서 직접 읽고 쓰지 못하게 잠가요. (사이트 서버만 service_role 키로 접근)
alter table public.docs enable row level security;

-- 녹음 파일 보관함 (비공개). 사이트 서버가 만든 임시 링크로만 올리고 들을 수 있어요.
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;
