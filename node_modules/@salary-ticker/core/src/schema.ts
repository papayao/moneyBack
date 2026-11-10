import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const userProfiles = sqliteTable('user_profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monthlySalary: real('monthly_salary').notNull(),
  workDaysPerMonth: real('work_days_per_month').default(21.75).notNull(),
  workStartTime: text('work_start_time').default('09:00').notNull(),
  workEndTime: text('work_end_time').default('18:00').notNull(),
  lunchStartTime: text('lunch_start_time').default('12:00').notNull(),
  lunchEndTime: text('lunch_end_time').default('13:30').notNull(),
  targetSavings: real('target_savings').default(0).notNull(),
  currentSavings: real('current_savings').default(0).notNull(),
});

export const liabilities = sqliteTable('liabilities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // 'mortgage' | 'car_loan' | 'credit_card' | 'custom'
  title: text('title').notNull(),
  totalAmount: real('total_amount').notNull(),
  remainingAmount: real('remaining_amount').notNull(),
  monthlyPayment: real('monthly_payment').notNull(),
  repayDay: integer('repay_day').notNull(),
  status: text('status').default('active').notNull(),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source').notNull(), // 'wechat' | 'alipay' | 'manual'
  type: text('type').notNull(), // 'expense' | 'income' | 'repay'
  category: text('category').default('其他').notNull(),
  amount: real('amount').notNull(),
  tradeTime: text('trade_time').notNull(),
  remark: text('remark'),
  isDebtPayment: integer('is_debt_payment').default(0).notNull(),
});
