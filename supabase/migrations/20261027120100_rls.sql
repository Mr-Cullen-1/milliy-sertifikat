-- 2/4: rollar, huquqlar va RLS
-- Yozish faqat RPC (3-migratsiya) va service_role orqali; talaba jadvallarga to'g'ridan-to'g'ri yoza olmaydi.

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('editor', 'admin')
  );
$$;
revoke all on function public.is_staff() from public, anon, authenticated;
grant execute on function public.is_staff() to authenticated;

-- Ro'yxatdan o'tganda profil avtomatik yaratiladi.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.blocks enable row level security;
alter table public.topics enable row level security;
alter table public.profiles enable row level security;
alter table public.exam_formats enable row level security;
alter table public.questions enable row level security;
alter table public.question_topics enable row level security;
alter table public.question_keys enable row level security;
alter table public.exams enable row level security;
alter table public.exam_items enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;

revoke all on all tables in schema public from anon, authenticated;

grant select on public.blocks, public.topics, public.exam_formats, public.profiles,
  public.exams, public.exam_items, public.attempts, public.answers to authenticated;
grant update (name) on public.profiles to authenticated;
-- Kontent jadvallari: huquq beriladi, lekin policy faqat staff'ga ruxsat beradi.
grant select, insert, update, delete on public.questions, public.question_topics,
  public.question_keys to authenticated;
grant insert, update, delete on public.exams, public.exam_items, public.exam_formats to authenticated;

create policy blocks_read on public.blocks for select to authenticated using (true);
create policy topics_read on public.topics for select to authenticated using (true);
create policy formats_read on public.exam_formats for select to authenticated using (true);
create policy formats_staff on public.exam_formats for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy questions_staff on public.questions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy question_topics_staff on public.question_topics for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy question_keys_staff on public.question_keys for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy exams_staff on public.exams for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy exams_published_read on public.exams for select to authenticated
  using (status = 'published');

create policy exam_items_staff on public.exam_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy exam_items_published_read on public.exam_items for select to authenticated
  using (exists (select 1 from public.exams e where e.id = exam_id and e.status = 'published'));

create policy attempts_read on public.attempts for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy answers_read on public.answers for select to authenticated
  using (
    public.is_staff()
    or exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid())
  );

-- service_role (faqat server) hamma jadvalga kira oladi (RLS'ni chetlab o'tadi). Aniq beriladi, chunki
-- dashboard'da "Automatically expose new tables" o'chirilganda default huquqlar berilmaydi.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
