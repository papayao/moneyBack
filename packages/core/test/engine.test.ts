import { describe, it, expect } from 'vitest';
import {
  calculateDailyWorkingSeconds,
  calculateSalaryPerSecond,
  calculateDailyDebtCost,
  calculateTickerSnapshot,
  generateTrendData,
  parseWechatBill,
  parseAlipayBill,
  UserProfile,
  Liability,
} from '../src/index.js';

describe('SalaryTicker Engine', () => {
  const mockProfile: UserProfile = {
    monthlySalary: 21750,
    workDaysPerMonth: 21.75,
    workStartTime: '09:00',
    workEndTime: '18:00',
    targetSavings: 50000,
    currentSavings: 10000,
  };

  const mockLiabilities: Liability[] = [
    {
      type: 'mortgage',
      title: '房贷',
      totalAmount: 1000000,
      remainingAmount: 800000,
      monthlyPayment: 4350,
      repayDay: 15,
      status: 'active',
    },
  ];

  it('calculates daily work seconds without lunch interruption', () => {
    // 09:00 to 18:00 = 9h = 32400s (午休已全面取消，上下班区间即全部工时)
    const seconds = calculateDailyWorkingSeconds(mockProfile);
    expect(seconds).toBe(32400);
  });

  it('calculates salary per second accurately', () => {
    // 21750 / (21.75 * 32400) = 1000 / 32400 ≈ 0.030864 RMB/s
    const perSec = calculateSalaryPerSecond(mockProfile);
    expect(perSec).toBeCloseTo(0.030864, 5);
  });

  it('calculates daily debt amortization', () => {
    // 4350 / 21.75 = 200 RMB/day
    const dailyDebt = calculateDailyDebtCost(mockLiabilities, mockProfile.workDaysPerMonth);
    expect(dailyDebt).toBe(200);
  });

  it('calculates ticker snapshot in morning work (starts negative)', () => {
    // At 10:00 (1h worked = 3600s * 0.030864 ≈ 111.11 RMB earned)
    // Net: 111.11 - 200 = -88.89 RMB (still negative)
    const morningDate = new Date(2026, 10, 10, 10, 0, 0);
    const snapshot = calculateTickerSnapshot(mockProfile, mockLiabilities, morningDate);

    expect(snapshot.hoursWorkedToday).toBe(1);
    expect(snapshot.earnedToday).toBe(111.11);
    expect(snapshot.dailyDebtCost).toBe(200);
    expect(snapshot.netToday).toBe(-88.89);
    expect(snapshot.isNetPositive).toBe(false);
  });

  it('crosses into net positive in the afternoon', () => {
    // At 15:00: 6h worked = 21600s * 0.0308641975 ≈ 666.67 RMB earned
    // Net: 666.67 - 200 = 466.67 RMB
    const afternoonDate = new Date(2026, 10, 10, 15, 0, 0);
    const snapshot = calculateTickerSnapshot(mockProfile, mockLiabilities, afternoonDate);

    expect(snapshot.hoursWorkedToday).toBe(6);
    expect(snapshot.earnedToday).toBe(666.67);
    expect(snapshot.netToday).toBe(466.67);
    expect(snapshot.isNetPositive).toBe(true);

    // Total labor earnings and expenses including debt:
    // Base labor earnings default: 500,000 + 666.67 earnedToday = 500666.67
    expect(snapshot.totalLaborEarningsLive).toBe(500666.67);
    // Base living expenses: 500,000 - 10,000 (savings) = 490,000
    // Total debt: 1,000,000
    // Total expenses: 490,000 + 1,000,000 = 1,490,000
    expect(snapshot.totalExpensesLive).toBe(1490000);
  });

  it('includes additional custom income sources (with schedule vs default 30-day 24/7)', () => {
    const afternoonDate = new Date(2026, 10, 10, 15, 0, 0);
    const incomeSources = [
      {
        id: 1,
        title: '配偶打卡工薪',
        type: 'partner' as const,
        amount: 10875,
        frequency: 'monthly' as const,
        workDaysPerMonth: 21.75,
        workStartTime: '09:00',
        workEndTime: '18:00',
      },
      {
        id: 2,
        title: '投资房租 (未填时间默认 30 天 24/7 全天候)',
        type: 'rent' as const,
        amount: 3000,
        frequency: 'monthly' as const,
      },
    ];
    // Monthly salary 21750 + 10875 + 3000 = 35625
    const snapshot = calculateTickerSnapshot(mockProfile, mockLiabilities, afternoonDate, [], incomeSources);
    expect(snapshot.additionalIncomeMonthly).toBe(13875);
    expect(snapshot.totalMonthlyIncome).toBe(35625);
    expect(snapshot.earnedToday).toBeGreaterThan(666.67);

    // Verify 24/7 item properties
    const rentItem = snapshot.streamingIncomeItems.find(i => i.type === 'rent');
    expect(rentItem?.is24x7).toBe(true);
    expect(rentItem?.isCurrentlyActive).toBe(true);

    // Verify scheduled partner item
    const partnerItem = snapshot.streamingIncomeItems.find(i => i.type === 'partner');
    expect(partnerItem?.is24x7).toBe(false);
    expect(partnerItem?.isCurrentlyActive).toBe(true);
  });

  it('generates hourly, daily, and monthly trend data accurately with period debt progress', () => {
    const extraIncomes = [
      {
        id: 1,
        title: '副业流式收入',
        type: 'side_hustle' as const,
        amount: 10875,
        frequency: 'monthly' as const,
        workStartTime: '09:00',
        workEndTime: '18:00',
      },
    ];

    const hourlyMain = generateTrendData('hourly', mockProfile, mockLiabilities, extraIncomes, [], 'main');
    const hourlyTotal = generateTrendData('hourly', mockProfile, mockLiabilities, extraIncomes, [], 'total');
    expect(hourlyMain).toHaveLength(8);
    expect(hourlyMain[0].label).toBe('09:00');
    expect(hourlyMain[0].debtProgress).toBe(0);
    // By 12:00, earned income > dailyDebt (300), so debtProgress reaches 100%
    expect(hourlyMain[2].debtProgress).toBe(100);
    expect(hourlyTotal[1].income).toBeGreaterThan(hourlyMain[1].income);

    const daily = generateTrendData('daily', mockProfile, mockLiabilities, extraIncomes, [], 'main');
    const now = new Date();
    const expectedMonthPrefix = String(now.getMonth() + 1).padStart(2, '0');
    expect(daily).toHaveLength(now.getDate());
    expect(daily[0].label).toBe(`${expectedMonthPrefix}-01`);
    expect(daily[daily.length - 1].debtProgress).toBeGreaterThan(0);
    // 所有日期的应还负债均恒定有效，周末绝不为 0，且月内还贷进度单调不减
    daily.forEach((point, idx) => {
      expect(point.debtCost).toBeGreaterThan(0);
      if (idx > 0) {
        expect(point.debtProgress).toBeGreaterThanOrEqual(daily[idx - 1].debtProgress);
      }
    });

    // 未来起始日期的负债，在天维度进度应为 0% 而非 100%
    const futureOnly = [{ ...mockLiabilities[0], startDate: '2099-01-01' }];
    const dailyFuture = generateTrendData('daily', mockProfile, futureOnly, extraIncomes, [], 'main');
    expect(dailyFuture[0].debtProgress).toBe(0);

    const monthly = generateTrendData('monthly', mockProfile, mockLiabilities, extraIncomes, [], 'main');
    expect(monthly).toHaveLength(12);
    expect(monthly[0].label).toBe('1月');
    expect(monthly[0].debtProgress).toBeGreaterThan(0);
  });

  it('filters liabilities accurately by startDate', () => {
    const futureLiabilities: Liability[] = [
      {
        id: 99,
        type: 'custom',
        title: '未来借款',
        totalAmount: 100000,
        remainingAmount: 100000,
        monthlyPayment: 5000,
        repayDay: 1,
        startDate: '2099-01-01',
      },
    ];
    const futureDailyDebt = calculateDailyDebtCost(futureLiabilities, 20, new Date());
    expect(futureDailyDebt).toBe(0);

    const pastLiabilities: Liability[] = [
      {
        id: 98,
        type: 'custom',
        title: '过去借款',
        totalAmount: 100000,
        remainingAmount: 100000,
        monthlyPayment: 2000,
        repayDay: 1,
        startDate: '2020-01-01',
      },
    ];
    const pastDailyDebt = calculateDailyDebtCost(pastLiabilities, 20, new Date());
    expect(pastDailyDebt).toBe(100);
  });

  it('stops at workEndTime and handles paid vs comp_leave overtime for today only', () => {
    const evening = new Date(2026, 10, 13, 19, 0, 0); // 19:00 (after 18:00)

    // 1. Default off-duty state
    const offSnap = calculateTickerSnapshot(mockProfile, mockLiabilities, evening);
    expect(offSnap.isAfterWork).toBe(true);
    expect(offSnap.isWorkingTime).toBe(false);
    expect(offSnap.mainLaborEarnedToday).toBe(1000);

    // 2. Paid overtime (2h starting 18:00 -> 1h elapsed at 19:00)
    const paidProfile = {
      ...mockProfile,
      todayOvertime: { date: '2026-11-13', hours: 2, rewardType: 'paid' as const, startSec: 18 * 3600 },
    };
    const paidSnap = calculateTickerSnapshot(paidProfile, mockLiabilities, evening);
    expect(paidSnap.isOvertimeActive).toBe(true);
    expect(paidSnap.isWorkingTime).toBe(true);
    expect(paidSnap.overtimeEarnedToday).toBeCloseTo(111.11, 1);
    expect(paidSnap.mainLaborEarnedToday).toBeCloseTo(1111.11, 1);

    // 3. Comp-leave overtime (time resumes without extra cash)
    const compProfile = {
      ...mockProfile,
      todayOvertime: { date: '2026-11-13', hours: 2, rewardType: 'comp_leave' as const, startSec: 18 * 3600 },
    };
    const compSnap = calculateTickerSnapshot(compProfile, mockLiabilities, evening);
    expect(compSnap.isOvertimeActive).toBe(true);
    expect(compSnap.overtimeEarnedToday).toBe(0);
    expect(compSnap.mainLaborEarnedToday).toBe(1000);

    // 4. Stale yesterday overtime ignored today
    const staleProfile = {
      ...mockProfile,
      todayOvertime: { date: '2026-11-12', hours: 3, rewardType: 'paid' as const, startSec: 18 * 3600 },
    };
    const staleSnap = calculateTickerSnapshot(staleProfile, mockLiabilities, evening);
    expect(staleSnap.isOvertimeActive).toBe(false);
    expect(staleSnap.overtimeEarnedToday).toBe(0);
  });
});

