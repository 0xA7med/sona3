# خريطة مشروع صناع السعادة (Sona3 AlSa'ada)

> نظام إدارة توزيع التبرعات الخيرية لجمعية صناع السعادة  
> **آخر تحديث:** 2026-05-24  
> **الإصدار:** V2

---

## [TECH_STACK]

### Frontend
| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| React | ^19.2.4 | مكتبة الواجهات |
| TypeScript | ~5.9.3 | كتابة آمنة |
| Vite | ^8.0.1 | أداة البناء |
| Tailwind CSS | ^4.2.2 | التصميم والتنسيق |
| Framer Motion | ^12.38.0 | الحركات والانتقالات |
| React Router DOM | ^7.13.2 | التوجيه (Routing) |
| Zustand | ^5.0.12 | إدارة الحالة (State) |
| Lucide React | ^1.7.0 | أيقونات |
| date-fns | ^4.1.0 | معالجة التواريخ |

### Backend & Infrastructure
| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| Supabase JS | ^2.100.1 | قاعدة البيانات + Auth + Realtime |
| PostgreSQL | (يدار عبر Supabase) | قاعدة البيانات العلائقية |
| Vercel | — | استضافة التطبيق + Cron Job |
| vite-plugin-pwa | ^1.2.0 | PWA + Service Worker |

### أدوات التطوير
| التقنية | الإصدار |
|---------|---------|
| ESLint | ^9.39.4 |
| TypeScript ESLint | ^8.57.0 |
| PostCSS | ^8.5.8 |
| Autoprefixer | ^10.4.27 |
| dotenv | ^17.3.1 |

---

## [ARCHITECTURE]

### هيكل المجلدات

```
sona3/
├── sona3_alsaada_v2.html       # الإصدار القديم (HTML أحادي الملف)
├── sona3-app/                   # التطبيق الرئيسي (V2)
│   ├── api/
│   │   └── ping.ts              # Vercel Cron — إبقاء Supabase نشطاً
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── App.tsx              # نقطة الدخول + Router
│   │   ├── main.tsx             # Bootstrap + PWA
│   │   ├── types.ts             # كل الأنواع المشتركة + الـ helpers
│   │   ├── index.css            # أنماط Tailwind الأساسية
│   │   ├── v2-styles.css        # أنماط إضافية للإصدار V2
│   │   ├── App.css              # أنماط عامة
│   │   ├── components/          # مكونات مشتركة
│   │   │   ├── Navigation.tsx   # شريط التنقل (Sidebar/ Bottom nav)
│   │   │   ├── Toast.tsx        # نظام الإشعارات المنبثقة
│   │   │   ├── SyncManager.tsx  # مزامنة البيانات مع Supabase
│   │   │   ├── FamilyCard.tsx   # بطاقة عرض الأسرة
│   │   │   ├── FamilyDetail.tsx # تفاصيل الأسرة
│   │   │   ├── NIDInput.tsx     # إدخال الرقم القومي مع تحليل آلي
│   │   │   ├── Timeline.tsx     # شريط زمني لتاريخ الحالة
│   │   │   ├── ConfirmModal.tsx # نافذة تأكيد
│   │   │   ├── VolunteerFamilyEditModal.tsx  # نافذة تعديل للمتطوع
│   │   │   └── ui/              # مكونات UI عامة
│   │   ├── pages/               # صفحات التطبيق
│   │   │   ├── Login.tsx        # تسجيل الدخول
│   │   │   ├── Profile.tsx      # الملف الشخصي
│   │   │   ├── AdminHome.tsx    # لوحة تحكم المدير
│   │   │   ├── AdminFamilies.tsx          # إدارة الأسر
│   │   │   ├── AdminFamilyForm.tsx        # إضافة/تعديل أسرة
│   │   │   ├── AdminFamilyView.tsx        # عرض أسرة
│   │   │   ├── AdminCampaigns.tsx         # إدارة الحملات
│   │   │   ├── AdminCampaignForm.tsx      # إضافة/تعديل حملة
│   │   │   ├── AdminCampaignView.tsx      # عرض حملة
│   │   │   ├── AdminVolunteers.tsx        # إدارة المتطوعين
│   │   │   ├── AdminVolunteerLog.tsx      # سجل نشاط متطوع
│   │   │   ├── AdminTargeting.tsx         # الاستهداف الذكي
│   │   │   ├── AdminReports.tsx           # التقارير
│   │   │   ├── AdminTransactions.tsx      # المعاملات المالية
│   │   │   ├── AdminSettings.tsx          # الإعدادات
│   │   │   ├── AdminDataUpdates.tsx       # طلبات تحديث البيانات
│   │   │   ├── VolunteerHome.tsx          # لوحة تحكم المتطوع
│   │   │   └── VolunteerTasks.tsx         # مهام المتطوع
│   │   ├── store/               # إدارة الحالة (Zustand)
│   │   │   ├── authStore.ts     # المصادقة والملف الشخصي
│   │   │   └── offlineStore.ts  # التخزين المؤقت + قائمة المزامنة
│   │   └── lib/                 # الخدمات والمنطق
│   │       ├── supabase.ts      # عميل Supabase
│   │       ├── distributionService.ts  # محرك التوزيع
│   │       ├── priorityEngine.ts       # محرك الأولويات
│   │       ├── lockService.ts          # نظام الأقفال
│   │       ├── idParser.ts             # تحليل الرقم القومي (مفصل)
│   │       └── utils.ts                # دوال مساعدة
│   ├── scripts/
│   │   └── migrate_data.js     # سكريبت استيراد البيانات
│   ├── dist/                    # مخرجات البناء
│   ├── vite.config.ts           # إعدادات Vite + PWA
│   ├── tsconfig.json            # إعدادات TypeScript
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── package.json
│   ├── vercel.json              # إعدادات نشر Vercel
│   ├── index.html               # HTML المدخل
│   └── eslint.config.js
├── supabase_init.sql            # Schema V1 الأساسي
├── supabase_v2_migration.sql    # الترحيل إلى V2
├── supabase_reservation_system.sql  # نظام حجز الحالات
├── supabase_seed_admin.sql      # إنشاء حساب المدير
├── rpc_volunteer_pool.sql       # RPCs لحجز الحالات
├── volunteer_locks.sql          # الأقفال + محافظ المتطوعين
├── activation_and_delete.sql    # تفعيل/حذف المستخدمين
├── fix_rls.sql                  # إصلاح مشكلة RLS
├── fix_volunteer_visibility.sql # صلاحية رؤية المتطوعين
├── fix_missing_columns.sql      # إضافة أعمدة مفقودة
├── update_campaigns_schema.sql  # تحديث جدول الحملات
├── distribution_update.sql      # تحديث توزيع + Indexes
├── add_children_brackets.sql    # إضافة شرائح الأطفال
├── data_import.sql              # بيانات الأسر الفعلية
├── generate_sql.py              # توليد SQL من NIDs
├── data.txt                     # بيانات أولية
└── PROJECT_MAP.md               # هذا الملف
```

