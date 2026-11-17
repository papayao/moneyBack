import React, { useEffect, useRef } from 'react';
import { getSkyTheme, WeatherCategory } from '../utils/skyTheme';
import {
  createSkyParticlePool,
  drawSkyAndCelestials,
  drawWeatherParticles,
} from '../utils/skyCanvasRenderer';

interface DynamicSkyBackdropProps {
  weatherCategory: WeatherCategory;
  isStorm?: boolean;
  timeOverrideHour?: number | null;
}

export const DynamicSkyBackdrop: React.FC<DynamicSkyBackdropProps> = ({
  weatherCategory,
  isStorm = false,
  timeOverrideHour = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const weatherRef = useRef(weatherCategory);
  useEffect(() => {
    weatherRef.current = weatherCategory;
  }, [weatherCategory]);

  const isStormRef = useRef(isStorm);
  useEffect(() => {
    isStormRef.current = isStorm;
  }, [isStorm]);

  const timeOverrideRef = useRef(timeOverrideHour);
  useEffect(() => {
    timeOverrideRef.current = timeOverrideHour;
  }, [timeOverrideHour]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const pool = createSkyParticlePool();
    let frameCount = 0;
    let scrollX = 0;
    let rafId: number;

    const render = () => {
      frameCount++;
      scrollX += 2.2; // gentle cloud drift (0.08x => ~0.18 px/frame)
      const currentWeather = weatherRef.current;
      const theme = getSkyTheme(new Date(), currentWeather, timeOverrideRef.current);

      ctx.save();
      ctx.scale(dpr, dpr);

      const horizonY = height;
      drawSkyAndCelestials(
        ctx,
        width,
        height,
        horizonY,
        scrollX,
        frameCount,
        theme,
        currentWeather,
        pool
      );

      // Subtle distant mountain silhouette anchored to viewport bottom
      ctx.save();
      ctx.globalAlpha = 0.42;
      const mtnSpan = 380;
      for (let mx = -mtnSpan; mx < width + mtnSpan; mx += mtnSpan) {
        ctx.fillStyle = theme.mountainFarColor;
        ctx.beginPath();
        ctx.moveTo(mx, height);
        ctx.lineTo(mx + 150, height - 135);
        ctx.lineTo(mx + 310, height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = theme.mountainNearColor;
        ctx.beginPath();
        ctx.moveTo(mx + 180, height);
        ctx.lineTo(mx + 300, height - 96);
        ctx.lineTo(mx + 430, height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Keep night ambient tint subtle and below celestial sky so clear moon & stars stay crisp
      if (theme.ambientOverlayAlpha > 0.005 && currentWeather !== 'clear') {
        ctx.save();
        ctx.globalAlpha = theme.ambientOverlayAlpha * 0.65;
        ctx.fillStyle = theme.ambientOverlayColor;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      drawWeatherParticles(
        ctx,
        width,
        height,
        frameCount,
        currentWeather,
        isStormRef.current,
        pool
      );

      ctx.restore();
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};
