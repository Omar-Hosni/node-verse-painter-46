
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
  const runwayApiKey = useCanvasStore(state => state.runwayApiKey);
  const selectedNode = useCanvasStore(state => state.selectedNode);

  useEffect(() => {
    if (!runwayApiKey) {
      setApiKeyModalOpen(true);
    }
  }, [runwayApiKey]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 relative">
        <LeftSidebar onOpenApiKeyModal={() => setApiKeyModalOpen(true)} />
        <div className="flex-1 relative">
          <Toolbar />
          <Canvas />
        </div>
        {selectedNode && <RightSidebar />}
      </div>
      <ApiKeyModal 
        open={apiKeyModalOpen} 
        onOpenChange={setApiKeyModalOpen} 
      />
    </div>
  );
};

export default Index;
