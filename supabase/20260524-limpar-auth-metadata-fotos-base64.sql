-- Manutencao/precheck: remove fotos inline/base64 de auth.users.raw_user_meta_data.
-- Reexecutavel. Nao altera cargos nem dados de profiles.

-- Precheck: mostra usuarios com photo/avatar_url/picture suspeitos no Auth metadata.
select
  u.id,
  u.email,
  e.key as metadata_key,
  length(e.value #>> '{}') as value_length,
  left(e.value #>> '{}', 90) as value_prefix
from auth.users u
cross join lateral jsonb_each(coalesce(u.raw_user_meta_data, '{}'::jsonb)) as e(key, value)
where e.key in ('photo', 'avatar_url', 'picture')
  and jsonb_typeof(e.value) = 'string'
  and (
    (e.value #>> '{}') ~* '^(data:image|data:|blob:)'
    or length(e.value #>> '{}') > 2048
  )
order by u.email, e.key;

-- Limpeza: remove somente as chaves de foto suspeitas do Auth metadata.
with affected as (
  select distinct u.id
  from auth.users u
  cross join lateral jsonb_each(coalesce(u.raw_user_meta_data, '{}'::jsonb)) as e(key, value)
  where e.key in ('photo', 'avatar_url', 'picture')
    and jsonb_typeof(e.value) = 'string'
    and (
      (e.value #>> '{}') ~* '^(data:image|data:|blob:)'
      or length(e.value #>> '{}') > 2048
    )
)
update auth.users u
set raw_user_meta_data = coalesce(
      (
        select jsonb_object_agg(e.key, e.value)
        from jsonb_each(coalesce(u.raw_user_meta_data, '{}'::jsonb)) as e(key, value)
        where not (
          e.key in ('photo', 'avatar_url', 'picture')
          and jsonb_typeof(e.value) = 'string'
          and (
            (e.value #>> '{}') ~* '^(data:image|data:|blob:)'
            or length(e.value #>> '{}') > 2048
          )
        )
      ),
      '{}'::jsonb
    ),
    updated_at = now()
from affected a
where u.id = a.id
returning
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data, '{}'::jsonb) as cleaned_raw_user_meta_data;
