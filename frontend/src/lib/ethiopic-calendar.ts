/**
 * Ethiopian (Ge'ez) Calendar Conversion Utility
 * Converts Gregorian dates to Ethiopian dates and formats them in Amharic & English
 */

export interface EthiopicDate {
  year: number;
  month: number; // 1 to 13
  day: number;
  monthNameAm: string;
  monthNameEn: string;
}

const ETHIOPIC_MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
];

const ETHIOPIC_MONTHS_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yakatit',
  'Magabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

/**
 * Converts a JS Date object to Ethiopic Date
 */
export function toEthiopicDate(date: Date): EthiopicDate {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1; // 1-12
  const gDay = date.getDate();

  // Julian Day Number calculation
  const a = Math.floor((14 - gMonth) / 12);
  const y = gYear + 4800 - a;
  const m = gMonth + 12 * a - 3;
  const jdn =
    gDay +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  // Ethiopic Era epoch in JDN (August 29, 8 CE Gregorian)
  const ethEpoch = 1723856;
  const r = (jdn - ethEpoch) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);

  const ethYear =
    4 * Math.floor((jdn - ethEpoch) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  const ethMonth = Math.floor(n / 30) + 1;
  const ethDay = (n % 30) + 1;

  const validMonth = Math.min(Math.max(ethMonth, 1), 13);

  return {
    year: ethYear,
    month: validMonth,
    day: ethDay,
    monthNameAm: ETHIOPIC_MONTHS_AM[validMonth - 1] || 'መስከረም',
    monthNameEn: ETHIOPIC_MONTHS_EN[validMonth - 1] || 'Meskerem',
  };
}

/**
 * Formats a date string or Date object in Ethiopian calendar
 */
export function formatEthiopicDate(
  dateInput: string | Date | number,
  lang: 'am' | 'en' = 'am'
): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const eth = toEthiopicDate(date);

  if (lang === 'am') {
    return `${eth.monthNameAm} ${eth.day} ቀን ${eth.year} ዓ.ም.`;
  }
  return `${eth.monthNameEn} ${eth.day}, ${eth.year} E.C.`;
}

/**
 * Dual date helper: returns string with both or preferred calendar
 */
export function formatDualDate(
  dateInput: string | Date | number,
  useEth: boolean = false,
  lang: 'am' | 'en' = 'am'
): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  if (useEth) {
    return formatEthiopicDate(date, lang);
  }

  return date.toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
