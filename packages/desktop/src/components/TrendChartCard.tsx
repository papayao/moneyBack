import React, { useState, useMemo } from 'react';
import {
  UserProfile,
  Liability,
  IncomeSource,
  Transaction,
  TrendGranularity,
  generateTrendData,
  TrendPoint,
} from '@salary-ticker/core';
import {
  LineChart as ChartIcon,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Target,
  Clock,
  Calendar,
  Layers,
} from 'lucide-react';

interface TrendChartCardProps {
  profile: UserProfile;
  liabilities: Liability[];
  incomeSources: IncomeSource[];
  transactions: Transaction[];
  isPrivacyMode: boolean;
}

export const TrendChartCard: React.FC<TrendChartCardProps> = ({
  profile,
  liabilities,
  incomeSources,
  transactions,
  isPrivacyMode,
}) => {
  const [granularity, setGranularity] = useState<TrendGranularity>('daily');
  const [viewMode, setViewMode] = useState<'amount' | 'progress'>('amount');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Active series toggles
  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [showDebt, setShowDebt] = useState(true);
  const [showSavings, setShowSavings] = useState(true);

  const data: TrendPoint[] = useMemo(() => {
    return generateTrendData(granularity, profile, liabilities, incomeSources, transactions);
  }, [granularity, profile, liabilities, incomeSources, transactions]);

  // Chart dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 55 };
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Compute Scales
  const { maxAmount, pointsWithCoords } = useMemo(() => {
    const maxVal = Math.max(
      100,
      ...data.flatMap(d => [d.income, d.expense, viewMode === 'amount' ? d.currentSavings : 0])
    );
    // Round up max to clean round number
    const niceMax = Math.ceil(maxVal / 1000) * 1000 || 1000;

    const count = data.length;
    const coords = data.map((d, i) => {
      const x = padding.left + (count > 1 ? (i / (count - 1)) * chartWidth : chartWidth / 2);

      // Amount Y (0 to niceMax)
      const yIncome = padding.top + chartHeight - (d.income / niceMax) * chartHeight;
      const yExpense = padding.top + chartHeight - (d.expense / niceMax) * chartHeight;
      const ySavingsAmt = padding.top + chartHeight - (Math.min(niceMax, d.currentSavings) / niceMax) * chartHeight;

      // Progress Y (0 to 100%)
      const yDebtPct = padding.top + chartHeight - (Math.min(100, d.debtProgress) / 100) * chartHeight;
      const ySavingsPct = padding.top + chartHeight - (Math.min(100, d.savingsProgress) / 100) * chartHeight;

      return {
        ...d,
        x,
        yIncome,
        yExpense,
        ySavingsAmt,
        yDebtPct,
        ySavingsPct,
      };
    });

    return { maxAmount: niceMax, pointsWithCoords: coords };
  }, [data, viewMode, chartWidth, chartHeight]);

  const makePath = (getY: (p: (typeof pointsWithCoords)[0]) => number) => {
    if (pointsWithCoords.length === 0) return '';
    return pointsWithCoords.reduce((acc, p, i) => {
      return `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${getY(p).toFixed(1)}`;
    }, '');
  };

  const pathIncome = makePath(p => p.yIncome);
  const pathExpense = makePath(p => p.yExpense);
  const pathDebt = makePath(p => (viewMode === 'amount' ? p.yExpense : p.yDebtPct));
  const pathSavings = makePath(p => (viewMode === 'amount' ? p.ySavingsAmt : p.ySavingsPct));

  const formatMoney = (val: number) => {
    if (isPrivacyMode) return '****';
    return `¥${Math.round(val).toLocaleString()}`;
  };

  const hoveredPoint = hoverIndex !== null ? pointsWithCoords[hoverIndex] : null;

  return (
    <div className="border border-zinc-200/90 bg-white p-4 rounded-md shadow-2xs space-y-3">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <ChartIcon className="w-4 h-4 text-zinc-700" />
          <h3 className="text-sm font-semibold text-zinc-900">收支趋势</h3>
        </div>

        {/* Granularity & Mode Selectors */}
        <div className="flex items-center gap-2">
          {/* Mode Switch (Amount vs Progress) */}
          <div className="flex bg-zinc-100 p-0.5 rounded-sm border border-zinc-200 text-xs">
            <button
              onClick={() => setViewMode('amount')}
              className={`px-2 py-0.5 rounded-sm font-medium transition ${
                viewMode === 'amount'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              金额 (¥)
            </button>
            <button
              onClick={() => setViewMode('progress')}
              className={`px-2 py-0.5 rounded-sm font-medium transition ${
                viewMode === 'progress'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              进度 (%)
            </button>
          </div>

          {/* Granularity Switch */}
          <div className="flex bg-zinc-100 p-0.5 rounded-sm border border-zinc-200 text-xs">
            <button
              onClick={() => setGranularity('hourly')}
              className={`px-2 py-0.5 rounded-sm font-medium transition ${
                granularity === 'hourly'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              小时
            </button>
            <button
              onClick={() => setGranularity('daily')}
              className={`px-2 py-0.5 rounded-sm font-medium transition ${
                granularity === 'daily'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              天
            </button>
            <button
              onClick={() => setGranularity('monthly')}
              className={`px-2 py-0.5 rounded-sm font-medium transition ${
                granularity === 'monthly'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              月
            </button>
          </div>
        </div>
      </div>

      {/* Series Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => setShowIncome(!showIncome)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border transition ${
            showIncome
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-zinc-50 border-zinc-200 text-zinc-400 opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
          <span>综合收入</span>
        </button>

        <button
          onClick={() => setShowExpense(!showExpense)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border transition ${
            showExpense
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-zinc-50 border-zinc-200 text-zinc-400 opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-600"></span>
          <span>综合支出(含负债)</span>
        </button>

        <button
          onClick={() => setShowDebt(!showDebt)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border transition ${
            showDebt
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-zinc-50 border-zinc-200 text-zinc-400 opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-600"></span>
          <span>{viewMode === 'amount' ? '日均/月均负债' : '负债清偿进度 (%)'}</span>
        </button>

        <button
          onClick={() => setShowSavings(!showSavings)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm border transition ${
            showSavings
              ? 'bg-zinc-100 border-zinc-400 text-zinc-900 font-medium'
              : 'bg-zinc-50 border-zinc-200 text-zinc-400 opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-zinc-900"></span>
          <span>{viewMode === 'amount' ? '结余存款 (¥)' : '存钱目标达成率 (%)'}</span>
        </button>
      </div>

      {/* SVG Line Chart View */}
      <div className="relative w-full overflow-hidden bg-zinc-50/50 rounded-sm border border-zinc-200">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-56 select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padding.top + chartHeight * (1 - pct);
            const valLabel =
              viewMode === 'amount'
                ? `¥${Math.round(maxAmount * pct).toLocaleString()}`
                : `${Math.round(pct * 100)}%`;

            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#e4e4e7"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-zinc-400 text-[10px] font-mono"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* X Axis Labels */}
          {pointsWithCoords.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={svgHeight - 12}
              textAnchor="middle"
              className="fill-zinc-500 text-[10px] font-mono"
            >
              {p.label}
            </text>
          ))}

          {/* Line: Income */}
          {showIncome && (
            <path
              d={pathIncome}
              fill="none"
              stroke="#059669"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Line: Expense */}
          {showExpense && (
            <path
              d={pathExpense}
              fill="none"
              stroke="#e11d48"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Line: Debt */}
          {showDebt && (
            <path
              d={pathDebt}
              fill="none"
              stroke="#d97706"
              strokeWidth="2"
              strokeDasharray="4 3"
              strokeLinecap="round"
            />
          )}

          {/* Line: Savings */}
          {showSavings && (
            <path
              d={pathSavings}
              fill="none"
              stroke="#18181b"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Hover Crosshair */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={padding.top + chartHeight}
                stroke="#71717a"
                strokeDasharray="2 2"
                strokeWidth="1.2"
              />
              {/* Highlight points on lines */}
              {showIncome && (
                <circle cx={hoveredPoint.x} cy={hoveredPoint.yIncome} r="4" fill="#059669" />
              )}
              {showExpense && (
                <circle cx={hoveredPoint.x} cy={hoveredPoint.yExpense} r="4" fill="#e11d48" />
              )}
              {showSavings && (
                <circle
                  cx={hoveredPoint.x}
                  cy={viewMode === 'amount' ? hoveredPoint.ySavingsAmt : hoveredPoint.ySavingsPct}
                  r="4"
                  fill="#18181b"
                />
              )}
            </g>
          )}

          {/* Invisible mouse hover trigger columns */}
          {pointsWithCoords.map((p, idx) => {
            const step = chartWidth / (pointsWithCoords.length || 1);
            return (
              <rect
                key={idx}
                x={p.x - step / 2}
                y={padding.top}
                width={step}
                height={chartHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="absolute top-2 pointer-events-none bg-zinc-900/95 text-white p-2.5 rounded-sm shadow-md text-xs font-mono space-y-1 z-20 border border-zinc-700"
            style={{
              left: `${Math.min(75, Math.max(5, (hoveredPoint.x / svgWidth) * 100))}%`,
            }}
          >
            <div className="font-semibold text-zinc-300 border-b border-zinc-700 pb-1 flex items-center justify-between gap-3">
              <span>时间节点: {hoveredPoint.label}</span>
              <span className="text-[10px] text-zinc-400 font-sans">
                {granularity === 'hourly' ? '今日时段' : granularity === 'daily' ? '每日统计' : '月度趋势'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-emerald-400">
              <span>收入:</span>
              <span>{formatMoney(hoveredPoint.income)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-rose-400">
              <span>支出:</span>
              <span>{formatMoney(hoveredPoint.expense)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-amber-300">
              <span>负债已清偿:</span>
              <span>{hoveredPoint.debtProgress}% (余: {formatMoney(hoveredPoint.remainingDebt)})</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-zinc-200">
              <span>存钱目标达成:</span>
              <span>{hoveredPoint.savingsProgress}% (存: {formatMoney(hoveredPoint.currentSavings)})</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Insights Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-zinc-600">
        <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-sm">
          <div className="text-zinc-400">周期收入峰值</div>
          <div className="font-semibold font-mono text-emerald-700 text-xs">
            {formatMoney(Math.max(...data.map(d => d.income), 0))}
          </div>
        </div>
        <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-sm">
          <div className="text-zinc-400">周期支出均值</div>
          <div className="font-semibold font-mono text-rose-700 text-xs">
            {formatMoney(
              data.reduce((sum, d) => sum + d.expense, 0) / (data.length || 1)
            )}
          </div>
        </div>
        <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-sm">
          <div className="text-zinc-400">最新负债进度</div>
          <div className="font-semibold font-mono text-amber-700 text-xs">
            {data[data.length - 1]?.debtProgress ?? 0}%
          </div>
        </div>
        <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-sm">
          <div className="text-zinc-400">存钱目标达成</div>
          <div className="font-semibold font-mono text-zinc-900 text-xs">
            {data[data.length - 1]?.savingsProgress ?? 0}%
          </div>
        </div>
      </div>
    </div>
  );
};
