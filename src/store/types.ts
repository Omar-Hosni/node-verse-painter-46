
// This file contains type definitions for the canvas store
import { Node, Edge } from '@xyflow/react';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type Json = {
  [key: string]: JsonValue;
};

export type UserCredits = {
  user_id: string;
  credits: number;
  updated_at: string;
};

export type UserSubscription = {
  id: string;
  user_id: string;
  tier: string;
  is_annual: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HistoryState = {
  nodes: Node[];
  edges: Edge[];
};

export type WorkflowJson = {
  nodes: Node[];
  edges: Edge[];
  version: string;
  settings: {
    [key: string]: JsonValue;
  };
};

export type CanvasState = {
  // Core state
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
  
  // Real-time collaboration state
  isLocalUpdate: boolean;
  externalUpdateInProgress: boolean;
  
  // Real-time collaboration actions
  setIsLocalUpdate: (isLocal: boolean) => void;
  setExternalUpdateInProgress: (inProgress: boolean) => void;
  updateCanvasFromExternalSource: (newNodes: Node[], newEdges: Edge[]) => void;
  
  // Node actions
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  addNode: (type: string, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, newData: any) => void;
  setSelectedNode: (node: Node | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;
  
  // API actions
  setRunwayApiKey: (apiKey: string) => void;
  uploadControlNetImage: (nodeId: string, imageData: File) => Promise<void>;
  uploadInputImage: (nodeId: string, imageData: File) => Promise<void>;
  
  // Clipboard actions
  copySelectedNode: () => void;
  cutSelectedNode: () => void;
  pasteNodes: (position: { x: number; y: number }) => void;
  deleteSelectedNode: () => void;
  deleteEdge: (edgeId: string) => void;
  
  // History actions
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  
  // Workflow actions
  exportWorkflowAsJson: () => WorkflowJson;
  
  // Database actions
  saveProject: (name: string, description?: string) => Promise<string | null>;
  loadProject: (projectId: string) => Promise<boolean>;
  fetchUserCredits: () => Promise<void>;
  fetchUserSubscription: () => Promise<void>;
  useCreditsForGeneration: () => Promise<boolean>;
  
  // Generation actions
  generateImageFromNodes: () => Promise<void>;
  sendWorkflowToAPI: () => Promise<any>;
};
