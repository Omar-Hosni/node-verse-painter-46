import React, { useRef, useEffect, useState } from 'react';

export const DrawingOverlay = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.lineCap = 'round';
        context.strokeStyle = '#ff0071';
        context.lineWidth = 2;
        setCtx(context);
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent) => {
    if (!ctx) return;
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !ctx) return;
    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    ctx?.closePath();
  };

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-screen h-screen z-[100] bg-transparent"
      style={{ pointerEvents: isDrawing ? 'auto' : 'none' }}
      onMouseDown={(e) => {
        startDrawing(e);
      }}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
    />
  );
};
