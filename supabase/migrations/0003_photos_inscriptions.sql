-- 0003 : 5 photos max par profil + ouverture de la messagerie au lancement

-- 1) Messagerie : personne n'est encore vérifié au lancement, donc on n'exige
--    plus "profils vérifiés uniquement" par défaut (sinon personne ne reçoit rien).
alter table public.profiles alter column accept_only_verified set default false;
update public.profiles set accept_only_verified = false where accept_only_verified = true;

-- 2) Photos : positions 0 à 4 (5 photos max)
alter table public.photos drop constraint if exists photos_position_check;
alter table public.photos add constraint photos_position_check check (position between 0 and 4);

create or replace function public.photos_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.photos where profile_id = new.profile_id) >= 5 then
    raise exception 'Maximum 5 photos par profil.';
  end if;
  return new;
end $$;
drop trigger if exists photos_limit on public.photos;
create trigger photos_limit before insert on public.photos
  for each row execute function public.photos_limit();

-- 3) Stockage privé (visible uniquement par les membres connectés)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists photos_obj_read on storage.objects;
drop policy if exists photos_obj_insert on storage.objects;
drop policy if exists photos_obj_delete on storage.objects;

create policy photos_obj_read on storage.objects for select to authenticated
  using (bucket_id = 'photos');

create policy photos_obj_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (select count(*) from storage.objects o
         where o.bucket_id = 'photos' and (storage.foldername(o.name))[1] = auth.uid()::text) < 5
  );

create policy photos_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4) Changer la photo principale (échange de positions en une seule requête)
alter table public.photos drop constraint if exists photos_profile_id_position_key;
alter table public.photos add constraint photos_profile_id_position_key
  unique (profile_id, position) deferrable initially deferred;

create or replace function public.set_main_photo(p_id uuid) returns void
language sql security invoker set search_path = public as $$
  update public.photos
     set position = case when id = p_id then 0
                         else (select position from public.photos where id = p_id) end
   where profile_id = auth.uid() and (id = p_id or position = 0);
$$;
grant execute on function public.set_main_photo(uuid) to authenticated;
