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
import { supabase } from '@/integrations/supabase/client';

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
  imageId?: string;
  uploading?: boolean;
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

// User credits interface
export interface UserCredits {
  id: string;
  user_id: string;
  credits_balance: number;
  updated_at: string;
}

// Subscription tier type
export type SubscriptionTier = 'free' | 'standard' | 'premium';

// Subscription interface
export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  is_annual: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  runwayApiKey: string | null;
  credits: number | null;
  subscription: UserSubscription | null;
  clipboard: Node | null;
  history: HistoryState[];
  historyIndex: number;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (nodeType: NodeType, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, newData: any) => void;
  setSelectedNode: (node: Node | null) => void;
  setRunwayApiKey: (apiKey: string) => void;
  generateImageFromNodes: () => Promise<void>;
  uploadControlNetImage: (nodeId: string, imageData: string) => Promise<void>;
  copySelectedNode: () => void;
  cutSelectedNode: () => void;
  pasteNodes: (position: { x: number; y: number }) => void;
  deleteSelectedNode: () => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  exportWorkflowAsJson: () => WorkflowJson;
  saveProject: (name: string, description?: string) => Promise<string | null>;
  loadProject: (projectId: string) => Promise<boolean>;
  fetchUserCredits: () => Promise<void>;
  fetchUserSubscription: () => Promise<void>;
  useCreditsForGeneration: () => Promise<boolean>;
  sendWorkflowToAPI: () => Promise<boolean>;
}

let nodeIdCounter = 1;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  runwayApiKey: null,
  credits: null,
  subscription: null,
  clipboard: null,
  history: [],
  historyIndex: -1,

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

  // Modified: Check credits before generating and use useCreditsForGeneration
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

    // Check if user has enough credits
    const hasEnoughCredits = await get().useCreditsForGeneration();
    if (!hasEnoughCredits) {
      toast.error("Not enough credits! Please purchase more credits to continue generating images.");
      return;
    }

    // Use local API endpoint instead of Runware API
    const hasAPIAccess = await get().sendWorkflowToAPI();
    if (hasAPIAccess) {
      toast.success("Image generation request sent to API successfully!");
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
  
  // Fix the TypeScript errors in exportWorkflowAsJson
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
              modelName: node.data.modelName as string || "runware:100@1",
              width: node.data.width as number || 512,
              height: node.data.height as number || 512,
              steps: node.data.steps as number || 30,
              cfgScale: node.data.cfgScale as number || 7.5,
              prompt: node.data.prompt as string || "",
              negativePrompt: node.data.negativePrompt as string || "",
            },
            class_type: "ModelNode",
            _meta: {
              title: node.data.displayName as string || "Model"
            }
          };
          break;
        case 'loraNode':
          workflowJson[jsonNodeId] = {
            inputs: {
              loraName: node.data.loraName as string || "",
              strength: node.data.strength as number || 0.8
            },
            class_type: "LoraNode",
            _meta: {
              title: node.data.displayName as string || "LoRA"
            }
          };
          break;
        case 'controlnetNode':
          workflowJson[jsonNodeId] = {
            inputs: {
              type: node.data.type as string || "canny",
              imageId: node.data.imageId as string || null,
              strength: node.data.strength as number || 0.8
            },
            class_type: "ControlnetNode",
            _meta: {
              title: node.data.displayName as string || `${node.data.type} Control`
            }
          };
          break;
        case 'previewNode':
          workflowJson[jsonNodeId] = {
            inputs: {
              image: node.data.image as string || null
            },
            class_type: "PreviewNode",
            _meta: {
              title: node.data.displayName as string || "Preview"
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

  // New function to save the current canvas state as a project in Supabase
  saveProject: async (name: string, description: string = '') => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to save a project');
        return null;
      }

      // Get current canvas state and convert to a format compatible with Supabase's JSON type
      const { nodes, edges } = get();
      
      // Serializable canvas data that can be stored as JSON
      const canvasData = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges))
      };

      // Save to Supabase
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: session.user.id,
          name,
          description,
          canvas_data: canvasData
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving project:', error);
        toast.error(`Failed to save project: ${error.message}`);
        return null;
      }

      toast.success('Project saved successfully!');
      return data.id;
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  },

  // New function to load a project from Supabase
  loadProject: async (projectId: string) => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to load a project');
        return false;
      }

      // Fetch project from Supabase
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('Error loading project:', error);
        toast.error(`Failed to load project: ${error.message}`);
        return false;
      }

      if (!data || !data.canvas_data) {
        toast.error('Project data is invalid');
        return false;
      }

      // Parse canvas data from JSON
      const canvasData = data.canvas_data;
      
      // Ensure we have nodes and edges
      if (!canvasData.nodes || !canvasData.edges) {
        toast.error('Project data is corrupted or invalid');
        return false;
      }

      // Reset nodeIdCounter to avoid ID conflicts
      const maxId = Math.max(...canvasData.nodes.map((n: Node) => {
        const match = n.id.match(/\d+$/);
        return match ? parseInt(match[0]) : 0;
      }));
      nodeIdCounter = maxId + 1;

      // Load canvas state
      set({
        nodes: canvasData.nodes,
        edges: canvasData.edges,
        selectedNode: null,
        history: [{ nodes: canvasData.nodes, edges: canvasData.edges }],
        historyIndex: 0,
      });

      toast.success('Project loaded successfully!');
      return true;
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error(`Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  },
  
  // New method to fetch user credits
  fetchUserCredits: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching credits:', error);
        return;
      }

      set({ credits: data.credits_balance });
    } catch (error) {
      console.error('Error fetching user credits:', error);
    }
  },

  // New method to fetch user subscription
  fetchUserSubscription: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        return;
      }

      set({ subscription: data });
    } catch (error) {
      console.error('Error fetching user subscription:', error);
    }
  },

  // New method to use credits for generation
  useCreditsForGeneration: async () => {
    try {
      // Fetch latest credits balance
      await get().fetchUserCredits();
      const { credits } = get();
      
      // Check credits
      if (!credits || credits < 1) {
        return false;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      // Deduct 1 credit
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ credits_balance: credits - 1 })
        .eq('user_id', session.user.id);

      if (updateError) {
        console.error('Failed to update credits:', updateError);
        return false;
      }

      // Record transaction
      await supabase
        .from('credits_transactions')
        .insert({
          user_id: session.user.id,
          amount: -1,
          description: 'Image generation'
        });

      // Update local state
      set({ credits: credits - 1 });
      
      return true;
    } catch (error) {
      console.error('Error using credits:', error);
      return false;
    }
  },

  // New method to send workflow to local API
  sendWorkflowToAPI: async () => {
    try {
      const workflowJson = get().exportWorkflowAsJson();
      
      // Send to local API
      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflow: workflowJson }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API request failed');
      }

      const result = await response.json();
      
      // Find preview node and update it with the result
      const previewNode = get().nodes.find(n => n.type === 'previewNode');
      if (previewNode && result.imageUrl) {
        get().updateNodeData(previewNode.id, { image: result.imageUrl });
      }
      
      return true;
    } catch (error) {
      console.error('Error sending workflow to API:', error);
      toast.error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}));
