import { UserProfile, Liability, IncomeSource, Transaction } from './types.js';
import {
  calculateDailyWorkingSeconds,
  calculateSalaryPerSecond,
  calculateDailyDebtCost,
  calculateAdditionalMonthlyIncome,
  calculateTickerSnapshot,
} from './engine.js';

export type TrendGranularity = 'hourly' | 'daily' | 'monthly';

export interface TrendPoint {
  label: string;
  income: number;          // 累计收入 (¥)
  expense: number;         // 累计支出 (¥，含负债均摊/生活)
  debtProgress: number;    // 负债清偿进度 (0 - 100%)
  savingsProgress: number; // 存钱达成进度 (0 - 100%)
  remainingDebt: number;   // 剩余待还负债 (¥)
  currentSavings: number;  // 当前存款结余 (¥)
}

export function generateTrendData(
  granularity: TrendGranularity,
  profile: UserProfile,
  liabilities: Liability[],
  incomeSources: IncomeSource[] = [],
  transactions: Transaction[] = []
): TrendPoint[] {
  const activeLiabilities = liabilities.filter(l => (l.status ?? 'active') === 'active');
  const totalDebt = activeLiabilities.reduce(
    (acc, curr) => acc + (curr.totalAmount > 0 ? curr.totalAmount : curr.remainingAmount),
    0
  );
  const baseRemainingDebt = activeLiabilities.reduce((acc, curr) => acc + curr.remainingAmount, 0);
  const monthlyAdditional = calculateAdditionalMonthlyIncome(incomeSources);
  const monthlySalary = profile.monthlySalary;
  const totalMonthlyIncome = monthlySalary + monthlyAdditional;
  const workDays = profile.workDaysPerMonth > 0 ? profile.workDaysPerMonth : 21.75;
  const dailyWorkIncome = totalMonthlyIncome / workDays;
  const dailyDebt = calculateDailyDebtCost(liabilities, workDays);

  if (granularity === 'hourly') {
    // 8 points: 09:00, 10:30, 12:00, 13:30, 15:00, 16:30, 18:00, 20:00
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

    const today = new Date();
    return timeSlots.map(slot => {
      const pointDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        slot.h,
        slot.m,
        0
      );
      const snap = calculateTickerSnapshot(profile, liabilities, pointDate, transactions, incomeSources);

      // Hourly expense fraction
      const workedFraction = Math.min(1, snap.hoursWorkedToday / 8);
      const hourlyExpense = dailyDebt * workedFraction;

      return {
        label: slot.label,
        income: Math.round(snap.earnedToday * 100) / 100,
        expense: Math.round(hourlyExpense * 100) / 100,
        debtProgress: snap.debtPayoffPercent,
        savingsProgress:
          profile.targetSavings > 0
            ? Math.round(Math.min(100, (profile.currentSavings / profile.targetSavings) * 100) * 10) / 10
            : 0,
        remainingDebt: snap.totalDebtRemainingLive,
        currentSavings: profile.currentSavings,
      };
    });
  }

  if (granularity === 'daily') {
    // 14 days historical trend simulation
    const points: TrendPoint[] = [];
    const daysCount = 14;
    const now = new Date();

    // Baseline 14 days ago
    let accumulatedSavings = Math.max(0, profile.currentSavings - dailyWorkIncome * 10);
    let runningDebt = baseRemainingDebt + dailyDebt * 10;

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dayIncome = isWeekend ? (monthlyAdditional / 30) : dailyWorkIncome;
      const dayExpense = dailyDebt + (dayIncome * 0.4); // 40% typical living expense

      accumulatedSavings += Math.max(0, dayIncome - dayExpense);
      runningDebt = Math.max(0, runningDebt - dailyDebt);

      const dProgress = totalDebt > 0
        ? Math.round(Math.min(100, ((totalDebt - runningDebt) / totalDebt) * 100) * 10) / 10
        : 100;

      const sProgress = profile.targetSavings > 0
        ? Math.round(Math.min(100, (accumulatedSavings / profile.targetSavings) * 100) * 10) / 10
        : 0;

      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');

      points.push({
        label: `${month}-${date}`,
        income: Math.round(dayIncome * 100) / 100,
        expense: Math.round(dayExpense * 100) / 100,
        debtProgress: dProgress,
        savingsProgress: sProgress,
        remainingDebt: Math.round(runningDebt),
        currentSavings: Math.round(accumulatedSavings),
      });
    }

    // Force the last point to match current live reality
    if (points.length > 0) {
      const last = points[points.length - 1];
      last.remainingDebt = baseRemainingDebt;
      last.currentSavings = profile.currentSavings;
      last.debtProgress = totalDebt > 0 ? Math.round(((totalDebt - baseRemainingDebt) / totalDebt) * 1000) / 10 : 100;
      last.savingsProgress = profile.targetSavings > 0
        ? Math.round(Math.min(100, (profile.currentSavings / profile.targetSavings) * 100) * 10) / 10
        : 0;
    }

    return points;
  }

  // Monthly: 12 months progression
  const points: TrendPoint[] = [];
  const monthlyLivingExpense = Math.max(0, totalMonthlyIncome * 0.45);
  const monthlyTotalExpense = monthlyLivingExpense + (dailyDebt * workDays);

  let simSavings = Math.max(0, profile.currentSavings - (totalMonthlyIncome - monthlyTotalExpense) * 6);
  let simDebt = Math.min(totalDebt, baseRemainingDebt + (dailyDebt * workDays) * 6);

  for (let m = 1; m <= 12; m++) {
    const netSave = Math.max(0, totalMonthlyIncome - monthlyTotalExpense);
    simSavings += netSave;
    simDebt = Math.max(0, simDebt - (dailyDebt * workDays));

    const dProgress = totalDebt > 0
      ? Math.round(Math.min(100, ((totalDebt - simDebt) / totalDebt) * 100) * 10) / 10
      : 100;

    const sProgress = profile.targetSavings > 0
      ? Math.round(Math.min(100, (simSavings / profile.targetSavings) * 100) * 10) / 10
      : 0;

    points.push({
      label: `${m}月`,
      income: Math.round(totalMonthlyIncome),
      expense: Math.round(monthlyTotalExpense),
      debtProgress: dProgress,
      savingsProgress: sProgress,
      remainingDebt: Math.round(simDebt),
      currentSavings: Math.round(simSavings),
    });
  }

  return points;
}
