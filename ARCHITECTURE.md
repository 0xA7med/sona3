# القرارات المعمارية — صناع السعادة V2

> **الغرض**: توثيق القرارات المعمارية الرئيسية، تدفق البيانات، وهيكل النظام  
> **التاريخ**: 2026-05-24

---

## القرارات المعمارية

### ADR-001: Supabase كـ Backend واحد

**السياق**: الحاجة إلى قاعدة بيانات علائقية مع مصادقة وصلاحيات في منصة واحدة.

**الخيارات**:
- Firebase (NoSQL — لا يناسب البيانات العلائقية)
- Supabase (PostgreSQL + Auth + RLS)
- Backend مخصص (Node.js + PostgreSQL — تكلفة تطوير أعلى)

**القرار**: Supabase. الاستفادة من RLS المضمن، Auth الجاهز، Realtime subscriptions، والتكامل مع PostgreSQL الأصلي.

**النتائج**:  
+ إيجابي: تسريع التطوير، RLS يحل مشكلة الصلاحيات بشكل طبيعي  
+ إيجابي: Realtime للأقفال دون WebSocket مخصص  
- سلبي: الاعتماد على خدمة خارجية (vendor lock-in)  
- سلبي: قيود RLS قد تسبب أداءً أقل مع الاستعلامات المعقدة

---

### ADR-002: React + Vite + PWA

**السياق**: التطبيق يحتاج للعمل في المناطق ذات الاتصال الضعيف.

**الخيارات**:
- Next.js (SSR — تعقيد غير ضروري، المتطوعون لا يحتاجون SEO)
- React SPA + Vite (أبسط وأخف)
- Vue.js (مختلف عن خبرة الفريق)

**القرار**: React 19 + Vite 8 + PWA (vite-plugin-pwa).  
SSR غير مطلوب (التطبيق داخلي للجمعية)، PWA يسمح بالعمل دون اتصال.

**النتائج**:  
+ إيجابي: Service Worker للتخزين المؤقت  
+ إيجابي: إمكانية التثبيت كتطبيق على الموبايل  
+ إيجابي: سرعة بناء عالية مع Vite 8  
- سلبي: عدم دعم SSR (لا مشكلة لتطبيق داخلي)

---

### ADR-003: Zustand بدلاً من Redux/Context

**السياق**: إدارة الحالة عبر تطبيق بحجم متوسط مع دعم الثبات (persist).

**الخيارات**:
- Redux Toolkit (ثقيل — إعدادات كثيرة)
- React Context (يسبب re-renders غير ضرورية)
- Zustand (خفيف، يدعم persist middleware، API بسيط)

**القرار**: Zustand مع `persist` middleware للتخزين في localStorage.

---

### ADR-004: Case Locking — Optimistic + Timeout

**السياق**: عدة متطوعين قد يتعاملون مع نفس الأسرة في وقت واحد.

**الخيارات**:
- Pessimistic Locking (قفل قبل التحميل — بطيء)
- Optimistic Locking + 30-min timeout (توازن بين الأمان والأداء)
- عدم وجود قفل (يؤدي إلى توزيع مزدوج)

**القرار**: Optimistic Locking مع جدول `case_locks` و timeout 30 دقيقة.  
القفل يحاول insert، وإذا فشل يعرف من صاحب القفل الحالي.  
Trigger على `transactions` يحرر القفل تلقائياً عند تسجيل التوزيع.

```
volunteer → acquireLock(familyId)
  ├── نجاح: { success: true } → يبدأ العمل
  └── فشل: { success: false, lockedBy } → يعرض "الأسرة محجوزة من [الاسم]"
```

---

### ADR-005: توزيع المهام (Pool) عبر RPC

**السياق**: المتطوعون يحتاجون لحجز حالات بشكل عشوائي (وليس تعييناً يدوياً).

**القرار**: RPCs على Supabase مع `FOR UPDATE SKIP LOCKED` لضمان الذرية.

```sql
SELECT id FROM case_assignments
WHERE status IN ('pending')
ORDER BY RANDOM()
LIMIT p_limit
FOR UPDATE SKIP LOCKED
```

هذا يمنع متطوعين من حصول نفس الحالة.

---

## تدفق البيانات

### 1. تدفق إنشاء حملة وتوزيع

```
[Admin] → إنشاء حملة
    ↓
صفحة AdminCampaignForm.tsx
    ↓
INSERT INTO campaigns (name, type, budget, targeting_rules, distribution_mode, brackets)
    ↓
[Admin] → نشر الحملة (status = 'active')
    ↓
صفحة AdminCampaignView.tsx ← توليد CaseAssignments
    ↓
INSERT INTO case_assignments (campaign_id, family_id) ← كل الأسر المطابقة
    ↓
[Admin] → يدعو متطوعين ← المتطوعون يرون المهام
    ↓
[Volunteer] → reserve_case_batch() ← يحجز حالات
    ↓
يتواصل مع الأسرة ← يسجل التوزيع
    ↓
INSERT INTO transactions + case_history ← يحرر القفل
```

