
import { useState, useEffect } from 'react';
import { Canvas } from '@/components/Canvas';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { useCanvasStore } from '@/store/useCanvasStore';

const Index = () => {
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const runwayApiKey = useCanvasStore(state => state.runwayApiKey);
  const selectedNode = useCanvasStore(state => state.selectedNode);

  useEffect(() => {
    // Check if the API key is not set, open the modal
    if (!runwayApiKey) {
      setApiKeyModalOpen(true);
    }
  }, [runwayApiKey]);

  return (
    <div className="flex h-screen overflow-hidden">
      <LeftSidebar onOpenApiKeyModal={() => setApiKeyModalOpen(true)} />
      <Canvas />
      {selectedNode && <RightSidebar />}
      <ApiKeyModal 
        open={apiKeyModalOpen} 
        onOpenChange={setApiKeyModalOpen} 
      />
    </div>
  );
};

export default Index;
