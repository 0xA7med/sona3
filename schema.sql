-- ================================================================
-- صناع السعادة V2 — Unified Database Schema
-- ================================================================
-- هذا الملف يجمع كل ملفات SQL المنفصلة في ملف واحد للتشغيل من الصفر.
-- تاريخ الإنشاء: 2026-05-24
-- ================================================================

-- 0. Extensions
create extension if not exists "uuid-ossp";

-- ================================================================
-- 1. PROFILES (المستخدمون — Admins & Volunteers)
-- ================================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text check (role in ('admin', 'volunteer')) not null default 'volunteer',
  phone text,
  zone text,
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- ================================================================
-- 2. CAMPAIGNS (الحملات)
-- ================================================================
create table if not exists public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  campaign_type text check (campaign_type in ('financial','food_basket','clothing','school_supplies','other')) default 'financial',
  start_date date not null,
  end_date date,
  budget numeric(12,2) default 0,
  amount_per_family numeric(10,2) default 0,
  targeting_rules jsonb default '[]'::jsonb,
  distribution_mode text check (distribution_mode in ('age','school_stage','children_count')) default 'age',
  age_brackets jsonb default '[]'::jsonb,
  stage_brackets jsonb default '[]'::jsonb,
  children_brackets jsonb default '[]'::jsonb,
  commission_rules jsonb default '[]'::jsonb,
  is_auto_calculate boolean default false,
  status text check (status in ('draft','active','completed','paused')) default 'draft',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now()
);

-- ================================================================
-- 3. FAMILIES (الأسر)
-- ================================================================
create sequence if not exists family_seq start 1;

create table if not exists public.families (
  id uuid default uuid_generate_v4() primary key,
  sequential_id text unique,
  mother_name text not null,
  national_id varchar(14) unique,
  phone varchar(15),
  phone_alt varchar(15),
  address text,
  governorate text,
  district text,
  date_of_birth date,
  age int,
  gender text check (gender in ('M','F')),
  social_status text check (social_status in ('widow','divorced','married','single','unknown')) default 'unknown',
  has_chronic_illness boolean default false,
  is_disabled boolean default false,
  husband_name text,
  husband_national_id varchar(14),
  medical_notes text,
  priority_score int default 0,
  vulnerability_score int default 0,
  notes text,
  internal_notes text,
  status text check (status in ('active','archived','needs_review')) default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now()
);

-- ================================================================
-- 4. CHILDREN (الأطفال)
-- ================================================================
create table if not exists public.children (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references public.families(id) on delete cascade not null,
  child_name text not null,
  national_id varchar(14),
  date_of_birth date,
  age int,
  gender text check (gender in ('M','F')),
  grade_level text,
  educational_grade text,
  school_stage text check (school_stage in ('preschool','primary','preparatory','secondary','university','graduated','not_in_school')),
  is_orphan boolean default false,
  notes text,
  created_at timestamptz default now() not null
);

-- ================================================================
-- 5. CASE ASSIGNMENTS (إسناد الحالات)
-- ================================================================
create table if not exists public.case_assignments (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  family_id uuid references public.families(id) on delete cascade not null,
  volunteer_id uuid references public.profiles(id) on delete set null,
  status text check (status in ('pending','in_progress','completed','no_answer','unreachable','skipped')) default 'pending',
  assigned_at timestamptz default now(),
  completed_at timestamptz,
  notes text,
  unique (campaign_id, family_id)
);

-- ================================================================
-- 6. CASE LOCKS (أقفال التزامن)
-- ================================================================
create table if not exists public.case_locks (
  family_id uuid references public.families(id) on delete cascade primary key,
  campaign_id uuid references public.campaigns(id),
  locked_by uuid references public.profiles(id) on delete cascade not null,
  locked_by_name text,
  locked_at timestamptz default now() not null,
  expires_at timestamptz default (now() + interval '30 minutes')
);

