-- =============================================================================
-- Supabase Schema for Arrow Exit (Game Progress & Real-time Chat)
-- Includes: profiles, user_progress, conversations, messages, triggers, RLS, 
-- and RPCs matching the design template.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles: public profiles linked to auth.users
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_display_name_len check (char_length(display_name) between 1 and 50)
);

comment on table public.profiles is 'Public profile data, keyed to auth.users.';

-- -----------------------------------------------------------------------------
-- 2. user_progress: game progression (level & hints)
-- -----------------------------------------------------------------------------
create table if not exists public.user_progress (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  campaign_index integer not null default 0,
  hints_count    integer not null default 3,
  updated_at     timestamptz not null default now()
);

comment on table public.user_progress is 'Cloud progress storage for Arrow Exit players.';

-- -----------------------------------------------------------------------------
-- 3. Automatic user creation trigger (Profiles + Progress)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  display   text;
  base_name text;
  candidate text;
  suffix    int := 0;
begin
  display := coalesce(
    nullif(meta ->> 'display_name', ''),
    nullif(meta ->> 'full_name', ''),
    nullif(meta ->> 'name', ''),
    nullif(meta ->> 'user_name', ''),
    split_part(coalesce(new.email, 'user'), '@', 1)
  );

  base_name := coalesce(
    nullif(meta ->> 'username', ''),
    nullif(meta ->> 'user_name', ''),
    nullif(meta ->> 'preferred_username', ''),
    split_part(coalesce(new.email, display), '@', 1)
  );

  -- Conform to the username format: lowercase, [a-z0-9_], 3–20 chars.
  base_name := lower(regexp_replace(base_name, '[^a-z0-9_]', '', 'g'));
  if length(base_name) < 3 then
    base_name := base_name || 'user';
  end if;
  base_name := left(base_name, 20);

  candidate := base_name;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(base_name, 20 - length(suffix::text)) || suffix::text;
  end loop;

  -- Create profile
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate,
    left(display, 50),
    nullif(coalesce(meta ->> 'avatar_url', meta ->> 'picture'), '')
  );

  -- Create default game progress
  insert into public.user_progress (user_id, campaign_index, hints_count)
  values (
    new.id,
    0,
    3
  );

  return new;
end;
$$;

-- Create user trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 4. conversations: 1:1 chat sessions between users
-- -----------------------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  user1_id        uuid not null references public.profiles (id) on delete cascade,
  user2_id        uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  constraint conversations_user_order check (user1_id < user2_id),
  constraint conversations_unique_pair unique (user1_id, user2_id)
);

create index if not exists conversations_user1_idx on public.conversations (user1_id);
create index if not exists conversations_user2_idx on public.conversations (user2_id);

-- -----------------------------------------------------------------------------
-- 5. messages: chat messages in a conversation
-- -----------------------------------------------------------------------------
create table if not exists public.messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations (id) on delete cascade,
  sender_id         uuid not null references public.profiles (id) on delete cascade,
  body              text not null default '',
  attachment_path   text,
  attachment_type   text,
  attachment_name   text,
  attachment_width  int,
  attachment_height int,
  delivered_at      timestamptz,
  read_at           timestamptz,
  created_at        timestamptz not null default now(),
  constraint messages_body_len check (char_length(body) <= 2000),
  constraint messages_has_content
    check (char_length(body) > 0 or attachment_path is not null),
  constraint messages_attachment_type
    check (attachment_type is null or attachment_type in ('image', 'audio', 'file'))
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- Keep conversations.last_message_at in sync
create or replace function public.bump_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
    set last_message_at = new.created_at
    where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.bump_conversation_last_message();

-- Block messages updates except read_at
create or replace function public.guard_message_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body <> old.body
     or new.sender_id <> old.sender_id
     or new.conversation_id <> old.conversation_id
     or new.created_at <> old.created_at
     or new.attachment_path is distinct from old.attachment_path then
    raise exception 'Only read_at may be updated on a message';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_guard_update on public.messages;
create trigger messages_guard_update
  before update on public.messages
  for each row execute function public.guard_message_update();

