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
  className?: string;
}

export const BackgroundBeamsWithCollision: React.FC<BackgroundBeamsProps> = ({
  children,
  className = '',
  isPositive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const beams: BeamConfig[] = [
    { initialX: 40, translateX: 40, duration: 4, repeatDelay: 3, delay: 0 },
    { initialX: 160, translateX: 160, duration: 5, repeatDelay: 4, delay: 1 },
    { initialX: 280, translateX: 280, duration: 4.5, repeatDelay: 2, delay: 2 },
    { initialX: 420, translateX: 420, duration: 6, repeatDelay: 3, delay: 0.5 },
    { initialX: 560, translateX: 560, duration: 5.5, repeatDelay: 4, delay: 1.5 },
    { initialX: 680, translateX: 680, duration: 4.2, repeatDelay: 3, delay: 2.5 },
  ];

  return (
    <div
      ref={parentRef}
      className={`relative flex items-center w-full justify-center overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/90 ${className}`}
    >
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
        className="absolute inset-0 pointer-events-none bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10"
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

  const [cycleCollisionDetected, setCycleCollisionDetected] = useState(false);
  const beamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkCollision = () => {
      if (
        beamRef.current &&
        containerRef.current &&
        parentRef.current &&
        !cycleCollisionDetected
      ) {
        const beamRect = beamRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const parentRect = parentRef.current.getBoundingClientRect();

        if (beamRect.bottom >= containerRect.top + 60) {
          const relativeX = beamRect.left - parentRect.left + beamRect.width / 2;
          const relativeY = beamRect.bottom - parentRect.top;

          setCollision({
            detected: true,
            coordinates: { x: relativeX, y: relativeY },
          });
          setCycleCollisionDetected(true);
        }
      }
    };

    const interval = setInterval(checkCollision, 50);
    return () => clearInterval(interval);
  }, [cycleCollisionDetected, containerRef, parentRef]);

  useEffect(() => {
    if (collision.detected) {
      const timer = setTimeout(() => {
        setCollision({ detected: false, coordinates: null });
        setCycleCollisionDetected(false);
      }, 2000);

      const nextCycleTimer = setTimeout(() => {
        setBeamKey(prev => prev + 1);
      }, (beamOptions.duration + beamOptions.repeatDelay) * 1000);

      return () => {
        clearTimeout(timer);
        clearTimeout(nextCycleTimer);
      };
    }
  }, [collision, beamOptions]);

  // Color schemes (NO purple/blue gradients)
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
      />

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
  const particles = Array.from({ length: 8 });
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

      {/* Spark particles */}
      {particles.map((_, i) => {
        const angle = (i / particles.length) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = 28 + Math.random() * 16;
        const targetX = Math.cos(rad) * dist;
        const targetY = Math.sin(rad) * dist;

        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: targetX, y: targetY, scale: 0, opacity: 0 }}
            transition={{ duration: 0.5 + Math.random() * 0.2, ease: 'easeOut' }}
            style={{ backgroundColor: particleColor }}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
          />
        );
      })}
    </div>
  );
};
