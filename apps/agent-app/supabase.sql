create table if not exists public.agent_credentials (
  client_id text not null,
  agent_id text not null,
  encrypted_payload text not null,
  updated_at timestamptz not null default now(),
  primary key (client_id, agent_id)
);

alter table public.agent_credentials enable row level security;

-- Service role key bypasses RLS. Keep public access disabled.
drop policy if exists "deny all" on public.agent_credentials;
create policy "deny all"
on public.agent_credentials
for all
using (false)
with check (false);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  agent_id text not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_client_updated_idx
on public.conversations (client_id, updated_at desc);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null,
  content text not null,
  source text not null default 'user',
  created_at timestamptz not null default now()
);

create index if not exists conversation_messages_conversation_created_idx
on public.conversation_messages (conversation_id, created_at asc);

create table if not exists public.cron_jobs (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  agent_id text not null,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  name text not null,
  prompt text not null,
  schedule_type text not null,
  schedule_value text not null,
  timezone text not null default 'America/New_York',
  enabled boolean not null default true,
  is_running boolean not null default false,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cron_jobs_due_idx
on public.cron_jobs (enabled, next_run_at);

create table if not exists public.cron_job_runs (
  id uuid primary key default gen_random_uuid(),
  cron_job_id uuid not null references public.cron_jobs(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  output text,
  error text
);

create index if not exists cron_job_runs_job_started_idx
on public.cron_job_runs (cron_job_id, started_at desc);

alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.cron_jobs enable row level security;
alter table public.cron_job_runs enable row level security;

drop policy if exists "deny all" on public.conversations;
create policy "deny all" on public.conversations for all using (false) with check (false);

drop policy if exists "deny all" on public.conversation_messages;
create policy "deny all" on public.conversation_messages for all using (false) with check (false);

drop policy if exists "deny all" on public.cron_jobs;
create policy "deny all" on public.cron_jobs for all using (false) with check (false);

drop policy if exists "deny all" on public.cron_job_runs;
create policy "deny all" on public.cron_job_runs for all using (false) with check (false);
