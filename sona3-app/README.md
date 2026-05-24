# 🌙 صناع السعادة — نظام إدارة التوزيع الخيري

**Sona3 AlSa'ada (Happiness Makers)** — نظام ERP متكامل لإدارة التبرعات الخيرية، يشمل تسجيل الأسر المستحقة، إدارة الحملات، الاستهداف الذكي، والتوزيع عبر المتطوعين.

| البadge | الحالة |
|---------|--------|
| الإصدار | `V2` |
| التقنيات | React 19 · TypeScript · Supabase · Vite 8 |
| النشر | Vercel |
| الترخيص | خاص |

---

## نظرة عامة

النظام مبني على معمارية SPA مع Supabase كـ Backend-as-a-Service. يوفر واجهتين منفصلتين:

- **لوحة المدير (Admin)**: إدارة الأسر، الحملات، المتطوعين، التقارير، طلبات تعديل البيانات
- **لوحة المتطوع (Volunteer)**: استلام المهام، التواصل مع الأسر، تنفيذ التوزيع، تسجيل المعاملات

---

## المتطلبات الأساسية

- **Node.js** ≥ 18
- **npm** ≥ 9
- **حساب Supabase** (مشروع نشط)
- **حساب Vercel** (للنشر)

---

## التشغيل المحلي

```bash
# 1. تثبيت الاعتماديات
cd sona3-app
npm install

# 2. إعداد متغيرات البيئة
cp .env.example .env
# املأ القيم من إعدادات Supabase:
#   VITE_SUPABASE_URL=https://xxxx.supabase.co
#   VITE_SUPABASE_ANON_KEY=eyJxxxx

# 3. تشغيل خادم التطوير
npm run dev
```

يفتح على `http://localhost:5173`

---

## أوامر مهمة

| الأمر | الوصف |
|-------|-------|
| `npm run dev` | تشغيل خادم التطوير مع HMR |
| `npm run build` | بناء إصدار الإنتاج (TypeScript + Vite) |
| `npm run preview` | معاينة إصدار الإنتاج محلياً |
| `npm run lint` | تشغيل ESLint على الكود |

---

## إعداد قاعدة البيانات

النظام يحتاج PostgreSQL عبر Supabase. ملفات SQL موجودة في المجلد الجذر:

1. **`supabase_init.sql`** — Schema V1 الأساسي (للإصدار الأول)
2. **`supabase_v2_migration.sql`** — ترحيل V2 الشامل (يحتوي كل الجداول)
3. **`rpc_volunteer_pool.sql`** — دوال حجز الحالات (`reserve_single_case`, `reserve_case_batch`, `release_volunteer_session`)
4. **`volunteer_locks.sql`** — نظام الأقفال + جدول `volunteer_fund_transfers`
5. **`supabase_seed_admin.sql`** — إنشاء حساب المدير الافتراضي
6. **`activation_and_delete.sql`** — تفعيل/حذف المستخدمين
7. **`fix_*.sql`** — إصلاحات متفرقة

### ترتيب التشغيل الموصى به:

```sql
-- 1. Schema الأساسي
تشغيل supabase_v2_migration.sql في SQL Editor

-- 2. RPCs + Locks
تشغيل rpc_volunteer_pool.sql
تشغيل volunteer_locks.sql

-- 3. الإصلاحات
تشغيل fix_rls.sql
تشغيل fix_volunteer_visibility.sql

-- 4. إنشاء المدير
تشغيل supabase_seed_admin.sql (عدّل الإيميل والباسورد)

-- 5. بيانات تجريبية (اختياري)
تشغيل data_import.sql
```

---

## قاعدة البيانات (Supabase)

### هيكل الجداول

```
public.profiles              — ملفات المستخدمين (admin/volunteer)
public.campaigns             — الحملات
public.families              — الأسر المستحقة
public.children              — أفراد الأسرة (الأطفال)
public.case_assignments      — إسناد الحالات للمتطوعين
public.case_locks            — أقفال الحالات (منع التوزيع المزدوج)
public.transactions          — المعاملات المالية/التوزيع
public.case_history          — سجل الأحداث (Timeline)
public.volunteer_fund_transfers  — تحويلات أموال للمتطوعين
public.data_update_requests  — طلبات تحديث البيانات من المتطوعين
```

### دوال RPC

