-- إضافة عمود شرائح الأطفال لجدول الحملات
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS children_brackets jsonb NOT NULL DEFAULT '[]'::jsonb;
