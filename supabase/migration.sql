-- ============================================================
-- BluCru Task Board — Full Migration
-- ============================================================

-- ---------- profiles ----------
create table if not exists profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'user',
  avatar     text,
  created_at timestamptz not null default now()
);

-- ---------- projects ----------
create table if not exists projects (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  department     text not null,
  color          text,
  external_links jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);

-- ---------- sop_templates ----------
create table if not exists sop_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  department  text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ---------- sop_template_tasks ----------
create table if not exists sop_template_tasks (
  id              uuid primary key default gen_random_uuid(),
  sop_template_id uuid not null references sop_templates on delete cascade,
  sequence        int not null,
  title           text not null,
  duration_days   int,
  default_urgency text not null default 'medium',
  created_at      timestamptz not null default now()
);

-- ---------- tasks ----------
create table if not exists tasks (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  description           text,
  department            text not null,
  project_id            uuid references projects on delete set null,
  urgency               text not null default 'medium',
  status                text not null default 'inbox',
  assignee_id           uuid references profiles on delete set null,
  assigned_by           uuid references profiles on delete set null,
  due_date              date,
  tags                  text[] not null default '{}',
  recurring_frequency   text,
  recurring_auto_create boolean not null default false,
  recurring_parent_id   uuid references tasks on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------- task_activity ----------
create table if not exists task_activity (
  id        uuid primary key default gen_random_uuid(),
  task_id   uuid not null references tasks on delete cascade,
  type      text not null,
  user_id   uuid references profiles on delete set null,
  timestamp timestamptz not null default now(),
  data      jsonb
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_tasks_assignee_id on tasks (assignee_id);
create index if not exists idx_tasks_project_id  on tasks (project_id);
create index if not exists idx_tasks_status       on tasks (status);
create index if not exists idx_tasks_due_date     on tasks (due_date);
create index if not exists idx_task_activity_task  on task_activity (task_id);

-- ============================================================
-- handle_new_user trigger (auto-create profile on signup)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- is_admin() helper
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

-- ---------- profiles ----------
alter table profiles enable row level security;

create policy "Authenticated users can read all profiles"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- projects ----------
alter table projects enable row level security;

create policy "Authenticated users can read projects"
  on projects for select
  to authenticated
  using (true);

create policy "Authenticated users can insert projects"
  on projects for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update projects"
  on projects for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete projects"
  on projects for delete
  to authenticated
  using (true);

-- ---------- tasks ----------
alter table tasks enable row level security;

create policy "Authenticated users can read tasks"
  on tasks for select
  to authenticated
  using (true);

create policy "Authenticated users can insert tasks"
  on tasks for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update tasks"
  on tasks for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete tasks"
  on tasks for delete
  to authenticated
  using (true);

-- ---------- task_activity ----------
alter table task_activity enable row level security;

create policy "Authenticated users can read task activity"
  on task_activity for select
  to authenticated
  using (true);

create policy "Authenticated users can insert task activity"
  on task_activity for insert
  to authenticated
  with check (true);

-- ---------- sop_templates ----------
alter table sop_templates enable row level security;

create policy "Authenticated users can read sop templates"
  on sop_templates for select
  to authenticated
  using (true);

create policy "Authenticated users can insert sop templates"
  on sop_templates for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update sop templates"
  on sop_templates for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete sop templates"
  on sop_templates for delete
  to authenticated
  using (true);

-- ---------- sop_template_tasks ----------
alter table sop_template_tasks enable row level security;

create policy "Authenticated users can read sop template tasks"
  on sop_template_tasks for select
  to authenticated
  using (true);

create policy "Authenticated users can insert sop template tasks"
  on sop_template_tasks for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update sop template tasks"
  on sop_template_tasks for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete sop template tasks"
  on sop_template_tasks for delete
  to authenticated
  using (true);

-- ============================================================
-- Seed data: SOP Templates
-- ============================================================

-- Client Onboarding (7 steps)
with tpl as (
  insert into sop_templates (name, department, description)
  values ('Client Onboarding', 'Operations', 'Standard process for onboarding a new client')
  returning id
)
insert into sop_template_tasks (sop_template_id, sequence, title, duration_days, default_urgency)
select tpl.id, seq, title, days, urgency
from tpl,
(values
  (1, 'Collect signed contract and ID documents', 2, 'high'),
  (2, 'Set up client in billing system', 1, 'high'),
  (3, 'Create shared folder and grant access', 1, 'medium'),
  (4, 'Schedule kick-off meeting', 2, 'medium'),
  (5, 'Send welcome pack and handbook', 1, 'low'),
  (6, 'Assign account manager', 1, 'high'),
  (7, 'Confirm onboarding complete and file paperwork', 1, 'low')
) as s(seq, title, days, urgency);

-- Monthly Financial Close (6 steps)
with tpl as (
  insert into sop_templates (name, department, description)
  values ('Monthly Financial Close', 'Finance', 'End-of-month financial reconciliation and reporting')
  returning id
)
insert into sop_template_tasks (sop_template_id, sequence, title, duration_days, default_urgency)
select tpl.id, seq, title, days, urgency
from tpl,
(values
  (1, 'Reconcile bank statements', 2, 'high'),
  (2, 'Process outstanding invoices', 2, 'high'),
  (3, 'Review expense reports', 1, 'medium'),
  (4, 'Generate profit & loss report', 1, 'high'),
  (5, 'Submit VAT return', 2, 'high'),
  (6, 'Archive documents and close period', 1, 'low')
) as s(seq, title, days, urgency);

-- Employee Hiring (8 steps)
with tpl as (
  insert into sop_templates (name, department, description)
  values ('Employee Hiring', 'HR', 'Full hiring pipeline from job post to first day')
  returning id
)
insert into sop_template_tasks (sop_template_id, sequence, title, duration_days, default_urgency)
select tpl.id, seq, title, days, urgency
from tpl,
(values
  (1, 'Draft and approve job description', 2, 'medium'),
  (2, 'Post vacancy on job boards', 1, 'medium'),
  (3, 'Screen CVs and shortlist candidates', 5, 'high'),
  (4, 'Schedule and conduct interviews', 5, 'high'),
  (5, 'Perform reference checks', 3, 'medium'),
  (6, 'Send offer letter', 1, 'high'),
  (7, 'Prepare workstation and accounts', 2, 'medium'),
  (8, 'Conduct Day 1 induction', 1, 'high')
) as s(seq, title, days, urgency);

-- Invoice Processing (6 steps)
with tpl as (
  insert into sop_templates (name, department, description)
  values ('Invoice Processing', 'Finance', 'Standard workflow for receiving and paying supplier invoices')
  returning id
)
insert into sop_template_tasks (sop_template_id, sequence, title, duration_days, default_urgency)
select tpl.id, seq, title, days, urgency
from tpl,
(values
  (1, 'Receive and log invoice', 1, 'medium'),
  (2, 'Match invoice to purchase order', 1, 'high'),
  (3, 'Get line-manager approval', 2, 'high'),
  (4, 'Enter into accounting system', 1, 'medium'),
  (5, 'Schedule payment run', 2, 'medium'),
  (6, 'Confirm payment and file proof', 1, 'low')
) as s(seq, title, days, urgency);

-- ============================================================
-- Seed data: Sample Projects
-- ============================================================
insert into projects (name, department, color, external_links) values
  ('Website Redesign', 'IT Support', '#3b82f6', '[]'::jsonb),
  ('Q2 Budget Review', 'Finance', '#f59e0b', '[]'::jsonb);
