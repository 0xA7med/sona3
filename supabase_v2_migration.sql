-- ================================================================
-- صناع السعادة V2 - Database Migration
-- قم بتشغيل هذا الملف في Supabase SQL Editor
-- ================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ================================================================
-- 1. PROFILES (Admins & Volunteers) - تحديث الجدول الموجود
-- ================================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text check (role in ('admin', 'volunteer')) not null default 'volunteer',
  phone text,
  zone text, -- منطقة عمل المتطوع
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- Add missing columns to profiles if they don't exist
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='phone') then
    alter table public.profiles add column phone text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='zone') then
    alter table public.profiles add column zone text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='is_active') then
    alter table public.profiles add column is_active boolean default true;
  end if;
end $$;

-- ================================================================
-- 2. CAMPAIGNS (الحملات) - تحديث وتوسيع
-- ================================================================
create table if not exists public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  campaign_type text check (campaign_type in ('financial', 'food_basket', 'clothing', 'school_supplies', 'other')) default 'financial',
  start_date date not null,
  end_date date,
  budget numeric(12, 2) default 0,
  amount_per_family numeric(10,2) default 0, -- المبلغ المخصص لكل أسرة
  targeting_rules jsonb default '[]'::jsonb, -- قواعد الاستهداف الذكي
  status text check (status in ('draft', 'active', 'completed', 'paused')) default 'draft',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now()
);

-- Add missing columns to campaigns
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='description') then
    alter table public.campaigns add column description text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='campaign_type') then
    alter table public.campaigns add column campaign_type text default 'financial';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='amount_per_family') then
    alter table public.campaigns add column amount_per_family numeric(10,2) default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='targeting_rules') then
    alter table public.campaigns add column targeting_rules jsonb default '[]'::jsonb;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='created_by') then
    alter table public.campaigns add column created_by uuid references public.profiles(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='updated_at') then
    alter table public.campaigns add column updated_at timestamptz default now();
  end if;
end $$;

-- ================================================================
-- 3. FAMILIES (الأسر) - تحديث وتوسيع كبير
-- ================================================================
create table if not exists public.families (
  id uuid default uuid_generate_v4() primary key,
  sequential_id text unique,
  -- بيانات الأم
  mother_name text not null,
  national_id varchar(14) unique,
  phone varchar(15),
  phone_alt varchar(15), -- رقم هاتف بديل
  address text,
  governorate text,
  district text, -- المنطقة/الحي
  -- البيانات المستنتجة من الرقم القومي
  date_of_birth date,
  age int,
  gender text check (gender in ('M', 'F')),
  -- الحالة الاجتماعية والصحية
  social_status text check (social_status in ('widow', 'divorced', 'married', 'single', 'unknown')) default 'unknown',
  has_chronic_illness boolean default false,
  is_disabled boolean default false,
  -- مؤشر الأولوية
  priority_score int default 0, -- يُحسب آلياً
  vulnerability_score int default 0,
  -- معلومات إضافية
  notes text,
  internal_notes text, -- ملاحظات داخلية (للإدارة فقط)
  -- الحالة في النظام
  status text check (status in ('active', 'archived', 'needs_review')) default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now()
);

-- Add missing columns to families
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='phone_alt') then
    alter table public.families add column phone_alt varchar(15);
  end if;
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='district') then
    alter table public.families add column district text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='date_of_birth') then
    alter table public.families add column date_of_birth date;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='age') then
    alter table public.families add column age int;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='gender') then
    alter table public.families add column gender text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='social_status') then
    alter table public.families add column social_status text default 'unknown';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='has_chronic_illness') then
    alter table public.families add column has_chronic_illness boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='is_disabled') then
    alter table public.families add column is_disabled boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='priority_score') then
    alter table public.families add column priority_score int default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='internal_notes') then
    alter table public.families add column internal_notes text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='status') then
    alter table public.families add column status text default 'active';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='created_by') then
    alter table public.families add column created_by uuid references public.profiles(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='updated_at') then
    alter table public.families add column updated_at timestamptz default now();
  end if;
end $$;

-- Sequential ID sequence and trigger
create sequence if not exists family_seq start 1;

create or replace function set_sequential_id()
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
for each row execute procedure set_sequential_id();

