create extension if not exists pgcrypto;

create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  mime_type text not null,
  data bytea not null,
  created_at timestamptz default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  login text unique not null,
  username text unique not null,
  password_hash text not null,
  role text not null check (role in (
    'programmist',
    'tehnik',
    'polimer',
    'pirotehnik',
    'tehmash',
    'holodilchik'
  )),
  display_name text,
  bio text,
  status_text text,
  status_emoji text,
  avatar_url text,
  banner_url text,
  theme_color text,
  is_admin boolean default false,
  is_moderator boolean default false,
  is_banned boolean default false,
  warnings_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists user_subscriptions (
  subscriber_id uuid references users(id) on delete cascade,
  target_user_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (subscriber_id, target_user_id),
  constraint chk_no_self_subscription check (subscriber_id <> target_user_id)
);

create table if not exists profile_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text,
  artist text,
  audio_url text not null,
  created_at timestamptz default now()
);

create table if not exists user_stickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text,
  image_url text not null,
  mime_type text,
  created_at timestamptz default now()
);

create table if not exists user_gifs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text,
  image_url text not null,
  mime_type text,
  created_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  is_group boolean default false,
  created_at timestamptz default now()
);

create table if not exists conversation_members (
  conversation_id uuid references conversations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text default 'member',
  is_favorite boolean default false,
  joined_at timestamptz default now(),
  last_read_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references users(id) on delete set null,
  body text not null,
  attachment_url text,
  attachment_mime text,
  attachment_kind text check (attachment_kind in ('image', 'video', 'video-note', 'sticker', 'gif')),
  reply_to_id uuid references messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists message_reactions (
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (message_id, user_id, emoji)
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references users(id) on delete cascade,
  body text not null,
  image_url text,
  repost_of uuid references posts(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  admin_id uuid references users(id) on delete set null,
  reason text,
  created_at timestamptz default now()
);

create table if not exists post_likes (
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists post_reposts (
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_users_username on users (username);
create index if not exists idx_subscriptions_target on user_subscriptions (target_user_id);
create index if not exists idx_subscriptions_subscriber on user_subscriptions (subscriber_id);
create index if not exists idx_profile_tracks_user on profile_tracks (user_id, created_at desc);
create index if not exists idx_user_stickers_user on user_stickers (user_id, created_at desc);
create index if not exists idx_user_gifs_user on user_gifs (user_id, created_at desc);
create index if not exists idx_members_user on conversation_members (user_id);
create index if not exists idx_members_user_favorite on conversation_members (user_id, is_favorite);
create index if not exists idx_push_subscriptions_user on push_subscriptions (user_id);
create index if not exists idx_messages_conversation on messages (conversation_id, created_at);
create index if not exists idx_message_reactions_message on message_reactions (message_id);
create index if not exists idx_posts_created on posts (created_at desc);
create index if not exists idx_post_comments_post on post_comments (post_id, created_at);

-- safe alters for existing databases
DO $$ BEGIN
  ALTER TABLE conversations ADD COLUMN is_group boolean default false;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN attachment_url text;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN attachment_mime text;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN attachment_kind text;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN reply_to_id uuid;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE messages
    ADD CONSTRAINT fk_messages_reply_to
    FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'messages'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%attachment_kind%'
  LOOP
    EXECUTE format('ALTER TABLE messages DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  ALTER TABLE messages
    ADD CONSTRAINT chk_messages_attachment_kind
    CHECK (attachment_kind in ('image', 'video', 'video-note', 'sticker', 'gif'));
EXCEPTION WHEN undefined_table THEN NULL;
WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages (reply_to_id);
EXCEPTION WHEN undefined_column THEN NULL;
WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE posts ADD COLUMN image_url text;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE posts ADD COLUMN repost_of uuid;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN banner_url text;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN theme_color text;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN status_text text;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN status_emoji text;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE user_stickers ADD COLUMN title text;
EXCEPTION WHEN undefined_table THEN NULL;
WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE user_stickers ADD COLUMN mime_type text;
EXCEPTION WHEN undefined_table THEN NULL;
WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE user_gifs ADD COLUMN title text;
EXCEPTION WHEN undefined_table THEN NULL;
WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE user_gifs ADD COLUMN mime_type text;
EXCEPTION WHEN undefined_table THEN NULL;
WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN is_admin boolean default false;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN is_moderator boolean default false;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN is_banned boolean default false;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN warnings_count integer default 0;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN edited_at timestamptz;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN deleted_at timestamptz;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE messages ADD COLUMN deleted_by uuid;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE posts ADD COLUMN edited_at timestamptz;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE posts ADD COLUMN deleted_at timestamptz;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE posts ADD COLUMN deleted_by uuid;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE conversation_members ADD COLUMN last_read_at timestamptz default now();
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE conversation_members ADD COLUMN is_favorite boolean default false;
EXCEPTION WHEN duplicate_column THEN END $$;

DO $$ BEGIN
  ALTER TABLE push_subscriptions ADD COLUMN last_seen_at timestamptz default now();
EXCEPTION WHEN undefined_table THEN NULL;
WHEN duplicate_column THEN END $$;

UPDATE conversation_members SET last_read_at = now() WHERE last_read_at IS NULL;
UPDATE conversation_members SET is_favorite = false WHERE is_favorite IS NULL;
