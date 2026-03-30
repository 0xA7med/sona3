// ================================================================
// صناع السعادة V2 — Shared Types (aligned with Supabase schema)
// ================================================================

/* ── Auth & Profiles ───────────────────────────────────────── */
export type UserRole = 'admin' | 'volunteer';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  zone?: string;
  is_active: boolean;
  status?: string;
  created_at: string;
}

/* ── Families ───────────────────────────────────────────────── */
export type SocialStatus  = 'widow' | 'divorced' | 'married' | 'single' | 'unknown';
export type Gender        = 'M' | 'F';
export type FamilyStatus  = 'active' | 'archived' | 'needs_review';

export interface Family {
  id: string;
  sequential_id?: string;
  mother_name: string;
  national_id?: string;
  phone?: string;
  phone_alt?: string;
  address?: string;
  governorate?: string;
  district?: string;
  // Derived from NID
  date_of_birth?: string;
  age?: number;
  gender?: Gender;
  // Social & health
  social_status: SocialStatus;
  has_chronic_illness: boolean;
  is_disabled: boolean;
  medical_notes?: string;
  // Marriage details
  husband_name?: string;
  husband_national_id?: string;
  // Priority
  priority_score: number;
  vulnerability_score: number;
  notes?: string;
  internal_notes?: string;
  status: FamilyStatus;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  // Relations (joined)
  children?: Child[];
  _children_count?: number;
}

/* ── Children ───────────────────────────────────────────────── */
export type SchoolStage = 'preschool' | 'primary' | 'preparatory' | 'secondary' | 'university' | 'graduated' | 'not_in_school';

export interface Child {
  id: string;
  family_id: string;
  child_name: string;
  national_id?: string;
  date_of_birth?: string;
  birth_date?: string; // Standard DB field
  age?: number;
  gender?: Gender;
  grade_level?: string;
  school_stage?: SchoolStage;
  is_orphan: boolean;
  notes?: string;
  created_at: string;
}

/* ── Campaigns ─────────────────────────────────────────────── */
export type CampaignType   = 'financial' | 'food_basket' | 'clothing' | 'school_supplies' | 'other';
export type CampaignStatus = 'draft' | 'active' | 'completed' | 'paused';

export interface TargetingRule {
  field: string;
  operator: 'eq' | 'gte' | 'lte' | 'in' | 'not_in';
  value: string | number | boolean | string[];
  label?: string;
}

export type DistributionMode = 'age' | 'school_stage';

export interface AgeBracket {
  from: number;
  to: number;
  amount: number;
  label?: string;
}

export interface StageBracket {
  stage: SchoolStage;
  amount: number;
}

export interface CommissionRule {
  threshold: number;
  fee: number;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  campaign_type: CampaignType;
  start_date: string;
  end_date?: string;
  budget: number;
  amount_per_family: number;
  targeting_rules: TargetingRule[];
  distribution_mode: DistributionMode;
  age_brackets: AgeBracket[];
  stage_brackets: StageBracket[];
  commission_rules: CommissionRule[];
  is_auto_calculate: boolean;
  status: CampaignStatus;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  // Relations
  _assignments_count?: number;
  _completed_count?: number;
}

/* ── Case Assignments ──────────────────────────────────────── */
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'no_answer' | 'unreachable' | 'skipped';

export interface CaseAssignment {
  id: string;
  campaign_id: string;
  family_id: string;
  volunteer_id?: string;
  status: AssignmentStatus;
  assigned_at: string;
  completed_at?: string;
  notes?: string;
  // Joined
  family?: Family;
  volunteer?: Profile;
  campaign?: Campaign;
}

/* ── Case Locks ────────────────────────────────────────────── */
export interface CaseLock {
  family_id: string;
  locked_by: string;
  locked_by_name?: string;
  locked_at: string;
}

/* ── Transactions ──────────────────────────────────────────── */
export type TransactionType   = 'financial_transfer' | 'food_basket' | 'clothing' | 'school_supplies' | 'other';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface Transaction {
  id: string;
  campaign_id: string;
  family_id: string;
  assignment_id?: string;
  volunteer_id: string;
  amount: number;
  transaction_type: TransactionType;
  status: TransactionStatus;
  base_amount?: number;
  fee_amount?: number;
  total_amount?: number;
  notes?: string;
  proof_url?: string;
  created_at: string;
  family?: { mother_name: string };
}

/* ── Case History / Timeline ───────────────────────────────── */
export type HistoryActionType =
  | 'CREATED'
  | 'UPDATED'
  | 'CALLED_NO_ANSWER'
  | 'UNREACHABLE'
  | 'CONTACTED'
  | 'TRANSFER_DONE'
  | 'ASSIGNED'
  | 'NOTE_ADDED'
  | 'STATUS_CHANGED';

export interface CaseHistoryEvent {
  id: string;
  family_id: string;
  user_id?: string;
  user_name?: string;
  action_type: HistoryActionType;
  description?: string;
  metadata?: Record<string, any>;
  campaign_id?: string;
  created_at: string;
  // Joined
  family?: { mother_name: string; district?: string };
  campaign?: { name: string };
}

/* ── National ID Extraction Result ────────────────────────── */
export interface NIDData {
  valid: boolean;
  dateOfBirth?: Date;
  age?: number;
  gender?: Gender;
  governorate?: string;
  governorateCode?: string;
}

export interface IDParseResult extends NIDData {
  error?: string;
  century?: 19 | 20;
}

