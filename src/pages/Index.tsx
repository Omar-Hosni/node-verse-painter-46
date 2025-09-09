
import { useState, useEffect } from 'react';
import { Canvas } from '@/components/Canvas';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { useCanvasStore } from '@/store/useCanvasStore';
import { AppHeader } from '@/components/AppHeader';


const Index = () => {
  const setRunwareApiKey = useCanvasStore(state => state.setRunwareApiKey);
  const addNode = useCanvasStore(state => state.addNode);
  
  // Set the API key on component mount
  useEffect(() => {
    setRunwareApiKey('v8r2CamVZNCtye7uypGvHfQOh48ZQQaZ');
    
    // Add some initial nodes in a horizontal layout
    // This demonstrates the horizontal flow
    addNode('model-sdxl', { x: 100, y: 250 }, 0);
    addNode('lora-realistic', { x: 350, y: 250 }, 1);
    addNode('controlnet-canny', { x: 600, y: 250 }, 2);
    addNode('output-preview', { x: 850, y: 250 }, 3);
    
  }, [setRunwareApiKey, addNode]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 relative">
        <LeftSidebar />
        <div className="flex-1 relative">
          <Canvas />
        </div>
        <RightSidebar />
      </div>

    </div>
  );
};

export default Index;