| الدالة | الوصف |
|--------|-------|
| `reserve_single_case(p_volunteer_id, p_family_id, p_campaign_id)` | حجز حالة واحدة |
| `reserve_case_batch(p_volunteer_id, p_campaign_id, p_limit)` | حجز مجموعة حالات |
| `release_volunteer_session(p_volunteer_id, p_campaign_id)` | إنهاء جلسة متطوع |
| `cleanup_expired_locks()` | تنظيف الأقفال المنتهية |
| `calculate_priority_score(...)` | حساب درجة الأولوية |
| `set_sequential_id()` | توليد المعرف التسلسلي |
| `handle_new_user()` | Trigger — إنشاء ملف تلقائي عند التسجيل |

---

## نظام التوزيع

يدعم ثلاث أنماط للتوزيع:

1. **`age`** — توزيع حسب الفئة العمرية (شرائح عمرية مع مبلغ لكل شريحة)
2. **`school_stage`** — توزيع حسب المرحلة التعليمية
3. **`children_count`** — توزيع حسب عدد الأطفال في الأسرة

مع خيار:
- **الاحتساب التلقائي** (`is_auto_calculate`): يحسب المبلغ لكل طفل
- **الاحتساب اليدوي**: مبلغ ثابت لكل أسرة
- **عمولة التنفيذ**: رسوم إضافية حسب قواعد محددة

### نظام الأولويات (Priority Engine)

يحسب درجة الأولوية للأسرة بناءً على:
| المعيار | النقاط (حد أقصى) |
|---------|-----------------|
| أرملة | 25 |
| مطلقة | 15 |
| مرض مزمن | 15 |
| إعاقة | 20 |
| أطفال أيتام | 20 |
| عدد الأطفال | 25 (5 نقاط لكل طفل) |
| درجة الهشاشة | 10 |

المستويات: `حرجة (≥70)` ← `عالية (≥45)` ← `متوسطة (≥20)` ← `منخفضة (<20)`

---

## نظام الأقفال (Case Locking)

يمنع نظام الأقفال متطوعين من التعامل مع نفس الأسرة في وقت واحد:

1. المتطوع يستدعي `lockService.acquireLock(familyId, campaignId, volunteerId)`
2. يُدرج سجل في `case_locks` مع صلاحية 30 دقيقة
3. أي محاولة قفل من متطوع آخر ترد بـ `lockedBy`
4. عند تسجيل معاملة (Transaction)، يُحرر القفل تلقائياً (Trigger)
5. `cleanup_expired_locks()` ينظف الأقفال المنتهية

---

## الأدوار والصلاحيات

### Admin
- إدارة كاملة: الأسر، الحملات، المتطوعين
- الموافقة/رفض طلبات تحديث البيانات
- الاطلاع على التقارير
- تعديل الإعدادات

### Volunteer
- عرض المهام الموكلة إليه
- حجز الحالات (Locking)
- تحديث حالة المهمة (تم التواصل، لم يرد، الخ)
- تسجيل معاملات التوزيع
- طلب تعديل بيانات الأسرة

---

## تحليل الرقم القومي

النظام يحتوي على محلل كامل للرقم القومي المصري (14 رقماً) يستخرج:
- تاريخ الميلاد والعمر
- الجنس
- المحافظة (27 محافظة مصرية)
- القرن (19 أو 20)

موجود في: `src/lib/idParser.ts` (محلل متقدم) و `src/types.ts` (محلل أساسي)

---

## النشر على Vercel

```bash
# 1. ربط المستودع بـ Vercel
# 2. إعداد المتغيرات البيئية في Vercel Dashboard:
#    VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
#    CRON_SECRET (اختياري)
# 3. ضبط إعدادات البناء:
#    Framework: Vite
#    Root Directory: sona3-app
#    Build Command: npm run build
#    Output Directory: dist
# 4. نشر
```

### Cron Job (اختياري)
احتياط لمنع Supabase من إيقاف القاعدة المجانية:
```
الرابط: https://your-app.vercel.app/api/ping
الجدول: مرة كل يوم (daily)
```

---

## المساهمة

1. Fork المستودع
2. أنشئ فرعاً: `git checkout -b feature/my-feature`
3. نفذ تغييراتك
4. شغّل `npm run lint` وتأكد من خلوه من الأخطاء
5. قدم Pull Request

---

## المصادر

- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
