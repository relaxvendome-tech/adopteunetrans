-- =====================================================================
-- Adopte une trans — schéma initial Supabase (PostgreSQL + PostGIS)
-- Base : proposition DeepSeek, corrigée et complétée par Claude :
--   * RLS réellement activée sur toutes les tables (absente dans l'original)
--   * position GPS et date de naissance JAMAIS lisibles par les autres
--     membres : table privée + vue publique (âge, ville, distance arrondie)
--   * politiques en double supprimées, fonctions incomplètes réécrites
--   * contrôle d'âge dans les deux sens, anti-liens sur tous les messages
--     tant que la demande n'est pas acceptée
-- À exécuter dans l'éditeur SQL Supabase (projet hébergé en UE).
-- =====================================================================

create extension if not exists postgis;
create extension if not exists pgcrypto;

create type public.conversation_status as enum ('request', 'active', 'ignored');
create type public.report_status as enum ('pending', 'reviewed', 'dismissed', 'actioned');

-- ---------------------------------------------------------------------
-- Profils (données publiques) ; les données sensibles sont à part.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  gender_identity text check (char_length(gender_identity) <= 60),
  pronouns text check (char_length(pronouns) <= 30),
  bio text check (char_length(bio) <= 500),
  city_slug text,
  department_code text,
  is_verified boolean not null default false,
  verified_at timestamptz,
  show_online boolean not null default true,
  show_profile_views boolean not null default true,
  accept_only_verified boolean not null default true,
  age_min int not null default 18 check (age_min >= 18),
  age_max int not null default 99 check (age_max <= 120),
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  constraint age_range check (age_min <= age_max)
);

-- Données privées : lisibles uniquement par leur propriétaire.
create table public.profiles_private (
  id uuid primary key references public.profiles(id) on delete cascade,
  birthdate date not null check (birthdate <= current_date - interval '18 years'),
  location geography(Point, 4326),
  consent_sensitive_at timestamptz not null  -- consentement RGPD art. 9 explicite
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  position int not null default 0 check (position between 0 and 5),
  is_blurred_public boolean not null default true,
  created_at timestamptz not null default now(),
  unique (profile_id, position)
);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id),
  check (user_id <> target_id)
);

create table public.profile_views (
  id bigserial primary key,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  check (viewer_id <> viewed_id)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  status public.conversation_status not null default 'request',
  initiated_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 1000),
  message_id uuid references public.messages(id) on delete set null,
  status public.report_status not null default 'pending',
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);

create table public.daily_picks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  picked_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default current_date,
  primary key (user_id, picked_id, day),
  check (user_id <> picked_id)
);

-- ---------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------
create index on public.profiles_private using gist (location);
create index on public.profiles (city_slug);
create index on public.profiles (department_code);
create index on public.profiles (last_active_at desc);
create index on public.favorites (target_id);
create index on public.profile_views (viewed_id, viewed_at desc);
create index on public.blocks (blocked_id);
create index on public.conversations (user_b);
create index on public.conversations (initiated_by, created_at);
create index on public.messages (conversation_id, created_at);
create index on public.reports (status, created_at);

-- ---------------------------------------------------------------------
-- RLS activée PARTOUT (manquait dans la version d'origine)
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.profiles_private enable row level security;
alter table public.photos           enable row level security;
alter table public.favorites        enable row level security;
alter table public.profile_views    enable row level security;
alter table public.blocks           enable row level security;
alter table public.conversations    enable row level security;
alter table public.messages         enable row level security;
alter table public.reports          enable row level security;
alter table public.daily_picks      enable row level security;

-- ---------------------------------------------------------------------
-- Fonctions utilitaires
-- ---------------------------------------------------------------------
create or replace function public.is_blocked(u1 uuid, u2 uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = u1 and blocked_id = u2) or (blocker_id = u2 and blocked_id = u1)
  );
$$;

