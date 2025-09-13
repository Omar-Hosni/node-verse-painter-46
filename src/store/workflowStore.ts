// @ts-nocheck
import { create } from "zustand";
import { Node, Edge } from "@xyflow/react";
import { RunwareService } from "../services/runwareService";
import { WorkflowExecutor } from "../services/workflowExecutor";
import { ConnectionHandler } from "../services/connectionHandler";
import { PreprocessingTrigger } from "../services/preprocessingTrigger";
import { ImageCaptionTrigger } from "../services/imageCaptionTrigger";
import { toast } from "sonner";
import { dataUrlToFile } from "../utils/imageUtils";
import { useCanvasStore } from "./useCanvasStore";

export interface WorkflowState {
  // Core state
  nodes: Node[];
  edges: Edge[];
  processedImages: Map<string, string>;

  // Execution state
  isGenerating: boolean;
  processingNodes: Set<string>;
  selectedNodeId: string | null;

  // Services
  runwareService: RunwareService | null;
  workflowExecutor: WorkflowExecutor | null;
  connectionHandler: ConnectionHandler | null;
  preprocessingTrigger: PreprocessingTrigger | null;
  imageCaptionTrigger: ImageCaptionTrigger | null;

  // Actions
  initializeServices: (apiKey: string) => void;
  executeWorkflow: (targetNodeId: string) => Promise<void>;
  updateNodeData: (nodeId: string, data: any) => void;
  setProcessedImage: (nodeId: string, imageUrl: string) => void;
  getProcessedImage: (nodeId: string) => string | null;
  getAllProcessedImages: () => Map<string, string>;
  hasProcessedImage: (nodeId: string) => boolean;
  clearProcessedImages: () => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setIsGenerating: (generating: boolean) => void;
  setNodeProcessing: (nodeId: string, processing: boolean) => void;
  isNodeProcessing: (nodeId: string) => boolean;

  // ControlNet preprocessing
  hasImageInputConnections: (nodeId: string) => boolean;
  preprocessControlNetImage: (nodeId: string) => Promise<void>;
  clearPreprocessedData: (nodeId: string) => void;

  // Image caption trigger
  updateImageCaptionCallbacks: (updateNodeData: (nodeId: string, data: any) => void) => void;

  // Preprocessing state management
  getPreprocessingState: (nodeId: string) => {
    nodeId: string;
    status: "idle" | "processing" | "completed" | "error";
    result?: any;
    error?: string;
  };
  isNodePreprocessing: (nodeId: string) => boolean;
  hasPreprocessingError: (nodeId: string) => boolean;
  hasPreprocessingResult: (nodeId: string) => boolean;
  clearPreprocessingState: (nodeId: string) => void;
  getAllProcessingNodes: () => string[];
  getPreprocessingStats: () => {
    total: number;
    processing: number;
    completed: number;
    errors: number;
    idle: number;
  };

  // Performance optimization methods
  clearCaches: () => void;
  clearAllState: () => void;
  getCacheStats: () => {
    imageCache: { size: number; maxSize: number };
    resultCache: { size: number; maxSize: number };
    connectionPool: { size: number };
  };

  // Call this right after you load your saved state
  hydrateProcessedImagesFromNodes: () => void;
}

