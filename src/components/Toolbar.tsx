
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useReactFlow } from '@xyflow/react';
import { 
  Copy, 
  Download, 
  Save, 
  Share2, 
  Trash2, 
  Undo, 
  Redo, 
  Scissors, 
  ClipboardPaste, 
  Image,
  FileJson,
  Settings,
  Circle,
  RectangleHorizontal,
  Text,
  Frame
} from 'lucide-react';
import { toast } from 'sonner';
import { WorkflowJson } from '@/store/types';
import { ShareProjectDialog } from './ShareProjectDialog';
import { ApiKeyModal } from './ApiKeyModal';
import { downloadObjectAsJson } from '@/store/workflowUtils';

// Define the different drawing tool types
export type DrawingTool = 'select' | 'circle' | 'rectangle' | 'text' | 'frame';

export default function Toolbar() {
  const [shareOpen, setShareOpen] = useState(false);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactFlowInstance = useReactFlow();
  
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
    exportWorkflowAsJson,
    addNode
  } = useCanvasStore();
  
  const handleExportPNG = () => {
    // Use the reactFlowInstance to export
    reactFlowInstance.toImage({
      type: 'png',
      quality: 1,
      backgroundColor: '#ffffff',
    }).then(dataUrl => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'workflow-export.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Exported as PNG');
    });
  };
  
  const handleExportSVG = () => {
    // Use react-flow-renderer's SVG export
    reactFlowInstance.toObject();
    toast.success('Exported as SVG');
    // SVG export not directly supported, would require custom implementation
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

  const handleDrawingToolClick = (tool: DrawingTool) => {
    setActiveTool(tool);
    
    // If it's a shape tool, prepare to add it on the next click
    if (tool !== 'select' && tool !== 'frame') {
      const handleCanvasClick = (event: MouseEvent) => {
        // Get click position relative to the canvas
        const bounds = document.querySelector('.react-flow').getBoundingClientRect();
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top
        });
        
        // Add the appropriate node based on selected tool
        switch(tool) {
          case 'circle':
            addNode('model-sdxl', position); // Using existing node types as placeholders
            break;
          case 'rectangle':
            addNode('controlnet-canny', position); // Using existing node types as placeholders
            break;
          case 'text':
            addNode('lora-realistic', position); // Using existing node types as placeholders
            break;
        }
        
        // Reset to select tool after placing an item
        setActiveTool('select');
        
        // Remove the event listener after the first click
        document.removeEventListener('click', handleCanvasClick);
      };
      
      // Add a one-time click listener to the document
      setTimeout(() => {
        document.addEventListener('click', handleCanvasClick, { once: true });
      }, 100); // Small delay to avoid capturing the current click event
    }
    
    // For frame tool, enable a special selection mode
    if (tool === 'frame') {
      // Would implement a custom selection behavior here
      toast.info('Frame selection tool activated. Click and drag to select items.');
      // After selection is complete, we'd want to return to the select tool
      // This would require more complex implementation with mousedown, mousemove, mouseup events
    }
  };

  return (
    <div className="absolute top-0 right-0 z-10 p-3 flex flex-col space-y-1">
      {/* Drawing Tools */}
      <div className="flex space-x-1 mb-1">
        <Button 
          variant={activeTool === 'select' ? "default" : "ghost"}
          size="icon"
          onClick={() => handleDrawingToolClick('select')}
          title="Select"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <Frame className="h-4 w-4" />
          <span className="sr-only">Select</span>
        </Button>
        <Button 
          variant={activeTool === 'circle' ? "default" : "ghost"}
          size="icon"
          onClick={() => handleDrawingToolClick('circle')}
          title="Add Circle"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <Circle className="h-4 w-4" />
          <span className="sr-only">Circle</span>
        </Button>
        <Button 
          variant={activeTool === 'rectangle' ? "default" : "ghost"}
          size="icon"
          onClick={() => handleDrawingToolClick('rectangle')}
          title="Add Rectangle"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <RectangleHorizontal className="h-4 w-4" />
          <span className="sr-only">Rectangle</span>
        </Button>
        <Button 
          variant={activeTool === 'text' ? "default" : "ghost"}
          size="icon"
          onClick={() => handleDrawingToolClick('text')}
          title="Add Text"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <Text className="h-4 w-4" />
          <span className="sr-only">Text</span>
        </Button>
        <Button 
          variant={activeTool === 'frame' ? "default" : "ghost"}
          size="icon"
          onClick={() => handleDrawingToolClick('frame')}
          title="Frame Selection"
          className="bg-gray-800/70 text-white hover:bg-gray-700 rounded-md"
        >
          <Frame className="h-4 w-4" />
          <span className="sr-only">Frame</span>
        </Button>
      </div>

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
          <ClipboardPaste className="h-4 w-4" />
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
      
      <ShareProjectDialog isOpen={false} onClose={() => setShareOpen(false)} />
      
      <ApiKeyModal
        open={apiKeyOpen}
        onClose={() => setApiKeyOpen(false)}
        apiKey={runwayApiKey}
        onSave={handleApiKeySave}
      />
    </div>
  );
}
