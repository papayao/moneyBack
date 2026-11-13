import React, { useEffect, useRef } from 'react';

interface RpgBackgroundCanvasProps {
  isPlaying: boolean;
  isWorkingTime: boolean;
  onActivatePlay: () => void;
  onStatsChange?: (stats: { kills: number; combo: number; level: number; exp: number }) => void;
}

interface Platform {
  x: number;
  y: number; // height above groundY
  w: number;
}

interface Monster {
  id: number;
  type: 'slime' | 'goblin' | 'chest';
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  hitFlash: number;
  animFrame: number;
  facing: 1 | -1;
}

interface LootCoin {
  x: number;
  y: number;
  vx: number;
  vy: number;
  collected: boolean;
  life: number;
}

interface DamagePopup {
  x: number;
  y: number;
  vy: number;
  text: string;
  isCrit: boolean;
  color: string;
  alpha: number;
}

interface SlashWave {
  x: number;
  y: number;
  dir: 1 | -1;
  frame: number;
  comboStep: number;
}

interface AfterImage {
  x: number;
  y: number;
  facing: 1 | -1;
  alpha: number;
}

export const RpgBackgroundCanvas: React.FC<RpgBackgroundCanvasProps> = ({
  isPlaying,
  onActivatePlay,
  onStatsChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const onStatsChangeRef = useRef(onStatsChange);
  useEffect(() => {
    onStatsChangeRef.current = onStatsChange;
  }, [onStatsChange]);

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

    // Keyboard input state
    const keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayingRef.current) return;
      const k = e.key.toLowerCase();
      keys[k] = true;

      if (k === ' ' || k === 'w' || k === 'arrowup') {
        e.preventDefault();
        triggerJump();
      }
      if (k === 'j' || k === 'z' || k === 'enter') {
        e.preventDefault();
        triggerAttack();
      }
      if (k === 'k' || k === 'l' || k === 'shift') {
        e.preventDefault();
        triggerDash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // World & Hero state
    const hero = {
      x: 260,
      y: 0, // offset above groundY (0 = on ground, >0 = in air)
      vx: 0,
      vy: 0,
      facing: 1 as 1 | -1,
      jumpsLeft: 2,
      attackCooldown: 0,
      attackAnim: 0,
      comboStep: 0,
      comboResetTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      runFrame: 0,
      kills: 0,
      combo: 0,
      comboDecay: 0,
      level: 1,
      exp: 0,
    };

    let cameraX = 0;
    let nextId = 1;

    // Procedural platforms & monsters
    const platforms: Platform[] = [];
    const monsters: Monster[] = [];
    const coins: LootCoin[] = [];
    const popups: DamagePopup[] = [];
    const slashes: SlashWave[] = [];
    const afterImages: AfterImage[] = [];

    // Populate initial platforms & monsters along world X
    let generatedUpToX = -400;
    const ensureWorldGenerated = (targetMaxX: number) => {
      while (generatedUpToX < targetMaxX) {
        const chunkW = 280 + Math.floor(Math.random() * 160);
        // Add platform 65% of chunks
        if (Math.random() < 0.65) {
          const pw = 110 + Math.floor(Math.random() * 90);
          const py = 78 + Math.floor(Math.random() * 58);
          platforms.push({
            x: generatedUpToX + 60,
            y: py,
            w: pw,
          });

          // Sometimes spawn a monster or chest on the platform
          if (Math.random() < 0.55) {
            const isChest = Math.random() < 0.22;
            monsters.push({
              id: nextId++,
              type: isChest ? 'chest' : 'slime',
              x: generatedUpToX + 60 + pw * 0.5,
              y: py,
              vx: 0,
              vy: 0,
              hp: isChest ? 60 : 80,
              maxHp: isChest ? 60 : 80,
              hitFlash: 0,
              animFrame: Math.random() * 100,
              facing: -1,
            });
          }
        }

        // Spawn ground monsters
        const count = 1 + (Math.random() < 0.45 ? 1 : 0);
        for (let i = 0; i < count; i++) {
          const r = Math.random();
          const type: Monster['type'] = r < 0.14 ? 'chest' : r < 0.58 ? 'slime' : 'goblin';
          const maxHp = type === 'goblin' ? 120 : type === 'chest' ? 70 : 80;
          monsters.push({
            id: nextId++,
            type,
            x: generatedUpToX + 100 + i * 110 + Math.random() * 50,
            y: 0,
            vx: 0,
            vy: 0,
            hp: maxHp,
            maxHp,
            hitFlash: 0,
            animFrame: Math.random() * 100,
            facing: -1,
          });
        }

        generatedUpToX += chunkW;
      }
    };

    ensureWorldGenerated(2400);

    const notifyStats = () => {
      if (onStatsChangeRef.current) {
        onStatsChangeRef.current({
          kills: hero.kills,
          combo: hero.combo,
          level: hero.level,
          exp: hero.exp,
        });
      }
    };

    const triggerJump = () => {
      if (hero.jumpsLeft > 0) {
        hero.vy = 10.8;
        hero.jumpsLeft--;
      }
    };

    const triggerDash = () => {
      if (hero.dashCooldown <= 0) {
        hero.dashTimer = 10;
        hero.dashCooldown = 35;
        hero.vx = hero.facing * 12;
      }
    };

    const triggerAttack = () => {
      if (hero.attackCooldown > 0) return;
      hero.attackCooldown = 14;
      hero.attackAnim = 12;
      hero.comboStep = (hero.comboStep + 1) % 3;
      hero.comboResetTimer = 45;

      slashes.push({
        x: hero.x + hero.facing * 28,
        y: hero.y + 22,
        dir: hero.facing,
        frame: 0,
        comboStep: hero.comboStep,
      });

      // Check monster hits in sword reach
      const reach = 74;
      let hitAny = false;
      for (let i = monsters.length - 1; i >= 0; i--) {
        const m = monsters[i];
        const dx = (m.x - hero.x) * hero.facing;
        const dy = Math.abs(m.y - hero.y);
        if (dx >= -18 && dx <= reach && dy < 48) {
          hitAny = true;
          const isCrit = Math.random() < 0.28 || hero.comboStep === 2;
          const dmg = Math.round((28 + hero.level * 4 + Math.random() * 12) * (isCrit ? 1.75 : 1));
          m.hp -= dmg;
          m.hitFlash = 7;
          m.vx = hero.facing * (m.type === 'chest' ? 1.5 : 5.2);
          m.vy = m.type === 'chest' ? 2 : 4.2;

          popups.push({
            x: m.x + (Math.random() - 0.5) * 16,
            y: m.y + 42,
            vy: 2.2,
            text: isCrit ? `CRIT -${dmg}` : `-${dmg}`,
            isCrit,
            color: isCrit ? '#f59e0b' : '#ef4444',
            alpha: 1,
          });

          if (m.hp <= 0) {
            // Monster defeated -> spawn gold coins & EXP
            const coinDropCount = m.type === 'chest' ? 8 : m.type === 'goblin' ? 4 : 3;
            for (let c = 0; c < coinDropCount; c++) {
              coins.push({
                x: m.x,
                y: m.y + 14,
                vx: (Math.random() - 0.5) * 6.5,
                vy: 4 + Math.random() * 5,
                collected: false,
                life: 0,
              });
            }
            hero.kills++;
            hero.exp += m.type === 'chest' ? 35 : 20;
            if (hero.exp >= 100) {
              hero.level++;
              hero.exp -= 100;
              popups.push({
                x: hero.x,
                y: hero.y + 58,
                vy: 1.8,
                text: `LEVEL UP! Lv.${hero.level}`,
                isCrit: true,
                color: '#10b981',
                alpha: 1.2,
              });
            }
            monsters.splice(i, 1);
          }
        }
      }

      if (hitAny) {
        hero.combo++;
        hero.comboDecay = 150;
        notifyStats();
      }
    };

    // Draw pixel helper
    const drawPixelKnight = (
      x: number,
      groundY: number,
      yOffset: number,
      facing: 1 | -1,
      runFrame: number,
      attackAnim: number,
      comboStep: number
    ) => {
      const py = groundY - yOffset;
      ctx.save();
      ctx.translate(x, py);
      ctx.scale(facing, 1);

      const bob = yOffset > 0 ? -2 : Math.sin(runFrame * 0.35) * 2;
      const legSwing = yOffset > 0 ? 5 : Math.sin(runFrame * 0.35) * 6;

      // Shadow on ground
      if (yOffset < 120) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
        ctx.beginPath();
        ctx.ellipse(0, yOffset, Math.max(6, 16 - yOffset * 0.08), 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Flowing crimson cape
      const capeWave = Math.sin(runFrame * 0.3) * 4;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(-6, -30 + bob);
      ctx.lineTo(-22 - Math.abs(hero.vx) * 1.5, -14 + capeWave + bob);
      ctx.lineTo(-14 - Math.abs(hero.vx), -6 + capeWave + bob);
      ctx.lineTo(-4, -18 + bob);
      ctx.closePath();
      ctx.fill();

      // Boots / Legs
      ctx.fillStyle = '#334155';
      ctx.fillRect(-6 - legSwing * 0.5, -12, 5, 12);
      ctx.fillRect(2 + legSwing * 0.5, -12, 5, 12);

      // Armored Tunic / Torso
      ctx.fillStyle = '#475569';
      ctx.fillRect(-8, -28 + bob, 16, 17);
      // Gold belt & trim
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-8, -16 + bob, 16, 3);

      // Steel Pauldrons (Shoulder armor)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-10, -29 + bob, 6, 6);
      ctx.fillRect(5, -29 + bob, 6, 6);

      // Knight Helmet
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-9, -44 + bob, 18, 16);
      // Helmet top highlight
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-7, -44 + bob, 14, 3);
      // Visor slit & glowing eyes
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-3, -38 + bob, 11, 5);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(3, -37 + bob, 3, 2);

      // Red Helmet Plume (feather crest)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-6, -50 + bob, 10, 6);
      ctx.fillRect(-10, -48 + bob, 5, 5);

      // Broadsword
      ctx.save();
      ctx.translate(6, -22 + bob);
      if (attackAnim > 0) {
        const swingProgress = 1 - attackAnim / 12;
        const startAng = comboStep === 1 ? 1.4 : -1.5;
        const endAng = comboStep === 1 ? -1.4 : 1.5;
        ctx.rotate(startAng + (endAng - startAng) * swingProgress);
      } else {
        ctx.rotate(-0.35 + Math.sin(runFrame * 0.2) * 0.08);
      }
      // Sword hilt & crossguard
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-2, -3, 5, 6);
      ctx.fillRect(2, -7, 3, 14);
      // Sword gleaming blade
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(5, -3, 24, 6);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(5, 0, 24, 3);
      // Blade tip
      ctx.beginPath();
      ctx.moveTo(29, -3);
      ctx.lineTo(35, 0);
      ctx.lineTo(29, 3);
      ctx.closePath();
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.restore();

      ctx.restore();
    };

    const drawMonster = (m: Monster, groundY: number) => {
      const my = groundY - m.y;
      ctx.save();
      ctx.translate(m.x, my);

      // Shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (m.type === 'slime') {
        const bounce = Math.abs(Math.sin(m.animFrame * 0.09)) * 6;
        const squash = 1 + Math.sin(m.animFrame * 0.09) * 0.12;
        ctx.save();
        ctx.translate(0, -bounce);
        ctx.scale(squash, 2 - squash);

        // Slime body
        ctx.fillStyle = m.hitFlash > 0 ? '#ffffff' : '#10b981';
        ctx.beginPath();
        ctx.arc(0, -11, 13, Math.PI, 0);
        ctx.lineTo(13, 0);
        ctx.lineTo(-13, 0);
        ctx.closePath();
        ctx.fill();

        // Slime highlight
        if (m.hitFlash <= 0) {
          ctx.fillStyle = '#6ee7b7';
          ctx.fillRect(-7, -18, 5, 4);
        }

        // Eyes
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(-6, -11, 3, 4);
        ctx.fillRect(2, -11, 3, 4);
        ctx.restore();
      } else if (m.type === 'goblin') {
        const walkBob = Math.abs(Math.sin(m.animFrame * 0.15)) * 3;
        ctx.save();
        ctx.scale(m.facing, 1);
        // Legs
        ctx.fillStyle = '#3f6212';
        ctx.fillRect(-6, -10, 4, 10);
        ctx.fillRect(2, -10, 4, 10);
        // Body
        ctx.fillStyle = m.hitFlash > 0 ? '#ffffff' : '#78350f';
        ctx.fillRect(-8, -24 - walkBob, 16, 15);
        // Goblin head
        ctx.fillStyle = m.hitFlash > 0 ? '#ffffff' : '#65a30d';
        ctx.fillRect(-7, -36 - walkBob, 14, 12);
        // Pointy ears
        ctx.fillRect(-12, -33 - walkBob, 5, 4);
        ctx.fillRect(7, -33 - walkBob, 5, 4);
        // Red eyes
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(1, -32 - walkBob, 4, 3);
        // Club weapon
        ctx.fillStyle = '#92400e';
        ctx.fillRect(8, -28 - walkBob, 5, 16);
        ctx.restore();
      } else {
        // Golden Treasure Chest
        ctx.fillStyle = m.hitFlash > 0 ? '#ffffff' : '#b45309';
        ctx.fillRect(-14, -22, 28, 22);
        ctx.fillStyle = m.hitFlash > 0 ? '#ffffff' : '#f59e0b';
        ctx.fillRect(-14, -22, 28, 4);
        ctx.fillRect(-14, -12, 28, 3);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-3, -14, 6, 7);
      }

      // HP Bar if damaged
      if (m.hp < m.maxHp) {
        const bw = 28;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
        ctx.fillRect(-bw / 2, -46, bw, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-bw / 2 + 1, -45, Math.max(0, ((bw - 2) * m.hp) / m.maxHp), 2);
      }

      ctx.restore();
    };

    let rafId: number;

    const updateAndRender = () => {
      ctx.save();
      ctx.scale(dpr, dpr);

      const groundY = height - 92;

      // --- 1. UPDATE HERO & AI ---
      if (!isPlayingRef.current) {
        // AUTO-IDLE RPG AI: Hero runs forward, jumps for elevated monsters/coins, and attacks nearby monsters
        let nearestMonster: Monster | null = null;
        let minDist = Infinity;
        for (const m of monsters) {
          if (m.x > hero.x - 40) {
            const d = m.x - hero.x;
            if (d < minDist) {
              minDist = d;
              nearestMonster = m;
            }
          }
        }

        if (nearestMonster && Math.abs(nearestMonster.x - hero.x) < 52) {
          hero.facing = nearestMonster.x >= hero.x ? 1 : -1;
          hero.vx *= 0.6;
          // Jump if monster is on a platform above hero
          if (nearestMonster.y > hero.y + 30 && hero.jumpsLeft > 0 && Math.abs(hero.vy) < 1) {
            triggerJump();
          }
          triggerAttack();
        } else {
          hero.facing = 1;
          hero.vx = 2.6;
          // Occasionally jump onto platforms
          for (const p of platforms) {
            if (p.x - hero.x > 10 && p.x - hero.x < 55 && hero.y === 0 && Math.random() < 0.04) {
              triggerJump();
            }
          }
        }
      } else {
        // MANUAL PLAYER CONTROL MODE
        const moveLeft = keys['a'] || keys['arrowleft'];
        const moveRight = keys['d'] || keys['arrowright'];

        if (hero.dashTimer <= 0) {
          if (moveLeft && !moveRight) {
            hero.vx = -4.5;
            hero.facing = -1;
          } else if (moveRight && !moveLeft) {
            hero.vx = 4.5;
            hero.facing = 1;
          } else {
            hero.vx *= 0.75;
            if (Math.abs(hero.vx) < 0.1) hero.vx = 0;
          }
        }
      }

      if (hero.dashTimer > 0) {
        hero.dashTimer--;
        afterImages.push({
          x: hero.x,
          y: hero.y,
          facing: hero.facing,
          alpha: 0.45,
        });
      }
      if (hero.dashCooldown > 0) hero.dashCooldown--;
      if (hero.attackCooldown > 0) hero.attackCooldown--;
      if (hero.attackAnim > 0) hero.attackAnim--;
      if (hero.comboResetTimer > 0) {
        hero.comboResetTimer--;
        if (hero.comboResetTimer === 0) hero.comboStep = 0;
      }
      if (hero.comboDecay > 0) {
        hero.comboDecay--;
        if (hero.comboDecay === 0 && hero.combo > 0) {
          hero.combo = 0;
          notifyStats();
        }
      }

      // Horizontal movement & platform/ground physics
      const prevY = hero.y;
      hero.x += hero.vx;
      hero.y += hero.vy;
      hero.vy -= 0.56; // Gravity

      // Check landing on platforms when falling
      if (hero.vy <= 0) {
        for (const p of platforms) {
          if (
            hero.x >= p.x - 10 &&
            hero.x <= p.x + p.w + 10 &&
            prevY >= p.y &&
            hero.y <= p.y
          ) {
            hero.y = p.y;
            hero.vy = 0;
            hero.jumpsLeft = 2;
            break;
          }
        }
      }

      // Ground collision
      if (hero.y <= 0) {
        hero.y = 0;
        hero.vy = 0;
        hero.jumpsLeft = 2;
      }

      if (Math.abs(hero.vx) > 0.3) {
        hero.runFrame += Math.abs(hero.vx) * 0.22;
      } else {
        hero.runFrame += 0.08;
      }

      // Smooth camera follow
      const targetCamX = hero.x - width * (isPlayingRef.current ? 0.35 : 0.28);
      cameraX += (targetCamX - cameraX) * 0.12;

      // Ensure infinite world ahead of camera
      ensureWorldGenerated(cameraX + width + 800);

      // Cleanup far-behind entities
      while (platforms.length > 0 && platforms[0].x + platforms[0].w < cameraX - 600) {
        platforms.shift();
      }
      while (monsters.length > 0 && monsters[0].x < cameraX - 600) {
        monsters.shift();
      }

      // --- 2. RENDER PARALLAX LAYERS ---
      // Sky Gradient (crisp serene pixel-world sky)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
      skyGrad.addColorStop(0, '#dbeafe');
      skyGrad.addColorStop(0.55, '#eff6ff');
      skyGrad.addColorStop(1, '#fef3c7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Layer 1: Pixel Clouds (0.08x parallax)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      const cloudSpan = 420;
      const cloudOffset = -((cameraX * 0.08) % cloudSpan);
      for (let cx = cloudOffset - cloudSpan; cx < width + cloudSpan; cx += cloudSpan) {
        const cy = 72 + ((Math.abs(Math.floor((cx - cloudOffset) / cloudSpan)) * 37) % 60);
        ctx.fillRect(cx, cy, 68, 16);
        ctx.fillRect(cx + 12, cy - 10, 44, 10);
        ctx.fillRect(cx + 220, cy + 28, 52, 14);
        ctx.fillRect(cx + 230, cy + 18, 32, 10);
      }

      // Layer 2: Distant Stepped Mountains (0.2x parallax)
      const mtnSpan = 360;
      const mtnOffset = -((cameraX * 0.2) % mtnSpan);
      for (let mx = mtnOffset - mtnSpan; mx < width + mtnSpan; mx += mtnSpan) {
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(mx, groundY);
        ctx.lineTo(mx + 140, groundY - 190);
        ctx.lineTo(mx + 290, groundY);
        ctx.closePath();
        ctx.fill();

        // Snow cap
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(mx + 140, groundY - 190);
        ctx.lineTo(mx + 106, groundY - 144);
        ctx.lineTo(mx + 174, groundY - 144);
        ctx.closePath();
        ctx.fill();

        // Secondary peak
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(mx + 160, groundY);
        ctx.lineTo(mx + 280, groundY - 140);
        ctx.lineTo(mx + 410, groundY);
        ctx.closePath();
        ctx.fill();
      }

      // Layer 3: Midground Pixel Pine Forest (0.45x parallax)
      const treeSpan = 96;
      const treeOffset = -((cameraX * 0.45) % treeSpan);
      for (let tx = treeOffset - treeSpan; tx < width + treeSpan; tx += treeSpan) {
        const treeH = 74 + (Math.abs(Math.round((tx - treeOffset) / treeSpan)) % 3) * 16;
        // Trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(tx + 26, groundY - 22, 8, 22);
        // Layered pixel foliage triangles
        ctx.fillStyle = '#0f766e';
        for (let tier = 0; tier < 3; tier++) {
          const tw = 44 - tier * 10;
          const ty = groundY - 18 - tier * (treeH * 0.28);
          ctx.beginPath();
          ctx.moveTo(tx + 30 - tw / 2, ty);
          ctx.lineTo(tx + 30, ty - treeH * 0.42);
          ctx.lineTo(tx + 30 + tw / 2, ty);
          ctx.closePath();
          ctx.fill();
        }
      }

      // --- 3. RENDER WORLD SPACE (1.0x camera) ---
      ctx.save();
      ctx.translate(-cameraX, 0);

      // Floating Stone Platforms
      for (const p of platforms) {
        if (p.x + p.w < cameraX - 50 || p.x > cameraX + width + 50) continue;
        const py = groundY - p.y;
        // Stone brick block
        ctx.fillStyle = '#475569';
        ctx.fillRect(p.x, py, p.w, 16);
        ctx.fillStyle = '#334155';
        ctx.fillRect(p.x + 4, py + 16, p.w - 8, 4);
        // Mossy grass top on platform
        ctx.fillStyle = '#10b981';
        ctx.fillRect(p.x - 2, py - 2, p.w + 4, 5);
      }

      // Update & Draw Monsters
      for (const m of monsters) {
        m.animFrame++;
        if (m.hitFlash > 0) m.hitFlash--;

        // Monster simple patrol & knockback physics
        m.x += m.vx;
        m.vx *= 0.82;
        if (m.type !== 'chest' && Math.abs(m.vx) < 0.2) {
          m.x += Math.sin(m.animFrame * 0.03) * 0.45;
          m.facing = hero.x < m.x ? -1 : 1;
        }
        if (m.y > 0 || m.vy !== 0) {
          m.y += m.vy;
          m.vy -= 0.45;
          // Check if monster sits on a platform
          for (const p of platforms) {
            if (m.x >= p.x && m.x <= p.x + p.w && m.y <= p.y && m.y + Math.abs(m.vy) + 4 >= p.y) {
              m.y = p.y;
              m.vy = 0;
            }
          }
          if (m.y < 0) {
            m.y = 0;
            m.vy = 0;
          }
        }

        if (m.x > cameraX - 80 && m.x < cameraX + width + 80) {
          drawMonster(m, groundY);
        }
      }

      // Update & Draw Loot Coins (Auto-magnet towards Hero!)
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.life++;
        c.x += c.vx;
        c.y += c.vy;
        c.vy -= 0.42;

        if (c.y <= 0) {
          c.y = 0;
          c.vy = Math.abs(c.vy) * 0.45;
          c.vx *= 0.78;
          if (c.vy < 1) c.vy = 0;
        }

        // Magnet pull to hero after initial bounce
        if (c.life > 16) {
          const dx = hero.x - c.x;
          const dy = hero.y + 18 - c.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 140) {
            c.x += (dx / dist) * 7.5;
            c.y += (dy / dist) * 7.5;
          }
          if (dist < 20 || c.life > 180) {
            coins.splice(i, 1);
            continue;
          }
        }

        // Draw spinning pixel gold coin
        const cy = groundY - c.y - 6;
        const spinW = Math.max(2, Math.abs(Math.cos(c.life * 0.22)) * 8);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(c.x - spinW / 2, cy - 4, spinW, 8);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(c.x - spinW / 4, cy - 2, spinW / 2, 4);
      }

      // Draw Dash Afterimages
      for (let i = afterImages.length - 1; i >= 0; i--) {
        const ai = afterImages[i];
        ai.alpha -= 0.06;
        if (ai.alpha <= 0) {
          afterImages.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = ai.alpha;
        drawPixelKnight(ai.x, groundY, ai.y, ai.facing, hero.runFrame, 0, 0);
        ctx.restore();
      }

      // Draw Hero
      drawPixelKnight(
        hero.x,
        groundY,
        hero.y,
        hero.facing,
        hero.runFrame,
        hero.attackAnim,
        hero.comboStep
      );

      // Draw Crescent Sword Slash Waves
      for (let i = slashes.length - 1; i >= 0; i--) {
        const sl = slashes[i];
        sl.frame++;
        sl.x += sl.dir * 3.5;
        if (sl.frame > 9) {
          slashes.splice(i, 1);
          continue;
        }
        const sy = groundY - sl.y;
        ctx.save();
        ctx.translate(sl.x, sy);
        ctx.scale(sl.dir, 1);
        ctx.globalAlpha = 1 - sl.frame / 10;
        ctx.strokeStyle = sl.comboStep === 2 ? '#fbbf24' : '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 24 + sl.frame * 1.5, -Math.PI * 0.42, Math.PI * 0.42);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Floating Damage Popups
      for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        p.y += p.vy;
        p.vy *= 0.92;
        p.alpha -= 0.024;
        if (p.alpha <= 0) {
          popups.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.alpha);
        ctx.font = `${p.isCrit ? 'bold 13px' : 'bold 11px'} -apple-system, BlinkMacSystemFont, "SF Pro Display", monospace`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, p.x, groundY - p.y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, groundY - p.y);
        ctx.restore();
      }

      ctx.restore(); // End world camera transform

      // --- 4. FOREGROUND TILED GRASS & EARTH ---
      // Top emerald grass strip
      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, groundY, width, 10);
      ctx.fillStyle = '#059669';
      ctx.fillRect(0, groundY + 10, width, 6);

      // Soil & Brick pattern below grass
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, groundY + 16, width, height - groundY - 16);

      const tileW = 48;
      const tileOffset = -((cameraX * 1.0) % tileW);
      ctx.fillStyle = '#1e293b';
      for (let gx = tileOffset - tileW; gx < width + tileW; gx += tileW) {
        ctx.fillRect(gx, groundY + 22, tileW - 4, 14);
        ctx.fillRect(gx + tileW / 2, groundY + 40, tileW - 4, 14);
      }

      ctx.restore();
      rafId = requestAnimationFrame(updateAndRender);
    };

    rafId = requestAnimationFrame(updateAndRender);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      onClick={() => {
        if (!isPlaying) {
          onActivatePlay();
        } else {
          // Clicking while in play mode triggers sword slash!
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
        }
      }}
      className="fixed inset-0 w-full h-full block cursor-pointer"
    />
  );
};