-- ================================================================
-- 7. TRANSACTIONS (المعاملات)
-- ================================================================
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) not null,
  family_id uuid references public.families(id) not null,
  assignment_id uuid references public.case_assignments(id),
  volunteer_id uuid references public.profiles(id) not null,
  amount numeric(10,2) not null,
  base_amount numeric(10,2),
  fee_amount numeric(10,2),
  total_amount numeric(10,2),
  transaction_type text check (transaction_type in ('financial_transfer','food_basket','clothing','school_supplies','other')) default 'financial_transfer',
  status text check (status in ('pending','completed','failed','cancelled')) default 'completed',
  notes text,
  proof_url text,
  created_at timestamptz default now() not null
);

-- ================================================================
-- 8. CASE HISTORY (سجل الأحداث)
-- ================================================================
create table if not exists public.case_history (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references public.families(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text,
  action_type text not null check (action_type in (
    'CREATED','UPDATED','CALLED_NO_ANSWER','UNREACHABLE',
    'CONTACTED','TRANSFER_DONE','ASSIGNED','NOTE_ADDED','STATUS_CHANGED'
  )),
  description text,
  metadata jsonb default '{}'::jsonb,
  campaign_id uuid references public.campaigns(id),
  created_at timestamptz default now() not null
);

-- ================================================================
-- 9. VOLUNTEER FUND TRANSFERS (تحويلات أموال المتطوعين)
-- ================================================================
create table if not exists public.volunteer_fund_transfers (
  id uuid default gen_random_v4() primary key,
  sender_id uuid references auth.users(id),
  receiver_id uuid references auth.users(id),
  campaign_id uuid references public.campaigns(id),
  amount numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz default now()
);

-- ================================================================
-- 10. DATA UPDATE REQUESTS (طلبات تعديل البيانات)
-- ================================================================
create table if not exists public.data_update_requests (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references public.families(id) not null,
  volunteer_id uuid references public.profiles(id) not null,
  requested_changes jsonb not null default '{}'::jsonb,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  rejection_reason text,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  reviewed_at timestamptz
);

-- ================================================================
-- 11. INDEXES
-- ================================================================
create index if not exists idx_families_social_status on public.families(social_status);
create index if not exists idx_families_priority_score on public.families(priority_score);
create index if not exists idx_families_governorate on public.families(governorate);
create index if not exists idx_families_status on public.families(status);
create index if not exists idx_children_family_id on public.children(family_id);
create index if not exists idx_assignments_campaign on public.case_assignments(campaign_id);
create index if not exists idx_assignments_volunteer on public.case_assignments(volunteer_id);
create index if not exists idx_assignments_status on public.case_assignments(status);
create index if not exists idx_transactions_campaign on public.transactions(campaign_id);
create index if not exists idx_transactions_volunteer on public.transactions(volunteer_id);
create index if not exists idx_history_family on public.case_history(family_id);
create index if not exists idx_locks_expires on public.case_locks(expires_at);

-- ================================================================
-- 12. ROW LEVEL SECURITY
-- ================================================================

-- Safe role checker (breaks infinite recursion)
create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.families enable row level security;
alter table public.children enable row level security;
alter table public.case_assignments enable row level security;
alter table public.case_locks enable row level security;
alter table public.transactions enable row level security;
alter table public.case_history enable row level security;
alter table public.volunteer_fund_transfers enable row level security;
alter table public.data_update_requests enable row level security;

-- Profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.get_my_role() = 'admin');

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.get_my_role() = 'admin');

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
  for delete using (public.get_my_role() = 'admin');

-- Campaigns
drop policy if exists "campaigns_select" on public.campaigns;
create policy "campaigns_select" on public.campaigns
  for select using (auth.uid() is not null);

drop policy if exists "campaigns_all_admin" on public.campaigns;
create policy "campaigns_all_admin" on public.campaigns
  for all using (public.get_my_role() = 'admin');

-- Families
drop policy if exists "families_select" on public.families;
create policy "families_select" on public.families
  for select using (auth.uid() is not null);

drop policy if exists "families_all_admin" on public.families;
create policy "families_all_admin" on public.families
  for all using (public.get_my_role() = 'admin');

-- Children
drop policy if exists "children_select" on public.children;
create policy "children_select" on public.children
  for select using (auth.uid() is not null);

