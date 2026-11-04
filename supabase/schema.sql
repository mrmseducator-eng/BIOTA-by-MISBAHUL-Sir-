-- PAPER PRO DATABASE SETUP
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'teacher' check (role in ('teacher','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.question_papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_paper_id text not null,
  title text not null default 'Untitled paper',
  school_name text not null default '',
  board text not null default 'WBBSE',
  class_level smallint not null check (class_level between 5 and 12),
  subject text not null default '',
  exam_type text not null default 'Exam',
  language text not null default 'বাংলা',
  duration text not null default '1 Hour',
  total_marks numeric(7,2) not null default 0,
  paper_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, app_paper_id)
);

create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_question_id text not null,
  class_level smallint not null check (class_level between 5 and 12),
  board text not null default 'WBBSE',
  subject text not null default '',
  chapter text not null default '',
  topic text not null default '',
  language text not null default 'বাংলা',
  question_type text not null default 'Short Answer',
  question_text text not null,
  options jsonb not null default '[]'::jsonb,
  marks numeric(6,2) not null default 1,
  answer_text text not null default '',
  explanation text not null default '',
  difficulty text not null default 'Moderate',
  question_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, app_question_id)
);

-- Safe migrations for an earlier PAPER PRO schema
alter table public.question_papers add column if not exists app_paper_id text;
update public.question_papers set app_paper_id = id::text where app_paper_id is null;
alter table public.question_papers alter column app_paper_id set not null;

alter table public.question_bank add column if not exists app_question_id text;
alter table public.question_bank add column if not exists explanation text not null default '';
alter table public.question_bank add column if not exists question_json jsonb not null default '{}'::jsonb;
alter table public.question_bank add column if not exists updated_at timestamptz not null default now();
update public.question_bank set app_question_id = id::text where app_question_id is null;
alter table public.question_bank alter column app_question_id set not null;

create unique index if not exists papers_user_app_id_unique
on public.question_papers(user_id, app_paper_id);

create unique index if not exists bank_user_app_question_id_unique
on public.question_bank(user_id, app_question_id);

create index if not exists papers_user_updated_idx
on public.question_papers(user_id, updated_at desc);

create index if not exists bank_user_filter_idx
on public.question_bank(user_id, class_level, board, subject);

alter table public.profiles enable row level security;
alter table public.question_papers enable row level security;
alter table public.question_bank enable row level security;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Insert own profile" on public.profiles;
create policy "Insert own profile"
on public.profiles for insert
with check (auth.uid() = id and role = 'teacher');

drop policy if exists "Teachers manage own papers" on public.question_papers;
create policy "Teachers manage own papers"
on public.question_papers for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Teachers manage own question bank" on public.question_bank;
create policy "Teachers manage own question bank"
on public.question_bank for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name','')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
