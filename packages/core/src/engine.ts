import {
  Liability,
  TickerSnapshot,
  UserProfile,
  Transaction,
  IncomeSource,
  StreamingIncomeItem,
} from './types.js';

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

export function calculateAdditionalMonthlyIncome(sources: IncomeSource[] = []): number {
  return sources
    .filter(
      s =>
        (s.status ?? 'active') === 'active' &&
        ((s.mode ?? 'streaming') === 'streaming' || s.isAmortized)
    )
    .reduce((sum, s) => {
      const amt = s.amount || 0;
      return sum + (s.frequency === 'annual' ? amt / 12 : amt);
    }, 0);
}

export function calculateTickerSnapshot(
  profile: UserProfile,
  liabilities: Liability[],
  now = new Date(),
  transactions: Transaction[] = [],
  incomeSources: IncomeSource[] = []
): TickerSnapshot {
  const salaryPerSec = calculateSalaryPerSecond(profile);
  const dailyWorkSeconds = calculateDailyWorkingSeconds(profile);
  const totalMonthlySeconds = profile.workDaysPerMonth * dailyWorkSeconds;

  // Additional income (多元自定义收入: 配偶工资 / 房租 / 利息 / 副业)
  const additionalIncomeMonthly = calculateAdditionalMonthlyIncome(incomeSources);
  const totalMonthlyIncome = profile.monthlySalary + additionalIncomeMonthly;
  const additionalPerSecond =
    totalMonthlySeconds > 0 ? additionalIncomeMonthly / totalMonthlySeconds : 0;
  const totalIncomePerSecond = salaryPerSec + additionalPerSecond;

  const dailyDebt = calculateDailyDebtCost(liabilities, profile.workDaysPerMonth);
  const { workedSeconds, isWorkingTime, isLunchBreak } = calculateWorkedSecondsToday(profile, now);

  const additionalIncomeToday = workedSeconds * additionalPerSecond;
  const earnedToday = workedSeconds * totalIncomePerSecond;
  const netToday = earnedToday - dailyDebt;

  // Streaming items list (按秒计费的各项明细：配偶、房租、利息等)
  const streamingSources = incomeSources.filter(
    s =>
      (s.status ?? 'active') === 'active' &&
      ((s.mode ?? 'streaming') === 'streaming' || s.isAmortized)
  );
  const streamingIncomeItems: StreamingIncomeItem[] = streamingSources.map((s, idx) => {
    const monthly = s.frequency === 'annual' ? (s.amount || 0) / 12 : (s.amount || 0);
    const ratePerSecond = totalMonthlySeconds > 0 ? monthly / totalMonthlySeconds : 0;
    return {
      id: s.id ?? idx + 100,
      title: s.title,
      type: s.type,
      amount: s.amount,
      frequency: s.frequency ?? 'monthly',
      ratePerSecond,
      ratePerHour: Math.round(ratePerSecond * 3600 * 100) / 100,
      todayEarned: Math.round(workedSeconds * ratePerSecond * 100) / 100,
    };
  });

  const oneTimeIncomes = incomeSources.filter(
    s => s.mode === 'one_time' && !s.isAmortized
  );

  // Savings target hours and minutes (accelerated by total income)
  const remainingSavings = Math.max(0, profile.targetSavings - profile.currentSavings);
  const totalRemainingSeconds = totalIncomePerSecond > 0 ? remainingSavings / totalIncomePerSecond : 0;
  const remHours = Math.floor(totalRemainingSeconds / 3600);
  const remMinutes = Math.floor((totalRemainingSeconds % 3600) / 60);
  const remainingTimeFormatted = `${remHours} 小时 ${remMinutes} 分钟`;
  const hoursRemaining = totalRemainingSeconds / 3600;

  // Live decreasing debt calculations
  const activeLiabilities = liabilities.filter(l => (l.status ?? 'active') === 'active');
  const totalDebt = activeLiabilities.reduce(
    (acc, curr) => acc + (curr.totalAmount > 0 ? curr.totalAmount : curr.remainingAmount),
    0
  );
  const baseRemainingDebt = activeLiabilities.reduce((acc, curr) => acc + curr.remainingAmount, 0);

  // Today's debt消减: starts at dailyDebt and decreases to 0 as earnedToday grows
  const todayDebtRemainingLive = Math.max(0, dailyDebt - earnedToday);

  // Total debt消减: baseRemainingDebt steadily decreases by earnedToday
  const totalDebtRemainingLive = Math.max(0, baseRemainingDebt - earnedToday);
  const totalDebtPaid = Math.max(0, totalDebt - totalDebtRemainingLive);
  const debtPayoffPercent = totalDebt > 0 ? (totalDebtPaid / totalDebt) * 100 : 100;

  const hourlyTotalIncome = totalIncomePerSecond * 3600;
  const hoursToDebtFree = hourlyTotalIncome > 0 ? totalDebtRemainingLive / hourlyTotalIncome : 0;
  const annualWorkHours = (profile.workDaysPerMonth * dailyWorkSeconds * 12) / 3600;
  const yearsToDebtFree = annualWorkHours > 0 ? hoursToDebtFree / annualWorkHours : 0;

  // Total Labor Earnings (总所得 = 历史基准 + 今日实时所赚)
  const baseLaborEarnings = profile.baseLaborEarnings ?? 500000;
  const totalLaborEarningsLive = baseLaborEarnings + earnedToday;

  // Total Expenses (总花费 = 累计生活日常开销 + 负债总额)
  const txExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const defaultBaseLiving = Math.max(0, baseLaborEarnings - profile.currentSavings);
  const baseLiving = profile.baseLivingExpense !== undefined ? profile.baseLivingExpense : defaultBaseLiving;
  const totalLivingExpenses = baseLiving + txExpenses;
  const totalExpensesLive = totalLivingExpenses + totalDebt;

  return {
    earnedToday: Math.round(earnedToday * 100) / 100,
    dailyDebtCost: Math.round(dailyDebt * 100) / 100,
    netToday: Math.round(netToday * 100) / 100,
    isNetPositive: netToday >= 0,
    salaryPerSecond: salaryPerSec,
    totalIncomePerSecond,
    totalMonthlyIncome,
    additionalIncomeMonthly: Math.round(additionalIncomeMonthly * 100) / 100,
    additionalIncomeToday: Math.round(additionalIncomeToday * 100) / 100,
    streamingIncomeItems,
    oneTimeIncomes,
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
    totalLaborEarningsLive: Math.round(totalLaborEarningsLive * 100) / 100,
    totalExpensesLive: Math.round(totalExpensesLive * 100) / 100,
    totalLivingExpenses: Math.round(totalLivingExpenses * 100) / 100,
    isWorkingTime,
    isLunchBreak,
  };
}
