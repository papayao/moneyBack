import { describe, it, expect } from 'vitest';
import {
  analyzeBillsWithIncome,
  generateTrendData,
  Liability,
  Transaction,
  UserProfile,
} from '../src/index.js';

describe('Bill & Income Linkage', () => {
  const profile: UserProfile = {
    monthlySalary: 21750,
    workDaysPerMonth: 21.75,
    workStartTime: '09:00',
    workEndTime: '18:00',
    targetSavings: 100000,
    currentSavings: 35000,
  };

  const liabilities: Liability[] = [
    {
      id: 1,
      type: 'mortgage',
      title: '房贷',
      totalAmount: 1000000,
      remainingAmount: 800000,
      monthlyPayment: 3000,
      repayDay: 15,
      status: 'active',
      startDate: '2023-01-01',
    },
  ];

  it('links bill period expenses with main salary income accurately', () => {
    // 2026-11-02 (Mon) to 2026-11-06 (Fri) => 5 workdays => 5 * 1000 = 5000 main income
    const txs: Transaction[] = [
      {
        source: 'alipay',
        type: 'expense',
        category: '餐饮美食',
        amount: 200,
        tradeTime: '2026-11-02 12:30:00',
        remark: '午饭',
      },
      {
        source: 'alipay',
        type: 'expense',
        category: '交通出行',
        amount: 50,
        tradeTime: '2026-11-06 08:30:00',
        remark: '地铁',
      },
      {
        source: 'alipay',
        type: 'repay',
        category: '信用借还',
        amount: 900,
        tradeTime: '2026-11-04 10:00:00',
        remark: '花呗还款',
      },
    ];

    const summary = analyzeBillsWithIncome(txs, profile, liabilities, [], 'main');
    expect(summary.workdays).toBe(5);
    expect(summary.calendarDays).toBe(5);
    expect(summary.periodMainIncome).toBe(5000);
    expect(summary.billExpense).toBe(250);
    expect(summary.billRepay).toBe(900);
    expect(summary.periodDebtCost).toBe(689.66); // 3000 / 21.75 * 5
    expect(summary.periodNetBalance).toBe(4060.34); // 5000 - 250 - 689.66
    expect(summary.expenseRatioPct).toBe(5); // 250 / 5000 = 5%
    expect(summary.topCategories[0]).toEqual({
      category: '餐饮美食',
      amount: 200,
      pct: 80,
    });

    // Filtered sub-range: 2026-11-05 (Thu) to 2026-11-06 (Fri) -> 2 workdays, 2 calendar days, only 50 expense
    const subSummary = analyzeBillsWithIncome(txs, profile, liabilities, [], 'main', new Date(), {
      startDate: '2026-11-05',
      endDate: '2026-11-06',
    });
    expect(subSummary.workdays).toBe(2);
    expect(subSummary.calendarDays).toBe(2);
    expect(subSummary.periodMainIncome).toBe(2000);
    expect(subSummary.billExpense).toBe(50);
    expect(subSummary.periodDebtCost).toBe(275.86); // 3000 / 21.75 * 2
    expect(subSummary.periodNetBalance).toBe(1674.14);
  });

  it('excludes self-transfers, offsets refunds against expenses, and respects manual overrides', () => {
    const txs: Transaction[] = [
      {
        source: 'wechat',
        type: 'expense',
        category: '购物',
        amount: 300,
        tradeTime: '2026-11-02 10:00:00',
        remark: '外套',
      },
      {
        source: 'wechat',
        type: 'income',
        category: '购物-退款',
        amount: 100,
        tradeTime: '2026-11-02 14:00:00',
        remark: '部分退款',
      },
      {
        source: 'wechat',
        type: 'expense',
        category: '零钱提现',
        amount: 500,
        tradeTime: '2026-11-03 11:00:00',
        remark: '提现到银行卡',
      },
      {
        source: 'wechat',
        type: 'expense',
        category: '转账',
        amount: 200,
        tradeTime: '2026-11-03 12:00:00',
        remark: '代付平账',
        originalType: 'expense',
        userOverrideType: true,
      },
    ];
    // Mark the last one manually excluded
    txs[3].type = 'repay';

    const summary = analyzeBillsWithIncome(txs, profile, [], [], 'main');
    expect(summary.billExpense).toBe(200); // 300 - 100 refund; withdrawal & manual repay excluded
    expect(summary.refundOffsetTotal).toBe(100);
    expect(summary.refundCount).toBe(1);
    expect(summary.billIncome).toBe(0);
    expect(summary.billRepay).toBe(700);
  });

  it('aggregates trend expenses only onto their real transaction month/day', () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const otherMonth = currentMonth === 1 ? 2 : 1;
    const curMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01 12:00:00`;
    const otherMonthStr = `${currentYear}-${String(otherMonth).padStart(2, '0')}-05 12:00:00`;

    const txs: Transaction[] = [
      {
        source: 'alipay',
        type: 'expense',
        category: '餐饮',
        amount: 120,
        tradeTime: curMonthStr,
      },
      {
        source: 'alipay',
        type: 'expense',
        category: '购物',
        amount: 800,
        tradeTime: otherMonthStr,
      },
    ];

    const monthly = generateTrendData('monthly', profile, liabilities, [], txs, 'main');
    // Only the exact transaction months should reflect those expenses (debt=3000)
    expect(monthly[currentMonth - 1].expense).toBe(3120);
    expect(monthly[otherMonth - 1].expense).toBe(3800);
    const untouchedMonthIdx = [0, 1, 2].find(
      idx => idx !== currentMonth - 1 && idx !== otherMonth - 1
    )!;
    expect(monthly[untouchedMonthIdx].expense).toBe(3000);

    const daily = generateTrendData('daily', profile, liabilities, [], txs, 'main');
    // Day 1 of current month gets +120; Day 2 does NOT get smeared
    expect(daily[0].expense).toBeCloseTo(daily[0].debtCost + 120, 1);
    if (daily.length > 1) {
      expect(daily[1].expense).toBeCloseTo(daily[1].debtCost, 1);
    }
  });
});
