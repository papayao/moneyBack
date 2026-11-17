import { WeatherCategory } from './skyTheme';

export interface SavedCity {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

export interface WeatherSnapshot {
  category: WeatherCategory;
  label: string;
  isStorm: boolean;
  temperatureC: number;
  weatherCode: number;
  cityName: string;
  fetchedAt: number;
  isFallback?: boolean;
}

const CITY_STORAGE_KEY = 'salary_ticker_weather_city';
const CACHE_STORAGE_KEY = 'salary_ticker_weather_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const DEFAULT_CITY: SavedCity = {
  name: '上海',
  latitude: 31.2304,
  longitude: 121.4737,
  country: '中国',
};

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

export function mapWmoCodeToWeather(code: number): {
  category: WeatherCategory;
  label: string;
  isStorm: boolean;
} {
  if (code === 0) return { category: 'clear', label: '晴', isStorm: false };
  if (code === 1) return { category: 'clear', label: '晴间多云', isStorm: false };
  if (code === 2) return { category: 'cloudy', label: '多云', isStorm: false };
  if (code === 3) return { category: 'cloudy', label: '阴', isStorm: false };
  if (code === 45 || code === 48) return { category: 'cloudy', label: '雾', isStorm: false };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    const label = code <= 57 ? '毛毛雨' : code >= 80 ? '阵雨' : code >= 65 ? '大雨' : '雨';
    return { category: 'rain', label, isStorm: false };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { category: 'snow', label: '雪', isStorm: false };
  }
  if (code >= 95 && code <= 99) {
    return { category: 'rain', label: '雷阵雨', isStorm: true };
  }
  return { category: 'clear', label: '晴', isStorm: false };
}

export function loadSavedCity(): SavedCity | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(CITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedCity;
    if (
      typeof parsed?.name === 'string' &&
      typeof parsed?.latitude === 'number' &&
      typeof parsed?.longitude === 'number'
    ) {
      return parsed;
    }
  } catch {
    // Ignore malformed saved city
  }
  return null;
}

export function saveCity(city: SavedCity): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(CITY_STORAGE_KEY, JSON.stringify(city));
  } catch {
    // Ignore quota errors
  }
}

export function loadCachedWeather(
  latitude: number,
  longitude: number,
  nowMs: number = Date.now()
): WeatherSnapshot | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      key: string;
      data: WeatherSnapshot;
    };
    const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    if (parsed?.key === key && parsed?.data && nowMs - parsed.data.fetchedAt < CACHE_TTL_MS) {
      return parsed.data;
    }
  } catch {
    // Ignore cache read error
  }
  return null;
}

function saveCachedWeather(latitude: number, longitude: number, data: WeatherSnapshot): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
    storage.setItem(CACHE_STORAGE_KEY, JSON.stringify({ key, data }));
  } catch {
    // Ignore quota errors
  }
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 4500): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveInitialCity(): Promise<SavedCity> {
  const saved = loadSavedCity();
  if (saved) return saved;

  try {
    const geo = await fetchJsonWithTimeout<{
      city?: string;
      region?: string;
      country?: string;
      latitude?: string | number;
      longitude?: string | number;
    }>('https://get.geojs.io/v1/ip/geo.json', 3000);
    const lat = Number(geo.latitude);
    const lon = Number(geo.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const detected: SavedCity = {
        name: geo.city || geo.region || DEFAULT_CITY.name,
        latitude: lat,
        longitude: lon,
        country: geo.country,
      };
      saveCity(detected);
      return detected;
    }
  } catch {
    // Fall back silently when offline or IP geo unreachable
  }

  return DEFAULT_CITY;
}

export async function searchCities(query: string): Promise<SavedCity[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=5&language=zh&format=json`;
  const data = await fetchJsonWithTimeout<{
    results?: Array<{
      name: string;
      latitude: number;
      longitude: number;
      admin1?: string;
      country?: string;
    }>;
  }>(url, 5000);

  return (data.results || []).map(item => ({
    name: item.name,
    latitude: item.latitude,
    longitude: item.longitude,
    admin1: item.admin1,
    country: item.country,
  }));
}

export async function fetchWeatherForCity(
  city: SavedCity,
  forceRefresh = false
): Promise<WeatherSnapshot> {
  if (!forceRefresh) {
    const cached = loadCachedWeather(city.latitude, city.longitude);
    if (cached) {
      return { ...cached, cityName: city.name };
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=weather_code,temperature_2m&timezone=auto`;
    const data = await fetchJsonWithTimeout<{
      current?: {
        weather_code?: number;
        temperature_2m?: number;
      };
    }>(url, 5000);

    const weatherCode = data.current?.weather_code ?? 0;
    const temperatureC = Math.round(data.current?.temperature_2m ?? 20);
    const mapped = mapWmoCodeToWeather(weatherCode);

    const snapshot: WeatherSnapshot = {
      category: mapped.category,
      label: mapped.label,
      isStorm: mapped.isStorm,
      temperatureC,
      weatherCode,
      cityName: city.name,
      fetchedAt: Date.now(),
      isFallback: false,
    };
    saveCachedWeather(city.latitude, city.longitude, snapshot);
    return snapshot;
  } catch {
    return {
      category: 'clear',
      label: '晴',
      isStorm: false,
      temperatureC: 20,
      weatherCode: 0,
      cityName: city.name,
      fetchedAt: Date.now(),
      isFallback: true,
    };
  }
}
