
import { Node, Edge } from '@xyflow/react';

export type NodeType = 
  | 'input-text' 
  | 'input-image' 
  | 'model-sdxl' 
  | 'model-flux' 
  | 'model-hidream'
  | 'lora-realistic'
  | 'lora-cartoon'
  | 'lora-character'
  | 'controlnet-canny'
  | 'controlnet-depth'
  | 'controlnet-pose'
  | 'controlnet-segment'
  | 'output-preview';

export type Collaborator = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  last_active: string;
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

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  runwayApiKey: string | null;
  credits: number | null;
  subscription: string | null;
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
  addNode: (nodeType: NodeType, position: { x: number, y: number }) => void;
  updateNodeData: (nodeId: string, newData: any) => void;
  setSelectedNode: (node: Node | null) => void;
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
}
