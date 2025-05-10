
import React, { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  NodeTypes,
  useReactFlow,
  MiniMap,
  Controls,
  Background,
  Panel,
} from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ModelNode } from './nodes/ModelNode';
import { LoraNode } from './nodes/LoraNode';
import { ControlnetNode } from './nodes/ControlnetNode';
import { PreviewNode } from './nodes/PreviewNode';
import { toast } from 'sonner';
import { Button } from './ui/button';

import '@xyflow/react/dist/style.css';

const nodeTypes: NodeTypes = {
  modelNode: ModelNode,
  loraNode: LoraNode,
  controlnetNode: ControlnetNode,
  previewNode: PreviewNode,
};

export const Canvas = () => {
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    setSelectedNode,
    copySelectedNode,
    pasteNodes,
    cutSelectedNode,
    deleteSelectedNode,
    undo,
    redo,
    exportWorkflowAsJson,
  } = useCanvasStore();
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

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

  return (
    <div className="flex-1 h-screen" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
        className="bg-canvas"
      >
        <MiniMap />
        <Controls />
        <Background />
        <Panel position="top-right">
          <Button 
            onClick={handleExportWorkflow}
            variant="outline"
            className="bg-white text-black hover:bg-gray-100"
          >
            Export Workflow
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
};
