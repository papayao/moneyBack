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

      <div ref={containerRef} className="relative z-20 w-full">
        {children}
      </div>

      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-t from-white/70 via-transparent to-transparent z-10"
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

        if (beamRect.bottom >= containerRect.top + 60) {
          cycleCollisionDetectedRef.current = true;
          const relativeX = beamRect.left - parentRect.left + beamRect.width / 2;
          const relativeY = beamRect.bottom - parentRect.top;

          setCollision({
            detected: true,
            coordinates: { x: relativeX, y: relativeY },
          });
        }
      }
    };

    const interval = setInterval(checkCollision, 50);
    return () => clearInterval(interval);
  }, [containerRef, parentRef]);

  useEffect(() => {
    if (collision.detected) {
      const timer = setTimeout(() => {
        setCollision({ detected: false, coordinates: null });
        cycleCollisionDetectedRef.current = false;
      }, 2000);

      const nextCycleTimer = setTimeout(() => {
        setBeamKey(prev => prev + 1);
      }, (beamOptions.duration + beamOptions.repeatDelay) * 1000);

      return () => {
        clearTimeout(timer);
        clearTimeout(nextCycleTimer);
      };
    }
  }, [collision.detected, beamOptions]);

  // Color schemes (Emerald/Rose streams, without garish AI purple/blue)
  const beamGradient = isPositive
    ? 'from-emerald-500 via-emerald-400 to-transparent'
    : 'from-rose-500 via-rose-400 to-transparent';

  return (
    <>
      <motion.div
        key={beamKey}
        ref={beamRef}
        animate={{
          translateY: ['0px', '450px'],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: beamOptions.duration,
          repeat: Infinity,
          repeatDelay: beamOptions.repeatDelay,
          delay: beamOptions.delay,
          ease: 'linear',
        }}
        style={{
          position: 'absolute',
          left: `${beamOptions.initialX}px`,
          top: '-150px',
        }}
        className={`w-[2px] h-[140px] bg-gradient-to-b ${beamGradient} z-10 pointer-events-none rounded-full`}
      >
        {/* Stream head carrying a small glowing yellow/orange $ symbol */}
        {beamOptions.hasDollar && (
          <div className="absolute -bottom-2.5 -left-2 pointer-events-none select-none">
            <DollarSymbol size={15} />
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {collision.detected && collision.coordinates && (
          <Explosion
            key={`${collision.coordinates.x}-${collision.coordinates.y}`}
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
  const particles = Array.from({ length: 6 });
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
      className="pointer-events-none z-10"
    >
      {/* Shockwave ring */}
      <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ borderColor: particleColor }}
        className="w-8 h-8 rounded-full border border-opacity-60"
      />

      {/* Spark dots */}
      {particles.map((_, i) => {
        const angle = (i / particles.length) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 24 + Math.random() * 14;
        const targetX = Math.cos(rad) * dist;
        const targetY = Math.sin(rad) * dist;

        return (
          <motion.div
            key={`dot-${i}`}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: targetX, y: targetY, scale: 0, opacity: 0 }}
            transition={{ duration: 0.5 + Math.random() * 0.2, ease: 'easeOut' }}
            style={{ backgroundColor: particleColor }}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
          />
        );
      })}

      {/* Bursting Yellow/Orange $ Symbols */}
      {dollarParticles.map((_, i) => {
        const angle = (i / dollarParticles.length) * 360 + 25;
        const rad = (angle * Math.PI) / 180;
        const dist = 28 + Math.random() * 18;
        const targetX = Math.cos(rad) * dist;
        const targetY = Math.sin(rad) * dist;

        return (
          <motion.div
            key={`dollar-${i}`}
            initial={{ x: 0, y: 0, scale: 0.9, opacity: 1, rotate: 0 }}
            animate={{
              x: targetX,
              y: targetY,
              scale: 0.2,
              opacity: 0,
              rotate: Math.random() * 60 - 30,
            }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
          >
            <DollarSymbol size={14} />
          </motion.div>
        );
      })}
    </div>
  );
};