### نمط المعمارية
- **Frontend**: SPA (Single Page Application) مع React Router للتوجيه من جانب العميل
- **Backend**: Supabase (Backend-as-a-Service) — قاعدة بيانات PostgreSQL + Auth + RLS
- **المصادقة**: بريد إلكتروني/كلمة مرور عبر Supabase Auth
- **الصلاحيات**: RLS (Row Level Security) — أدوار `admin` و `volunteer`
- **التحكم بالتزامن**: نظام أقفال (Case Locks) مع انتهاء تلقائي بعد 30 دقيقة
- **العمل دون اتصال**: PWA مع Service Worker + Zustand persist + قائمة مزامنة
- **النشر**: Vercel مع إعادة توجيه SPA + Cron Job يومي

### تدفق المصادقة
1. المستخدم يسجل دخوله ← `signIn()` في `authStore.ts`
2. Supabase Auth يعيد session token
3. `loadProfile()` تجلب ملف المستخدم من جدول `profiles`
4. إذا لم يوجد ملف، يتم إنشاؤه تلقائياً من metadata
5. المستخدمون الجدد يبدأون بـ `is_active = false` حتى يوافق المدير
6. التطبيق يوجه حسب الـ `role` إلى `/admin/*` أو `/volunteer/*`

---

## [SYSTEM_FLOW]

### 1. رحلة المدير (Admin Flow)
```
تسجيل دخول → لوحة التحكم
├── إدارة الأسر
│   ├── إضافة أسرة (مع تحليل الرقم القومي آلياً)
│   ├── تعديل/عرض بيانات الأسرة
│   └── تصفية وبحث
├── إدارة الحملات
│   ├── إنشاء حملة (نوع + ميزانية + شرائح توزيع)
│   ├── الاستهداف الذكي (قواعد تصفية)
│   ├── توزيع الحالات على المتطوعين
│   └── متابعة التنفيذ
├── إدارة المتطوعين
│   ├── تفعيل/تعطيل
│   ├── تغيير الصلاحيات
│   └── عرض سجل النشاط
├── طلبات تحديث البيانات (من المتطوعين)
│   ├── عرض ← موافقة ← رفض
│   └── تاريخ التغييرات
├── التقارير والإحصائيات
├── المعاملات المالية
└── الإعدادات
```

