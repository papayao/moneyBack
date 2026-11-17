import { describe, it, expect } from 'vitest';
import { getSkyTheme, getTimePhaseId } from './skyTheme';
import { mapWmoCodeToWeather } from './weatherService';

describe('skyTheme', () => {
  it('classifies the 5 time phases accurately', () => {
    expect(getTimePhaseId(6.5)).toBe('morning');
    expect(getTimePhaseId(12.5)).toBe('noon');
    expect(getTimePhaseId(15.5)).toBe('afternoon');
    expect(getTimePhaseId(18.25)).toBe('evening');
    expect(getTimePhaseId(22.0)).toBe('night');
    expect(getTimePhaseId(3.0)).toBe('night');
  });

  it('positions sun and moon in the upper-right sky while preserving elevation phases', () => {
    const morning = getSkyTheme(new Date(), 'clear', 6.5);
    const noon = getSkyTheme(new Date(), 'clear', 12.5);
    const afternoon = getSkyTheme(new Date(), 'clear', 15.5);
    const evening = getSkyTheme(new Date(), 'clear', 18.25);

    expect(morning.sun.visible).toBe(true);
    expect(morning.sun.xNorm).toBeGreaterThan(0.8);
    expect(morning.sun.yNorm).toBeLessThan(noon.sun.yNorm);

    expect(noon.sun.visible).toBe(true);
    expect(noon.sun.xNorm).toBeGreaterThan(0.84);
    expect(noon.sun.xNorm).toBeLessThan(0.95);
    expect(noon.sun.yNorm).toBeGreaterThan(0.8);

    expect(afternoon.sun.visible).toBe(true);
    expect(afternoon.sun.xNorm).toBeGreaterThan(0.84);
    expect(afternoon.sun.yNorm).toBeLessThan(noon.sun.yNorm);
    expect(afternoon.sun.yNorm).toBeGreaterThan(evening.sun.yNorm);

    expect(evening.sun.visible).toBe(true);
    expect(evening.horizonGlowAlpha).toBeGreaterThan(0.5);
    expect(evening.moon.visible).toBe(false);
  });

  it('shows moon in upper-right sky and twinkling stars at night without sun', () => {
    const night = getSkyTheme(new Date(), 'clear', 22.5);
    expect(night.sun.visible).toBe(false);
    expect(night.moon.visible).toBe(true);
    expect(night.moon.xNorm).toBeGreaterThan(0.8);
    expect(night.moon.yNorm).toBeGreaterThan(0.7);
    expect(night.starAlpha).toBeGreaterThan(0.9);
  });

  it('dims stars and celestial bodies in rainy weather', () => {
    const clearNight = getSkyTheme(new Date(), 'clear', 22.5);
    const rainyNight = getSkyTheme(new Date(), 'rain', 22.5);
    expect(rainyNight.starAlpha).toBeLessThan(clearNight.starAlpha);
    expect(rainyNight.moon.alpha).toBeLessThan(clearNight.moon.alpha);
  });
});

describe('weatherService', () => {
  it('maps WMO codes to clear, cloudy, rain, snow, and storm', () => {
    expect(mapWmoCodeToWeather(0)).toEqual({ category: 'clear', label: '晴', isStorm: false });
    expect(mapWmoCodeToWeather(2)).toEqual({ category: 'cloudy', label: '多云', isStorm: false });
    expect(mapWmoCodeToWeather(63).category).toBe('rain');
    expect(mapWmoCodeToWeather(73).category).toBe('snow');
    expect(mapWmoCodeToWeather(95)).toEqual({
      category: 'rain',
      label: '雷阵雨',
      isStorm: true,
    });
  });
});
