
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from '@/store/useCanvasStore';
import { Image, Upload, X } from 'lucide-react';

interface ControlnetNodeProps {
  id: string;
  data: {
    type: string;
    image: string | null;
    strength: number;
  };
  selected: boolean;
}

export const ControlnetNode = ({ id, data, selected }: ControlnetNodeProps) => {
  const updateNodeData = useCanvasStore(state => state.updateNodeData);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateNodeData(id, { image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    updateNodeData(id, { image: null });
  };

  const handleStrengthChange = (value: number[]) => {
    updateNodeData(id, { strength: value[0] });
  };

  // Capitalize the type name for display
  const typeDisplayName = data.type.charAt(0).toUpperCase() + data.type.slice(1);

  return (
    <div className={`min-w-[250px] max-w-[250px] ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="node-header">ControlNet: {typeDisplayName}</div>
      <div className="node-content">
        <div className="mb-4">
          {data.image ? (
            <div className="relative">
              <img 
                src={data.image} 
                alt="ControlNet input" 
                className="w-full h-40 object-cover rounded-md"
              />
              <button 
                className="absolute top-1 right-1 bg-black bg-opacity-60 rounded-full p-1"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-600 rounded-md bg-gray-800 text-gray-400">
              <Upload className="h-8 w-8 mb-2" />
              <label className="cursor-pointer text-center">
                <span className="block text-blue-400 hover:text-blue-300 transition">Upload Image</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
              </label>
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">
            Strength: {data.strength.toFixed(2)}
          </label>
          <Slider 
            defaultValue={[data.strength]} 
            min={0} 
            max={1} 
            step={0.05}
            onValueChange={handleStrengthChange}
            className="my-2" 
          />
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="controlnet-in"
        style={{ top: -6 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="controlnet-out"
        style={{ bottom: -6 }}
      />
    </div>
  );
};
