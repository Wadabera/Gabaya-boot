import { Injectable } from '@nestjs/common';

export interface EthiopicDate {
  year: number;
  month: number; // 1 - 13
  day: number;   // 1 - 30 (or 1 - 5/6 for Pagume)
  monthNameAmharic: string;
  monthNameEnglish: string;
  formatted: string;
  formattedAmharic: string;
}

@Injectable()
export class EthiopicCalendarService {
  public static readonly AMHARIC_MONTHS = [
    'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];

  public static readonly ENGLISH_MONTHS = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ];

  /**
   * Convert Gregorian Date to Ethiopian Date
   */
  gregorianToEthiopic(date: Date): EthiopicDate {
    const gYear = date.getUTCFullYear();
    const gMonth = date.getUTCMonth() + 1; // 1 - 12
    const gDay = date.getUTCDate();

    const isLeapGregorian = (gYear % 4 === 0 && gYear % 100 !== 0) || (gYear % 400 === 0);
    // Ethiopian new year Meskerem 1 is Sept 11, or Sept 12 if preceding leap
    const newYearDay = isLeapGregorian ? 12 : 11;

    const daysInMonths = [0, 31, isLeapGregorian ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear = gDay;
    for (let i = 1; i < gMonth; i++) {
      dayOfYear += daysInMonths[i];
    }

    let newYearDayOfYear = newYearDay;
    for (let i = 1; i < 9; i++) {
      newYearDayOfYear += daysInMonths[i];
    }

    let ethYear: number;
    let ethDayOfYear: number;

    if (dayOfYear >= newYearDayOfYear) {
      ethYear = gYear - 7;
      ethDayOfYear = dayOfYear - newYearDayOfYear + 1;
    } else {
      ethYear = gYear - 8;
      const prevGYear = gYear - 1;
      const prevGLeap = (prevGYear % 4 === 0 && prevGYear % 100 !== 0) || (prevGYear % 400 === 0);
      const prevNewYearDay = prevGLeap ? 12 : 11;
      let prevNewYearDayOfYear = prevNewYearDay;
      const prevDaysInMonths = [0, 31, prevGLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      for (let i = 1; i < 9; i++) {
        prevNewYearDayOfYear += prevDaysInMonths[i];
      }
      const daysInPrevGYear = prevGLeap ? 366 : 365;
      ethDayOfYear = (daysInPrevGYear - prevNewYearDayOfYear + 1) + dayOfYear;
    }

    const ethMonth = Math.min(Math.floor((ethDayOfYear - 1) / 30) + 1, 13);
    const ethDay = ((ethDayOfYear - 1) % 30) + 1;

    const monthNameAm = EthiopicCalendarService.AMHARIC_MONTHS[ethMonth - 1] || 'መስከረም';
    const monthNameEn = EthiopicCalendarService.ENGLISH_MONTHS[ethMonth - 1] || 'Meskerem';

    return {
      year: ethYear,
      month: ethMonth,
      day: ethDay,
      monthNameAmharic: monthNameAm,
      monthNameEnglish: monthNameEn,
      formatted: `${monthNameEn} ${ethDay}, ${ethYear}`,
      formattedAmharic: `${monthNameAm} ${ethDay} ቀን ${ethYear} ዓ.ም.`,
    };
  }

  /**
   * Format any date according to preference
   */
  formatDate(date: Date, useEthiopic: boolean = false, language: string = 'en'): string {
    if (!useEthiopic) {
      return date.toISOString().split('T')[0];
    }
    const eth = this.gregorianToEthiopic(date);
    return language === 'am' ? eth.formattedAmharic : eth.formatted;
  }
}
