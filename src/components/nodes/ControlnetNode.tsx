
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Loader2 } from 'lucide-react';

interface ControlnetNodeProps {
  id: string;
  data: {
    type: string;
    image: string | null;
    imageId?: string; // Added imageId to store the uploaded image UUID
    uploading?: boolean; // Added uploading status flag
    strength: number;
    // New style properties
    displayName: string;
    emoji: string;
    color: string;
  };
  selected: boolean;
}

export const ControlnetNode = ({ data, selected }: ControlnetNodeProps) => {
  return (
    <div 
      className={`relative flex flex-col items-center gap-2 rounded-lg 
        ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ backgroundColor: data.color || '#10b981' }} // Default to green if no color set
    >
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-lg font-medium text-white">
          {data.displayName || `${data.type} Control`}
        </span>
        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
          <span className="text-xl">{data.emoji || '🎯'}</span>
        </div>
      </div>

      {/* Display the image thumbnail if it exists, with loading indicator */}
      {data.image && (
        <div className="px-2 pb-2 w-full">
          <div className="w-full h-24 overflow-hidden rounded-md border border-white relative">
            {data.uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
            <img 
              src={data.image} 
              alt={`${data.type} control image`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="controlnet-in"
        className="!bg-white !border-none w-3 h-3 !-top-1"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="controlnet-out"
        className="!bg-white !border-none w-3 h-3 !-bottom-1"
      />
    </div>
  );
};
