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
import { getRunwareService, UploadedImage } from '@/services/runwareService';
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
  imageId?: string; // Added to store the uploaded image UUID
  uploading?: boolean; // Added to track upload status
  strength: number;
}

// History interface for undo/redo functionality
interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

// Define the workflow JSON schema
export interface WorkflowJsonNode {
  inputs: Record<string, any>;
  class_type: string;
  _meta: {
    title: string;
  };
}

export interface WorkflowJson {
  [key: string]: WorkflowJsonNode;
}

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  runwayApiKey: string | null;
  clipboard: Node | null; // For clipboard operations
  history: HistoryState[]; // For undo functionality
  historyIndex: number; // Current position in history
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (nodeType: NodeType, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, newData: any) => void;
  setSelectedNode: (node: Node | null) => void;
  setRunwayApiKey: (apiKey: string) => void;
  generateImageFromNodes: () => Promise<void>;
  uploadControlNetImage: (nodeId: string, imageData: string) => Promise<void>;
  // New clipboard functions
  copySelectedNode: () => void;
  cutSelectedNode: () => void;
  pasteNodes: (position: { x: number; y: number }) => void;
  deleteSelectedNode: () => void;
  // Undo/redo functions
  undo: () => void;
  redo: () => void;
  // Internal function to save current state to history
  saveToHistory: () => void;
  // Export workflow as JSON
  exportWorkflowAsJson: () => WorkflowJson;
}

