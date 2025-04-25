import React, { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
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
      >
        <Background
          color="#444444"
          gap={16}
          size={1}
          variant={BackgroundVariant.Dots}
        />
        <Controls
          className="bg-sidebar border border-field rounded-md overflow-hidden"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'modelNode':
                return '#3b82f6';
              case 'loraNode':
                return '#8b5cf6';
              case 'controlnetNode':
                return '#10b981';
              case 'previewNode':
                return '#f59e0b';
              default:
                return '#64748b';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.3)"
          className="bg-sidebar border border-field rounded-md overflow-hidden"
        />
      </ReactFlow>
    </div>
  );
};
