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
  isWorkingTime: boolean;
  isLunchBreak: boolean;
}
