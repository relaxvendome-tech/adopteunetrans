-- Liste et fiche des membres avec l'âge calculé côté serveur
-- (la date de naissance reste privée).
create or replace function public.list_members(p_dep text default null, p_limit int default 60)
returns table (id uuid, display_name text, age int, gender_identity text, pronouns text,
               bio text, department_code text, city_slug text, is_verified boolean, online boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, date_part('year', age(current_date, pp.birthdate))::int,
         p.gender_identity, p.pronouns, p.bio, p.department_code, p.city_slug, p.is_verified,
         (p.show_online and p.last_active_at > now() - interval '5 minutes')
  from public.profiles p join public.profiles_private pp on pp.id = p.id
  where auth.uid() is not null
    and p.id <> auth.uid()
    and not public.is_blocked(auth.uid(), p.id)
    and (p_dep is null or p.department_code = p_dep)
  order by p.is_verified desc, p.last_active_at desc
  limit least(p_limit, 100);
$$;

create or replace function public.member_card(p_id uuid)
returns table (id uuid, display_name text, age int, gender_identity text, pronouns text,
               bio text, department_code text, city_slug text, is_verified boolean, online boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, date_part('year', age(current_date, pp.birthdate))::int,
         p.gender_identity, p.pronouns, p.bio, p.department_code, p.city_slug, p.is_verified,
         (p.show_online and p.last_active_at > now() - interval '5 minutes')
  from public.profiles p join public.profiles_private pp on pp.id = p.id
  where auth.uid() is not null and p.id = p_id and not public.is_blocked(auth.uid(), p.id);
$$;

-- Compteur public par département (pour indexer les pages villes dès 10 membres)
create or replace function public.members_count_by_dep()
returns table (department_code text, n bigint)
language sql stable security definer set search_path = public as $$
  select department_code, count(*) from public.profiles
  where department_code is not null group by 1;
$$;

grant execute on function public.list_members(text, int), public.member_card(uuid) to authenticated;
grant execute on function public.members_count_by_dep() to anon, authenticated;