-- Function to calculate priority score
create or replace function calculate_priority_score(
  p_social_status text,
  p_has_chronic_illness boolean,
  p_is_disabled boolean,
  p_children_count int,
  p_vulnerability_score int
) returns int as $$
declare
  score int := 0;
begin
  -- حالة الأرملة: +20 نقطة
  if p_social_status = 'widow' then score := score + 20; end if;
  -- المطلقة: +15 نقطة
  if p_social_status = 'divorced' then score := score + 15; end if;
  -- مرض مزمن: +15 نقطة
  if p_has_chronic_illness then score := score + 15; end if;
  -- إعاقة: +20 نقطة
  if p_is_disabled then score := score + 20; end if;
  -- عدد الأطفال (5 نقاط لكل طفل، حد أقصى 30)
  score := score + least(p_children_count * 5, 30);
  -- إضافة نقاط الهشاشة الأساسية
  score := score + (p_vulnerability_score / 10);
  return least(score, 100); -- الحد الأقصى 100
end;
$$ language plpgsql;

-- ================================================================
-- 4. CHILDREN (الأطفال) - تحديث
-- ================================================================
create table if not exists public.children (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references public.families(id) on delete cascade not null,
  child_name text not null,
  national_id varchar(14),
  date_of_birth date,
  age int, -- يُحسب من الرقم القومي آلياً
  gender text check (gender in ('M', 'F')),
  grade_level text, -- المرحلة الدراسية
  school_stage text check (school_stage in ('preschool', 'primary', 'preparatory', 'secondary', 'university', 'graduated', 'not_in_school')),
  is_orphan boolean default false, -- يتيم؟
  notes text,
  created_at timestamptz default now() not null
);

-- Add missing columns to children
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='children' and column_name='age') then
    alter table public.children add column age int;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='children' and column_name='school_stage') then
    alter table public.children add column school_stage text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='children' and column_name='is_orphan') then
    alter table public.children add column is_orphan boolean default false;
  end if;
end $$;

-- ================================================================
-- 5. CASE ASSIGNMENTS (إسناد الحالات للمتطوعين)
-- ================================================================
create table if not exists public.case_assignments (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  family_id uuid references public.families(id) on delete cascade not null,
  volunteer_id uuid references public.profiles(id) on delete set null,
  status text check (status in ('pending', 'in_progress', 'completed', 'no_answer', 'unreachable', 'skipped')) default 'pending',
  assigned_at timestamptz default now(),
  completed_at timestamptz,
  notes text,
  unique (campaign_id, family_id) -- حالة واحدة لكل أسرة في حملة واحدة
);

-- ================================================================
-- 6. CASE LOCKS (أقفال الحالات اللحظية - Realtime Concurrency)
-- ================================================================
create table if not exists public.case_locks (
  family_id uuid references public.families(id) on delete cascade primary key,
  locked_by uuid references public.profiles(id) on delete cascade not null,
  locked_by_name text, -- اسم المتطوع لإظهاره في التنبيه
  locked_at timestamptz default now() not null
);

-- Add locked_by_name if missing
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='case_locks' and column_name='locked_by_name') then
    alter table public.case_locks add column locked_by_name text;
  end if;
end $$;

-- ================================================================
-- 7. TRANSACTIONS (المعاملات المالية/التوزيع)
-- ================================================================
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) not null,
  family_id uuid references public.families(id) not null,
  assignment_id uuid references public.case_assignments(id),
  volunteer_id uuid references public.profiles(id) not null,
  amount numeric(10, 2) not null,
  transaction_type text check (transaction_type in ('financial_transfer', 'food_basket', 'clothing', 'school_supplies', 'other')) default 'financial_transfer',
  status text check (status in ('pending', 'completed', 'failed', 'cancelled')) default 'completed',
  notes text,
  proof_url text, -- رابط صورة الإيصال
  created_at timestamptz default now() not null
);

-- Add missing columns to transactions
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='transactions' and column_name='assignment_id') then
    alter table public.transactions add column assignment_id uuid references public.case_assignments(id);
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transactions' and column_name='transaction_type') then
    alter table public.transactions add column transaction_type text default 'financial_transfer';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transactions' and column_name='proof_url') then
    alter table public.transactions add column proof_url text;
  end if;
end $$;

