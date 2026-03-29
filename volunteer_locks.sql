-- ================================================================
-- صناع السعادة V2 — Volunteer Wallets & Case Locking
-- ================================================================

-- 1. VOLUNTEER_FUND_TRANSFERS: تسجيل المبالغ التي يعطيها المدير للمتطوع
CREATE TABLE IF NOT EXISTS public.volunteer_fund_transfers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES auth.users(id), -- Admin
    receiver_id uuid REFERENCES auth.users(id), -- Volunteer
    campaign_id uuid REFERENCES public.campaigns(id),
    amount numeric(10,2) NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 2. CASE_LOCKS: حماية الحالات من التوزيع المزدوج (قفل مؤقت)
CREATE TABLE IF NOT EXISTS public.case_locks (
    family_id uuid REFERENCES public.families(id) PRIMARY KEY,
    campaign_id uuid REFERENCES public.campaigns(id),
    locked_by uuid REFERENCES auth.users(id),
    locked_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '30 minutes')
);

-- 3. RLS POLICIES: تأمين الوصول (الكل يرى الأقفال، المتطوع يحذف قفله فقط)
ALTER TABLE public.case_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see locks" ON public.case_locks FOR SELECT USING (true);
CREATE POLICY "Volunteers can manage their locks" ON public.case_locks 
    FOR ALL USING (auth.uid() = locked_by);

ALTER TABLE public.volunteer_fund_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage transfers" ON public.volunteer_fund_transfers 
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Volunteers can see their transfers" ON public.volunteer_fund_transfers 
    FOR SELECT USING (auth.uid() = receiver_id);

-- 4. CLEANUP FUNCTION: تنظيف الأقفال التلقائية
CREATE OR REPLACE FUNCTION public.cleanup_expired_locks() RETURNS void AS $$
BEGIN
    DELETE FROM public.case_locks WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGER: تنظيف عند الحذف (اختياري)
CREATE OR REPLACE FUNCTION public.release_lock_on_transaction() RETURNS trigger AS $$
BEGIN
    DELETE FROM public.case_locks WHERE family_id = NEW.family_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_release_lock_after_transaction
    AFTER INSERT ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.release_lock_on_transaction();
