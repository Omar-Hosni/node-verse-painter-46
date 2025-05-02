
import React, { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  NodeTypes,
  useReactFlow,
} from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ModelNode } from './nodes/ModelNode';
import { LoraNode } from './nodes/LoraNode';
import { ControlnetNode } from './nodes/ControlnetNode';
import { PreviewNode } from './nodes/PreviewNode';
import { toast } from 'sonner';
import { Clipboard, Undo, Redo, Trash } from 'lucide-react';

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
        className="bg-canvas"
      />
      <div className="absolute bottom-4 right-4 p-2 bg-background/80 backdrop-blur-sm rounded-lg border border-border">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><Clipboard size={12} /> <span>Copy: Ctrl/Cmd+C</span></div>
          <div className="flex items-center gap-1"><Clipboard size={12} /> <span>Cut: Ctrl/Cmd+X</span></div>
          <div className="flex items-center gap-1"><Clipboard size={12} /> <span>Paste: Ctrl/Cmd+V</span></div>
          <div className="flex items-center gap-1"><Trash size={12} /> <span>Delete: Delete/Backspace</span></div>
          <div className="flex items-center gap-1"><Undo size={12} /> <span>Undo: Ctrl/Cmd+Z</span></div>
          <div className="flex items-center gap-1"><Redo size={12} /> <span>Redo: Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z</span></div>
        </div>
      </div>
    </div>
  );
};
