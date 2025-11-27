-- Community schema & triggers

-- Enum for topics
do $$
begin
  if not exists (select 1 from pg_type where typname = 'community_topic') then
    create type community_topic as enum ('introductions','projects','collaboration');
  end if;
end$$;

-- Threads table
create table if not exists public.community_threads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade,
  title text not null,
  body text not null,
  topic community_topic not null,
  replies_count integer not null default 0,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Replies table
create table if not exists public.community_replies (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid references public.community_threads on delete cascade,
  user_id uuid references auth.users on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Reactions table
create table if not exists public.community_reactions (
  thread_id uuid references public.community_threads on delete cascade,
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

-- Indexes
create index if not exists community_threads_topic_created_idx on public.community_threads (topic, created_at desc);
create index if not exists community_replies_thread_created_idx on public.community_replies (thread_id, created_at desc);

-- RLS
alter table public.community_threads enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_reactions enable row level security;

create policy "threads readable by all" on public.community_threads
  for select using (true);
create policy "threads insert by authed" on public.community_threads
  for insert with check (auth.uid() = user_id);
create policy "threads update own" on public.community_threads
  for update using (auth.uid() = user_id);

create policy "replies readable by all" on public.community_replies
  for select using (true);
create policy "replies insert by authed" on public.community_replies
  for insert with check (auth.uid() = user_id);
create policy "replies update own" on public.community_replies
  for update using (auth.uid() = user_id);
create policy "replies delete own" on public.community_replies
  for delete using (auth.uid() = user_id);

create policy "reactions readable by all" on public.community_reactions
  for select using (true);
create policy "reactions insert by authed" on public.community_reactions
  for insert with check (auth.uid() = user_id);
create policy "reactions delete own" on public.community_reactions
  for delete using (auth.uid() = user_id);

-- Triggers to keep counts in sync
create or replace function public.bump_replies_count()
returns trigger as $$
begin
  update public.community_threads
    set replies_count = replies_count + 1,
        updated_at = now()
    where id = new.thread_id;
  return new;
end;
$$ language plpgsql;

create or replace function public.decrement_replies_count()
returns trigger as $$
begin
  update public.community_threads
    set replies_count = greatest(replies_count - 1, 0),
        updated_at = now()
    where id = old.thread_id;
  return old;
end;
$$ language plpgsql;

create or replace function public.bump_likes_count()
returns trigger as $$
begin
  update public.community_threads
    set likes_count = likes_count + 1,
        updated_at = now()
    where id = new.thread_id;
  return new;
end;
$$ language plpgsql;

create or replace function public.decrement_likes_count()
returns trigger as $$
begin
  update public.community_threads
    set likes_count = greatest(likes_count - 1, 0),
        updated_at = now()
    where id = old.thread_id;
  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_replies_inc on public.community_replies;
create trigger trg_replies_inc
  after insert on public.community_replies
  for each row execute function public.bump_replies_count();

drop trigger if exists trg_replies_dec on public.community_replies;
create trigger trg_replies_dec
  after delete on public.community_replies
  for each row execute function public.decrement_replies_count();

drop trigger if exists trg_likes_inc on public.community_reactions;
create trigger trg_likes_inc
  after insert on public.community_reactions
  for each row execute function public.bump_likes_count();

drop trigger if exists trg_likes_dec on public.community_reactions;
create trigger trg_likes_dec
  after delete on public.community_reactions
  for each row execute function public.decrement_likes_count();
