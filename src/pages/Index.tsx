
import { useState, useEffect } from 'react';
import { Canvas } from '@/components/Canvas';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { useCanvasStore } from '@/store/useCanvasStore';
import { AppHeader } from '@/components/AppHeader';
import { Toolbar } from '@/components/Toolbar';

const Index = () => {
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const setRunwayApiKey = useCanvasStore(state => state.setRunwayApiKey);
  
  // Set the API key on component mount
  useEffect(() => {
    setRunwayApiKey('mroO1ot3dGvbiI9c7e9lQuvpxXyXxAjl');
  }, [setRunwayApiKey]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 relative">
        <LeftSidebar onOpenApiKeyModal={() => setApiKeyModalOpen(true)} />
        <div className="flex-1 relative">
          <Canvas />
        </div>
        <RightSidebar />
      </div>
      <Toolbar />
    </div>
  );
};

export default Index;
