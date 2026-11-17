import React, { useMemo, useState } from 'react';
import {
  analyzeBillsWithIncome,
  extractTxDateKey,
  filterTransactionsByDateRange,
  normalizeBillTransaction,
  normalizeTradeTime,
  HolidayCalendarMap,
  IncomeSource,
  Liability,
  Transaction,
  UserProfile,
} from '@moneyback/core';
import { Receipt, Upload, Trash2, CircleAlert } from 'lucide-react';
import { AppDateInput } from './ui/AstryxDateTime';

type TimePreset = 'all' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const next = new Date(y, m - 1, d + deltaDays);
  return formatLocalDate(next);
}

interface KpiTooltipProps {
  formula: string;
  plain: string;
  align?: 'left' | 'right';
}

const KpiTooltip: React.FC<KpiTooltipProps> = ({ formula, plain, align = 'left' }) => (
  <div className="group/tooltip relative inline-flex items-center cursor-help">
    <CircleAlert className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700 transition" />
    <div
      className={`pointer-events-none absolute bottom-full mb-1.5 z-50 hidden group-hover/tooltip:flex flex-col w-60 p-2.5 bg-zinc-900 text-white text-[11px] rounded-sm shadow-md font-sans space-y-1 ${
        align === 'right' ? 'right-0' : 'left-0'
      }`}
    >
      <div className="font-mono text-[10px] text-amber-300 leading-snug">{formula}</div>
      <div className="text-zinc-200 leading-relaxed">{plain}</div>
    </div>
  </div>
);

interface BillAnalysisCardProps {
  transactions: Transaction[];
  profile: UserProfile;
  liabilities: Liability[];
  incomeSources: IncomeSource[];
  incomeDisplayMode: 'main' | 'total';
  isPrivacyMode: boolean;
  holidayCalendar?: HolidayCalendarMap;
  onToggleExcludeTransaction?: (idxInState: number) => void;
  onOpenImport: () => void;
  onClearTransactions: () => void;
}

