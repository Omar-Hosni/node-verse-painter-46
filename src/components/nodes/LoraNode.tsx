
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface LoraNodeProps {
  id: string;
  data: {
    loraName: string;
    loraType?: string;
    strength: number;
    // Style properties
    displayName: string;
    emoji: string;
    color: string;
    tutorialVideo?: string;
    description?: string;
  };
  selected: boolean;
}

export const LoraNode = ({ data, selected }: LoraNodeProps) => {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <div 
      className={`relative flex flex-col items-center rounded-xl overflow-hidden lora-node
        ${selected ? 'selected' : ''}`}
      style={{ 
        minWidth: '220px',
      }}
    >
      <div className="node-header w-full justify-between">
        <div className="flex items-center gap-2">
          <div className="node-icon-container">
            <span className="text-xl">{data.emoji || '🔧'}</span>
          </div>
          <span className="text-base font-semibold text-white tracking-wide">
            {data.displayName || 'LoRA'}
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
      <div className="node-content w-full">
        <div className="image-preview w-full h-24 flex items-center justify-center">
          <img 
            src="/placeholder.svg" 
            alt="LoRA visualization"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Horizontal handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="lora-in"
        className="!bg-white !border-2 !border-purple-500 w-4 h-4"
        style={{ left: -8, zIndex: 100 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="lora-out"
        className="!bg-white !border-2 !border-purple-500 w-4 h-4"
        style={{ right: -8, zIndex: 100 }}
      />
    </div>
  );
};
