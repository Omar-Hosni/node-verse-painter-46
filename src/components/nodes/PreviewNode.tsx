
import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface PreviewNodeProps {
  id: string;
  data: {
    image: string | null;
    // Style properties
    displayName: string;
    emoji: string;
    color: string;
  };
  selected: boolean;
}

export const PreviewNode = ({ data, selected }: PreviewNodeProps) => {
  return (
    <div 
      className={`relative flex flex-col items-center gap-2 px-4 py-2 rounded-lg 
        ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ backgroundColor: data.color || '#f59e0b' }} // Default to amber if no color set
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
          <span className="text-xl">{data.emoji || '🖼️'}</span>
        </div>
        <span className="text-lg font-medium text-white">
          {data.displayName || 'Preview'}
        </span>
      </div>
      
      {/* Display the image if it exists */}
      {data.image && (
        <div className="mt-1 max-w-[200px] max-h-[200px] overflow-hidden rounded-md border-2 border-white">
          <img 
            src={data.image} 
            alt="Generated" 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Horizontal handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="preview-in"
        className="!bg-white !border-none w-3 h-3 !-left-1"
      />
    </div>
  );
};
