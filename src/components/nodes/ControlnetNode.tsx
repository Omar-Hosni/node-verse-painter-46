
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Loader2, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ControlnetNodeProps {
  id: string;
  data: {
    type: string;
    controlNetType?: string;
    image: string | null;
    imageId?: string;
    uploading?: boolean;
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

export const ControlnetNode = ({ data, selected }: ControlnetNodeProps) => {
  const [showTutorial, setShowTutorial] = useState(false);
  
  return (
    <div 
      className={`relative flex flex-col items-center gap-2 rounded-lg 
        ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ backgroundColor: data.color || '#10b981', minWidth: '200px' }}
    >
      <div className="flex items-center w-full px-4 py-2 justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
            <span className="text-xl">{data.emoji || '🎯'}</span>
          </div>
          <span className="text-lg font-medium text-white">
            {data.displayName || `${data.type} Control`}
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

      {/* Horizontal handles - Improved visibility */}
      <Handle
        type="target"
        position={Position.Left}
        id="controlnet-in"
        className="!bg-white !border-2 !border-green-500 w-4 h-4 !-left-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="controlnet-out"
        className="!bg-white !border-2 !border-green-500 w-4 h-4 !-right-2"
      />
    </div>
  );
};
