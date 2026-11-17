import { SkyTheme, WeatherCategory } from './skyTheme';

export interface SkyStar {
  nx: number;
  ny: number;
  size: number;
  phase: number;
}

export interface RainDrop {
  x: number;
  y: number;
  len: number;
  speed: number;
}

export interface SnowFlake {
  x: number;
  y: number;
  size: number;
  speedY: number;
  driftPhase: number;
}

export interface SkyParticlePool {
  stars: SkyStar[];
  raindrops: RainDrop[];
  snowflakes: SnowFlake[];
  moonCanvas: HTMLCanvasElement;
  lightningAlpha: number;
}

export function createSkyParticlePool(): SkyParticlePool {
  const stars: SkyStar[] = Array.from({ length: 56 }, (_, idx) => {
    const seed1 = Math.sin(idx * 12.9898) * 43758.5453;
    const seed2 = Math.sin(idx * 78.233) * 24634.6345;
    return {
      nx: seed1 - Math.floor(seed1),
      ny: (seed2 - Math.floor(seed2)) * 0.72,
      size: idx % 5 === 0 ? 3 : 2,
      phase: idx * 0.7,
    };
  });

  const raindrops: RainDrop[] = Array.from({ length: 90 }, () => ({
    x: Math.random() * 1920,
    y: Math.random() * 1080,
    len: 10 + Math.random() * 10,
    speed: 9 + Math.random() * 5,
  }));

  const snowflakes: SnowFlake[] = Array.from({ length: 68 }, () => ({
    x: Math.random() * 1920,
    y: Math.random() * 1080,
    size: Math.random() < 0.35 ? 3 : 2,
    speedY: 0.9 + Math.random() * 1.1,
    driftPhase: Math.random() * Math.PI * 2,
  }));

  // Isolated offscreen canvas for luminous warm yellow-white crescent moon
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = 64;
  moonCanvas.height = 64;
  const mctx = moonCanvas.getContext('2d');
  if (mctx) {
    const moonGrad = mctx.createRadialGradient(26, 26, 4, 32, 32, 22);
    moonGrad.addColorStop(0, '#ffffff');
    moonGrad.addColorStop(0.5, '#fffbeb');
    moonGrad.addColorStop(1, '#fef08a');
    mctx.fillStyle = moonGrad;
    mctx.beginPath();
    mctx.arc(32, 32, 20, 0, Math.PI * 2);
    mctx.fill();

    mctx.globalCompositeOperation = 'destination-out';
    mctx.beginPath();
    mctx.arc(41, 25, 17, 0, Math.PI * 2);
    mctx.fill();
  }

  return {
    stars,
    raindrops,
    snowflakes,
    moonCanvas,
    lightningAlpha: 0,
  };
}

