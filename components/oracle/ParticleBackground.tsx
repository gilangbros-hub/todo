'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ParticleBackgroundProps {
  density?: number;
  color?: string;
  speed?: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
}

/**
 * Canvas-based gold particle animation for the Gatehouse page.
 * Respects prefers-reduced-motion — renders nothing if reduced motion is preferred.
 * Throttled to ~30fps via requestAnimationFrame.
 */
export function ParticleBackground({
  density = 50,
  color = 'rgba(236, 193, 79,',
  speed = 1,
}: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);

  const prefersReducedMotion = useRef(false);

  // Check reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mq.matches;

    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const initParticles = useCallback(
    (width: number, height: number) => {
      const particles: Particle[] = [];
      for (let i = 0; i < density; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2 + 0.5,
          speedY: -(Math.random() * 0.5 + 0.2) * speed,
          speedX: (Math.random() - 0.5) * 0.3 * speed,
          opacity: Math.random() * 0.6 + 0.2,
        });
      }
      particlesRef.current = particles;
    },
    [density, speed]
  );

  const animate = useCallback(
    (timestamp: number) => {
      if (prefersReducedMotion.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Throttle to ~30fps (33ms per frame)
      if (timestamp - lastFrameRef.current < 33) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameRef.current = timestamp;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      for (const particle of particlesRef.current) {
        // Update position
        particle.y += particle.speedY;
        particle.x += particle.speedX;

        // Fade near top of screen
        const fadeZone = height * 0.2;
        let drawOpacity = particle.opacity;
        if (particle.y < fadeZone) {
          drawOpacity *= particle.y / fadeZone;
        }

        // Reset particle when it goes off-screen (top)
        if (particle.y < -10) {
          particle.y = height + 10;
          particle.x = Math.random() * width;
          particle.opacity = Math.random() * 0.6 + 0.2;
        }

        // Wrap horizontally
        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `${color} ${drawOpacity})`;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    },
    [color]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      initParticles(canvas.width, canvas.height);
    };

    resizeCanvas();
    animationRef.current = requestAnimationFrame(animate);

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas.parentElement!);

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
    };
  }, [animate, initParticles]);

  // Don't render canvas at all if reduced motion is preferred (SSR-safe check done in useEffect)
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}
