-- Set up the Database Schema for "Happiness Makers" (صناع السعادة)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles (Admins & Volunteers)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text check (role in ('admin', 'volunteer')) not null default 'volunteer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Campaigns
create table if not exists public.campaigns (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  start_date date not null,
  end_date date,
  budget numeric(10, 2) default 0,
  rules jsonb default '[]'::jsonb, -- Array of rules (Age brackets, grades, etc.)
  status text check (status in ('draft', 'active', 'completed')) default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Families (Mothers)
create table if not exists public.families (
  id uuid default uuid_generate_v4() primary key,
  sequential_id text unique, -- Auto-generated e.g. CASE-001
  mother_name text not null,
  national_id varchar(14) unique,
  phone varchar(15),
  address text,
  governorate text,
  vulnerability_score int default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a sequence for Sequential IDs
create sequence if not exists family_seq start 1;

-- Function to auto-generate sequential IDs
create or replace function set_sequential_id()
returns trigger as $$
begin
  if new.sequential_id is null then
    new.sequential_id := 'CASE-' || lpad(nextval('family_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger tr_set_sequential_id
before insert on public.families
for each row execute procedure set_sequential_id();

-- 4. Children
create table if not exists public.children (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references public.families(id) on delete cascade not null,
  child_name text not null,
  national_id varchar(14),
  date_of_birth date,
  gender text check (gender in ('M', 'F')),
  grade_level text, -- e.g. 'Primary 1'
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Case Locks (Concurrency Control)
create table if not exists public.case_locks (
  family_id uuid references public.families(id) on delete cascade primary key,
  locked_by uuid references public.profiles(id) on delete cascade not null,
  locked_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Transactions (Transfers)
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references public.campaigns(id) not null,
  family_id uuid references public.families(id) not null,
  volunteer_id uuid references public.profiles(id) not null,
  amount numeric(10, 2) not null,
  commission numeric(10, 2) default 0,
  status text check (status in ('pending', 'completed', 'failed')) default 'completed',
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Case History (Timeline)
create table if not exists public.case_history (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references public.families(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  action_type text not null, -- e.g., 'CREATED', 'CALLED_NO_ANSWER', 'UPDATED_ADDRESS', 'TRANSFER_COMPLETED'
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Optional: Disable RLS initially for speed of development (Turn on before production!)
alter table public.profiles disable row level security;
alter table public.campaigns disable row level security;
alter table public.families disable row level security;
alter table public.children disable row level security;
alter table public.case_locks disable row level security;
alter table public.transactions disable row level security;
alter table public.case_history disable row level security;