/* ── Egyptian Governorates Map (NID codes) ─────────────────── */
export const GOVERNORATES: Record<string, string> = {
  '01': 'القاهرة',
  '02': 'الإسكندرية',
  '03': 'بور سعيد',
  '04': 'السويس',
  '11': 'دمياط',
  '12': 'الدقهلية',
  '13': 'الشرقية',
  '14': 'القليوبية',
  '15': 'كفر الشيخ',
  '16': 'الغربية',
  '17': 'المنوفية',
  '18': 'البحيرة',
  '19': 'الإسماعيلية',
  '21': 'الجيزة',
  '22': 'بني سويف',
  '23': 'الفيوم',
  '24': 'المنيا',
  '25': 'أسيوط',
  '26': 'سوهاج',
  '27': 'قنا',
  '28': 'أسوان',
  '29': 'الأقصر',
  '31': 'البحر الأحمر',
  '32': 'الوادي الجديد',
  '33': 'مطروح',
  '34': 'شمال سيناء',
  '35': 'جنوب سيناء',
  '88': 'خارج الجمهورية',
};

/* ── Priority Labels ───────────────────────────────────────── */
export function getPriorityLevel(score: number): { label: string; css: string } {
  if (score >= 70) return { label: 'حرجة',   css: 'priority-critical' };
  if (score >= 50) return { label: 'عالية',   css: 'priority-high' };
  if (score >= 30) return { label: 'متوسطة', css: 'priority-medium' };
  return              { label: 'عادية',   css: 'priority-low' };
}

export interface PriorityInput {
  socialStatus: SocialStatus;
  hasChronicIllness: boolean;
  isDisabled: boolean;
  hasOrphanChildren: boolean;
  childrenCount: number;
  vulnerabilityScore: number;
}

/* ── Status Labels (Arabic) ─────────────────────────────────── */
export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending:     'معلق',
  in_progress: 'قيد التنفيذ',
  completed:   'مكتمل',
  no_answer:   'لم يرد',
  unreachable: 'مغلق/تعذر التواصل',
  skipped:     'تم التخطي',
};

export const SOCIAL_STATUS_LABELS: Record<SocialStatus, string> = {
  widow:    'أرملة',
  divorced: 'مطلقة',
  married:  'متزوجة',
  single:   'عزباء',
  unknown:  'غير معروف',
};

export const SCHOOL_STAGE_LABELS: Record<SchoolStage, string> = {
  preschool:     'رياض أطفال',
  primary:       'ابتدائي',
  preparatory:   'إعدادي',
  secondary:     'ثانوي',
  university:    'جامعي',
  graduated:     'خريج',
  not_in_school: 'غير ملتحق',
};

export const HISTORY_ACTION_LABELS: Record<HistoryActionType, { label: string; emoji: string }> = {
  CREATED:          { label: 'تسجيل الأسرة',              emoji: '🌱' },
  UPDATED:          { label: 'تعديل البيانات',             emoji: '✏️' },
  CALLED_NO_ANSWER: { label: 'جرس ولم يرد',               emoji: '📞' },
  UNREACHABLE:      { label: 'مغلق / تعذر التواصل',       emoji: '🚫' },
  CONTACTED:        { label: 'تم التواصل بنجاح',           emoji: '✅' },
  TRANSFER_DONE:    { label: 'تم التحويل / التوزيع',       emoji: '🎁' },
  ASSIGNED:         { label: 'تم إسناد حالة لمتطوع',       emoji: '👤' },
  NOTE_ADDED:       { label: 'إضافة ملاحظة',              emoji: '📝' },
  STATUS_CHANGED:   { label: 'تغيير حالة الأسرة',         emoji: '🔄' },
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  financial_transfer: 'تحويل مالي',
  food_basket:        'كرتونة طعام',
  clothing:           'كسوة / ملابس',
  school_supplies:    'مستلزمات دراسية',
  other:              'أخرى',
};

/* ── NID Parser ────────────────────────────────────────────── */
export function parseNationalID(nid: string): NIDData {
  if (!nid || nid.length !== 14 || !/^\d{14}$/.test(nid)) {
    return { valid: false };
  }

  const century = nid[0];
  const year    = parseInt(nid.substring(1, 3), 10);
  const month   = parseInt(nid.substring(3, 5), 10);
  const day     = parseInt(nid.substring(5, 7), 10);
  const govCode = nid.substring(7, 9);
  const genderDigit = parseInt(nid[12], 10);

  let fullYear: number;
  if (century === '2') fullYear = 1900 + year;
  else if (century === '3') fullYear = 2000 + year;
  else return { valid: false };

  if (month < 1 || month > 12 || day < 1 || day > 31) return { valid: false };

  const dateOfBirth = new Date(fullYear, month - 1, day);
  const now = new Date();
  const age = now.getFullYear() - fullYear -
    (now < new Date(now.getFullYear(), month - 1, day) ? 1 : 0);

  const gender: Gender = genderDigit % 2 !== 0 ? 'M' : 'F';
  const governorate = GOVERNORATES[govCode];

  return {
    valid: true,
    dateOfBirth,
    age,
    gender,
    governorate: governorate || 'غير محدد',
    governorateCode: govCode,
  };
}

/* ── Calculate Priority Score ──────────────────────────────── */
export function calcPriorityScore(params: {
  social_status: SocialStatus;
  has_chronic_illness: boolean;
  is_disabled: boolean;
  children_count: number;
  vulnerability_score?: number;
}): number {
  let score = 0;
  if (params.social_status === 'widow')    score += 20;
  if (params.social_status === 'divorced') score += 15;
  if (params.has_chronic_illness)          score += 15;
  if (params.is_disabled)                  score += 20;
  score += Math.min(params.children_count * 5, 30);
  score += Math.floor((params.vulnerability_score ?? 0) / 10);
  return Math.min(score, 100);
}
