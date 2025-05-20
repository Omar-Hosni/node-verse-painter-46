
import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  PlusCircle,
} from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { NodeType } from '@/store/types';

export const LeftSidebar = () => {
  const [isExpanded, setIsExpanded] = useState({
    model: true,
    lora: false,
    controlnet: false,
    input: false
  });
  
  const addNode = useCanvasStore(state => state.addNode);
  
  const handleAddNode = (nodeType: NodeType) => {
    // Get the center of the viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Add node slightly offset from center
    addNode(nodeType, {
      x: (viewportWidth / 2) - 150,
      y: (viewportHeight / 2) - 100,
    });
  };
  
  const toggleSection = (section: string) => {
    setIsExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  return (
    <div className="w-64 bg-[#1A1A1A] border-r border-[#333] p-4 flex flex-col">
      <h2 className="text-white text-lg font-medium mb-4">Node Library</h2>
      
      {/* Insert Section - Now with scrolling */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="text-white font-medium mb-2 flex items-center">
          <PlusCircle className="mr-2 h-4 w-4" />
          <span>Insert</span>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 max-h-[calc(100vh-300px)]" style={{ scrollbarWidth: 'thin' }}>
          {/* Model Nodes */}
          <div className="mb-3">
            <div 
              className="flex items-center text-gray-300 hover:text-white cursor-pointer mb-1" 
              onClick={() => toggleSection('model')}
            >
              {isExpanded.model ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              <span>Models</span>
            </div>
            
            {isExpanded.model && (
              <div className="pl-5 space-y-2">
                <div 
                  className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={() => handleAddNode('model-sdxl')}
                >
                  <span className="mr-2">🚀</span>
                  <span>SDXL Model</span>
                </div>
                <div 
                  className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={() => handleAddNode('model-flux')}
                >
                  <span className="mr-2">⚡</span>
                  <span>Flux Model</span>
                </div>
                <div 
                  className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={() => handleAddNode('model-hidream')}
                >
                  <span className="mr-2">✨</span>
                  <span>HiDream Model</span>
                </div>
              </div>
            )}
          </div>
          
          {/* LoRA Nodes */}
          <div className="mb-3">
            <div 
              className="flex items-center text-gray-300 hover:text-white cursor-pointer mb-1" 
              onClick={() => toggleSection('lora')}
            >
              {isExpanded.lora ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              <span>LoRA</span>
            </div>
            
            {isExpanded.lora && (
              <div className="pl-5 space-y-2">
                <div 
                  className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={() => handleAddNode('lora-realistic')}
                >
                  <span className="mr-2">📷</span>
                  <span>Realistic LoRA</span>
                </div>
                <div 
                  className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={() => handleAddNode('lora-cartoon')}
                >
                  <span className="mr-2">🎭</span>
                  <span>Cartoon LoRA</span>
                </div>
                <div 
                  className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={() => handleAddNode('lora-character')}
                >
                  <span className="mr-2">👤</span>
                  <span>Character LoRA</span>
                </div>
              </div>
            )}
          </div>
          
          {/* ControlNet Nodes */}
          <div className="mb-3">
            <div 
              className="flex items-center text-gray-300 hover:text-white cursor-pointer mb-1" 
              onClick={() => toggleSection('controlnet')}
            >
              {isExpanded.controlnet ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              <span>ControlNet</span>
            </div>
            
            {isExpanded.controlnet && (
              <div className="pl-5 space-y-2">
                <div 
                  className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={() => handleAddNode('controlnet-canny')}
                >
                  <span className="mr-2">🧮</span>
                  <span>Canny</span>
                </div>
                <div 
                  className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={() => handleAddNode('controlnet-depth')}
                >
                  <span className="mr-2">🔍</span>
                  <span>Depth</span>
                </div>
                <div 
                  className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={() => handleAddNode('controlnet-pose')}
                >
                  <span className="mr-2">🤸</span>
                  <span>Pose</span>
                </div>
                <div 
                  className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={() => handleAddNode('controlnet-segment')}
                >
                  <span className="mr-2">✂️</span>
                  <span>Segment</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Input Nodes */}
          <div className="mb-3">
            <div 
              className="flex items-center text-gray-300 hover:text-white cursor-pointer mb-1" 
              onClick={() => toggleSection('input')}
            >
              {isExpanded.input ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              <span>Input</span>
            </div>
            
            {isExpanded.input && (
              <div className="pl-5 space-y-2">
                <div 
                  className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={() => handleAddNode('input-text')}
                >
                  <span className="mr-2">📝</span>
                  <span>Text Input</span>
                </div>
                <div 
                  className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={() => handleAddNode('input-image')}
                >
                  <span className="mr-2">🖼️</span>
                  <span>Image Input</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Output Node */}
          <div className="text-gray-400 hover:text-white cursor-pointer text-sm flex items-center pl-1 mb-3"
               onClick={() => handleAddNode('output-preview')}
          >
            <span className="mr-2">🖼️</span>
            <span>Preview Output</span>
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-4 border-t border-[#333] text-gray-400 text-xs">
        <div>Drop nodes on canvas</div>
        <div>Connect nodes to create a workflow</div>
      </div>
    </div>
  );
};
