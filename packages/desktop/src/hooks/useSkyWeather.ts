import { useState, useEffect, useCallback } from 'react';
import {
  getTimePhaseId,
  PHASE_META,
  TimePhaseId,
  WeatherCategory,
} from '../utils/skyTheme';
import {
  fetchWeatherForCity,
  resolveInitialCity,
  saveCity,
  SavedCity,
  WeatherSnapshot,
} from '../utils/weatherService';

export interface SkyWeatherState {
  city: SavedCity | null;
  weather: WeatherSnapshot | null;
  isWeatherLoading: boolean;
  phaseOverride: TimePhaseId | null;
  weatherOverride: WeatherCategory | null;
  activePhase: TimePhaseId;
  activeHourOverride: number | null;
  activeWeather: WeatherCategory;
  activeIsStorm: boolean;
  setPhaseOverride: (phase: TimePhaseId | null) => void;
  setWeatherOverride: (weather: WeatherCategory | null) => void;
  refreshWeather: () => Promise<void>;
  selectCity: (city: SavedCity) => Promise<void>;
}

export function useSkyWeather(): SkyWeatherState {
  const [city, setCity] = useState<SavedCity | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [phaseOverride, setPhaseOverride] = useState<TimePhaseId | null>(null);
  const [weatherOverride, setWeatherOverride] = useState<WeatherCategory | null>(null);
  const [nowHour, setNowHour] = useState(() => {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  });

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNowHour(d.getHours() + d.getMinutes() / 60);
    };
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      setIsWeatherLoading(true);
      const initialCity = await resolveInitialCity();
      if (!active) return;
      setCity(initialCity);
      const snap = await fetchWeatherForCity(initialCity);
      if (!active) return;
      setWeather(snap);
      setIsWeatherLoading(false);

      refreshTimer = setInterval(async () => {
        const updated = await fetchWeatherForCity(initialCity, true);
        if (active) setWeather(updated);
      }, 30 * 60 * 1000);
    };

    init();
    return () => {
      active = false;
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, []);

  const refreshWeather = useCallback(async () => {
    if (!city || isWeatherLoading) return;
    setIsWeatherLoading(true);
    const snap = await fetchWeatherForCity(city, true);
    setWeather(snap);
    setIsWeatherLoading(false);
  }, [city, isWeatherLoading]);

  const selectCity = useCallback(async (selected: SavedCity) => {
    saveCity(selected);
    setCity(selected);
    setIsWeatherLoading(true);
    const snap = await fetchWeatherForCity(selected, true);
    setWeather(snap);
    setIsWeatherLoading(false);
  }, []);

  const activePhase = phaseOverride ?? getTimePhaseId(nowHour);
  const activeHourOverride = phaseOverride ? PHASE_META[phaseOverride].previewHour : null;
  const activeWeather: WeatherCategory = weatherOverride ?? weather?.category ?? 'clear';
  const activeIsStorm = weatherOverride ? false : Boolean(weather?.isStorm);

  return {
    city,
    weather,
    isWeatherLoading,
    phaseOverride,
    weatherOverride,
    activePhase,
    activeHourOverride,
    activeWeather,
    activeIsStorm,
    setPhaseOverride,
    setWeatherOverride,
    refreshWeather,
    selectCity,
  };
}
