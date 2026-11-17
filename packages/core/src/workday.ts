export type DayScheduleKind = 'workday' | 'weekend' | 'holiday' | 'makeup_workday';

export interface HolidayCalendarEntry {
  date: string; // "YYYY-MM-DD"
  name: string;
  isOffDay: boolean; // true = 法定放假; false = 调休补班
  wage?: number;
}

export type HolidayCalendarMap = Record<string, HolidayCalendarEntry>;

export interface DayScheduleInfo {
  dateKey: string;
  isWorkday: boolean;
  kind: DayScheduleKind;
  holidayName?: string;
  wage?: number;
}

const RAW_BUILTIN_DAYS: HolidayCalendarEntry[] = [
  // 2025 国务院放假调休安排 (holiday-cn)
  { name: '元旦', date: '2025-01-01', isOffDay: true },
  { name: '春节', date: '2025-01-26', isOffDay: false },
  { name: '春节', date: '2025-01-28', isOffDay: true },
  { name: '春节', date: '2025-01-29', isOffDay: true },
  { name: '春节', date: '2025-01-30', isOffDay: true },
  { name: '春节', date: '2025-01-31', isOffDay: true },
  { name: '春节', date: '2025-02-01', isOffDay: true },
  { name: '春节', date: '2025-02-02', isOffDay: true },
  { name: '春节', date: '2025-02-03', isOffDay: true },
  { name: '春节', date: '2025-02-04', isOffDay: true },
  { name: '春节', date: '2025-02-08', isOffDay: false },
  { name: '清明节', date: '2025-04-04', isOffDay: true },
  { name: '清明节', date: '2025-04-05', isOffDay: true },
  { name: '清明节', date: '2025-04-06', isOffDay: true },
  { name: '劳动节', date: '2025-04-27', isOffDay: false },
  { name: '劳动节', date: '2025-05-01', isOffDay: true },
  { name: '劳动节', date: '2025-05-02', isOffDay: true },
  { name: '劳动节', date: '2025-05-03', isOffDay: true },
  { name: '劳动节', date: '2025-05-04', isOffDay: true },
  { name: '劳动节', date: '2025-05-05', isOffDay: true },
  { name: '端午节', date: '2025-05-31', isOffDay: true },
  { name: '端午节', date: '2025-06-01', isOffDay: true },
  { name: '端午节', date: '2025-06-02', isOffDay: true },
  { name: '国庆节、中秋节', date: '2025-09-28', isOffDay: false },
  { name: '国庆节、中秋节', date: '2025-10-01', isOffDay: true },
  { name: '国庆节、中秋节', date: '2025-10-02', isOffDay: true },
  { name: '国庆节、中秋节', date: '2025-10-03', isOffDay: true },
  { name: '国庆节、中秋节', date: '2025-10-04', isOffDay: true },
  { name: '国庆节、中秋节', date: '2025-10-05', isOffDay: true },
  { name: '国庆节、中秋节', date: '2025-10-06', isOffDay: true },
  { name: '国庆节、中秋节', date: '2025-10-07', isOffDay: true },
  { name: '国庆节、中秋节', date: '2025-10-08', isOffDay: true },
  { name: '国庆节、中秋节', date: '2025-10-11', isOffDay: false },
  // 2026 国务院放假调休安排 (holiday-cn)
  { name: '元旦', date: '2026-01-01', isOffDay: true },
  { name: '元旦', date: '2026-01-02', isOffDay: true },
  { name: '元旦', date: '2026-01-03', isOffDay: true },
  { name: '元旦', date: '2026-01-04', isOffDay: false },
  { name: '春节', date: '2026-02-14', isOffDay: false },
  { name: '春节', date: '2026-02-15', isOffDay: true },
  { name: '春节', date: '2026-02-16', isOffDay: true },
  { name: '春节', date: '2026-02-17', isOffDay: true },
  { name: '春节', date: '2026-02-18', isOffDay: true },
  { name: '春节', date: '2026-02-19', isOffDay: true },
  { name: '春节', date: '2026-02-20', isOffDay: true },
  { name: '春节', date: '2026-02-21', isOffDay: true },
  { name: '春节', date: '2026-02-22', isOffDay: true },
  { name: '春节', date: '2026-02-23', isOffDay: true },
  { name: '春节', date: '2026-02-28', isOffDay: false },
  { name: '清明节', date: '2026-04-04', isOffDay: true },
  { name: '清明节', date: '2026-04-05', isOffDay: true },
  { name: '清明节', date: '2026-04-06', isOffDay: true },
  { name: '劳动节', date: '2026-05-01', isOffDay: true },
  { name: '劳动节', date: '2026-05-02', isOffDay: true },
  { name: '劳动节', date: '2026-05-03', isOffDay: true },
  { name: '劳动节', date: '2026-05-04', isOffDay: true },
  { name: '劳动节', date: '2026-05-05', isOffDay: true },
  { name: '劳动节', date: '2026-05-09', isOffDay: false },
  { name: '端午节', date: '2026-06-19', isOffDay: true },
  { name: '端午节', date: '2026-06-20', isOffDay: true },
  { name: '端午节', date: '2026-06-21', isOffDay: true },
  { name: '国庆节', date: '2026-09-20', isOffDay: false },
  { name: '中秋节', date: '2026-09-25', isOffDay: true },
  { name: '中秋节', date: '2026-09-26', isOffDay: true },
  { name: '中秋节', date: '2026-09-27', isOffDay: true },
  { name: '国庆节', date: '2026-10-01', isOffDay: true },
  { name: '国庆节', date: '2026-10-02', isOffDay: true },
  { name: '国庆节', date: '2026-10-03', isOffDay: true },
  { name: '国庆节', date: '2026-10-04', isOffDay: true },
  { name: '国庆节', date: '2026-10-05', isOffDay: true },
  { name: '国庆节', date: '2026-10-06', isOffDay: true },
  { name: '国庆节', date: '2026-10-07', isOffDay: true },
  { name: '国庆节', date: '2026-10-10', isOffDay: false },
];

export const BUILTIN_CHINA_HOLIDAYS: HolidayCalendarMap = RAW_BUILTIN_DAYS.reduce<HolidayCalendarMap>(
  (acc, item) => {
    acc[item.date] = item;
    return acc;
  },
  {}
);

export function formatLocalYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function parseLocalYMD(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getDaySchedule(
  dateOrKey: Date | string,
  calendar: HolidayCalendarMap = BUILTIN_CHINA_HOLIDAYS
): DayScheduleInfo {
  const dateObj = typeof dateOrKey === 'string' ? parseLocalYMD(dateOrKey) : dateOrKey;
  const dateKey = typeof dateOrKey === 'string' ? dateOrKey : formatLocalYMD(dateObj);
  const override = calendar[dateKey];

  if (override) {
    if (override.isOffDay) {
      return {
        dateKey,
        isWorkday: false,
        kind: 'holiday',
        holidayName: override.name,
        wage: override.wage,
      };
    }
    return {
      dateKey,
      isWorkday: true,
      kind: 'makeup_workday',
      holidayName: override.name,
      wage: override.wage,
    };
  }

  const dow = dateObj.getDay();
  if (dow === 0 || dow === 6) {
    return {
      dateKey,
      isWorkday: false,
      kind: 'weekend',
    };
  }

  return {
    dateKey,
    isWorkday: true,
    kind: 'workday',
  };
}

export function isChinaWorkday(
  dateOrKey: Date | string,
  calendar: HolidayCalendarMap = BUILTIN_CHINA_HOLIDAYS
): boolean {
  return getDaySchedule(dateOrKey, calendar).isWorkday;
}
