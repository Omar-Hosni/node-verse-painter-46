import { Node, Edge } from '@xyflow/react';

export type NodeType = 
  | 'comment-node'
  | 'normal-node'
  | 'layer-image-node'
  | 'preview-realtime-node'
  | 'control-net-pose'
  | 'control-net-edge'
  | 'control-net-lights'
  | 'control-net-face'
  | 'control-net-segments'
  | 'control-net-depth'
  | 'control-net-normal-map'
  | 'control-net-reference'
  | 'image-to-image-reimagine'
  | 'image-to-image-rescene'
  | 'image-to-image-objectrelight'
  | 'image-to-image-reangle'
  | 'image-to-image-remix'
  | 'image-to-image-remove-bg'
  | 'image-to-image-upscale'
  | 'image-to-image-inpainting'
  | 'image-to-image-remove-outpainting'
  | 'image-to-image-3d-maker'
  | 'image-to-image-merger'
  | 'input-text'
  | 'connector'
  | 'engine-real'
  | 'gear-anime'
  | 'gear-killua'

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

//for LeftSidebar and Editor, etc.
export interface NodeOption {
  type: NodeType;
  label: string;
  description: string;
  icon: any;
  status?: string;
  image_url?: string;
  node_desc_image_url?: string;
  design?: string;
  functionality?: string;
  model?: string;
  lora?: string;
  data?: any;
}

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  runwayApiKey: string | null;
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
  setRunwayApiKey: (apiKey: string) => void;
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
  
  // New properties for drawing collaboration
  fabricObjects: CollaborativeFabricObject[];
  
  // New methods for drawing collaboration
  addFabricObject: (object: CollaborativeFabricObject) => void;
  updateFabricObject: (objectId: string, props: any) => void;
  deleteFabricObject: (objectId: string) => void;
  resetFabricObjects: () => void;
}
