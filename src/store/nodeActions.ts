import { Node, NodeChange, applyNodeChanges } from '@xyflow/react';
import { NodeType } from "./types";
import { Edge } from '@xyflow/react';
import { merge } from 'lodash';

let nodeIdCounter = 1;
let globalOrderCounter = 1000;

export const createNode = (nodeType: NodeType, position: { x: number; y: number }, order): Node => {
  const id = `${nodeType}-${nodeIdCounter++}`;
  let newNode: Node;
  
  // Handle nodes based on schema design attribute
  if (nodeType.startsWith('control-net-') || 
      nodeType.startsWith('image-to-image-') || 
      nodeType.startsWith('input-text') ||
      nodeType.startsWith('connector') ||
      nodeType.startsWith('engine-')) {
    
    // These use normal-node design
    const displayName = getDisplayNameFromType(nodeType);
    console.log(getFunctionalityFromType(nodeType))
    
    newNode = {
      id,
      type: 'normal-node',
      position,
      data: {
        type: nodeType,
        functionality: getFunctionalityFromType(nodeType),
        displayName,
        order,
        // Add default right_sidebar data based on type
        right_sidebar:{
        ...getDefaultDataForType(nodeType)
        }
      },
      className: 'node-normal',
    };
  }
  // Layer image nodes
  else if (nodeType === 'layer-image-node') {
    newNode = {
      id,
      type: 'layer-image-node',
      position,
      data: {
        type: nodeType,
        functionality: 'output',
        displayName: 'Image Layer',
        image: null,
        uploading: false,
        label: "Image Layer",
        order
      },
      className: 'node-layer-image',
    };
  }
  //Preview  Node
  else if (nodeType === 'preview-realtime-node') {
    newNode = {
      id,
      type: 'preview-realtime-node',
      position,
      data: {
        type: nodeType,
        functionality: 'output',
        displayName: 'Preview Layer',
        image: null,
        uploading: false,
        label: "Preview Layer",
        order
      },
      className: 'node-layer-preview',
    };
  }
  else if (nodeType === 'comment-node') {
    newNode = {
      id,
      type: 'comment-node',
      position,
      data: {
        displayName: 'Comment',
        text: '',
        color: '#fbbf24', // default yellow color
        order
      },
      className: 'node-comment',
    };
  } 
  else {
    throw new Error(`Unknown node type: ${nodeType}`);
  }
  
  return newNode;
};

// Helper functions for node creation
const getDisplayNameFromType = (nodeType: string): string => {
  const typeMap: Record<string, string> = {
    'control-net-pose': 'Pose Control',
    'control-net-edge': 'Edge Control',
    'control-net-lights': 'Lights Control',
    'control-net-face': 'Face Express',
    'control-net-segments': 'Segments',
    'control-net-depth': 'Depth Control',
    'control-net-normal-map': 'Normal Map',
    'control-net-reference': 'Reference',
    'image-to-image-re-imagine': 'Re-Imagine',
    'image-to-image-re-scene': 'Re-Scene',
    'image-to-image-object-relight': 'Object Re-Light',
    'image-to-image-reangle': 'Re-Angle',
    'image-to-image-remove-bg': 'Remove BG',
    'image-to-image-upscale': 'Upscale',
    'image-to-image-inpainting': 'In-Painting',
    'image-to-image-remove-outpainting': 'Out-Painting',
    'image-to-image-3d-maker': '3D Maker',
    'input-text': 'Text Prompt',
    'image-to-image-merger': 'Merger',
    'connector': 'Router',
    'preview-image': 'Image Output',
    'preview-realtime': 'Real-Time Preview',
  };
  return typeMap[nodeType] || nodeType;
};

const getFunctionalityFromType = (nodeType: string): string => {
  if (nodeType.startsWith('control-net-')) return 'control-net';
  if (nodeType.startsWith('image-to-image-')) return 'image-to-image';
  if (nodeType === 'input-text') return 'input';
  if (nodeType === 'connector') return 'helper';
  if (nodeType.startsWith('preview-')) return 'preview';
  if (nodeType.startsWith('engine-')) return 'engine';
  return 'unknown';
};

const getDefaultDataForType = (nodeType: string): Record<string, any> => {
  // Return default right_sidebar data based on node type from schema
  const defaults: Record<string, any> = {
    'control-net-pose': {
      pose: '',
      source: '',
      fingers: { left: 0, right: 0 },
      shoulders: { left: 0, right: 0 },
      elbow: { left: 0, right: 0 },
      hip: { left: 0, right: 0 },
      knee: { left: 0, right: 0 },
      ankle: { left: 0, right: 0 },
      neck: 0,
      head: 0,
    },
    'control-net-edge': {
      image: '',
      type: 'source',
      source: '',
      map: ''
    },
    'image-to-image-re-imagine': {
      creativity: 50
    },
    'input-text': {
      prompt: '',
      negative: '',
      enhance: false
    },
    'preview-image': {
      preview: '',
      quality: 100,
      ratio: 'Outpaint',
      accident: 0
    }
  };
  
  return defaults[nodeType] || {};
};

