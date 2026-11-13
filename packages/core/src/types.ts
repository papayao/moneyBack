export interface OvertimeRecord {
  date: string;       // "YYYY-MM-DD" 仅限当日有效，次日自动清零恢复默认作息
  hours: number;      // 申请通过的加班时长（小时）
  rewardType: 'paid' | 'comp_leave'; // 'paid': 有加班费 | 'comp_leave': 有调休
  startSec?: number;  // 当日开始加班时刻（自 00:00 起的秒数）
}

export interface UserProfile {
  id?: number;
  monthlySalary: number;
  workDaysPerMonth: number;
  workStartTime: string; // "09:00"
  workEndTime: string;   // "18:00"
  lunchStartTime?: string;// 已废弃 (取消午休)
  lunchEndTime?: string;  // 已废弃 (取消午休)
  targetSavings: number;
  currentSavings: number;
  baseLaborEarnings?: number; // 历史累计劳动所得基准值 (默认 500,000，未设置入职日期时使用)
  hireDate?: string; // 当前公司入职日期 "YYYY-MM-DD"；设置后总所得按入职以来计薪天数自动计算
  currentCompany?: string; // 当前公司名称
  pastJobs?: PastJob[]; // 过往任职记录，按各自月薪计入总所得
  baseLivingExpense?: number; // 历史累计生活开销基准值
  todayOvertime?: OvertimeRecord; // 今日加班记录（仅当日生效）
}

export interface PastJob {
  id: number;
  company: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;   // "YYYY-MM-DD" 离职日（含当天）
  monthlySalary: number;
}

export interface Liability {
  id?: number;
  type: 'mortgage' | 'car_loan' | 'credit_card' | 'custom';
  title: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  repayDay: number;
  startDate?: string; // 负债起始日期 "YYYY-MM-DD"
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
  workDaysPerMonth?: number; // 工作天数 (未填时间时默认 30 天)
  workStartTime?: string;    // 上班时间 (例如 "09:00"，未填默认全天候 24h)
  workEndTime?: string;      // 下班时间 (例如 "18:00"，未填默认全天候 24h)
  status?: 'active' | 'received';
  receivedDate?: string;
}

export interface StreamingIncomeItem {
  id: number;
  title: string;
  type: string;
  amount: number;
  frequency: string;
  is24x7: boolean;       // 是否 24/7 自然日持续进账 (未填时间时为 true，30天全天候)
  ratePerSecond: number; // 元/秒
  ratePerHour: number;   // 元/小时
  todayEarned: number;   // 今日累计赚取 (元)
  workDaysPerMonth?: number;
  workStartTime?: string;
  workEndTime?: string;
  isCurrentlyActive?: boolean; // 当前此刻是否正在计费进账中
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
  // Main labor earnings (工作日工薪独立核算)
  mainLaborEarnedToday: number;
  salaryPerHour: number;
  // Custom Income Sources (多元收入: 配偶/房租/利息/副业)
  additionalIncomeMonthly: number;
  additionalIncomeToday: number;
  totalIncomePerSecond: number;
  totalMonthlyIncome: number;
  streamingIncomeItems: StreamingIncomeItem[];
  oneTimeIncomes: IncomeSource[];
  // Lifetime totals
  totalLaborEarningsLive: number;
  tenureDays: number;     // 入职以来自然日数（含今天），未设置入职日期为 0
  tenurePaidDays: number; // 入职以来计薪天数（周一至周五，含今天）
  totalExpensesLive: number; // 生活消费 + 负债支出
  totalLivingExpenses: number;
  isWorkingTime: boolean;
  isBeforeWork: boolean;
  isAfterWork: boolean;
  isOvertimeActive: boolean;
  overtimeRewardType?: 'paid' | 'comp_leave';
  overtimeHoursToday: number;
  overtimeEarnedToday: number;
  overtimeRemainingFormatted?: string;
  isLunchBreak: boolean;
}
