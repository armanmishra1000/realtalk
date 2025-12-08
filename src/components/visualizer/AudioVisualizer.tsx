'use client';

import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  mode?: 'listening' | 'speaking';
  className?: string;
}

export function AudioVisualizer({ isActive, mode = 'listening', className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      const centerY = height / 2;

      if (isActive) {
        // Draw rainbow waveform with segments
        const amplitude = mode === 'speaking' ? 10 : 5;
        const frequency = mode === 'speaking' ? 0.1 : 0.2;
        const speed = 0.2;
        const segmentWidth = 3;

        for (let x = 0; x < width; x += segmentWidth) {
          ctx.beginPath();
          
          // Calculate y positions for this segment
          const y1 = centerY + Math.sin(x * frequency + phase) * amplitude * Math.sin(x * 0.05 + phase * 0.5);
          const y2 = centerY + Math.sin((x + segmentWidth) * frequency + phase) * amplitude * Math.sin((x + segmentWidth) * 0.05 + phase * 0.5);
          
          ctx.moveTo(x, y1);
          ctx.lineTo(x + segmentWidth, y2);
          
          // Rainbow color based on position + animation phase
          const hue = ((x / width) * 360 + phase * 20) % 360;
          ctx.strokeStyle = `hsl(${hue}, 80%, 55%)`;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        phase += speed;
      } else {
        // Draw gradient flat line when inactive
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    // Resize canvas to parent
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    
    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [isActive, mode]);

  return (
    <div className={`h-24 w-full ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
