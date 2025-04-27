
import React from 'react';
import { Button } from "@/components/ui/button";
import { useCanvasStore } from '@/store/useCanvasStore';
import { useReactFlow } from '@xyflow/react';
import { Cpu, Layers, Image as ImageIcon } from 'lucide-react';

export const LeftSidebar = () => {
  const addNode = useCanvasStore(state => state.addNode);
  const reactFlowInstance = useReactFlow();
  
  const handleAddNode = (nodeType: any) => {
    // Instead of using project which doesn't exist, we'll use viewport and screenToFlowPosition
    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    };

    // Convert screen coordinates to flow coordinates
    const position = reactFlowInstance.screenToFlowPosition({
      x: center.x,
      y: center.y
    });
    addNode(nodeType, position);
  };
  
  return (
    <div className="w-16 lg:w-64 h-screen bg-sidebar border-r border-field flex flex-col overflow-hidden transition-all duration-200">
      <div className="flex-1 overflow-y-auto p-2 lg:p-4">
        <div className="grid grid-cols-1 gap-2 mb-6">
          <Button 
            variant="outline" 
            onClick={() => handleAddNode('model')} 
            className="flex items-center justify-center lg:justify-start bg-field hover:bg-gray-700 border-none text-white h-12 rounded-full"
          >
            <Cpu className="h-5 w-5 lg:mr-2" />
            <span className="hidden lg:inline">Model</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleAddNode('lora')} 
            className="flex items-center justify-center lg:justify-start bg-field hover:bg-gray-700 border-none text-white h-12 rounded-full"
          >
            <Layers className="h-5 w-5 lg:mr-2" />
            <span className="hidden lg:inline">LoRA</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleAddNode('controlnet-canny')} 
            className="flex items-center justify-center lg:justify-start bg-field hover:bg-gray-700 border-none text-white h-12 rounded-full"
          >
            <ImageIcon className="h-5 w-5 lg:mr-2" />
            <span className="hidden lg:inline">Canny ControlNet</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleAddNode('controlnet-depth')} 
            className="flex items-center justify-center lg:justify-start bg-field hover:bg-gray-700 border-none text-white h-12 rounded-full"
          >
            <ImageIcon className="h-5 w-5 lg:mr-2" />
            <span className="hidden lg:inline">Depth ControlNet</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleAddNode('controlnet-pose')} 
            className="flex items-center justify-center lg:justify-start bg-field hover:bg-gray-700 border-none text-white h-12 rounded-full"
          >
            <ImageIcon className="h-5 w-5 lg:mr-2" />
            <span className="hidden lg:inline">Pose ControlNet</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleAddNode('controlnet-segment')} 
            className="flex items-center justify-center lg:justify-start bg-field hover:bg-gray-700 border-none text-white h-12 rounded-full"
          >
            <ImageIcon className="h-5 w-5 lg:mr-2" />
            <span className="hidden lg:inline">Segment ControlNet</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => handleAddNode('preview')} 
            className="flex items-center justify-center lg:justify-start bg-field hover:bg-gray-700 border-none text-white h-12 rounded-full"
          >
            <ImageIcon className="h-5 w-5 lg:mr-2" />
            <span className="hidden lg:inline">Preview</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
