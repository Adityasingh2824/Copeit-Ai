import { useEffect, useRef } from 'react';

export default function Hyperspeed({ speed = 1, boost = 3, lanes = 3, roadWidth = 10, density = 40, trailLength = 1, lightSize = 1, glow = 0.6, interactive = true, headColors = ['#03b3c3', '#0e5ea5', '#324555'], tailColors = ['#d856bf', '#6750a2', '#c247ac'] }) {
  const canvasRef = useRef(null);
  const pointerRef = useRef({ x: 0.72 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return undefined;
    const context = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles = [];
    const count = Math.max(24, Math.round(density * 1.6));
    let width = 0; let height = 0; let frame = 0; let raf = 0;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = host.clientWidth; height = host.clientHeight;
      canvas.width = Math.floor(width * ratio); canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    for (let index = 0; index < count; index += 1) particles.push({ depth: Math.random(), lane: Math.floor(Math.random() * lanes), drift: (Math.random() - 0.5) * 0.08, color: index % 2 ? tailColors[index % tailColors.length] : headColors[index % headColors.length] });
    const move = event => { const rect = host.getBoundingClientRect(); pointerRef.current.x = (event.clientX - rect.left) / rect.width; };
    const draw = () => {
      frame += 1; context.clearRect(0, 0, width, height);
      const horizon = height * 0.39; const steer = interactive ? (pointerRef.current.x - 0.5) * width * 0.18 : 0;
      context.fillStyle = 'rgba(4, 10, 18, 0.32)'; context.fillRect(0, 0, width, height); context.save(); context.globalCompositeOperation = 'screen';
      particles.forEach((particle, index) => {
        particle.depth += (0.0034 + (index % 5) * 0.00055) * speed * (frame % 240 > 185 ? boost : 1);
        particle.lane += particle.drift;
        if (particle.depth > 1.08) { particle.depth = 0.015; particle.lane = Math.floor(Math.random() * lanes); }
        const z = particle.depth ** 2; const laneX = ((particle.lane + 0.5) / lanes - 0.5) * width * (0.22 + z * roadWidth * 0.1); const x = width / 2 + laneX + steer * z; const y = horizon + z * (height - horizon + 35); const length = (10 + z * 100) * trailLength; const size = Math.max(0.5, (0.8 + z * 2.2) * lightSize);
        const gradient = context.createLinearGradient(x, y - length, x, y + 2); gradient.addColorStop(0, `${particle.color}00`); gradient.addColorStop(0.72, `${particle.color}${Math.round(90 + glow * 80).toString(16)}`); gradient.addColorStop(1, particle.color);
        context.strokeStyle = gradient; context.lineWidth = size; context.beginPath(); context.moveTo(x - steer * 0.02, y - length); context.lineTo(x, y); context.stroke();
      });
      context.restore(); if (!reduced) raf = requestAnimationFrame(draw);
    };
    resize(); window.addEventListener('resize', resize); if (interactive) host.addEventListener('pointermove', move, { passive: true }); draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); if (interactive) host.removeEventListener('pointermove', move); };
  }, [boost, density, glow, headColors, interactive, lanes, lightSize, roadWidth, speed, tailColors, trailLength]);
  return <canvas ref={canvasRef} className="hyperspeed-canvas" aria-hidden="true" />;
}
