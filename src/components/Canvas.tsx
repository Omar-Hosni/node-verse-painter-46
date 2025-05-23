
import React, { useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useReactFlow,
} from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useParams } from 'react-router-dom';
import FabricCanvas from './FabricCanvas';
import { useCanvasKeyboardShortcuts } from '@/hooks/useCanvasKeyboardShortcuts';
import { useCanvasEventHandlers } from '@/hooks/useCanvasEventHandlers';
import { CanvasToolbar } from './canvas/CanvasToolbar';
import { 
  nodeTypes, 
  edgeTypes, 
  defaultEdgeOptions,
  connectionLineStyle,
  connectionLineType
} from './canvas/FlowConfig';

import '@xyflow/react/dist/style.css';

export const Canvas = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const reactFlowContainerRef = useRef<HTMLDivElement>(null);
  
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect,
    activeTool,
    fetchUserCredits,
  } = useCanvasStore();
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Use our custom hooks
  useCanvasKeyboardShortcuts();
  const { onNodeClick, onEdgeClick, onPaneClick } = useCanvasEventHandlers();

  // Fetch user credits
  useEffect(() => {
    fetchUserCredits();
  }, [fetchUserCredits]);

  // Determine the pannable/draggable state based on the active tool
  const panOnDrag = activeTool === 'hand';
  const nodesDraggable = activeTool === 'select';
  
  // Disable ReactFlow interactions when drawing tools are active
  const isDrawingToolActive = ['rectangle', 'circle', 'text', 'frame', 'draw'].includes(activeTool);

  return (
    <div 
      className="flex-1 h-screen bg-[#121212]" 
      ref={reactFlowContainerRef}
    >
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
        className="bg-[#151515] xyflow-layer"
        connectionLineStyle={connectionLineStyle}
        connectionLineType={connectionLineType}
        snapToGrid={true}
        snapGrid={[15, 15]}
        panOnDrag={panOnDrag && !isDrawingToolActive}
        panOnScroll={panOnDrag && !isDrawingToolActive}
        nodesDraggable={nodesDraggable && !isDrawingToolActive}
        selectNodesOnDrag={!panOnDrag && !isDrawingToolActive}
        ref={reactFlowWrapper}
        style={{ zIndex: 5 }}
      >
        <MiniMap style={{ backgroundColor: '#1A1A1A' }} />
        <Controls className="bg-[#1A1A1A] border-[#333]" />
        <Background color="#333333" gap={16} />
        <CanvasToolbar />
      </ReactFlow>
      
      {/* Overlay Fabric.js canvas */}
      <FabricCanvas 
        activeTool={activeTool} 
        reactFlowContainerRef={reactFlowContainerRef}
        projectId={projectId}
      />
    </div>
  );
};

export default Canvas;
