
import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface LoraNodeProps {
  id: string;
  data: {
    loraName: string;
    strength: number;
    // Style properties
    displayName: string;
    emoji: string;
    color: string;
  };
  selected: boolean;
}

export const LoraNode = ({ data, selected }: LoraNodeProps) => {
  return (
    <div 
      className={`relative flex items-center gap-3 px-4 py-2 rounded-lg 
        ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ backgroundColor: data.color || '#8b5cf6' }} // Default to purple if no color set
    >
      <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
        <span className="text-xl">{data.emoji || '🔧'}</span>
      </div>
      <span className="text-lg font-medium text-white">
        {data.displayName || 'LoRA'}
      </span>

      {/* Horizontal handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="lora-in"
        className="!bg-white !border-none w-3 h-3 !-left-1"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="lora-out"
        className="!bg-white !border-none w-3 h-3 !-right-1"
      />
    </div>
  );
};
