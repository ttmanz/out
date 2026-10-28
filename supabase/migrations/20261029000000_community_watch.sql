-- Community Watch: a Club-Groups-style community (administrator, join requests with approval,
-- posts, replies, likes, saves, blocking) with live photo / video posts.
--
-- It reuses the clubs engine: a community is a `clubs` row with kind = 'watch'. Everything that
-- already works for clubs (members, approvals, posts, blocking, suspension, invite links) works
-- for communities without separate tables. Club Groups keeps kind = 'club' and is unchanged.
-- (No panic button yet — that is a later phase.)

-- 1. Kind of club ------------------------------------------------------------------------

alter table public.clubs
  add column if not exists kind text not null default 'club'
  check (kind in ('club', 'watch'));

-- 2. Video on posts (communities allow live photo or video) ---------------------------------

alter table public.club_posts add column if not exists video_url text;

-- 3. Level access: its own feature key, default Silver like Club Groups ---------------------

insert into public.feature_access (feature_key, label, min_tier)
values ('community_watch', 'Community Watch', 'silver')
on conflict (feature_key) do nothing;

-- Creating a community, or posting in one, is checked against Community Watch; clubs keep
-- the Club Groups check. (Only enforced under the 'levels' mode — see feature_allowed().)
create or replace function public.enforce_club_feature_level()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_author uuid;
  v_kind text;
  v_feature text;
begin
  if TG_TABLE_NAME = 'clubs' then
    v_author := new.admin_id;
    v_kind := new.kind;
  else
    v_author := new.user_id;
    select kind into v_kind from clubs where id = new.club_id;
  end if;

  v_feature := case when v_kind = 'watch' then 'community_watch' else 'club_groups' end;

  if not feature_allowed(v_author, v_feature) then
    raise exception 'This feature needs the % level or higher',
      (select min_tier from feature_access where feature_key = v_feature)
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_feature_level on public.clubs;
create trigger enforce_feature_level before insert on public.clubs
  for each row execute function public.enforce_club_feature_level();

drop trigger if exists enforce_feature_level on public.club_posts;
create trigger enforce_feature_level before insert on public.club_posts
  for each row execute function public.enforce_club_feature_level();

notify pgrst, 'reload schema';
