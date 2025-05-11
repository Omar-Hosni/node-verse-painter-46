
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div 
      className={`relative flex flex-col items-center gap-2 p-3 rounded-xl overflow-hidden
        ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ 
        backgroundColor: data.color || '#ff69b4', 
        minWidth: '200px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="flex items-center w-full justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
            <span className="text-xl">{data.emoji || '🎨'}</span>
          </div>
          <span className="text-lg font-medium text-white">
            {data.displayName || 'Model'}
          </span>
        </div>
        
        {/* Help tooltip/popover with tutorial video */}
        <TooltipProvider>
          <Popover open={showTutorial} onOpenChange={setShowTutorial}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button 
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                    aria-label="Show tutorial"
                  >
                    <HelpCircle className="h-5 w-5 text-white" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Click for help</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-80 p-0" side="right">
              <div className="flex flex-col">
                {data.tutorialVideo && (
                  <video 
                    className="w-full h-40 object-cover rounded-t-lg" 
                    src={data.tutorialVideo} 
                    autoPlay 
                    loop 
                    muted 
                  />
                )}
                <div className="p-4">
                  <h4 className="font-semibold mb-2">{data.displayName}</h4>
                  <p className="text-sm text-muted-foreground">{data.description}</p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </TooltipProvider>
      </div>

      {/* Image placeholder */}
      <div className="w-full h-24 rounded-lg overflow-hidden mb-2">
        <img 
          src="/placeholder.svg" 
          alt="Model visualization"
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Only source handle (output) for model nodes - Improved visibility */}
      <Handle
        type="source"
        position={Position.Right}
        id="model-out"
        className="!bg-white !border-2 !border-blue-500 w-4 h-4 !-right-2"
      />
    </div>
  );
};
