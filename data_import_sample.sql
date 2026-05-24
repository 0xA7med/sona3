-- ================================================================
-- بيانات تجريبية (Anonymized) — للتطوير المحلي فقط
-- ================================================================
BEGIN;
TRUNCATE public.transactions, public.case_assignments, public.case_history, public.case_locks, public.children, public.families CASCADE;
ALTER SEQUENCE IF EXISTS family_seq RESTART WITH 1;

INSERT INTO public.families (id, mother_name, phone, national_id, address, date_of_birth, age, gender, governorate, district, social_status, has_chronic_illness, is_disabled, priority_score, status)
VALUES 
  ('a0000001-0000-0000-0000-000000000001', 'أم أحمد', '01000000001', '27705061900123', 'عنوان تجريبي 1', '1977-05-06', 47, 'F', 'الإسماعيلية', 'سرابيوم', 'widow', true, false, 60, 'active'),
  ('a0000001-0000-0000-0000-000000000002', 'أم محمد', '01000000002', '29105051900061', 'عنوان تجريبي 2', '1991-05-05', 33, 'F', 'الإسماعيلية', 'فايد', 'divorced', false, true, 50, 'active'),
  ('a0000001-0000-0000-0000-000000000003', 'أم حسن', '01000000003', '28208041900402', 'عنوان تجريبي 3', '1982-08-04', 42, 'F', 'الإسماعيلية', 'القنطرة', 'married', false, false, 20, 'active');

INSERT INTO public.children (family_id, child_name, national_id, date_of_birth, age, gender, grade_level, school_stage, is_orphan)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'طفل 1', '31304011901546', '2013-04-01', 11, 'M', 'الصف الأول الإعدادي', 'preparatory', false),
  ('a0000001-0000-0000-0000-000000000001', 'طفل 2', '30903091901080', '2009-03-09', 15, 'F', 'الصف الثاني الثانوي', 'secondary', true),
  ('a0000001-0000-0000-0000-000000000002', 'طفل 3', '31207011903284', '2012-07-01', 12, 'F', 'الصف الثاني الإعدادي', 'preparatory', false),
  ('a0000001-0000-0000-0000-000000000003', 'طفل 4', '31303211901897', '2013-03-21', 11, 'M', 'الصف الأول الإعدادي', 'preparatory', false),
  ('a0000001-0000-0000-0000-000000000003', 'طفل 5', '31401201901246', '2014-01-20', 10, 'F', 'الصف السادس الابتدائي', 'primary', false);

COMMIT;
