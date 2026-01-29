import { useEffect, useRef } from 'react';

export default function PixelBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Configuration
    const particleCount = 40; // Number of floating bits
    const gridSize = 10;      // The "pixel" grid size (movement snaps to this)
    const speedBase = 0.5;    // Base speed of drift
    const colors = ['#2563EB', '#93C5FD', '#1E40AF']; // Blue shades (Tailwind)
    const bgColor = '#eff6ff'; // bg-blue-50

    // Particle System
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
    }

    let particles: Particle[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        initParticles(); // Re-init on resize to fill screen
      }
    };

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: (Math.floor(Math.random() * 2) + 1) * gridSize, // Size: 10px or 20px
          speedX: (Math.random() - 0.5) * speedBase,
          speedY: (Math.random() - 0.5) * speedBase,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    const draw = () => {
      // 1. Clear & Fill Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Static Grid Pattern (Faint)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      for (let x = 0; x < canvas.width; x += gridSize * 2) {
        for (let y = 0; y < canvas.height; y += gridSize * 2) {
          ctx.fillRect(x, y, 2, 2);
        }
      }

      // 3. Update & Draw Moving Particles
      particles.forEach(p => {
        // Update position
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around screen
        if (p.x < -p.size) p.x = canvas.width;
        if (p.x > canvas.width) p.x = -p.size;
        if (p.y < -p.size) p.y = canvas.height;
        if (p.y > canvas.height) p.y = -p.size;

        // Snap to grid for 8-bit feel
        const snappedX = Math.round(p.x / gridSize) * gridSize;
        const snappedY = Math.round(p.y / gridSize) * gridSize;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.6; // Slightly transparent
        ctx.fillRect(snappedX, snappedY, p.size, p.size);
        ctx.globalAlpha = 1.0;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    // Initialize
    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none -z-10"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}