describe('Bill Parsers', () => {
  it('parses mock WeChat CSV export', () => {
    const csvContent = `微信支付账单明细列表
----------------------
交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注
2026-11-09 12:30:00,商户消费,老王快餐,盒饭,支出,¥25.00,招商银行信用卡(1234),支付成功,1001,2001,午餐
2026-11-09 18:00:00,转账,张三,还款,收入,¥500.00,零钱,已存入零钱,1002,2002,还钱
`;
    const transactions = parseWechatBill(csvContent);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].amount).toBe(25);
    expect(transactions[0].type).toBe('expense');
    expect(transactions[0].isDebtPayment).toBe(true); // credit card
    expect(transactions[1].amount).toBe(500);
    expect(transactions[1].type).toBe('income');
  });

  it('parses mock Alipay CSV export', () => {
    const csvContent = `支付宝交易明细查询
------------------------------------------------------------------------------------
交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注
2026-11-08 09:15:00,交通出行,滴滴出行,didi@test,快车,支出,32.50,花呗,交易成功,T123,M123,打车
------------------------------------------------------------------------------------
共 1 笔记录
`;
    const transactions = parseAlipayBill(csvContent);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].amount).toBe(32.5);
    expect(transactions[0].isDebtPayment).toBe(true); // Huabei
    expect(transactions[0].category).toBe('交通出行');
  });
});
