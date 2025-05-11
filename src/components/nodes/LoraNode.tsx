
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
      className={`relative flex items-center gap-3 px-4 py-2 rounded-lg 
        ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ backgroundColor: data.color || '#8b5cf6', minWidth: '200px' }}
    >
      <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
        <span className="text-xl">{data.emoji || '🔧'}</span>
      </div>
      
      <span className="text-lg font-medium text-white">
        {data.displayName || 'LoRA'}
      </span>
      
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
                  className="w-full h-40 object-cover" 
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
