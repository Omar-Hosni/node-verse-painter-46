import { useReactFlow } from '@xyflow/react';
import { useState, useEffect } from 'react';
import { Search, Plus, Minus } from 'lucide-react';

export const ZoomControl = () => {
  const { getViewport, setViewport } = useReactFlow();
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const updateZoom = () => {
      const { zoom } = getViewport();
      setZoom(zoom);
    };
    updateZoom();
    const interval = setInterval(updateZoom, 100);
    return () => clearInterval(interval);
  }, [getViewport]);

  const zoomPercentage = Math.round(zoom * 100);

  const setZoomPercentage = (percent: number) => {
    const clampedZoom = Math.max(0, Math.min(percent, 100)) / 100;
    setViewport({ zoom: clampedZoom, x: 0, y: 0 });
    setZoom(clampedZoom);
  };

  return (
    <div className="flex items-center bg-[#1a1a1a] rounded-full px-3 py-1 text-sm text-gray-300">
      <Search className="h-4 w-4 text-gray-400" />
      
      {/* Input field without steppers */}
      <input
        type="text" // Changed to text to remove steppers
        value={zoomPercentage}
        onChange={(e) => {
          const value = e.target.value.replace(/\D/g, ''); // Allow only numbers
          if (value) setZoomPercentage(Number(value));
        }}
        className="w-12 bg-transparent text-center text-gray-400 outline-none"
      />
      <span>%</span>
    </div>
  );
};
