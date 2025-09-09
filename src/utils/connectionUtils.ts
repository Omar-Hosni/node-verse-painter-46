
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
import { useCanvasStore } from '@/store/useCanvasStore';

import { toast } from 'sonner';


  // Function to detect workflows from nodes and edges
export const detectWorkflows = () => {
    const { nodes, edges } = useCanvasStore.getState();

    if (!nodes.length) return [];

    const workflows: Array<{
      name: string;
      nodes: Node[];
      engineNode?: Node;
    }> = [];

    // Find workflow segments separated by preview nodes
    const findWorkflowSegment = (
      startNodeId: string,
      visitedInSegment: Set<string>
    ): Set<string> => {
      const segmentNodes = new Set<string>();
      const toVisit = [startNodeId];

      while (toVisit.length > 0) {
        const currentNodeId = toVisit.pop()!;
        
        if (visitedInSegment.has(currentNodeId)) continue;
        
        visitedInSegment.add(currentNodeId);
        segmentNodes.add(currentNodeId);

        const currentNode = nodes.find(n => n.id === currentNodeId);
        const isPreviewNode = currentNode?.type === "previewNode" || 
                             currentNode?.type === "output" ||
                             currentNode?.type === "preview-realtime-node";

        // Find connected edges
        const connectedEdges = edges.filter(
          (edge) => edge.source === currentNodeId || edge.target === currentNodeId
        );

        connectedEdges.forEach((edge) => {
          const nextNodeId = edge.source === currentNodeId ? edge.target : edge.source;
          const nextNode = nodes.find(n => n.id === nextNodeId);
          const nextIsPreviewNode = nextNode?.type === "previewNode" || 
                                   nextNode?.type === "output" ||
                                   nextNode?.type === "preview-realtime-node";

          // Don't cross preview node boundaries when traversing
          // Include the preview node in the segment, but don't traverse beyond it
          if (!visitedInSegment.has(nextNodeId)) {
            if (isPreviewNode && edge.source === currentNodeId) {
              // Current node is preview node acting as source - don't traverse to target
              return;
            }
            if (nextIsPreviewNode && edge.target === nextNodeId) {
              // Next node is preview node acting as target - include it but don't traverse beyond
              segmentNodes.add(nextNodeId);
              visitedInSegment.add(nextNodeId);
              return;
            }
            toVisit.push(nextNodeId);
          }
        });
      }

      return segmentNodes;
    };

    // Find all workflow segments
    const globalVisited = new Set<string>();
    
    nodes.forEach((node) => {
      if (!globalVisited.has(node.id)) {
        const segmentNodeIds = findWorkflowSegment(node.id, globalVisited);
        const workflowNodes = nodes.filter((n) => segmentNodeIds.has(n.id));

        // Check if this segment contains qualifying nodes for a workflow
        const hasNormalNode = workflowNodes.some(
          (n) => n.type === "normal-node"
        );
        const hasEngineNode = workflowNodes.some(
          (n) => n.type === "engineNode"
        );
        const hasEngineNodeType = workflowNodes.some(
          (n) => n.type === "engine node"
        );
        const hasAnyEngineNode = workflowNodes.some((n) =>
          n.type?.toLowerCase().includes("engine") ||
          n.data?.type?.toLowerCase().includes("engine") ||
          n.data?.functionality === "engine"
        );

        // Check for preview node with incoming connections
        const hasConnectedPreviewNode = workflowNodes.some((previewNode) => {
          const isPreviewNode =
            previewNode.type === "previewNode" ||
            previewNode.type === "output" ||
            previewNode.type === "preview-realtime-node";
          if (!isPreviewNode) return false;

          // Check if this preview node has incoming connections within this segment
          const hasIncomingConnection = edges.some(
            (edge) => edge.target === previewNode.id && segmentNodeIds.has(edge.source)
          );
          return hasIncomingConnection;
        });

        // A workflow segment is valid if it has qualifying nodes AND a connected preview node
        if (
          (hasNormalNode || hasEngineNode || hasEngineNodeType || hasAnyEngineNode) &&
          hasConnectedPreviewNode
        ) {
          // Find engine node for this segment
          const engineNode =
            workflowNodes.find((n) => n.type === "engineNode") ||
            workflowNodes.find((n) => n.type === "engine node") ||
            workflowNodes.find((n) => n.type?.toLowerCase().includes("engine")) ||
            workflowNodes.find((n) => n.data?.type?.toLowerCase().includes("engine")) ||
            workflowNodes.find((n) => n.data?.functionality === "engine") ||
            workflowNodes[0];

          workflows.push({
            name: `Flow${workflows.length + 1}`,
            nodes: workflowNodes,
            engineNode,
          });
        }
      }
    });

    console.log("DEBUG: Final workflows count:", workflows.length);
    return workflows;
};

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

  // Allow preview nodes to act as image sources for continuous workflows
  const isPreviewNodeSource = sourceNode.type === 'previewNode' || 
                              sourceNode.type === 'output' || 
                              sourceNode.type === 'preview-realtime-node' ||
                              sourceFunctionality === 'output';
  
  const isImageInputTarget = targetNode.type === 'image-node' ||
                            targetFunctionality === 'control-net' ||
                            targetFunctionality === 'image-to-image' ||
                            targetFunctionality === 'engine' ||
                            targetNode.type === 'previewNode' ||
                            targetNode.type === 'output';

  // Allow preview nodes to connect to other nodes that accept image inputs
  if (isPreviewNodeSource && isImageInputTarget) {
    return true; // Allow preview nodes to act as image sources
  }

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