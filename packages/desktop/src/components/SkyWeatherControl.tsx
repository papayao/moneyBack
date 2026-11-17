import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Moon,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { PHASE_META, TimePhaseId, WeatherCategory } from '../utils/skyTheme';
import { SavedCity, searchCities } from '../utils/weatherService';
import { SkyWeatherState } from '../hooks/useSkyWeather';

interface SkyWeatherControlProps {
  skyWeather: SkyWeatherState;
  variant?: 'header' | 'floating';
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const WEATHER_OPTIONS: Array<{ id: WeatherCategory | 'auto'; label: string }> = [
  { id: 'auto', label: '实况' },
  { id: 'clear', label: '晴' },
  { id: 'cloudy', label: '多云' },
  { id: 'rain', label: '雨' },
  { id: 'snow', label: '雪' },
];

const PHASE_OPTIONS: Array<{ id: TimePhaseId | 'auto'; label: string }> = [
  { id: 'auto', label: '实时' },
  { id: 'morning', label: '早' },
  { id: 'noon', label: '午' },
  { id: 'afternoon', label: '下午' },
  { id: 'evening', label: '傍晚' },
  { id: 'night', label: '晚' },
];

export const SkyWeatherControl: React.FC<SkyWeatherControlProps> = ({
  skyWeather,
  variant = 'header',
  isOpen: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    if (onOpenChange) onOpenChange(next);
  };

  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<SavedCity[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    city,
    weather,
    isWeatherLoading,
    phaseOverride,
    weatherOverride,
    activePhase,
    activeWeather,
    setPhaseOverride,
    setWeatherOverride,
    refreshWeather,
    selectCity,
  } = skyWeather;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSearchCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityQuery.trim() || isSearchingCity) return;
    setIsSearchingCity(true);
    try {
      const results = await searchCities(cityQuery);
      setCityResults(results);
    } catch {
      setCityResults([]);
    } finally {
      setIsSearchingCity(false);
    }
  };

  const handleSelectCity = async (selected: SavedCity) => {
    setCityResults([]);
    setCityQuery('');
    await selectCity(selected);
  };

  const renderWeatherIcon = () => {
    if (activeWeather === 'rain') return <CloudRain className="w-3.5 h-3.5 text-sky-600" />;
    if (activeWeather === 'snow') return <CloudSnow className="w-3.5 h-3.5 text-slate-600" />;
    if (activeWeather === 'cloudy') return <Cloud className="w-3.5 h-3.5 text-zinc-500" />;
    if (activePhase === 'night') return <Moon className="w-3.5 h-3.5 text-amber-500" />;
    return <Sun className="w-3.5 h-3.5 text-amber-500" />;
  };

  const buttonClass =
    variant === 'floating'
      ? 'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-800 bg-white/85 hover:bg-white rounded-sm border border-zinc-200/90 shadow-xs backdrop-blur-md transition cursor-pointer whitespace-nowrap shrink-0'
      : 'flex items-center gap-1 sm:gap-1.5 px-2 py-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-100/90 hover:bg-zinc-200/80 rounded-sm border border-zinc-200 transition cursor-pointer whitespace-nowrap shrink-0';

  return (
    <div ref={containerRef} className="relative" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        title="天气与天色时段"
        className={buttonClass}
      >
        {renderWeatherIcon()}
        <span className="font-mono">
          {weather ? `${weather.temperatureC}°C` : '--°C'}
        </span>
        <span className="text-zinc-500">
          {weatherOverride
            ? WEATHER_OPTIONS.find(o => o.id === weatherOverride)?.label
            : weather?.label ?? '晴'}
        </span>
        <span className="text-zinc-300">·</span>
        <span className="text-zinc-600">{PHASE_META[activePhase].label}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-xl border border-zinc-200 rounded-md shadow-lg p-3 text-xs text-zinc-800 space-y-3 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-zinc-700 font-medium">
              <MapPin className="w-3.5 h-3.5 text-zinc-500" />
              <span>{city?.name ?? '定位中'}</span>
              {weather?.isFallback && (
                <span className="text-[10px] text-zinc-400">(离线兜底)</span>
              )}
            </div>
            <button
              type="button"
              onClick={refreshWeather}
              disabled={isWeatherLoading}
              title="刷新天气"
              className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-sm transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isWeatherLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <form onSubmit={handleSearchCity} className="flex gap-1.5">
            <input
              type="text"
              value={cityQuery}
              onChange={e => setCityQuery(e.target.value)}
              placeholder="输入城市名（如 北京 / Tokyo）"
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-sm px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:border-zinc-400"
            />
            <button
              type="submit"
              disabled={isSearchingCity}
              className="px-2 py-1 bg-zinc-900 text-white rounded-sm hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50"
            >
              {isSearchingCity ? '...' : '切换'}
            </button>
          </form>

          {cityResults.length > 0 && (
            <div className="max-h-28 overflow-y-auto border border-zinc-200 rounded-sm divide-y divide-zinc-100 bg-white">
              {cityResults.map((item, idx) => (
                <button
                  key={`${item.name}-${idx}`}
                  type="button"
                  onClick={() => handleSelectCity(item)}
                  className="w-full text-left px-2 py-1.5 hover:bg-zinc-100 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium text-zinc-800">{item.name}</span>
                  <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">
                    {[item.admin1, item.country].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div>
            <div className="text-[11px] text-zinc-500 mb-1.5">时段预览</div>
            <div className="grid grid-cols-6 gap-1">
              {PHASE_OPTIONS.map(opt => {
                const selected =
                  opt.id === 'auto' ? phaseOverride === null : phaseOverride === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPhaseOverride(opt.id === 'auto' ? null : opt.id)}
                    className={`py-1 rounded-sm border text-[11px] transition cursor-pointer ${
                      selected
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-zinc-500 mb-1.5">天气效果</div>
            <div className="grid grid-cols-5 gap-1">
              {WEATHER_OPTIONS.map(opt => {
                const selected =
                  opt.id === 'auto' ? weatherOverride === null : weatherOverride === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setWeatherOverride(opt.id === 'auto' ? null : opt.id)}
                    className={`py-1 rounded-sm border text-[11px] transition cursor-pointer ${
                      selected
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
