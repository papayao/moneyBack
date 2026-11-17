import { useEffect, useState } from 'react';
import {
  BUILTIN_CHINA_HOLIDAYS,
  HolidayCalendarEntry,
  HolidayCalendarMap,
} from '@moneyback/core';

const CACHE_KEY = 'moneyback_holiday_cn_cache_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedCalendar {
  updatedAt: number;
  entries: HolidayCalendarMap;
}

function loadCachedCalendar(): CachedCalendar | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCalendar;
    if (parsed && typeof parsed.updatedAt === 'number' && parsed.entries) {
      return parsed;
    }
  } catch {
    // Ignore invalid storage cache
  }
  return null;
}

export function useHolidayCalendar(): HolidayCalendarMap {
  const [calendar, setCalendar] = useState<HolidayCalendarMap>(() => {
    const cached = loadCachedCalendar();
    return cached ? { ...BUILTIN_CHINA_HOLIDAYS, ...cached.entries } : BUILTIN_CHINA_HOLIDAYS;
  });

  useEffect(() => {
    const cached = loadCachedCalendar();
    if (cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
      return;
    }

    let cancelled = false;
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1];

    Promise.all(
      years.map(async year => {
        try {
          const res = await fetch(
            `https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`
          );
          if (!res.ok) return [] as HolidayCalendarEntry[];
          const data = (await res.json()) as { days?: HolidayCalendarEntry[] };
          return Array.isArray(data?.days) ? data.days : [];
        } catch {
          return [] as HolidayCalendarEntry[];
        }
      })
    ).then(results => {
      if (cancelled) return;
      const merged: HolidayCalendarMap = {};
      for (const days of results) {
        for (const item of days) {
          if (item?.date && typeof item.isOffDay === 'boolean') {
            merged[item.date] = {
              date: item.date,
              name: item.name || '节假日',
              isOffDay: item.isOffDay,
              wage: item.wage,
            };
          }
        }
      }
      if (Object.keys(merged).length === 0) return;

      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ updatedAt: Date.now(), entries: merged } satisfies CachedCalendar)
        );
      } catch {
        // Ignore quota error
      }
      setCalendar({ ...BUILTIN_CHINA_HOLIDAYS, ...merged });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return calendar;
}
