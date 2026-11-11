-- elements-apply.sql qo'llangach ishga tushiring (Supabase CLI keyinchalik "db push" da qayta qo'llamasligi uchun).
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261110130000', 'content_elements'),
  ('20261110140000', 'practice_elements')
on conflict (version) do nothing;
