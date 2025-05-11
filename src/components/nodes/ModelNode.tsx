
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

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
  // Determine the model image based on model type
  let modelImage = '/lovable-uploads/df1cf4c1-198e-4bd9-8827-57cc3a331657.png'; // Default to SDXL
  
  if (data.modelType === 'flux') {
    modelImage = '/lovable-uploads/334c0c60-a16b-41af-8e36-3ce5c24b1205.png';
  } else if (data.modelType === 'hidream') {
    modelImage = '/lovable-uploads/19b91c24-3fce-4587-a291-d38f8d7b359a.png';
  }
  
  // Get the tutorial content for each model type
  const getTutorialContent = () => {
    switch (data.modelType) {
      case 'flux':
        return {
          title: "Flux Model",
          description: "The Flux model is specialized for dynamic and fluid-like image generation, perfect for creating abstract and flowing artwork."
        };
      case 'hidream':
        return {
          title: "HiDream Model",
          description: "HiDream is designed for highly detailed dream-like imagery, with enhanced capabilities for surreal and vivid scenes."
        };
      default:
        return {
          title: "SDXL Model",
          description: "Stable Diffusion XL is the main model that transforms text prompts into high-quality images with detailed control over the generation process."
        };
    }
  };
  
  const tutorialContent = getTutorialContent();

  return (
    <div 
      className={`relative rounded-xl ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ width: 220 }}
    >
      <div 
        className="p-3 flex items-center justify-between"
        style={{ backgroundColor: data.color || '#1a365d' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
            <span className="text-xl">{data.emoji || '🎨'}</span>
          </div>
          <span className="text-lg font-medium text-white">
            {data.displayName || 'Model'}
          </span>
        </div>

        <HoverCard>
          <HoverCardTrigger asChild>
            <button className="text-white hover:text-gray-200">
              <HelpCircle className="h-5 w-5" />
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 bg-gray-800 border-gray-700 text-white">
            <div className="space-y-2">
              <h4 className="text-lg font-semibold">{tutorialContent.title}</h4>
              <p className="text-sm text-gray-300">{tutorialContent.description}</p>
              <div className="mt-2 bg-gray-900 rounded overflow-hidden">
                <img 
                  src={modelImage}
                  alt={`${data.displayName} example`}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
      
      <div className="bg-gray-800 p-2">
        <img 
          src={modelImage}
          alt={data.displayName}
          className="w-full h-auto rounded object-cover"
          style={{ maxHeight: '120px' }}
        />
      </div>
      
      {/* Horizontal handles with improved positioning */}
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
