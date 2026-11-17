export type TimePhaseId = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

export type WeatherCategory = 'clear' | 'cloudy' | 'rain' | 'snow';

export interface CelestialPosition {
  visible: boolean;
  xNorm: number; // 0..1 across canvas width
  yNorm: number; // 0..1 above groundY (0 = horizon, 1 = top of sky)
  alpha: number;
}

export interface SkyTheme {
  phase: TimePhaseId;
  phaseLabel: string;
  hourFloat: number;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  horizonGlowColor: string;
  horizonGlowAlpha: number;
  sun: CelestialPosition;
  sunCoreColor: string;
  sunHaloColor: string;
  moon: CelestialPosition;
  starAlpha: number;
  cloudColor: string;
  mountainFarColor: string;
  mountainNearColor: string;
  snowCapColor: string;
  treeFoliageColor: string;
  treeTrunkColor: string;
  grassTopColor: string;
  grassEdgeColor: string;
  ambientOverlayColor: string;
  ambientOverlayAlpha: number;
}

interface SkyKeyframe {
  hour: number;
  skyTop: [number, number, number];
  skyMid: [number, number, number];
  skyBottom: [number, number, number];
  horizonGlow: [number, number, number];
  horizonGlowAlpha: number;
  cloud: [number, number, number];
  cloudAlpha: number;
  mtnFar: [number, number, number];
  mtnNear: [number, number, number];
  snowCap: [number, number, number];
  treeFoliage: [number, number, number];
  treeTrunk: [number, number, number];
  grassTop: [number, number, number];
  grassEdge: [number, number, number];
  sunCore: [number, number, number];
  sunHalo: [number, number, number];
  ambientTint: [number, number, number];
  ambientAlpha: number;
}

