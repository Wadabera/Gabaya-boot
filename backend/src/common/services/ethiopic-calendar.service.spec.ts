import { EthiopicCalendarService } from './ethiopic-calendar.service';

describe('EthiopicCalendarService', () => {
  let service: EthiopicCalendarService;

  beforeEach(() => {
    service = new EthiopicCalendarService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should accurately convert Gregorian date to Ethiopian date', () => {
    // 2026-10-12 Gregorian is Tikimt 2, 2019 E.C.
    const date = new Date(Date.UTC(2026, 9, 12)); // Oct is month index 9
    const eth = service.gregorianToEthiopic(date);

    expect(eth.year).toBe(2019);
    expect(eth.month).toBe(2);
    expect(eth.day).toBe(2);
    expect(eth.monthNameEnglish).toBe('Tikimt');
    expect(eth.monthNameAmharic).toBe('ጥቅምት');
    expect(eth.formatted).toBe('Tikimt 2, 2019');
    expect(eth.formattedAmharic).toBe('ጥቅምት 2 ቀን 2019 ዓ.ም.');
  });

  it('should accurately format date based on preference', () => {
    const date = new Date(Date.UTC(2026, 9, 12));
    const gregStr = service.formatDate(date, false);
    const ethEnStr = service.formatDate(date, true, 'en');
    const ethAmStr = service.formatDate(date, true, 'am');

    expect(gregStr).toBe('2026-10-12');
    expect(ethEnStr).toBe('Tikimt 2, 2019');
    expect(ethAmStr).toBe('ጥቅምት 2 ቀን 2019 ዓ.ም.');
  });
});
