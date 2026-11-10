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

export interface IncomeSource {
  id?: number;
  title: string;
  type: 'partner' | 'rent' | 'interest' | 'bonus' | 'windfall' | 'side_hustle' | 'custom';
  amount: number;
  mode?: 'streaming' | 'one_time'; // 'streaming' (按秒/持续) | 'one_time' (一次性到账/年终奖)，默认 streaming
  frequency?: 'monthly' | 'annual' | 'once';
  isAmortized?: boolean; // 若为一次性奖金，是否选择平摊进时钟每秒
  status?: 'active' | 'received';
  receivedDate?: string;
}

export interface StreamingIncomeItem {
  id: number;
  title: string;
  type: string;
  amount: number;
  frequency: string;
  ratePerSecond: number; // 元/秒
  ratePerHour: number;   // 元/小时
  todayEarned: number;   // 今日累计赚取 (元)
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
  // Custom Income Sources (多元收入: 配偶/房租/利息/副业)
  additionalIncomeMonthly: number;
  additionalIncomeToday: number;
  totalIncomePerSecond: number;
  totalMonthlyIncome: number;
  streamingIncomeItems: StreamingIncomeItem[];
  oneTimeIncomes: IncomeSource[];
  // Lifetime totals
  totalLaborEarningsLive: number;
  totalExpensesLive: number; // 生活消费 + 负债支出
  totalLivingExpenses: number;
  isWorkingTime: boolean;
  isLunchBreak: boolean;
}
