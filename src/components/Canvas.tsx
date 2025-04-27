
import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  NodeTypes,
} from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { ModelNode } from './nodes/ModelNode';
import { LoraNode } from './nodes/LoraNode';
import { ControlnetNode } from './nodes/ControlnetNode';
import { PreviewNode } from './nodes/PreviewNode';

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
  } = useCanvasStore();
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNode(node);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

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
    </div>
  );
};
