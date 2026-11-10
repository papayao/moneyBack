import { Liability, TickerSnapshot, UserProfile } from './types.js';

export function parseTimeToSeconds(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 3600 + (minutes || 0) * 60;
}

export function calculateDailyWorkingSeconds(profile: UserProfile): number {
  const startSec = parseTimeToSeconds(profile.workStartTime);
  const endSec = parseTimeToSeconds(profile.workEndTime);
  const lunchStart = parseTimeToSeconds(profile.lunchStartTime);
  const lunchEnd = parseTimeToSeconds(profile.lunchEndTime);

  const totalSec = Math.max(0, endSec - startSec);
  const lunchSec = Math.max(0, lunchEnd - lunchStart);
  return Math.max(1, totalSec - lunchSec);
}

export function calculateSalaryPerSecond(profile: UserProfile): number {
  const dailyWorkSeconds = calculateDailyWorkingSeconds(profile);
  const totalMonthlySeconds = profile.workDaysPerMonth * dailyWorkSeconds;
  if (totalMonthlySeconds <= 0) return 0;
  return profile.monthlySalary / totalMonthlySeconds;
}

export function calculateDailyDebtCost(liabilities: Liability[], workDaysPerMonth: number): number {
  const activeLiabilities = liabilities.filter(l => (l.status ?? 'active') === 'active');
  const monthlyTotal = activeLiabilities.reduce((acc, curr) => acc + curr.monthlyPayment, 0);
  const days = workDaysPerMonth > 0 ? workDaysPerMonth : 21.75;
  return monthlyTotal / days;
}

export function calculateWorkedSecondsToday(profile: UserProfile, now = new Date()): {
  workedSeconds: number;
  isWorkingTime: boolean;
  isLunchBreak: boolean;
} {
  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const startSec = parseTimeToSeconds(profile.workStartTime);
  const endSec = parseTimeToSeconds(profile.workEndTime);
  const lunchStart = parseTimeToSeconds(profile.lunchStartTime);
  const lunchEnd = parseTimeToSeconds(profile.lunchEndTime);

  if (currentSeconds < startSec) {
    return { workedSeconds: 0, isWorkingTime: false, isLunchBreak: false };
  }

  if (currentSeconds >= endSec) {
    return {
      workedSeconds: calculateDailyWorkingSeconds(profile),
      isWorkingTime: false,
      isLunchBreak: false,
    };
  }

  // Inside lunch break
  if (currentSeconds >= lunchStart && currentSeconds < lunchEnd) {
    return {
      workedSeconds: Math.max(0, lunchStart - startSec),
      isWorkingTime: false,
      isLunchBreak: true,
    };
  }

  // Afternoon work
  if (currentSeconds >= lunchEnd) {
    const morningWork = Math.max(0, lunchStart - startSec);
    const afternoonWork = currentSeconds - lunchEnd;
    return {
      workedSeconds: morningWork + afternoonWork,
      isWorkingTime: true,
      isLunchBreak: false,
    };
  }

  // Morning work
  return {
    workedSeconds: currentSeconds - startSec,
    isWorkingTime: true,
    isLunchBreak: false,
  };
}

export function calculateTickerSnapshot(
  profile: UserProfile,
  liabilities: Liability[],
  now = new Date()
): TickerSnapshot {
  const salaryPerSec = calculateSalaryPerSecond(profile);
  const dailyDebt = calculateDailyDebtCost(liabilities, profile.workDaysPerMonth);
  const { workedSeconds, isWorkingTime, isLunchBreak } = calculateWorkedSecondsToday(profile, now);

  const earnedToday = workedSeconds * salaryPerSec;
  const netToday = earnedToday - dailyDebt;

  // Savings target hours
  const hourlySalary = salaryPerSec * 3600;
  const remainingSavings = Math.max(0, profile.targetSavings - profile.currentSavings);
  const hoursRemaining = hourlySalary > 0 ? remainingSavings / hourlySalary : 0;

  return {
    earnedToday: Math.round(earnedToday * 100) / 100,
    dailyDebtCost: Math.round(dailyDebt * 100) / 100,
    netToday: Math.round(netToday * 100) / 100,
    isNetPositive: netToday >= 0,
    salaryPerSecond: salaryPerSec,
    hoursWorkedToday: Math.round((workedSeconds / 3600) * 100) / 100,
    hoursRemainingToSavingsTarget: Math.round(hoursRemaining * 10) / 10,
    isWorkingTime,
    isLunchBreak,
  };
}
