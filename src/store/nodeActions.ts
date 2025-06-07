import { Node, NodeChange, applyNodeChanges } from '@xyflow/react';
import { NodeType } from "./types";
import { Edge } from '@xyflow/react';
import { merge } from 'lodash';

let nodeIdCounter = 1;
let globalOrderCounter = 1000;

export const createNode = (nodeType: NodeType, position: { x: number; y: number }, order): Node => {
  const id = `${nodeType}-${nodeIdCounter++}`;
  let newNode: Node;
  
  // Model nodes
  if (nodeType.startsWith('model-')) {
    const modelType = nodeType.split('-')[1]; // sdxl, flux, hidream
    let emoji = "🎨";
    let color = "#ff69b4";
    let modelName = "runware:100@1";
    let displayName = "Model";
    
    switch(modelType) {
      case 'sdxl':
        emoji = "🚀";
        color = "#8000ff";
        modelName = "stabilityai/sdxl";
        displayName = "SDXL Model";
        break;
      case 'flux':
        emoji = "⚡";
        color = "#ff8c00";
        modelName = "flux/model";
        displayName = "Flux Model";
        break;
      case 'hidream':
        emoji = "✨";
        color = "#ff1493";
        modelName = "hidream/model";
        displayName = "HiDream Model";
        break;
    }
    
    
    newNode = {
      id,
      type: 'modelNode',
      position,
      data: {
        modelName,
        modelType,
        width: 512,
        height: 512,
        steps: 30,
        cfgScale: 7.5,
        prompt: "",
        negativePrompt: "",
        displayName,
        emoji,
        color,
        order,
        tutorialVideo: "/videos/model-tutorial.mp4", // Path to tutorial video
        description: `${displayName}: Generates images using the ${modelType.toUpperCase()} architecture. Adjust parameters for different results.`
      },
      className: 'node-model',
    };
  } 
  // Lora nodes
  else if (nodeType.startsWith('lora-')) {
    const loraType = nodeType.split('-')[1]; // realistic, cartoon, character
    let emoji = "🔧";
    let color = "#8b5cf6";
    let loraName = "";
    let displayName = "LoRA";
    
    switch(loraType) {
      case 'realistic':
        emoji = "📷";
        color = "#4b0082";
        loraName = "realistic-style";
        displayName = "Realistic LoRA";
        break;
      case 'cartoon':
        emoji = "🎭";
        color = "#9370db";
        loraName = "cartoon-style";
        displayName = "Cartoon LoRA";
        break;
      case 'character':
        emoji = "👤";
        color = "#800080";
        loraName = "character-style";
        displayName = "Character LoRA";
        break;
    }
    
    newNode = {
      id,
      type: 'loraNode',
      position,
      data: {
        loraName,
        loraType,
        strength: 0.8,
        displayName,
        emoji,
        color,
        order,
        tutorialVideo: "/videos/lora-tutorial.mp4", // Path to tutorial video
        description: `${displayName}: Modifies model output with ${loraType} styling. Adjust strength to control effect intensity.`
      },
      className: 'node-lora',
    };
  } 
  // ControlNet nodes
  else if (nodeType.startsWith('controlnet-')) {
    const controlType = nodeType.replace('controlnet-', ''); // canny, depth, pose, segment
    let displayName = `${controlType.charAt(0).toUpperCase() + controlType.slice(1)} Control`;
    
    const baseControlnetData = {
      type: controlType,
      controlNetType: controlType,
      image: null,
      imageId: null,
      uploading: false,
      strength: 0.8,
      displayName,
      
    };

    // Add Canny specific properties
    if (controlType === 'canny') {
      newNode = {
        id,
        type: 'controlnetNode',
        position,
        data: {
          ...baseControlnetData,
          low_threshold: 100,
          high_threshold: 200,
          resolution: 512,
          order
        },
        className: 'node-controlnet',
      };
    } else {
      newNode = {
        id,
        type: 'controlnetNode',
        position,
        data: {...baseControlnetData, order},
        className: 'node-controlnet',
      };
    }
  } 
  // Input nodes
  else if (nodeType.startsWith('input-')) {
    const inputType = nodeType.split('-')[1]; // text, image
    let displayName = inputType.charAt(0).toUpperCase() + inputType.slice(1) + ' Input';
    
    newNode = {
      id,
      type: 'inputNode',
      position,
      data: {
        inputType,
        // For text input
        text: inputType === 'text' ? "" : undefined,
        // For image input
        image: inputType === 'image' ? null : undefined,
        imageId: inputType === 'image' ? null : undefined,
        uploading: inputType === 'image' ? false : undefined,
        // Common properties
        displayName,
        order
      },
      className: 'node-input',
    };
  } 
  // Output/Preview node
  else if (nodeType === 'output-preview') {
    newNode = {
      id,
      type: 'previewNode',
      position,
      data: {
        image: null,
        displayName: "Preview",
        emoji: "🖼️",
        color: "#f59e0b",
        order,
        tutorialVideo: "/videos/preview-tutorial.mp4",
        description: "Preview: Displays the final generated image. Connect a model node to see the output."
      },
      className: 'node-preview',
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
