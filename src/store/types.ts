
import { Connection, Edge, EdgeChange, Node, NodeChange, OnConnect, OnEdgesChange, OnNodesChange } from '@xyflow/react';

export type JsonValue = string | number | boolean | { [key: string]: JsonValue } | JsonValue[];
export type Json = JsonValue | null;

export type NodeType = 
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
  | 'input-text'
  | 'input-image' 
  | 'output-preview';

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
  loraType: string;
}

export interface ControlNetSettings {
  image: string | null;
  imageId?: string;
  uploading?: boolean;
  strength: number;
  controlNetType: string;
}

export interface InputSettings {
  text?: string;
  image?: string | null;
  imageId?: string;
  uploading?: boolean;
  inputType: string;
}

// History interface for undo/redo functionality
export interface HistoryState {
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
  selectedEdge: Edge | null;
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
  setSelectedEdge: (edge: Edge | null) => void;
  setRunwayApiKey: (apiKey: string) => void;
  generateImageFromNodes: () => Promise<void>;
  uploadControlNetImage: (nodeId: string, imageData: string) => Promise<void>;
  uploadInputImage: (nodeId: string, imageData: string) => Promise<void>;
  copySelectedNode: () => void;
  cutSelectedNode: () => void;
  pasteNodes: (position: { x: number; y: number }) => void;
  deleteSelectedNode: () => void;
  deleteEdge: (edgeId: string) => void;
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
