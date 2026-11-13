import { UserProfile, Liability, IncomeSource, Transaction } from './types.js';
import {
  calculateDailyDebtCost,
  calculateAdditionalMonthlyIncome,
  calculateTickerSnapshot,
} from './engine.js';

export type TrendGranularity = 'hourly' | 'daily' | 'monthly';

export interface TrendPoint {
  label: string;
  income: number;          // 周期收入 (¥)
  expense: number;         // 周期总支出 (¥，负债 + 账单消费)
  debtCost: number;        // 周期应还负债分母 (¥)
  debtProgress: number;    // 周期负债清偿进度 (0 - 100%)
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
  incomeMode: 'main' | 'total' = 'main'
): TrendPoint[] {
  const now = new Date();
  const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const activeLiabilities = liabilities.filter(l => {
    if ((l.status ?? 'active') !== 'active') return false;
    if (l.startDate && l.startDate > nowStr) return false;
    return true;
  });
  const monthlyDebt = activeLiabilities.reduce((acc, curr) => acc + curr.monthlyPayment, 0);

  const monthlyAdditional = calculateAdditionalMonthlyIncome(incomeSources);
  const monthlySalary = profile.monthlySalary;
  const effectiveMonthlyIncome =
    incomeMode === 'main' ? monthlySalary : monthlySalary + monthlyAdditional;

  const workDays = profile.workDaysPerMonth > 0 ? profile.workDaysPerMonth : 21.75;
  const dailyMainIncome = monthlySalary / workDays;
  const dailyTotalIncome = (monthlySalary + monthlyAdditional) / workDays;
  const effectiveDailyWorkIncome = incomeMode === 'main' ? dailyMainIncome : dailyTotalIncome;

  const dailyDebt = calculateDailyDebtCost(liabilities, workDays, now);

  // Actual recorded living expense from imported transactions
  const txTotalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const liveSnap = calculateTickerSnapshot(profile, liabilities, now, transactions, incomeSources);
  const liveTodayEarned =
    incomeMode === 'main' ? liveSnap.mainLaborEarnedToday : liveSnap.earnedToday;

  // 1. 小时维度：分母 = 今日应还负债 (dailyDebt)，分子 = 截至该小时今日已赚 (主要收入 or 总收入)
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
        incomeSources
      );

      const slotEarned =
        incomeMode === 'main' ? snap.mainLaborEarnedToday : snap.earnedToday;
      const dProgress =
        dailyDebt > 0
          ? Math.round(Math.min(100, (slotEarned / dailyDebt) * 100) * 10) / 10
          : 0;
      const remTodayDebt = Math.max(0, dailyDebt - slotEarned);

      return {
        label: slot.label,
        income: Math.round(slotEarned * 100) / 100,
        expense: Math.round(dailyDebt * 100) / 100,
        debtCost: Math.round(dailyDebt * 100) / 100,
        debtProgress: dProgress,
        savingsProgress: 0,
        remainingDebt: Math.round(remTodayDebt * 100) / 100,
        currentSavings: profile.currentSavings,
      };
    });
  }

  // 2. 天维度：本月 1 号 ~ 今天每日统计（分母 = 当月生效总月供，分子 = 本月 1 号起累计已赚收入）
  if (granularity === 'daily') {
    const points: TrendPoint[] = [];
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    const todayDayOfMonth = now.getDate();
    const dailyTxLiving = txTotalExpense > 0 ? txTotalExpense / 30 : 0;

    let monthCumIncome = 0;

    for (let day = 1; day <= todayDayOfMonth; day++) {
      const d = new Date(currentYear, currentMonthIndex, day);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isTodayPoint = day === todayDayOfMonth;
      const dStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // 当天生效的负债
      const dayActiveLiabilities = liabilities.filter(l => {
        if ((l.status ?? 'active') !== 'active') return false;
        if (l.startDate && l.startDate > dStr) return false;
        return true;
      });
      const dayMonthlyDebt = dayActiveLiabilities.reduce((acc, curr) => acc + curr.monthlyPayment, 0);
      const dayDailyDebt = calculateDailyDebtCost(liabilities, workDays, d);

      const dayIncome = isTodayPoint
        ? liveTodayEarned
        : isWeekend
          ? incomeMode === 'total'
            ? monthlyAdditional / 30
            : 0
          : effectiveDailyWorkIncome;

      monthCumIncome += dayIncome;

      // 日均应还负债恒定（不再随周末归零）
      const dayDebtCost = dayDailyDebt;
      const dayExpense = dayDebtCost + dailyTxLiving;

      // 未到负债起始日或无有效负债时为 0%，避免未计债日期误显 100%
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

  // 计算某一月份生效的负债月供
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

  // 全年各月份负债总和
  let annualDebtTotal = 0;
  for (let m = 1; m <= 12; m++) {
    annualDebtTotal += getMonthlyDebtAtMonth(currentYear, m);
  }

  // 计算当月截至今天已赚
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let workdaysPassedThisMonth = 0;
  for (let d = new Date(currentMonthStart); d < new Date(now.getFullYear(), now.getMonth(), now.getDate()); d = new Date(d.getTime() + 86400000)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      workdaysPassedThisMonth++;
    }
  }
  const earnedThisMonthSoFar =
    workdaysPassedThisMonth * effectiveDailyWorkIncome + liveTodayEarned;

  for (let m = 1; m <= 12; m++) {
    const monthDebt = getMonthlyDebtAtMonth(currentYear, m);
    const monthlyTotalExpense = monthDebt + txTotalExpense;

    // 截至第 m 个月的年内累计已赚收入（过去月份按整月计，当前月按实时累计，未来月份按预计累进）
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
      income: Math.round(effectiveMonthlyIncome),
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
