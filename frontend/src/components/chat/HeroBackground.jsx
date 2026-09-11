import React, { useEffect, useRef } from 'react';

/**
 * HeroBackground
 * High-end portfolio hero section special effects background for KnowChain:
 * - Damped, slow-gliding cursor spotlight (interpolated with 0.035 factor for graceful ease)
 * - Calmed neural constellation particles with serene, slow drift
 * - Smooth fade-in/fade-out filament connections to mouse
 * - Zero React re-renders on pointer move (100% canvas accelerated)
 * - Ambient floating cosmic aurora orbs & high-tech cyber perspective grid
 * - Supports `compact` mode for sidebars and narrow panels
 */
export default function HeroBackground({ containerRef, compact = false }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({
    x: 400,
    y: 300,
    targetX: 400,
    targetY: 300,
    active: false,
    opacity: 0
  });

  // Track mouse position smoothly without triggering React re-renders
  useEffect(() => {
    const handlePointerMove = (e) => {
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        mouseRef.current.targetX = e.clientX - rect.left;
        mouseRef.current.targetY = e.clientY - rect.top;
        mouseRef.current.active = true;
      } else {
        mouseRef.current.targetX = e.clientX;
        mouseRef.current.targetY = e.clientY;
        mouseRef.current.active = true;
      }
    };

    const handlePointerLeave = (e) => {
      if (!e.relatedTarget && !e.toElement) {
        mouseRef.current.active = false;
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [containerRef]);

  // Particle Constellation & Ambient Canvas Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    // Initialize mouse position in center
    mouseRef.current.x = width / 2;
    mouseRef.current.y = height / 2;
    mouseRef.current.targetX = width / 2;
    mouseRef.current.targetY = height / 2;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || 800;
      height = canvas.height = canvas.parentElement?.clientHeight || 600;
      initParticles();
    };

    window.addEventListener('resize', handleResize);

    // Subtle Particle Config (tuned for standard or compact mode)
    const PARTICLE_COUNT = compact
      ? Math.min(22, Math.max(12, Math.floor((width * height) / 16000)))
      : Math.min(42, Math.max(20, Math.floor((width * height) / 24000)));

    const CONNECT_DIST = compact ? 70 : 85;
    const MOUSE_CONNECT_DIST = compact ? 85 : 105;
    const SPOTLIGHT_RADIUS = compact ? 260 : 400;

    let particles = [];

    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = init ? Math.random() * width : Math.random() < 0.5 ? 0 : width;
        this.y = Math.random() * height;
        // Calm, serene ambient drift
        this.vx = (Math.random() - 0.5) * 0.10;
        this.vy = (Math.random() - 0.5) * 0.10;
        this.size = Math.random() * 1.5 + 0.6;
        this.baseAlpha = Math.random() * 0.35 + 0.18;
        this.alpha = this.baseAlpha;
        this.pulseSpeed = 0.004 + Math.random() * 0.004;
        this.pulseVal = Math.random() * Math.PI * 2;

        const colors = [
          '96, 165, 250',  // #60a5fa (blue-bright)
          '59, 130, 246',  // #3b82f6 (blue-glow)
          '34, 211, 238',  // #22d3ee (cyan)
          '167, 139, 250'  // #a78bfa (violet)
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update(mouseX, mouseY, mouseActive) {
        this.x += this.vx;
        this.y += this.vy;

        // Very gentle, slow-motion magnetic deflection from cursor
        if (mouseActive) {
          const dx = this.x - mouseX;
          const dy = this.y - mouseY;
          const distSq = dx * dx + dy * dy;
          if (distSq < 80 * 80 && distSq > 1) {
            const dist = Math.sqrt(distSq);
            // Ultra-subtle nudge, clamped to 0.035px/frame so it never moves fast
            const force = ((80 - dist) / 80) * 0.035;
            this.x += (dx / dist) * force;
            this.y += (dy / dist) * force;
          }
        }

        // Wrap around boundaries
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Slow breathing alpha
        this.pulseVal += this.pulseSpeed;
        this.alpha = this.baseAlpha + Math.sin(this.pulseVal) * 0.1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, ${Math.max(0.08, this.alpha)})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `rgba(${this.color}, 0.6)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
      }
    };

    initParticles();

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;

      // Smoothly interpolate (lerp) mouse position with 0.035 easing factor
      // This ensures movements are slow, fluid, and graceful rather than snappy
      mouse.x += (mouse.targetX - mouse.x) * 0.035;
      mouse.y += (mouse.targetY - mouse.y) * 0.035;

      // Smoothly fade in/out mouse presence
      const targetOpacity = mouse.active ? 1 : 0;
      mouse.opacity += (targetOpacity - mouse.opacity) * 0.035;

      // 1. Draw smooth, slow-gliding cursor spotlight directly on canvas
      if (mouse.opacity > 0.01) {
        const spotGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, SPOTLIGHT_RADIUS);
        spotGrad.addColorStop(0, `rgba(96, 165, 250, ${0.12 * mouse.opacity})`);
        spotGrad.addColorStop(0.35, `rgba(59, 130, 246, ${0.06 * mouse.opacity})`);
        spotGrad.addColorStop(0.7, `rgba(37, 99, 235, ${0.02 * mouse.opacity})`);
        spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Update and draw nodes
      const isMouseInteracting = mouse.opacity > 0.05;
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(mouse.x, mouse.y, isMouseInteracting);
        particles[i].draw();
      }

      // 3. Draw calm network filaments between nearby nodes
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;

          if (distSq < CONNECT_DIST * CONNECT_DIST) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / CONNECT_DIST) * 0.18;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(96, 165, 250, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }

        // 4. Connect smoothly to slow-gliding mouse pointer
        if (mouse.opacity > 0.05) {
          const mdx = particles[i].x - mouse.x;
          const mdy = particles[i].y - mouse.y;
          const mDistSq = mdx * mdx + mdy * mdy;

          if (mDistSq < MOUSE_CONNECT_DIST * MOUSE_CONNECT_DIST) {
            const mDist = Math.sqrt(mDistSq);
            const mAlpha = (1 - mDist / MOUSE_CONNECT_DIST) * 0.28 * mouse.opacity;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${mAlpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [compact]);

  return (
    <div className="hero-bg-container" aria-hidden="true">
      {/* 1. Cyber Perspective Grid Layer */}
      <div className="hero-grid-layer" />

      {/* 2. Top Horizon Light Beam & Radiant Flare */}
      <div className={`hero-top-flare ${compact ? 'hero-top-flare-compact' : ''}`} />
      <div className="hero-horizon-beam" />

      {/* 3. Floating Cosmic Aurora Plasma Orbs */}
      <div className={`hero-aurora-orb ${compact ? 'hero-aurora-compact-1' : 'hero-aurora-1'}`} />
      <div className={`hero-aurora-orb ${compact ? 'hero-aurora-compact-2' : 'hero-aurora-2'}`} />
      <div className={`hero-aurora-orb ${compact ? 'hero-aurora-compact-3' : 'hero-aurora-3'}`} />

      {/* 4. Canvas for Particles, Network Filaments, and Slow-Gliding Cursor Spotlight */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none opacity-85"
      />
    </div>
  );
}
