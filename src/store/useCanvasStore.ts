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
import { getRunwareService } from '@/services/runwareService';
import { toast } from 'sonner';

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
    
    const selectedNode = get().selectedNode;
    if (selectedNode) {
      const updatedNode = get().nodes.find(n => n.id === selectedNode.id);
      if (!updatedNode) {
        set({ selectedNode: null });
      } else if (JSON.stringify(updatedNode) !== JSON.stringify(selectedNode)) {
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
    
    const modelNode = nodes.find(n => n.type === 'modelNode');
    if (!modelNode) {
      toast.error("No model node found! Please add a model node to your canvas.");
      return;
    }

    if (!runwayApiKey) {
      toast.error("Runware API key not set! Please set your API key in the settings.");
      return;
    }

    const loraNodes = nodes.filter(n => n.type === 'loraNode');
    const controlNetNodes = nodes.filter(n => n.type === 'controlnetNode');
    const previewNode = nodes.find(n => n.type === 'previewNode');
    if (!previewNode) {
      toast.error("No preview node found! Please add a preview node to your canvas.");
      return;
    }

    try {
      toast.info("Generating image...");
      
      const loraArray = loraNodes
        .filter(n => n.data.loraName)
        .map(n => ({
          name: n.data.loraName as string,
          strength: Number(n.data.strength) as number
        }));
      
      const controlnetArray = controlNetNodes
        .filter(n => n.data.image)
        .map(n => {
          return {
            type: n.data.type as string,
            imageUrl: n.data.image as string,
            strength: Number(n.data.strength) as number
          };
        });
      
      const runwareService = getRunwareService(runwayApiKey);
      
      const params = {
        positivePrompt: modelNode.data.prompt as string || "beautiful landscape",
        negativePrompt: modelNode.data.negativePrompt as string || "",
        model: modelNode.data.modelName as string || "runware:100@1",
        width: Number(modelNode.data.width) || 1024,
        height: Number(modelNode.data.height) || 1024,
        CFGScale: Number(modelNode.data.cfgScale) || 7.5,
        scheduler: "EulerDiscreteScheduler",
        steps: Number(modelNode.data.steps) || 30,
        lora: loraArray.length > 0 ? loraArray : undefined,
        controlnet: controlnetArray.length > 0 ? controlnetArray : undefined,
      };
      
      console.log("Generating image with params:", params);
      
      const generatedImage = await runwareService.generateImage(params);
      
      console.log("Generated image:", generatedImage);
      
      if (generatedImage && generatedImage.imageURL) {
        get().updateNodeData(previewNode.id, { image: generatedImage.imageURL });
        toast.success("Image generated successfully!");
      } else {
        toast.error("Failed to generate image. Please try again.");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}));
