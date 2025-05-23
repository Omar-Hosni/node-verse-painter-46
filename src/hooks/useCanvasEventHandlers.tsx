
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { NodeType } from '@/store/types';

export const useCanvasEventHandlers = () => {
  const {
    setSelectedNode,
    setSelectedEdge,
    activeTool,
    setActiveTool,
    addNode,
  } = useCanvasStore();
  
  const reactFlowInstance = useReactFlow();

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
    setSelectedNode(null);
    setSelectedEdge(edge);
  }, [setSelectedNode, setSelectedEdge]);

  const onPaneClick = useCallback(() => {
    if (activeTool !== 'select' && activeTool !== 'hand' && 
        activeTool !== 'rectangle' && activeTool !== 'circle' && 
        activeTool !== 'text' && activeTool !== 'frame' && 
        activeTool !== 'draw') {
      // If a workflow node tool is active, add the appropriate node
      const position = reactFlowInstance.screenToFlowPosition({ 
        x: window.innerWidth / 2, 
        y: window.innerHeight / 2
      });
      
      // Add the node based on active tool
      addNode(activeTool as NodeType, position);
      
      // After adding the node, switch back to select tool
      setActiveTool('select');
    } else {
      // Normal behavior for select/hand tools
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }, [setSelectedNode, setSelectedEdge, activeTool, addNode, reactFlowInstance, setActiveTool]);

  return {
    onNodeClick,
    onEdgeClick,
    onPaneClick
  };
};
