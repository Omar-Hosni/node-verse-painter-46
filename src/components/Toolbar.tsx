
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

export const Toolbar = () => {
  const [activeTool, setActiveTool] = useState<'select' | 'hand' | 'circle' | 'rectangle' | 'text' | 'frame'>('select');
  const addNode = useCanvasStore(state => state.addNode);
  const reactFlowInstance = useReactFlow();
  
  const handleToolChange = (tool: typeof activeTool) => {
    setActiveTool(tool);
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
        <Button 
          size="icon" 
          variant={activeTool === 'select' ? "default" : "ghost"}
          className={`rounded-full ${activeTool === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => handleToolChange('select')}
        >
          <MousePointer className="h-4 w-4 text-white" />
        </Button>
        <Button 
          size="icon" 
          variant={activeTool === 'hand' ? "default" : "ghost"} 
          className={`rounded-full ${activeTool === 'hand' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          onClick={() => handleToolChange('hand')}
        >
          <Hand className="h-4 w-4 text-white" />
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          className="rounded-full hover:bg-gray-700"
        >
          <ZoomIn className="h-4 w-4 text-white" />
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          className="rounded-full hover:bg-gray-700"
        >
          <ZoomOut className="h-4 w-4 text-white" />
        </Button>
      </div>
      
      {/* Top center shape tools */}
      <div className="fixed top-[4.5rem] left-1/2 transform -translate-x-1/2 bg-sidebar border border-field rounded-lg px-2 py-1 flex gap-1 z-10">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              size="icon" 
              variant={activeTool === 'rectangle' ? "default" : "ghost"}
              className={`rounded-md ${activeTool === 'rectangle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              onClick={() => handleToolChange('rectangle')}
            >
              <RectangleHorizontal className="h-4 w-4 text-white" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2 bg-sidebar border-field">
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => handleAddShape('rectangle')}
              >
                <RectangleHorizontal className="h-4 w-4 mr-2" />
                Rectangle
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              size="icon" 
              variant={activeTool === 'circle' ? "default" : "ghost"}
              className={`rounded-md ${activeTool === 'circle' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              onClick={() => handleToolChange('circle')}
            >
              <CircleIcon className="h-4 w-4 text-white" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2 bg-sidebar border-field">
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => handleAddShape('circle')}
              >
                <CircleIcon className="h-4 w-4 mr-2" />
                Circle
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              size="icon" 
              variant={activeTool === 'text' ? "default" : "ghost"}
              className={`rounded-md ${activeTool === 'text' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              onClick={() => handleToolChange('text')}
            >
              <Text className="h-4 w-4 text-white" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2 bg-sidebar border-field">
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => handleAddShape('text')}
              >
                <Text className="h-4 w-4 mr-2" />
                Text Input
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              size="icon" 
              variant={activeTool === 'frame' ? "default" : "ghost"}
              className={`rounded-md ${activeTool === 'frame' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
              onClick={() => handleToolChange('frame')}
            >
              <Frame className="h-4 w-4 text-white" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2 bg-sidebar border-field">
            <div className="space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => handleAddShape('frame')}
              >
                <Frame className="h-4 w-4 mr-2" />
                Frame
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
};
