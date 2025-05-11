
import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Loader2, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface InputNodeProps {
  id: string;
  data: {
    inputType: string;
    text?: string;
    image?: string | null;
    imageId?: string;
    uploading?: boolean;
    // Style properties
    displayName: string;
    emoji: string;
    color: string;
    tutorialVideo?: string;
    description?: string;
  };
  selected: boolean;
}

export const InputNode = ({ id, data, selected }: InputNodeProps) => {
  const [showTutorial, setShowTutorial] = useState(false);

  const renderContent = () => {
    if (data.inputType === 'text') {
      return (
        <div className="w-full">
          <textarea 
            className="w-full h-20 p-2 bg-opacity-20 bg-black rounded-md text-white resize-none border border-gray-600 focus:border-blue-400 focus:outline-none"
            placeholder="Enter your prompt here..."
            value={data.text || ''}
            onChange={(e) => console.log('Text changed:', e.target.value)}
          />
        </div>
      );
    } else if (data.inputType === 'image') {
      return (
        <div className="w-full">
          {data.image ? (
            <div className="w-full h-24 overflow-hidden rounded-md border border-gray-600 relative">
              {data.uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
              <img 
                src={data.image} 
                alt="Input image"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-full h-24 flex items-center justify-center border border-dashed border-gray-400 rounded-md bg-black bg-opacity-20 text-white">
              <span>Click to upload image</span>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div 
      className={`relative flex flex-col items-center rounded-xl overflow-hidden input-node
        ${selected ? 'selected' : ''}`}
      style={{ 
        minWidth: '220px',
      }}
    >
      <div className="node-header w-full justify-between">
        <div className="flex items-center gap-2">
          <div className="node-icon-container">
            <span className="text-xl">{data.emoji || '📝'}</span>
          </div>
          <span className="text-base font-semibold text-white tracking-wide">
            {data.displayName || 'Input'}
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
        {renderContent()}
      </div>

      {/* Horizontal handles - both input and output */}
      <Handle
        type="target"
        position={Position.Left}
        id="input-in"
        className="!bg-white !border-2 !border-blue-300 w-4 h-4"
        style={{ left: -8, zIndex: 100 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="input-out"
        className="!bg-white !border-2 !border-blue-300 w-4 h-4"
        style={{ right: -8, zIndex: 100 }}
      />
    </div>
  );
};
