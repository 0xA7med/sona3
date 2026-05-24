# توثيق API — صناع السعادة

> قاعدة البيانات عبر Supabase (REST API + RPC)  
> التوثيق يشمل كل الـ endpoints المستخدمة من التطبيق  

---

## جداول Supabase (REST API)

### profiles
```
GET    /rest/v1/profiles           — قائمة الملفات
GET    /rest/v1/profiles?id=eq.x   — ملف محدد
POST   /rest/v1/profiles           — إنشاء ملف
PATCH  /rest/v1/profiles?id=eq.x   — تحديث ملف
```

**الحقول**: id, full_name, role, phone, zone, is_active, created_at

**RLS**: 
- SELECT: `auth.uid() = id OR role = 'admin'`
- UPDATE: `auth.uid() = id`

---

### campaigns
```
GET    /rest/v1/campaigns          — قائمة الحملات
POST   /rest/v1/campaigns          — إنشاء حملة
PATCH  /rest/v1/campaigns?id=eq.x  — تحديث حملة
DELETE /rest/v1/campaigns?id=eq.x  — حذف حملة
```

**الحقول**: id, name, description, campaign_type, start_date, end_date, budget, amount_per_family, targeting_rules (jsonb), distribution_mode, commission_rules (jsonb), status, created_by

**أنواع الحملات**: `financial`, `food_basket`, `clothing`, `school_supplies`, `other`

---

### families
```
GET    /rest/v1/families           — قائمة الأسر (مع children)
GET    /rest/v1/families?id=eq.x   — أسرة محددة
POST   /rest/v1/families           — إضافة أسرة
PATCH  /rest/v1/families?id=eq.x   — تعديل أسرة
DELETE /rest/v1/families?id=eq.x   — حذف أسرة
```

**الحقول**: id, sequential_id, mother_name, national_id, phone, phone_alt, address, governorate, district, date_of_birth, age, gender, social_status, has_chronic_illness, is_disabled, priority_score, vulnerability_score, notes, internal_notes, status, created_by

---

### children
```
GET    /rest/v1/children           — قائمة الأطفال
GET    /rest/v1/children?family_id=eq.x — أطفال أسرة محددة
POST   /rest/v1/children           — إضافة طفل
PATCH  /rest/v1/children?id=eq.x   — تعديل طفل
DELETE /rest/v1/children?id=eq.x   — حذف طفل
```

**الحقول**: id, family_id, child_name, national_id, date_of_birth, age, gender, grade_level, school_stage, is_orphan

---

### case_assignments
```
GET    /rest/v1/case_assignments   — قائمة الإسنادات
PATCH  /rest/v1/case_assignments?id=eq.x  — تحديث الحالة
```

**الحقول**: id, campaign_id, family_id, volunteer_id, status, assigned_at, completed_at, notes

**الحالات**: `pending`, `in_progress`, `completed`, `no_answer`, `unreachable`, `skipped`

**RLS ملاحظة**: المتطوع يعدل فقط ما أُسند إليه (`volunteer_id = auth.uid()`)

---

### case_locks
```
GET    /rest/v1/case_locks         — قائمة الأقفال النشطة
POST   /rest/v1/case_locks         — إنشاء قفل
DELETE /rest/v1/case_locks         — حذف قفل
```

**الحقول**: family_id, campaign_id, locked_by, locked_at, expires_at

---

### transactions
```
GET    /rest/v1/transactions       — قائمة المعاملات
POST   /rest/v1/transactions       — تسجيل معاملة
```

**الحقول**: id, campaign_id, family_id, assignment_id, volunteer_id, amount, transaction_type, status, notes, proof_url

---

### case_history
```
GET    /rest/v1/case_history       — سجل الأحداث
POST   /rest/v1/case_history       — إضافة حدث
```

**الحقول**: id, family_id, user_id, user_name, action_type, description, metadata (jsonb), campaign_id

