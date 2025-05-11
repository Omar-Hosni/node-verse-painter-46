
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CreditCard, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PreviewNodeProps {
  id: string;
  data: {
    image: string | null;
    // Style properties
    displayName: string;
    emoji: string;
    color: string;
    tutorialVideo?: string;
    description?: string;
  };
  selected: boolean;
}

export const PreviewNode = ({ data, selected }: PreviewNodeProps) => {
  const [showTutorial, setShowTutorial] = useState(false);
  
  return (
    <div 
      className={`relative flex flex-col items-center rounded-xl overflow-hidden preview-node
        ${selected ? 'selected' : ''}`}
      style={{ 
        minWidth: '220px',
      }}
    >
      <div className="node-header w-full justify-between">
        <div className="flex items-center gap-2">
          <div className="node-icon-container">
            <span className="text-xl">{data.emoji || '🖼️'}</span>
          </div>
          <span className="text-base font-semibold text-white tracking-wide">
            {data.displayName || 'Preview'}
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
      
      <div className="node-content w-full">
        {/* Cost indicator */}
        <div className="flex items-center text-xs text-gray-300 mb-2 self-start">
          <CreditCard className="h-3 w-3 mr-1 text-blue-400" />
          <span>Uses 1 credit per generation</span>
        </div>
        
        {/* Display the image if it exists, otherwise show placeholder */}
        {data.image ? (
          <div className="image-preview w-full h-32 flex items-center justify-center">
            <img 
              src={data.image} 
              alt="Generated" 
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="image-preview w-full h-32 flex items-center justify-center">
            <span className="text-gray-500">Generated image will appear here</span>
          </div>
        )}
      </div>

      {/* Horizontal handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="preview-in"
        className="!bg-white !border-2 !border-blue-500 w-4 h-4"
        style={{ left: -8, zIndex: 100 }}
      />
    </div>
  );
};