export const BillAnalysisCard: React.FC<BillAnalysisCardProps> = ({
  transactions,
  profile,
  liabilities,
  incomeSources,
  incomeDisplayMode,
  isPrivacyMode,
  holidayCalendar,
  onToggleExcludeTransaction,
  onOpenImport,
  onClearTransactions,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'repay'>('all');
  const [timePreset, setTimePreset] = useState<TimePreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const dataBounds = useMemo(() => {
    const keys = transactions
      .map(t => extractTxDateKey(t.tradeTime))
      .filter((k): k is string => Boolean(k))
      .sort();
    const todayStr = formatLocalDate(new Date());
    return {
      min: keys[0] ?? todayStr,
      max: keys[keys.length - 1] ?? todayStr,
    };
  }, [transactions]);

  const activeRange = useMemo(() => {
    const now = new Date();
    const anchorEnd = dataBounds.max;

    if (timePreset === 'all') {
      return undefined;
    }
    if (timePreset === '7d') {
      return { startDate: shiftDateKey(anchorEnd, -6), endDate: anchorEnd };
    }
    if (timePreset === '30d') {
      return { startDate: shiftDateKey(anchorEnd, -29), endDate: anchorEnd };
    }
    if (timePreset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: formatLocalDate(firstDay), endDate: formatLocalDate(lastDay) };
    }
    if (timePreset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatLocalDate(firstDay), endDate: formatLocalDate(lastDay) };
    }
    return {
      startDate: customStart || dataBounds.min,
      endDate: customEnd || dataBounds.max,
    };
  }, [timePreset, customStart, customEnd, dataBounds]);

  const indexedTransactions = useMemo(
    () =>
      transactions.map((raw, stateIdx) => ({
        ...normalizeBillTransaction(raw),
        _stateIdx: stateIdx,
      })),
    [transactions]
  );

  const dateFilteredTxs = useMemo(
    () => filterTransactionsByDateRange(indexedTransactions, activeRange),
    [indexedTransactions, activeRange]
  );

  const summary = useMemo(
    () =>
      analyzeBillsWithIncome(
        transactions,
        profile,
        liabilities,
        incomeSources,
        incomeDisplayMode,
        new Date(),
        activeRange,
        holidayCalendar
      ),
    [
      transactions,
      profile,
      liabilities,
      incomeSources,
      incomeDisplayMode,
      activeRange,
      holidayCalendar,
    ]
  );

  const filteredTxs = useMemo(() => {
    const base =
      filterType === 'all'
        ? dateFilteredTxs
        : filterType === 'income'
          ? dateFilteredTxs.filter(t => t.type === 'income' && !t.isRefundOffset)
          : dateFilteredTxs.filter(t => t.type === filterType);
    return [...base].sort((a, b) =>
      normalizeTradeTime(b.tradeTime).localeCompare(normalizeTradeTime(a.tradeTime))
    );
  }, [dateFilteredTxs, filterType]);

  const handleSelectPreset = (preset: TimePreset) => {
    setTimePreset(preset);
    if (preset === 'all') {
      setCustomStart('');
      setCustomEnd('');
    }
  };

  const handleDateChange = (edge: 'start' | 'end', val: string) => {
    if (edge === 'start') {
      setCustomStart(val);
      if (!customEnd) setCustomEnd(activeRange?.endDate ?? dataBounds.max);
    } else {
      setCustomEnd(val);
      if (!customStart) setCustomStart(activeRange?.startDate ?? dataBounds.min);
    }
    setTimePreset('custom');
  };

  const fmt = (val: number) => (isPrivacyMode ? '****' : `¥${val.toFixed(2)}`);

  if (transactions.length === 0) return null;

  return (
    <div className="space-y-3.5">
      {/* Period & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-sm bg-zinc-100 text-zinc-600 border border-zinc-200">
            {summary.startDate} ~ {summary.endDate} · {summary.workdays}工作日
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-sm border border-zinc-200 transition cursor-pointer"
          >
            <Upload className="w-3 h-3" />
            <span>继续导入</span>
          </button>
          <button
            type="button"
            onClick={onClearTransactions}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-rose-600 transition cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>清空</span>
          </button>
        </div>
      </div>

      {/* Time Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50/80 border border-zinc-200/80 rounded-sm px-2.5 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: 'all', label: '全部' },
              { id: '7d', label: '近7天' },
              { id: '30d', label: '近30天' },
              { id: 'this_month', label: '本月' },
              { id: 'last_month', label: '上月' },
            ] as const
          ).map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              className={`px-2 py-0.5 text-[11px] rounded-sm border transition cursor-pointer ${
                timePreset === p.id
                  ? 'bg-zinc-900 text-white border-zinc-900 font-medium'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:text-zinc-900 hover:border-zinc-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-600">
          <div className="w-[142px]">
            <AppDateInput
              label="开始日期"
              value={activeRange?.startDate ?? dataBounds.min}
              onChange={val => handleDateChange('start', val)}
            />
          </div>
          <span className="text-zinc-400">~</span>
          <div className="w-[142px]">
            <AppDateInput
              label="结束日期"
              value={activeRange?.endDate ?? dataBounds.max}
              onChange={val => handleDateChange('end', val)}
            />
          </div>
        </div>
      </div>

      {/* Auto-Linked Income vs Expense KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-sm">
          <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-500">
            <span>同期{incomeDisplayMode === 'main' ? '主要收入' : '总收入'}</span>
            <KpiTooltip
              align="left"
              formula={
                incomeDisplayMode === 'main'
                  ? `公式：${summary.workdays}工作日 × (月薪÷计薪天数)${summary.billIncome > 0 ? ' + 账单收入' : ''}`
                  : `公式：${summary.workdays}工作日主业 + ${summary.calendarDays}天多元收入${summary.billIncome > 0 ? ' + 账单收入' : ''}`
              }
              plain="微信/支付宝账单通常不含银行卡发的工资，这里按账单日期自动把你同期挣到的工资算进来。"
            />
          </div>
          <div className="text-sm font-semibold font-mono text-emerald-600 mt-0.5">
            {fmt(summary.effectiveTotalIncome)}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
            {summary.billIncome > 0
              ? isPrivacyMode
                ? '主业+账单收入 ****'
                : `主业+账单收入¥${summary.billIncome.toFixed(0)}`
              : '自动联动主业工薪'}
          </div>
        </div>

        <div className="p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-sm">
          <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-500">
            <span>账单支出 ({summary.expenseCount}笔)</span>
            <KpiTooltip
              align="left"
              formula={`公式：账单内 ${summary.expenseCount} 笔「支出」流水求和`}
              plain="这段时间在微信/支付宝里实打实花出去吃喝、购物、出行的钱（不含转账和还花呗这类不计收支）。"
            />
          </div>
          <div className="text-sm font-semibold font-mono text-rose-600 mt-0.5">
            {fmt(summary.billExpense)}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
            占同期收入 {summary.expenseRatioPct}%
            {summary.refundCount > 0 && ` · 退款冲销 ${fmt(summary.refundOffsetTotal)}`}
          </div>
        </div>

        <div className="p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-sm">
          <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-500">
            <span>同期负债均摊</span>
            <KpiTooltip
              align="right"
              formula={`公式：(生效负债月供总额 ÷ ${profile.workDaysPerMonth || 21.75}计薪日) × ${summary.workdays}工作日`}
              plain="房贷、车贷一般从银行卡直接扣，不会出现在微信/支付宝账单里；按工作日均摊进来，避免把要还贷的钱误当成存款。"
            />
          </div>
          <div className="text-sm font-semibold font-mono text-zinc-800 mt-0.5">
            {fmt(summary.periodDebtCost)}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
            不计收支 {summary.repayCount}笔 ({isPrivacyMode ? '***' : `¥${summary.billRepay.toFixed(0)}`})
          </div>
        </div>

        <div className="p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-sm">
          <div className="flex items-center justify-between gap-1 text-[11px] text-zinc-500">
            <span>账单期净结余</span>
            <KpiTooltip
              align="right"
              formula="公式：同期收入 - 账单支出 - 同期负债均摊"
              plain="这段时间赚到的钱，扣掉日常账单消费和要摊的房贷车贷后，真正能留下来存进兜里的钱。"
            />
          </div>
          <div
            className={`text-sm font-semibold font-mono mt-0.5 ${
              summary.periodNetBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {isPrivacyMode
              ? '****'
              : `${summary.periodNetBalance >= 0 ? '+' : '-'}¥${Math.abs(
                  summary.periodNetBalance
                ).toFixed(2)}`}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
            储蓄率{' '}
            {summary.effectiveTotalIncome > 0
              ? Math.max(
                  0,
                  Math.round(
                    (summary.periodNetBalance / summary.effectiveTotalIncome) * 1000
                  ) / 10
                )
              : 0}
            %
          </div>
        </div>
      </div>

      {/* Top Expense Categories */}
      {summary.topCategories.length > 0 && (
        <div className="bg-zinc-50/70 border border-zinc-200/70 rounded-sm p-2.5 space-y-2">
          <div className="text-[11px] font-medium text-zinc-600">支出分类 Top {summary.topCategories.length}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {summary.topCategories.map(cat => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-700 font-sans truncate">{cat.category}</span>
                  <span className="text-zinc-600">
                    {fmt(cat.amount)} ({cat.pct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-zinc-800 rounded-xs"
                    style={{ width: `${Math.min(100, cat.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs & List */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap bg-zinc-100 p-0.5 rounded-sm border border-zinc-200 text-[11px]">
            {(
              [
                { id: 'all', label: `全部 (${dateFilteredTxs.length})` },
                { id: 'expense', label: `支出 (${summary.expenseCount})` },
                { id: 'income', label: `收入 (${summary.incomeCount})` },
                { id: 'repay', label: `不计收支 (${summary.repayCount})` },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`px-2 py-0.5 rounded-sm transition cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-white text-zinc-900 font-medium shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            显示前 {Math.min(30, filteredTxs.length)} 条
          </span>
        </div>

        <div className="space-y-1 max-h-56 overflow-y-auto font-mono text-xs">
          {filteredTxs.length === 0 ? (
            <div className="py-6 text-center text-zinc-400 font-sans">
              所选时间范围内暂无匹配的账单流水
            </div>
          ) : (
            filteredTxs.slice(0, 30).map((tx, idx) => {
              const displayTime = normalizeTradeTime(tx.tradeTime).slice(5, 16);
              const displayRemark =
                (tx.remark || '').replace(/\s*-\s*\/$/, '').replace(/^\/\s*$/, '').trim() ||
                tx.category;
              const stateIdx = (tx as Transaction & { _stateIdx?: number })._stateIdx;
              return (
            <div key={idx} className="py-2 flex items-center justify-between text-zinc-800 gap-2">
              <div className="truncate max-w-md flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1 py-0.5 rounded-sm border border-zinc-200 shrink-0">
                  {tx.source}
                </span>
                <span className="text-[10px] text-zinc-400 shrink-0">
                  {displayTime}
                </span>
                <span className="truncate">{displayRemark}</span>
                {tx.isRefundOffset && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded-sm border border-amber-200 shrink-0">
                    冲销支出
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={
                    tx.isRefundOffset
                      ? 'text-amber-700 font-semibold shrink-0'
                      : tx.type === 'income'
                        ? 'text-emerald-600 font-semibold shrink-0'
                        : tx.type === 'repay'
                          ? 'text-zinc-500 shrink-0'
                          : 'text-zinc-900 shrink-0'
                  }
                >
                  {isPrivacyMode
                    ? '****'
                    : tx.isRefundOffset
                      ? `冲销 -¥${tx.amount.toFixed(2)}`
                      : tx.type === 'income'
                        ? `+¥${tx.amount.toFixed(2)}`
                        : tx.type === 'repay'
                          ? `¥${tx.amount.toFixed(2)} (不计收支)`
                          : `-¥${tx.amount.toFixed(2)}`}
                </span>
                {onToggleExcludeTransaction && !tx.isRefundOffset && stateIdx !== undefined && (
                  <button
                    type="button"
                    onClick={() => onToggleExcludeTransaction(stateIdx)}
                    title={tx.type === 'repay' ? '恢复计入收支' : '标记为不计收支'}
                    className="px-1.5 py-0.5 text-[10px] font-sans rounded-sm border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition cursor-pointer"
                  >
                    {tx.type === 'repay' ? '恢复' : '不计'}
                  </button>
                )}
              </div>
            </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
