import { IncomeSource, Liability, Transaction, UserProfile } from './types.js';
import { calculateDailyDebtCost } from './engine.js';
import {
  BUILTIN_CHINA_HOLIDAYS,
  HolidayCalendarMap,
  formatLocalYMD,
  isChinaWorkday,
} from './workday.js';

export interface CategorySpendItem {
  category: string;
  amount: number;
  pct: number;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface BillAnalysisSummary {
  startDate: string;
  endDate: string;
  calendarDays: number;
  workdays: number;
  linkedSalaryIncome: number;
  periodMainIncome: number;
  periodAdditionalIncome: number;
  billIncome: number;
  effectiveTotalIncome: number;
  billExpense: number;
  refundOffsetTotal: number;
  refundCount: number;
  billRepay: number;
  periodDebtCost: number;
  periodNetBalance: number;
  expenseRatioPct: number;
  expenseCount: number;
  incomeCount: number;
  repayCount: number;
  topCategories: CategorySpendItem[];
}

const SELF_TRANSFER_CATEGORY_KEYWORDS = ['零钱提现', '零钱充值', '零钱通', '余额宝'];

export function isSelfTransferCategory(tx: Pick<Transaction, 'category' | 'remark'>): boolean {
  const cat = (tx.category || '').trim();
  const rem = (tx.remark || '').trim();
  if (SELF_TRANSFER_CATEGORY_KEYWORDS.some(k => cat.includes(k))) return true;
  if (cat.includes('信用') && rem.includes('还款')) return true;
  return false;
}

export function isRefundTransaction(tx: Pick<Transaction, 'type' | 'category' | 'remark' | 'isRefundOffset'>): boolean {
  if (tx.isRefundOffset) return true;
  const cat = (tx.category || '').trim();
  const rem = (tx.remark || '').trim();
  return tx.type === 'income' && (cat.includes('退款') || rem.includes('退款'));
}

export function normalizeBillTransaction(tx: Transaction): Transaction {
  const cleanedRemark = tx.remark
    ? tx.remark.replace(/\s*-\s*\/$/, '').replace(/^\/\s*$/, '').trim()
    : '';
  const tradeTime = normalizeTradeTime(tx.tradeTime);

  if (tx.userOverrideType) {
    return {
      ...tx,
      tradeTime,
      remark: cleanedRemark || undefined,
    };
  }

  if (isSelfTransferCategory({ category: tx.category, remark: cleanedRemark })) {
    return {
      ...tx,
      tradeTime,
      remark: cleanedRemark || undefined,
      originalType: tx.originalType ?? tx.type,
      type: 'repay',
      isRefundOffset: false,
    };
  }

  if (isRefundTransaction({ ...tx, remark: cleanedRemark })) {
    return {
      ...tx,
      tradeTime,
      remark: cleanedRemark || undefined,
      type: 'income',
      isRefundOffset: true,
    };
  }

  return {
    ...tx,
    tradeTime,
    remark: cleanedRemark || undefined,
    isRefundOffset: false,
  };
}

export function normalizeTradeTime(raw: unknown): string {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    const baseUtc = raw >= 60 ? Date.UTC(1899, 11, 30) : Date.UTC(1899, 11, 31);
    const d = new Date(baseUtc + Math.round(raw * 86400) * 1000);
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const mo = String(raw.getMonth() + 1).padStart(2, '0');
    const da = String(raw.getDate()).padStart(2, '0');
    const h = String(raw.getHours()).padStart(2, '0');
    const mi = String(raw.getMinutes()).padStart(2, '0');
    const s = String(raw.getSeconds()).padStart(2, '0');
    return `${y}-${mo}-${da} ${h}:${mi}:${s}`;
  }
  const str = String(raw ?? '').trim();
  if (/^\d{4,6}(\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (Number.isFinite(num) && num > 0) {
      const baseUtc = num >= 60 ? Date.UTC(1899, 11, 30) : Date.UTC(1899, 11, 31);
      const d = new Date(baseUtc + Math.round(num * 86400) * 1000);
      return d.toISOString().slice(0, 19).replace('T', ' ');
    }
  }
  return str;
}

export function extractTxDateKey(tradeTime: string): string | null {
  const normalized = normalizeTradeTime(tradeTime);
  const m = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!m) return null;
  const y = m[1];
  const mo = m[2].padStart(2, '0');
  const d = m[3].padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

export function extractTxHourFloat(tradeTime: string): number | null {
  const normalized = normalizeTradeTime(tradeTime);
  const m = normalized.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3] || 0);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h + min / 60 + sec / 3600;
}