**أنواع الأحداث**: CREATED, UPDATED, CALLED_NO_ANSWER, UNREACHABLE, CONTACTED, TRANSFER_DONE, ASSIGNED, NOTE_ADDED, STATUS_CHANGED

---

### data_update_requests
```
GET    /rest/v1/data_update_requests  — قائمة طلبات التعديل
PATCH  /rest/v1/data_update_requests  — تحديث الحالة
```

**الحقول**: id, family_id, volunteer_id, requested_changes (jsonb), status, rejection_reason, reviewed_by, created_at

---

## دوال RPC (PostgreSQL Functions)

### reserve_single_case
```sql
SELECT * FROM reserve_single_case(
  p_volunteer_id uuid,
  p_family_id uuid, 
  p_campaign_id uuid
);
```
**الاستجابة**:
```json
{ "success": true, "assignment_id": "uuid" }
```
أو:
```json
{ "success": false, "message": "already_assigned" }
```

---

### reserve_case_batch
```sql
SELECT * FROM reserve_case_batch(
  p_volunteer_id uuid,
  p_campaign_id uuid,
  p_limit int DEFAULT 10
);
```
**الاستجابة**:
```json
{ "success": true, "reserved": 5 }
```

---

### release_volunteer_session
```sql
SELECT * FROM release_volunteer_session(
  p_volunteer_id uuid,
  p_campaign_id uuid
);
```
**الاستجابة**:
```json
{ "success": true, "released": 3 }
```

---

### cleanup_expired_locks
```sql
SELECT * FROM cleanup_expired_locks();
```
**الاستجابة**: void

---

### calculate_priority_score
```sql
SELECT * FROM calculate_priority_score(
  'widow',          -- p_social_status
  true,             -- p_has_chronic_illness
  false,            -- p_is_disabled
  3,                -- p_children_count
  0                 -- p_vulnerability_score
);
```
**الاستجابة**: عدد صحيح (0-100)

---

### activate_user_secure
```sql
SELECT * FROM activate_user_secure(p_user_id uuid);
```
**الوصف**: تفعيل حساب متطوع (للمدير فقط)

---

## Vercel API (Serverless)

### GET /api/ping
**الوصف**: Cron Job لتنشيط Supabase  
**الأمان**: (اختياري) `Authorization: Bearer ${CRON_SECRET}`  
**الاستجابة**:
```json
{ "success": true, "message": "تم تنشيط قاعدة البيانات بنجاح" }
```

---

## مثال شامل

### دورة كاملة: إنشاء حملة → توزيع → تنفيذ

```javascript
// 1. إنشاء حملة
await supabase.from('campaigns').insert({
  name: 'مساعدات رمضان',
  campaign_type: 'food_basket',
  budget: 50000,
  targeting_rules: [
    { field: 'social_status', operator: 'in', value: ['widow', 'divorced'] }
  ],
  distribution_mode: 'children_count',
  children_brackets: [
    { fromCount: 1, toCount: 2, amount: 300 },
    { fromCount: 3, toCount: 5, amount: 500 }
  ],
  status: 'active'
});

// 2. إنشاء case_assignments (يدوياً أو عبر منطق التطبيق)
// لتوليد المهام لجميع الأسر المطابقة

// 3. متطوع يحجز الحالات
const { data } = await supabase.rpc('reserve_case_batch', {
  p_volunteer_id: 'uuid',
  p_campaign_id: 'uuid',
  p_limit: 10
});

// 4. تسجيل معاملة
await supabase.from('transactions').insert({
  campaign_id: 'uuid',
  family_id: 'uuid',
  assignment_id: 'uuid',
  volunteer_id: 'uuid',
  amount: 300,
  transaction_type: 'food_basket',
  status: 'completed'
});

// 5. تسجيل حدث في التاريخ
await supabase.from('case_history').insert({
  family_id: 'uuid',
  user_id: 'uuid',
  user_name: 'أحمد',
  action_type: 'TRANSFER_DONE',
  description: 'تم تسليم كرتونة طعام',
  campaign_id: 'uuid'
});
```
