# دليل التشغيل والنشر — صناع السعادة

> **المستهدف**: فريق التشغيل والصيانة  
> **آخر تحديث**: 2026-05-24

---

## 1. متطلبات البيئة

### التطوير المحلي
- Node.js 18+
- npm 9+
- حساب Supabase (مشروع ب PostgreSQL)
- Git

### الإنتاج
- حساب Vercel (للاستضافة)
- Supabase Pro أو Free Tier (مع حد 2 مشاريع مجانية)
- Custom domain (اختياري)

---

## 2. إعداد Supabase

### إنشاء المشروع
```
1. سجل دخول https://supabase.com
2. New project ← اختر اسم (sona3-production)
3. اختر منطقة قريبة (مثلاً: Frankfurt)
4. احفظ Database URL, anon key, service_role key
```

### تشغيل الـ Migration
```
1. اذهب إلى SQL Editor في Supabase Dashboard
2. شغّل الملفات بالترتيب:
   1. supabase_v2_migration.sql
   2. rpc_volunteer_pool.sql
   3. volunteer_locks.sql
   4. fix_rls.sql
   5. fix_volunteer_visibility.sql
   6. supabase_seed_admin.sql ← عدّل الإيميل/الباسورد
```

### تفعيل Realtime
```
في Supabase Dashboard → Database → Replication:
فعّل التحديثات اللحظية على:
  - case_locks
  - case_assignments
```

---

## 3. النشر على Vercel

### الطريقة 1: عبر Git (موصى به)

```bash
# 1. ادفع الكود إلى GitHub/GitLab
# 2. في Vercel: New Project ← استورد المستودع
# 3. إعدادات المشروع:
#    - Root Directory: sona3-app
#    - Framework: Vite
#    - Build: npm run build
#    - Output: dist

# 4. متغيرات البيئة:
#    VITE_SUPABASE_URL=https://xxxx.supabase.co
#    VITE_SUPABASE_ANON_KEY=eyJxxxx...
#    CRON_SECRET=your-secret-key (اختياري)
```

### الطريقة 2: عبر CLI

```bash
npm i -g vercel
cd sona3-app
vercel --prod
```

### SPA Redirect (أساسي)
في `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Cron Job لإبقاء Supabase نشطاً (اختياري)
```
في Vercel Dashboard → Cron Jobs:
  الرابط: https://sona3.vercel.app/api/ping
  الجدول: 0 0 * * * (كل يوم في منتصف الليل)
  الحماية: إضافة header `Authorization: Bearer ${CRON_SECRET}`
```

---

## 4. استكشاف الأخطاء

### مشكلة: RLS Infinite Recursion
**السبب**: دوال RLS تستدعي نفسها  
**الحل**: شغّل `fix_rls.sql` الذي يستخدم `get_my_role()` بدلاً من الاستعلام المباشر

### مشكلة: 401 Unauthorized
**التحقق**:
1. هل `VITE_SUPABASE_ANON_KEY` صحيح؟ (يجب أن يبدأ بـ `eyJ`)
2. هل الـ RLS policies مفعّلة بشكل صحيح؟
3. هل المستخدم نشط (`is_active = true`)؟

### مشكلة: Case Lock لا يعمل
**التحقق**:
1. هل `campaign_id` موجود في `case_locks` جدول؟
2. هل `cleanup_expired_locks()` شُغّل؟
3. هل Replication مفعّل على `case_locks`؟

### مشكلة: بيانات لا تظهر
**التحقق**:
1. افحص SQL Editor → Query performance
2. تأكد من RLS policies على الجدول
3. افحص Network tab في المتصفح

---

## 5. الصيانة الدورية

### يومياً
- مراجعة طلبات تحديث البيانات (`/admin/updates`)
- التحقق من سير المهام

### أسبوعياً
- مراجعة تقارير التوزيع (`/admin/reports`)
- التأكد من عدم وجود أقفال منتهية

### شهرياً
- مراجعة صلاحيات المتطوعين
- تنظيف `case_locks` القديم يدوياً إذا لزم الأمر

### فصلياً
- تحديث Version Dependencies إذا كان هناك Retrofit
- مراجعة أداء قاعدة البيانات

---

## 6. النسخ الاحتياطي

في Supabase Dashboard → Database → Backups:
- تفعيل Point-in-Time Recovery (متوفر Pro+)
- أو استخدم pg_dump يدوياً:

```bash
pg_dump --dbname=postgresql://postgres:xxxx@db.xxxx.supabase.co:5432/postgres > sona3_backup_$(date +%Y%m%d).sql
```

---

## 7. متغيرات البيئة

| المتغير | مطلوب | الوصف |
|---------|-------|-------|
| `VITE_SUPABASE_URL` | نعم | رابط مشروع Supabase |
| `VITE_SUPABASE_ANON_KEY` | نعم | المفتاح العام (anon) |
| `CRON_SECRET` | لا | مفتاح لحماية Cron Job |

---

## 8. تدفق استقبال متطوع جديد

```
1. متطوع يسجل عبر /login
   ↓
2. ينشأ profile تلقائياً بـ is_active = false
   ↓
3. المدير يرى المستخدم في AdminVolunteers
   ↓
4. المدير يُفعّل الحساب (is_active = true)
   ↓
5. المتطوع يستطيع تسجيل الدخول ورؤية المهام
```

**ملاحظة**: التفعيل يتم عبر RPC `activate_user_secure()` في ملف `activation_and_delete.sql`.
