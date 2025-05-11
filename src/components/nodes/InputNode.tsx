
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
        <div className="w-full p-2">
          <textarea 
            className="w-full h-20 p-2 bg-sidebar-accent rounded-md text-white resize-none"
            placeholder="Enter your prompt here..."
            value={data.text || ''}
            onChange={(e) => console.log('Text changed:', e.target.value)}
          />
        </div>
      );
    } else if (data.inputType === 'image') {
      return (
        <div className="w-full p-2">
          {data.image ? (
            <div className="w-full h-24 overflow-hidden rounded-md border border-white relative">
              {data.uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
              <img 
                src={data.image} 
                alt="Input image"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-24 flex items-center justify-center border border-dashed border-white rounded-md bg-sidebar-accent text-white">
              <span>Click to upload image</span>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div 
      className={`relative flex flex-col items-center gap-2 rounded-xl overflow-hidden
        ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{ 
        backgroundColor: data.color || '#3498db', 
        minWidth: '200px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="flex items-center w-full px-4 py-2 justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-white rounded-full">
            <span className="text-xl">{data.emoji || '📝'}</span>
          </div>
          <span className="text-lg font-medium text-white">
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

      {renderContent()}

      {/* Horizontal handles - both input and output with improved visibility */}
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
