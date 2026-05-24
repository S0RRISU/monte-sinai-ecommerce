-- Diagnostico da RPC de perfil usada pelo frontend.
-- Execute este arquivo no SQL Editor do Supabase e depois teste as RPCs via Network/curl.

drop function if exists public.app_current_profile_ping();
drop function if exists public.app_current_profile_debug();

create or replace function public.app_current_profile_ping()
returns jsonb
language sql
security definer
stable
set search_path = public, auth
as $$
  select jsonb_build_object(
    'ok', true,
    'uid', auth.uid()
  );
$$;

create or replace function public.app_current_profile_debug()
returns jsonb
language sql
security definer
stable
set search_path = public, auth
as $$
  select jsonb_build_object(
    'ok', true,
    'uid', auth.uid(),
    'profile_exists', exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
    )
  );
$$;

revoke all on function public.app_current_profile_ping() from public;
revoke all on function public.app_current_profile_debug() from public;

grant execute on function public.app_current_profile_ping() to anon, authenticated;
grant execute on function public.app_current_profile_debug() to anon, authenticated;

notify pgrst, 'reload schema';

-- Auditoria de assinaturas/overloads relevantes.
select
  p.oid::regprocedure as signature,
  pg_get_function_result(p.oid) as result_type,
  pg_get_function_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'app_current_profile',
    'app_current_profile_ping',
    'app_current_profile_debug',
    'current_profile_for_app',
    'current_user_role'
  )
order by p.proname, p.oid::regprocedure::text;
