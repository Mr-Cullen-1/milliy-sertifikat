-- Yuqoridagi 3 ta migratsiya SQL editor orqali qo'llangach ishga tushiring.
-- Maqsad: Supabase CLI keyinchalik "db push" qilganda ularni qayta qo'llashga urinmasligi (u allaqachon bor deb xato berardi).
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261110100000', 'saved_questions'),
  ('20261110110000', 'question_pool'),
  ('20261110120000', 'practice')
on conflict (version) do nothing;
