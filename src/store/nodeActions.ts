
import { Node, NodeChange, applyNodeChanges, Edge } from '@xyflow/react';
import { NodeType } from './types';

let nodeIdCounter = 1;

export const createNode = (nodeType: NodeType, position: { x: number; y: number }): Node => {
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
        tutorialVideo: "/videos/lora-tutorial.mp4", // Path to tutorial video
        description: `${displayName}: Modifies model output with ${loraType} styling. Adjust strength to control effect intensity.`
      },
      className: 'node-lora',
    };
  } 
  // ControlNet nodes
  else if (nodeType.startsWith('controlnet-')) {
    const controlType = nodeType.replace('controlnet-', ''); // canny, depth, pose, segment
    let emoji = "🎯";
    let color = "#10b981";
    let displayName = `${controlType.charAt(0).toUpperCase() + controlType.slice(1)} Control`;
    
    newNode = {
      id,
      type: 'controlnetNode',
      position,
      data: {
        type: controlType,
        controlNetType: controlType,
        image: null,
        imageId: null,
        uploading: false,
        strength: 0.8,
        displayName,
        emoji,
        color,
        tutorialVideo: `/videos/controlnet-${controlType}-tutorial.mp4`,
        description: `${displayName}: Guides the image generation process using ${controlType} information from a reference image.`
      },
      className: 'node-controlnet',
    };
  } 
  // Input nodes
  else if (nodeType.startsWith('input-')) {
    const inputType = nodeType.split('-')[1]; // text, image
    let emoji = "📝";
    let color = "#3498db";
    let displayName = "Input";
    
    switch(inputType) {
      case 'text':
        emoji = "📝";
        color = "#3498db";
        displayName = "Text Input";
        newNode = {
          id,
          type: 'inputNode',
          position,
          data: {
            inputType,
            text: "",
            displayName,
            emoji,
            color,
            tutorialVideo: "/videos/text-input-tutorial.mp4",
            description: "Text Input: Enter text to be used as a prompt for image generation."
          },
          className: 'node-input',
        };
        break;
      case 'image':
        emoji = "🖼️";
        color = "#2980b9";
        displayName = "Image Input";
        newNode = {
          id,
          type: 'inputNode',
          position,
          data: {
            inputType,
            image: null,
            imageId: null,
            uploading: false,
            displayName,
            emoji,
            color,
            tutorialVideo: "/videos/image-input-tutorial.mp4",
            description: "Image Input: Upload an image to be used as reference or input for other nodes."
          },
          className: 'node-input',
        };
        break;
      default:
        throw new Error(`Unknown input type: ${inputType}`);
    }
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
        tutorialVideo: "/videos/preview-tutorial.mp4",
        description: "Preview: Displays the final generated image. Connect a model node to see the output."
      },
      className: 'node-preview',
    };
  } else {
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

export const deleteEdgeHelper = (
  edgeId: string,
  edges: Edge[]
): Edge[] => {
  return edges.filter(e => e.id !== edgeId);
};

// Reset node counter - useful when loading projects
export const resetNodeIdCounter = (nodes: Node[]) => {
  const maxId = Math.max(...nodes.map((n: Node) => {
    const match = n.id.match(/\d+$/);
    return match ? parseInt(match[0]) : 0;
  }));
  nodeIdCounter = maxId + 1;
};