const KEYFRAMES: SkyKeyframe[] = [
  {
    // 00:00 Deep Night
    hour: 0,
    skyTop: [9, 13, 22],
    skyMid: [15, 23, 42],
    skyBottom: [30, 41, 59],
    horizonGlow: [51, 65, 85],
    horizonGlowAlpha: 0.08,
    cloud: [51, 65, 85],
    cloudAlpha: 0.45,
    mtnFar: [30, 41, 59],
    mtnNear: [15, 23, 42],
    snowCap: [148, 163, 184],
    treeFoliage: [6, 78, 59],
    treeTrunk: [69, 26, 3],
    grassTop: [5, 150, 105],
    grassEdge: [4, 120, 87],
    sunCore: [253, 224, 71],
    sunHalo: [251, 191, 36],
    ambientTint: [2, 6, 23],
    ambientAlpha: 0.28,
  },
  {
    // 05:00 Pre-dawn
    hour: 5,
    skyTop: [19, 31, 51],
    skyMid: [39, 58, 82],
    skyBottom: [92, 98, 112],
    horizonGlow: [251, 146, 60],
    horizonGlowAlpha: 0.25,
    cloud: [148, 163, 184],
    cloudAlpha: 0.55,
    mtnFar: [51, 65, 85],
    mtnNear: [30, 41, 59],
    snowCap: [203, 213, 225],
    treeFoliage: [13, 95, 80],
    treeTrunk: [92, 42, 10],
    grassTop: [10, 168, 118],
    grassEdge: [5, 135, 95],
    sunCore: [253, 186, 116],
    sunHalo: [251, 146, 60],
    ambientTint: [15, 23, 42],
    ambientAlpha: 0.16,
  },
  {
    // 06:45 Morning Sunrise (早上太阳刚升起)
    hour: 6.75,
    skyTop: [96, 152, 206],
    skyMid: [186, 220, 240],
    skyBottom: [254, 226, 179],
    horizonGlow: [251, 191, 36],
    horizonGlowAlpha: 0.5,
    cloud: [255, 247, 237],
    cloudAlpha: 0.82,
    mtnFar: [148, 163, 184],
    mtnNear: [100, 116, 139],
    snowCap: [255, 251, 235],
    treeFoliage: [15, 118, 110],
    treeTrunk: [120, 53, 15],
    grassTop: [16, 185, 129],
    grassEdge: [5, 150, 105],
    sunCore: [251, 191, 36],
    sunHalo: [249, 115, 22],
    ambientTint: [251, 191, 36],
    ambientAlpha: 0.04,
  },
  {
    // 10:00 Forenoon
    hour: 10,
    skyTop: [125, 211, 252],
    skyMid: [224, 242, 254],
    skyBottom: [254, 243, 199],
    horizonGlow: [254, 240, 138],
    horizonGlowAlpha: 0.12,
    cloud: [255, 255, 255],
    cloudAlpha: 0.84,
    mtnFar: [186, 198, 214],
    mtnNear: [148, 163, 184],
    snowCap: [248, 250, 252],
    treeFoliage: [15, 118, 110],
    treeTrunk: [120, 53, 15],
    grassTop: [16, 185, 129],
    grassEdge: [5, 150, 105],
    sunCore: [251, 191, 36],
    sunHalo: [245, 158, 11],
    ambientTint: [255, 255, 255],
    ambientAlpha: 0,
  },
  {
    // 12:30 Noon (中午在正中)
    hour: 12.5,
    skyTop: [96, 165, 250],
    skyMid: [219, 234, 254],
    skyBottom: [240, 249, 255],
    horizonGlow: [255, 255, 255],
    horizonGlowAlpha: 0.05,
    cloud: [255, 255, 255],
    cloudAlpha: 0.88,
    mtnFar: [203, 213, 225],
    mtnNear: [148, 163, 184],
    snowCap: [248, 250, 252],
    treeFoliage: [15, 118, 110],
    treeTrunk: [120, 53, 15],
    grassTop: [16, 185, 129],
    grassEdge: [5, 150, 105],
    sunCore: [251, 191, 36],
    sunHalo: [245, 158, 11],
    ambientTint: [255, 255, 255],
    ambientAlpha: 0,
  },
  {
    // 15:30 Afternoon (下午下降一点点)
    hour: 15.5,
    skyTop: [110, 178, 235],
    skyMid: [207, 231, 250],
    skyBottom: [254, 243, 199],
    horizonGlow: [253, 224, 71],
    horizonGlowAlpha: 0.16,
    cloud: [255, 252, 245],
    cloudAlpha: 0.82,
    mtnFar: [186, 196, 212],
    mtnNear: [136, 150, 172],
    snowCap: [255, 251, 235],
    treeFoliage: [15, 118, 110],
    treeTrunk: [120, 53, 15],
    grassTop: [16, 185, 129],
    grassEdge: [5, 150, 105],
    sunCore: [245, 158, 11],
    sunHalo: [234, 88, 12],
    ambientTint: [251, 191, 36],
    ambientAlpha: 0.03,
  },
  {
    // 18:15 Evening Sunset (傍晚夕阳余晖，无紫/蓝紫渐变)
    hour: 18.25,
    skyTop: [51, 65, 85],
    skyMid: [194, 106, 74],
    skyBottom: [251, 146, 60],
    horizonGlow: [245, 158, 11],
    horizonGlowAlpha: 0.68,
    cloud: [253, 186, 116],
    cloudAlpha: 0.78,
    mtnFar: [90, 82, 92],
    mtnNear: [55, 52, 64],
    snowCap: [254, 215, 170],
    treeFoliage: [17, 94, 89],
    treeTrunk: [90, 38, 12],
    grassTop: [13, 148, 106],
    grassEdge: [6, 110, 80],
    sunCore: [249, 115, 22],
    sunHalo: [234, 88, 12],
    ambientTint: [234, 88, 12],
    ambientAlpha: 0.12,
  },
  {
    // 19:45 Dusk -> Night
    hour: 19.75,
    skyTop: [15, 23, 42],
    skyMid: [30, 41, 59],
    skyBottom: [71, 85, 105],
    horizonGlow: [217, 119, 6],
    horizonGlowAlpha: 0.16,
    cloud: [71, 85, 105],
    cloudAlpha: 0.5,
    mtnFar: [40, 52, 71],
    mtnNear: [22, 32, 50],
    snowCap: [165, 180, 200],
    treeFoliage: [6, 78, 59],
    treeTrunk: [69, 26, 3],
    grassTop: [5, 150, 105],
    grassEdge: [4, 120, 87],
    sunCore: [251, 146, 60],
    sunHalo: [234, 88, 12],
    ambientTint: [2, 6, 23],
    ambientAlpha: 0.24,
  },
  {
    // 24:00 Wrap to Deep Night
    hour: 24,
    skyTop: [9, 13, 22],
    skyMid: [15, 23, 42],
    skyBottom: [30, 41, 59],
    horizonGlow: [51, 65, 85],
    horizonGlowAlpha: 0.08,
    cloud: [51, 65, 85],
    cloudAlpha: 0.45,
    mtnFar: [30, 41, 59],
    mtnNear: [15, 23, 42],
    snowCap: [148, 163, 184],
    treeFoliage: [6, 78, 59],
    treeTrunk: [69, 26, 3],
    grassTop: [5, 150, 105],
    grassEdge: [4, 120, 87],
    sunCore: [253, 224, 71],
    sunHalo: [251, 191, 36],
    ambientTint: [2, 6, 23],
    ambientAlpha: 0.28,
  },
];

