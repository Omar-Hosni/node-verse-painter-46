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
      
      // Fill with transparent background for mask drawing
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
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

    // Clear the canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [imageLoaded]);

  const handleComplete = useCallback(() => {
    if (!canvasRef.current || !imageLoaded) return;
    
    const canvas = canvasRef.current;
    
    // Create a new canvas for the pure black/white mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    
    if (maskCtx) {
      // Fill with black background
      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      
      // Get image data from the original canvas
      const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
      
      if (imageData) {
        // Create a new image data for the mask
        const maskImageData = maskCtx.createImageData(canvas.width, canvas.height);
        
        // Process each pixel to create a pure black/white mask
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const a = imageData.data[i + 3];
          
          // Check if this pixel is part of the mask (not the original image)
          // We'll use a simple threshold - if the pixel is significantly different from black,
          // it's part of the mask
          const isMaskPixel = (r > 30 || g > 30 || b > 30 || a > 30);
          
          if (isMaskPixel) {
            // White for mask areas
            maskImageData.data[i] = 255;     // R
            maskImageData.data[i + 1] = 255; // G
            maskImageData.data[i + 2] = 255; // B
            maskImageData.data[i + 3] = 255; // A
          } else {
            // Black for non-mask areas
            maskImageData.data[i] = 0;       // R
            maskImageData.data[i + 1] = 0;   // G
            maskImageData.data[i + 2] = 0;   // B
            maskImageData.data[i + 3] = 255; // A
          }
        }
        
        // Put the processed image data back to the mask canvas
        maskCtx.putImageData(maskImageData, 0, 0);
      }
      
      const maskDataUrl = maskCanvas.toDataURL('image/png');
      onMaskComplete(maskDataUrl);
    }
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

        {/* Canvas with background image */}
        <div className="mb-4 flex justify-center relative">
          {/* Background image */}
          <img 
            src={imageUrl} 
            alt="Original" 
            className="absolute inset-0 w-full h-full object-contain border border-[#333333] rounded"
            style={{ imageRendering: 'pixelated' }}
          />
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="relative border border-[#333333] rounded cursor-crosshair max-w-full max-h-[60vh] bg-transparent"
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