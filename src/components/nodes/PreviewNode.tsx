
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
      className={`relative flex flex-col items-center gap-2 p-3 rounded-xl overflow-hidden
        ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ 
        backgroundColor: data.color || '#1A1A1A', 
        borderColor: '#333', 
        minWidth: '200px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="flex items-center w-full justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-[#252525] rounded-full">
            <span className="text-xl">{data.emoji || '🖼️'}</span>
          </div>
          <span className="text-lg font-medium text-white">
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
      
      {/* Cost indicator */}
      <div className="flex items-center text-xs text-gray-300 mb-1 self-start">
        <CreditCard className="h-3 w-3 mr-1 text-blue-400" />
        <span>Uses 1 credit per generation</span>
      </div>
      
      {/* Display the image if it exists, otherwise show placeholder */}
      {data.image ? (
        <div className="w-full h-32 overflow-hidden rounded-lg mb-2">
          <img 
            src={data.image} 
            alt="Generated" 
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-32 rounded-lg overflow-hidden mb-2 bg-[#252525] flex items-center justify-center">
          <span className="text-gray-500">Generated image will appear here</span>
        </div>
      )}

      {/* Horizontal handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="preview-in"
        className="!bg-blue-500 !border-none w-3 h-3 !-left-1"
      />
    </div>
  );
};
