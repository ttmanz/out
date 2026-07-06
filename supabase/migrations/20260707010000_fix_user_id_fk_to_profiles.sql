-- spur_posts, open_chat_posts, club_posts, happening_replies, and open_chat_replies
-- were all created with `user_id references auth.users(id)`. PostgREST can only
-- resolve an embedded `profiles:user_id(...)` select (used everywhere to show the
-- poster's name) when there's an FK from the table straight to `profiles`, not to
-- `auth.users`. That's why club/spur/open-chat feeds fail to load with PGRST200
-- ("Could not find a relationship... perhaps you meant..."). Point the FK at
-- profiles(id) instead — the values are identical since profiles.id already
-- references auth.users(id) 1:1.

alter table spur_posts drop constraint if exists spur_posts_user_id_fkey;
alter table spur_posts add constraint spur_posts_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table open_chat_posts drop constraint if exists open_chat_posts_user_id_fkey;
alter table open_chat_posts add constraint open_chat_posts_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table club_posts drop constraint if exists club_posts_user_id_fkey;
alter table club_posts add constraint club_posts_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table happening_replies drop constraint if exists happening_replies_user_id_fkey;
alter table happening_replies add constraint happening_replies_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table open_chat_replies drop constraint if exists open_chat_replies_user_id_fkey;
alter table open_chat_replies add constraint open_chat_replies_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

-- `stories` has the same bug but predates the migrations folder (built directly
-- in the SQL editor), so its FK constraint name isn't known here — look it up
-- and drop whatever it's actually called before re-pointing it at profiles.
do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_name = 'stories'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'user_id';

  if fk_name is not null then
    execute format('alter table stories drop constraint %I', fk_name);
  end if;

  alter table stories add constraint stories_user_id_fkey
    foreign key (user_id) references profiles(id) on delete cascade;
end $$;

-- Force PostgREST to pick up the new relationships immediately.
notify pgrst, 'reload schema';
