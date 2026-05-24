drop function if exists public.app_current_profile();

create or replace function public.app_current_profile()
returns jsonb
language sql
security definer
stable
set search_path = public, auth
as $$
  with current_profile as (
    select
      p.id,
      p.email::text as profile_email,
      p.nome::text as profile_nome,
      p.role::text as profile_role,
      coalesce(p.is_admin, false)::boolean as profile_is_admin
    from public.profiles p
    where p.id = auth.uid()
    limit 1
  )
  select
    case
      when auth.uid() is null then null
      when not exists (select 1 from current_profile) then jsonb_build_object(
        'id', auth.uid(),
        'email', auth.jwt() ->> 'email',
        'nome', coalesce(auth.jwt() ->> 'name', auth.jwt() ->> 'email'),
        'role', 'cliente',
        'is_admin', false
      )
      else (
        select jsonb_build_object(
          'id', cp.id,
          'email', coalesce(
            case when length(trim(coalesce(cp.profile_email, ''))) > 0 then cp.profile_email end,
            auth.jwt() ->> 'email'
          ),
          'nome', coalesce(
            case when length(trim(coalesce(cp.profile_nome, ''))) > 0 then cp.profile_nome end,
            auth.jwt() ->> 'name',
            auth.jwt() ->> 'email',
            cp.profile_email
          ),
          'role', coalesce(
            case when length(trim(coalesce(cp.profile_role, ''))) > 0 then cp.profile_role end,
            case when cp.profile_is_admin is true then 'admin' else 'cliente' end
          ),
          'is_admin', cp.profile_is_admin
        )
        from current_profile cp
      )
    end;
$$;

revoke all on function public.app_current_profile() from public;
grant execute on function public.app_current_profile() to authenticated;
grant execute on function public.app_current_profile() to anon;

notify pgrst, 'reload schema';