create or replace function public.age_of(p_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select date_part('year', age(current_date, birthdate))::int
  from public.profiles_private where id = p_id;
$$;

-- ---------------------------------------------------------------------
-- Politiques
-- ---------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or not public.is_blocked(auth.uid(), id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());
-- is_verified / verified_at ne sont modifiables que par le service (vérification selfie)
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- (un REVOKE par colonne ne suffit pas sous Supabase : le GRANT de table l'emporte)
create or replace function public.protect_verification()
returns trigger language plpgsql as $$
begin
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' and (new.is_verified or new.verified_at is not null) then
      raise exception 'Un nouveau profil ne peut pas se déclarer vérifié';
    elsif tg_op = 'UPDATE' and (new.is_verified is distinct from old.is_verified
                                or new.verified_at is distinct from old.verified_at) then
      raise exception 'Le statut de vérification ne peut être modifié que par le service';
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_protect_verification before insert or update on public.profiles
  for each row execute function public.protect_verification();

create policy private_owner on public.profiles_private for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy photos_select on public.photos for select to authenticated
  using (profile_id = auth.uid() or not public.is_blocked(auth.uid(), profile_id));
create policy photos_write on public.photos for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy favorites_own on public.favorites for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and not public.is_blocked(auth.uid(), target_id));

create policy views_select on public.profile_views for select to authenticated
  using (
    viewer_id = auth.uid()
    or (viewed_id = auth.uid()
        and exists (select 1 from public.profiles p
                    where p.id = profile_views.viewer_id and p.show_profile_views))
  );
create policy views_insert on public.profile_views for insert to authenticated
  with check (viewer_id = auth.uid() and not public.is_blocked(auth.uid(), viewed_id));

create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Conversations et messages : lecture seule côté client, écriture via RPC.
create policy conv_select on public.conversations for select to authenticated
  using ((user_a = auth.uid() or user_b = auth.uid()) and not public.is_blocked(user_a, user_b));

create policy msg_select on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.user_a = auth.uid() or c.user_b = auth.uid())
      and not public.is_blocked(c.user_a, c.user_b)));

create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());
create policy reports_select on public.reports for select to authenticated
  using (reporter_id = auth.uid());

create policy picks_select on public.daily_picks for select to authenticated
  using (user_id = auth.uid() and not public.is_blocked(auth.uid(), picked_id));
-- daily_picks : écrit par une tâche planifiée (service role) chaque nuit.