function parseDateLocal(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function filterTransactionsByDateRange(
  transactions: Transaction[],
  range?: DateRangeFilter
): Transaction[] {
  if (!range?.startDate && !range?.endDate) return transactions;
  const start = range.startDate && range.endDate && range.startDate > range.endDate
    ? range.endDate
    : range.startDate;
  const end = range.startDate && range.endDate && range.startDate > range.endDate
    ? range.startDate
    : range.endDate;

  return transactions.filter(tx => {
    const key = extractTxDateKey(tx.tradeTime);
    if (!key) return false;
    if (start && key < start) return false;
    if (end && key > end) return false;
    return true;
  });
}

export function analyzeBillsWithIncome(
  transactions: Transaction[],
  profile: UserProfile,
  liabilities: Liability[] = [],
  incomeSources: IncomeSource[] = [],
  incomeMode: 'main' | 'total' = 'main',
  now: Date = new Date(),
  dateRange?: DateRangeFilter,
  holidayCalendar: HolidayCalendarMap = BUILTIN_CHINA_HOLIDAYS
): BillAnalysisSummary {
  const normalizedTxs = transactions.map(normalizeBillTransaction);
  const filteredTxs = filterTransactionsByDateRange(normalizedTxs, dateRange);
  const dateKeys = filteredTxs
    .map(t => extractTxDateKey(t.tradeTime))
    .filter((k): k is string => Boolean(k))
    .sort();

  const fallbackKey = formatLocalYMD(now);
  const rawStart = dateRange?.startDate || dateKeys[0] || fallbackKey;
  const rawEnd = dateRange?.endDate || dateKeys[dateKeys.length - 1] || fallbackKey;
  const [startDate, endDate] = rawStart <= rawEnd ? [rawStart, rawEnd] : [rawEnd, rawStart];

  const workDaysPerMonth = profile.workDaysPerMonth > 0 ? profile.workDaysPerMonth : 21.75;
  const startObj = parseDateLocal(startDate);
  const endObj = parseDateLocal(endDate);
  let calendarDays = 0;
  let workdays = 0;
  let periodDebtCostRaw = 0;
  for (let d = new Date(startObj); d <= endObj; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    calendarDays++;
    if (isChinaWorkday(d, holidayCalendar)) {
      workdays++;
      periodDebtCostRaw += calculateDailyDebtCost(liabilities, workDaysPerMonth, d, holidayCalendar);
    }
  }
  calendarDays = Math.max(1, calendarDays);

  const dailyWorkIncome = profile.monthlySalary / workDaysPerMonth;
  const periodMainIncome = Math.round(workdays * dailyWorkIncome * 100) / 100;

  let scheduledMonthly = 0;
  let passiveMonthly = 0;
  for (const s of incomeSources) {
    if ((s.status ?? 'active') !== 'active' || (s.mode ?? 'streaming') !== 'streaming') continue;
    const monthly = s.frequency === 'annual' ? (s.amount || 0) / 12 : (s.amount || 0);
    const isScheduled = s.type === 'partner' || Boolean(s.workStartTime && s.workEndTime);
    if (isScheduled) scheduledMonthly += monthly;
    else passiveMonthly += monthly;
  }
  const periodAdditionalIncome =
    Math.round(
      ((scheduledMonthly / workDaysPerMonth) * workdays + (passiveMonthly / 30) * calendarDays) *
        100
    ) / 100;
  const linkedSalaryIncome =
    incomeMode === 'main'
      ? periodMainIncome
      : Math.round((periodMainIncome + periodAdditionalIncome) * 100) / 100;

  let rawBillExpense = 0;
  let refundOffsetTotal = 0;
  let refundCount = 0;
  let billIncome = 0;
  let billRepay = 0;
  let expenseCount = 0;
  let incomeCount = 0;
  let repayCount = 0;
  const categoryTotals = new Map<string, number>();
  const expenseRemarkCat = new Map<string, string>();
  const refundItems: Transaction[] = [];

  for (const tx of filteredTxs) {
    if (tx.type === 'expense' && !tx.isRefundOffset) {
      rawBillExpense += tx.amount;
      expenseCount++;
      const cat = tx.category || '其他';
      categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + tx.amount);
      if (tx.remark) {
        expenseRemarkCat.set(tx.remark, cat);
      }
    } else if (tx.isRefundOffset) {
      refundOffsetTotal += tx.amount;
      refundCount++;
      refundItems.push(tx);
    } else if (tx.type === 'income') {
      billIncome += tx.amount;
      incomeCount++;
    } else if (tx.type === 'repay') {
      billRepay += tx.amount;
      repayCount++;
    }
  }

  for (const ref of refundItems) {
    const strippedCat = (ref.category || '').replace(/-?退款$/, '').trim();
    let targetCat: string | undefined;
    if (strippedCat && categoryTotals.has(strippedCat)) {
      targetCat = strippedCat;
    } else if (strippedCat) {
      for (const [rem, cat] of expenseRemarkCat.entries()) {
        if (rem.includes(strippedCat) || strippedCat.includes(rem)) {
          targetCat = cat;
          break;
        }
      }
    }
    if (targetCat) {
      const nextVal = Math.max(0, (categoryTotals.get(targetCat) ?? 0) - ref.amount);
      if (nextVal <= 0.001) categoryTotals.delete(targetCat);
      else categoryTotals.set(targetCat, nextVal);
    }
  }

  const billExpense = Math.max(0, Math.round((rawBillExpense - refundOffsetTotal) * 100) / 100);
  refundOffsetTotal = Math.round(refundOffsetTotal * 100) / 100;
  billIncome = Math.round(billIncome * 100) / 100;
  billRepay = Math.round(billRepay * 100) / 100;

  const periodDebtCost = Math.round(periodDebtCostRaw * 100) / 100;

  const effectiveTotalIncome = Math.round((linkedSalaryIncome + billIncome) * 100) / 100;
  const periodNetBalance =
    Math.round((effectiveTotalIncome - billExpense - periodDebtCost) * 100) / 100;
  const expenseRatioPct =
    effectiveTotalIncome > 0
      ? Math.round((billExpense / effectiveTotalIncome) * 1000) / 10
      : 0;

  const topCategories: CategorySpendItem[] = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, amt]) => ({
      category,
      amount: Math.round(amt * 100) / 100,
      pct: billExpense > 0 ? Math.round((amt / billExpense) * 1000) / 10 : 0,
    }));

  return {
    startDate,
    endDate,
    calendarDays,
    workdays,
    linkedSalaryIncome,
    periodMainIncome,
    periodAdditionalIncome,
    billIncome,
    effectiveTotalIncome,
    billExpense,
    refundOffsetTotal,
    refundCount,
    billRepay,
    periodDebtCost,
    periodNetBalance,
    expenseRatioPct,
    expenseCount,
    incomeCount,
    repayCount,
    topCategories,
  };
}
