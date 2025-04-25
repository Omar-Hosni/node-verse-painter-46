
import { create } from 'zustand';
import { 
  Connection, 
  Edge, 
  EdgeChange, 
  Node, 
  NodeChange, 
  addEdge, 
  OnNodesChange, 
  OnEdgesChange, 
  OnConnect, 
  applyNodeChanges, 
  applyEdgeChanges,
} from '@xyflow/react';

export type NodeType = 
  | 'model' 
  | 'lora' 
  | 'controlnet-canny' 
  | 'controlnet-depth' 
  | 'controlnet-pose' 
  | 'controlnet-segment' 
  | 'preview';

export interface ModelSettings {
  modelName: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
}

export interface LoraSettings {
  loraName: string;
  strength: number;
}

export interface ControlNetSettings {
  image: string | null;
  strength: number;
}

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  runwayApiKey: string | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (nodeType: NodeType, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, newData: any) => void;
  setSelectedNode: (node: Node | null) => void;
  setRunwayApiKey: (apiKey: string) => void;
  generateImageFromNodes: () => Promise<void>;
}

let nodeIdCounter = 1;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  runwayApiKey: null,

  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
    
    // If a node is selected, update the selected node
    const selectedNode = get().selectedNode;
    if (selectedNode) {
      const updatedNode = get().nodes.find(n => n.id === selectedNode.id);
      if (!updatedNode) {
        // Node was deleted
        set({ selectedNode: null });
      } else if (JSON.stringify(updatedNode) !== JSON.stringify(selectedNode)) {
        // Node was changed
        set({ selectedNode: updatedNode });
      }
    }
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    set({
      edges: addEdge({ ...connection, animated: true }, get().edges),
    });
  },

  addNode: (nodeType: NodeType, position: { x: number; y: number }) => {
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

    set({ 
      nodes: [...get().nodes, newNode],
      selectedNode: newNode,
    });
  },

  updateNodeData: (nodeId: string, newData: any) => {
    set({
      nodes: get().nodes.map(node => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
          
          // If this is the selected node, update it in the state
          if (get().selectedNode?.id === nodeId) {
            set({ selectedNode: updatedNode });
          }
          
          return updatedNode;
        }
        return node;
      }),
    });
  },

  setSelectedNode: (node: Node | null) => {
    set({ selectedNode: node });
  },

  setRunwayApiKey: (apiKey: string) => {
    set({ runwayApiKey: apiKey });
  },

  generateImageFromNodes: async () => {
    const { nodes, edges, runwayApiKey } = get();
    
    // Find the model node, which should be the starting point
    const modelNode = nodes.find(n => n.type === 'modelNode');
    if (!modelNode) {
      console.error("No model node found!");
      return;
    }

    if (!runwayApiKey) {
      console.error("Runware API key not set!");
      return;
    }

    // Find all connected lora nodes
    const loraNodes = nodes.filter(n => n.type === 'loraNode');
    
    // Find all connected controlnet nodes
    const controlNetNodes = nodes.filter(n => n.type === 'controlnetNode');
    
    // Find the preview node
    const previewNode = nodes.find(n => n.type === 'previewNode');
    
    // TODO: Implement actual API call to Runware
    console.log("Generating image with:", {
      modelNode: modelNode.data,
      loraNodes: loraNodes.map(n => n.data),
      controlNetNodes: controlNetNodes.map(n => n.data),
    });

    // For now, let's simulate a response
    const mockImageUrl = "https://images.unsplash.com/photo-1617296538902-887900d9b592?q=80&w=2080";
    
    // Update the preview node with the "generated" image
    if (previewNode) {
      get().updateNodeData(previewNode.id, { image: mockImageUrl });
    }

    // TODO: Implement the actual API integration with Runware
  }
}));
