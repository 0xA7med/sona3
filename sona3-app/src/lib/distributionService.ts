import type { 
  Family, Campaign, Child, CommissionRule, 
  SchoolStage 
} from '../types';
import { parseNationalID } from '../types';

export interface DistributionBreakdown {
  baseAmount: number;
  fee: number;
  total: number;
  mode: 'age' | 'school_stage' | 'children_count';
  childrenBreakdown: {
    childId: string;
    name: string;
    age: number;
    amount: number;
    stageLabel?: string;
  }[];
}

/**
 * Calculates the distribution amount for a family based on a campaign's rules.
 */
export function calculateDistribution(
  family: Family, 
  campaign: Campaign
): DistributionBreakdown {
  if (!campaign.is_auto_calculate) {
    const amount = campaign.amount_per_family || 0;
    return {
      baseAmount: amount,
      fee: calculateCommission(amount, campaign.commission_rules),
      total: amount + calculateCommission(amount, campaign.commission_rules),
      mode: 'age', // Default
      childrenBreakdown: []
    };
  }

  const mode = campaign.distribution_mode || 'age';

  let baseAmount = 0;
  let childrenBreakdown: { childId: string; name: string; age: number; amount: number; }[] = [];

  if (mode === 'children_count') {
    const isOrphansOnly = campaign.targeting_rules?.some(r => r.field === 'is_orphan' && r.value === true) ?? false;
    const eligibleChildren = (family.children || []).filter(c => !isOrphansOnly || c.is_orphan);
    const count = eligibleChildren.length;
    
    const match = (campaign.children_brackets || []).find(b => count >= b.fromCount && count <= b.toCount);
    baseAmount = match ? match.amount : 0;

    // Distribute family amount evenly among eligible children for details visual matching
    const perChildAmount = count > 0 ? Math.round((baseAmount / count) * 100) / 100 : 0;

    childrenBreakdown = (family.children || []).map(child => {
      const isEligible = !isOrphansOnly || child.is_orphan;
      const age = getChildAge(child);
      return {
        childId: child.id,
        name: child.child_name,
        age,
        amount: isEligible ? perChildAmount : 0
      };
    });
  } else {
    // Calculate per child
    childrenBreakdown = (family.children || []).map(child => {
      const age = getChildAge(child);
      let amount = 0;
      
      if (mode === 'school_stage') {
        const grade = age ? Math.max(1, Math.min(12, age - 5)) : 1;
        const match = (campaign.stage_brackets || []).find(b => {
          if (b.stage) return b.stage === (child.school_stage || detectSchoolStage(age));
          return grade >= (b.fromGrade || 1) && grade <= (b.toGrade || 12);
        });
        amount = match ? match.amount : 0;
      } else {
        const match = (campaign.age_brackets || []).find(b => age >= b.from && age <= b.to);
        amount = match ? match.amount : 0;
      }

      baseAmount += amount;
      
      return {
        childId: child.id,
        name: child.child_name,
        age,
        amount
      };
    });
  }

  const fee = calculateCommission(baseAmount, campaign.commission_rules);

  return {
    baseAmount,
    fee,
    total: baseAmount + fee,
    mode,
    childrenBreakdown
  };
}

/**
 * Helper to get child age accurately
 */
export function getChildAge(child: Child): number {
  if (child.age !== undefined && child.age !== null) return child.age;
  
  // Try parsing NID if age is missing
  if (child.national_id) {
    const data = parseNationalID(child.national_id);
    if (data.valid && data.age !== undefined) return data.age;
  }
  
  // Try DOB
  const dob = child.birth_date || child.date_of_birth;
  if (dob) {
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  }

  return 0;
}

/**
 * Automatic School Stage Detection
 */
export function detectSchoolStage(age: number): SchoolStage {
  if (age < 4) return 'not_in_school';
  if (age < 6) return 'preschool';
  if (age < 12) return 'primary';
  if (age < 15) return 'preparatory';
  if (age < 18) return 'secondary';
  if (age < 23) return 'university';
  return 'graduated';
}

/**
 * Calculate Commission based on rules
 */
function calculateCommission(amount: number, rules: CommissionRule[]): number {
  if (!rules?.length) return 0;
  
  // Find rule using new range logic or legacy threshold
  const rule = rules.find(r => {
    if (r.threshold !== undefined) return amount <= r.threshold;
    const fromA = r.fromAmount || 0;
    const toA = r.toAmount || 999999;
    return amount >= fromA && amount <= toA;
  });

  if (rule) return rule.fee;

  // Fallback: if using legacy thresholds, use the last one as default if not found
  const legacyRules = rules.filter(r => r.threshold !== undefined);
  if (legacyRules.length > 0) {
    const sortedLegacy = [...legacyRules].sort((a, b) => (a.threshold || 0) - (b.threshold || 0));
    return sortedLegacy[sortedLegacy.length - 1].fee;
  }
  
  return 0;
}

/**
 * Returns a detailed localized string for children's school grades (e.g., "5 ابتدائي")
 */
export function formatDetailedGrade(child: Child): string {
  if (child.educational_grade) return child.educational_grade;
  
  const age = getChildAge(child);
  if (!age || age < 4) return 'قبل المدرسة';
  if (age < 6) return 'حضانة / تمهيدي';
  
  const currentStage = child.school_stage || detectSchoolStage(age);
  
  if (currentStage === 'primary') {
    const grade = age - 5;
    return `${grade} ابتدائي`;
  }
  if (currentStage === 'preparatory') {
    const grade = age - 11;
    return `${grade} إعدادي`;
  }
  if (currentStage === 'secondary') {
    const grade = age - 14;
    return `${grade} ثانوي`;
  }
  if (currentStage === 'university') {
    return 'جامعة';
  }
  if (currentStage === 'graduated') {
    return 'خريج';
  }
  
  return 'غير ملتحق بالتعليم';
}
