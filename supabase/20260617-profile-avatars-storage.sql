-- Storage de avatares da loja Monte Sinai.
-- Permite que cada usuario envie e atualize a propria foto de perfil.
-- Nao usa DELETE/TRUNCATE.

begin;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Tabela public.profiles nao encontrada.';
  end if;
end $$;

alter table public.profiles
  add column if not exists foto text,
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'URL publica da foto de perfil enviada pelo usuario no bucket avatars.';

grant select (foto, avatar_url) on public.profiles to anon, authenticated;
grant update (foto, avatar_url, updated_at) on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';

commit;

-- Conferencia depois de rodar:
-- select id, public, file_size_limit, allowed_mime_types
-- from storage.buckets
-- where id = 'avatars';
