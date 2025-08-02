
import { useState, useEffect } from 'react';
import { Canvas } from '@/components/Canvas';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { useCanvasStore } from '@/store/useCanvasStore';
import { AppHeader } from '@/components/AppHeader';
import { Toolbar } from '@/components/Toolbar';

const Index = () => {
  const setRunwareApiKey = useCanvasStore(state => state.setRunwareApiKey);
  const addNode = useCanvasStore(state => state.addNode);
  
  // Set the API key on component mount
  useEffect(() => {
    setRunwareApiKey('mroO1ot3dGvbiI9c7e9lQuvpxXyXxAjl');
    
    // Add some initial nodes in a horizontal layout
    // This demonstrates the horizontal flow
    addNode('engine-real', { x: 100, y: 250 }, 0);
    addNode('gear-anime', { x: 350, y: 250 }, 1);
    addNode('control-net-edge', { x: 600, y: 250 }, 2);
    addNode('layer-image-node', { x: 850, y: 250 }, 3);
    
  }, [setRunwareApiKey, addNode]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 relative">
        <LeftSidebar 
          activeTab="Insert"
          setActiveTab={() => {}}
          setSelectedInsertNode={() => {}}
        />
        <div className="flex-1 relative">
          <Canvas activeTool="select" setActiveTool={() => {}} />
        </div>
        <RightSidebar />
      </div>
      <Toolbar 
        activeTool="select"
        onToolChange={() => {}}
        setActiveTab={() => {}}
      />
    </div>
  );
};

export default Index;
