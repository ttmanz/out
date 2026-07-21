-- spur_replies.spur_id still pointed at happenings(id) from before spur posts
-- were split into their own spur_posts table (20260706000000). Since spur
-- rows were moved out of `happenings` and deleted there, any reply insert
-- against a current spur post's id violates that stale FK — this is why
-- "Send" on a Spur of the Moment reply fails with "Could not send reply."
alter table spur_replies drop constraint if exists spur_replies_spur_id_fkey;
alter table spur_replies add constraint spur_replies_spur_id_fkey
  foreign key (spur_id) references spur_posts(id) on delete cascade;

notify pgrst, 'reload schema';
