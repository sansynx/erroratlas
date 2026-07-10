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
  project_id uuid references public.projects(id) on delete cascade,
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

create or replace function public.replace_active_agent_key(
  p_org_id uuid,
  p_project_id uuid,
  p_created_by uuid,
  p_name text,
  p_secret_hash text,
  p_key_prefix text,
  p_scopes text[],
  p_rotated_from uuid default null
)
returns table(id uuid)
language plpgsql
set search_path = public
as $$
declare
  new_key_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_org_id::text, 0));

  if p_rotated_from is null then
    if exists (
      select 1 from public.agent_keys
      where org_id = p_org_id and revoked_at is null
    ) then
      raise exception using errcode = '23505', message = 'an active agent key already exists';
    end if;
  else
    update public.agent_keys
    set
      revoked_at = now(),
      revoked_by = p_created_by,
      revoked_reason = 'rotated'
    where id = p_rotated_from
      and org_id = p_org_id
      and revoked_at is null;

    if not found then
      raise exception using errcode = 'P0002', message = 'agent key is no longer active';
    end if;
  end if;

  insert into public.agent_keys (
    org_id,
    project_id,
    created_by,
    name,
    secret_hash,
    key_prefix,
    rotated_from,
    scopes
  ) values (
    p_org_id,
    p_project_id,
    p_created_by,
    p_name,
    p_secret_hash,
    p_key_prefix,
    p_rotated_from,
    p_scopes
  ) returning agent_keys.id into new_key_id;

  return query select new_key_id;
end;
$$;

revoke all on function public.replace_active_agent_key(uuid, uuid, uuid, text, text, text, text[], uuid) from public;
grant execute on function public.replace_active_agent_key(uuid, uuid, uuid, text, text, text, text[], uuid) to service_role;

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

update public.agent_keys as agent_key
set
  revoked_at = coalesce(agent_key.revoked_at, now()),
  revoked_reason = coalesce(agent_key.revoked_reason, 'invalid_project_scope_cleanup')
where agent_key.project_id is not null
  and not exists (
    select 1
    from public.projects as project
    where project.id = agent_key.project_id
      and project.org_id = agent_key.org_id
  );

update public.incidents as incident
set project_id = null
where incident.project_id is not null
  and not exists (
    select 1 from public.projects as project
    where project.id = incident.project_id and project.org_id = incident.org_id
  );

update public.playbook_submissions as submission
set project_id = null
where submission.project_id is not null
  and not exists (
    select 1 from public.projects as project
    where project.id = submission.project_id and project.org_id = submission.org_id
  );

update public.playbooks as playbook
set project_id = null
where playbook.project_id is not null
  and not exists (
    select 1 from public.projects as project
    where project.id = playbook.project_id and project.org_id = playbook.org_id
  );

alter table public.agent_keys drop constraint if exists agent_keys_project_id_fkey;
alter table public.agent_keys
  add constraint agent_keys_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

create or replace function public.enforce_project_organization()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.project_id is not null and not exists (
    select 1 from public.projects
    where id = new.project_id and org_id = new.org_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'project must belong to organization';
  end if;
  return new;
end;
$$;

drop trigger if exists agent_keys_project_organization on public.agent_keys;
create trigger agent_keys_project_organization
before insert or update of project_id, org_id on public.agent_keys
for each row execute function public.enforce_project_organization();

drop trigger if exists incidents_project_organization on public.incidents;
create trigger incidents_project_organization
before insert or update of project_id, org_id on public.incidents
for each row execute function public.enforce_project_organization();

drop trigger if exists submissions_project_organization on public.playbook_submissions;
create trigger submissions_project_organization
before insert or update of project_id, org_id on public.playbook_submissions
for each row execute function public.enforce_project_organization();

drop trigger if exists playbooks_project_organization on public.playbooks;
create trigger playbooks_project_organization
before insert or update of project_id, org_id on public.playbooks
for each row execute function public.enforce_project_organization();

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
