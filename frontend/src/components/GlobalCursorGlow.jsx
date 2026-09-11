import { useEffect, useRef } from 'react';

/**
 * GlobalCursorGlow
 * Renders a high-end, GPU-accelerated cybernetic glow aura that follows the mouse pointer
 * globally across the entire application viewport without triggering React re-renders.
 */
export default function GlobalCursorGlow() {
  const glowRef = useRef(null);
  const posRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000, visible: false });

  useEffect(() => {
    // Only run on devices with fine pointer (mouse), not touch screens
    if (typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const glowEl = glowRef.current;
    if (!glowEl) return;

    let animId;

    const handlePointerMove = (e) => {
      posRef.current.targetX = e.clientX;
      posRef.current.targetY = e.clientY;
      if (!posRef.current.visible) {
        posRef.current.visible = true;
        glowEl.style.opacity = '1';
      }
    };

    const handlePointerLeave = () => {
      posRef.current.visible = false;
      if (glowEl) {
        glowEl.style.opacity = '0';
      }
    };

    const handlePointerEnter = () => {
      posRef.current.visible = true;
      if (glowEl) {
        glowEl.style.opacity = '1';
      }
    };

    // 60-120 FPS GPU smooth animation loop
    const render = () => {
      const pos = posRef.current;
      // Smooth interpolation for elegant trailing float
      pos.x += (pos.targetX - pos.x) * 0.18;
      pos.y += (pos.targetY - pos.y) * 0.18;

      if (glowEl && pos.visible) {
        glowEl.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      }

      animId = requestAnimationFrame(render);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);
    document.addEventListener('mouseenter', handlePointerEnter);

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
      document.removeEventListener('mouseenter', handlePointerEnter);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full transition-opacity duration-300 ease-out"
      style={{
        width: '420px',
        height: '420px',
        background: 'radial-gradient(circle, rgba(96, 165, 250, 0.18) 0%, rgba(59, 130, 246, 0.10) 30%, rgba(37, 99, 235, 0.03) 60%, transparent 80%)',
        opacity: 0,
        willChange: 'transform, opacity',
        mixBlendMode: 'screen',
      }}
    />
  );
}
