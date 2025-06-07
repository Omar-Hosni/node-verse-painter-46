import { useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';

interface FloatingPaintCanvasProps {
  isPainting: boolean;
}

export const FloatingPaintCanvas = ({ isPainting }: FloatingPaintCanvasProps) => {
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [drawing, setDrawing] = useState(false);

  const { getViewport } = useReactFlow();
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  // Keep viewport updated every 100ms
  useEffect(() => {
    const update = () => setViewport(getViewport());
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, []);

  // Initialize canvases
  useEffect(() => {
    const canvas = canvasRef.current;

    const container = document.getElementById('canvas-area');
    if (!canvas || !container) return;

    // Set canvas dimensions
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Main canvas context
    const mainCtx = canvas.getContext('2d');
    if (mainCtx) {
      setCtx(mainCtx);
    }

    // Offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const offCtx = offscreen.getContext('2d');
    if (offCtx) {
      offCtx.lineCap = 'round';
      offCtx.lineJoin = 'round';
      offCtx.strokeStyle = '#ffffff'; // white stroke
      offCtx.lineWidth = 3;
    }
    offscreenCanvasRef.current = offscreen;
  }, []);

  
  // Draw offscreen image with zoom/pan
  useEffect(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !ctx || !offscreen) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transform and draw from offscreen
    ctx.setTransform(viewport.zoom, 0, 0, viewport.zoom, viewport.x, viewport.y);
    ctx.drawImage(offscreen, 0, 0);
  }, [viewport, ctx]);



  const getMousePos = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Apply inverse of zoom & pan to match coordinates
    const x = (clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (clientY - rect.top - viewport.y) / viewport.zoom;

    return { x, y };
  };

  const startDraw = (e: MouseEvent | TouchEvent) => {
    if (!isPainting) return;

    const offCtx = offscreenCanvasRef.current?.getContext('2d');
    if (!offCtx) return;

    const { x, y } = getMousePos(e);
    offCtx.beginPath();
    offCtx.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isPainting || !drawing) return;

    const offCtx = offscreenCanvasRef.current?.getContext('2d');
    if (!offCtx) return;

    const { x, y } = getMousePos(e);
    offCtx.lineTo(x, y);
    offCtx.stroke();

    // Repaint updated offscreen to visible canvas
    const canvas = canvasRef.current;
    if (!canvas || !ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(viewport.zoom, 0, 0, viewport.zoom, viewport.x, viewport.y);
    ctx.drawImage(offscreenCanvasRef.current!, 0, 0);
  };

  const stopDraw = () => {
    if (!isPainting) return;
    setDrawing(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const down = (e: any) => {
      e.stopPropagation();
      startDraw(e);
    };
    const move = (e: any) => {
      e.stopPropagation();
      draw(e);
    };
    const up = () => stopDraw();

    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', up);
    canvas.addEventListener('mouseleave', up);

    canvas.addEventListener('touchstart', down);
    canvas.addEventListener('touchmove', move);
    canvas.addEventListener('touchend', up);

    return () => {
      canvas.removeEventListener('mousedown', down);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', up);
      canvas.removeEventListener('mouseleave', up);

      canvas.removeEventListener('touchstart', down);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', up);
    };
  }, [isPainting, drawing, ctx, viewport]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{
        pointerEvents: isPainting ? 'auto' : 'none',
        cursor: isPainting ? 'crosshair' : 'default',
        zIndex: 20,
      }}
    />
  );
};
