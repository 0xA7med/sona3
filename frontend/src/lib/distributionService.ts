import type { 
  Family, Campaign, Child, AgeBracket, CommissionRule, 
  SchoolStage 
} from '../types';
import { parseNationalID } from '../types';

export interface DistributionBreakdown {
  baseAmount: number;
  fee: number;
  total: number;
  childrenBreakdown: {
    childId: string;
    name: string;
    age: number;
    amount: number;
  }[];
}

/**
 * Calculates the distribution amount for a family based on a campaign's rules.
 */
export function calculateDistribution(
  family: Family, 
  campaign: Campaign
): DistributionBreakdown {
  // 1. If not auto-calculated, use the flat amount per family
  if (!campaign.is_auto_calculate || !campaign.age_brackets?.length) {
    const amount = campaign.amount_per_family || 0;
    return {
      baseAmount: amount,
      fee: calculateCommission(amount, campaign.commission_rules),
      total: amount + calculateCommission(amount, campaign.commission_rules),
      childrenBreakdown: []
    };
  }

  // 2. Calculate per child
  let baseAmount = 0;
  const childrenBreakdown = (family.children || []).map(child => {
    const age = getChildAge(child);
    const amount = getAmountForAge(age, campaign.age_brackets);
    baseAmount += amount;
    
    return {
      childId: child.id,
      name: child.child_name,
      age,
      amount
    };
  });

  const fee = calculateCommission(baseAmount, campaign.commission_rules);

  return {
    baseAmount,
    fee,
    total: baseAmount + fee,
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
 * Find amount in brackets
 */
function getAmountForAge(age: number, brackets: AgeBracket[]): number {
  const match = brackets.find(b => age >= b.from && age <= b.to);
  return match ? match.amount : 0;
}

/**
 * Calculate Commission based on rules
 */
function calculateCommission(amount: number, rules: CommissionRule[]): number {
  if (!rules?.length) return 0;
  
  // Sort rules by threshold ascending
  const sortedRules = [...rules].sort((a, b) => a.threshold - b.threshold);
  
  // Find the first rule where amount <= threshold
  const rule = sortedRules.find(r => amount <= r.threshold);
  return rule ? rule.fee : (sortedRules[sortedRules.length - 1]?.fee || 0);
}
