
import React, { useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Loader2 } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

interface ControlnetNodeProps {
  id: string;
  data: {
    type: string;
    image: string | null;
    imageId?: string;
    uploading?: boolean;
    strength: number;
    // Canny specific properties
    low_threshold?: number;
    high_threshold?: number;
    resolution?: number;
    // Style properties
    displayName: string;
  };
  selected: boolean;
}

export const ControlnetNode = ({ id, data, selected }: ControlnetNodeProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControlNetImage = useCanvasStore(state => state.uploadControlNetImage);
  const updateNodeData = useCanvasStore(state => state.updateNodeData);
  
  // Determine if uploads are allowed
  const allowsUpload = data.type === 'pose';

  const handleImageClick = () => {
    if (allowsUpload && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!allowsUpload) return;
    
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && e.target.result) {
          const imageData = e.target.result as string;
          
          // Update the local image preview
          updateNodeData(id, {
            image: imageData,
            uploading: true
          });
          
          // Start the upload process
          uploadControlNetImage(id, imageData);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      className={`relative rounded-lg overflow-hidden bg-gray-800 controlnet-node shadow-md
        ${selected ? 'border border-purple-500' : 'border border-transparent'}`}
      style={{ width: 220 }}
    >
      <div className="p-3 border-b border-gray-700">
        <span className="text-sm font-semibold text-white">
          {data.displayName || `${data.type} Control`}
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Strength slider for all ControlNet types */}
        <div className="space-y-1">
          <label className="block text-xs text-gray-300">Strength: {data.strength.toFixed(2)}</label>
          <Slider 
            value={[data.strength]} 
            min={0} 
            max={1} 
            step={0.01} 
            onValueChange={(values) => updateNodeData(id, { strength: values[0] })}
          />
        </div>

        {/* Canny-specific controls */}
        {data.type === 'canny' && (
          <>
            <div className="space-y-1">
              <label className="block text-xs text-gray-300">Low Threshold</label>
              <Input
                type="number"
                value={data.low_threshold || 100}
                onChange={(e) => updateNodeData(id, { low_threshold: parseInt(e.target.value) })}
                className="bg-gray-700 text-white border-gray-600 h-8 text-sm"
                min={0}
                max={255}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-gray-300">High Threshold</label>
              <Input
                type="number"
                value={data.high_threshold || 200}
                onChange={(e) => updateNodeData(id, { high_threshold: parseInt(e.target.value) })}
                className="bg-gray-700 text-white border-gray-600 h-8 text-sm"
                min={0}
                max={255}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-gray-300">Resolution</label>
              <Input
                type="number"
                value={data.resolution || 512}
                onChange={(e) => updateNodeData(id, { resolution: parseInt(e.target.value) })}
                className="bg-gray-700 text-white border-gray-600 h-8 text-sm"
                min={64}
                max={1024}
                step={64}
              />
            </div>
          </>
        )}

        {/* Image upload for Pose ControlNet */}
        {allowsUpload && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {data.image ? (
              <div className="relative mt-2">
                {data.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
                <img 
                  src={data.image} 
                  alt={`${data.type} control`}
                  className="w-full h-auto rounded-md border border-gray-600"
                />
                <button
                  className="absolute top-1 right-1 bg-red-500 rounded-full p-1 text-white text-xs"
                  onClick={() => updateNodeData(id, { image: null })}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div 
                className="mt-2 h-24 flex items-center justify-center border border-dashed border-gray-400 rounded-md bg-black bg-opacity-20 text-white cursor-pointer"
                onClick={handleImageClick}
              >
                <span className="text-sm">Click to upload image</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Horizontal handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="controlnet-in"
        className="!bg-white !border-2 !border-green-500 w-3 h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="controlnet-out"
        className="!bg-white !border-2 !border-green-500 w-3 h-3"
      />
    </div>
  );
};
