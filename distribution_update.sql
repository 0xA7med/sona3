-- ================================================================
-- صناع السعادة V2 — Advanced Distribution Schema Update
-- ================================================================

-- 1. CAMPAIGNS: إضافة حقول الشرائح والذكاء الاصطناعي
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS age_brackets jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS commission_rules jsonb DEFAULT '[{"threshold": 500, "fee": 5}, {"threshold": 999999, "fee": 10}]'::jsonb,
ADD COLUMN IF NOT EXISTS is_auto_calculate boolean DEFAULT true;

-- 2. CHILDREN: إضافة الرقم القومي وبيانات الهوية
ALTER TABLE public.children 
ADD COLUMN IF NOT EXISTS national_id varchar(14),
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('M', 'F'));

-- 3. TRANSACTIONS: إضافة حقول تفصيلية للتحويلات
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS base_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_amount numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount numeric(10,2) DEFAULT 0;

-- 4. CASE HISTORY: تحسين البيانات التعريفية
ALTER TABLE public.case_history
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 5. INDEXES: تحسين أداء السجلات (Sajal)
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_campaign_id ON public.transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_case_history_family_id ON public.case_history(family_id);

-- DONE! ✅ تم تحديث هيكل البيانات الاحترافي