-- ================================================================
-- 8. CASE HISTORY (سجل العطاء - Timeline)
-- ================================================================
create table if not exists public.case_history (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references public.families(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text, -- حفظ الاسم للعرض حتى بعد الحذف
  -- نوع الحدث
  action_type text not null check (action_type in (
    'CREATED',          -- تسجيل الأسرة
    'UPDATED',          -- تعديل البيانات
    'CALLED_NO_ANSWER', -- جرس ولم يرد
    'UNREACHABLE',      -- مغلق/غير متاح
    'CONTACTED',        -- تم التواصل
    'TRANSFER_DONE',    -- تم التحويل/التوزيع
    'ASSIGNED',         -- تم الإسناد لمتطوع
    'NOTE_ADDED',       -- إضافة ملاحظة
    'STATUS_CHANGED'    -- تغيير الحالة
  )),
  description text,
  metadata jsonb default '{}'::jsonb, -- بيانات إضافية (كمبلغ التحويل، تفاصيل الحملة)
  campaign_id uuid references public.campaigns(id),
  created_at timestamptz default now() not null
);

-- ================================================================
-- 8. REALTIME - تفعيل التحديثات اللحظية
-- ================================================================
-- تفعيل Realtime على case_locks لمنع التضارب
alter table public.case_locks replica identity full;
alter table public.case_assignments replica identity full;

-- ================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ================================================================
-- تفعيل RLS
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.families enable row level security;
alter table public.children enable row level security;
alter table public.case_assignments enable row level security;
alter table public.case_locks enable row level security;
alter table public.transactions enable row level security;
alter table public.case_history enable row level security;

-- حذف السياسات القديمة إن وجدت
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "campaigns_select" on public.campaigns;
drop policy if exists "campaigns_all_admin" on public.campaigns;
drop policy if exists "families_select" on public.families;
drop policy if exists "families_all_admin" on public.families;
drop policy if exists "children_select" on public.children;
drop policy if exists "children_all_admin" on public.children;
drop policy if exists "assignments_select" on public.case_assignments;
drop policy if exists "assignments_update_volunteer" on public.case_assignments;
drop policy if exists "assignments_all_admin" on public.case_assignments;
drop policy if exists "locks_all" on public.case_locks;
drop policy if exists "transactions_select" on public.transactions;
drop policy if exists "transactions_insert" on public.transactions;
drop policy if exists "history_select" on public.case_history;
drop policy if exists "history_insert" on public.case_history;

-- Profiles: كل مستخدم يرى ملفه + المدراء يرون الكل
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- Campaigns: الجميع يقرأ، المدير يعدل
create policy "campaigns_select" on public.campaigns
  for select using (auth.uid() is not null);
create policy "campaigns_all_admin" on public.campaigns
  for all using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Families: الجميع يقرأ، المدير يعدل
create policy "families_select" on public.families
  for select using (auth.uid() is not null);
create policy "families_all_admin" on public.families
  for all using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Children: الجميع يقرأ، المدير يعدل
create policy "children_select" on public.children
  for select using (auth.uid() is not null);
create policy "children_all_admin" on public.children
  for all using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Assignments: الجميع يقرأ، المتطوع يعدل ما أُسند إليه
create policy "assignments_select" on public.case_assignments
  for select using (auth.uid() is not null);
create policy "assignments_update_volunteer" on public.case_assignments
  for update using (volunteer_id = auth.uid() or exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));
create policy "assignments_all_admin" on public.case_assignments
  for all using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Case Locks: الجميع يقرأ ويضيف ويحذف (للتحكم في القفل)
create policy "locks_all" on public.case_locks
  for all using (auth.uid() is not null);

-- Transactions: الجميع يقرأ، المتطوع يضيف
create policy "transactions_select" on public.transactions
  for select using (auth.uid() is not null);
create policy "transactions_insert" on public.transactions
  for insert with check (auth.uid() = volunteer_id);

-- Case History: الجميع يقرأ، المستخدمون يضيفون
create policy "history_select" on public.case_history
  for select using (auth.uid() is not null);
create policy "history_insert" on public.case_history
  for insert with check (auth.uid() is not null);

-- ================================================================
-- 10. PROFILES TRIGGER (إنشاء ملف تلقائياً عند التسجيل)
-- ================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'volunteer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================================================================
-- DONE! قاعدة البيانات جاهزة ✅
-- ================================================================
select 'Migration V2 completed successfully! 🎉' as status;
