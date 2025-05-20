
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/store/useCanvasStore';
import { exportToSVG, exportToPNG } from '@xyflow/react';
import { 
  Copy, 
  Download, 
  Save, 
  Share2, 
  Trash2, 
  Undo, 
  Redo, 
  Scissors, 
  Paste, 
  Image,
  FileJson,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadObjectAsJson } from '@/store/workflowUtils';
import ShareProjectDialog from './ShareProjectDialog';
import ApiKeyModal from './ApiKeyModal';

export default function Toolbar() {
  const [shareOpen, setShareOpen] = useState(false);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    nodes,
    edges,
    copySelectedNode,
    cutSelectedNode,
    pasteNodes,
    selectedNode,
    deleteSelectedNode,
    saveProject,
    undo,
    redo,
    generateImageFromNodes,
    runwayApiKey,
    setRunwayApiKey,
    exportWorkflowAsJson
  } = useCanvasStore();
  
  const handleExportPNG = () => {
    exportToPNG({
      fileName: 'workflow-export',
    });
    toast.success('Exported as PNG');
  };
  
  const handleExportSVG = () => {
    exportToSVG({
      fileName: 'workflow-export',
    });
    toast.success('Exported as SVG');
  };
  
  const handleExportJSON = () => {
    const workflowJson = exportWorkflowAsJson();
    downloadObjectAsJson(workflowJson, 'workflow-export');
    toast.success('Exported as JSON');
  };
  
  const handleSave = async () => {
    // Simplified for the example, would usually open a dialog
    const name = 'My Project';
    const description = 'Auto-saved project';
    const projectId = await saveProject(name, description);
    
    if (projectId) {
      toast.success(`Project saved with ID: ${projectId}`);
    }
  };
  
  const handlePaste = () => {
    // Get center of viewport
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    pasteNodes({ x: centerX, y: centerY });
  };
  
  const handleGenerateImage = async () => {
    if (!runwayApiKey) {
      setApiKeyOpen(true);
      return;
    }
    
    await generateImageFromNodes();
  };
  
  const handleApiKeySave = (apiKey: string) => {
    setRunwayApiKey(apiKey);
    setApiKeyOpen(false);
    toast.success('API Key saved successfully');
  };

  return (
    <div className="absolute top-0 right-0 z-10 p-3 flex flex-col space-y-1">
      <div className="flex space-x-1 mb-1">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={undo}
          title="Undo"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={redo}
          title="Redo"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex space-x-1 mb-1">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={copySelectedNode}
          disabled={!selectedNode}
          title="Copy"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md disabled:opacity-50"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={cutSelectedNode}
          disabled={!selectedNode}
          title="Cut"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md disabled:opacity-50"
        >
          <Scissors className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handlePaste}
          title="Paste"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <Paste className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={deleteSelectedNode}
          disabled={!selectedNode}
          title="Delete"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex space-x-1 mb-1">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleSave}
          title="Save Project"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setShareOpen(true)}
          title="Share Project"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex space-x-1 mb-1">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleExportPNG}
          title="Export as PNG"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex space-x-1 mb-1">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleExportJSON}
          title="Export as JSON"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <FileJson className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Generate Image button moved below Export buttons */}
      <div className="flex space-x-1">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleGenerateImage}
          title="Generate Image"
          className="bg-blue-600/90 text-white hover:bg-blue-700 rounded-md"
        >
          <Image className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex space-x-1 mt-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setApiKeyOpen(true)}
          title="API Settings"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      
      <ShareProjectDialog open={shareOpen} onClose={() => setShareOpen(false)} />
      
      <ApiKeyModal
        open={apiKeyOpen}
        onClose={() => setApiKeyOpen(false)}
        apiKey={runwayApiKey}
        onSave={handleApiKeySave}
      />
    </div>
  );
}