export function drawSkyAndCelestials(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  horizonY: number,
  scrollX: number,
  frameCount: number,
  theme: SkyTheme,
  weather: WeatherCategory,
  pool: SkyParticlePool
): void {
  // Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, theme.skyTop);
  skyGrad.addColorStop(0.55, theme.skyMid);
  skyGrad.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Horizon Sunrise / Sunset Afterglow
  if (theme.horizonGlowAlpha > 0.01) {
    ctx.save();
    const glowX = theme.sun.visible ? theme.sun.xNorm * width : width * 0.5;
    const glowRadius = Math.max(width, horizonY) * 0.55;
    const radGrad = ctx.createRadialGradient(glowX, horizonY, 12, glowX, horizonY, glowRadius);
    radGrad.addColorStop(0, theme.horizonGlowColor);
    radGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = theme.horizonGlowAlpha;
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, width, horizonY);
    ctx.restore();
  }

  // Twinkling Pixel Stars
  if (theme.starAlpha > 0.01) {
    ctx.save();
    for (const st of pool.stars) {
      const twinkle = 0.45 + 0.55 * Math.sin(frameCount * 0.035 + st.phase);
      ctx.globalAlpha = theme.starAlpha * twinkle;
      ctx.fillStyle = '#f8fafc';
      const sx = Math.floor(st.nx * width);
      const sy = Math.floor(st.ny * horizonY);
      ctx.fillRect(sx, sy, st.size, st.size);
    }
    ctx.restore();
  }

  // Warm Amber-Orange Sun with Radiating Rays
  if (theme.sun.visible && theme.sun.alpha > 0.01) {
    const sunX = Math.round(theme.sun.xNorm * width);
    const sunY = Math.round(horizonY - theme.sun.yNorm * (horizonY - 28));
    ctx.save();

    // Soft radial orange-gold aura
    const aura = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 64);
    aura.addColorStop(0, theme.sunHaloColor);
    aura.addColorStop(0.45, theme.sunCoreColor);
    aura.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.globalAlpha = theme.sun.alpha * 0.45;
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 64, 0, Math.PI * 2);
    ctx.fill();

    // Radiating Sunbeams (12 alternating long/short tapered rays, gently rotating)
    const rayCount = 12;
    const baseAngle = frameCount * 0.0035;
    for (let i = 0; i < rayCount; i++) {
      const angle = baseAngle + (i * Math.PI * 2) / rayCount;
      const isLong = i % 2 === 0;
      const innerR = 23;
      const outerR = isLong ? 46 : 36;
      const halfSpread = isLong ? 0.095 : 0.075;

      const x1 = sunX + Math.cos(angle - halfSpread) * innerR;
      const y1 = sunY + Math.sin(angle - halfSpread) * innerR;
      const x2 = sunX + Math.cos(angle + halfSpread) * innerR;
      const y2 = sunY + Math.sin(angle + halfSpread) * innerR;
      const tipX = sunX + Math.cos(angle) * outerR;
      const tipY = sunY + Math.sin(angle) * outerR;

      const rayGrad = ctx.createLinearGradient(
        sunX + Math.cos(angle) * innerR,
        sunY + Math.sin(angle) * innerR,
        tipX,
        tipY
      );
      rayGrad.addColorStop(0, theme.sunCoreColor);
      rayGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');

      ctx.globalAlpha = theme.sun.alpha * (isLong ? 0.85 : 0.65);
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      ctx.fill();
    }

    // Golden-Orange Sun Disc with bright center & warm rim
    const discGrad = ctx.createRadialGradient(sunX - 4, sunY - 4, 2, sunX, sunY, 20);
    discGrad.addColorStop(0, '#fef08a');
    discGrad.addColorStop(0.55, theme.sunCoreColor);
    discGrad.addColorStop(1, theme.sunHaloColor);
    ctx.globalAlpha = theme.sun.alpha;
    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Warm Yellow-White Crescent Moon (Night sky, extra bright on clear nights)
  if (theme.moon.visible && theme.moon.alpha > 0.01) {
    const moonX = Math.round(theme.moon.xNorm * width);
    const moonY = Math.round(horizonY - theme.moon.yNorm * (horizonY - 28));
    const isClear = weather === 'clear';
    const haloRadius = isClear ? 58 : 42;
    ctx.save();
    const moonHalo = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, haloRadius);
    moonHalo.addColorStop(0, isClear ? 'rgba(255, 251, 235, 0.68)' : 'rgba(254, 243, 199, 0.36)');
    moonHalo.addColorStop(0.45, isClear ? 'rgba(254, 240, 138, 0.28)' : 'rgba(253, 230, 138, 0.12)');
    moonHalo.addColorStop(1, 'rgba(254, 243, 199, 0)');
    ctx.globalAlpha = theme.moon.alpha;
    ctx.fillStyle = moonHalo;
    ctx.beginPath();
    ctx.arc(moonX, moonY, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    if (isClear) {
      ctx.shadowColor = 'rgba(254, 249, 195, 0.95)';
      ctx.shadowBlur = 18;
    }
    ctx.drawImage(pool.moonCanvas, moonX - 32, moonY - 32);
    ctx.restore();
  }

  // Pixel Clouds (exact integer tile indices prevent floating-point flicker)
  ctx.fillStyle = theme.cloudColor;
  const cloudSpan = weather === 'clear' ? 420 : 250;
  const cloudScroll = scrollX * 0.08;
  const firstCloudIdx = Math.floor(cloudScroll / cloudSpan) - 1;
  const lastCloudIdx = Math.floor((cloudScroll + width) / cloudSpan) + 1;
  for (let idx = firstCloudIdx; idx <= lastCloudIdx; idx++) {
    const cx = Math.round(idx * cloudSpan - cloudScroll);
    const wrappedIdx = ((idx % 7) + 7) % 7;
    const cy = 72 + ((wrappedIdx * 37) % 60);
    ctx.fillRect(cx, cy, 68, 16);
    ctx.fillRect(cx + 12, cy - 10, 44, 10);
    ctx.fillRect(cx + 140, cy + 28, 52, 14);
    ctx.fillRect(cx + 150, cy + 18, 32, 10);
  }
}

export function drawWeatherParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  horizonY: number,
  frameCount: number,
  weather: WeatherCategory,
  isStorm: boolean,
  pool: SkyParticlePool
): void {
  if (weather === 'rain') {
    ctx.save();
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const r of pool.raindrops) {
      r.x -= r.speed * 0.25;
      r.y += r.speed;
      if (r.y > horizonY) {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
        ctx.fillRect(r.x % width, horizonY - 2, 3, 2);
        r.y = -12;
        r.x = Math.random() * (width + 120);
      }
      if (r.x < -20) r.x += width + 40;
      const rx = r.x % (width + 40);
      ctx.moveTo(rx, r.y);
      ctx.lineTo(rx - r.len * 0.25, r.y + r.len);
    }
    ctx.stroke();

    if (isStorm && pool.lightningAlpha <= 0 && Math.random() < 0.004) {
      pool.lightningAlpha = 0.42;
    }
    if (pool.lightningAlpha > 0.01) {
      ctx.fillStyle = `rgba(248, 250, 252, ${pool.lightningAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, width, horizonY);
      pool.lightningAlpha *= 0.84;
    } else {
      pool.lightningAlpha = 0;
    }
    ctx.restore();
  } else if (weather === 'snow') {
    ctx.save();
    ctx.fillStyle = 'rgba(248, 250, 252, 0.82)';
    for (const sf of pool.snowflakes) {
      sf.y += sf.speedY;
      sf.x += Math.sin(frameCount * 0.02 + sf.driftPhase) * 0.45;
      if (sf.y > horizonY) {
        sf.y = -6;
        sf.x = Math.random() * width;
      }
      const sx = ((sf.x % width) + width) % width;
      ctx.fillRect(Math.round(sx), Math.round(sf.y), sf.size, sf.size);
    }
    ctx.restore();
  }
}