-- ---------------------------------------------------------------------
-- RPC : envoyer un message (messagerie ouverte + garde-fous)
-- ---------------------------------------------------------------------
create or replace function public.send_message(p_recipient_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_sender uuid := auth.uid();
  v_conv public.conversations%rowtype;
  v_rec public.profiles%rowtype;
  v_snd public.profiles%rowtype;
  v_snd_age int;
  v_rec_age int;
  v_count int;
  v_msg uuid;
  c_link  constant text := '(https?://|www\.|\m[a-z0-9-]+\.(com|fr|net|org|io|co|me|app|eu|ch|be|ca|de|es|it|uk|us|xyz|link)\M)';
  c_phone constant text := '(\+?\d[\s.\-]?){8,}';
begin
  if v_sender is null then raise exception 'Non authentifié'; end if;
  if p_recipient_id = v_sender then raise exception 'Destinataire invalide'; end if;
  p_body := btrim(p_body);
  if p_body is null or char_length(p_body) = 0 or char_length(p_body) > 2000 then
    raise exception 'Le message doit contenir entre 1 et 2000 caractères';
  end if;
  if public.is_blocked(v_sender, p_recipient_id) then raise exception 'Interaction impossible'; end if;

  select * into v_rec from public.profiles where id = p_recipient_id;
  if not found then raise exception 'Destinataire introuvable'; end if;
  select * into v_snd from public.profiles where id = v_sender;

  select * into v_conv from public.conversations
   where user_a = least(v_sender, p_recipient_id) and user_b = greatest(v_sender, p_recipient_id);

  if not found then
    -- Nouvelle conversation : filtres du destinataire, quota, contenu
    if v_rec.accept_only_verified and not v_snd.is_verified then
      raise exception 'Ce membre accepte uniquement les profils vérifiés';
    end if;
    v_snd_age := public.age_of(v_sender);
    v_rec_age := public.age_of(p_recipient_id);
    if v_snd_age not between v_rec.age_min and v_rec.age_max then
      raise exception 'Votre âge ne correspond pas aux critères de ce membre';
    end if;
    select count(*) into v_count from public.conversations
     where initiated_by = v_sender and created_at > now() - interval '24 hours';
    if v_count >= 20 then raise exception 'Limite de 20 nouvelles conversations par 24 h atteinte'; end if;

    insert into public.conversations (user_a, user_b, status, initiated_by)
    values (least(v_sender, p_recipient_id), greatest(v_sender, p_recipient_id), 'request', v_sender)
    returning * into v_conv;
  end if;

  if v_conv.status in ('request', 'ignored') and v_conv.initiated_by = v_sender then
    -- Avant toute réponse : pas de lien ni de numéro, une seule relance
    if p_body ~* c_link then raise exception 'Pas de lien avant que ce membre ait répondu'; end if;
    if p_body ~ c_phone then raise exception 'Pas de numéro de téléphone avant que ce membre ait répondu'; end if;
    select count(*) into v_count from public.messages
     where conversation_id = v_conv.id and sender_id = v_sender;
    if v_count >= 2 then raise exception 'Une seule relance est possible sans réponse'; end if;
  elsif v_conv.status in ('request', 'ignored') and v_conv.initiated_by <> v_sender then
    -- Le destinataire répond : la demande devient une conversation
    update public.conversations set status = 'active' where id = v_conv.id;
  end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (v_conv.id, v_sender, p_body) returning id into v_msg;
  update public.conversations set last_message_at = now() where id = v_conv.id;
  return v_msg;
end;
$$;

create or replace function public.ignore_request(p_conversation_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.conversations set status = 'ignored'
   where id = p_conversation_id and status = 'request'
     and initiated_by <> auth.uid()
     and (user_a = auth.uid() or user_b = auth.uid());
$$;

create or replace function public.mark_read(p_conversation_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.messages m set read_at = now()
   from public.conversations c
  where m.conversation_id = c.id and c.id = p_conversation_id
    and (c.user_a = auth.uid() or c.user_b = auth.uid())
    and m.sender_id <> auth.uid() and m.read_at is null;
$$;

-- ---------------------------------------------------------------------
-- RPC : profils à proximité (distance arrondie, jamais de coordonnées)
-- ---------------------------------------------------------------------
create or replace function public.nearby_profiles(p_radius_km double precision default 50, p_limit int default 50)
returns table (id uuid, display_name text, age int, gender_identity text, pronouns text,
               city_slug text, is_verified boolean, online boolean, distance_km int)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name,
         date_part('year', age(current_date, pp.birthdate))::int,
         p.gender_identity, p.pronouns, p.city_slug, p.is_verified,
         (p.show_online and p.last_active_at > now() - interval '5 minutes'),
         greatest(1, round(st_distance(pp.location, me.location) / 1000.0))::int
  from public.profiles p
  join public.profiles_private pp on pp.id = p.id
  cross join (select location from public.profiles_private where id = auth.uid()) me
  where p.id <> auth.uid()
    and pp.location is not null and me.location is not null
    and not public.is_blocked(auth.uid(), p.id)
    and st_dwithin(pp.location, me.location, least(p_radius_km, 300) * 1000)
  order by pp.location <-> me.location
  limit least(p_limit, 100);
$$;

grant execute on function public.send_message(uuid, text), public.ignore_request(uuid),
  public.mark_read(uuid), public.nearby_profiles(double precision, int) to authenticated;
revoke execute on function public.age_of(uuid) from public, anon, authenticated;
