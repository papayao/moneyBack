import { UserProfile, Liability, IncomeSource, Transaction } from './types.js';
import {
  calculateDailyDebtCost,
  calculateAdditionalMonthlyIncome,
  calculateTickerSnapshot,
} from './engine.js';
import {
  extractTxDateKey,
  extractTxHourFloat,
  normalizeBillTransaction,
} from './billAnalysis.js';
import {
  BUILTIN_CHINA_HOLIDAYS,
  HolidayCalendarMap,
  formatLocalYMD,
  isChinaWorkday,
} from './workday.js';

export type TrendGranularity = 'hourly' | 'daily' | 'monthly';

export interface TrendPoint {
  label: string;
  income: number;          // 周期收入 (¥)
  expense: number;         // 周期总支出 (¥，负债 + 账单消费)
  debtCost: number;        // 周期应还负债分母 (¥)
  debtProgress: number;    // 周期月供覆盖率 (0 - 100%)
  savingsProgress: number; // 存钱达成进度 (保留字段兼容)
  remainingDebt: number;   // 周期剩余待平负债 (¥)
  currentSavings: number;  // 当前存款结余 (¥)
}

export function generateTrendData(
  granularity: TrendGranularity,
  profile: UserProfile,
  liabilities: Liability[],
  incomeSources: IncomeSource[] = [],
  transactions: Transaction[] = [],
  incomeMode: 'main' | 'total' = 'main',
  holidayCalendar: HolidayCalendarMap = BUILTIN_CHINA_HOLIDAYS,
  now: Date = new Date()
): TrendPoint[] {
  const nowStr = formatLocalYMD(now);

  const monthlyAdditional = calculateAdditionalMonthlyIncome(incomeSources);
  const monthlySalary = profile.monthlySalary;
  const effectiveMonthlyIncome =
    incomeMode === 'main' ? monthlySalary : monthlySalary + monthlyAdditional;

  const workDays = profile.workDaysPerMonth > 0 ? profile.workDaysPerMonth : 21.75;

  // 拆开工薪类流式额外收入(仅工作日) vs 24/7 被动收入(自然日) vs 一次性奖金(按日期)
  let scheduledAdditionalMonthly = 0;
  let passiveAdditionalMonthly = 0;
  for (const s of incomeSources) {
    if ((s.status ?? 'active') !== 'active' || (s.mode ?? 'streaming') !== 'streaming') continue;
    const monthly = s.frequency === 'annual' ? (s.amount || 0) / 12 : (s.amount || 0);
    const isScheduled = s.type === 'partner' || Boolean(s.workStartTime && s.workEndTime);
    if (isScheduled) scheduledAdditionalMonthly += monthly;
    else passiveAdditionalMonthly += monthly;
  }

  const oneTimeByDate = new Map<string, number>();
  const oneTimeByMonth = new Map<string, number>();
  for (const s of incomeSources) {
    if (s.mode !== 'one_time' || !s.receivedDate) continue;
    oneTimeByDate.set(s.receivedDate, (oneTimeByDate.get(s.receivedDate) ?? 0) + (s.amount || 0));
    const mKey = s.receivedDate.slice(0, 7);
    oneTimeByMonth.set(mKey, (oneTimeByMonth.get(mKey) ?? 0) + (s.amount || 0));
  }

  const dailyMainIncome = monthlySalary / workDays;
  const dailyScheduledAdditional = scheduledAdditionalMonthly / workDays;
  const dailyPassiveAdditional = passiveAdditionalMonthly / 30;

  const dailyDebt = calculateDailyDebtCost(liabilities, workDays, now, holidayCalendar);

  // 按真实交易日期与月份聚合导入账单的日常消费（自转不计支出、退款自动冲销）
  const txExpenseByDay = new Map<string, number>();
  const txExpenseByMonth = new Map<string, number>();
  const todayExpenseTxs: Array<{ hour: number; amount: number }> = [];

  for (const rawTx of transactions) {
    const tx = normalizeBillTransaction(rawTx);
    const isExp = tx.type === 'expense' && !tx.isRefundOffset;
    const isRef = Boolean(tx.isRefundOffset);
    if (!isExp && !isRef) continue;
    const dateKey = extractTxDateKey(tx.tradeTime);
    if (!dateKey) continue;
    const delta = isExp ? tx.amount : -tx.amount;
    txExpenseByDay.set(dateKey, Math.max(0, (txExpenseByDay.get(dateKey) ?? 0) + delta));
    const monthKey = dateKey.slice(0, 7);
    txExpenseByMonth.set(monthKey, Math.max(0, (txExpenseByMonth.get(monthKey) ?? 0) + delta));
    if (dateKey === nowStr) {
      const hour = extractTxHourFloat(tx.tradeTime) ?? 12;
      todayExpenseTxs.push({ hour, amount: delta });
    }
  }

  const liveSnap = calculateTickerSnapshot(
    profile,
    liabilities,
    now,
    transactions,
    incomeSources,
    holidayCalendar
  );
  const liveTodayEarned =
    incomeMode === 'main' ? liveSnap.mainLaborEarnedToday : liveSnap.earnedToday;

  // 1. 小时维度：分母 = 今日应还负债 (dailyDebt，休息日为 0)，分子 = 截至该小时今日已赚
  if (granularity === 'hourly') {
    const timeSlots = [
      { h: 9, m: 0, label: '09:00' },
      { h: 10, m: 30, label: '10:30' },
      { h: 12, m: 0, label: '12:00' },
      { h: 13, m: 30, label: '13:30' },
      { h: 15, m: 0, label: '15:00' },
      { h: 16, m: 30, label: '16:30' },
      { h: 18, m: 0, label: '18:00' },
      { h: 20, m: 0, label: '20:00' },
    ];

    return timeSlots.map(slot => {
      const pointDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        slot.h,
        slot.m,
        0
      );
      const snap = calculateTickerSnapshot(
        profile,
        liabilities,
        pointDate,
        transactions,
        incomeSources,
        holidayCalendar
      );

      const slotEarned =
        incomeMode === 'main' ? snap.mainLaborEarnedToday : snap.earnedToday;
      const slotHour = slot.h + slot.m / 60;
      const todayBillSpentUpToSlot = Math.max(
        0,
        todayExpenseTxs
          .filter(t => t.hour <= slotHour)
          .reduce((sum, t) => sum + t.amount, 0)
      );
      const dProgress =
        dailyDebt > 0
          ? Math.round(Math.min(100, (slotEarned / dailyDebt) * 100) * 10) / 10
          : 0;
      const remTodayDebt = Math.max(0, dailyDebt - slotEarned);

      return {
        label: slot.label,
        income: Math.round(slotEarned * 100) / 100,
        expense: Math.round((dailyDebt + todayBillSpentUpToSlot) * 100) / 100,
        debtCost: Math.round(dailyDebt * 100) / 100,
        debtProgress: dProgress,
        savingsProgress: 0,
        remainingDebt: Math.round(remTodayDebt * 100) / 100,
        currentSavings: profile.currentSavings,
      };
    });
  }

  // 2. 天维度：本月 1 号 ~ 今天每日统计（工作日才扣当日负债与工薪；休息日 24/7 被动独立计算，不重复摊销）
  if (granularity === 'daily') {
    const points: TrendPoint[] = [];
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    const todayDayOfMonth = now.getDate();

    let monthCumIncome = 0;

    for (let day = 1; day <= todayDayOfMonth; day++) {
      const d = new Date(currentYear, currentMonthIndex, day);
      const dayIsWorkday = isChinaWorkday(d, holidayCalendar);
      const isTodayPoint = day === todayDayOfMonth;
      const dStr = formatLocalYMD(d);

      const dayActiveLiabilities = liabilities.filter(l => {
        if ((l.status ?? 'active') !== 'active') return false;
        if (l.startDate && l.startDate > dStr) return false;
        return true;
      });
      const dayMonthlyDebt = dayActiveLiabilities.reduce((acc, curr) => acc + curr.monthlyPayment, 0);
      const dayDailyDebt = calculateDailyDebtCost(liabilities, workDays, d, holidayCalendar);

      let dayIncome = 0;
      if (isTodayPoint) {
        dayIncome = liveTodayEarned;
      } else if (incomeMode === 'main') {
        dayIncome = dayIsWorkday ? dailyMainIncome : 0;
      } else {
        const workPart = dayIsWorkday ? dailyMainIncome + dailyScheduledAdditional : 0;
        const oneTimePart = oneTimeByDate.get(dStr) ?? 0;
        dayIncome = workPart + dailyPassiveAdditional + oneTimePart;
      }

      monthCumIncome += dayIncome;

      const dayDebtCost = dayDailyDebt;
      const dayTxExpense = txExpenseByDay.get(dStr) ?? 0;
      const dayExpense = dayDebtCost + dayTxExpense;

      const dProgress =
        dayMonthlyDebt > 0
          ? Math.round(Math.min(100, (monthCumIncome / dayMonthlyDebt) * 100) * 10) / 10
          : 0;
      const remMonthDebt = Math.max(0, dayMonthlyDebt - monthCumIncome);

      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');

      points.push({
        label: `${month}-${date}`,
        income: Math.round(dayIncome * 100) / 100,
        expense: Math.round(dayExpense * 100) / 100,
        debtCost: Math.round(dayDebtCost * 100) / 100,
        debtProgress: dProgress,
        savingsProgress: 0,
        remainingDebt: Math.round(remMonthDebt * 100) / 100,
        currentSavings: profile.currentSavings,
      });
    }

    return points;
  }

  // 3. 月维度：分母 = 全年各月应还总负债，分子 = 截至该月年内累计已赚收入
  const points: TrendPoint[] = [];
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const getMonthlyDebtAtMonth = (year: number, month: number): number => {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    return liabilities
      .filter(l => {
        if ((l.status ?? 'active') !== 'active') return false;
        if (l.startDate && l.startDate.slice(0, 7) > monthStr) return false;
        return true;
      })
      .reduce((sum, l) => sum + l.monthlyPayment, 0);
  };

  let annualDebtTotal = 0;
  for (let m = 1; m <= 12; m++) {
    annualDebtTotal += getMonthlyDebtAtMonth(currentYear, m);
  }

  let workdaysPassedThisMonth = 0;
  let calendarDaysPassedThisMonth = 0;
  for (let day = 1; day < now.getDate(); day++) {
    const d = new Date(currentYear, now.getMonth(), day);
    calendarDaysPassedThisMonth++;
    if (isChinaWorkday(d, holidayCalendar)) {
      workdaysPassedThisMonth++;
    }
  }
  const pastWorkThisMonth =
    incomeMode === 'main'
      ? workdaysPassedThisMonth * dailyMainIncome
      : workdaysPassedThisMonth * (dailyMainIncome + dailyScheduledAdditional) +
        calendarDaysPassedThisMonth * dailyPassiveAdditional;
  const earnedThisMonthSoFar = pastWorkThisMonth + liveTodayEarned;

  for (let m = 1; m <= 12; m++) {
    const monthDebt = getMonthlyDebtAtMonth(currentYear, m);
    const monthKey = `${currentYear}-${String(m).padStart(2, '0')}`;
    const monthTxExpense = txExpenseByMonth.get(monthKey) ?? 0;
    const monthlyTotalExpense = monthDebt + monthTxExpense;
    const monthBonus = incomeMode === 'total' ? (oneTimeByMonth.get(monthKey) ?? 0) : 0;

    let cumYearIncome = 0;
    if (m < currentMonth) {
      cumYearIncome = m * effectiveMonthlyIncome;
    } else if (m === currentMonth) {
      cumYearIncome = (m - 1) * effectiveMonthlyIncome + earnedThisMonthSoFar;
    } else {
      cumYearIncome = m * effectiveMonthlyIncome;
    }

    const dProgress =
      annualDebtTotal > 0
        ? Math.round(Math.min(100, (cumYearIncome / annualDebtTotal) * 100) * 10) / 10
        : 0;
    const remAnnualDebt = Math.max(0, annualDebtTotal - cumYearIncome);

    points.push({
      label: `${m}月`,
      income: Math.round(effectiveMonthlyIncome + monthBonus),
      expense: Math.round(monthlyTotalExpense),
      debtCost: Math.round(monthDebt),
      debtProgress: dProgress,
      savingsProgress: 0,
      remainingDebt: Math.round(remAnnualDebt),
      currentSavings: profile.currentSavings,
    });
  }

  return points;
}
