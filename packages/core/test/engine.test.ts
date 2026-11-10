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

  it('generates hourly, daily, and monthly trend data accurately', () => {
    const hourly = generateTrendData('hourly', mockProfile, mockLiabilities);
    expect(hourly).toHaveLength(8);
    expect(hourly[0].label).toBe('09:00');
    expect(hourly[hourly.length - 1].income).toBeGreaterThan(0);

    const daily = generateTrendData('daily', mockProfile, mockLiabilities);
    expect(daily).toHaveLength(14);
    expect(daily[daily.length - 1].remainingDebt).toBe(mockLiabilities[0].remainingAmount);

    const monthly = generateTrendData('monthly', mockProfile, mockLiabilities);
    expect(monthly).toHaveLength(12);
    expect(monthly[0].label).toBe('1月');
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
