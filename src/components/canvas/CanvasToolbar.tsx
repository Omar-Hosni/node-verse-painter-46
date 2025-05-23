
import React from 'react';
import { Panel } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/store/useCanvasStore';
import { toast } from 'sonner';

export const CanvasToolbar: React.FC = () => {
  const { 
    exportWorkflowAsJson, 
    credits, 
    sendWorkflowToAPI,
    fetchUserCredits,
    useCreditsForGeneration
  } = useCanvasStore();

  const handleExportWorkflow = () => {
    const json = exportWorkflowAsJson();
    console.log("Workflow JSON:", json);
    
    // Create a blob and download the JSON file
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Workflow exported as JSON');
  };

  const handleGenerateImage = async () => {
    const nodes = useCanvasStore.getState().nodes;
    const previewNode = nodes.find(n => n.type === 'previewNode');
    if (!previewNode) {
      toast.error("No preview node found! Please add a preview node to your canvas.");
      return;
    }

    if (credits === null || credits === undefined) {
      await fetchUserCredits();
      if (credits === null || credits === undefined) {
        toast.error("Could not fetch your credits. Please try again.");
        return;
      }
    }

    if (credits < 1) {
      toast.error("Not enough credits! Please purchase more credits to continue generating images.");
      return;
    }

    try {
      // Update button to loading state
      toast.info("Sending request to generate image...");
      
      // Send to API
      await sendWorkflowToAPI();
      
      // Use credits
      await useCreditsForGeneration();
      
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Panel position="top-right" className="flex flex-col gap-2">
      <Button 
        onClick={handleExportWorkflow}
        variant="outline"
        className="bg-[#1A1A1A] text-gray-300 border-[#333]"
      >
        Export Workflow
      </Button>
      <Button 
        onClick={handleGenerateImage}
        className="bg-blue-600 text-white"
      >
        Generate Image ({credits !== null ? credits : '...'} credits)
      </Button>
    </Panel>
  );
};
