
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Palette } from 'lucide-react';

interface ModelNodeProps {
  id: string;
  data: {
    modelName: string;
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    prompt: string;
    negativePrompt: string;
    // New style properties
    displayName: string;
    emoji: string;
    color: string;
  };
  selected: boolean;
}

export const ModelNode = ({ data, selected }: ModelNodeProps) => {
  return (
    <div 
      className={`relative flex items-center gap-3 px-4 py-2 rounded-full 
        ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ backgroundColor: data.color || '#ff69b4' }} // Default to pink if no color set
    >
      <span className="text-lg font-medium text-white">
        {data.displayName || 'Model'}
      </span>
      <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
        <span className="text-xl">{data.emoji || '🎨'}</span>
      </div>
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="model-out"
        className="!bg-white !border-none w-3 h-3 !-bottom-1"
      />
    </div>
  );
};
