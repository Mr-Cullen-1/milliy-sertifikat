-- 1/4: sxema (jadvallar, enumlar, indekslar)

create type public.question_type as enum ('y1', 'y2', 'o');
create type public.difficulty as enum ('L1', 'L2', 'L3');
create type public.question_status as enum ('draft', 'review', 'published', 'archived');
create type public.exam_status as enum ('draft', 'published', 'archived');
create type public.attempt_status as enum ('in_progress', 'submitted');
create type public.submit_reason as enum ('user', 'timeout');
create type public.user_role as enum ('student', 'editor', 'admin');

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Rasmiy 7 bo'lim (docs/mavzular.md); ma'lumot 4-migratsiyada.
create table public.blocks (
  id smallint primary key,
  code text not null unique,
  name_uz text not null,
  sort smallint not null
);

-- Ishchi taksonomiya; id = docs/mavzular.md dagi mavzu raqami (1..103).
create table public.topics (
  id smallint primary key,
  block_id smallint not null references public.blocks (id),
  name_uz text not null,
  name_ru text
);
create index topics_block_idx on public.topics (block_id);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

-- Format kodga qotirilmaydi: bo'limlar, blueprint va ball qoidalari shu yerda.
create table public.exam_formats (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  duration_min integer not null check (duration_min > 0),
  spec jsonb not null,
  scoring jsonb not null,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  type public.question_type not null,
  block_id smallint not null references public.blocks (id),
  primary_topic_id smallint not null references public.topics (id),
  stem_md text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  difficulty public.difficulty not null,
  weight numeric(3, 1) check (weight is null or weight > 0),
  solution_md text,
  mistake_note_md text,
  est_seconds integer check (est_seconds is null or est_seconds > 0),
  b_param real,
  status public.question_status not null default 'draft',
  version integer not null default 1,
  supersedes_id uuid references public.questions (id),
  source text,
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index questions_pick_idx on public.questions (block_id, type, status);
create trigger questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

create table public.question_topics (
  question_id uuid not null references public.questions (id) on delete cascade,
  topic_id smallint not null references public.topics (id),
  primary key (question_id, topic_id)
);

-- To'g'ri javoblar alohida jadvalda: talabaga hech qachon ochilmaydi.
create table public.question_keys (
  question_id uuid primary key references public.questions (id) on delete cascade,
  key_json jsonb not null
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  format_id uuid not null references public.exam_formats (id),
  is_free boolean not null default false,
  status public.exam_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.exam_items (
  exam_id uuid not null references public.exams (id) on delete cascade,
  position smallint not null check (position > 0),
  question_id uuid not null references public.questions (id),
  section public.question_type not null,
  primary key (exam_id, position),
  unique (exam_id, question_id)
);
create index exam_items_question_idx on public.exam_items (question_id);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_id uuid not null references public.exams (id),
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  submit_reason public.submit_reason,
  status public.attempt_status not null default 'in_progress',
  raw_score numeric(5, 1),
  max_raw numeric(5, 1),
  scaled_score numeric(4, 1),
  level text,
  scoring_version text,
  is_estimate boolean not null default true,
  check ((status = 'submitted') = (submitted_at is not null))
);
create unique index attempts_one_active_idx on public.attempts (user_id, exam_id)
  where status = 'in_progress';
create index attempts_user_idx on public.attempts (user_id, started_at desc);

create table public.answers (
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id),
  value_json jsonb,
  flagged boolean not null default false,
  time_spent_sec integer not null default 0 check (time_spent_sec >= 0),
  is_correct boolean,
  score numeric(4, 1),
  max_score numeric(4, 1),
  score_part jsonb,
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);