let nodeIdCounter = 1;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  runwayApiKey: null,
  clipboard: null,
  history: [], // Initialize empty history
  historyIndex: -1, // No history item selected initially

  onNodesChange: (changes: NodeChange[]) => {
    // Save state before making changes
    get().saveToHistory();
    
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
    // Save state before making changes to edges
    get().saveToHistory();
    
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection: Connection) => {
    // Save state before connecting
    get().saveToHistory();
    
    set({
      edges: addEdge({ ...connection, animated: true }, get().edges),
    });
  },

  addNode: (nodeType: NodeType, position: { x: number; y: number }) => {
    // Save state before adding node
    get().saveToHistory();
    
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

    set({ 
      nodes: [...get().nodes, newNode],
      selectedNode: newNode,
    });
  },

  updateNodeData: (nodeId: string, newData: any) => {
    // Save state before updating node data
    get().saveToHistory();
    
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

  uploadControlNetImage: async (nodeId: string, imageData: string) => {
    const { runwayApiKey } = get();
    
    if (!runwayApiKey) {
      toast.error("API key not set! Please set your API key in the settings.");
      return;
    }

    try {
      // Set uploading flag to true
      get().updateNodeData(nodeId, { 
        uploading: true 
      });

      // Get the RunwareService instance
      const runwareService = getRunwareService(runwayApiKey);
      
      // Upload the image
      const uploadedImage = await runwareService.uploadImage(imageData);
      console.log("Image uploaded successfully:", uploadedImage);
      
      // Update the node with the uploaded image ID
      get().updateNodeData(nodeId, { 
        imageId: uploadedImage.imageUUID,
        uploading: false 
      });
      
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading ControlNet image:", error);
      get().updateNodeData(nodeId, { uploading: false });
      toast.error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      toast.info("Preparing image generation...");
      
      // Get RunwareService instance
      const runwareService = getRunwareService(runwayApiKey);
      
      // Check if all ControlNet nodes with images have their images already uploaded
      for (const node of controlNetNodes) {
        if (node.data.image && !node.data.imageId) {
          // We need to upload this image first
          toast.info(`Uploading ${node.data.type} control image...`);
          
          // Set uploading flag
          get().updateNodeData(node.id, { 
            uploading: true 
          });
          
          try {
            // Fix: Ensure we're passing a string to uploadImage
            const imageData = node.data.image as string;
            const uploadedImage = await runwareService.uploadImage(imageData);
            console.log(`${node.data.type} image uploaded:`, uploadedImage);
            
            // Update node with the uploaded image ID
            get().updateNodeData(node.id, {
              imageId: uploadedImage.imageUUID,
              uploading: false
            });
          } catch (error) {
            console.error(`Error uploading ${node.data.type} image:`, error);
            
            // Reset uploading flag
            get().updateNodeData(node.id, { uploading: false });
            
            // Show error and abort generation
            toast.error(`Failed to upload ${node.data.type} control image: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return;
          }
        }
      }

      // All ControlNet images are uploaded, proceed with image generation
      toast.info("Generating image...");
      
      const loraArray = loraNodes
        .filter(n => n.data.loraName)
        .map(n => ({
          name: n.data.loraName as string,
          strength: Number(n.data.strength) as number
        }));
      
      const controlnetArray = controlNetNodes
        .filter(n => n.data.image && n.data.imageId)
        .map(n => {
          return {
            type: n.data.type as string,
            imageUrl: n.data.imageId as string, // Use the uploaded image ID
            strength: Number(n.data.strength) as number
          };
        });
      
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
  },
  
  // New clipboard functions
  copySelectedNode: () => {
    const { selectedNode } = get();
    if (selectedNode) {
      set({ clipboard: JSON.parse(JSON.stringify(selectedNode)) });
    }
  },
  
  cutSelectedNode: () => {
    const { selectedNode } = get();
    if (selectedNode) {
      // First save to history
      get().saveToHistory();
      
      // Copy to clipboard
      set({ clipboard: JSON.parse(JSON.stringify(selectedNode)) });
      
      // Remove the node
      set({ 
        nodes: get().nodes.filter(n => n.id !== selectedNode.id),
        // Also remove any connected edges
        edges: get().edges.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id),
        selectedNode: null,
      });
    }
  },
  
  pasteNodes: (position) => {
    const { clipboard } = get();
    if (clipboard) {
      // Save current state to history before pasting
      get().saveToHistory();
      
      // Create a new ID for the pasted node
      const id = `${clipboard.type}-${nodeIdCounter++}`;
      
      // Create a deep copy of the clipboard node with the new ID and position
      const newNode = {
        ...JSON.parse(JSON.stringify(clipboard)),
        id,
        position,
      };
      
      set({ 
        nodes: [...get().nodes, newNode],
        selectedNode: newNode,
      });
    }
  },
  
  deleteSelectedNode: () => {
    const { selectedNode } = get();
    if (selectedNode) {
      // Save current state to history before deleting
      get().saveToHistory();
      
      set({ 
        nodes: get().nodes.filter(n => n.id !== selectedNode.id),
        // Also remove any connected edges
        edges: get().edges.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id),
        selectedNode: null,
      });
    }
  },
  
  // History management functions
  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    
    // Create a deep copy of current state
    const currentState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    
    // If we're not at the end of the history,
    // remove all future states before adding the new one
    const newHistory = historyIndex < history.length - 1 
      ? history.slice(0, historyIndex + 1) 
      : history;
    
    // Add current state to history
    // Limit history to 30 states to avoid memory issues
    const limitedHistory = [...newHistory, currentState].slice(-30);
    
    set({ 
      history: limitedHistory,
      historyIndex: limitedHistory.length - 1,
    });
  },
  
  undo: () => {
    const { historyIndex, history } = get();
    
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = history[newIndex];
      
      set({
        nodes: previousState.nodes,
        edges: previousState.edges,
        historyIndex: newIndex,
        selectedNode: null, // Clear selection when undoing
      });
    }
  },
  
  redo: () => {
    const { historyIndex, history } = get();
    
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      
      set({
        nodes: nextState.nodes,
        edges: nextState.edges,
        historyIndex: newIndex,
        selectedNode: null, // Clear selection when redoing
      });
    }
  },
  
  // New function to export workflow as JSON
  exportWorkflowAsJson: () => {
    const { nodes, edges } = get();
    const workflowJson: WorkflowJson = {};
    
    // Create a counter for node IDs in the JSON
    let idCounter = 1;
    
    // Map to store React Flow node ID to JSON node ID mapping
    const nodeIdMap = new Map<string, string>();
    
    // First pass: create node entries without connections
    nodes.forEach((node) => {
      const jsonNodeId = idCounter.toString();
      nodeIdMap.set(node.id, jsonNodeId);
      idCounter++;
      
      // Define the node structure based on node type
      switch (node.type) {
        case 'modelNode':
          workflowJson[jsonNodeId] = {
            inputs: {
              modelName: node.data.modelName || "runware:100@1",
              width: node.data.width || 512,
              height: node.data.height || 512,
              steps: node.data.steps || 30,
              cfgScale: node.data.cfgScale || 7.5,
              prompt: node.data.prompt || "",
              negativePrompt: node.data.negativePrompt || "",
            },
            class_type: "ModelNode",
            _meta: {
              title: node.data.displayName || "Model"
            }
          };
          break;
        case 'loraNode':
          workflowJson[jsonNodeId] = {
            inputs: {
              loraName: node.data.loraName || "",
              strength: node.data.strength || 0.8
            },
            class_type: "LoraNode",
            _meta: {
              title: node.data.displayName || "LoRA"
            }
          };
          break;
        case 'controlnetNode':
          workflowJson[jsonNodeId] = {
            inputs: {
              type: node.data.type || "canny",
              imageId: node.data.imageId || null,
              strength: node.data.strength || 0.8
            },
            class_type: "ControlnetNode",
            _meta: {
              title: node.data.displayName || `${node.data.type} Control`
            }
          };
          break;
        case 'previewNode':
          workflowJson[jsonNodeId] = {
            inputs: {
              image: node.data.image || null
            },
            class_type: "PreviewNode",
            _meta: {
              title: node.data.displayName || "Preview"
            }
          };
          break;
      }
    });
    
    // Second pass: add connections to the node inputs
    edges.forEach((edge) => {
      const sourceNodeJsonId = nodeIdMap.get(edge.source);
      const targetNodeJsonId = nodeIdMap.get(edge.target);
      
      if (sourceNodeJsonId && targetNodeJsonId && workflowJson[targetNodeJsonId]) {
        // Add connection to the target node's inputs
        if (!workflowJson[targetNodeJsonId].inputs.connections) {
          workflowJson[targetNodeJsonId].inputs.connections = [];
        }
        
        workflowJson[targetNodeJsonId].inputs.connections.push([sourceNodeJsonId, 0]);
      }
    });
    
    return workflowJson;
  },
}));
