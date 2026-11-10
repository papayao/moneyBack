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

export function calculateDailyWorkingSeconds(schedule: { workStartTime: string; workEndTime: string }): number {
  const startSec = parseTimeToSeconds(schedule.workStartTime);
  const endSec = parseTimeToSeconds(schedule.workEndTime);
  return Math.max(1, endSec - startSec);
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

export function calculateWorkedSecondsToday(
  schedule: { workStartTime: string; workEndTime: string },
  now = new Date()
): {
  workedSeconds: number;
  isWorkingTime: boolean;
  isLunchBreak: boolean;
} {
  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const startSec = parseTimeToSeconds(schedule.workStartTime);
  const endSec = parseTimeToSeconds(schedule.workEndTime);
  const dailySeconds = Math.max(1, endSec - startSec);

  if (currentSeconds < startSec) {
    return { workedSeconds: 0, isWorkingTime: false, isLunchBreak: false };
  }

  if (currentSeconds >= endSec) {
    return {
      workedSeconds: dailySeconds,
      isWorkingTime: false,
      isLunchBreak: false,
    };
  }

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
  // 1. 主业工薪：严格按工作日与工作时段计费
  const salaryPerSec = calculateSalaryPerSecond(profile);
  const salaryPerHour = Math.round(salaryPerSec * 3600 * 10) / 10;
  const dailyWorkSeconds = calculateDailyWorkingSeconds(profile);
  const totalMonthlySeconds = profile.workDaysPerMonth * dailyWorkSeconds;

  const { workedSeconds, isWorkingTime, isLunchBreak } = calculateWorkedSecondsToday(profile, now);
  const mainLaborEarnedToday = workedSeconds * salaryPerSec;

  // 2. 被动与额外多元流式收益：
  // 若未填写上下班时间，默认 30 天 24 小时全天候自然月持续进账（如房租、理财或全天候收益）；
  // 若填写了上下班时间，则按设置的工作天数与工作时段按秒流式计费（如配偶打卡工薪、特定副业兼职）。
  const secondsElapsedToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const streamingSources = incomeSources.filter(
    s =>
      (s.status ?? 'active') === 'active' &&
      ((s.mode ?? 'streaming') === 'streaming' || s.isAmortized)
  );

  let totalAdditionalToday = 0;
  let activeAdditionalRatePerSecond = 0;

  const streamingIncomeItems: StreamingIncomeItem[] = streamingSources.map((s, idx) => {
    const monthly = s.frequency === 'annual' ? (s.amount || 0) / 12 : (s.amount || 0);
    const hasCustomSchedule = Boolean(s.workStartTime && s.workEndTime);

    let ratePerSecond = 0;
    let todayEarned = 0;
    let is24x7 = false;
    let isCurrentlyActive = false;

    if (!hasCustomSchedule) {
      // 未填时间：默认 30 天全天候 24/7 进账
      is24x7 = true;
      isCurrentlyActive = true;
      const days = s.workDaysPerMonth && s.workDaysPerMonth > 0 ? s.workDaysPerMonth : 30;
      const totalSecondsInMonth = days * 86400;
      ratePerSecond = totalSecondsInMonth > 0 ? monthly / totalSecondsInMonth : 0;
      todayEarned = secondsElapsedToday * ratePerSecond;
    } else {
      // 填了时间：按指定上下班时间与工作天数流式计费
      is24x7 = false;
      const days = s.workDaysPerMonth && s.workDaysPerMonth > 0 ? s.workDaysPerMonth : 21.75;
      const itemDailySeconds = calculateDailyWorkingSeconds({
        workStartTime: s.workStartTime!,
        workEndTime: s.workEndTime!,
      });
      const totalMonthlySeconds = days * itemDailySeconds;
      ratePerSecond = totalMonthlySeconds > 0 ? monthly / totalMonthlySeconds : 0;

      const scheduleResult = calculateWorkedSecondsToday(
        { workStartTime: s.workStartTime!, workEndTime: s.workEndTime! },
        now
      );
      todayEarned = scheduleResult.workedSeconds * ratePerSecond;
      isCurrentlyActive = scheduleResult.isWorkingTime;
    }

    if (isCurrentlyActive) {
      activeAdditionalRatePerSecond += ratePerSecond;
    }
    totalAdditionalToday += todayEarned;

    return {
      id: s.id ?? idx + 100,
      title: s.title,
      type: s.type,
      amount: s.amount,
      frequency: s.frequency ?? 'monthly',
      is24x7,
      ratePerSecond,
      ratePerHour: Math.round(ratePerSecond * 3600 * 100) / 100,
      todayEarned: Math.round(todayEarned * 100) / 100,
      workDaysPerMonth: s.workDaysPerMonth,
      workStartTime: s.workStartTime,
      workEndTime: s.workEndTime,
      isCurrentlyActive,
    };
  });

  const oneTimeIncomes = incomeSources.filter(
    s => s.mode === 'one_time' && !s.isAmortized
  );

  const additionalIncomeMonthly = calculateAdditionalMonthlyIncome(incomeSources);
  const totalMonthlyIncome = profile.monthlySalary + additionalIncomeMonthly;

  // 综合秒级产出速率（主业在工作时段产出 + 活跃中/全天候多元流式产出）
  const totalIncomePerSecond = (isWorkingTime ? salaryPerSec : 0) + activeAdditionalRatePerSecond;

  const earnedToday = mainLaborEarnedToday + totalAdditionalToday;
  const dailyDebt = calculateDailyDebtCost(liabilities, profile.workDaysPerMonth);
  const netToday = earnedToday - dailyDebt;

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
    mainLaborEarnedToday: Math.round(mainLaborEarnedToday * 100) / 100,
    salaryPerHour,
    dailyDebtCost: Math.round(dailyDebt * 100) / 100,
    netToday: Math.round(netToday * 100) / 100,
    isNetPositive: netToday >= 0,
    salaryPerSecond: salaryPerSec,
    totalIncomePerSecond,
    totalMonthlyIncome,
    additionalIncomeMonthly: Math.round(additionalIncomeMonthly * 100) / 100,
    additionalIncomeToday: Math.round(totalAdditionalToday * 100) / 100,
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
