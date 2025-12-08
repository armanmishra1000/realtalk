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
      ctx.beginPath();
      
      const centerY = height / 2;
      ctx.moveTo(0, centerY);

      if (isActive) {
        // Draw waveform
        const amplitude = mode === 'speaking' ? 10 : 5; // Smaller amplitude for mini visualizer
        const frequency = mode === 'speaking' ? 0.1 : 0.2;
        const speed = 0.2;

        for (let x = 0; x < width; x++) {
          // Create a sine wave with varying amplitude
          const y = centerY + Math.sin(x * frequency + phase) * amplitude * Math.sin(x * 0.05 + phase * 0.5);
          ctx.lineTo(x, y);
        }
        phase += speed;
      } else {
        // Draw flat line
        ctx.lineTo(width, centerY);
      }

      // Colors: Blue for User (Speaking), Green for AI (Listening/Thinking) - wait, mode logic might be flipped in parent
      // If mode is 'speaking', user is speaking -> Blue
      // If mode is 'listening', AI is speaking -> Green? Or just passive Red?
      // Let's stick to Blue (User) and Green (AI) convention if possible, but for now:
      ctx.strokeStyle = mode === 'speaking' ? '#3b82f6' : '#10b981'; 
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();

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
