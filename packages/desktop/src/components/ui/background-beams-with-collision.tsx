import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BackgroundBeamsProps {
  children?: React.ReactNode;
  className?: string;
  isPositive?: boolean;
}

interface BeamConfig {
  initialX: number;
  translateX: number;
  duration: number;
  repeatDelay: number;
  delay: number;
  hasDollar?: boolean;
}

// Reusable SVG Dollar Symbol with Yellow-to-Orange Linear Gradient
export const DollarSymbol: React.FC<{ size?: number; className?: string }> = ({
  size = 18,
  className = '',
}) => {
  const gradientId = `dollar-gold-grad-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-2xs ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" /> {/* bright yellow */}
          <stop offset="45%" stopColor="#fbbf24" /> {/* warm amber */}
          <stop offset="100%" stopColor="#ea580c" /> {/* vivid orange */}
        </linearGradient>
      </defs>
      <text
        x="12"
        y="18.5"
        textAnchor="middle"
        fontSize="21"
        fontWeight="800"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fill={`url(#${gradientId})`}
      >
        $
      </text>
    </svg>
  );
};

export const BackgroundBeamsWithCollision: React.FC<BackgroundBeamsProps> = ({
  children,
  className = '',
  isPositive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const beams: BeamConfig[] = [
    { initialX: 45, translateX: 45, duration: 4, repeatDelay: 3, delay: 0, hasDollar: true },
    { initialX: 160, translateX: 160, duration: 5, repeatDelay: 4, delay: 1, hasDollar: false },
    { initialX: 280, translateX: 280, duration: 4.5, repeatDelay: 2, delay: 2, hasDollar: true },
    { initialX: 420, translateX: 420, duration: 6, repeatDelay: 3, delay: 0.5, hasDollar: false },
    { initialX: 560, translateX: 560, duration: 5.5, repeatDelay: 4, delay: 1.5, hasDollar: true },
    { initialX: 680, translateX: 680, duration: 4.2, repeatDelay: 3, delay: 2.5, hasDollar: false },
  ];

  // Ambient floating $ symbols at various positions
  const ambientDollars = [
    { x: 30, y: 35, size: 16, opacity: 0.55, duration: 4, delay: 0 },
    { x: 110, y: 120, size: 22, opacity: 0.45, duration: 5, delay: 1.2 },
    { x: 230, y: 25, size: 14, opacity: 0.6, duration: 4.5, delay: 0.5 },
    { x: 380, y: 140, size: 20, opacity: 0.4, duration: 6, delay: 2 },
    { x: 500, y: 40, size: 18, opacity: 0.5, duration: 5.2, delay: 1 },
    { x: 620, y: 110, size: 24, opacity: 0.35, duration: 4.8, delay: 1.8 },
  ];

  return (
    <div
      ref={parentRef}
      className={`relative flex items-center w-full justify-center overflow-hidden rounded-md border border-zinc-200/90 bg-white shadow-xs ${className}`}
    >
      {/* Ambient Floating $ Symbols with Yellow/Orange Gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {ambientDollars.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ x: item.x, y: item.y, opacity: item.opacity }}
            animate={{
              y: [item.y, item.y - 18, item.y],
              rotate: [0, 10, -10, 0],
              opacity: [item.opacity * 0.7, item.opacity, item.opacity * 0.7],
            }}
            transition={{
              duration: item.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: item.delay,
            }}
            className="absolute select-none pointer-events-none"
          >
            <DollarSymbol size={item.size} />
          </motion.div>
        ))}
      </div>

      {/* Collision Beams */}
      {beams.map((beam, index) => (
        <CollisionMechanism
          key={`beam-${index}`}
          beamOptions={beam}
          containerRef={containerRef}
          parentRef={parentRef}
          isPositive={isPositive}
        />
      ))}

      <div className="relative z-20 w-full">
        {children}
      </div>

      {/* Bottom collision floor */}
      <div
        ref={containerRef}
        className="absolute bottom-0 inset-x-0 h-1.5 w-full pointer-events-none"
      />
    </div>
  );
};

const CollisionMechanism: React.FC<{
  beamOptions: BeamConfig;
  containerRef: React.RefObject<HTMLDivElement>;
  parentRef: React.RefObject<HTMLDivElement>;
  isPositive: boolean;
}> = ({ beamOptions, containerRef, parentRef, isPositive }) => {
  const [beamKey, setBeamKey] = useState(0);
  const [collision, setCollision] = useState<{
    detected: boolean;
    coordinates: { x: number; y: number } | null;
  }>({
    detected: false,
    coordinates: null,
  });

  const cycleCollisionDetectedRef = useRef(false);
  const beamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkCollision = () => {
      if (
        beamRef.current &&
        containerRef.current &&
        parentRef.current &&
        !cycleCollisionDetectedRef.current
      ) {
        const beamRect = beamRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const parentRect = parentRef.current.getBoundingClientRect();
        const streamHeadBottom = beamRect.bottom + (beamOptions.hasDollar ? 16 : 0);

        if (streamHeadBottom >= containerRect.top) {
          cycleCollisionDetectedRef.current = true;
          const relativeX = beamRect.left - parentRect.left + beamRect.width / 2;
          const relativeY = parentRect.height - 4;

          setCollision({
            detected: true,
            coordinates: { x: relativeX, y: relativeY },
          });
        }
      }
    };

    const interval = setInterval(checkCollision, 30);
    return () => clearInterval(interval);
  }, [containerRef, parentRef, beamKey]);

  useEffect(() => {
    if (!collision.detected) return;

    const resetTimer = setTimeout(() => {
      setCollision({ detected: false, coordinates: null });
      cycleCollisionDetectedRef.current = false;
      setBeamKey(prev => prev + 1);
    }, 1400);

    return () => clearTimeout(resetTimer);
  }, [collision.detected]);

  // Color schemes (Emerald/Rose streams, without garish AI purple/blue)
  const beamGradient = isPositive
    ? 'from-transparent via-emerald-400 to-emerald-500'
    : 'from-transparent via-rose-400 to-rose-500';

  return (
    <>
      {!collision.detected && (
        <motion.div
          key={beamKey}
          ref={beamRef}
          initial={{ translateY: '0px', opacity: 0.95 }}
          animate={{
            translateY: '750px',
            opacity: 1,
          }}
          transition={{
            duration: beamOptions.duration,
            delay: beamKey === 0 ? beamOptions.delay : beamOptions.repeatDelay * 0.5,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            left: `${beamOptions.initialX}px`,
            top: '-150px',
          }}
          className={`w-[2px] h-[120px] bg-gradient-to-b ${beamGradient} z-10 pointer-events-none rounded-full`}
        >
          {/* Stream head carrying a small glowing yellow/orange $ symbol */}
          {beamOptions.hasDollar && (
            <div className="absolute -bottom-[17px] left-1/2 -translate-x-1/2 pointer-events-none select-none">
              <DollarSymbol size={18} />
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {collision.detected && collision.coordinates && (
          <Explosion
            key={`${beamKey}-${collision.coordinates.x}`}
            x={collision.coordinates.x}
            y={collision.coordinates.y}
            isPositive={isPositive}
          />
        )}
      </AnimatePresence>
    </>
  );
};

const Explosion: React.FC<{ x: number; y: number; isPositive: boolean }> = ({
  x,
  y,
  isPositive,
}) => {
  const particles = Array.from({ length: 10 });
  const dollarParticles = Array.from({ length: 4 });
  const particleColor = isPositive ? '#10b981' : '#f43f5e';

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)',
      }}
      className="pointer-events-none z-30"
    >
      {/* Bottom impact flash bar */}
      <motion.div
        initial={{ width: 0, opacity: 1 }}
        animate={{ width: 56, opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{ backgroundColor: particleColor }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[2px] rounded-full blur-[0.5px]"
      />

      {/* Upward-splashing spark shards */}
      {particles.map((_, i) => {
        // Fan out across upward hemisphere (-165deg to -15deg) so shards splash upward from the bottom floor
        const angle = -165 + (i / (particles.length - 1)) * 150;
        const rad = (angle * Math.PI) / 180;
        const dist = 22 + ((i * 13) % 24);
        const targetX = Math.cos(rad) * dist;
        const targetY = Math.sin(rad) * dist;

        return (
          <motion.div
            key={`dot-${i}`}
            initial={{ x: 0, y: 0, scale: 1.1, opacity: 1 }}
            animate={{ x: targetX, y: targetY, scale: 0, opacity: 0 }}
            transition={{ duration: 0.55 + (i % 3) * 0.1, ease: 'easeOut' }}
            style={{ backgroundColor: particleColor }}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
          />
        );
      })}

      {/* Upward-splashing Yellow/Orange $ Symbols */}
      {dollarParticles.map((_, i) => {
        const angle = -150 + (i / (dollarParticles.length - 1)) * 120;
        const rad = (angle * Math.PI) / 180;
        const dist = 28 + ((i * 11) % 20);
        const targetX = Math.cos(rad) * dist;
        const targetY = Math.sin(rad) * dist;

        return (
          <motion.div
            key={`dollar-${i}`}
            initial={{ x: 0, y: 0, scale: 0.95, opacity: 1, rotate: 0 }}
            animate={{
              x: targetX,
              y: targetY,
              scale: 0.25,
              opacity: 0,
              rotate: (i % 2 === 0 ? 1 : -1) * 35,
            }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
          >
            <DollarSymbol size={14} />
          </motion.div>
        );
      })}
    </div>
  );
};
