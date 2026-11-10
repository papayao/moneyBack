export interface UserProfile {
  id?: number;
  monthlySalary: number;
  workDaysPerMonth: number;
  workStartTime: string; // "09:00"
  workEndTime: string;   // "18:00"
  lunchStartTime: string;// "12:00"
  lunchEndTime: string;  // "13:30"
  targetSavings: number;
  currentSavings: number;
  baseLaborEarnings?: number; // 历史累计劳动所得基准值 (默认 500,000)
  baseLivingExpense?: number; // 历史累计生活开销基准值
}

export interface Liability {
  id?: number;
  type: 'mortgage' | 'car_loan' | 'credit_card' | 'custom';
  title: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  repayDay: number;
  status?: 'active' | 'finished';
}

export interface Transaction {
  id?: number;
  source: 'wechat' | 'alipay' | 'manual';
  type: 'expense' | 'income' | 'repay';
  category: string;
  amount: number;
  tradeTime: string;
  remark?: string;
  isDebtPayment?: boolean;
}

export interface TickerSnapshot {
  earnedToday: number;
  dailyDebtCost: number;
  netToday: number; // earnedToday - dailyDebtCost (can be negative at start)
  isNetPositive: boolean;
  salaryPerSecond: number;
  hoursWorkedToday: number;
  hoursRemainingToSavingsTarget: number;
  remainingTimeFormatted: string; // e.g. "530 小时 12 分钟"
  // Debt payoff progression
  totalDebt: number;
  totalDebtRemainingLive: number;
  totalDebtPaid: number;
  debtPayoffPercent: number;
  todayDebtRemainingLive: number;
  hoursToDebtFree: number;
  yearsToDebtFree: number;
  // Lifetime totals
  totalLaborEarningsLive: number;
  totalExpensesLive: number; // 生活消费 + 负债支出
  totalLivingExpenses: number;
  isWorkingTime: boolean;
  isLunchBreak: boolean;
}
