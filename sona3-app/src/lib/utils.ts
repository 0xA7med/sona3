/**
 * Egyptian National ID Parser
 * 1st Digit: Century (2 = 1900-1999, 3 = 2000-2099)
 * 2nd-7th Digits: YYMMDD (Birth Date)
 * 8th-9th Digits: Governorate Code
 * 10th-13th Digits: Unique Rank (Odd = Male, Even = Female)
 * 14th Digit: Check Digit
 */
export const parseNationalID = (id: string) => {
  if (!id || id.length !== 14 || !/^\d+$/.test(id)) {
    return null;
  }

  const centuryCode = parseInt(id[0]);
  const yearShort = id.substring(1, 3);
  const month = id.substring(3, 5);
  const day = id.substring(5, 7);
  const govCode = id.substring(7, 9);
  const genderDigit = parseInt(id[12]);

  const year = (centuryCode === 2 ? 1900 : 2000) + parseInt(yearShort);
  const birthDate = `${year}-${month}-${day}`;
  const gender = genderDigit % 2 === 0 ? 'F' : 'M';

  // Calculate Age
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return { birthDate, gender, age, govCode };
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(amount);
};
