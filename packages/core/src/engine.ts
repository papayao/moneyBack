import {
  Liability,
  TickerSnapshot,
  UserProfile,
  Transaction,
  IncomeSource,
  StreamingIncomeItem,
} from './types.js';
import {
  BUILTIN_CHINA_HOLIDAYS,
  HolidayCalendarMap,
  formatLocalYMD,
  getDaySchedule,
  isChinaWorkday,
} from './workday.js';

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

export function calculateDailyDebtCost(
  liabilities: Liability[],
  workDaysPerMonth: number,
  atDate?: Date,
  holidayCalendar: HolidayCalendarMap = BUILTIN_CHINA_HOLIDAYS
): number {
  if (atDate && !isChinaWorkday(atDate, holidayCalendar)) {
    return 0;
  }
  const atDateStr = atDate ? formatLocalYMD(atDate) : null;
  const activeLiabilities = liabilities.filter(l => {
    if ((l.status ?? 'active') !== 'active') return false;
    if (atDateStr && l.startDate && l.startDate > atDateStr) return false;
    return true;
  });
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

const parseYMD = (s?: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};

/**
 * 单段任职所得（HR 分月算法）：
 * - 完整月 = 月薪
 * - 零头月 = 月薪 ÷ 月计薪天数(21.75) × 计薪天数（周一至周五，含法定节假日），封顶月薪
 * - 在职（无离职日）时，今天按秒累计 todayEarned（仅工作日）
 * 未内置调休表：调休周末上班日不计入。
 */
export function calculateJobEarnings(
  startDate: string,
  endDate: string | undefined,
  monthlySalary: number,
  paidDaysPerMonth: number,
  now: Date,
  todayEarned = 0
): { total: number; tenureDays: number; paidDays: number } {
  const start = parseYMD(startDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endParsed = parseYMD(endDate);
  const isOngoing = !endParsed || endParsed >= today;
  const end = isOngoing ? today : endParsed!;
  if (!start || start > end) return { total: 0, tenureDays: 0, paidDays: 0 };

  const daily = monthlySalary / (paidDaysPerMonth > 0 ? paidDaysPerMonth : 21.75);
  const isWeekday = (dt: Date) => dt.getDay() !== 0 && dt.getDay() !== 6;
  const DAY = 86400000;

  let total = 0;
  let paidDays = 0;
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const monthStart = cursor;
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const isLastMonth = cursor.getFullYear() === end.getFullYear() && cursor.getMonth() === end.getMonth();
    const from = start > monthStart ? start : monthStart;
    // 在职：本月只数到昨天（今天按秒算）；已离职：数到离职日当天
    const to = isLastMonth ? (isOngoing ? new Date(end.getTime() - DAY) : end) : monthEnd;

    let count = 0;
    for (let t = new Date(from); t <= to; t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)) {
      if (isWeekday(t)) count++;
    }
    paidDays += count;

    const isFullMonth =
      from.getTime() === monthStart.getTime() &&
      (!isLastMonth || (!isOngoing && end.getTime() === monthEnd.getTime()));
    if (isFullMonth) {
      total += monthlySalary;
    } else {
      let monthPay = count * daily;
      if (isLastMonth && isOngoing && isWeekday(today)) {
        monthPay += todayEarned;
        paidDays += 1;
      }
      total += Math.min(monthlySalary, monthPay);
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  const tenureDays = Math.round((end.getTime() - start.getTime()) / DAY) + 1;
  return { total, tenureDays, paidDays };
}

/** 职业生涯总所得 = 过往公司（各自月薪）+ 当前公司（profile 月薪，含今天按秒） */
export function calculateTenureEarnings(
  profile: UserProfile,
  now: Date,
  todayEarned: number
): { total: number; tenureDays: number; paidDays: number; pastTotal: number; earliestStartDate?: string } | null {
  const pastJobs = profile.pastJobs ?? [];
  if (!profile.hireDate && pastJobs.length === 0) return null;
  const days = profile.workDaysPerMonth;
  const pastTotal = pastJobs.reduce(
    (sum, j) => sum + calculateJobEarnings(j.startDate, j.endDate, j.monthlySalary, days, now).total,
    0
  );
  const current = profile.hireDate
    ? calculateJobEarnings(profile.hireDate, undefined, profile.monthlySalary, days, now, todayEarned)
    : { total: todayEarned, tenureDays: 0, paidDays: 0 };
  const startDates = [
    ...pastJobs.map(j => j.startDate).filter(Boolean),
    ...(profile.hireDate ? [profile.hireDate] : []),
  ].sort();
  return {
    ...current,
    total: pastTotal + current.total,
    pastTotal,
    earliestStartDate: startDates[0],
  };
}

/** 24/7 被动收入（房租、利息等）按自然日分月累计 */
export function calculatePassiveCalendarEarnings(
  startDate: string,
  monthlyAmount: number,
  now: Date,
  todayEarned = 0
): number {
  const start = parseYMD(startDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!start || start > today || monthlyAmount <= 0) return todayEarned;

  const daily = monthlyAmount / 30;
  const DAY = 86400000;
  let total = 0;
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= today) {
    const monthStart = cursor;
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const isLastMonth =
      cursor.getFullYear() === today.getFullYear() && cursor.getMonth() === today.getMonth();
    const from = start > monthStart ? start : monthStart;
    const to = isLastMonth ? new Date(today.getTime() - DAY) : monthEnd;

    const isFullMonth = from.getTime() === monthStart.getTime() && !isLastMonth;
    if (isFullMonth) {
      total += monthlyAmount;
    } else {
      const pastDays =
        to >= from ? Math.round((to.getTime() - from.getTime()) / DAY) + 1 : 0;
      const monthPay = pastDays * daily + (isLastMonth ? todayEarned : 0);
      total += Math.min(monthlyAmount, monthPay);
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return total;
}

export function calculateAdditionalMonthlyIncome(sources: IncomeSource[] = []): number {
  return sources
    .filter(
      s =>
        (s.status ?? 'active') === 'active' &&
        (s.mode ?? 'streaming') === 'streaming'
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
  incomeSources: IncomeSource[] = [],
  holidayCalendar: HolidayCalendarMap = BUILTIN_CHINA_HOLIDAYS
): TickerSnapshot {
  // 1. 主业工薪：工作日按工作时段计费；非工作日(双休/法定节假日)不自动启停，仅在加班审批后计时
  const salaryPerSec = calculateSalaryPerSecond(profile);
  const salaryPerHour = Math.round(salaryPerSec * 3600 * 10) / 10;
  const dailyWorkSeconds = calculateDailyWorkingSeconds(profile);

  const todaySchedule = getDaySchedule(now, holidayCalendar);
  const isTodayWorkday = todaySchedule.isWorkday;

  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const workStartSec = parseTimeToSeconds(profile.workStartTime);
  const workEndSec = parseTimeToSeconds(profile.workEndTime);
  const isBeforeWork = isTodayWorkday ? currentSeconds < workStartSec : false;
  const isAfterWork = isTodayWorkday ? currentSeconds >= workEndSec : false;

  const {
    workedSeconds,
    isWorkingTime: normalIsWorkingTime,
    isLunchBreak,
  } = isTodayWorkday
    ? calculateWorkedSecondsToday(profile, now)
    : { workedSeconds: 0, isWorkingTime: false, isLunchBreak: false };

  // 今日加班核算（仅当日期匹配今日且通过加班审批时有效）
  const todayStr = formatLocalYMD(now);
  const ot =
    profile.todayOvertime &&
    profile.todayOvertime.date === todayStr &&
    profile.todayOvertime.hours > 0
      ? profile.todayOvertime
      : undefined;

  let isOvertimeActive = false;
  let overtimeEarnedToday = 0;
  let overtimeElapsedSec = 0;
  let overtimeHoursToday = 0;
  let overtimeHourlyRate: number | undefined;
  let overtimeRemainingFormatted: string | undefined;
  let activeOvertimePerSec = 0;

  if (ot) {
    overtimeHoursToday = ot.hours;
    const otStartSec = isTodayWorkday
      ? Math.max(workEndSec, ot.startSec ?? workEndSec)
      : (ot.startSec ?? currentSeconds);
    const otDurationSec = Math.round(ot.hours * 3600);
    const otEndSec = otStartSec + otDurationSec;
    overtimeElapsedSec = Math.max(0, Math.min(otDurationSec, currentSeconds - otStartSec));
    isOvertimeActive = currentSeconds >= otStartSec && currentSeconds < otEndSec;

    const customHourly =
      typeof ot.hourlyRate === 'number' && Number.isFinite(ot.hourlyRate) && ot.hourlyRate >= 0
        ? ot.hourlyRate
        : undefined;
    const otPerSec = customHourly !== undefined ? customHourly / 3600 : salaryPerSec;
    overtimeHourlyRate =
      customHourly !== undefined ? Math.round(customHourly * 10) / 10 : salaryPerHour;

    if (ot.rewardType === 'paid') {
      overtimeEarnedToday = overtimeElapsedSec * otPerSec;
      if (isOvertimeActive) {
        activeOvertimePerSec = otPerSec;
      }
    }

    if (isOvertimeActive) {
      const remSec = Math.max(0, otEndSec - currentSeconds);
      const rh = Math.floor(remSec / 3600);
      const rm = Math.floor((remSec % 3600) / 60);
      const rs = remSec % 60;
      overtimeRemainingFormatted = `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}:${String(rs).padStart(2, '0')}`;
    }
  }

  const isWorkingTime = normalIsWorkingTime || (isOvertimeActive && ot?.rewardType === 'paid');
  const mainLaborEarnedToday = workedSeconds * salaryPerSec + overtimeEarnedToday;

  // 2. 被动与额外多元流式收益：
  // 若未填写上下班时间，默认 30 天 24 小时全天候自然月持续进账（如房租、理财或全天候收益）；
  // 若填写了上下班时间或配偶工薪，仅在工作日按工作时段流式计费。
  const secondsElapsedToday = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const streamingSources = incomeSources.filter(
    s =>
      (s.status ?? 'active') === 'active' &&
      (s.mode ?? 'streaming') === 'streaming'
  );

  let totalAdditionalToday = 0;
  let todayScheduledAdditional = 0;
  let todayPassiveAdditional = 0;
  let scheduledAdditionalMonthly = 0;
  let passiveAdditionalMonthly = 0;
  let activeAdditionalRatePerSecond = 0;
  let nominalAdditionalRatePerSecond = 0;

  const streamingIncomeItems: StreamingIncomeItem[] = streamingSources.map((s, idx) => {
    const monthly = s.frequency === 'annual' ? (s.amount || 0) / 12 : (s.amount || 0);
    const isSalaryLike = s.type === 'partner' || Boolean(s.workStartTime && s.workEndTime);
    const effStartTime = s.workStartTime || (s.type === 'partner' ? profile.workStartTime : undefined);
    const effEndTime = s.workEndTime || (s.type === 'partner' ? profile.workEndTime : undefined);
    const hasCustomSchedule = Boolean(isSalaryLike && effStartTime && effEndTime);

    let ratePerSecond = 0;
    let todayEarned = 0;
    let is24x7 = false;
    let isCurrentlyActive = false;

    if (!hasCustomSchedule) {
      is24x7 = true;
      isCurrentlyActive = true;
      passiveAdditionalMonthly += monthly;
      const days = s.workDaysPerMonth && s.workDaysPerMonth > 0 ? s.workDaysPerMonth : 30;
      const totalSecondsInMonth = days * 86400;
      ratePerSecond = totalSecondsInMonth > 0 ? monthly / totalSecondsInMonth : 0;
      todayEarned = secondsElapsedToday * ratePerSecond;
      todayPassiveAdditional += todayEarned;
    } else {
      is24x7 = false;
      scheduledAdditionalMonthly += monthly;
      const days =
        s.workDaysPerMonth && s.workDaysPerMonth > 0
          ? s.workDaysPerMonth
          : profile.workDaysPerMonth || 21.75;
      const itemDailySeconds = calculateDailyWorkingSeconds({
        workStartTime: effStartTime!,
        workEndTime: effEndTime!,
      });
      const totalMonthlySeconds = days * itemDailySeconds;
      ratePerSecond = totalMonthlySeconds > 0 ? monthly / totalMonthlySeconds : 0;

      const scheduleResult = isTodayWorkday
        ? calculateWorkedSecondsToday(
            { workStartTime: effStartTime!, workEndTime: effEndTime! },
            now
          )
        : { workedSeconds: 0, isWorkingTime: false };
      todayEarned = scheduleResult.workedSeconds * ratePerSecond;
      isCurrentlyActive = scheduleResult.isWorkingTime;
      todayScheduledAdditional += todayEarned;
    }

    nominalAdditionalRatePerSecond += ratePerSecond;
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
      workStartTime: effStartTime,
      workEndTime: effEndTime,
      isCurrentlyActive,
    };
  });

  // 3. 一次性收入：当日录入的一次性收入自动一次性计入今日“总收入”（绝不计入“主要收入”）
  const oneTimeIncomes = incomeSources.filter(s => s.mode === 'one_time');
  const todayOneTimeTotal = oneTimeIncomes
    .filter(s => !s.receivedDate || s.receivedDate === todayStr)
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const realizedOneTimeTotal = oneTimeIncomes
    .filter(s => s.status === 'received' || !s.receivedDate || s.receivedDate <= todayStr)
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  totalAdditionalToday += todayOneTimeTotal;

  const additionalIncomeMonthly = calculateAdditionalMonthlyIncome(incomeSources);
  const totalMonthlyIncome = profile.monthlySalary + additionalIncomeMonthly;

  // 工作时段等效综合时薪（不因下班或休息日骤降为仅剩被动时薪）
  const nominalTotalRatePerSecond = salaryPerSec + nominalAdditionalRatePerSecond;
  const nominalTotalHourlyRate = Math.round(nominalTotalRatePerSecond * 3600 * 10) / 10;

  // 综合秒级实时流速（仅在当前真正产出的时段累加）
  const totalIncomePerSecond =
    (normalIsWorkingTime ? salaryPerSec : 0) +
    activeOvertimePerSec +
    activeAdditionalRatePerSecond;

  const earnedToday = mainLaborEarnedToday + totalAdditionalToday;
  const dailyDebt = calculateDailyDebtCost(liabilities, profile.workDaysPerMonth, now, holidayCalendar);
  const netToday = earnedToday - dailyDebt;

  // Savings target hours and minutes (fallback to nominal rate when off-duty)
  const effectiveRateForEta =
    totalIncomePerSecond > 0 ? totalIncomePerSecond : nominalTotalRatePerSecond;
  const remainingSavings = Math.max(0, profile.targetSavings - profile.currentSavings);
  const totalRemainingSeconds =
    effectiveRateForEta > 0 ? remainingSavings / effectiveRateForEta : 0;
  const remHours = Math.floor(totalRemainingSeconds / 3600);
  const remMinutes = Math.floor((totalRemainingSeconds % 3600) / 60);
  const remainingTimeFormatted = `${remHours} 小时 ${remMinutes} 分钟`;
  const hoursRemaining = totalRemainingSeconds / 3600;

  // Total Labor Earnings (总所得)：设置入职日期/过往公司 → 从第一天上班分月累计；否则 = 历史基准 + 今日主要收入
  const baseLaborEarnings = profile.baseLaborEarnings ?? 500000;
  const tenure = calculateTenureEarnings(profile, now, mainLaborEarnedToday);
  const totalLaborEarningsLive = tenure ? tenure.total : baseLaborEarnings + mainLaborEarnedToday;

  // 职业生涯累计主业所得 & 累计额外所得（工薪走工作日口径，24/7 被动收入按自然日累计）
  const careerMainEarnings = tenure ? tenure.total : mainLaborEarnedToday;
  const careerScheduledAdditional =
    tenure?.earliestStartDate && scheduledAdditionalMonthly > 0
      ? calculateJobEarnings(
          tenure.earliestStartDate,
          undefined,
          scheduledAdditionalMonthly,
          profile.workDaysPerMonth,
          now,
          todayScheduledAdditional
        ).total
      : todayScheduledAdditional;
  const careerPassiveAdditional =
    tenure?.earliestStartDate && passiveAdditionalMonthly > 0
      ? calculatePassiveCalendarEarnings(
          tenure.earliestStartDate,
          passiveAdditionalMonthly,
          now,
          todayPassiveAdditional
        )
      : todayPassiveAdditional;
  const careerAdditionalEarnings =
    careerScheduledAdditional + careerPassiveAdditional + realizedOneTimeTotal;

  // Live decreasing debt calculations (仅统计起始时间 <= 今日的生效负债)
  const activeLiabilities = liabilities.filter(l => {
    if ((l.status ?? 'active') !== 'active') return false;
    if (l.startDate && l.startDate > todayStr) return false;
    return true;
  });
  const totalDebt = activeLiabilities.reduce(
    (acc, curr) => acc + (curr.totalAmount > 0 ? curr.totalAmount : curr.remainingAmount),
    0
  );
  const baseRemainingDebt = activeLiabilities.reduce((acc, curr) => acc + curr.remainingAmount, 0);
  const alreadyRepaidOnLoan = Math.max(0, totalDebt - baseRemainingDebt);

  // Today's debt消减: starts at dailyDebt and decreases to 0 as earnedToday grows
  const todayDebtRemainingLive = Math.max(0, dailyDebt - earnedToday);

  // Total debt消减: 优先计入从第一天上班以来的累计收入（并不少于已手动核减的已还本金+今日收入）
  const effectiveDebtPaidRaw = Math.max(
    alreadyRepaidOnLoan + mainLaborEarnedToday,
    careerMainEarnings
  );
  const totalDebtPaid = Math.min(totalDebt, effectiveDebtPaidRaw);
  const totalDebtRemainingLive = Math.max(0, totalDebt - totalDebtPaid);
  const debtPayoffPercent = totalDebt > 0 ? (totalDebtPaid / totalDebt) * 100 : 100;

  const hourlyTotalIncome =
    (totalIncomePerSecond > 0 ? totalIncomePerSecond : nominalTotalRatePerSecond) * 3600;
  const hoursToDebtFree = hourlyTotalIncome > 0 ? totalDebtRemainingLive / hourlyTotalIncome : 0;
  const annualWorkHours = (profile.workDaysPerMonth * dailyWorkSeconds * 12) / 3600;
  const yearsToDebtFree = annualWorkHours > 0 ? hoursToDebtFree / annualWorkHours : 0;

  // Total Expenses (总花费 = 累计生活日常开销 + 负债总额)
  const txExpenses = transactions
    .filter(t => t.type === 'expense' && !t.isRefundOffset)
    .reduce((sum, t) => sum + t.amount, 0);
  const defaultBaseLiving = Math.max(0, baseLaborEarnings - profile.currentSavings);
  const baseLiving = profile.baseLivingExpense !== undefined ? profile.baseLivingExpense : defaultBaseLiving;
  const totalLivingExpenses = baseLiving + txExpenses;
  const totalExpensesLive = totalLivingExpenses + totalDebt;

  return {
    earnedToday: Math.round(earnedToday * 100) / 100,
    mainLaborEarnedToday: Math.round(mainLaborEarnedToday * 100) / 100,
    salaryPerHour,
    nominalTotalHourlyRate,
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
    hoursWorkedToday: Math.round(((workedSeconds + overtimeElapsedSec) / 3600) * 100) / 100,
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
    careerStartDate: tenure?.earliestStartDate,
    careerMainEarnings: Math.round(careerMainEarnings * 100) / 100,
    careerAdditionalEarnings: Math.round(careerAdditionalEarnings * 100) / 100,
    tenureDays: tenure?.tenureDays ?? 0,
    tenurePaidDays: tenure?.paidDays ?? 0,
    totalExpensesLive: Math.round(totalExpensesLive * 100) / 100,
    totalLivingExpenses: Math.round(totalLivingExpenses * 100) / 100,
    isTodayWorkday,
    todayScheduleKind: todaySchedule.kind,
    todayHolidayName: todaySchedule.holidayName,
    isWorkingTime,
    isBeforeWork,
    isAfterWork,
    isOvertimeActive,
    overtimeRewardType: ot?.rewardType,
    overtimeHoursToday,
    overtimeHourlyRate,
    overtimeEarnedToday: Math.round(overtimeEarnedToday * 100) / 100,
    overtimeRemainingFormatted,
    isLunchBreak,
  };
}

export interface DebtPayoffView {
  totalDebt: number;
  baseRemainingDebt: number;
  incomeCovered: number;
  savingsCovered: number;
  totalDebtPaid: number;
  totalDebtRemainingLive: number;
  debtPayoffPercent: number;
  incomePercent: number;
  savingsPercent: number;
  yearsToDebtFree: number;
}

export function calculateDebtPayoffView(
  snapshot: TickerSnapshot,
  profile: UserProfile,
  liabilities: Liability[],
  options: { useTotalIncome: boolean; includeSavings: boolean },
  now = new Date()
): DebtPayoffView {
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const activeLiabilities = liabilities.filter(l => {
    if ((l.status ?? 'active') !== 'active') return false;
    if (l.startDate && l.startDate > todayStr) return false;
    return true;
  });

  const totalDebt = activeLiabilities.reduce(
    (acc, curr) => acc + (curr.totalAmount > 0 ? curr.totalAmount : curr.remainingAmount),
    0
  );
  const baseRemainingDebt = activeLiabilities.reduce((acc, curr) => acc + curr.remainingAmount, 0);
  const alreadyRepaidOnLoan = Math.max(0, totalDebt - baseRemainingDebt);

  const todayIncome = options.useTotalIncome
    ? snapshot.earnedToday
    : snapshot.mainLaborEarnedToday;
  const careerIncome = options.useTotalIncome
    ? snapshot.careerMainEarnings + snapshot.careerAdditionalEarnings
    : snapshot.careerMainEarnings;

  const incomeCoveredRaw = Math.max(alreadyRepaidOnLoan + todayIncome, careerIncome);
  const incomeCovered = Math.min(totalDebt, Math.max(0, incomeCoveredRaw));
  const savingsCovered = options.includeSavings
    ? Math.min(Math.max(0, totalDebt - incomeCovered), Math.max(0, profile.currentSavings || 0))
    : 0;

  const totalDebtPaid = Math.min(totalDebt, incomeCovered + savingsCovered);
  const totalDebtRemainingLive = Math.max(0, totalDebt - totalDebtPaid);
  const debtPayoffPercent =
    totalDebt > 0 ? Math.round((totalDebtPaid / totalDebt) * 1000) / 10 : 100;
  const incomePercent =
    totalDebt > 0 ? Math.min(100, Math.round((incomeCovered / totalDebt) * 1000) / 10) : 100;
  const savingsPercent = Math.max(0, Math.round((debtPayoffPercent - incomePercent) * 10) / 10);

  const annualIncome = options.useTotalIncome
    ? snapshot.totalMonthlyIncome * 12
    : profile.monthlySalary * 12;
  const yearsToDebtFree =
    annualIncome > 0 && totalDebtRemainingLive > 0
      ? Math.round((totalDebtRemainingLive / annualIncome) * 10) / 10
      : 0;

  return {
    totalDebt: Math.round(totalDebt * 100) / 100,
    baseRemainingDebt: Math.round(baseRemainingDebt * 100) / 100,
    incomeCovered: Math.round(incomeCovered * 100) / 100,
    savingsCovered: Math.round(savingsCovered * 100) / 100,
    totalDebtPaid: Math.round(totalDebtPaid * 100) / 100,
    totalDebtRemainingLive: Math.round(totalDebtRemainingLive * 100) / 100,
    debtPayoffPercent,
    incomePercent,
    savingsPercent,
    yearsToDebtFree,
  };
}
