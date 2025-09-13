import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  addEdge,
  applyEdgeChanges,
} from '@xyflow/react';
import { getHighestOrder } from './nodeActions';
import { useWorkflowStore } from './workflowStore';

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
  deleteEdgeHelper,
  renumberOrdersEnhanced
} from './nodeActions';
import { ensureParentChildOrder } from '@/utils/nodeOrderUtils';

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

// Utility function to fix draggable property for existing nodes
const fixNodesDraggableProperty = (nodes: Node[]): Node[] => {
  return nodes.map(node => ({
    ...node,
    draggable: !(node.data?.pin || node.data?.right_sidebar?.pin)
  }));
};

export const useCanvasStore = createWithEqualityFn<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  runwareApiKey: typeof window !== 'undefined'
  ? (localStorage.getItem('runwareApiKey') || '')
  : '',
  credits: null,
  subscription: null,
  clipboard: null,
  history: [],
  historyIndex: -1,
  isLocalUpdate: false,
  externalUpdateInProgress: false,
  collaborators: [],
  fabricObjects: [],
  activeTool: 'select' as 'select' | 'rectangle' | 'circle' | 'star' | 'frame',

  // Tool management
  setActiveTool: (tool: 'select' | 'rectangle' | 'circle' | 'star' | 'frame') => {
    set({ activeTool: tool });
  },

  // Real-time collaboration helpers
  setIsLocalUpdate: (isLocal: boolean) => {
    set({ isLocalUpdate: isLocal });
  },

  setExternalUpdateInProgress: (inProgress: boolean) => {
    set({ externalUpdateInProgress: inProgress });
  },

  // updateCanvasFromExternalSource: (newNodes: Node[], newEdges: Edge[]) => {
  //   set({ 
  //     nodes: newNodes,
  //     edges: newEdges,
  //     externalUpdateInProgress: false
  //   });
  // },

  updateCanvasFromExternalSource: (newNodes, newEdges) => {
    const currentNodes = get().nodes;
    const currentEdges = get().edges;

    const newNodeMap = new Map(newNodes.map(n => [n.id, n]));
    const mergedNodes = currentNodes.map(n => newNodeMap.get(n.id) || n);

    const newEdgeMap = new Map(newEdges.map(e => [e.id, e]));
    const mergedEdges = currentEdges.map(e => newEdgeMap.get(e.id) || e);

    // Add new nodes and edges that don’t exist locally
    for (const node of newNodes) {
      if (!currentNodes.some(n => n.id === node.id)) {
        mergedNodes.push(node);
      }
    }

    for (const edge of newEdges) {
      if (!currentEdges.some(e => e.id === edge.id)) {
        mergedEdges.push(edge);
      }
    }

    set({
      nodes: mergedNodes,
      edges: mergedEdges,
      externalUpdateInProgress: false,
    });
  },


  updateCollaborators: (collaborators: Collaborator[]) => {
    set({ collaborators });
  },

  // Node operations - ULTRA FAST for dragging
  onNodesChange: (changes) => {
    // Detect if this is an active drag operation
    const isDragging = changes.some(c => c.type === 'position' && c.dragging === true);

    if (isDragging) {
      // ULTRA FAST PATH: Only apply position changes, skip everything else
      const { updatedNodes } = handleNodesChange(
        changes,
        get().nodes,
        get().selectedNode
      );

      // Only update nodes, skip selectedNode updates during drag
      set({ nodes: updatedNodes });
      return;
    }

    // NORMAL PATH: Full processing for non-drag operations
    get().saveToHistory();

    const { updatedNodes, updatedSelectedNode } = handleNodesChange(
      changes,
      get().nodes,
      get().selectedNode
    );

    // Ensure parent nodes come before child nodes in the array (ReactFlow requirement)
    const reorderedNodes = ensureParentChildOrder(updatedNodes);

    set({
      nodes: reorderedNodes,
      selectedNode: updatedSelectedNode,
    });
    
    // Also update workflow store to keep states in sync (only for non-drag operations)
    const workflowStore = useWorkflowStore.getState();
    workflowStore.setNodes(reorderedNodes);
  },

  onEdgesChange: (changes: EdgeChange[]) => {

    // Save state before making changes to edges
    get().saveToHistory();

    const updatedEdges = applyEdgeChanges(changes, get().edges);
    
    set({
      edges: updatedEdges,
      // Clear selected edge if it was deleted
      selectedEdge: get().selectedEdge &&
        !changes.find(
          c => c.type === 'remove' && c.id === get().selectedEdge?.id
        )
        ? get().selectedEdge
        : null
    });
    
    // Also update workflow store to keep states in sync
    const workflowStore = useWorkflowStore.getState();
    workflowStore.setEdges(updatedEdges);
    
    get().saveToHistory();
  },

  // onConnect: (connection: Connection) => {
  //   // Save state before connecting
  //   get().saveToHistory();

  //   // Create a unique edge ID
  //   const id = `edge-${get().edges.length + 1}`;

  //   set({
  //     edges: addEdge(
  //       { 
  //         ...connection, 
  //         id, 
  //         animated: true,
  //         type: 'custom'
  //       }, 
  //       get().edges
  //     ),
  //   });
  // },

  // onConnect: (connection: Connection) => {
  //   get().saveToHistory();

  //   const cleanedEdges = get().edges.filter(
  //     (e) =>
  //       !(
  //         e.source === connection.source &&
  //         e.target === connection.target &&
  //         (e.sourceHandle === connection.sourceHandle || (!e.sourceHandle && !connection.sourceHandle)) &&
  //         (e.targetHandle === connection.targetHandle || (!e.targetHandle && !connection.targetHandle))
  //       )
  //   );

  //   const newEdge = {
  //     ...connection,
  //     id: `edge-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  //     animated: true,
  //     type: 'custom',
  //   };

  //   set({
  //     edges: addEdge(newEdge, cleanedEdges),
  //   });
  // },


  onConnect: (connection: Connection) => {
    // Save state before connecting
    get().saveToHistory();

    const prevEdges = get().edges;

    const newEdge = {
      ...connection,
      id: `edge-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Safer unique ID
      animated: true,
      type: 'custom',
      data: {}, // Always initialize with empty data object
    };

    const updatedEdges = addEdge(newEdge, prevEdges);

    set({
      edges: [...updatedEdges],
    });

    // Also update workflow store to trigger preprocessing
    const workflowStore = useWorkflowStore.getState();
    workflowStore.setEdges([...updatedEdges]);
  },

  addNode: (nodeType: NodeType, position, order) => {
    // Save state before adding node
    get().saveToHistory();
    console.log(nodeType)
    const newNode = createNode(nodeType, position, order);

    const updatedNodes = [...get().nodes, newNode];
    
    set({
      nodes: updatedNodes,
      selectedNode: newNode,
    });
    
    // Also update workflow store to keep states in sync
    const workflowStore = useWorkflowStore.getState();
    workflowStore.setNodes(updatedNodes);
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

    //attempt a renumberOrdersEnhanced here
    //const loadedNodes = renumberOrdersEnhanced(updatedNodes)

    set({
      nodes: updatedNodes,
      selectedNode: updatedSelectedNode,
    });
    
    // Also update workflow store to keep states in sync
    const workflowStore = useWorkflowStore.getState();
    workflowStore.setNodes(updatedNodes);
  },

  setSelectedNode: (node) => {
    set({ selectedNode: node });
  },

  setSelectedNodeById: (_node: Node) => {
    const id = _node.id
    set((state) => ({
      nodes: state.nodes.map((node) => ({
        ...node,
        selected: node.id === id,
      })),
      selectedNode: state.nodes.find((node) => node.id === id) || null,
    }));
  },


  setSelectedEdge: (edge) => {
    set({ selectedEdge: edge });
  },

  setRunwareApiKey: (apiKey) => {
    if (typeof window !== 'undefined') {
    localStorage.setItem('runwareApiKey', apiKey);
    }
    set({ runwareApiKey: apiKey });
  },


  uploadControlNetImage: async (nodeId: string, imageData: File) => {
    await uploadControlNetImage(
      nodeId,
      imageData,
      get().runwareApiKey,
      get().updateNodeData
    );
  },

  uploadInputImage: async (nodeId: string, imageData: File) => {
    await uploadInputImage(
      nodeId,
      imageData,
      get().runwareApiKey,
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
      const updatedNodes = get().nodes.filter(n => n.id !== selectedNode.id);
      const updatedEdges = get().edges.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id);
      
      set({
        nodes: updatedNodes,
        // Also remove any connected edges
        edges: updatedEdges,
        selectedNode: null,
      });
      
      // Also update workflow store to keep states in sync
      const workflowStore = useWorkflowStore.getState();
      workflowStore.setNodes(updatedNodes);
      workflowStore.setEdges(updatedEdges);
    }
  },

  pasteNodes: (position) => {
    const { clipboard, nodes } = get();
    if (clipboard) {
      // Save current state to history before pasting
      get().saveToHistory();

      // Create a new ID for the pasted node
      const id = `${clipboard.type}-${Date.now()}`;

      // Get the highest order to place pasted node on top
      const order = getHighestOrder(nodes) + 1;

      // Create a deep copy of the clipboard node with the new ID, position, and top layer order
      const newNode = {
        ...JSON.parse(JSON.stringify(clipboard)),
        id,
        position,
        zIndex: order,
        selected: true, // Mark as selected for React Flow
        data: {
          ...clipboard.data,
          order,
          zIndex: order,
        }
      };

      // Update all existing nodes to be unselected
      const updatedNodes = nodes.map(node => ({
        ...node,
        selected: false
      }));
      
      const finalNodes = [...updatedNodes, newNode];

      set({
        nodes: finalNodes,
        selectedNode: newNode,
      });
      
      // Also update workflow store to keep states in sync
      const workflowStore = useWorkflowStore.getState();
      workflowStore.setNodes(finalNodes);
    }
  },

  deleteSelectedNode: () => {
    const { selectedNode } = get();
    if (selectedNode) {
      // Save current state to history before deleting
      get().saveToHistory();

      const currentNodes = get().nodes;
      const currentEdges = get().edges;
      
      // Function to recursively find all descendants of a node
      const findAllDescendants = (parentId: string, nodes: Node[]): string[] => {
        const directChildren = nodes.filter(node => node.parentId === parentId).map(node => node.id);
        const allDescendants = [...directChildren];
        
        // Recursively find grandchildren, great-grandchildren, etc.
        directChildren.forEach(childId => {
          allDescendants.push(...findAllDescendants(childId, nodes));
        });
        
        return allDescendants;
      };

      // Get all nodes to delete (selected node + all its descendants)
      let nodesToDelete = [selectedNode.id];
      
      if (selectedNode.type === 'frame-node') {
        const descendants = findAllDescendants(selectedNode.id, currentNodes);
        nodesToDelete = [...nodesToDelete, ...descendants];
        console.log(`Deleting frame ${selectedNode.id} and its ${descendants.length} descendants:`, descendants);
      }

      // Remove all nodes to delete
      const updatedNodes = currentNodes.filter(node => !nodesToDelete.includes(node.id));
      
      // Remove all edges connected to any of the deleted nodes
      const updatedEdges = currentEdges.filter(edge => 
        !nodesToDelete.includes(edge.source) && !nodesToDelete.includes(edge.target)
      );

      set({
        nodes: updatedNodes,
        edges: updatedEdges,
        selectedNode: null,
      });
      
      // Also update workflow store to keep states in sync
      const workflowStore = useWorkflowStore.getState();
      workflowStore.setNodes(updatedNodes);
      workflowStore.setEdges(updatedEdges);
    }
  },



  deleteEdge: (edgeId) => {
    // Save current state to history before deleting
    get().saveToHistory();

    const updatedEdges = deleteEdgeHelper(edgeId, get().edges);
    
    set({
      edges: updatedEdges,
      selectedEdge: null,
    });
    
    // Also update workflow store to keep states in sync
    const workflowStore = useWorkflowStore.getState();
    workflowStore.setEdges(updatedEdges);
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
    
    // Get serializable state that includes preprocessed data
    const { nodes, edges } = get();
    
    // Ensure preprocessed data is preserved in the saved state
    const serializableNodes = nodes.map(node => {
      if ((node.type?.includes('control-net') || node.type === 'seed-image-lights') && 
          node.data?.preprocessedImage) {
        return {
          ...node,
          data: {
            ...node.data,
            // Ensure preprocessed data is preserved
            preprocessedImage: node.data.preprocessedImage,
            hasPreprocessedImage: !!node.data.preprocessedImage,
            preprocessor: node.data.preprocessor,
            // Preserve right_sidebar state
            right_sidebar: {
              ...node.data.right_sidebar,
              preprocessedImage: node.data.preprocessedImage?.guideImageURL,
              showPreprocessed: !!node.data.preprocessedImage,
            },
          },
        };
      }
      return node;
    });
    
    return await saveProjectToDb(name, description, serializableNodes, edges);
  },

  // Fixed loadProject function to match the correct signature
  loadProject: async (projectId) => {
    try {
      // We wrap the callback-based implementation in a promise to properly handle errors
      const success = await loadProjectFromDb(
        projectId,
        (nodes) => {
          if (nodes) {
            // Ensure all nodes have correct draggable property based on pin status
            const nodesWithDraggable = fixNodesDraggableProperty(nodes);
            set({ nodes: nodesWithDraggable });
            
            // Seed the workflow store cache with preprocessed images from loaded nodes
            setTimeout(() => {
              const workflowStore = useWorkflowStore.getState();
              workflowStore.setNodes(nodesWithDraggable);
              workflowStore.hydrateProcessedImagesFromNodes();
            }, 100); // Small delay to ensure workflow store is ready
          }
        },
        (edges) => {
          if (edges) {
            set({ edges });
            // Also update workflow store edges
            setTimeout(() => {
              const workflowStore = useWorkflowStore.getState();
              workflowStore.setEdges(edges);
            }, 100);
          }
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
      return success;
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
    const currentCredits = get().credits;
    const success = await useCredits(currentCredits);

    // If successful, update local credits state
    if (success && currentCredits !== null) {
      set({ credits: currentCredits - 5 });
    }

    return success;
  },

  // API operations
  generateImageFromNodes: async () => {
    await generateImage(
      get().nodes,
      get().edges,
      get().runwareApiKey,
      get().updateNodeData,
      get().useCreditsForGeneration
    );
  },

  sendWorkflowToAPI: async (): Promise<any> => {
    const { nodes, edges, updateNodeData } = get();
    const workflowJson: WorkflowJson = {
      nodes,
      edges,
      version: '1.0.0',
      settings: {
        autoLayout: false,
        snapToGrid: true,
        gridSize: 15,
        theme: 'dark'
      }
    };
    return await sendWorkflowToAPI(workflowJson, updateNodeData, nodes);
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
  },

  // Fix draggable property for all existing nodes based on pin status
  fixNodesDraggableProperty: () => {
    const currentNodes = get().nodes;
    const fixedNodes = fixNodesDraggableProperty(currentNodes);
    set({ nodes: fixedNodes });
  }
}),
  shallow
);
