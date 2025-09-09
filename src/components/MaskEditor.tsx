import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Brush, Eraser, RotateCcw, Check, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface MaskEditorProps {
  imageUrl: string;
  onMaskComplete: (maskDataUrl: string) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export const MaskEditor: React.FC<MaskEditorProps> = ({
  imageUrl,
  onMaskComplete,
  onCancel,
  isOpen
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [imageLoaded, setImageLoaded] = useState(false);

  // Initialize canvas with image
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the image as background
      ctx.drawImage(img, 0, 0);
      
      // Set up drawing context for mask
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl, isOpen]);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imageLoaded) return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Set drawing properties
    ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';
    ctx.strokeStyle = tool === 'brush' ? 'rgba(255, 255, 255, 0.8)' : 'transparent';
    ctx.lineWidth = brushSize;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [tool, brushSize, imageLoaded]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, imageLoaded]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearMask = useCallback(() => {
    if (!canvasRef.current || !imageLoaded) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw the original image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageUrl;
  }, [imageUrl, imageLoaded]);

  const handleComplete = useCallback(() => {
    if (!canvasRef.current || !imageLoaded) return;
    
    const canvas = canvasRef.current;
    const maskDataUrl = canvas.toDataURL('image/png');
    onMaskComplete(maskDataUrl);
  }, [onMaskComplete, imageLoaded]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-medium">Edit Mask for Inpainting</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-[#9e9e9e] hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-4 mb-4">
          {/* Tool Selection */}
          <div className="flex gap-2">
            <Button
              variant={tool === 'brush' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('brush')}
              className="flex items-center gap-2"
            >
              <Brush className="h-4 w-4" />
              Brush
            </Button>
            <Button
              variant={tool === 'eraser' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('eraser')}
              className="flex items-center gap-2"
            >
              <Eraser className="h-4 w-4" />
              Eraser
            </Button>
          </div>

          {/* Brush Size */}
          <div className="flex items-center gap-2 min-w-[150px]">
            <span className="text-white text-sm">Size:</span>
            <Slider
              value={[brushSize]}
              onValueChange={(value) => setBrushSize(value[0])}
              min={5}
              max={50}
              step={1}
              className="flex-1"
            />
            <span className="text-white text-sm w-8">{brushSize}</span>
          </div>

          {/* Clear Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={clearMask}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </Button>
        </div>

        {/* Canvas */}
        <div className="mb-4 flex justify-center">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="border border-[#333333] rounded cursor-crosshair max-w-full max-h-[60vh]"
            style={{ 
              cursor: tool === 'brush' ? 'crosshair' : 'grab',
              imageRendering: 'pixelated'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!imageLoaded}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            Apply Mask
          </Button>
        </div>

        <div className="mt-2 text-xs text-[#9e9e9e] text-center">
          Paint white areas to indicate regions to inpaint. Use the eraser to remove mask areas.
        </div>
      </div>
    </div>
  );
};