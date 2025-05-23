import { create } from 'zustand';
import { 
  Connection, 
  Edge, 
  EdgeChange, 
  Node, 
  addEdge, 
  applyEdgeChanges, 
} from '@xyflow/react';

import { 
  CanvasState,
  HistoryState,
  WorkflowJson,
  JsonValue,
  Json,
  NodeType,
  Collaborator
} from './types';

import { 
  createNode, 
  handleNodesChange, 
  updateNodeDataHelper,
  resetNodeIdCounter,
  deleteEdgeHelper
} from './nodeActions';

import { 
  uploadControlNetImage,
  uploadInputImage,
  generateImage,
  sendWorkflowToAPI
} from './apiUtils';

import {
  saveProject as saveProjectToDb,
  loadProject as loadProjectFromDb,
  fetchUserCredits as fetchCredits,
  fetchUserSubscription as fetchSubscription,
  useCreditsForGeneration as useCredits
} from './dbUtils';

import { exportWorkflowAsJson as exportJson } from './workflowUtils';

export * from './types';

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  runwayApiKey: null,
  credits: null,
  subscription: null,
  clipboard: null,
  history: [],
  historyIndex: -1,
  isLocalUpdate: false,
  externalUpdateInProgress: false,
  collaborators: [],
  fabricObjects: [],
  
  // Real-time collaboration helpers
  setIsLocalUpdate: (isLocal: boolean) => {
    set({ isLocalUpdate: isLocal });
  },
  
  setExternalUpdateInProgress: (inProgress: boolean) => {
    set({ externalUpdateInProgress: inProgress });
  },
  
  updateCanvasFromExternalSource: (newNodes: Node[], newEdges: Edge[]) => {
    set({ 
      nodes: newNodes,
      edges: newEdges,
      externalUpdateInProgress: false
    });
  },
  
  updateCollaborators: (collaborators: Collaborator[]) => {
    set({ collaborators });
  },
  
  // Node operations
  onNodesChange: (changes) => {
    // Save state before making changes
    get().saveToHistory();
    
    const { updatedNodes, updatedSelectedNode } = handleNodesChange(
      changes, 
      get().nodes, 
      get().selectedNode
    );
    
    set({
      nodes: updatedNodes,
      selectedNode: updatedSelectedNode,
    });
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    // Save state before making changes to edges
    get().saveToHistory();
    
    set({
      edges: applyEdgeChanges(changes, get().edges),
      // Clear selected edge if it was deleted
      selectedEdge: get().selectedEdge && 
        !changes.find(
          c => c.type === 'remove' && c.id === get().selectedEdge?.id
        )
          ? get().selectedEdge
          : null
    });
  },

  onConnect: (connection: Connection) => {
    // Save state before connecting
    get().saveToHistory();
    
    // Create a unique edge ID
    const id = `edge-${get().edges.length + 1}`;
    
    set({
      edges: addEdge(
        { 
          ...connection, 
          id, 
          animated: true,
          type: 'custom'
        }, 
        get().edges
      ),
    });
  },
  
  addNode: (nodeType: NodeType, position) => {
    // Save state before adding node
    get().saveToHistory();
    
    const newNode = createNode(nodeType, position);

    set({ 
      nodes: [...get().nodes, newNode],
      selectedNode: newNode,
    });
  },

  updateNodeData: (nodeId, newData) => {
    // Save state before updating node data
    get().saveToHistory();
    
    const { updatedNodes, updatedSelectedNode } = updateNodeDataHelper(
      nodeId, 
      newData, 
      get().nodes, 
      get().selectedNode
    );
    
    set({
      nodes: updatedNodes,
      selectedNode: updatedSelectedNode,
    });
  },

  setSelectedNode: (node) => {
    set({ selectedNode: node });
  },

  setSelectedEdge: (edge) => {
    set({ selectedEdge: edge });
  },

  setRunwayApiKey: (apiKey) => {
    set({ runwayApiKey: apiKey });
  },

  uploadControlNetImage: async (nodeId: string, imageData: File) => {
    await uploadControlNetImage(
      nodeId, 
      imageData, 
      get().runwayApiKey,
      get().updateNodeData
    );
  },

  uploadInputImage: async (nodeId: string, imageData: File) => {
    await uploadInputImage(
      nodeId, 
      imageData, 
      get().runwayApiKey,
      get().updateNodeData
    );
  },

  // Clipboard operations
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
      const id = `${clipboard.type}-${Date.now()}`;
      
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
  
  deleteEdge: (edgeId) => {
    // Save current state to history before deleting
    get().saveToHistory();
    
    set({
      edges: deleteEdgeHelper(edgeId, get().edges),
      selectedEdge: null,
    });
  },
  
  // History operations
  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    
    // Create a deep copy of current state
    const currentState: HistoryState = {
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
        selectedEdge: null,
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
        selectedEdge: null,
      });
    }
  },
  
  // Workflow operations
  exportWorkflowAsJson: () => {
    return exportJson(get().nodes, get().edges);
  },

  // Database operations
  saveProject: async (name, description) => {
    // Set flag to ignore own updates
    get().setIsLocalUpdate(true);
    return await saveProjectToDb(name, description, get().nodes, get().edges);
  },
  
  // Fixed loadProject function to match the correct signature
  loadProject: async (projectId) => {
    try {
      // We wrap the callback-based implementation in a promise to properly handle errors
      return await loadProjectFromDb(
        projectId,
        (nodes) => {
          if (nodes) set({ nodes });
        }, 
        (edges) => {
          if (edges) set({ edges });
        }, 
        (node) => set({ selectedNode: node }),
        (history) => {
          if (history) {
            set({
              history: [history],
              historyIndex: 0,
            });
          }
        },
        () => {
          const { nodes } = get();
          if (nodes && nodes.length > 0) {
            resetNodeIdCounter(nodes);
          }
        }
      );
    } catch (error) {
      console.error("Error loading project:", error);
      return false;
    }
  },
  
  fetchUserCredits: async () => {
    const credits = await fetchCredits();
    set({ credits });
  },

  fetchUserSubscription: async () => {
    const subscription = await fetchSubscription();
    set({ subscription });
  },

  useCreditsForGeneration: async () => {
    const success = await useCredits(get().credits);
    
    // If successful, update local credits state
    if (success && get().credits !== null) {
      set({ credits: get().credits! - 1 });
    }
    
    return success;
  },

  // API operations
  generateImageFromNodes: async () => {
    await generateImage(
      get().nodes,
      get().edges,
      get().runwayApiKey,
      get().updateNodeData,
      get().useCreditsForGeneration
    );
  },

  sendWorkflowToAPI: async () => {
    // Create a proper WorkflowJson object
    const workflow: WorkflowJson = {
      ...get().exportWorkflowAsJson(),
    };
    
    return await sendWorkflowToAPI(
      workflow,
      get().updateNodeData,
      get().nodes
    );
  },
  
  // New methods for drawing collaboration
  addFabricObject: (object) => {
    set(state => ({
      fabricObjects: [...state.fabricObjects, object]
    }));
  },
  
  updateFabricObject: (objectId, props) => {
    set(state => ({
      fabricObjects: state.fabricObjects.map(obj => 
        obj.id === objectId 
          ? { ...obj, props: { ...obj.props, ...props }, version: obj.version + 1 }
          : obj
      )
    }));
  },
  
  deleteFabricObject: (objectId) => {
    set(state => ({
      fabricObjects: state.fabricObjects.filter(obj => obj.id !== objectId)
    }));
  },
  
  resetFabricObjects: () => {
    set({ fabricObjects: [] });
  }
}));
