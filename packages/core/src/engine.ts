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

  // Savings target hours and minutes
  const remainingSavings = Math.max(0, profile.targetSavings - profile.currentSavings);
  const totalRemainingSeconds = salaryPerSec > 0 ? remainingSavings / salaryPerSec : 0;
  const remHours = Math.floor(totalRemainingSeconds / 3600);
  const remMinutes = Math.floor((totalRemainingSeconds % 3600) / 60);
  const remainingTimeFormatted = `${remHours} 小时 ${remMinutes} 分钟`;
  const hoursRemaining = totalRemainingSeconds / 3600;

  // Live decreasing debt calculations
  const activeLiabilities = liabilities.filter(l => (l.status ?? 'active') === 'active');
  const totalDebt = activeLiabilities.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const baseRemainingDebt = activeLiabilities.reduce((acc, curr) => acc + curr.remainingAmount, 0);

  // Today's debt消减: starts at dailyDebt and decreases to 0 as earnedToday grows
  const todayDebtRemainingLive = Math.max(0, dailyDebt - earnedToday);

  // Total debt消减: baseRemainingDebt steadily decreases by earnedToday
  const totalDebtRemainingLive = Math.max(0, baseRemainingDebt - earnedToday);
  const totalDebtPaid = Math.max(0, totalDebt - totalDebtRemainingLive);
  const debtPayoffPercent = totalDebt > 0 ? (totalDebtPaid / totalDebt) * 100 : 100;

  const hourlySalary = salaryPerSec * 3600;
  const hoursToDebtFree = hourlySalary > 0 ? totalDebtRemainingLive / hourlySalary : 0;
  const dailyWorkSeconds = calculateDailyWorkingSeconds(profile);
  const annualWorkHours = (profile.workDaysPerMonth * dailyWorkSeconds * 12) / 3600;
  const yearsToDebtFree = annualWorkHours > 0 ? hoursToDebtFree / annualWorkHours : 0;

  return {
    earnedToday: Math.round(earnedToday * 100) / 100,
    dailyDebtCost: Math.round(dailyDebt * 100) / 100,
    netToday: Math.round(netToday * 100) / 100,
    isNetPositive: netToday >= 0,
    salaryPerSecond: salaryPerSec,
    hoursWorkedToday: Math.round((workedSeconds / 3600) * 100) / 100,
    hoursRemainingToSavingsTarget: Math.round(hoursRemaining * 10) / 10,
    remainingTimeFormatted,
    totalDebt: Math.round(totalDebt * 100) / 100,
    totalDebtRemainingLive: Math.round(totalDebtRemainingLive * 100) / 100,
    totalDebtPaid: Math.round(totalDebtPaid * 100) / 100,
    debtPayoffPercent: Math.round(debtPayoffPercent * 10) / 10,
    todayDebtRemainingLive: Math.round(todayDebtRemainingLive * 100) / 100,
    hoursToDebtFree: Math.round(hoursToDebtFree * 10) / 10,
    yearsToDebtFree: Math.round(yearsToDebtFree * 10) / 10,
    isWorkingTime,
    isLunchBreak,
  };
}
