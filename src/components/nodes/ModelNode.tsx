import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { User } from 'lucide-react'; // You can change this to your desired icon

interface ModelNodeProps {
  id: string;
  data: {
    modelName: string;
    modelType?: string;
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    prompt: string;
    negativePrompt: string;
    // Style properties
    displayName: string;
    emoji: string;
    color: string;
    tutorialVideo?: string;
    description?: string;
  };
  selected: boolean;
}

export const ModelNode = ({ data, selected }: ModelNodeProps) => {
  const modelImage = 'https://preview.redd.it/sd-looks-better-than-flux-in-some-cases-v0-qg8b1dxh4agd1.png?width=1024&format=png&auto=webp&s=79fb1950a0c8f38b67b1087c8a3bd18e63f0e5a2'; // Change as needed

  return (
    <div
      className={`flex items-center justify-between bg-[#111] rounded-full px-3 py-2 shadow-lg ${selected ? 'ring-2 ring-white' : ''}`}
      style={{ width: 220 }}
    >
      {/* Left section: Icon and Label */}
      <div className="flex items-center space-x-2">
        <User className="h-4 w-4 text-white" /> {/* Replace with desired icon */}
        <span className="text-white text-sm font-medium">{data.displayName || 'Pose controller'}</span>
      </div>

      {/* Right section: Circular Image */}
      <div className="w-8 h-8 rounded-full overflow-hidden">
        <img
          src={modelImage}
          alt={data.displayName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Handle for connection */}
      <Handle
        type="source"
        position={Position.Right}
        id="model-out"
        className="!bg-white !border-none w-3 h-3"
        style={{ right: -6 }}
      />
    </div>
  );
};