### 2. رحلة المتطوع (Volunteer Flow)
```
تسجيل دخول ← لوحة التحكم
├── عرض المهام الموكلة
│   ├── حجز حالات (Case Locking)
│   ├── التواصل مع الأسر
│   │   ├── تم التواصل ← توزيع
│   │   ├── لم يرد
│   │   └── رقم مغلق
│   ├── تسجيل عملية التوزيع
│   └── طلب تعديل بيانات الأسرة
└── عرض تاريخ المنجز
```

### 3. تدفق التوزيع (Distribution Flow)
```
إنشاء حملة ← تحديد قواعد الاستهداف
    ↓
تطبيق القواعد على الأسر ← حساب درجة الأولوية
    ↓
إنشاء case_assignments للحالات المطابقة
    ↓
توزيع الحالات على المتطوعين (يدوي/تلقائي)
    ↓
المتطوع يحجز حالة ← يتواصل ← ينفذ التوزيع
    ↓
تسجيل Transaction + تحديث Case History
    ↓
تحرير القفل (Lock) ← الحالة تنتقل إلى مكتملة
```

---

## [ORPHANS & PENDING]

### ثغرات/مشاكل موجودة
| # | المشكلة | الموقع | الأولوية |
|---|---------|--------|----------|
| 1 | `fix_rls.sql` — مشكلة تكرار لا نهائي في RLS بسبب `get_my_role()` | SQL | عالية |
| 2 | `v2-styles.css` مفصول عن `index.css` — تضارب محتمل | CSS | متوسطة |
| 3 | لا يوجد اختبارات (Unit / Integration / E2E) | عام | عالية |
| 4 | `sona3_alsaada_v2.html` (ملف HTML قديم) مستقل عن `sona3-app/` — خطر تشتت الكود | عام | متوسطة |
| 5 | `.env` موجود في المستودع — خطر كشف المفاتيح | أمان | عالية |
| 6 | `data_import.sql` يحتوي بيانات حقيقية (أسماء، أرقام، عناوين) — خطر خصوصية | أمان | عالية |
| 7 | لا يوجد توثيق للـ API/Supabase RPCs في مكان واحد | توثيق | متوسطة |
| 8 | `generate_sql.py` — سكريبت وحيد لاستيراد البيانات (تكرار يدوي) | أدوات | منخفضة |
| 9 | لا يوجد CI/CD Pipeline | عمليات | متوسطة |
| 10 | `supabase_init.sql` (V1) و `supabase_v2_migration.sql` (V2) — يحتاج توحيد | SQL | متوسطة |
| 11 | `lockService.ts` يستخدم `campaign_id` في `case_locks` بينما بعض SQL لا يملك العمود | Frontend/DB | عالية |
| 12 | لا يوجد نظام سجلات (Logging) موحد — `console.log` فقط | عام | متوسطة |
| 13 | مكون `Navigation.tsx` — لا يوجد تعليق توثيقي للـ props | Frontend | منخفضة |
| 14 | `offlineStore.ts` — قائمة المزامنة لا تتزامن تلقائياً | Frontend | متوسطة |
| 15 | لا يوجد تعريف صريح لـ `CampaignList` ولا `children_brackets` و `stage_brackets` في `supabase_v2_migration.sql` (موجودة فقط في `update_campaigns_schema.sql`) | SQL | عالية |

### ميزات مقترحة
- [ ] نظام إشعارات (Notifications) عند إضافة مهمة
- [ ] إحصائيات متقدمة ورسوم بيانية
- [ ] طباعة تقارير PDF
- [ ] واجهة API رسمية (REST/GraphQL)
- [ ] نظام نسخ احتياطي تلقائي
- [ ] إضافة اختبارات شاملة
- [ ] توثيق المكونات (Storybook)
- [ ] Multiple languages (Ar/En)

---

## [DEPENDENCY_GRAPH]

```
App.tsx
├── store/authStore.ts ← supabase.ts
├── store/offlineStore.ts
├── components/Navigation.tsx
├── components/Toast.tsx
├── components/SyncManager.tsx
│
├── pages/Login.tsx ← authStore
│
├── pages/Admin*.tsx
│   ├── supabase (مباشر)
│   ├── store/authStore
│   ├── store/offlineStore
│   ├── components/FamilyCard, FamilyDetail, NIDInput, Timeline
│   └── lib/{distributionService, priorityEngine, lockService, idParser}
│
└── pages/Volunteer*.tsx
    ├── supabase (مباشر)
    ├── store/authStore
    ├── store/offlineStore
    ├── components/{FamilyCard, VolunteerFamilyEditModal, ConfirmModal}
    └── lib/{lockService}
```
