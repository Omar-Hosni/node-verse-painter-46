
import React, { useState } from 'react';
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
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export type ToolType = 'select' | 'hand' | 'circle' | 'rectangle' | 'text' | 'frame';

export const Toolbar = () => {
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const addNode = useCanvasStore(state => state.addNode);
  const setActiveTool = useCanvasStore(state => state.setActiveTool);
  const reactFlowInstance = useReactFlow();
  
  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool);
    useCanvasStore.getState().setActiveTool(tool);
  };
  
  const handleAddShape = (type: 'circle' | 'rectangle' | 'text' | 'frame') => {
    // Get the center of the viewport
    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };

    // Convert screen coordinates to flow coordinates
    const position = reactFlowInstance.screenToFlowPosition({
      x: center.x,
      y: center.y
    });
    
    // Map shape types to node types
    const nodeTypeMap = {
      'circle': 'controlnet-pose' as const,
      'rectangle': 'controlnet-canny' as const,
      'text': 'input-text' as const,
      'frame': 'output-preview' as const
    };
    
    addNode(nodeTypeMap[type], position);
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