drop policy if exists "children_all_admin" on public.children;
create policy "children_all_admin" on public.children
  for all using (public.get_my_role() = 'admin');

-- Case Assignments
drop policy if exists "assignments_select" on public.case_assignments;
create policy "assignments_select" on public.case_assignments
  for select using (auth.uid() is not null);

drop policy if exists "assignments_update_volunteer" on public.case_assignments;
create policy "assignments_update_volunteer" on public.case_assignments
  for update using (volunteer_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "assignments_all_admin" on public.case_assignments;
create policy "assignments_all_admin" on public.case_assignments
  for all using (public.get_my_role() = 'admin');

-- Case Locks
drop policy if exists "locks_select" on public.case_locks;
create policy "locks_select" on public.case_locks
  for select using (auth.uid() is not null);

drop policy if exists "locks_insert_volunteer" on public.case_locks;
create policy "locks_insert_volunteer" on public.case_locks
  for insert with check (auth.uid() = locked_by);

drop policy if exists "locks_delete_self" on public.case_locks;
create policy "locks_delete_self" on public.case_locks
  for delete using (auth.uid() = locked_by or public.get_my_role() = 'admin');

-- Transactions
drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions
  for select using (auth.uid() is not null);

drop policy if exists "transactions_insert" on public.transactions;
create policy "transactions_insert" on public.transactions
  for insert with check (auth.uid() = volunteer_id);

-- Case History
drop policy if exists "history_select" on public.case_history;
create policy "history_select" on public.case_history
  for select using (auth.uid() is not null);

drop policy if exists "history_insert" on public.case_history;
create policy "history_insert" on public.case_history
  for insert with check (auth.uid() is not null);

-- Volunteer Fund Transfers
drop policy if exists "fund_transfers_select" on public.volunteer_fund_transfers;
create policy "fund_transfers_select" on public.volunteer_fund_transfers
  for select using (auth.uid() = receiver_id or public.get_my_role() = 'admin');

drop policy if exists "fund_transfers_insert_admin" on public.volunteer_fund_transfers;
create policy "fund_transfers_insert_admin" on public.volunteer_fund_transfers
  for insert with check (public.get_my_role() = 'admin');

-- Data Update Requests
drop policy if exists "updates_select" on public.data_update_requests;
create policy "updates_select" on public.data_update_requests
  for select using (auth.uid() = volunteer_id or public.get_my_role() = 'admin');

drop policy if exists "updates_insert" on public.data_update_requests;
create policy "updates_insert" on public.data_update_requests
  for insert with check (auth.uid() = volunteer_id);

drop policy if exists "updates_update_admin" on public.data_update_requests;
create policy "updates_update_admin" on public.data_update_requests
  for update using (public.get_my_role() = 'admin');

-- ================================================================
-- 13. TRIGGERS
-- ================================================================

-- 13a. Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, phone, zone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'volunteer'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'zone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 13b. Auto-generate sequential ID for families
create or replace function public.set_sequential_id()
returns trigger as $$
begin
  if new.sequential_id is null then
    new.sequential_id := 'CASE-' || lpad(nextval('family_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_set_sequential_id on public.families;
create trigger tr_set_sequential_id
  before insert on public.families
  for each row execute procedure public.set_sequential_id();

-- 13c. Release lock when transaction is recorded
create or replace function public.release_lock_on_transaction()
returns trigger as $$
begin
  delete from public.case_locks where family_id = new.family_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_release_lock_after_transaction on public.transactions;
create trigger tr_release_lock_after_transaction
  after insert on public.transactions
  for each row execute function public.release_lock_on_transaction();

-- ================================================================
-- 14. RPC FUNCTIONS
-- ================================================================

-- 14a. Calculate priority score
create or replace function public.calculate_priority_score(
  p_social_status text,
  p_has_chronic_illness boolean,
  p_is_disabled boolean,
  p_children_count int,
  p_vulnerability_score int
) returns int as $$
declare
  score int := 0;
begin
  if p_social_status = 'widow' then score := score + 20; end if;
  if p_social_status = 'divorced' then score := score + 15; end if;
  if p_has_chronic_illness then score := score + 15; end if;
  if p_is_disabled then score := score + 20; end if;
  score := score + least(p_children_count * 5, 30);
  score := score + (p_vulnerability_score / 10);
  return least(score, 100);
end;
$$ language plpgsql;

-- 14b. Cleanup expired locks
create or replace function public.cleanup_expired_locks()
returns void as $$
begin
  delete from public.case_locks where expires_at < now();
end;
$$ language plpgsql;

-- 14c. Reserve a single case for a volunteer
create or replace function public.reserve_single_case(
  p_volunteer_id uuid,
  p_family_id uuid,
  p_campaign_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_assignment_id uuid;
begin
  if exists (
    select 1 from case_assignments
    where family_id = p_family_id
      and campaign_id = p_campaign_id
      and volunteer_id is not null
      and status not in ('no_answer', 'unreachable')
  ) then
    return jsonb_build_object('success', false, 'message', 'already_assigned');
  end if;

  insert into case_assignments (campaign_id, family_id, volunteer_id, status, assigned_at)
  values (p_campaign_id, p_family_id, p_volunteer_id, 'in_progress', now())
  on conflict (campaign_id, family_id) do update
    set volunteer_id = p_volunteer_id,
        status = 'in_progress',
        assigned_at = now()
  where case_assignments.status in ('pending', 'no_answer', 'unreachable')
  returning id into v_assignment_id;

  if v_assignment_id is null then
    return jsonb_build_object('success', false, 'message', 'conflict');
  end if;

  insert into case_locks (family_id, campaign_id, locked_by, locked_at, expires_at)
  values (p_family_id, p_campaign_id, p_volunteer_id, now(), now() + interval '30 minutes')
  on conflict (family_id) do update set
    campaign_id = p_campaign_id,
    locked_by = p_volunteer_id,
    locked_at = now(),
    expires_at = now() + interval '30 minutes';

  return jsonb_build_object('success', true, 'assignment_id', v_assignment_id);
end;
$$;

-- 14d. Reserve a batch of cases
create or replace function public.reserve_case_batch(
  p_volunteer_id uuid,
  p_campaign_id uuid,
  p_limit int default 10
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_count int := 0;
begin
  with available as (
    select id from case_assignments
    where campaign_id = p_campaign_id
      and status in ('pending', 'no_answer', 'unreachable')
    order by random()
    limit p_limit
    for update skip locked
  )
  update case_assignments
  set volunteer_id = p_volunteer_id,
      status = 'in_progress',
      assigned_at = now()
  from available
  where case_assignments.id = available.id;

  get diagnostics v_count = row_count;
  return jsonb_build_object('success', true, 'reserved', v_count);
end;
$$;

-- 14e. Release volunteer session
create or replace function public.release_volunteer_session(
  p_volunteer_id uuid,
  p_campaign_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  update case_assignments
  set volunteer_id = null,
      status = 'pending',
      assigned_at = null
  where volunteer_id = p_volunteer_id
    and campaign_id = p_campaign_id
    and status = 'in_progress';

  get diagnostics v_count = row_count;
  delete from case_locks where locked_by = p_volunteer_id;

  return jsonb_build_object('success', true, 'released', v_count);
end;
$$;

-- 14f. Activate user (admin only)
create or replace function public.activate_user_secure(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
begin
  if public.get_my_role() != 'admin' then
    return jsonb_build_object('success', false, 'message', 'unauthorized');
  end if;

  update public.profiles set is_active = true where id = p_user_id;

  if found then
    return jsonb_build_object('success', true, 'message', 'activated');
  else
    return jsonb_build_object('success', false, 'message', 'user_not_found');
  end if;
end;
$$;

-- ================================================================
-- 15. REALTIME
-- ================================================================
alter table public.case_locks replica identity full;
alter table public.case_assignments replica identity full;
alter publication supabase_realtime add table public.case_locks;
alter publication supabase_realtime add table public.case_assignments;

-- ================================================================
-- ✅ DONE — Schema جاهز
-- ================================================================
