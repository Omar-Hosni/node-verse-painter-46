
import React from 'react';
import { Button } from "@/components/ui/button";
import { useCanvasStore } from '@/store/useCanvasStore';
import { useReactFlow } from '@xyflow/react';
import {
  Hand, 
  MousePointer, 
  ZoomIn, 
  ZoomOut,
  Circle as CircleIcon,
  RectangleHorizontal,
  Text,
  Frame
} from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ToolType } from '@/store/types';

export const Toolbar = () => {
  const addNode = useCanvasStore(state => state.addNode);
  const setToolType = useCanvasStore(state => state.setActiveTool);
  const activeTool = useCanvasStore(state => state.activeTool);
  const reactFlowInstance = useReactFlow();
  
  const handleToolChange = (tool: ToolType) => {
    setToolType(tool);
  };

  return (
    <>
      {/* Bottom toolbar */}
      <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-sidebar border border-field rounded-full px-2 py-1 flex gap-1 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant={activeTool === 'select' ? "default" : "ghost"}
                className={`rounded-full ${activeTool === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                onClick={() => handleToolChange('select')}
              >
                <MousePointer className="h-4 w-4 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Select (V)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant={activeTool === 'hand' ? "default" : "ghost"} 
                className={`rounded-full ${activeTool === 'hand' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                onClick={() => handleToolChange('hand')}
              >
                <Hand className="h-4 w-4 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hand Tool (H)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className="rounded-full hover:bg-gray-700"
                onClick={() => reactFlowInstance.zoomIn()}
              >
                <ZoomIn className="h-4 w-4 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In (+)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className="rounded-full hover:bg-gray-700"
                onClick={() => reactFlowInstance.zoomOut()}
              >
                <ZoomOut className="h-4 w-4 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out (-)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Top center shape tools */}
      <div className="fixed top-[4.5rem] left-1/2 transform -translate-x-1/2 bg-sidebar border border-field rounded-lg px-2 py-1 flex gap-1 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant={activeTool === 'rectangle' ? "default" : "ghost"}
                className={`rounded-md ${activeTool === 'rectangle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                onClick={() => handleToolChange('rectangle')}
              >
                <RectangleHorizontal className="h-4 w-4 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rectangle (R)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant={activeTool === 'circle' ? "default" : "ghost"}
                className={`rounded-md ${activeTool === 'circle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                onClick={() => handleToolChange('circle')}
              >
                <CircleIcon className="h-4 w-4 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Circle (O)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant={activeTool === 'text' ? "default" : "ghost"}
                className={`rounded-md ${activeTool === 'text' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                onClick={() => handleToolChange('text')}
              >
                <Text className="h-4 w-4 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Text (T)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="icon" 
                variant={activeTool === 'frame' ? "default" : "ghost"}
                className={`rounded-md ${activeTool === 'frame' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                onClick={() => handleToolChange('frame')}
              >
                <Frame className="h-4 w-4 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Frame (F)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  );
};
