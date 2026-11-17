# Design Specification: Focus Mode Dynamic Sky & Weather

**Date**: 2026-11-16  
**Status**: Approved

---

## 1. Overview

Upgrade the RPG Focus Mode background (`RpgBackgroundCanvas.tsx`) and top control bar (`FocusView.tsx`) so the sky, sun/moon trajectory, stars, clouds, mountains, and ambient weather react dynamically to:
1. Local clock time across five continuous phases (morning sunrise, noon zenith, afternoon descent, evening sunset glow, night stars & crescent moon).
2. Live weather data from the free, keyless Open-Meteo API, with graceful offline fallback.

---

## 2. Design Constraints & Visual Rules

- **No purple/blue AI gradients**: Dawn and sunset use warm apricot, amber, coral-orange, and slate-blue-grey; night uses deep slate-navy (`#0a111f` to `#1b2838`), never violet/purple.
- **Restrained UI**: The weather/preview pill in `FocusView.tsx` uses `rounded-sm` / `rounded-md`, `border-zinc-200/90` (or dark night contrast if needed, kept crisp white/85 backdrop-blur matching existing buttons).
- **Zero-blocking offline behavior**: Time-of-day sky rendering depends only on `Date` (never blocked by network). Weather particles overlay cleanly when data is available.

---

## 3. Architecture & File Responsibilities

1. `packages/desktop/src/utils/skyTheme.ts`
   - Pure, deterministic functions for time-of-day phase detection, RGB color interpolation, sun/moon parabolic coordinates, star visibility alpha, and weather-adjusted sky/cloud/mountain tinting.
   - Supports 5 named phases plus continuous minute-level interpolation:
     - `morning` (`05:30–09:00`): sun rises near the left horizon (`x ≈ 0.16–0.32`, low elevation); pale cyan-slate top to warm apricot horizon.
     - `noon` (`11:00–14:00`): sun near top-center (`x ≈ 0.48–0.56`, peak elevation); clear sky blue to soft warm cream horizon.
     - `afternoon` (`14:00–17:00`): sun descends modestly to the right (`x ≈ 0.62–0.76`); clear sky gradually warming.
     - `evening` (`17:00–19:30`): sun sinks toward right horizon (`x ≈ 0.80–0.90`); slate-blue upper sky to vivid coral-amber sunset glow.
     - `night` (`19:30–05:30`): deep slate-navy sky, deterministic twinkling pixel stars, crescent moon traversing a night arc, darkened mountains/trees/ground tint.
2. `packages/desktop/src/utils/weatherService.ts`
   - Calls Open-Meteo `forecast` endpoint (`current=weather_code,temperature_2m,is_day`) without an API key.
   - Maps WMO weather codes to 4 visual categories: `clear`, `cloudy`, `rain`, `snow` (with `isStorm` flag for codes `95–99`).
   - Resolves city coordinates via Open-Meteo Geocoding API (`geocoding-api.open-meteo.com/v1/search`) with user-saved city in `localStorage` (`salary_ticker_weather_city`), one-time IP geo lookup fallback (`get.geojs.io/v1/ip/geo.json`, 3s timeout), and default fallback (Beijing `39.9042, 116.4074`).
   - Caches weather responses in `localStorage` (`salary_ticker_weather_cache`) for **30 minutes** per coordinate key.
3. `packages/desktop/src/components/RpgBackgroundCanvas.tsx`
   - Accepts optional `timeOverrideHour?: number | null` and `weatherOverride?: WeatherCondition | null` plus live `weatherCondition`.
   - Renders:
     - Smooth time-interpolated sky gradient + horizon glow band (dawn/sunset).
     - Twinkling pixel stars (fade in/out smoothly at dusk/dawn; dimmed under overcast).
     - Pixel sun (warm layered disc + subtle pixel rays) or pixel crescent moon along parabolic arcs.
     - Parallax clouds (density and tint respond to `clear` vs `cloudy`/`rain`/`snow`).
     - Distant stepped mountains and pine forest tinted by ambient daylight/dusk/night factor.
     - Weather particle layer (pixel rain streaks + ground splash ripples, periodic lightning flash on storms, or drifting pixel snowflakes).
4. `packages/desktop/src/components/FocusView.tsx`
   - Integrates `useWeather` / `weatherService` state.
   - Adds a compact weather/sky pill in the top-right bar (e.g., `晴 22°C · 上午`) that toggles a small popover (`rounded-md`) to:
     - Search and switch city.
     - Preview any of the 5 time phases (`自动 / 早 / 午 / 下午 / 傍晚 / 晚`) and 4 weather types (`自动 / 晴 / 多云 / 雨 / 雪`) without waiting for real-time changes.

---

## 4. Verification Plan

1. Unit tests (`vitest`) for `skyTheme.ts` and `weatherService.ts` (WMO code mapping, 5-phase arc positions, noon center position, afternoon lower than noon, evening glow & night star/moon visibility, cache TTL).
2. TypeScript check and Vite production build (`npm run build --workspace=packages/desktop`).
3. Live visual verification of the desktop Vite dev server via Playwright / browser subagent across all 5 time phases and weather overlays if needed.
