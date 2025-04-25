
import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface LoraNodeProps {
  id: string;
  data: {
    loraName: string;
    strength: number;
    // New style properties
    displayName: string;
    emoji: string;
    color: string;
  };
  selected: boolean;
}

export const LoraNode = ({ data, selected }: LoraNodeProps) => {
  return (
    <div 
      className={`relative flex items-center gap-3 px-4 py-2 rounded-full 
        ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ backgroundColor: data.color || '#8b5cf6' }} // Default to purple if no color set
    >
      <span className="text-lg font-medium text-white">
        {data.displayName || 'LoRA'}
      </span>
      <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
        <span className="text-xl">{data.emoji || '🔧'}</span>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="lora-in"
        className="!bg-white !border-none w-3 h-3 !-top-1"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="lora-out"
        className="!bg-white !border-none w-3 h-3 !-bottom-1"
      />
    </div>
  );
};