// Helper function for preprocessing idempotency
const makePreprocessSignature = (preprocessor: string, imageUrl: string) =>
  `${preprocessor}|${imageUrl}`;

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  processedImages: new Map(),
  isGenerating: false,
  processingNodes: new Set(),
  selectedNodeId: null,
  runwareService: null,
  workflowExecutor: null,
  connectionHandler: null,
  preprocessingTrigger: null,
  imageCaptionTrigger: null,

  // Initialize services with API key
  initializeServices: (apiKey: string) => {
    const runwareService = new RunwareService(apiKey);
    const workflowExecutor = new WorkflowExecutor(runwareService);
    
    // Register global fallback callbacks for RunwareService
    RunwareService.setGlobalFallbacks(
      // Node update callback
      (nodeId: string, data: any) => {
        console.log("🔄 Global fallback updating node:", nodeId, data);
        get().updateNodeData(nodeId, data);
      },
      // Node lookup callback
      () => {
        const state = get();
        return state.nodes;
      }
    );

    // Initialize preprocessing trigger with enhanced callbacks
    const preprocessingTrigger = new PreprocessingTrigger(runwareService, {
      onPreprocessingStarted: (nodeId: string) => {
        get().setNodeProcessing(nodeId, true);
        console.log(`WorkflowStore: Preprocessing started for node ${nodeId}`);
      },
      onPreprocessingCompleted: (nodeId: string, result) => {
        get().setNodeProcessing(nodeId, false);
        console.log(
          `WorkflowStore: Preprocessing completed for node ${nodeId}`
        );
      },
      onPreprocessingFailed: (nodeId: string, error: string) => {
        get().setNodeProcessing(nodeId, false);
        console.error(
          `WorkflowStore: Preprocessing failed for node ${nodeId}:`,
          error
        );
      },
      updateNodeData: (nodeId: string, data: any) => {
        get().updateNodeData(nodeId, data);
      },
    });

    // Initialize image caption trigger
    const imageCaptionTrigger = new ImageCaptionTrigger(runwareService, {
      onCaptioningStarted: (nodeId: string) => {
        console.log(`Image captioning started for node ${nodeId}`);
      },
      onCaptioningCompleted: (nodeId: string, result) => {
        console.log(`Image captioning completed for node ${nodeId}:`, result);
      },
      onCaptioningFailed: (nodeId: string, error: string) => {
        console.error(`Image captioning failed for node ${nodeId}:`, error);
      }
    });

    // Initialize connection handler with callbacks and preprocessing trigger
    const connectionHandler = new ConnectionHandler(
      {
        onPreprocessingTriggered: async (nodeId: string) => {
          await get().preprocessControlNetImage(nodeId);
        },
        onPreprocessedDataCleared: (nodeId: string) => {
          get().clearPreprocessedData(nodeId);
        },
        onImageCaptioningTriggered: async (nodeId: string) => {
          console.log(`Image captioning triggered for node ${nodeId}`);
        },
      },
      preprocessingTrigger,
      imageCaptionTrigger
    );

    // Set callback for updating store with processed results
    workflowExecutor.setUpdateStoreCallback(
      (nodeId: string, imageUrl: string) => {
        get().setProcessedImage(nodeId, imageUrl);
      }
    );

    // Set callback for updating node processing states
    workflowExecutor.setNodeProcessingCallback(
      (nodeId: string, processing: boolean) => {
        get().setNodeProcessing(nodeId, processing);
      }
    );

    set({
      runwareService,
      workflowExecutor,
      connectionHandler,
      preprocessingTrigger,
      imageCaptionTrigger,
    });
  },

  // Execute workflow for target node
  executeWorkflow: async (targetNodeId: string) => {
    const { nodes, edges, workflowExecutor, runwareService } = get();

    if (!workflowExecutor || !runwareService) {
      toast.error("Services not initialized. Please set your API key first.");
      return;
    }

    if (!targetNodeId) {
      toast.error("No target node specified for execution.");
      return;
    }

    try {
      set({ isGenerating: true });

      console.log("Starting workflow execution for node:", targetNodeId);

      // Execute the workflow
      const result = await workflowExecutor.executeWorkflow(
        nodes,
        edges,
        targetNodeId
      );

      if (result) {
        // Update the target node with the result
        get().updateNodeData(targetNodeId, { generatedImage: result });

        // Update processed images map
        get().setProcessedImage(targetNodeId, result);

        toast.success("Workflow executed successfully!");
        console.log("Workflow execution completed with result:", result);
      } else {
        toast.warning("Workflow completed but no result was generated.");
      }
    } catch (error) {
      console.error("Workflow execution failed:", error);
      toast.error(
        `Workflow execution failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      set({ isGenerating: false });
    }
  },

  // Update node data
  updateNodeData: (nodeId: string, data: any) => {
    // Delegate to Canvas store's updater so BOTH stores stay in sync
    useCanvasStore.getState().updateNodeData(nodeId, data);
  },

  // Set processed image for a node
  setProcessedImage: (nodeId: string, imageUrl: string) => {
    // 1) Keep the executor cache
    set((state) => {
      const newProcessedImages = new Map(state.processedImages);
      newProcessedImages.set(nodeId, imageUrl);
      return { processedImages: newProcessedImages };
    });

    // 2) Persist onto the node's data in BOTH stores via Canvas store helper
    const node = get().nodes.find(n => n.id === nodeId);
    const patch: any = { generatedImage: imageUrl };

    // make preview/output variants show immediately
    if (node && (node.type === "output" || node.type === "previewNode" || node.type === "preview-realtime-node")) {
      patch.imageUrl = imageUrl;
    }
    // keep right_sidebar in sync for image-nodes (if you use it)
    if (node && node.type === "image-node") {
      const rightSidebar = node.data?.right_sidebar || {};
      patch.right_sidebar = {
        ...(typeof rightSidebar === 'object' ? rightSidebar : {}),
        imageUrl,
      };
    }

    // this updates Canvas store nodes and also mirrors back into workflow store
    useCanvasStore.getState().updateNodeData(nodeId, patch);

    // NEW: if a node produced an image, mirror it to any immediately connected preview/output nodes
    try {
      const edges = get().edges;
      const outgoing = edges.filter(e => e.source === nodeId);
      for (const e of outgoing) {
        const tgt = get().nodes.find(n => n.id === e.target);
        if (!tgt) continue;

        const isPreview =
          tgt.type === 'previewNode' ||
          tgt.type === 'output' ||
          (tgt.type && tgt.type.includes('preview')) ||
          (tgt.data?.type && String(tgt.data.type).includes('preview'));

        if (isPreview) {
          // update cache
          set(state => {
            const m = new Map(state.processedImages);
            m.set(tgt.id, imageUrl);
            return { processedImages: m };
          });

          // persist on the preview itself so it can be a source in later runs
          useCanvasStore.getState().updateNodeData(tgt.id, {
            generatedImage: imageUrl,
            imageUrl: imageUrl,  // keep both for all readers
          });
        }
      }
    } catch (err) {
      console.warn('Mirror to downstream preview failed', err);
    }
  },


  // Get processed image for a node
  getProcessedImage: (nodeId: string) => {
    const { processedImages } = get();
    return processedImages.get(nodeId) || null;
  },

  // Get all processed images
  getAllProcessedImages: () => {
    const { processedImages } = get();
    return new Map(processedImages);
  },

  // Check if a node has a processed image
  hasProcessedImage: (nodeId: string) => {
    const { processedImages } = get();
    return processedImages.has(nodeId);
  },

  // Clear all processed images
  clearProcessedImages: () => {
    const { workflowExecutor } = get();
    if (workflowExecutor) {
      workflowExecutor.clearProcessedImages();
    }
    set({ processedImages: new Map() });
  },

  // Set nodes
  setNodes: (nodes: Node[]) => {
    set({ nodes });
  },

  // Set edges with automatic ControlNet preprocessing trigger
  setEdges: (edges: Edge[]) => {
    const state = get();
    const previousEdges = state.edges;
    const { connectionHandler, nodes } = state;

    set({ edges });

    if (connectionHandler) {
      setTimeout(async () => {
        try {
          const nodesNow = get().nodes;
          const hasPersisted = (nodeId: string) => {
            const n = nodesNow.find(n => n.id === nodeId);
            const d: any = n?.data || {};
            const url = d?.preprocessedImage?.guideImageURL || d?.preprocessedImage?.imageURL || d?.right_sidebar?.preprocessedImage;
            return !!url;
          };

          const filterPreprocessed = (arr: Edge[]) =>
            arr.filter(e => !hasPersisted(e.target));

          await connectionHandler.detectConnectionChanges(
            filterPreprocessed(previousEdges),
            filterPreprocessed(edges),
            nodesNow
          );
        } catch (err) {
          console.error("Error handling connection changes:", err);
        }
      }, 100);
    }
  },

  // Set selected node ID
  setSelectedNodeId: (nodeId: string | null) => {
    set({ selectedNodeId: nodeId });
  },

  // Set generating state
  setIsGenerating: (generating: boolean) => {
    set({ isGenerating: generating });
  },

  // Set node processing state
  setNodeProcessing: (nodeId: string, processing: boolean) => {
    set((state) => {
      const newProcessingNodes = new Set(state.processingNodes);
      if (processing) {
        newProcessingNodes.add(nodeId);
      } else {
        newProcessingNodes.delete(nodeId);
      }
      return { processingNodes: newProcessingNodes };
    });
  },

  // Check if node is processing
  isNodeProcessing: (nodeId: string) => {
    const { processingNodes } = get();
    return processingNodes.has(nodeId);
  },

  // Performance optimization methods
  clearCaches: () => {
    const { workflowExecutor } = get();
    if (workflowExecutor) {
      workflowExecutor.clearCaches();
    }
  },

  // Clear all state and caches
  clearAllState: () => {
    const { workflowExecutor } = get();
    if (workflowExecutor) {
      workflowExecutor.clearAllState();
    }
    set({
      processedImages: new Map(),
      processingNodes: new Set(),
      isGenerating: false,
      selectedNodeId: null,
    });
  },

  // Get cache statistics for monitoring
  getCacheStats: () => {
    const { workflowExecutor } = get();
    if (workflowExecutor) {
      return workflowExecutor.getCacheStats();
    }
    return {
      imageCache: { size: 0, maxSize: 100 },
      resultCache: { size: 0, maxSize: 200 },
      connectionPool: { size: 0 },
    };
  },

  // Update image caption trigger callbacks with Canvas store's updateNodeData
  updateImageCaptionCallbacks: (updateNodeData: (nodeId: string, data: any) => void) => {
    const { imageCaptionTrigger } = get();
    if (imageCaptionTrigger) {
      imageCaptionTrigger.updateCallbacks({
        updateNodeData
      });
    }
  },

  // Check if a ControlNet node has image input connections
  hasImageInputConnections: (nodeId: string) => {
    const { nodes, edges, connectionHandler } = get();

    if (!connectionHandler) {
      // Fallback to original logic if connection handler not available
      const targetNode = nodes.find((node) => node.id === nodeId);
      const targetNodeData = targetNode.data as any; // Type assertion
      if (!targetNode || !targetNodeData?.type?.includes("control-net")) {
        return false;
      }

      const incomingEdges = edges.filter((edge) => edge.target === nodeId);
      return incomingEdges.some((edge) => {
        const sourceNode = nodes.find((node) => node.id === edge.source);
        return (
          sourceNode &&
          (sourceNode.type === "image-node" ||
            sourceNode.type?.includes("image") ||
            sourceNode.type?.includes("preview") ||
            sourceNode.type === "previewNode" ||
            sourceNode.type === "output" ||
            sourceNode.data?.image ||
            sourceNode.data?.imageUrl ||
            sourceNode.data?.generatedImage)
        );
      });
    }

    // Use connection handler's private method logic
    const targetNode = nodes.find((node) => node.id === nodeId);
    const targetNodeData = targetNode?.data as any; // Type assertion
    if (
      !targetNode ||
      (!targetNodeData?.type?.includes("control-net") &&
        targetNodeData?.type !== "seed-image-lights")
    ) {
      return false;
    }

    const incomingEdges = edges.filter((edge) => edge.target === nodeId);
    return incomingEdges.some((edge) => {
      const sourceNode = nodes.find((node) => node.id === edge.source);
      return (
        sourceNode &&
        (sourceNode.type === "image-node" ||
          sourceNode.type?.includes("image") ||
          sourceNode.type === "previewNode" ||
          sourceNode.type === "output" ||
          !!sourceNode.data?.image ||
          !!sourceNode.data?.imageUrl ||
          !!sourceNode.data?.generatedImage)
      );
    });
  },

  // Preprocess image for ControlNet node
  preprocessControlNetImage: async (nodeId: string) => {
    const { nodes, edges, runwareService } = get();

    if (!runwareService) {
      toast.error("Runware service not initialized");
      return;
    }

    // Find the target ControlNet node
    const targetNode = nodes.find((node) => node.id === nodeId);
    const targetNodeData = targetNode?.data as any; // Type assertion
    if (!targetNode || !targetNodeData?.type?.includes("control-net")) {
      console.warn("Target node is not a ControlNet node");
      console.log(targetNode);
      return;
    }

    // Find incoming edges from image nodes
    const incomingEdges = edges.filter((edge) => edge.target === nodeId);
    const imageEdges = incomingEdges.filter((edge) => {
      const sourceNode = nodes.find((node) => node.id === edge.source);
      return (
        sourceNode &&
        (sourceNode.type === "image-node" ||
          sourceNode.type?.includes("image") ||
          sourceNode.type === "previewNode" ||
          sourceNode.type === "output" ||
          sourceNode.data?.image ||
          sourceNode.data?.imageUrl ||
          sourceNode.data?.generatedImage)
      );
    });

    if (imageEdges.length === 0) {
      console.warn("No image connections found for ControlNet node");
      return;
    }

    try {
      // Set processing state
      get().setNodeProcessing(nodeId, true);

      // Update node to show preprocessing state
      get().updateNodeData(nodeId, {
        isPreprocessing: true,
        hasPreprocessedImage: false,
      });

      toast.loading("Preprocessing image for ControlNet...", {
        id: `preprocess-${nodeId}`,
      });

      // Get the first connected image node
      const imageEdge = imageEdges[0];
      const imageNode = nodes.find((node) => node.id === imageEdge.source);

      if (!imageNode) {
        throw new Error("Image node not found");
      }

      // Get image data from the source node - comprehensive extraction with all possible locations
      const imageNodeData = imageNode.data as any; // Type assertion for flexibility
      
      // First check for processed images from workflow execution (for preview nodes)
      let imageUrl = get().getProcessedImage(imageNode.id) ||
                     imageNodeData?.generatedImage ||
                     imageNodeData?.imageUrl ||
                     imageNodeData?.image || 
                     imageNodeData?.right_sidebar?.imageUrl || 
                     imageNodeData?.right_sidebar?.image || 
                     imageNodeData?.src ||
                     imageNodeData?.url ||
                     imageNodeData?.imageURL ||
                     imageNodeData?.right_sidebar?.imageURL;
      let imageFile: File | null = null;

      // Check if we have a File object directly - check ALL possible locations
      if (
        imageNodeData?.imageFile &&
        imageNodeData.imageFile instanceof File
      ) {
        imageFile = imageNodeData.imageFile;
      } else if (
        imageNodeData?.file &&
        imageNodeData.file instanceof File
      ) {
        imageFile = imageNodeData.file;
      } else if (
        imageNodeData?.right_sidebar?.imageFile &&
        imageNodeData.right_sidebar.imageFile instanceof File
      ) {
        imageFile = imageNodeData.right_sidebar.imageFile;
      } else if (
        imageNodeData?.right_sidebar?.file &&
        imageNodeData.right_sidebar.file instanceof File
      ) {
        imageFile = imageNodeData.right_sidebar.file;
      }

      // Convert data URL to File if we have one but no File object
      if (!imageFile && imageUrl && typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
        const filename = `controlnet-input-${Date.now()}.png`;
        imageFile = dataUrlToFile(imageUrl, filename);
      }

      // Debug logging to understand what data we have
      console.log('ControlNet preprocessing - Image node data:', {
        nodeId: imageNode.id,
        nodeType: imageNode.type,
        hasImageUrl: !!imageUrl,
        hasImageFile: !!imageFile,
        imageUrl: imageUrl ? (imageUrl.length > 100 ? imageUrl.substring(0, 100) + '...' : imageUrl) : null,
        dataKeys: Object.keys(imageNodeData || {}),
        rightSidebarKeys: imageNodeData?.right_sidebar ? Object.keys(imageNodeData.right_sidebar) : null,
        imageUrlSources: {
          'data.imageUrl': !!imageNodeData?.imageUrl,
          'data.image': !!imageNodeData?.image,
          'data.right_sidebar.imageUrl': !!imageNodeData?.right_sidebar?.imageUrl,
          'data.right_sidebar.image': !!imageNodeData?.right_sidebar?.image,
          'data.src': !!imageNodeData?.src,
          'data.url': !!imageNodeData?.url,
          'data.imageURL': !!imageNodeData?.imageURL,
          'data.right_sidebar.imageURL': !!imageNodeData?.right_sidebar?.imageURL
        },
        fileObjectSources: {
          'data.imageFile': !!(imageNodeData?.imageFile instanceof File),
          'data.file': !!(imageNodeData?.file instanceof File),
          'data.right_sidebar.imageFile': !!(imageNodeData?.right_sidebar?.imageFile instanceof File),
          'data.right_sidebar.file': !!(imageNodeData?.right_sidebar?.file instanceof File)
        }
      });

      // Determine preprocessor based on ControlNet data.type
      let preprocessor = "openpose"; // default
      if (targetNodeData.type?.includes("pose")) {
        preprocessor = "openpose";
      } else if (
        targetNodeData.type?.includes("canny") ||
        targetNodeData.type?.includes("edge")
      ) {
        preprocessor = "canny";
      } else if (targetNodeData.type?.includes("depth")) {
        preprocessor = "depth";
      } else if (targetNodeData.type?.includes("normal")) {
        preprocessor = "normal";
      }

      // Build a stable URL to sign (if file is present, we'll use the URL we upload to anyway)
      const urlForSignature = typeof imageUrl === 'string' ? imageUrl : (imageFile ? 'file://' + imageFile.name + ':' + imageFile.size : 'unknown');
      const signature = makePreprocessSignature(preprocessor, urlForSignature);

      // If we already have a matching signature + a stored URL, reuse it
      const existingNode = get().nodes.find(n => n.id === nodeId);
      const existingData: any = existingNode?.data;
      const existingUrl = existingData?.preprocessedImage?.guideImageURL ||
                          existingData?.preprocessedImage?.imageURL ||
                          existingData?.right_sidebar?.preprocessedImage;

      if (existingData?.preprocessSignature === signature && typeof existingUrl === 'string' && existingUrl.length > 0) {
        console.log(`🔁 Reusing preprocessed image for ${nodeId} (same input & preprocessor)`);
        // Make sure UI flags & cache are correct
        get().updateNodeData(nodeId, {
          hasPreprocessedImage: true,
          isPreprocessing: false,
          preprocessedImage: {
            ...(existingData.preprocessedImage || {}),
            guideImageURL: existingData?.preprocessedImage?.guideImageURL || existingUrl,
            preprocessor
          },
          right_sidebar: {
            ...(existingData.right_sidebar || {}),
            preprocessedImage: existingUrl,
            showPreprocessed: true
          }
        });
        get().setProcessedImage(nodeId, existingUrl);
        toast.dismiss(`preprocess-${nodeId}`);
        get().setNodeProcessing(nodeId, false);
        return; // ✅ short-circuit
      }

      let preprocessedResult;

      if (imageFile) {
        // Directly preprocess; preprocessImage internally uploads
        preprocessedResult = await runwareService.preprocessImage(
          imageFile,
          preprocessor
        );
      } else if (
        imageUrl &&
        typeof imageUrl === "string" &&
        !imageUrl.startsWith("data:")
      ) {
        // Preprocess from existing URL - fetch and convert to File
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'input.jpg', { type: 'image/jpeg' });
        preprocessedResult = await runwareService.preprocessImage(
          file,
          preprocessor
        );
      } else {
        throw new Error("No valid image data found");
      }

      // Create preprocessed image data object (normalize key for UI)
      const preprocessedImageData = {
        guideImageURL: preprocessedResult.imageURL, // <- use imageURL from service
        preprocessor: preprocessedResult.preprocessor,
        sourceImageUUID: imageNode.data?.imageUrl || imageNode.data?.image,
        timestamp: Date.now(),
      };

      // Update the ControlNet node with preprocessed image
      get().updateNodeData(nodeId, {
        preprocessedImage: preprocessedImageData,
        preprocessor: preprocessedResult.preprocessor,
        hasPreprocessedImage: true,
        isPreprocessing: false,
        preprocessSignature: signature, // Save signature for idempotency
        right_sidebar: {
          ...(targetNodeData?.right_sidebar || {} as any),
          preprocessedImage: preprocessedResult.imageURL, // <- use imageURL here too
          showPreprocessed: true,
        },
      });

      // Also feed the central cache used by the sidebar's first lookup
      get().setProcessedImage(nodeId, preprocessedResult.imageURL);

      toast.dismiss(`preprocess-${nodeId}`);
      // Note: Success toast is handled by preprocessingTrigger to avoid duplication
    } catch (error) {
      console.error("Error preprocessing ControlNet image:", error);

      // Reset preprocessing state on error
      get().updateNodeData(nodeId, {
        isPreprocessing: false,
        hasPreprocessedImage: false,
        preprocessedImage: undefined,
      });

      toast.dismiss(`preprocess-${nodeId}`);
      toast.error(
        `Failed to preprocess image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      get().setNodeProcessing(nodeId, false);
    }
  },

  // Clear preprocessed data from a ControlNet node
  clearPreprocessedData: (nodeId: string) => {
    const { preprocessingTrigger } = get();

    // Clear preprocessing state
    if (preprocessingTrigger) {
      preprocessingTrigger.clearPreprocessingState(nodeId);
    }

    // Clear node data - ensure all preprocessed data is removed
    get().updateNodeData(nodeId, {
      preprocessedImage: undefined,
      isPreprocessing: false,
      hasPreprocessedImage: false,
      preprocessor: undefined,
      right_sidebar: {
        ...(get().nodes.find((n) => n.id === nodeId)?.data?.right_sidebar as any ||
          {}),
        preprocessedImage: undefined,
        showPreprocessed: false,
      },
    });
  },

  // Get preprocessing state for a node
  getPreprocessingState: (nodeId: string) => {
    const { preprocessingTrigger } = get();
    return (
      preprocessingTrigger?.getPreprocessingState(nodeId) || {
        nodeId,
        status: "idle",
      }
    );
  },

  // Check if a node is currently being preprocessed
  isNodePreprocessing: (nodeId: string) => {
    const { preprocessingTrigger } = get();
    return preprocessingTrigger?.isNodeProcessing(nodeId) || false;
  },

  // Check if a node has preprocessing errors
  hasPreprocessingError: (nodeId: string) => {
    const { preprocessingTrigger } = get();
    return preprocessingTrigger?.hasPreprocessingError(nodeId) || false;
  },

  // Check if a node has preprocessing results
  hasPreprocessingResult: (nodeId: string) => {
    const { preprocessingTrigger } = get();
    return preprocessingTrigger?.hasPreprocessingResult(nodeId) || false;
  },

  // Clear preprocessing state for a node
  clearPreprocessingState: (nodeId: string) => {
    const { preprocessingTrigger } = get();
    if (preprocessingTrigger) {
      preprocessingTrigger.clearPreprocessingState(nodeId);
    }
  },

  // Get all nodes currently being processed
  getAllProcessingNodes: () => {
    const { preprocessingTrigger } = get();
    return preprocessingTrigger?.getAllProcessingNodes() || [];
  },

  // Get preprocessing statistics
  getPreprocessingStats: () => {
    const { preprocessingTrigger } = get();
    const stats = preprocessingTrigger?.getPreprocessingStats();
    
    // Ensure we return the expected format
    if (stats && 'totalProcessing' in stats) {
      // Convert from our simplified stats to the expected format
      return {
        total: stats.totalProcessing,
        processing: stats.totalProcessing,
        completed: 0,
        errors: 0,
        idle: 0,
      };
    }
    
    return {
      total: 0,
      processing: 0,
      completed: 0,
      errors: 0,
      idle: 0,
    };
  },

  // Ensure preprocessed data is properly serialized for persistence
  getSerializableWorkflowState: () => {
    const { nodes, edges } = get();

    // Ensure all preprocessed data is included in the serializable state
    const serializableNodes = nodes.map((node) => {
      if (
        (node.type?.includes("control-net") ||
          node.type === "seed-image-lights") &&
        node.data?.preprocessedImage
      ) {
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
              ...(node.data.right_sidebar as any || {}),
              preprocessedImage: (node.data.preprocessedImage as any)?.guideImageURL,
              showPreprocessed: !!node.data.preprocessedImage,
            },
          },
        };
      }
      return node;
    });

    return {
      nodes: serializableNodes,
      edges: edges,
    };
  },

  // Restore preprocessed data after loading workflow state
  restorePreprocessedDataFromState: (nodes: Node[]) => {
    const { preprocessingTrigger } = get();

    // Restore preprocessing state for nodes with preprocessed data
    nodes.forEach((node) => {
      if (
        (node.type?.includes("control-net") ||
          node.type === "seed-image-lights") &&
        node.data?.preprocessedImage &&
        preprocessingTrigger
      ) {
        // Restore the preprocessing state as completed
        preprocessingTrigger.getPreprocessingState(node.id); // Initialize state if needed
        // The state will be restored through the node data itself
      }
    });
  },

  // Call this right after you load your saved state
  hydrateProcessedImagesFromNodes: () => {
    const { nodes, setProcessedImage } = get();
    nodes.forEach((n) => {
      const d: any = n.data || {};
      // Prefer guideImageURL, then imageURL, then right_sidebar
      const url = d?.preprocessedImage?.guideImageURL ||
                  d?.preprocessedImage?.imageURL ||
                  d?.right_sidebar?.preprocessedImage;

      // 1) ControlNet node hydration
      if (typeof url === 'string' && url.length > 0) {
        setProcessedImage(n.id, url);
        // Also keep flags consistent - delegate to Canvas store
        useCanvasStore.getState().updateNodeData(n.id, {
          hasPreprocessedImage: true,
          isPreprocessing: false
        });
      }

      // 2) previewNode / output node hydration
      const genUrl = d?.generatedImage || d?.imageUrl || d?.image || d?.generatedImageUrl;
      if (typeof genUrl === 'string' && genUrl.length > 0) {
        setProcessedImage(n.id, genUrl);
      }
    });
  },
}));

// Export types for use in other files
export type { WorkflowState as WorkflowStateType };