export const getHighestOrder = (nodes: Node[]): number => {
  
  return nodes.reduce((max, node) => 
    Math.max(max, node.data?.order || 0), 0);
};

// Add function to renumber orders
export const renumberOrders = (nodes: Node[]): Node[] => {
  const sortedNodes = [...nodes].sort((a, b) => 
    (a.data?.order || 0) - (b.data?.order || 0));
  
  return sortedNodes.map((node, index) => ({
    ...node,
    data: {
      ...node.data,
      order: index + 1 // Start from 1
    }
  }));
};

export const renumberOrdersEnhanced = (nodes: Node[]): Node[] => {
  // Separate nodes by parent
  const nodesByParent: Record<string, Node[]> = {};
  const topLevelNodes: Node[] = [];
  
  nodes.forEach(node => {
    if (node.parentId) {
      if (!nodesByParent[node.parentId]) {
        nodesByParent[node.parentId] = [];
      }
      nodesByParent[node.parentId].push(node);
    } else {
      topLevelNodes.push(node);
    }
  });

  // Sort top-level nodes by current order
  topLevelNodes.sort((a, b) => (a.data?.order || 0) - (b.data?.order || 0));
  
  let globalOrder = 1;
  const renumberedNodes: Node[] = [];
  
  // Process top-level nodes and their children
  topLevelNodes.forEach(parent => {
    // Update parent order
    const updatedParent = {
      ...parent,
      data: {
        ...parent.data,
        order: globalOrder++
      }
    };
    renumberedNodes.push(updatedParent);
    
    // Process children
    const children = nodesByParent[parent.id] || [];
    children.sort((a, b) => (a.data?.order || 0) - (b.data?.order || 0));
    
    children.forEach(child => {
      renumberedNodes.push({
        ...child,
        data: {
          ...child.data,
          order: globalOrder++
        }
      });
    });
  });
  
  return renumberedNodes;
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


// export const updateNodeDataHelper = (
//   nodeId: string, 
//   newData: any, 
//   nodes: Node[], 
//   selectedNode: Node | null
// ): {
//   updatedNodes: Node[],
//   updatedSelectedNode: Node | null
// } => {
//   const updatedNodes = nodes.map(node => {
//     if (node.id === nodeId) {
//       const newDataMerged = merge({}, node.data, newData);
//       if (JSON.stringify(node.data) === JSON.stringify(newDataMerged)) {
//         return node; // Avoid unnecessary updates
//       }
//       return { ...node, data: newDataMerged };
//     }
//     return node;
//   });
  
//   let updatedSelectedNode = selectedNode;
//   if (selectedNode?.id === nodeId) {
//     updatedSelectedNode = updatedNodes.find(n => n.id === nodeId) || null;
//   }
  
//   return { updatedNodes, updatedSelectedNode };
// };

  export const updateNodeDataHelper = (
    nodeId: string, 
    newData: any, 
    nodes: Node[], 
    selectedNode: Node | null
  ): {
    updatedNodes: Node[],
    updatedSelectedNode: Node | null
  } => {
    const nodeToUpdate = nodes.find(n => n.id === nodeId);
    if (!nodeToUpdate) return { updatedNodes: nodes, updatedSelectedNode: selectedNode };

    const deltaX = newData.position && nodeToUpdate.position 
      ? newData.position.x - nodeToUpdate.position.x 
      : 0;
    const deltaY = newData.position && nodeToUpdate.position 
      ? newData.position.y - nodeToUpdate.position.y 
      : 0;

    let updatedNodes = nodes.map(node => {
      if (node.id === nodeId) {
        const newDataMerged = merge({}, node.data, newData);
        if (JSON.stringify(node.data) === JSON.stringify(newDataMerged) &&
            (!newData.position || 
            (node.position.x === newData.position.x && node.position.y === newData.position.y))) {
          return node; // Avoid unnecessary updates
        }
        return { ...node, data: newDataMerged, position: newData.position || node.position };
      }
      return node;
    });

    // 🏠 If the updated node is a labeled frame and moved, sync its child nodes
    if (nodeToUpdate.type === 'labeledFrameGroupNode' && (deltaX !== 0 || deltaY !== 0)) {
      updatedNodes = updatedNodes.map(node => {
        const groupedWith = (node.data as any)?.groupedWith;
        if (groupedWith === nodeId) {
          return {
            ...node,
            position: {
              x: node.position.x + deltaX,
              y: node.position.y + deltaY,
            }
          };
        }
        return node;
      });
    }

    let updatedSelectedNode = selectedNode;
    if (selectedNode?.id === nodeId) {
      updatedSelectedNode = updatedNodes.find(n => n.id === nodeId) || null;
    }

    return { updatedNodes, updatedSelectedNode };
  };




export const deleteEdgeHelper = (
  edgeId: string,
  edges: Edge[]
): Edge[] => {
  return edges.filter(edge => edge.id !== edgeId);
};

// Reset node counter - useful when loading projects
export const resetNodeIdCounter = (nodes: Node[]) => {
  const maxId = Math.max(...nodes.map((n: Node) => {
    const match = n.id.match(/\d+$/);
    return match ? parseInt(match[0]) : 0;
  }));
  nodeIdCounter = maxId + 1;
};