### 2. تدفق المصادقة

```
Browser → App.tsx (useEffect)
    ↓
supabase.auth.getSession()
    ├── session موجود ← setUser() ← loadProfile()
    │       ↓
    │   profiles(id=userId).select('*')
    │       ├── موجود ← set({profile: data})
    │       └── غير موجود ← upsert profile من user_metadata
    │
    └── session غير موجود ← set({loading: false}) → redirect /login
```

### 3. تدفق العمل دون اتصال (Offline)

```
[Online]
fetch data ← offlineStore.setFamilies() ← cached in localStorage
    ↓
[Offline]
تطبيق يقرأ من offlineStore (localStorage)
    ↓
user ينفذ إجراء ← addToSyncQueue({ type, payload })
    ↓
[Online again]
SyncManager.tsx ← processes syncQueue ← sends to Supabase
    ↓
removeFromSyncQueue(id) لكل إجراء مكتمل
```

---

## خريطة التبعيات

### Database Entity Relationship

```
profiles (id, role, zone, is_active)
    │
    ├── campaigns (created_by → profiles.id)
    │
    ├── families (created_by → profiles.id)
    │    ├── children (family_id → families.id)
    │    ├── case_assignments (family_id → families.id, volunteer_id → profiles.id, campaign_id → campaigns.id)
    │    ├── case_locks (family_id → families.id, locked_by → profiles.id)
    │    ├── transactions (family_id → families.id, volunteer_id → profiles.id, campaign_id → campaigns.id)
    │    ├── case_history (family_id → families.id, user_id → profiles.id, campaign_id → campaigns.id)
    │    └── data_update_requests (family_id → families.id, volunteer_id → profiles.id)
    │
    └── volunteer_fund_transfers (sender_id → profiles.id, receiver_id → profiles.id, campaign_id → campaigns.id)
```

### العلاقات الرئيسية

| من | إلى | النوع |
|----|-----|-------|
| `campaigns` | `profiles` | N:1 (created_by) |
| `families` | `profiles` | N:1 (created_by) |
| `children` | `families` | N:1 (CASCADE) |
| `case_assignments` | `campaigns` + `families` + `profiles` | N:1 |
| `case_locks` | `families` + `profiles` | 1:1 (family) + N:1 (volunteer) |
| `transactions` | `campaigns` + `families` + `profiles` | N:1 |
| `case_history` | `families` + `profiles` + `campaigns` | N:1 |
| `data_update_requests` | `families` + `profiles` | N:1 |

---

## إدارة الحالة (State Management)

### authStore (Zustand)
```
State: { user, profile, loading }
Actions:
  signIn(email, password)    → supabase.auth.signInWithPassword + loadProfile
  signUp(email, pass, name)  → supabase.auth.signUp + upsert profile
  signOut()                  → supabase.auth.signOut + reset state
  loadProfile(userId)        → profiles.select('*') أو إنشاء جديد
  updateRole(role)           → profiles.update({ role })
```

### offlineStore (Zustand + persist)
```
State: { families, myAssignments, campaigns, volunteers, lastUpdated, syncQueue }
Actions:
  setFamilies / setMyAssignments / setCampaigns / setVolunteers
  addToSyncQueue / removeFromSyncQueue / clearSyncQueue
  clearCache
Persist: localStorage key 'sona3-offline-storage'
```

---

## الصفحات والمسارات

```
/public
  /login                  — Login.tsx

/admin (role=admin)
  /admin                  — AdminHome.tsx (ملخص + إحصائيات)
  /admin/families         — AdminFamilies.tsx (قائمة الأسر)
  /admin/families/new     — AdminFamilyForm.tsx (إضافة)
  /admin/families/:id     — AdminFamilyView.tsx (عرض)
  /admin/families/:id/edit — AdminFamilyForm.tsx (تعديل)
  /admin/campaigns        — AdminCampaigns.tsx (قائمة الحملات)
  /admin/campaigns/new    — AdminCampaignForm.tsx (إضافة)
  /admin/campaigns/:id    — AdminCampaignView.tsx (عرض)
  /admin/campaigns/:id/edit — AdminCampaignForm.tsx (تعديل)
  /admin/volunteers       — AdminVolunteers.tsx
  /admin/volunteers/:id   — AdminVolunteerLog.tsx
  /admin/targeting        — AdminTargeting.tsx (الاستهداف الذكي)
  /admin/reports          — AdminReports.tsx
  /admin/transactions     — AdminTransactions.tsx
  /admin/settings         — AdminSettings.tsx
  /admin/updates          — AdminDataUpdates.tsx
  /profile                — Profile.tsx

/volunteer
  /volunteer              — VolunteerHome.tsx
  /volunteer/tasks        — VolunteerTasks.tsx
  /profile                — Profile.tsx
```
