declare module 'date-holidays' {
  interface Holiday {
    date: Date | string;
    name: string;
    type?: string;
    rule?: string;
  }

  class Holidays {
    constructor(country?: string, state?: string, lang?: string);
    getHolidays(year: number): Holiday[];
    isHoliday(date: Date): boolean;
    getHolidayName(date: Date): string | null;
  }

  export default Holidays;
}

