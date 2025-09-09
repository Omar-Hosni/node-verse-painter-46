import { useReactFlow } from '@xyflow/react';
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

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
    const clamped = Math.max(0, Math.min(percent, 100)) / 100; // keep your 0–100% range
    setViewport({ zoom: clamped, x: 0, y: 0 });
    setZoom(clamped);
  };

  return (
    <div
      className="
        flex items-center justify-center
        h-[33px] w-[78px]
        rounded-[16px] bg-[#1A1A1A]
        text-[12px] leading-none
        text-white/70
      "
    >
      <Search className="h-4 w-4 mr-1.5 text-white/40" aria-hidden />

      <input
        type="text"
        inputMode="numeric"
        value={zoomPercentage}
        onChange={(e) => {
          const value = e.target.value.replace(/\D/g, '');
          if (value !== '') setZoomPercentage(Number(value));
        }}
        onKeyDown={(e) => {
          // Prevent typing non-numeric signs like e/E/+/- and submitting on Enter
          if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="
          w-[30px] text-center
          bg-transparent outline-none
          text-white/80
          caret-transparent selection:bg-transparent
          placeholder-white/40
          appearance-none
        "
        aria-label="Zoom percentage"
      />
      <span className="ml-0.5 text-white/60">%</span>
    </div>
  );
};
