-- ================================================================
-- Update Campaigns Table Schema
-- Adds missing columns for advanced distribution and targeting
-- ================================================================

DO $$ 
BEGIN
    -- 1. Add campaign_type if missing (fallback for type)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='campaign_type') THEN
        ALTER TABLE public.campaigns ADD COLUMN campaign_type text NOT NULL DEFAULT 'financial';
    END IF;

    -- 2. Add distribution_mode
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='distribution_mode') THEN
        ALTER TABLE public.campaigns ADD COLUMN distribution_mode text NOT NULL DEFAULT 'age';
    END IF;

    -- 3. Add is_auto_calculate
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='is_auto_calculate') THEN
        ALTER TABLE public.campaigns ADD COLUMN is_auto_calculate boolean NOT NULL DEFAULT true;
    END IF;

    -- 4. Add brackets (JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='age_brackets') THEN
        ALTER TABLE public.campaigns ADD COLUMN age_brackets jsonb NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='stage_brackets') THEN
        ALTER TABLE public.campaigns ADD COLUMN stage_brackets jsonb NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='commission_rules') THEN
        ALTER TABLE public.campaigns ADD COLUMN commission_rules jsonb NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    -- 5. Add targeting_rules
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='targeting_rules') THEN
        ALTER TABLE public.campaigns ADD COLUMN targeting_rules jsonb NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    -- 6. Add amount_per_family and budget if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='amount_per_family') THEN
        ALTER TABLE public.campaigns ADD COLUMN amount_per_family numeric NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='budget') THEN
        ALTER TABLE public.campaigns ADD COLUMN budget numeric NOT NULL DEFAULT 0;
    END IF;

END $$;
