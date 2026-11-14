-- ============================================================================
-- INNOVARD - Supabase PostgreSQL Database Schema
-- ============================================================================
-- Chạy toàn bộ file này trong Supabase SQL Editor để khởi tạo bảng, RLS,
-- Trigger đồng bộ Google Auth và đội mặc định ban đầu.
-- ============================================================================

-- 1. TEAMS TABLE
create table if not exists public.teams (
  id text primary key,
  code text unique not null,
  name text not null,
  project_name text not null,
  slogan text default '',
  description text default '',
  mentor_name text default '',
  github_repo_url text default '',
  discord_invite_url text default '',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. USERS PROFILE TABLE (Synced with Google OAuth & Team Members)
create table if not exists public.users (
  id text primary key,
  name text not null,
  email text unique not null,
  avatar_url text default '',
  role text not null default 'member' check (role in ('admin', 'member', 'leader', 'mentor')),
  title text default 'Thành viên dự án',
  bio text default '',
  skills text[] not null default '{}',
  team_id text references public.teams(id) on delete set null,
  connected_profiles jsonb not null default '{"github": "", "discord": "", "linkedin": "", "portfolio": ""}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. ANNOUNCEMENTS
create table if not exists public.announcements (
  id text primary key,
  team_id text references public.teams(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'general' check (category in ('general', 'deadline', 'meeting', 'tech')),
  priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  is_pinned boolean not null default false,
  author_name text not null default 'Thành viên INNOVARD',
  author_avatar text default '',
  created_at timestamptz not null default now()
);

-- 4. SCHEDULE MILESTONES (Home page roadmap)
create table if not exists public.schedule_milestones (
  id text primary key,
  team_id text references public.teams(id) on delete cascade,
  phase text not null,
  title text not null,
  date_range text not null,
  status text not null default 'upcoming' check (status in ('completed', 'active', 'upcoming')),
  description text default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 5. QUICK LINKS
create table if not exists public.quick_links (
  id text primary key,
  team_id text references public.teams(id) on delete cascade,
  title text not null,
  description text default '',
  url text not null,
  category text not null default 'other' check (category in ('repo', 'chat', 'doc', 'design', 'other')),
  icon_name text default 'Link2',
  created_at timestamptz not null default now()
);

-- 6. DAILY STANDUPS
create table if not exists public.standups (
  id text primary key,
  user_id text not null,
  user_name text not null,
  user_avatar text default '',
  team_id text not null references public.teams(id) on delete cascade,
  standup_date text not null,
  yesterday text not null,
  today text not null,
  blockers text default '',
  created_at timestamptz not null default now()
);

-- 7. TEAM MEETING REPORTS (Họp nhóm)
create table if not exists public.team_reports (
  id text primary key,
  team_id text not null references public.teams(id) on delete cascade,
  title text not null,
  meeting_date text not null,
  author_id text not null,
  author_name text not null,
  author_avatar text default '',
  done text not null,
  in_progress text not null,
  blockers text default '',
  links jsonb not null default '[]'::jsonb,
  questions text default '',
  created_at timestamptz not null default now()
);

-- 8. MEMBER TASKS (Tiến độ của tôi)
create table if not exists public.tasks (
  id text primary key,
  user_id text not null,
  team_id text not null references public.teams(id) on delete cascade,
  title text not null,
  category text default 'Development',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  due_date text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. CALENDAR EVENTS (Deadlines & Lịch họp)
create table if not exists public.calendar_events (
  id text primary key,
  team_id text references public.teams(id) on delete cascade,
  title text not null,
  description text default '',
  event_date text not null,
  event_time text default '23:59',
  type text not null check (type in ('deadline', 'meeting')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  meeting_link text,
  location text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (Idempotent)
-- ============================================================================

alter table public.teams enable row level security;
alter table public.users enable row level security;
alter table public.announcements enable row level security;
alter table public.schedule_milestones enable row level security;
alter table public.quick_links enable row level security;
alter table public.standups enable row level security;
alter table public.team_reports enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;

drop policy if exists "Public client access teams" on public.teams;
create policy "Public client access teams" on public.teams
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "Public client access users" on public.users;
create policy "Public client access users" on public.users
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "Public client access announcements" on public.announcements;
create policy "Public client access announcements" on public.announcements
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "Public client access schedule_milestones" on public.schedule_milestones;
create policy "Public client access schedule_milestones" on public.schedule_milestones
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "Public client access quick_links" on public.quick_links;
create policy "Public client access quick_links" on public.quick_links
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "Public client access standups" on public.standups;
create policy "Public client access standups" on public.standups
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "Public client access team_reports" on public.team_reports;
create policy "Public client access team_reports" on public.team_reports
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "Public client access tasks" on public.tasks;
create policy "Public client access tasks" on public.tasks
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "Public client access calendar_events" on public.calendar_events;
create policy "Public client access calendar_events" on public.calendar_events
  for all to anon, authenticated using (true) with check (true);

-- ============================================================================
-- TRIGGER: AUTO-CREATE / SYNC USER PROFILE ON GOOGLE OAUTH SIGN-IN
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_pre_assigned boolean := lower(new.email) in (
    'datpltn205@gmail.com',
    '23010163@st.phenikaa-uni.edu.vn',
    '23010196@st.phenikaa-uni.edu.vn',
    '23013303@st.phenikaa-uni.edu.vn'
  );
  user_role text := case when lower(new.email) = 'datpltn205@gmail.com' then 'admin' else 'member' end;
begin
  insert into public.users (id, name, email, avatar_url, role, team_id, connected_profiles)
  values (
    new.id::text,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    user_role,
    case when is_pre_assigned then 'team-alpha' else null end,
    jsonb_build_object(
      'github', '',
      'discord', '',
      'linkedin', '',
      'portfolio', '',
      'systemRole', user_role,
      'teamAssigned', is_pre_assigned,
      'pendingJoinRequest', null
    )
  )
  on conflict (email) do update set
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- DEFAULT TEAM (Required for foreign keys on new Google OAuth sign-ins)
-- ============================================================================

insert into public.teams (id, code, name, project_name, slogan, description, mentor_name, github_repo_url, discord_invite_url, progress)
values (
  'team-alpha',
  'INV-01',
  'INNOVARD Team',
  'Dự án của đội',
  '',
  'Cập nhật mô tả đề tài và liên kết của đội tại trang Đội của tôi.',
  'Chưa cập nhật',
  'https://github.com',
  'https://discord.com',
  0
)
on conflict (id) do nothing;

-- ============================================================================
-- PRE-REGISTERED TEAM MEMBERS (Assigned to Admin's default team)
-- ============================================================================

insert into public.users (id, name, email, role, title, bio, skills, team_id, connected_profiles)
values
  (
    'user-23010163',
    '23010163',
    '23010163@st.phenikaa-uni.edu.vn',
    'member',
    'Thành viên dự án',
    'Thành viên đội dự án INNOVARD.',
    array['Teamwork'],
    'team-alpha',
    '{"github": "", "discord": "", "linkedin": "", "portfolio": "", "systemRole": "member", "pendingJoinRequest": null}'::jsonb
  ),
  (
    'user-23010196',
    '23010196',
    '23010196@st.phenikaa-uni.edu.vn',
    'member',
    'Thành viên dự án',
    'Thành viên đội dự án INNOVARD.',
    array['Teamwork'],
    'team-alpha',
    '{"github": "", "discord": "", "linkedin": "", "portfolio": "", "systemRole": "member", "pendingJoinRequest": null}'::jsonb
  ),
  (
    'user-23013303',
    '23013303',
    '23013303@st.phenikaa-uni.edu.vn',
    'member',
    'Thành viên dự án',
    'Thành viên đội dự án INNOVARD.',
    array['Teamwork'],
    'team-alpha',
    '{"github": "", "discord": "", "linkedin": "", "portfolio": "", "systemRole": "member", "pendingJoinRequest": null}'::jsonb
  )
on conflict (email) do update set
  team_id = excluded.team_id,
  updated_at = now();
