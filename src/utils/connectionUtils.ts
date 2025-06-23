
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
  SelectionMode,
  NodePositionChange,
  NodeDimensionChange,
  MarkerType,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
  Connection
} from '@xyflow/react';

import { toast } from 'sonner';

// Connection validation function
export const isValidConnection = (connection: Connection, nodes: ReactFlowNode[], edges: ReactFlowEdge[]): boolean => {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);
  
  if (!sourceNode || !targetNode) {
    toast.error("Invalid connection: Source or target node not found");
    return false;
  }

  const sourceType = sourceNode.data?.type || sourceNode.type;
  const targetType = targetNode.data?.type || targetNode.type;
  const sourceFunctionality = sourceNode.data?.functionality;
  const targetFunctionality = targetNode.data?.functionality;

  // Controller nodes rules
  if (sourceFunctionality === 'control-net') {
    // Controller nodes can only connect to engine nodes
    if (targetFunctionality !== 'engine') {
      toast.error("Controller nodes can only connect to engine nodes");
      return false;
    }
    
    // Check if engine already has re-rendering or tools nodes (except inpainting/outpainting)
    const engineIncomingEdges = edges.filter(e => e.target === targetNode.id);
    const hasReRenderingOrTools = engineIncomingEdges.some(edge => {
      const inputNode = nodes.find(n => n.id === edge.source);
      const inputFunctionality = inputNode?.data?.functionality;
      const inputType = inputNode?.data?.type;
      
      return inputFunctionality === 'image-to-image' && 
             !inputType?.includes('inpainting') && 
             !inputType?.includes('outpainting');
    });
    
    if (hasReRenderingOrTools) {
      toast.error("Controller nodes cannot be used with re-rendering or tools nodes (except inpainting/outpainting)");
      return false;
    }
  }

  // Re-rendering nodes rules
  if (sourceFunctionality === 'image-to-image' && sourceType?.includes('re-')) {
    if (['re-scene', 're-light', 're-angle'].some(type => sourceType?.includes(type))) {
      if (targetFunctionality !== 'engine') {
        toast.error("Re-scene, re-light, and re-angle nodes can only connect to engine nodes");
        return false;
      }
    }
    
    // Re-imagen special rules
    if (sourceType?.includes('re-imagine')) {
      const sourceHasEngineInput = edges.some(edge => {
        if (edge.target === sourceNode.id) {
          const inputNode = nodes.find(n => n.id === edge.source);
          return inputNode?.data?.functionality === 'engine';
        }
        return false;
      });
      
      if (!sourceHasEngineInput && targetFunctionality !== 'engine') {
        toast.error("Re-imagine without engine input can only connect to engine nodes");
        return false;
      }
    }
    
    // Check for multiple re-rendering nodes on same engine
    if (targetFunctionality === 'engine') {
      const engineIncomingEdges = edges.filter(e => e.target === targetNode.id);
      const hasReRenderingNode = engineIncomingEdges.some(edge => {
        const inputNode = nodes.find(n => n.id === edge.source);
        return inputNode?.data?.functionality === 'image-to-image' && 
               inputNode?.data?.type?.includes('re-');
      });
      
      if (hasReRenderingNode) {
        toast.error("Engine can only have one re-rendering node as input");
        return false;
      }
    }
  }

  // Tools nodes rules
  if (sourceFunctionality === 'image-to-image' && !sourceType?.includes('re-')) {
    // Inpainting and outpainting can only connect to engine
    if (['inpainting', 'outpainting', '3d-maker'].some(type => sourceType?.includes(type))) {
      if (targetFunctionality !== 'engine') {
        toast.error("Inpainting, outpainting, and 3D maker nodes can only connect to engine nodes");
        return false;
      }
    }
    
    // Check for multiple tools nodes on same engine
    if (targetFunctionality === 'engine') {
      const engineIncomingEdges = edges.filter(e => e.target === targetNode.id);
      const hasToolsNode = engineIncomingEdges.some(edge => {
        const inputNode = nodes.find(n => n.id === edge.source);
        return inputNode?.data?.functionality === 'image-to-image' && 
               !inputNode?.data?.type?.includes('re-');
      });
      
      if (hasToolsNode) {
        toast.error("Engine can only have one tools node as input");
        return false;
      }
      
      // Check for re-rendering nodes conflict
      const hasReRenderingNode = engineIncomingEdges.some(edge => {
        const inputNode = nodes.find(n => n.id === edge.source);
        return inputNode?.data?.functionality === 'image-to-image' && 
               inputNode?.data?.type?.includes('re-');
      });
      
      if (hasReRenderingNode && !sourceType?.includes('inpainting') && !sourceType?.includes('outpainting')) {
        toast.error("Tools nodes cannot be used with re-rendering nodes (except inpainting/outpainting)");
        return false;
      }
    }
  }

  // Engine node conditional rules
  if (targetFunctionality === 'engine') {
    // Engine must have at least one input to be used as image delivery
    const engineOutgoingEdges = edges.filter(e => e.source === targetNode.id);
    if (engineOutgoingEdges.length > 0) {
      const engineIncomingEdges = edges.filter(e => e.target === targetNode.id);
      if (engineIncomingEdges.length === 0 && sourceFunctionality !== 'input') {
        toast.error("Engine node must have at least one input before being used as image delivery");
        return false;
      }
    }
  }

  // Conditional image delivery rules
  const conditionalImageDeliveryTypes = ['re-imagine', 'inpainting', 'outpainting'];
  if (conditionalImageDeliveryTypes.some(type => sourceType?.includes(type))) {
    const sourceHasEngineInput = edges.some(edge => {
      if (edge.target === sourceNode.id) {
        const inputNode = nodes.find(n => n.id === edge.source);
        return inputNode?.data?.functionality === 'engine';
      }
      return false;
    });
    
    if (!sourceHasEngineInput) {
      toast.error(`${sourceType} node must have engine input before being used as image delivery`);
      return false;
    }
  }

  return true;
};

export default isValidConnection