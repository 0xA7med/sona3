// ================================================================
// idParser.ts — خوارزمية استخراج بيانات الرقم القومي المصري
// ================================================================
import type { IDParseResult } from '../types';

const GOVERNORATES: Record<number, string> = {
  1: 'القاهرة', 2: 'الإسكندرية', 3: 'بورسعيد', 4: 'السويس',
  11: 'دمياط', 12: 'الدقهلية', 13: 'الشرقية', 14: 'القليوبية',
  15: 'كفر الشيخ', 16: 'الغربية', 17: 'المنوفية', 18: 'البحيرة',
  19: 'الإسماعيلية', 21: 'الجيزة', 22: 'بني سويف', 23: 'الفيوم',
  24: 'المنيا', 25: 'أسيوط', 26: 'سوهاج', 27: 'قنا', 28: 'أسوان',
  29: 'الأقصر', 31: 'البحر الأحمر', 32: 'الوادي الجديد',
  33: 'مطروح', 34: 'شمال سيناء', 35: 'جنوب سيناء', 88: 'خارج الجمهورية'
};

export function parseEgyptianID(nationalId: string): IDParseResult {
  if (!nationalId || nationalId.length !== 14) {
    return { valid: false, error: 'الرقم القومي يجب أن يكون 14 رقماً' };
  }

  if (!/^\d{14}$/.test(nationalId)) {
    return { valid: false, error: 'الرقم القومي يجب أن يحتوي على أرقام فقط' };
  }

  const centuryDigit = parseInt(nationalId[0]);
  if (centuryDigit !== 2 && centuryDigit !== 3) {
    return { valid: false, error: 'رقم القرن غير صحيح (يجب أن يكون 2 أو 3)' };
  }

  const century: 19 | 20 = centuryDigit === 2 ? 19 : 20;
  const yearSuffix = nationalId.substring(1, 3);
  const month = nationalId.substring(3, 5);
  const day = nationalId.substring(5, 7);
  const govCode = parseInt(nationalId.substring(7, 9));
  const genderDigit = parseInt(nationalId[12]);

  const year = (century === 19 ? 1900 : 2000) + parseInt(yearSuffix);
  const monthNum = parseInt(month);
  const dayNum = parseInt(day);

  // التحقق من صحة التاريخ
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
    return { valid: false, error: 'تاريخ الميلاد في الرقم القومي غير صحيح' };
  }

  const dateOfBirth = new Date(year, monthNum - 1, dayNum);
  if (isNaN(dateOfBirth.getTime())) {
    return { valid: false, error: 'تاريخ الميلاد غير صحيح' };
  }

  // حساب العمر
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  // الجنس: فردي = ذكر، زوجي = أنثى
  const gender: 'M' | 'F' = genderDigit % 2 !== 0 ? 'M' : 'F';

  // المحافظة
  const governorate = GOVERNORATES[govCode];

  return {
    valid: true,
    dateOfBirth,
    age,
    gender,
    governorate,
    governorateCode: govCode.toString().padStart(2, '0'),
    century,
  };
}

/**
 * تحديد المرحلة الدراسية بناءً على العمر
 */
export function getSchoolStage(age: number): string {
  if (age < 4) return 'preschool';
  if (age <= 5) return 'preschool';
  if (age <= 11) return 'primary';      // المرحلة الابتدائية (6-11)
  if (age <= 14) return 'preparatory';  // المرحلة الإعدادية (12-14)
  if (age <= 17) return 'secondary';    // المرحلة الثانوية (15-17)
  if (age <= 22) return 'university';   // الجامعة (18-22)
  return 'graduated';
}

/**
 * اسم المرحلة الدراسية بالعربية
 */
export const SCHOOL_STAGE_LABELS: Record<string, string> = {
  preschool: 'ما قبل المدرسة',
  primary: 'المرحلة الابتدائية',
  preparatory: 'المرحلة الإعدادية',
  secondary: 'المرحلة الثانوية',
  university: 'المرحلة الجامعية',
  graduated: 'خريج',
  not_in_school: 'خارج المنظومة التعليمية',
};

/**
 * اسم المحافظة من الكود
 */
export function getGovernorateName(code: number): string {
  return GOVERNORATES[code] || 'غير محدد';
}

/**
 * التحقق السريع من صحة الرقم القومي
 */
export function isValidID(nationalId: string): boolean {
  return parseEgyptianID(nationalId).valid;
}
