
import React, { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  NodeTypes,
  EdgeTypes,
  useReactFlow,
  MiniMap,
  Controls,
  Background,
  Panel,
  ConnectionLineType,
} from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ModelNode } from './nodes/ModelNode';
import { LoraNode } from './nodes/LoraNode';
import { ControlnetNode } from './nodes/ControlnetNode';
import { PreviewNode } from './nodes/PreviewNode';
import { InputNode } from './nodes/InputNode';
import CustomEdge from './edges/CustomEdge';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import '@xyflow/react/dist/style.css';

const nodeTypes: NodeTypes = {
  modelNode: ModelNode,
  loraNode: LoraNode,
  controlnetNode: ControlnetNode,
  previewNode: PreviewNode,
  inputNode: InputNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

export const Canvas = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    setSelectedNode,
    setSelectedEdge,
    copySelectedNode,
    pasteNodes,
    cutSelectedNode,
    deleteSelectedNode,
    deleteEdge,
    undo,
    redo,
    exportWorkflowAsJson,
    credits,
    fetchUserCredits,
    useCreditsForGeneration,
    sendWorkflowToAPI,
    setExternalUpdateInProgress,
    updateCanvasFromExternalSource,
  } = useCanvasStore();
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  
  // Add real-time subscriptions
  useEffect(() => {
    if (!projectId) return;

    // Subscribe to project changes
    const channel = supabase
      .channel('project-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          // Skip updating if we're the ones who made the change
          if (useCanvasStore.getState().isLocalUpdate) {
            useCanvasStore.getState().setIsLocalUpdate(false);
            return;
          }
          
          const canvasData = payload.new.canvas_data;
          
          // Only update if we received valid canvas data and we're not currently updating
          if (
            canvasData && 
            canvasData.nodes && 
            canvasData.edges && 
            !useCanvasStore.getState().externalUpdateInProgress
          ) {
            // Set flag to prevent infinite loops
            setExternalUpdateInProgress(true);
            
            console.log('Received real-time update for canvas:', canvasData);
            toast.info('Canvas updated by another user');
            
            // Update canvas with new data
            updateCanvasFromExternalSource(canvasData.nodes, canvasData.edges);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, setExternalUpdateInProgress, updateCanvasFromExternalSource]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
    setSelectedNode(null);
    setSelectedEdge(edge);
  }, [setSelectedNode, setSelectedEdge]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check if an input or textarea element is focused
    if (document.activeElement && (
      document.activeElement.tagName === 'INPUT' || 
      document.activeElement.tagName === 'TEXTAREA'
    )) {
      return; // Skip shortcuts when an input field is focused
    }

    const { key, ctrlKey, metaKey } = event;
    const cmdOrCtrl = metaKey || ctrlKey;

    if (cmdOrCtrl) {
      switch (key.toLowerCase()) {
        case 'c': // Copy
          event.preventDefault();
          copySelectedNode();
          toast.info('Node copied to clipboard');
          break;
        case 'x': // Cut
          event.preventDefault();
          cutSelectedNode();
          toast.info('Node cut to clipboard');
          break;
        case 'v': // Paste
          event.preventDefault();
          // Get current pane center position for paste
          if (reactFlowInstance) {
            const { x, y } = reactFlowInstance.getViewport();
            pasteNodes({ x: -x + 200, y: -y + 200 });
            toast.info('Node pasted from clipboard');
          }
          break;
        case 'z': // Undo
          event.preventDefault();
          if (event.shiftKey) {
            redo(); // Ctrl+Shift+Z or Cmd+Shift+Z for Redo
            toast.info('Redo action');
          } else {
            undo(); // Ctrl+Z or Cmd+Z for Undo
            toast.info('Undo action');
          }
          break;
        case 'y': // Redo (alternative)
          event.preventDefault();
          redo();
          toast.info('Redo action');
          break;
      }
    } else if (key === 'Delete' || key === 'Backspace') {
      // Only handle Delete/Backspace when not in an input field
      deleteSelectedNode();
      toast.info('Node deleted');
    }
  }, [copySelectedNode, pasteNodes, cutSelectedNode, deleteSelectedNode, undo, redo, reactFlowInstance]);

  // Register and unregister keyboard event handlers
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Fetch user credits
  useEffect(() => {
    fetchUserCredits();
  }, [fetchUserCredits]);

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

  const defaultEdgeOptions = {
    type: 'custom',
    animated: true,
    style: { strokeWidth: 2, stroke: '#666' }
  };

  return (
    <div className="flex-1 h-screen bg-[#121212]" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        className="bg-[#151515]"
        connectionLineStyle={{ stroke: '#ff69b4', strokeWidth: 3 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        snapToGrid={true}
        snapGrid={[15, 15]}
      >
        <MiniMap style={{ backgroundColor: '#1A1A1A' }} />
        <Controls className="bg-[#1A1A1A] border-[#333]" />
        <Background color="#333333" gap={16} />
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
      </ReactFlow>
    </div>
  );
};
