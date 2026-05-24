// ================================================================
// priorityEngine.ts — محرك حساب درجة الأولوية
// ================================================================
import type { PriorityInput, SocialStatus } from '../types';

interface PriorityWeight {
  label: string;
  points: number;
  condition: boolean;
}

export interface PriorityBreakdown {
  totalScore: number;
  maxScore: number;
  percentage: number;
  level: 'critical' | 'high' | 'medium' | 'low';
  levelLabel: string;
  levelColor: string;
  weights: PriorityWeight[];
}

/**
 * حساب درجة الأولوية الشاملة للأسرة
 */
export function calculatePriority(input: PriorityInput): PriorityBreakdown {
  const weights: PriorityWeight[] = [
    {
      label: 'أرملة',
      points: 25,
      condition: input.socialStatus === 'widow',
    },
    {
      label: 'مطلقة',
      points: 15,
      condition: input.socialStatus === 'divorced',
    },
    {
      label: 'مرض مزمن',
      points: 15,
      condition: input.hasChronicIllness,
    },
    {
      label: 'ذوي الهمم',
      points: 20,
      condition: input.isDisabled,
    },
    {
      label: 'أطفال أيتام',
      points: 20,
      condition: input.hasOrphanChildren,
    },
    {
      label: `${Math.min(input.childrenCount, 5)} أطفال`,
      points: Math.min(input.childrenCount * 5, 25),
      condition: input.childrenCount > 0,
    },
    {
      label: 'درجة الهشاشة',
      points: Math.min(Math.floor(input.vulnerabilityScore / 5), 10),
      condition: input.vulnerabilityScore > 0,
    },
  ];

  const activeWeights = weights.filter(w => w.condition);
  const totalScore = Math.min(
    activeWeights.reduce((sum, w) => sum + w.points, 0),
    100
  );

  let level: PriorityBreakdown['level'];
  let levelLabel: string;
  let levelColor: string;

  if (totalScore >= 70) {
    level = 'critical';
    levelLabel = 'حرجة جداً';
    levelColor = '#dc2626'; // أحمر
  } else if (totalScore >= 45) {
    level = 'high';
    levelLabel = 'عالية';
    levelColor = '#ea580c'; // برتقالي
  } else if (totalScore >= 20) {
    level = 'medium';
    levelLabel = 'متوسطة';
    levelColor = '#d97706'; // أصفر
  } else {
    level = 'low';
    levelLabel = 'منخفضة';
    levelColor = '#16a34a'; // أخضر
  }

  return {
    totalScore,
    maxScore: 100,
    percentage: totalScore,
    level,
    levelLabel,
    levelColor,
    weights: activeWeights,
  };
}

/**
 * الحصول على تسمية الحالة الاجتماعية
 */
export const SOCIAL_STATUS_LABELS: Record<SocialStatus, string> = {
  widow: 'أرملة',
  divorced: 'مطلقة',
  married: 'متزوجة',
  single: 'عزباء',
  unknown: 'غير محدد',
};

/**
 * لون الأولوية
 */
export function getPriorityColor(score: number): string {
  if (score >= 70) return '#dc2626';
  if (score >= 45) return '#ea580c';
  if (score >= 20) return '#d97706';
  return '#16a34a';
}

/**
 * لون خلفية الأولوية (فاتح)
 */
export function getPriorityBgColor(score: number): string {
  if (score >= 70) return '#fef2f2';
  if (score >= 45) return '#fff7ed';
  if (score >= 20) return '#fffbeb';
  return '#f0fdf4';
}
