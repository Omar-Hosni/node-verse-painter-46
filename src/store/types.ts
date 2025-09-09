import { Node, Edge } from '@xyflow/react';
import { PreprocessedImageData } from '../utils/controlNetUtils';

export type NodeType = 
  | 'normal-node'
  | 'preview-realtime-node'
  | 'preview-image'
  | 'text-tool'
  | 'rectangle-node'
  | 'circle-node'
  | 'star-node'
  | 'frame-node'
  | 'imageInput'
  | 'textInput'
  | 'controlNet'
  | 'rerendering'
  | 'tool'
  | 'engine'
  | 'gear'
  | 'output'
  // Specific ControlNet types
  | 'control-net-pose'
  | 'control-net-edge'
  | 'control-net-face'
  | 'control-net-segments'
  | 'control-net-depth'
  | 'control-net-normal-map'
  | 'control-net-reference'
  | 'seed-image-lights'
  // Specific Image-to-Image types
  | 'image-to-image-reimagine'
  | 'image-to-image-rescene'
  | 'image-to-image-object-relight'
  | 'image-to-image-reangle'
  | 'image-to-image-remix'
  | 'image-to-image-remove-bg'
  | 'image-to-image-upscale'
  | 'image-to-image-inpainting'
  | 'image-to-image-remove-outpainting'
  | 'image-to-image-3d-maker'
  | 'image-to-image-merger'
  // Input types
  | 'input-text'
  // Helper types
  | 'connector'
  // Engine types
  | 'engine-real'
  // Gear types
  | 'gear-anime'
  | 'gear-killua'
  // Drag and drop image types
  | 'image-node'
  | 'image-layer'

export type Collaborator = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  last_active: string;
  tool?: string;
  color?: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface JsonValue {
  [key: string]: Json;
}

export interface WorkflowJson {
  nodes: Node[];
  edges: Edge[];
  version: string;
  settings: {
    [key: string]: Json;
  };
}

export interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

export interface UserCredits {
  amount: number;
  last_updated: string;
}

export interface UserSubscription {
  tier: string;
  status: string;
  expires_at?: string;
}

export interface CollaborativeFabricObject {
  id: string;
  type: string;
  version: number;
  props: {
    [key: string]: any;
  };
}

// Workflow execution types
export interface NodeData {
  // Common properties
  id: string;
  type: string;
  
  // Image Input Node
  imageFile?: File;
  imageUrl?: string;
  imageType?: 'object' | 'scene' | 'fuse';
  
  // Text Input Node
  prompt?: string;
  
  // ControlNet Node
  preprocessor?: string;
  preprocessedImage?: PreprocessedImageData;
  isPreprocessing?: boolean;
  hasPreprocessedImage?: boolean;
  
  // Engine Node
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  strength?: number;
  loras?: Array<{model: string; weight: number}>;
  
  // Gear Node
  loraModel?: string;
  weight?: number;
  
  // Rerendering Node
  rerenderingType?: 'reimagine' | 'reference' | 'rescene' | 'reangle' | 'remix';
  referenceType?: string;
  degrees?: number;
  direction?: string;
  creativity?: number;
  
  // Tool Node
  toolType?: 'removebg' | 'upscale' | 'inpaint' | 'outpaint';
  upscaleFactor?: 2 | 3 | 4;
  maskImage?: string;
  inpaintPrompt?: string;
  outpaintDirection?: 'up' | 'down' | 'left' | 'right' | 'all';
  outpaintAmount?: number;
  
  // Output Node
  generatedImage?: string;
  
  // Right sidebar data
  right_sidebar?: {
    creativity?: number;
    referenceType?: string;
    degrees?: number;
    direction?: string;
    pin?: boolean;
  };
}

//for LeftSidebar and Editor, etc.
export interface NodeOption {
  type: NodeType;
  label: string;
  description: string;
  icon: any;
}

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  runwareApiKey: string | null;
  credits: number | null;
  subscription: UserSubscription | null;
  clipboard: Node | null;
  history: HistoryState[];
  historyIndex: number;
  isLocalUpdate: boolean;
  externalUpdateInProgress: boolean;
  collaborators: Collaborator[];
  
  // Helper functions for real-time collaboration
  setIsLocalUpdate: (isLocal: boolean) => void;
  setExternalUpdateInProgress: (inProgress: boolean) => void;
  updateCanvasFromExternalSource: (nodes: Node[], edges: Edge[]) => void;
  updateCollaborators: (collaborators: Collaborator[]) => void;

  // Node operations
  onNodesChange: (changes: any) => void;
  onEdgesChange: (changes: any) => void;
  onConnect: (connection: any) => void;
  addNode: (nodeType: NodeType, position: { x: number, y: number }, order: Number | any) => void;
  updateNodeData: (nodeId: string, newData: any) => void;
  setSelectedNode: (node: Node | null) => void;
  setSelectedNodeById: (node: Node | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;
  setRunwareApiKey: (apiKey: string) => void;
  uploadControlNetImage: (nodeId: string, imageData: File) => Promise<void>;
  uploadInputImage: (nodeId: string, imageData: File) => Promise<void>;
  
  // Clipboard operations
  copySelectedNode: () => void;
  cutSelectedNode: () => void;
  pasteNodes: (position: { x: number, y: number }) => void;
  deleteSelectedNode: () => void;
  deleteEdge: (edgeId: string) => void;
  
  // History operations
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  
  // Export operations
  exportWorkflowAsJson: () => WorkflowJson;
  
  // Database operations
  saveProject: (name: string, description?: string) => Promise<string | null>;
  loadProject: (projectId: string) => Promise<boolean>;
  fetchUserCredits: () => Promise<void>;
  fetchUserSubscription: () => Promise<void>;
  useCreditsForGeneration: () => Promise<boolean>;
  
  // API operations
  generateImageFromNodes: () => Promise<void>;
  sendWorkflowToAPI: () => Promise<any>;
  
  // Tool management
  activeTool: 'select' | 'rectangle' | 'circle' | 'star' | 'frame';
  setActiveTool: (tool: 'select' | 'rectangle' | 'circle' | 'star' | 'frame') => void;

  // New properties for drawing collaboration
  fabricObjects: CollaborativeFabricObject[];
  
  // New methods for drawing collaboration
  addFabricObject: (object: CollaborativeFabricObject) => void;
  updateFabricObject: (objectId: string, props: any) => void;
  deleteFabricObject: (objectId: string) => void;
  resetFabricObjects: () => void;
}
