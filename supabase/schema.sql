create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'admin', 'reviewer', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create table if not exists public.user_profiles (
  user_id uuid primary key,
  username text not null,
  display_name text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (username ~ '^[a-z0-9][a-z0-9_-]{2,31}$')
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  visibility text not null default 'team' check (visibility in ('private', 'team', 'public')),
  created_at timestamptz not null default now(),
  unique (org_id, slug)
);

create table if not exists public.agent_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  created_by uuid,
  name text not null,
  secret_hash text not null unique,
  key_prefix text not null,
  scopes text[] not null default array['playbooks:read', 'incidents:write', 'resolutions:publish'],
  rotated_from uuid references public.agent_keys(id) on delete set null,
  revoked_by uuid,
  revoked_reason text,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  created_by uuid,
  created_by_agent_key uuid references public.agent_keys(id) on delete set null,
  title text not null,
  error_signature text not null,
  signal_type text not null default 'error' check (signal_type in ('error', 'failed_fix', 'verification', 'note')),
  language text,
  framework text,
  package_manager text,
  command text,
  exit_code integer,
  dependency_versions jsonb not null default '{}',
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  redacted_context text,
  encrypted_context text,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  visibility text not null default 'team' check (visibility in ('private', 'team', 'public')),
  created_at timestamptz not null default now()
);

create table if not exists public.playbook_submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  incident_id uuid references public.incidents(id) on delete set null,
  submitted_by uuid,
  submitted_by_agent_key uuid references public.agent_keys(id) on delete set null,
  title text not null,
  error_signature text not null,
  language text,
  framework text,
  package_manager text,
  root_cause text not null,
  failed_attempts jsonb not null default '[]',
  final_fix text not null,
  verification_command text,
  playbook_md text not null,
  encrypted_payload text,
  risk text not null default 'medium' check (risk in ('low', 'medium', 'high')),
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'private')),
  visibility text not null default 'team' check (visibility in ('private', 'team', 'public')),
  reviewer_id uuid,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.playbooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  source_submission_id uuid references public.playbook_submissions(id) on delete set null,
  approved_by uuid,
  title text not null,
  error_signature text not null,
  language text,
  framework text,
  package_manager text,
  root_cause text not null,
  playbook_md text not null,
  verification_command text,
  risk text not null default 'medium' check (risk in ('low', 'medium', 'high')),
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  visibility text not null default 'team' check (visibility in ('private', 'team', 'public')),
  worked_count integer not null default 0,
  failed_count integer not null default 0,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(error_signature, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(root_cause, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(playbook_md, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playbook_votes (
  id uuid primary key default gen_random_uuid(),
  playbook_id uuid not null references public.playbooks(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid,
  agent_key_id uuid references public.agent_keys(id) on delete set null,
  vote text not null check (vote in ('worked', 'failed')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid,
  actor_agent_key_id uuid references public.agent_keys(id) on delete set null,
  event_name text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.contribution_days (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid,
  agent_key_id uuid references public.agent_keys(id) on delete cascade,
  day date not null,
  submitted_count integer not null default 0,
  approved_count integer not null default 0,
  rejected_count integer not null default 0
);

create index if not exists idx_playbooks_search on public.playbooks using gin (search_vector);
create index if not exists idx_playbooks_org_visibility on public.playbooks (org_id, visibility);
create index if not exists idx_submissions_org_status on public.playbook_submissions (org_id, status);
create index if not exists idx_incidents_org_signature on public.incidents (org_id, error_signature);
create index if not exists idx_agent_keys_hash on public.agent_keys (secret_hash);
create unique index if not exists idx_user_profiles_username_lower on public.user_profiles (lower(username));
create index if not exists idx_user_profiles_created on public.user_profiles (created_at desc);

with duplicate_active_agent_keys as (
  select
    id,
    row_number() over (
      partition by org_id
      order by created_at desc, id desc
    ) as duplicate_rank
  from public.agent_keys
  where revoked_at is null
)
update public.agent_keys
set
  revoked_at = now(),
  revoked_reason = 'single_active_key_cleanup'
where id in (
  select id
  from duplicate_active_agent_keys
  where duplicate_rank > 1
);

create unique index if not exists idx_agent_keys_unique_active_name on public.agent_keys (org_id, lower(name)) where revoked_at is null;
create unique index if not exists idx_agent_keys_one_active_per_org on public.agent_keys (org_id) where revoked_at is null;
create index if not exists idx_audit_events_org_created on public.audit_events (org_id, created_at desc);
create index if not exists idx_contribution_days_lookup on public.contribution_days (org_id, day);

alter table public.incidents add column if not exists signal_type text not null default 'error';
alter table public.incidents add column if not exists command text;
alter table public.incidents add column if not exists exit_code integer;
alter table public.incidents add column if not exists dependency_versions jsonb not null default '{}';
alter table public.incidents add column if not exists encrypted_context text;
alter table public.playbook_submissions add column if not exists encrypted_payload text;
alter table public.playbooks add column if not exists approved_by uuid;
alter table public.user_profiles add column if not exists display_name text;
alter table public.user_profiles add column if not exists bio text;
alter table public.user_profiles add column if not exists updated_at timestamptz not null default now();
alter table public.agent_keys add column if not exists rotated_from uuid references public.agent_keys(id) on delete set null;
alter table public.agent_keys add column if not exists revoked_by uuid;
alter table public.agent_keys add column if not exists revoked_reason text;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.user_profiles enable row level security;
alter table public.projects enable row level security;
alter table public.agent_keys enable row level security;
alter table public.incidents enable row level security;
alter table public.playbook_submissions enable row level security;
alter table public.playbooks enable row level security;
alter table public.playbook_votes enable row level security;
alter table public.audit_events enable row level security;
alter table public.contribution_days enable row level security;
