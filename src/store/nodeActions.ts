
import { Node, NodeChange, applyNodeChanges } from '@xyflow/react';
import { NodeType } from './types';

let nodeIdCounter = 1;

export const createNode = (nodeType: NodeType, position: { x: number; y: number }): Node => {
  const id = `${nodeType}-${nodeIdCounter++}`;
  let newNode: Node;
  
  switch(nodeType) {
    case 'model':
      newNode = {
        id,
        type: 'modelNode',
        position,
        data: {
          modelName: "runware:100@1",
          width: 512,
          height: 512,
          steps: 30,
          cfgScale: 7.5,
          prompt: "",
          negativePrompt: "",
          displayName: "Model",
          emoji: "🎨",
          color: "#ff69b4"
        },
        className: 'node-model',
      };
      break;
    case 'lora':
      newNode = {
        id,
        type: 'loraNode',
        position,
        data: {
          loraName: "",
          strength: 0.8,
          displayName: "LoRA",
          emoji: "🔧",
          color: "#8b5cf6"
        },
        className: 'node-lora',
      };
      break;
    case 'controlnet-canny':
    case 'controlnet-depth':
    case 'controlnet-pose':
    case 'controlnet-segment':
      newNode = {
        id,
        type: 'controlnetNode',
        position,
        data: {
          type: nodeType.replace('controlnet-', ''),
          image: null,
          imageId: null,
          uploading: false,
          strength: 0.8,
          displayName: `${nodeType.replace('controlnet-', '')} Control`,
          emoji: "🎯",
          color: "#10b981"
        },
        className: 'node-controlnet',
      };
      break;
    case 'preview':
      newNode = {
        id,
        type: 'previewNode',
        position,
        data: {
          image: null,
          displayName: "Preview",
          emoji: "🖼️",
          color: "#f59e0b"
        },
        className: 'node-preview',
      };
      break;
    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
  
  return newNode;
};

export const handleNodesChange = (
  changes: NodeChange[], 
  nodes: Node[], 
  selectedNode: Node | null
): {
  updatedNodes: Node[],
  updatedSelectedNode: Node | null
} => {
  const updatedNodes = applyNodeChanges(changes, nodes);
  
  let updatedSelectedNode = selectedNode;
  if (selectedNode) {
    const updatedNode = updatedNodes.find(n => n.id === selectedNode.id);
    if (!updatedNode) {
      updatedSelectedNode = null;
    } else if (JSON.stringify(updatedNode) !== JSON.stringify(selectedNode)) {
      updatedSelectedNode = updatedNode;
    }
  }
  
  return { updatedNodes, updatedSelectedNode };
};

export const updateNodeDataHelper = (
  nodeId: string, 
  newData: any, 
  nodes: Node[], 
  selectedNode: Node | null
): {
  updatedNodes: Node[],
  updatedSelectedNode: Node | null
} => {
  const updatedNodes = nodes.map(node => {
    if (node.id === nodeId) {
      const updatedNode = {
        ...node,
        data: {
          ...node.data,
          ...newData,
        },
      };
      
      return updatedNode;
    }
    return node;
  });
  
  let updatedSelectedNode = selectedNode;
  if (selectedNode?.id === nodeId) {
    updatedSelectedNode = updatedNodes.find(n => n.id === nodeId) || null;
  }
  
  return { updatedNodes, updatedSelectedNode };
};

// Reset node counter - useful when loading projects
export const resetNodeIdCounter = (nodes: Node[]) => {
  const maxId = Math.max(...nodes.map((n: Node) => {
    const match = n.id.match(/\d+$/);
    return match ? parseInt(match[0]) : 0;
  }));
  nodeIdCounter = maxId + 1;
};
