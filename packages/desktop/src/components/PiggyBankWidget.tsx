import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, Edit2 } from 'lucide-react';

interface PiggyBankProps {
  currentSavings: number;
  isPrivacyMode: boolean;
  onAddSavings: (amount: number) => void;
  onUpdateTotalSavings?: (total: number) => void;
}

interface CoinParticle {
  id: number;
  x: number;
  y: number;
  vy: number;
  vx: number;
  angle: number;
  vAngle: number;
  scale: number;
  delay: number;
  entered: boolean;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingText {
  text: string;
  y: number;
  alpha: number;
}

export const PiggyBankWidget: React.FC<PiggyBankProps> = ({
  currentSavings,
  isPrivacyMode,
  onAddSavings,
  onUpdateTotalSavings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [baseInput, setBaseInput] = useState(currentSavings.toString());
  const [displaySavings, setDisplaySavings] = useState(currentSavings);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const animState = useRef({
    squashX: 1,
    squashY: 1,
    squashVelX: 0,
    squashVelY: 0,
    happyTimer: 0,
    blinkTimer: 0,
    isHovered: false,
    breathPhase: 0,
    coins: [] as CoinParticle[],
    sparks: [] as SparkParticle[],
    floatingTexts: [] as FloatingText[],
  });

  // Smoothly roll displaySavings towards currentSavings
  useEffect(() => {
    let raf: number;
    const step = () => {
      setDisplaySavings(prev => {
        const diff = currentSavings - prev;
        if (Math.abs(diff) < 0.5) return currentSavings;
        return prev + diff * 0.18;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [currentSavings]);

  // Spawn coins and trigger drop animation
  const triggerCoinDrop = useCallback(
    (amount: number) => {
      const state = animState.current;
      const coinCount = amount >= 5000 ? 5 : amount >= 1000 ? 3 : amount >= 200 ? 2 : 1;
      const slotX = 82;
      const slotY = 76;

      for (let i = 0; i < coinCount; i++) {
        const startX = slotX + (Math.random() - 0.5) * 6;
        state.coins.push({
          id: Date.now() + i,
          x: startX,
          y: 12 - i * 20,
          vy: 0.6,
          vx: (slotX - startX) * 0.04,
          angle: Math.random() * Math.PI,
          vAngle: 0.15 + Math.random() * 0.05,
          scale: 1,
          delay: i * 9,
          entered: false,
        });
      }

      setTimeout(() => {
        state.floatingTexts.push({
          text: `+¥${amount.toLocaleString()}`,
          y: slotY - 14,
          alpha: 1,
        });
        onAddSavings(amount);
      }, 270);
    },
    [onAddSavings]
  );

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(amountInput);
    if (!isNaN(val) && val !== 0) {
      setAmountInput('');
      setIsOpen(false);
      triggerCoinDrop(val);
    }
  };

  const handleSaveBase = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(baseInput);
    if (!isNaN(val) && onUpdateTotalSavings) {
      onUpdateTotalSavings(Math.max(0, val));
    }
    setIsEditingBase(false);
  };

  // Main Canvas 2D Render Loop (3/4 Golden 3D Piggy Bank matching reference image)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 160;
    const height = 168;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    let animationFrameId: number;

    const drawCoin = (c: CoinParticle) => {
      ctx.save();
      ctx.translate(c.x, c.y);
      const cosA = Math.cos(c.angle);
      const absCos = Math.max(0.15, Math.abs(cosA));
      const r = 15 * c.scale;
      const thickness = 3.4;

      // 3D metallic edge rim
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(cosA >= 0 ? thickness : -thickness, 0, r * absCos, r, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer coin ring gradient (matching reference gold coin)
      const outerGrad = ctx.createLinearGradient(-r, -r, r, r);
      outerGrad.addColorStop(0, '#fde047');
      outerGrad.addColorStop(0.4, '#fbbf24');
      outerGrad.addColorStop(1, '#f59e0b');

      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * absCos, r, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Inner recessed coin face & ¥ symbol
      if (absCos > 0.25) {
        const innerR = r * 0.72;
        const innerGrad = ctx.createLinearGradient(-innerR, -innerR, innerR, innerR);
        innerGrad.addColorStop(0, '#d97706');
        innerGrad.addColorStop(0.3, '#f59e0b');
        innerGrad.addColorStop(1, '#fbbf24');

        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, innerR * absCos, innerR, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(180, 83, 9, 0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Bold embossed ¥ symbol
        ctx.save();
        ctx.scale(absCos, 1);
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = 'rgba(180, 83, 9, 0.45)';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('¥', 0, 0.5);
        ctx.restore();
      }

      ctx.restore();
    };

    const drawLeg = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      bottomWidth: number,
      isBackLeg: boolean
    ) => {
      ctx.save();
      const grad = ctx.createLinearGradient(x1, y1, x1, y2);
      if (isBackLeg) {
        grad.addColorStop(0, '#ea580c');
        grad.addColorStop(1, '#c2410c');
      } else {
        grad.addColorStop(0, '#fb923c');
        grad.addColorStop(0.55, '#f97316');
        grad.addColorStop(1, '#ea580c');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      const topHalf = bottomWidth * 0.72;
      const botHalf = bottomWidth * 0.5;
      ctx.moveTo(x1 - topHalf, y1);
      ctx.quadraticCurveTo(x1 - botHalf - 2, (y1 + y2) * 0.55, x2 - botHalf, y2 - 4);
      ctx.quadraticCurveTo(x2 - botHalf, y2, x2, y2);
      ctx.quadraticCurveTo(x2 + botHalf, y2, x2 + botHalf, y2 - 4);
      ctx.quadraticCurveTo(x1 + botHalf + 2, (y1 + y2) * 0.55, x1 + topHalf, y1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      const s = animState.current;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Update idle breathing & spring physics
      s.breathPhase += 0.045;
      const breathOffset = Math.sin(s.breathPhase) * 0.011;
      const targetX = (s.isHovered ? 1.035 : 1) + breathOffset;
      const targetY = (s.isHovered ? 1.035 : 1) - breathOffset;

      const stiffness = 0.22;
      const damping = 0.72;
      s.squashVelX = (s.squashVelX + (targetX - s.squashX) * stiffness) * damping;
      s.squashVelY = (s.squashVelY + (targetY - s.squashY) * stiffness) * damping;
      s.squashX += s.squashVelX;
      s.squashY += s.squashVelY;

      if (s.happyTimer > 0) s.happyTimer--;
      s.blinkTimer = (s.blinkTimer + 1) % 240;
      const isBlinking = s.blinkTimer > 232;

      const pigCenterX = 82;
      const pigBottomY = 152;
      const slotCenterX = 82;
      const slotCenterY = 76;

      // 1. Soft Ambient Ground Shadow
      const shadowGrad = ctx.createRadialGradient(
        pigCenterX,
        pigBottomY + 1,
        4,
        pigCenterX,
        pigBottomY + 1,
        46 * s.squashX
      );
      shadowGrad.addColorStop(0, 'rgba(180, 83, 9, 0.22)');
      shadowGrad.addColorStop(0.6, 'rgba(180, 83, 9, 0.08)');
      shadowGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(pigCenterX, pigBottomY + 1, 46 * s.squashX, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Apply pig squash & stretch transform anchored at bottom feet
      ctx.save();
      ctx.translate(pigCenterX, pigBottomY);
      ctx.scale(s.squashX, s.squashY);
      ctx.translate(-pigCenterX, -pigBottomY);

      // 2. Back Legs (far-left front leg & inner-back leg, darker orange for 3D depth)
      drawLeg(58, 130, 60, 148, 16, true);
      drawLeg(88, 132, 88, 147, 14, true);

      // 3. Far Left Ear (sticking out on top-left of head, matching reference)
      ctx.save();
      // Outer rim of far ear
      const farEarOuter = ctx.createLinearGradient(34, 72, 54, 92);
      farEarOuter.addColorStop(0, '#fde047');
      farEarOuter.addColorStop(0.5, '#fbbf24');
      farEarOuter.addColorStop(1, '#f59e0b');
      ctx.fillStyle = farEarOuter;
      ctx.beginPath();
      ctx.moveTo(54, 84);
      ctx.bezierCurveTo(38, 72, 32, 75, 36, 88);
      ctx.bezierCurveTo(38, 95, 45, 99, 50, 96);
      ctx.closePath();
      ctx.fill();

      // Deep warm orange inner recess of far ear
      const farEarInner = ctx.createLinearGradient(36, 76, 48, 96);
      farEarInner.addColorStop(0, '#fb923c');
      farEarInner.addColorStop(1, '#ea580c');
      ctx.fillStyle = farEarInner;
      ctx.beginPath();
      ctx.moveTo(51, 86);
      ctx.bezierCurveTo(40, 77, 35, 80, 38, 89);
      ctx.bezierCurveTo(40, 94, 45, 97, 49, 94);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 4. Curly 3D Tail on Upper-Right Rump (matching reference loop)
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Tail shadow/under-stroke
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(116, 86);
      ctx.bezierCurveTo(126, 84, 131, 74, 123, 72);
      ctx.bezierCurveTo(116, 70, 117, 81, 126, 81);
      ctx.quadraticCurveTo(132, 81, 134, 75);
      ctx.stroke();

      // Tail golden highlight stroke
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(116, 85);
      ctx.bezierCurveTo(125, 83, 130, 73, 123, 71);
      ctx.bezierCurveTo(117, 70, 118, 80, 126, 80);
      ctx.quadraticCurveTo(131, 80, 133, 74);
      ctx.stroke();
      ctx.restore();

      // 5. Foreground Legs (near-front leg & near-back leg, seamlessly joined to belly)
      drawLeg(73, 132, 74, 152, 18, false);
      drawLeg(100, 131, 100, 151, 18, false);

      // 6. Main 3D Golden Piggy Body (plump 3/4 ellipsoid with multi-stop 3D shading)
      ctx.save();
      ctx.beginPath();
      // Smooth plump organic body contour matching the reference 3/4 silhouette
      ctx.moveTo(82, 72);
      // Right back & rump curve
      ctx.bezierCurveTo(112, 72, 132, 89, 131, 112);
      // Lower right belly curve into legs
      ctx.bezierCurveTo(130, 133, 112, 144, 85, 144);
      // Lower front chin/chest curve
      ctx.bezierCurveTo(60, 144, 44, 134, 40, 118);
      // Forehead & top head curve
      ctx.bezierCurveTo(37, 94, 54, 72, 82, 72);
      ctx.closePath();

      // Primary 3D spherical lighting gradient (creamy yellow top-left -> rich golden mid -> deep orange bottom-right)
      const bodyGrad = ctx.createRadialGradient(68, 84, 8, 86, 112, 58);
      bodyGrad.addColorStop(0, '#fff394');
      bodyGrad.addColorStop(0.25, '#fde047');
      bodyGrad.addColorStop(0.58, '#fbbf24');
      bodyGrad.addColorStop(0.84, '#f59e0b');
      bodyGrad.addColorStop(1, '#ea580c');
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Secondary bottom-belly warm orange bounce/shading overlay
      const bellyGrad = ctx.createLinearGradient(82, 105, 82, 145);
      bellyGrad.addColorStop(0, 'rgba(234, 88, 12, 0)');
      bellyGrad.addColorStop(0.65, 'rgba(234, 88, 12, 0.28)');
      bellyGrad.addColorStop(1, 'rgba(194, 65, 12, 0.65)');
      ctx.fillStyle = bellyGrad;
      ctx.fill();

      // Soft rim light along the upper back curve (like the 3D render in reference)
      ctx.strokeStyle = 'rgba(254, 249, 195, 0.65)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(56, 78);
      ctx.quadraticCurveTo(85, 69, 116, 84);
      ctx.stroke();
      ctx.restore();

      // 7. Coin Slot on Top Back (vermilion-orange recessed slot with soft rim highlight)
      ctx.save();
      // Soft світлый bevel under slot
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.roundRect(slotCenterX - 16, slotCenterY - 2, 32, 5.5, 3);
      ctx.fill();

      // Deep warm red-orange slot interior
      const slotGrad = ctx.createLinearGradient(slotCenterX - 15, slotCenterY, slotCenterX + 15, slotCenterY);
      slotGrad.addColorStop(0, '#c2410c');
      slotGrad.addColorStop(0.5, '#9a3412');
      slotGrad.addColorStop(1, '#c2410c');
      ctx.fillStyle = slotGrad;
      ctx.beginPath();
      ctx.roundRect(slotCenterX - 15, slotCenterY - 2.5, 30, 4.2, 2.1);
      ctx.fill();
      ctx.restore();

      // 8. 3D Protruding Snout (facing bottom-left at 3/4 angle, matching reference)
      ctx.save();
      // Snout neck/bridge blend into face
      const snoutBridgeGrad = ctx.createLinearGradient(30, 104, 52, 126);
      snoutBridgeGrad.addColorStop(0, '#fde047');
      snoutBridgeGrad.addColorStop(0.5, '#fbbf24');
      snoutBridgeGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = snoutBridgeGrad;
      ctx.beginPath();
      ctx.moveTo(45, 103);
      ctx.quadraticCurveTo(32, 104, 30, 114);
      ctx.quadraticCurveTo(29, 126, 42, 129);
      ctx.quadraticCurveTo(52, 130, 54, 116);
      ctx.closePath();
      ctx.fill();

      // Bright creamy rim highlight on top/right edge of snout disc
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(37.2, 116.5, 10.5, 12.2, -0.14, 0, Math.PI * 2);
      ctx.fill();

      // Front flat oval face of the snout
      const snoutFaceGrad = ctx.createLinearGradient(28, 106, 44, 128);
      snoutFaceGrad.addColorStop(0, '#fbbf24');
      snoutFaceGrad.addColorStop(0.5, '#f59e0b');
      snoutFaceGrad.addColorStop(1, '#ea580c');
      ctx.fillStyle = snoutFaceGrad;
      ctx.beginPath();
      ctx.ellipse(36.2, 117, 9.6, 11.4, -0.14, 0, Math.PI * 2);
      ctx.fill();

      // Two vertical oval nostrils inside snout (with inner depth)
      ctx.fillStyle = '#c2410c';
      ctx.beginPath();
      ctx.ellipse(33, 117, 2.1, 4.2, -0.1, 0, Math.PI * 2);
      ctx.ellipse(39.2, 117.5, 2.1, 4.2, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Nostril inner highlight rim
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.5)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      // 9. Both Eyes in 3/4 Perspective (warm reddish-brown glossy beads with white catchlights)
      const drawEye = (ex: number, ey: number, rx: number, ry: number) => {
        ctx.save();
        if (s.happyTimer > 0) {
          // Happy curved eye when coin drops
          ctx.strokeStyle = '#9a3412';
          ctx.lineWidth = 2.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(ex, ey + 1, rx * 1.3, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        } else if (isBlinking) {
          ctx.strokeStyle = '#9a3412';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ex - rx, ey);
          ctx.lineTo(ex + rx, ey);
          ctx.stroke();
        } else {
          // Subtle eye socket rim
          ctx.fillStyle = 'rgba(217, 119, 6, 0.35)';
          ctx.beginPath();
          ctx.ellipse(ex, ey + 0.5, rx + 0.8, ry + 0.8, 0, 0, Math.PI * 2);
          ctx.fill();

          // Glossy brown-red iris/pupil
          const eyeGrad = ctx.createRadialGradient(ex - 0.5, ey - 1, 0.5, ex, ey, ry);
          eyeGrad.addColorStop(0, '#c2410c');
          eyeGrad.addColorStop(0.7, '#9a3412');
          eyeGrad.addColorStop(1, '#7c2d12');
          ctx.fillStyle = eyeGrad;
          ctx.beginPath();
          ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();

          // Crisp white catchlight dot
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - rx * 0.28, ey - ry * 0.28, rx * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };

      // Left (far) eye & Right (near) eye matching reference positions
      drawEye(45.5, 100.5, 2.5, 3.3);
      drawEye(57.5, 103.5, 2.9, 3.8);

      // 10. Near Right Ear (3D folded ear on front-right of head, with cast shadow)
      ctx.save();
      // Soft drop shadow cast by the ear onto the cheek/head
      ctx.fillStyle = 'rgba(217, 119, 6, 0.28)';
      ctx.beginPath();
      ctx.ellipse(69, 94, 8, 11, 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Outer golden shell of near ear (right side of the fold)
      const nearEarOuter = ctx.createLinearGradient(60, 74, 78, 98);
      nearEarOuter.addColorStop(0, '#fef08a');
      nearEarOuter.addColorStop(0.35, '#fbbf24');
      nearEarOuter.addColorStop(1, '#f59e0b');
      ctx.fillStyle = nearEarOuter;
      ctx.beginPath();
      ctx.moveTo(64, 98);
      ctx.bezierCurveTo(60, 86, 59, 75, 65, 76);
      ctx.bezierCurveTo(73, 77, 79, 86, 75, 93);
      ctx.quadraticCurveTo(71, 98, 64, 98);
      ctx.closePath();
      ctx.fill();

      // Deep warm orange inner hollow of near ear (left side of the fold)
      const nearEarInner = ctx.createLinearGradient(60, 78, 69, 97);
      nearEarInner.addColorStop(0, '#f97316');
      nearEarInner.addColorStop(1, '#c2410c');
      ctx.fillStyle = nearEarInner;
      ctx.beginPath();
      ctx.moveTo(64, 97);
      ctx.bezierCurveTo(59, 88, 59, 78, 64, 78);
      ctx.bezierCurveTo(68, 79, 69, 89, 64, 97);
      ctx.closePath();
      ctx.fill();

      // Bright creamy ridge highlight along the ear fold
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(64, 77);
      ctx.bezierCurveTo(69, 79, 70, 89, 65, 97);
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // End pig squash & stretch transform

      // 11. Draw Falling Coins (Clipped at the slot line so coins slide INSIDE the slot!)
      if (s.coins.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, width, slotCenterY + 1);
        ctx.clip();

        for (let i = s.coins.length - 1; i >= 0; i--) {
          const c = s.coins[i];
          if (c.delay > 0) {
            c.delay--;
            continue;
          }

          c.vy += 0.36;
          c.y += c.vy;
          c.x += c.vx;
          c.angle += c.vAngle;

          drawCoin(c);

          if (!c.entered && c.y >= slotCenterY - 2) {
            c.entered = true;
            s.squashX = 1.15;
            s.squashY = 0.86;
            s.happyTimer = 55;

            const colors = ['#fde047', '#fbbf24', '#f59e0b', '#ffffff'];
            for (let k = 0; k < 10; k++) {
              const ang = -Math.PI * (0.15 + Math.random() * 0.7);
              const spd = 1.8 + Math.random() * 2.8;
              s.sparks.push({
                x: slotCenterX + (Math.random() - 0.5) * 16,
                y: slotCenterY - 2,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                life: 0,
                maxLife: 22 + Math.random() * 12,
                size: 2.2 + Math.random() * 2,
                color: colors[k % colors.length],
              });
            }
          }

          if (c.y > slotCenterY + 18) {
            s.coins.splice(i, 1);
          }
        }
        ctx.restore();
      }

      // 12. Draw Spark Particles
      for (let i = s.sparks.length - 1; i >= 0; i--) {
        const sp = s.sparks[i];
        sp.life++;
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.14;

        const progress = sp.life / sp.maxLife;
        const alpha = Math.max(0, 1 - progress);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = sp.color;
        ctx.translate(sp.x, sp.y);
        ctx.rotate(sp.life * 0.2);
        ctx.beginPath();
        ctx.moveTo(0, -sp.size);
        ctx.lineTo(sp.size * 0.4, -sp.size * 0.4);
        ctx.lineTo(sp.size, 0);
        ctx.lineTo(sp.size * 0.4, sp.size * 0.4);
        ctx.lineTo(0, sp.size);
        ctx.lineTo(-sp.size * 0.4, sp.size * 0.4);
        ctx.lineTo(-sp.size, 0);
        ctx.lineTo(-sp.size * 0.4, -sp.size * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        if (sp.life >= sp.maxLife) {
          s.sparks.splice(i, 1);
        }
      }

      // 13. Draw Floating "+¥XXX" Text
      for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
        const ft = s.floatingTexts[i];
        ft.y -= 0.9;
        ft.alpha -= 0.02;

        if (ft.alpha <= 0) {
          s.floatingTexts.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "SF Pro Display", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#d97706';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, slotCenterX, ft.y);
        ctx.fillText(ft.text, slotCenterX, ft.y);
        ctx.restore();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="fixed bottom-4 right-5 z-40 flex flex-col items-center select-none">
      {/* Deposit Input Popover */}
      {isOpen && (
        <div className="mb-1 w-60 bg-white border border-zinc-200 rounded-md shadow-xl p-3 text-zinc-900 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 mb-2.5">
            <span className="text-xs font-semibold text-zinc-800">存入小金库</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleConfirm} className="space-y-2.5">
            <div>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-xs font-mono text-zinc-400">¥</span>
                <input
                  ref={inputRef}
                  type="number"
                  step="any"
                  placeholder="输入存入金额"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-sm pl-6 pr-2.5 py-1.5 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1">
              {[100, 500, 1000, 5000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountInput(val.toString())}
                  className="py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-sm text-[10px] font-mono transition cursor-pointer"
                >
                  +{val}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-800 rounded-sm transition cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!amountInput || parseFloat(amountInput) === 0}
                className="flex items-center gap-1 px-3 py-1 bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white text-xs font-medium rounded-sm transition disabled:opacity-40 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>确认投币</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Standalone Canvas 3D Golden Piggy Bank */}
      <div
        onClick={() => {
          animState.current.squashX = 1.09;
          animState.current.squashY = 0.92;
          setIsOpen(prev => !prev);
        }}
        onMouseEnter={() => {
          animState.current.isHovered = true;
        }}
        onMouseLeave={() => {
          animState.current.isHovered = false;
        }}
        title="点击向金猪存钱罐投币"
        className="cursor-pointer relative -mb-2 transition-transform"
      >
        <canvas
          ref={canvasRef}
          style={{ width: 160, height: 168 }}
          className="block pointer-events-none"
        />
      </div>

      {/* Standalone Amount Display Underneath */}
      <div className="bg-white border border-zinc-200/90 rounded-sm px-2.5 py-1 shadow-xs flex items-center gap-1.5">
        {isEditingBase ? (
          <form onSubmit={handleSaveBase} className="flex items-center gap-1">
            <input
              type="number"
              step="any"
              value={baseInput}
              onChange={e => setBaseInput(e.target.value)}
              className="w-20 bg-zinc-50 border border-zinc-300 px-1.5 py-0.5 rounded-sm text-xs font-mono text-zinc-900 focus:outline-none"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Escape') setIsEditingBase(false);
              }}
            />
            <button
              type="submit"
              className="px-1.5 py-0.5 bg-zinc-900 text-white text-[10px] rounded-sm"
            >
              确定
            </button>
          </form>
        ) : (
          <>
            <span className="text-[10px] text-zinc-400">已存</span>
            <span
              onClick={() => {
                setBaseInput(currentSavings.toString());
                setIsEditingBase(true);
              }}
              title="点击直接校准总额"
              className="text-xs font-bold font-mono text-zinc-900 cursor-pointer hover:text-zinc-600 transition"
            >
              {isPrivacyMode
                ? '****'
                : `¥${Math.round(displaySavings).toLocaleString()}`}
            </span>
            <button
              onClick={() => {
                setBaseInput(currentSavings.toString());
                setIsEditingBase(true);
              }}
              title="校准已存总额"
              className="text-zinc-300 hover:text-zinc-600 transition cursor-pointer"
            >
              <Edit2 className="w-2.5 h-2.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
