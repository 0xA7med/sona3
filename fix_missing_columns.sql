-- ================================================================
-- Fix Missing Columns in Families Table
-- ================================================================

-- 1. Add missing columns to families table
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='husband_name') then
    alter table public.families add column husband_name text;
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='husband_national_id') then
    alter table public.families add column husband_national_id varchar(14);
  end if;

  if not exists (select 1 from information_schema.columns where table_name='families' and column_name='medical_notes') then
    alter table public.families add column medical_notes text;
  end if;
end $$;