-- -----------------------------------------------------------------------------
-- 6. Helper & RPC Functions
-- -----------------------------------------------------------------------------

-- Check if user is a participant
create or replace function public.is_conversation_participant(conv_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = conv_id
      and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
  );
$$;

-- Start / Get 1:1 conversation
create or replace function public.start_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me      uuid := auth.uid();
  u1      uuid;
  u2      uuid;
  conv_id uuid;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;
  if other_user_id is null or other_user_id = me then
    raise exception 'Invalid conversation partner';
  end if;
  if not exists (select 1 from public.profiles where id = other_user_id) then
    raise exception 'User not found';
  end if;

  if me < other_user_id then
    u1 := me; u2 := other_user_id;
  else
    u1 := other_user_id; u2 := me;
  end if;

  insert into public.conversations (user1_id, user2_id)
  values (u1, u2)
  on conflict (user1_id, user2_id) do nothing;

  select id into conv_id
  from public.conversations
  where user1_id = u1 and user2_id = u2;

  return conv_id;
end;
$$;

grant execute on function public.start_conversation(uuid) to authenticated;

-- Get conversation summaries (Inbox)
create or replace function public.get_conversation_summaries()
returns table (
  id                uuid,
  peer_id           uuid,
  peer_username     text,
  peer_display_name text,
  peer_avatar_url   text,
  last_message_at   timestamptz,
  last_message_body text,
  unread_count      bigint
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    c.id,
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    c.last_message_at,
    lm.body,
    coalesce(uc.cnt, 0)
  from public.conversations c
  join public.profiles p
    on p.id = case when c.user1_id = auth.uid() then c.user2_id else c.user1_id end
  left join lateral (
    select m.body
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*) as cnt
    from public.messages m
    where m.conversation_id = c.id
      and m.sender_id <> auth.uid()
      and m.read_at is null
  ) uc on true
  where c.user1_id = auth.uid() or c.user2_id = auth.uid()
  order by c.last_message_at desc;
$$;

grant execute on function public.get_conversation_summaries() to authenticated;

-- -----------------------------------------------------------------------------
-- 7. Row Level Security & Policies
-- -----------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.user_progress enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

-- Profiles Policies
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- User Progress Policies
drop policy if exists "progress_select_own" on public.user_progress;
create policy "progress_select_own"
  on public.user_progress for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "progress_upsert_own" on public.user_progress;
create policy "progress_upsert_own"
  on public.user_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.user_progress;
create policy "progress_update_own"
  on public.user_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Conversations Policies
drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant"
  on public.conversations for select
  to authenticated
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- Messages Policies
drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
  on public.messages for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

drop policy if exists "messages_update_recipient" on public.messages;
create policy "messages_update_recipient"
  on public.messages for update
  to authenticated
  using (
    public.is_conversation_participant(conversation_id)
    and sender_id <> auth.uid()
  )
  with check (
    public.is_conversation_participant(conversation_id)
    and sender_id <> auth.uid()
  );

-- -----------------------------------------------------------------------------
-- 8. Storage: private bucket for chat media. Objects are keyed by conversation id
-- (`{conversation_id}/{file}`) so access can be scoped to participants. Files
-- are served via short-lived signed URLs.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  10485760, -- 10 MB
  array[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'
  ]
)
on conflict (id) do nothing;

drop policy if exists "chat_media_read_participants" on storage.objects;
create policy "chat_media_read_participants"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-media'
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "chat_media_upload_participants" on storage.objects;
create policy "chat_media_upload_participants"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-media'
    and owner = auth.uid()
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );

-- -----------------------------------------------------------------------------
-- 9. Realtime Subscriptions
-- -----------------------------------------------------------------------------
do $$
begin
  -- Add tables to realtime publication if not already present
  -- Ensure publication exists (standard for Supabase)
  alter publication supabase_realtime add table public.messages;
exception when others then
  -- Ignore if already added or publication doesn't exist yet
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception when others then
  -- Ignore if already added or publication doesn't exist yet
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. Role Grants & Permissions
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete
  on all tables in schema public to authenticated, service_role;
grant select on all tables in schema public to anon;
grant usage, select
  on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
