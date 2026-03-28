-- ============================================================
-- MLB PRO — SUPABASE SCHEMA
-- Paste this entire file into Supabase → SQL Editor → Run
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Users ─────────────────────────────────────────────────────
create table if not exists users (
  id            uuid primary key default uuid_generate_v4(),
  email         text unique not null,
  username      text unique not null,
  password_hash text not null,
  role          text not null default 'user',
  avatar_url    text,
  fav_teams     jsonb default '[]',
  notify_prefs  jsonb default '{"injuries":true,"lineups":true,"news":false}',
  subscription  text default 'free',
  espn_league_id text,
  espn_s2       text,
  espn_swid     text,
  created_at    timestamptz default now(),
  last_login    timestamptz
);

-- ── Projections ───────────────────────────────────────────────
create table if not exists projections (
  id               serial primary key,
  player_name      text not null,
  team             text,
  position         text,
  mlb_player_id    int,
  proj_fpts        numeric(6,2) default 0,
  proj_ownership   numeric(5,2) default 0,
  proj_h           numeric(4,2) default 0,
  proj_hr          numeric(4,2) default 0,
  proj_rbi         numeric(4,2) default 0,
  proj_r           numeric(4,2) default 0,
  proj_sb          numeric(4,2) default 0,
  proj_k           numeric(4,2) default 0,
  proj_ip          numeric(4,2) default 0,
  proj_er          numeric(4,2) default 0,
  proj_pitching_k  numeric(4,2) default 0,
  proj_bb          numeric(4,2) default 0,
  salary           int default 0,
  source           text default 'manual',
  slate_date       date not null default current_date,
  updated_at       timestamptz default now(),
  unique (player_name, slate_date, source)
);

create index if not exists idx_proj_date on projections(slate_date);
create index if not exists idx_proj_name on projections(player_name);

-- ── Scoring Rules ─────────────────────────────────────────────
create table if not exists scoring_rules (
  id         serial primary key,
  sport      text not null default 'mlb',
  platform   text not null,
  rules      jsonb not null,
  updated_at timestamptz default now(),
  unique (sport, platform)
);

-- Insert default DraftKings MLB scoring
insert into scoring_rules (sport, platform, rules) values (
  'mlb', 'draftkings',
  '{"single":3,"double":5,"triple":8,"hr":10,"rbi":2,"r":2,"bb":2,"hbp":2,"sb":5,"ip":2.25,"so":2,"win":4,"er":-2,"hit_allowed":-0.6,"bb_allowed":-0.6}'::jsonb
) on conflict (sport, platform) do nothing;

-- Insert default ESPN standard scoring
insert into scoring_rules (sport, platform, rules) values (
  'mlb', 'espn_standard',
  '{"r":1,"hr":4,"rbi":1,"sb":2,"avg_bonus":0,"win":5,"k":1,"era_bonus":0,"whip_bonus":0}'::jsonb
) on conflict (sport, platform) do nothing;

-- ── Weather ───────────────────────────────────────────────────
create table if not exists weather_data (
  id           serial primary key,
  game_id      bigint not null,
  slate_date   date not null,
  home_team    text,
  stadium      text,
  temp_f       int,
  wind_mph     int,
  wind_dir     text,
  rain_pct     int,
  condition    text,
  impact       text,
  impact_label text,
  source       text default 'open-meteo',
  updated_at   timestamptz default now(),
  unique (game_id, slate_date)
);

-- ── News / Feed ───────────────────────────────────────────────
create table if not exists feed_items (
  id          text primary key,
  title       text not null,
  summary     text,
  url         text,
  image_url   text,
  team        text,
  tag         text default 'General',
  source      text default 'rss',
  published   timestamptz,
  fetched_at  timestamptz default now(),
  flagged     boolean default false
);

create index if not exists idx_feed_team on feed_items(team);
create index if not exists idx_feed_pub  on feed_items(published desc);

-- ── Feed Interactions ─────────────────────────────────────────
create table if not exists feed_likes (
  item_id    text references feed_items(id) on delete cascade,
  user_id    uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (item_id, user_id)
);

create table if not exists feed_comments (
  id         uuid primary key default uuid_generate_v4(),
  item_id    text references feed_items(id) on delete cascade,
  user_id    uuid references users(id) on delete cascade,
  body       text not null,
  flagged    boolean default false,
  created_at timestamptz default now()
);

-- ── Notifications ─────────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  read       boolean default false,
  data       jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_notif_user on notifications(user_id, read, created_at desc);

-- ── User Picks ────────────────────────────────────────────────
create table if not exists user_picks (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references users(id) on delete cascade,
  slate_date  date not null default current_date,
  player_name text not null,
  stat        text not null,
  line        numeric(5,2),
  direction   text,
  confidence  numeric(3,1),
  result      text,
  created_at  timestamptz default now()
);

-- ── DFS Lineups ───────────────────────────────────────────────
create table if not exists dfs_lineups (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references users(id) on delete cascade,
  slate_date   date not null default current_date,
  platform     text default 'draftkings',
  players      jsonb not null,
  total_salary int,
  proj_fpts    numeric(7,2),
  is_entered   boolean default false,
  created_at   timestamptz default now()
);

-- ── Injury Reports ────────────────────────────────────────────
create table if not exists injury_reports (
  id            serial primary key,
  player_name   text not null,
  mlb_player_id int,
  team          text,
  status        text,
  description   text,
  return_date   date,
  source        text default 'manual',
  updated_at    timestamptz default now()
);
