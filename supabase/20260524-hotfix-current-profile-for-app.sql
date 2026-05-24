drop function if exists public.current_profile_for_app();

create or replace function public.current_profile_for_app()
returns jsonb
language sql
security definer
stable
set search_path = public, auth
as $$
  select jsonb_build_object(
    'id', au.id,
    'email', au.email,
    'nome', coalesce(
      nullif(p.nome, ''),
      nullif(au.raw_user_meta_data->>'nome', ''),
      nullif(au.raw_user_meta_data->>'name', ''),
      au.email
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
  from auth.users au
  left join public.profiles p on p.id = au.id
  where au.id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_profile_for_app() from public;
grant execute on function public.current_profile_for_app() to authenticated;

notify pgrst, 'reload schema';
