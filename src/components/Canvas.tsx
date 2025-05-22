import React, { useCallback, useRef, useEffect, useState } from 'react';
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
  Node,
  XYPosition,
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
import { NodeType } from '@/store/types';
import { ToolType } from './Toolbar';

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
    addNode,
    activeTool,
  } = useCanvasStore();
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPosition, setStartPosition] = useState<XYPosition | null>(null);
  
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
    if (activeTool === 'select') {
      setSelectedNode(node);
      setSelectedEdge(null);
    }
  }, [setSelectedNode, setSelectedEdge, activeTool]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
    if (activeTool === 'select') {
      setSelectedNode(null);
      setSelectedEdge(edge);
    }
  }, [setSelectedNode, setSelectedEdge, activeTool]);

  const onPaneClick = useCallback(() => {
    if (activeTool === 'select') {
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }, [setSelectedNode, setSelectedEdge, activeTool]);
  
  const handlePaneMouseDown = useCallback((event: React.MouseEvent) => {
    if (activeTool !== 'select' && activeTool !== 'hand') {
      setIsDrawing(true);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });
      setStartPosition(position);
    }
  }, [activeTool, reactFlowInstance]);
  
  const handlePaneMouseUp = useCallback((event: React.MouseEvent) => {
    if (isDrawing && startPosition) {
      setIsDrawing(false);
      
      const endPosition = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });
      
      // Only create node if the user has dragged a bit (not just clicked)
      const distance = Math.sqrt(
        Math.pow(endPosition.x - startPosition.x, 2) + 
        Math.pow(endPosition.y - startPosition.y, 2)
      );
      
      if (distance > 10) { // Minimum drag distance
        // Map tool to node types
        const nodeTypeMap: Record<ToolType, NodeType | null> = {
          'select': null,
          'hand': null,
          'circle': 'controlnet-pose',
          'rectangle': 'controlnet-canny',
          'text': 'input-text',
          'frame': 'output-preview'
        };
        
        const nodeType = nodeTypeMap[activeTool];
        
        if (nodeType) {
          // Calculate the center position for the node
          const position = {
            x: Math.min(startPosition.x, endPosition.x),
            y: Math.min(startPosition.y, endPosition.y)
          };
          
          addNode(nodeType, position);
          toast.success(`Created ${activeTool} shape`);
        }
      }
      
      setStartPosition(null);
    }
  }, [isDrawing, startPosition, activeTool, addNode, reactFlowInstance]);
  
  const handlePaneMouseMove = useCallback((event: React.MouseEvent) => {
    // Drawing preview could be added here in the future
  }, []);

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
    } else {
      // Shape creation keyboard shortcuts
      switch (key.toLowerCase()) {
        case 'v': // Select tool
          useCanvasStore.getState().setActiveTool('select');
          break;
        case 'h': // Hand tool
          useCanvasStore.getState().setActiveTool('hand');
          break;
        case 'r': // Rectangle
          useCanvasStore.getState().setActiveTool('rectangle');
          break;
        case 'o': // Circle (O for oval)
          useCanvasStore.getState().setActiveTool('circle');
          break;
        case 't': // Text
          useCanvasStore.getState().setActiveTool('text');
          break;
        case 'f': // Frame
          useCanvasStore.getState().setActiveTool('frame');
          break;
        case 'delete': // Delete
        case 'backspace': // Delete/Backspace
          deleteSelectedNode();
          toast.info('Node deleted');
          break;
        case '+': // Zoom in
          reactFlowInstance.zoomIn();
          break;
        case '-': // Zoom out
          reactFlowInstance.zoomOut();
          break;
      }
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
        onMouseDown={handlePaneMouseDown}
        onMouseUp={handlePaneMouseUp}
        onMouseMove={handlePaneMouseMove}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        className="bg-[#151515]"
        connectionLineStyle={{ stroke: '#ff69b4', strokeWidth: 3 }}
        connectionLineType={ConnectionLineType.SmoothStep}
        snapToGrid={true}
        snapGrid={[15, 15]}
        panOnScroll={activeTool === 'hand'}
        panOnDrag={activeTool === 'hand' || activeTool === 'select'}
        selectionOnDrag={activeTool === 'select'}
        selectionMode={activeTool === 'frame' ? 'full' : 'partial'}
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