export const PHASE_META: Record<TimePhaseId, { label: string; previewHour: number }> = {
  morning: { label: '早上', previewHour: 6.75 },
  noon: { label: '中午', previewHour: 12.5 },
  afternoon: { label: '下午', previewHour: 15.5 },
  evening: { label: '傍晚', previewHour: 18.25 },
  night: { label: '晚上', previewHour: 22.5 },
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function blendRgb(
  base: [number, number, number],
  target: [number, number, number],
  amount: number
): [number, number, number] {
  return lerpRgb(base, target, clamp01(amount));
}

function toRgbStr(c: [number, number, number]): string {
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function toRgbaStr(c: [number, number, number], alpha: number): string {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${clamp01(alpha).toFixed(3)})`;
}

export function getTimePhaseId(hourFloat: number): TimePhaseId {
  const h = ((hourFloat % 24) + 24) % 24;
  if (h >= 5.5 && h < 11) return 'morning';
  if (h >= 11 && h < 14) return 'noon';
  if (h >= 14 && h < 17) return 'afternoon';
  if (h >= 17 && h < 19.5) return 'evening';
  return 'night';
}

export function getSkyTheme(
  date: Date = new Date(),
  weather: WeatherCategory = 'clear',
  overrideHour?: number | null
): SkyTheme {
  const rawHour =
    overrideHour !== undefined && overrideHour !== null
      ? overrideHour
      : date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const hourFloat = ((rawHour % 24) + 24) % 24;

  // Locate surrounding keyframes
  let prev = KEYFRAMES[0];
  let next = KEYFRAMES[KEYFRAMES.length - 1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (hourFloat >= KEYFRAMES[i].hour && hourFloat <= KEYFRAMES[i + 1].hour) {
      prev = KEYFRAMES[i];
      next = KEYFRAMES[i + 1];
      break;
    }
  }
  const span = Math.max(0.0001, next.hour - prev.hour);
  const t = clamp01((hourFloat - prev.hour) / span);

  let skyTop = lerpRgb(prev.skyTop, next.skyTop, t);
  let skyMid = lerpRgb(prev.skyMid, next.skyMid, t);
  let skyBottom = lerpRgb(prev.skyBottom, next.skyBottom, t);
  let horizonGlow = lerpRgb(prev.horizonGlow, next.horizonGlow, t);
  let horizonGlowAlpha = lerp(prev.horizonGlowAlpha, next.horizonGlowAlpha, t);
  let cloud = lerpRgb(prev.cloud, next.cloud, t);
  let cloudAlpha = lerp(prev.cloudAlpha, next.cloudAlpha, t);
  let mtnFar = lerpRgb(prev.mtnFar, next.mtnFar, t);
  let mtnNear = lerpRgb(prev.mtnNear, next.mtnNear, t);
  let snowCap = lerpRgb(prev.snowCap, next.snowCap, t);
  const treeFoliage = lerpRgb(prev.treeFoliage, next.treeFoliage, t);
  const treeTrunk = lerpRgb(prev.treeTrunk, next.treeTrunk, t);
  const grassTop = lerpRgb(prev.grassTop, next.grassTop, t);
  const grassEdge = lerpRgb(prev.grassEdge, next.grassEdge, t);
  const sunCore = lerpRgb(prev.sunCore, next.sunCore, t);
  const sunHalo = lerpRgb(prev.sunHalo, next.sunHalo, t);
  let ambientTint = lerpRgb(prev.ambientTint, next.ambientTint, t);
  let ambientAlpha = lerp(prev.ambientAlpha, next.ambientAlpha, t);

  // Sun trajectory: 05:30 -> 19:15 (13.75h arc), peaking at ~12:22 right in center
  const sunStart = 5.5;
  const sunEnd = 19.25;
  const sunVisible = hourFloat >= sunStart && hourFloat <= sunEnd;
  const sunProgress = clamp01((hourFloat - sunStart) / (sunEnd - sunStart));
  const sunElevation = sunVisible ? Math.sin(sunProgress * Math.PI) : 0;
  const sunFade = sunVisible
    ? clamp01(Math.min((hourFloat - sunStart) / 0.5, (sunEnd - hourFloat) / 0.5))
    : 0;

  // Moon trajectory: 19:00 -> 05:30 (10.5h arc)
  const moonHoursSinceRise = (hourFloat - 19 + 24) % 24;
  const moonDuration = 10.5;
  const moonVisible = moonHoursSinceRise >= 0 && moonHoursSinceRise <= moonDuration;
  const moonProgress = clamp01(moonHoursSinceRise / moonDuration);
  const moonElevation = moonVisible ? Math.sin(moonProgress * Math.PI) : 0;
  const moonFade = moonVisible
    ? clamp01(
        Math.min(moonHoursSinceRise / 0.75, (moonDuration - moonHoursSinceRise) / 0.75)
      )
    : 0;

  // Star visibility: fade in 18:45->20:00, fade out 04:45->06:00
  let starAlpha = 0;
  if (hourFloat >= 18.75) {
    starAlpha = clamp01((hourFloat - 18.75) / 1.25);
  } else if (hourFloat <= 6.0) {
    starAlpha = clamp01((6.0 - hourFloat) / 1.25);
  }

  // Apply weather attenuation & overcast tinting
  let sunWeatherAlpha = 1;
  let moonWeatherAlpha = 1;
  if (weather === 'cloudy') {
    const slate: [number, number, number] = [148, 163, 184];
    const isNightish = hourFloat >= 19.25 || hourFloat <= 5.5;
    const overcastTarget: [number, number, number] = isNightish ? [30, 41, 59] : slate;
    skyTop = blendRgb(skyTop, overcastTarget, 0.38);
    skyMid = blendRgb(skyMid, overcastTarget, 0.34);
    skyBottom = blendRgb(skyBottom, overcastTarget, 0.28);
    cloud = blendRgb(cloud, isNightish ? [71, 85, 105] : [203, 213, 225], 0.45);
    cloudAlpha = Math.min(0.92, cloudAlpha + 0.1);
    horizonGlowAlpha *= 0.55;
    sunWeatherAlpha = 0.55;
    moonWeatherAlpha = 0.5;
    starAlpha *= 0.45;
  } else if (weather === 'rain') {
    const isNightish = hourFloat >= 19.25 || hourFloat <= 5.5;
    const stormTarget: [number, number, number] = isNightish ? [15, 23, 42] : [100, 116, 139];
    skyTop = blendRgb(skyTop, stormTarget, 0.62);
    skyMid = blendRgb(skyMid, stormTarget, 0.58);
    skyBottom = blendRgb(skyBottom, [148, 163, 184], isNightish ? 0.25 : 0.45);
    cloud = blendRgb(cloud, isNightish ? [51, 65, 85] : [148, 163, 184], 0.65);
    cloudAlpha = 0.92;
    mtnFar = blendRgb(mtnFar, stormTarget, 0.35);
    mtnNear = blendRgb(mtnNear, stormTarget, 0.35);
    horizonGlowAlpha *= 0.25;
    sunWeatherAlpha = 0.2;
    moonWeatherAlpha = 0.2;
    starAlpha *= 0.1;
    ambientTint = [15, 23, 42];
    ambientAlpha = Math.max(ambientAlpha, 0.14);
  } else if (weather === 'snow') {
    const isNightish = hourFloat >= 19.25 || hourFloat <= 5.5;
    const snowSky: [number, number, number] = isNightish ? [30, 41, 59] : [203, 213, 225];
    skyTop = blendRgb(skyTop, snowSky, 0.48);
    skyMid = blendRgb(skyMid, isNightish ? [51, 65, 85] : [226, 232, 240], 0.48);
    skyBottom = blendRgb(skyBottom, isNightish ? [71, 85, 105] : [241, 245, 249], 0.5);
    snowCap = blendRgb(snowCap, [255, 255, 255], 0.7);
    cloud = blendRgb(cloud, isNightish ? [100, 116, 139] : [241, 245, 249], 0.5);
    horizonGlowAlpha *= 0.4;
    sunWeatherAlpha = 0.35;
    moonWeatherAlpha = 0.35;
    starAlpha *= 0.2;
  }

  const phase = getTimePhaseId(hourFloat);

  return {
    phase,
    phaseLabel: PHASE_META[phase].label,
    hourFloat,
    skyTop: toRgbStr(skyTop),
    skyMid: toRgbStr(skyMid),
    skyBottom: toRgbStr(skyBottom),
    horizonGlowColor: toRgbStr(horizonGlow),
    horizonGlowAlpha,
    sun: {
      visible: sunVisible && sunFade > 0.01,
      xNorm: 0.84 + sunProgress * 0.09,
      yNorm: 0.12 + sunElevation * 0.72,
      alpha: sunFade * sunWeatherAlpha,
    },
    sunCoreColor: toRgbStr(sunCore),
    sunHaloColor: toRgbStr(sunHalo),
    moon: {
      visible: moonVisible && moonFade > 0.01,
      xNorm: 0.85 + moonProgress * 0.07,
      yNorm: 0.7 + moonElevation * 0.14,
      alpha: moonFade * moonWeatherAlpha,
    },
    starAlpha,
    cloudColor: toRgbaStr(cloud, cloudAlpha),
    mountainFarColor: toRgbStr(mtnFar),
    mountainNearColor: toRgbStr(mtnNear),
    snowCapColor: toRgbStr(snowCap),
    treeFoliageColor: toRgbStr(treeFoliage),
    treeTrunkColor: toRgbStr(treeTrunk),
    grassTopColor: toRgbStr(grassTop),
    grassEdgeColor: toRgbStr(grassEdge),
    ambientOverlayColor: toRgbStr(ambientTint),
    ambientOverlayAlpha: ambientAlpha,
  };
}
