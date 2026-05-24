drop function if exists public.app_current_profile();

create or replace function public.app_current_profile()
returns jsonb
language sql
security definer
stable
set search_path = public, auth
as $$
  select jsonb_build_object(
    'id', auth.uid(),
    'email', coalesce(
      nullif(p.email, ''),
      nullif(auth.jwt() ->> 'email', '')
    ),
    'nome', coalesce(
      nullif(p.nome, ''),
      nullif(auth.jwt() ->> 'name', ''),
      nullif(auth.jwt() ->> 'email', ''),
      p.email
    ),
    'role', coalesce(
      nullif(p.role, ''),
      case
        when p.is_admin is true then 'admin'
        else 'cliente'
      end
    ),
    'is_admin', coalesce(p.is_admin, false)
  )
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.app_current_profile() from public;
grant execute on function public.app_current_profile() to authenticated;

notify pgrst, 'reload schema';
