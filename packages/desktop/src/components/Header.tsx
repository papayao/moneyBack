import React from 'react';
import { Settings, FileSpreadsheet, Eye, EyeOff, LayoutGrid, Minimize2 } from 'lucide-react';
import { TickerSnapshot } from '@moneyback/core';
import { SkyWeatherControl } from './SkyWeatherControl';
import { SkyWeatherState } from '../hooks/useSkyWeather';

interface HeaderProps {
  snapshot: TickerSnapshot;
  onOpenProfile: () => void;
  onOpenImport: () => void;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  isMiniMode: boolean;
  onToggleMini: () => void;
  skyWeather?: SkyWeatherState;
}

export const Header: React.FC<HeaderProps> = ({
  snapshot,
  onOpenProfile,
  onOpenImport,
  isPrivacyMode,
  onTogglePrivacy,
  isMiniMode,
  onToggleMini,
  skyWeather,
}) => {
  const getStatusBadge = () => {
    if (snapshot.isOvertimeActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          {snapshot.overtimeRewardType === 'paid' ? '加班计薪中' : '调休加班中'}
          {snapshot.overtimeRemainingFormatted && (
            <span className="font-mono text-[11px]">{snapshot.overtimeRemainingFormatted}</span>
          )}
        </span>
      );
    }
    if (snapshot.isWorkingTime) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          计费工作中
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
        {snapshot.isBeforeWork ? '未上班' : '已下班'}
      </span>
    );
  };

  return (
    <header className="relative z-20 h-14 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md px-4 flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-wide text-zinc-900">MoneyBack</span>
          <span className="text-xs text-zinc-400 font-mono">Beta</span>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {skyWeather && <SkyWeatherControl skyWeather={skyWeather} variant="header" />}
        <button
          onClick={onTogglePrivacy}
          title={isPrivacyMode ? "显示金额" : "防窥隐私模式"}
          className="p-1.5 shrink-0 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-sm border border-transparent hover:border-zinc-200 transition"
        >
          {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenImport}
          title="导入微信/支付宝账单"
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-sm border border-zinc-200 transition shrink-0 whitespace-nowrap"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span className="hidden sm:inline">导入账单</span>
        </button>

        <button
          onClick={onOpenProfile}
          title="设置工作与薪资"
          className="p-1.5 shrink-0 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-sm border border-transparent hover:border-zinc-200 transition"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleMini}
          title="切换至极简悬浮小窗"
          className="p-1.5 shrink-0 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-sm border border-transparent hover:border-zinc-200 transition sm:ml-1"
        >
          {isMiniMode ? <LayoutGrid className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
