import { Node, Edge } from "@xyflow/react";
import { RunwareService } from "./runwareService";
import { useWorkflowStore } from "@/store/workflowStore";
import { toast } from "sonner";

// Workflow execution error types
export enum WorkflowErrorType {
  NODE_PROCESSING_ERROR = "NODE_PROCESSING_ERROR",
  DEPENDENCY_ERROR = "DEPENDENCY_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  CRITICAL_ERROR = "CRITICAL_ERROR",
  NON_CRITICAL_ERROR = "NON_CRITICAL_ERROR",
}

export class WorkflowExecutionError extends Error {
  public readonly type: WorkflowErrorType;
  public readonly nodeId?: string;
  public readonly originalError?: Error;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    type: WorkflowErrorType,
    nodeId?: string,
    originalError?: Error,
    recoverable: boolean = false
  ) {
    super(message);
    this.name = "WorkflowExecutionError";
    this.type = type;
    this.nodeId = nodeId;
    this.originalError = originalError;
    this.recoverable = recoverable;
  }
}

export interface WorkflowExecutionContext {
  nodes: Node[];
  edges: Edge[];
  processedImages: Map<string, string>;
  nodeMap: Map<string, Node>;
  edgeMap: Map<string, Edge[]>;
}

export interface NodeProcessingResult {
  nodeId: string;
  result: string | null;
  error?: string;
}

export interface WorkflowExecutionResult {
  success: boolean;
  finalImageUrl?: string;
  error?: string;
  processedNodes: NodeProcessingResult[];
  failedNodes: NodeProcessingResult[];
  recoveredNodes: string[];
  warnings: string[];
}

export class WorkflowExecutor {
  private runwareService: RunwareService;
  private processedImages: Map<string, string> = new Map();
  private processingNodes: Set<string> = new Set();
  private failedNodes: Map<string, WorkflowExecutionError> = new Map();
  private recoveredNodes: Set<string> = new Set();
  private warnings: string[] = [];
  private updateStoreCallback?: (nodeId: string, imageUrl: string) => void;
  private nodeProcessingCallback?: (
    nodeId: string,
    processing: boolean
  ) => void;
  private errorCallback?: (
    nodeId: string,
    error: WorkflowExecutionError
  ) => void;

  // Performance optimization caches
  private imageCache: Map<string, string> = new Map(); // Hash -> URL mapping for uploaded images
  private resultCache: Map<string, string> = new Map(); // Operation hash -> result URL
  private connectionPool: Map<string, Promise<any>> = new Map(); // Reusable connection promises

  constructor(runwareService: RunwareService) {
    this.runwareService = runwareService;
  }

  // Generate hash for image caching to avoid re-uploading identical images
  private async generateImageHash(imageFile: File): Promise<string> {
    const arrayBuffer = await imageFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `${imageFile.name}_${imageFile.size}_${hashHex.substring(0, 16)}`;
  }

  // Generate hash for operation caching
  private generateOperationHash(operation: string, params: any): string {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `${operation}_${btoa(paramString)
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 32)}`;
  }

  // Check if image is already cached and return URL
  private async getCachedImageUpload(imageFile: File): Promise<string | null> {
    try {
      const hash = await this.generateImageHash(imageFile);
      return this.imageCache.get(hash) || null;
    } catch (error) {
      console.warn("Failed to generate image hash for caching:", error);
      return null;
    }
  }

  // Cache uploaded image URL
  private async cacheImageUpload(
    imageFile: File,
    imageUrl: string
  ): Promise<void> {
    try {
      const hash = await this.generateImageHash(imageFile);
      this.imageCache.set(hash, imageUrl);

      // Limit cache size to prevent memory issues
      if (this.imageCache.size > 100) {
        const firstKey = this.imageCache.keys().next().value;
        this.imageCache.delete(firstKey);
      }
    } catch (error) {
      console.warn("Failed to cache image upload:", error);
    }
  }

  // Check if operation result is cached
  private getCachedResult(operation: string, params: any): string | null {
    const hash = this.generateOperationHash(operation, params);
    return this.resultCache.get(hash) || null;
  }

  // Cache operation result
  private cacheResult(operation: string, params: any, result: string): void {
    const hash = this.generateOperationHash(operation, params);
    this.resultCache.set(hash, result);

    // Limit cache size to prevent memory issues
    if (this.resultCache.size > 200) {
      const firstKey = this.resultCache.keys().next().value;
      this.resultCache.delete(firstKey);
    }
  }

  // Optimized WebSocket connection reuse
  private async getOrCreateConnection(operationType: string): Promise<any> {
    const connectionKey = `${operationType}_connection`;

    if (this.connectionPool.has(connectionKey)) {
      try {
        return await this.connectionPool.get(connectionKey)!;
      } catch (error) {
        // Connection failed, remove from pool and create new one
        this.connectionPool.delete(connectionKey);
      }
    }

    // Create new connection promise
    const connectionPromise = this.createConnection(operationType);
    this.connectionPool.set(connectionKey, connectionPromise);

    return connectionPromise;
  }

  // Create connection for specific operation type
  private async createConnection(operationType: string): Promise<any> {
    // This would typically involve WebSocket connection setup
    // For now, we'll return a placeholder that represents connection readiness
    return { type: operationType, ready: true, timestamp: Date.now() };
  }

  // Clear all caches
  clearCaches(): void {
    this.imageCache.clear();
    this.resultCache.clear();
    this.connectionPool.clear();
  }

  // Get cache statistics for monitoring
  getCacheStats(): {
    imageCache: { size: number; maxSize: number };
    resultCache: { size: number; maxSize: number };
    connectionPool: { size: number };
  } {
    return {
      imageCache: { size: this.imageCache.size, maxSize: 100 },
      resultCache: { size: this.resultCache.size, maxSize: 200 },
      connectionPool: { size: this.connectionPool.size },
    };
  }

  // Extract model AIR identifiers from engine node configurations
  private extractModelAIRIdentifier(node: Node): string | null {
    // Check for model in node data
    if (typeof node.data.model === "string" && node.data.model.trim()) {
      return node.data.model;
    }

    // Check for model in node configuration from left_sidebar data
    if (typeof (node as any).model === "string" && (node as any).model.trim()) {
      return (node as any).model;
    }

    // Check for legacy model configurations
    if (node.data.modelId && typeof node.data.modelId === "string") {
      return node.data.modelId;
    }

    return null;
  }

  // Extract LoRA AIR identifiers from gear node data
  private extractLoRAAIRIdentifiers(
    node: Node
  ): Array<{ model: string; weight: number }> {
    const loras: Array<{ model: string; weight: number }> = [];

    // Check for LoRA in node data array format
    if (Array.isArray(node.data.loras)) {
      node.data.loras.forEach((lora: any) => {
        if (typeof lora.model === "string" && lora.model.trim()) {
          loras.push({
            model: lora.model,
            weight: typeof lora.weight === "number" ? lora.weight : 1.0,
          });
        }
      });
    }

    // Check for single LoRA in node data
    if (typeof node.data.loraModel === "string" && node.data.loraModel.trim()) {
      loras.push({
        model: node.data.loraModel,
        weight: typeof node.data.weight === "number" ? node.data.weight : 1.0,
      });
    }

    // Check for LoRA in node configuration from left_sidebar data
    if (typeof (node as any).lora === "string" && (node as any).lora.trim()) {
      loras.push({
        model: (node as any).lora,
        weight:
          typeof (node as any).weight === "number" ? (node as any).weight : 1.0,
      });
    }

    // Handle backward compatibility with legacy LoRA configurations
    if (node.data.lora) {
      if (typeof node.data.lora === "string" && node.data.lora.trim()) {
        // Legacy single LoRA string format
        loras.push({
          model: node.data.lora,
          weight:
            typeof node.data.loraWeight === "number"
              ? node.data.loraWeight
              : 1.0,
        });
      } else if (Array.isArray(node.data.lora)) {
        // Legacy LoRA array format
        node.data.lora.forEach((lora: any) => {
          if (typeof lora === "string" && lora.trim()) {
            loras.push({
              model: lora,
              weight: 1.0,
            });
          } else if (
            typeof lora === "object" &&
            typeof lora.model === "string"
          ) {
            loras.push({
              model: lora.model,
              weight: typeof lora.weight === "number" ? lora.weight : 1.0,
            });
          }
        });
      }
    }

    // Handle legacy loraId field
    if (typeof node.data.loraId === "string" && node.data.loraId.trim()) {
      loras.push({
        model: node.data.loraId,
        weight:
          typeof node.data.loraWeight === "number" ? node.data.loraWeight : 1.0,
      });
    }

    return loras;
  }

  // Extract right_sidebar data for creativity, reference types, angles, directions
  private extractRightSidebarData(node: Node): any {
    const rightSidebar = (node.data?.right_sidebar || {}) as any;

    return {
      // Creativity parameter for re-imagine nodes
      creativity:
        typeof rightSidebar.creativity === "number"
          ? rightSidebar.creativity
          : typeof rightSidebar.strength === "number"
          ? rightSidebar.strength
          : null,

      // Reference type for reference nodes
      referenceType:
        typeof rightSidebar.referenceType === "string"
          ? rightSidebar.referenceType
          : typeof rightSidebar.reference_type === "string"
          ? rightSidebar.reference_type
          : null,

      // Angle and direction for re-angle nodes
      degrees:
        typeof rightSidebar.degrees === "number"
          ? rightSidebar.degrees
          : typeof rightSidebar.angle === "number"
          ? rightSidebar.angle
          : null,
      direction:
        typeof rightSidebar.direction === "string"
          ? rightSidebar.direction
          : typeof rightSidebar.rotationDirection === "string"
          ? rightSidebar.rotationDirection
          : null,

      // Additional parameters
      intensity:
        typeof rightSidebar.intensity === "number"
          ? rightSidebar.intensity
          : null,
      scale: typeof rightSidebar.scale === "number" ? rightSidebar.scale : null,
      weight:
        typeof rightSidebar.weight === "number" ? rightSidebar.weight : null,
    };
  }

  // Handle context menu data for image type detection (SCENE/OBJECT)
  private extractContextMenuData(node: Node): Record<string, any> {
    const contextMenu = node.data.contextMenu || node.data.context_menu || {};

    // Extract image type information for re-scene nodes
    const imageTypes: Record<string, string> = {};

    Object.entries(contextMenu).forEach(([key, value]: [string, any]) => {
      if (value && typeof value === "object") {
        if (typeof value.imageType === "string") {
          imageTypes[key] = value.imageType;
        } else if (typeof value.image_type === "string") {
          imageTypes[key] = value.image_type;
        }
      }
    });

    return {
      imageTypes,
      rawContextMenu: contextMenu,
    };
  }

  // Process Rive-generated image URLs from node data
  private extractRiveGeneratedImageURL(node: Node): string | null {
    const nodeData = node.data as any;

    // Check for Rive-generated image URL in various possible locations
    if (
      typeof nodeData?.imageUrl === "string" &&
      nodeData.imageUrl.startsWith("http")
    ) {
      return nodeData.imageUrl;
    }

    if (
      typeof nodeData?.image_url === "string" &&
      nodeData.image_url.startsWith("http")
    ) {
      return nodeData.image_url;
    }

    if (
      typeof nodeData?.riveImageUrl === "string" &&
      nodeData.riveImageUrl.startsWith("http")
    ) {
      return nodeData.riveImageUrl;
    }

    if (
      typeof nodeData?.generatedImageUrl === "string" &&
      nodeData.generatedImageUrl.startsWith("http")
    ) {
      return nodeData.generatedImageUrl;
    }

    // Check for Rive-specific data structure
    if (nodeData?.rive && typeof nodeData.rive.imageUrl === "string") {
      return nodeData.rive.imageUrl;
    }

    return null;
  }

  // Extract all relevant parameters from node configuration
  private extractNodeParameters(node: Node): {
    modelAIR: string | null;
    loraAIRs: Array<{ model: string; weight: number }>;
    rightSidebarData: any;
    contextMenuData: Record<string, any>;
    riveImageUrl: string | null;
  } {
    return {
      modelAIR: this.extractModelAIRIdentifier(node),
      loraAIRs: this.extractLoRAAIRIdentifiers(node),
      rightSidebarData: this.extractRightSidebarData(node),
      contextMenuData: this.extractContextMenuData(node),
      riveImageUrl: this.extractRiveGeneratedImageURL(node),
    };
  }

  // Set callback for updating WorkflowStore with processed results
  setUpdateStoreCallback(
    callback: (nodeId: string, imageUrl: string) => void
  ): void {
    this.updateStoreCallback = callback;
  }

  // Set callback for updating node processing states
  setNodeProcessingCallback(
    callback: (nodeId: string, processing: boolean) => void
  ): void {
    this.nodeProcessingCallback = callback;
  }

  // Set callback for error handling
  setErrorCallback(
    callback: (nodeId: string, error: WorkflowExecutionError) => void
  ): void {
    this.errorCallback = callback;
  }

  // Determine if a node is critical for workflow execution
  private isCriticalNode(
    node: Node,
    targetNodeId: string,
    dependencies: Map<string, string[]>
  ): boolean {
    // Output nodes and target nodes are always critical
    if (node.type === "output" || node.id === targetNodeId) {
      return true;
    }

    // Engine nodes are typically critical for final generation
    if (node.type === "engine") {
      return true;
    }

    // Check if this node is in the dependency path to the target
    const isInTargetPath = this.isNodeInDependencyPath(
      node.id,
      targetNodeId,
      dependencies
    );
    return isInTargetPath;
  }

  // Check if a node is in the dependency path to the target
  private isNodeInDependencyPath(
    nodeId: string,
    targetNodeId: string,
    dependencies: Map<string, string[]>
  ): boolean {
    const visited = new Set<string>();

    const checkPath = (currentId: string): boolean => {
      if (currentId === nodeId) {
        return true;
      }

      if (visited.has(currentId)) {
        return false;
      }

      visited.add(currentId);
      const deps = dependencies.get(currentId) || [];
      return deps.some((depId) => checkPath(depId));
    };

    return checkPath(targetNodeId);
  }

  // Handle individual node processing failures gracefully
  private async handleNodeError(
    nodeId: string,
    error: Error,
    node: Node,
    targetNodeId: string,
    dependencies: Map<string, string[]>
  ): Promise<string | null> {
    const isCritical = this.isCriticalNode(node, targetNodeId, dependencies);

    // Create workflow execution error
    const workflowError = new WorkflowExecutionError(
      `Node ${nodeId} (${node.type}) failed: ${error.message}`,
      isCritical
        ? WorkflowErrorType.CRITICAL_ERROR
        : WorkflowErrorType.NON_CRITICAL_ERROR,
      nodeId,
      error,
      !isCritical
    );

    // Store the error
    this.failedNodes.set(nodeId, workflowError);

    // Notify error callback if available
    if (this.errorCallback) {
      this.errorCallback(nodeId, workflowError);
    }

    if (isCritical) {
      // Critical node failure - cannot continue workflow
      const errorMessage = this.getNodeErrorMessage(node, error);
      toast.error(errorMessage);
      throw workflowError;
    } else {
      // Non-critical node failure - continue workflow execution
      const warningMessage = this.getNodeWarningMessage(node, error);
      this.warnings.push(warningMessage);
      toast.warning(warningMessage);

      // Try to recover with fallback behavior
      const fallbackResult = await this.attemptNodeRecovery(node, error);
      if (fallbackResult) {
        this.recoveredNodes.add(nodeId);
        return fallbackResult;
      }

      return null;
    }
  }

  // Attempt to recover from node failures with fallback behavior
  private async attemptNodeRecovery(
    node: Node,
    error: Error
  ): Promise<string | null> {
    try {
      switch (node.type) {
        case "imageInput":
          // Try to use a placeholder image or cached result
          if (node.data.imageUrl && typeof node.data.imageUrl === "string") {
            this.warnings.push(
              `Using cached image URL for failed image input node ${node.id}`
            );
            return node.data.imageUrl;
          }
          break;

        case "controlNet":
          // Skip ControlNet preprocessing and return input image
          const riveImageUrl = this.extractRiveGeneratedImageURL(node);
          if (riveImageUrl) {
            this.warnings.push(
              `Using Rive-generated image directly for failed ControlNet node ${node.id}`
            );
            return riveImageUrl;
          }
          break;

        case "tool":
          // For tool failures, try to return the input image unchanged
          this.warnings.push(
            `Tool processing failed for node ${node.id}, returning input image unchanged`
          );
          // This would need the input image to be passed in, but for now return null
          break;

        case "gear":
          // Gear nodes are typically non-critical, just log the failure
          this.warnings.push(
            `LoRA configuration failed for gear node ${node.id}, continuing without LoRA`
          );
          return null;

        default:
          break;
      }
    } catch (recoveryError) {
      console.error(
        `Recovery attempt failed for node ${node.id}:`,
        recoveryError
      );
    }

    return null;
  }

  // Get user-friendly error messages for node failures
  private getNodeErrorMessage(node: Node, error: Error): string {
    const nodeTypeNames: Record<string, string> = {
      imageInput: "Image Input",
      textInput: "Text Input",
      controlNet: "ControlNet",
      rerendering: "Generation",
      tool: "Image Tool",
      engine: "Engine",
      gear: "LoRA",
      output: "Output",
    };

    const nodeTypeName = nodeTypeNames[node.type] || node.type;
    return `${nodeTypeName} failed: ${error.message}`;
  }

  // Get user-friendly warning messages for recoverable failures
  private getNodeWarningMessage(node: Node, error: Error): string {
    const nodeTypeNames: Record<string, string> = {
      imageInput: "Image Input",
      textInput: "Text Input",
      controlNet: "ControlNet",
      rerendering: "Generation",
      tool: "Image Tool",
      engine: "Engine",
      gear: "LoRA",
      output: "Output",
    };

    const nodeTypeName = nodeTypeNames[node.type] || node.type;
    return `${nodeTypeName} node encountered an issue but workflow will continue: ${error.message}`;
  }

  // Build node dependency graph from edges array
  private buildDependencyGraph(
    nodes: Node[],
    edges: Edge[]
  ): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    // Initialize all nodes with empty dependency arrays
    nodes.forEach((node) => {
      dependencies.set(node.id, []);
    });

    // Build dependencies from edges (target depends on source)
    edges.forEach((edge) => {
      const targetDeps = dependencies.get(edge.target) || [];
      targetDeps.push(edge.source);
      dependencies.set(edge.target, targetDeps);
    });

    return dependencies;
  }

  // Implement topological sorting for proper execution sequence
  private getExecutionOrder(
    dependencies: Map<string, string[]>,
    targetNodeId: string
  ): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const executionOrder: string[] = [];

    const visit = (nodeId: string): void => {
      if (visiting.has(nodeId)) {
        throw new Error(
          `Circular dependency detected involving node ${nodeId}`
        );
      }

      if (visited.has(nodeId)) {
        return;
      }

      visiting.add(nodeId);

      // Visit all dependencies first
      const nodeDeps = dependencies.get(nodeId) || [];
      nodeDeps.forEach((depId) => {
        visit(depId);
      });

      visiting.delete(nodeId);
      visited.add(nodeId);
      executionOrder.push(nodeId);
    };

    // Start from target node and traverse dependencies
    visit(targetNodeId);

    return executionOrder;
  }

  // Handle circular dependency detection and error reporting
  private detectCycles(dependencies: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const cycles: string[] = [];

    const visit = (nodeId: string, path: string[]): void => {
      if (visiting.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        const cycle = path.slice(cycleStart).concat(nodeId);
        cycles.push(`Circular dependency: ${cycle.join(" -> ")}`);
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visiting.add(nodeId);
      const newPath = [...path, nodeId];

      const nodeDeps = dependencies.get(nodeId) || [];
      nodeDeps.forEach((depId) => {
        visit(depId, newPath);
      });

      visiting.delete(nodeId);
      visited.add(nodeId);
    };

    // Check all nodes for cycles
    dependencies.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        visit(nodeId, []);
      }
    });

    return cycles;
  }

  // Treat preview/output with persisted images as boundaries
  private isPreviewLike(n: Node): boolean {
    const t = n.type ?? n.data?.type;
    return t === "previewNode" || t === "output" || t === "preview-realtime-node";
  }

  private persistedImage(n: Node): string | null {
    const url = (n.data?.imageUrl as string) ||
                (n.data?.generatedImage as string) ||
                (n.data?.right_sidebar?.imageUrl as string);
    return typeof url === "string" && url.length > 0 ? url : null;
  }

  private primePersistedImageSources(nodes: Node[]): void {
    for (const n of nodes) {
      if (this.isPreviewLike(n)) {
        const url = this.persistedImage(n);
        if (url) this.setProcessedImage(n.id, url);
      }
    }
  }

  // Prune recursion behind preview/output nodes that already have an image
  private pruneAtPersistedBoundaries(
    nodes: Node[],
    deps: Map<string, string[]>,
    targetId: string
  ): Map<string, string[]> {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const seen = new Set<string>();
    
    const walk = (id: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      
      const arr = deps.get(id) || [];
      const next: string[] = [];
      
      for (const dep of arr) {
        const dn = nodeMap.get(dep);
        if (dn && this.isPreviewLike(dn) && this.persistedImage(dn)) {
          // Keep the dep itself so children can read its cached image,
          // but stop traversing beyond it
          deps.set(dep, []);
          next.push(dep);
          continue;
        }
        next.push(dep);
        walk(dep);
      }
      deps.set(id, next);
    };
    
    walk(targetId);
    return deps;
  }

  // Main workflow execution method with comprehensive error handling
  async executeWorkflow(
    nodes: Node[],
    edges: Edge[],
    targetNodeId: string
  ): Promise<string | null> {
    try {
      console.log("Starting workflow execution for target node:", targetNodeId);

      // Clear previous execution state
      this.clearProcessedImages();
      this.processingNodes.clear();
      this.failedNodes.clear();
      this.recoveredNodes.clear();
      this.warnings = [];

      // Prime cache so preview/output act like image-layer sources
      this.primePersistedImageSources(nodes);

      // Validate workflow before execution
      this.validateWorkflow(nodes, edges, targetNodeId);

      // Build nodeMap and edgeMap for efficient node lookup and traversal
      const nodeMap = new Map(nodes.map((node) => [node.id, node]));
      const edgeMap = this.buildEdgeMap(edges);

      // Validate input detection system for debugging
      this.validateInputDetectionSystem(nodes, edges);

      // Build dependency graph and get execution order
      let dependencies = this.buildDependencyGraph(nodes, edges);

      // Cut graph behind preview/output that already have an image
      dependencies = this.pruneAtPersistedBoundaries(nodes, dependencies, targetNodeId);

      // Check for circular dependencies before execution
      const cycles = this.detectCycles(dependencies);
      if (cycles.length > 0) {
        throw new WorkflowExecutionError(
          `Circular dependencies detected: ${cycles.join(", ")}`,
          WorkflowErrorType.DEPENDENCY_ERROR,
          undefined,
          undefined,
          false
        );
      }

      // Get proper execution order using topological sorting
      const executionOrder = this.getExecutionOrder(dependencies, targetNodeId);
      console.log("Execution order:", executionOrder);

      // Execute nodes in the determined order with comprehensive error handling
      let finalResult: string | null = null;
      let successfulNodes = 0;

      for (const nodeId of executionOrder) {
        // Skip if already processed (result caching to avoid duplicate processing)
        if (this.processedImages.has(nodeId)) {
          successfulNodes++;
          continue;
        }

        try {
          const result = await this.executeNode(
            nodeId,
            nodeMap,
            edgeMap,
            dependencies,
            targetNodeId
          );

          // Cache the result and update WorkflowStore with processed results
          if (result) {
            this.processedImages.set(nodeId, result);

            // Update WorkflowStore if callback is available
            if (this.updateStoreCallback) {
              this.updateStoreCallback(nodeId, result);
            }
          }

          // If this is the target node, store as final result
          if (nodeId === targetNodeId) {
            finalResult = result;
          }

          successfulNodes++;
        } catch (error) {
          // Handle node processing error
          const node = nodeMap.get(nodeId)!;
          const result = await this.handleNodeError(
            nodeId,
            error as Error,
            node,
            targetNodeId,
            dependencies
          );

          // If we got a recovery result, use it
          if (result) {
            this.processedImages.set(nodeId, result);
            if (this.updateStoreCallback) {
              this.updateStoreCallback(nodeId, result);
            }

            if (nodeId === targetNodeId) {
              finalResult = result;
            }
            successfulNodes++;
          }
          // If it was a critical error, it would have thrown, so we continue here
        }
      }

      // Display execution summary
      this.displayExecutionSummary(successfulNodes, executionOrder.length);

      console.log("Workflow execution completed with result:", finalResult);
      console.log("Execution summary:", {
        successful: successfulNodes,
        total: executionOrder.length,
        failed: this.failedNodes.size,
        recovered: this.recoveredNodes.size,
        warnings: this.warnings.length,
      });

      return finalResult;
    } catch (error) {
      console.error("Workflow execution failed:", error);

      if (error instanceof WorkflowExecutionError) {
        toast.error(error.message);
      } else {
        toast.error(
          `Workflow execution failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }

      throw error;
    }
  }

  // Validate workflow before execution
  private validateWorkflow(
    nodes: Node[],
    edges: Edge[],
    targetNodeId: string
  ): void {
    const validationErrors: string[] = [];
    const warnings: string[] = [];

    // Check if target node exists
    const targetNode = nodes.find((node) => node.id === targetNodeId);
    if (!targetNode) {
      throw new WorkflowExecutionError(
        `Target node ${targetNodeId} not found`,
        WorkflowErrorType.VALIDATION_ERROR,
        targetNodeId,
        undefined,
        false
      );
    }

    // Validate node connections and required parameters
    this.validateNodeConnections(nodes, edges, validationErrors, warnings);
    this.validateNodeParameters(nodes, validationErrors, warnings);
    this.validateWorkflowStructure(
      nodes,
      edges,
      targetNodeId,
      validationErrors,
      warnings
    );

    // Display warnings to user except unreachable nodes, because multiple workflows could exist, in that case they are unreachable to each other during execution
    if (warnings.length > 0) {
      warnings.forEach((warning) => {
        if (/not reachable from target node/i.test(warning)) {
          console.warn(warning);
        } else {
          toast.warning(warning);
        }
      });
    }

    // Throw error if critical validation issues found
    if (validationErrors.length > 0) {
      throw new WorkflowExecutionError(
        `Workflow validation failed: ${validationErrors.join("; ")}`,
        WorkflowErrorType.VALIDATION_ERROR,
        undefined,
        undefined,
        false
      );
    }
  }

  // Validate node connections and required inputs
  private validateNodeConnections(
    nodes: Node[],
    edges: Edge[],
    errors: string[],
    warnings: string[]
  ): void {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const incomingEdges = new Map<string, Edge[]>();
    const outgoingEdges = new Map<string, Edge[]>();

    // Build edge maps
    edges.forEach((edge) => {
      // Validate edge references valid nodes
      if (!nodeMap.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
        return;
      }
      if (!nodeMap.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
        return;
      }

      // Build incoming edges map
      if (!incomingEdges.has(edge.target)) {
        incomingEdges.set(edge.target, []);
      }
      incomingEdges.get(edge.target)!.push(edge);

      // Build outgoing edges map
      if (!outgoingEdges.has(edge.source)) {
        outgoingEdges.set(edge.source, []);
      }
      outgoingEdges.get(edge.source)!.push(edge);
    });

    // Validate each node's connections
    nodes.forEach((node) => {
      const incoming = incomingEdges.get(node.id) || [];
      const outgoing = outgoingEdges.get(node.id) || [];

      switch (node.type) {
        case "imageInput":
        case "textInput":
          // Input nodes should have no incoming connections
          if (incoming.length > 0) {
            warnings.push(
              `Input node ${node.id} has incoming connections which will be ignored`
            );
          }
          // Input nodes should have outgoing connections
          if (outgoing.length === 0) {
            warnings.push(
              `Input node ${node.id} has no outgoing connections and may be unused`
            );
          }
          break;

        case "controlNet":
          // ControlNet nodes need image input
          if (
            incoming.length === 0 &&
            !this.extractRiveGeneratedImageURL(node)
          ) {
            errors.push(
              `ControlNet node ${node.id} requires an image input connection or Rive-generated image`
            );
          }
          break;

        case "rerendering":
          // Generation nodes typically need inputs
          const { rerenderingType } = node.data;
          if (rerenderingType === "rescene" && incoming.length < 2) {
            errors.push(
              `Re-scene node ${node.id} requires at least 2 image inputs`
            );
          } else if (
            ["reimagine", "reference", "reangle", "relight"].includes(
              rerenderingType as string
            ) &&
            incoming.length === 0
          ) {
            errors.push(
              `${rerenderingType} node ${node.id} requires an image input`
            );
          } else if (rerenderingType === "remix" && incoming.length === 0) {
            errors.push(
              `Re-mix node ${node.id} requires at least one image input`
            );
          }
          break;

        case "tool":
          // Tool nodes need image input
          if (incoming.length === 0) {
            errors.push(
              `Tool node ${node.id} requires an image input connection`
            );
          }
          break;

        case "engine":
          // Engine nodes should have some inputs for generation
          if (incoming.length === 0) {
            warnings.push(
              `Engine node ${node.id} has no inputs - will use default parameters`
            );
          }
          break;

        case "output":
        case "previewNode":
          // Output nodes need input to display
          if (incoming.length === 0) {
            // was: errors.push(...)
            warnings.push(`Output node ${node.id} has no input connection yet`);
          }
          // Output nodes should have no outgoing connections -> commenting the following out because we will consider previewNode as input
          // if (outgoing.length > 0) {
          //   warnings.push(`Output node ${node.id} has outgoing connections which will be ignored`);
          // }
          break;

        case "gear":
          // Gear nodes are configuration nodes, no strict connection requirements
          if (outgoing.length === 0) {
            warnings.push(
              `Gear node ${node.id} has no outgoing connections and may be unused`
            );
          }
          break;
      }
    });
  }

  // Validate node parameters and configurations
  private validateNodeParameters(
    nodes: Node[],
    errors: string[],
    warnings: string[]
  ): void {
    nodes.forEach((node) => {
      switch (node.type) {
        case "imageInput":
          if (
            !node.data.imageFile &&
            !node.data.imageUrl &&
            !this.extractRiveGeneratedImageURL(node)
          ) {
            errors.push(
              `Image input node ${node.id} is missing image file, URL, or Rive-generated image`
            );
          }
          break;

        case node.type.includes('input-text'):
          if (
            !node.data.right_sidebar.prompt ||
            typeof node.data.right_sidebar.prompt !== "string" ||
            node.data?.right_sidebar?.prompt.trim().length === 0
          ) {
            errors.push(`Text input node ${node.id} is missing prompt text`);
          } else if (node.data?.right_sidebar?.prompt.length > 1000) {
            warnings.push(
              `Text input node ${node.id} has very long prompt (${node.data?.right_sidebar?.prompt.length} chars) which may affect performance`
            );
          }
          break;

        case "controlNet":
          if (
            !node.data.preprocessor ||
            typeof node.data.preprocessor !== "string"
          ) {
            errors.push(
              `ControlNet node ${node.id} is missing preprocessor configuration`
            );
          } else {
            const validPreprocessors = [
              "pose",
              "edge",
              "depth",
              "segment",
              "normal",
            ];
            if (!validPreprocessors.includes(node.data.preprocessor)) {
              warnings.push(
                `ControlNet node ${node.id} uses unknown preprocessor: ${node.data.preprocessor}`
              );
            }
          }
          break;

        case "rerendering":
          const { rerenderingType } = node.data;
          if (!rerenderingType) {
            errors.push(
              `Generation node ${node.id} is missing rerendering type`
            );
          } else {
            const validTypes = [
              "reimagine",
              "reference",
              "rescene",
              "reangle",
              "remix",
              "relight",
            ];
            if (!validTypes.includes(rerenderingType as string)) {
              errors.push(
                `Generation node ${node.id} has invalid rerendering type: ${rerenderingType}`
              );
            }

            // Validate type-specific parameters
            const rightSidebarData = this.extractRightSidebarData(node);
            switch (rerenderingType) {
              case "reimagine":
                if (
                  rightSidebarData.creativity !== null &&
                  (rightSidebarData.creativity < 0 ||
                    rightSidebarData.creativity > 1)
                ) {
                  warnings.push(
                    `Re-imagine node ${node.id} has creativity value outside 0-1 range: ${rightSidebarData.creativity}`
                  );
                }
                break;
              case "reangle":
                if (
                  rightSidebarData.degrees !== null &&
                  (rightSidebarData.degrees < -180 ||
                    rightSidebarData.degrees > 180)
                ) {
                  warnings.push(
                    `Re-angle node ${node.id} has degrees outside -180 to 180 range: ${rightSidebarData.degrees}`
                  );
                }
                if (
                  rightSidebarData.direction &&
                  !["left", "right", "up", "down"].includes(
                    rightSidebarData.direction
                  )
                ) {
                  warnings.push(
                    `Re-angle node ${node.id} has invalid direction: ${rightSidebarData.direction}`
                  );
                }
                break;
            }
          }
          break;

        case "tool":
          const { toolType } = node.data;
          if (!toolType) {
            errors.push(`Tool node ${node.id} is missing tool type`);
          } else {
            const validToolTypes = [
              "removebg",
              "upscale",
              "inpaint",
              "outpaint",
            ];
            if (!validToolTypes.includes(toolType as string)) {
              errors.push(
                `Tool node ${node.id} has invalid tool type: ${toolType}`
              );
            }

            // Validate tool-specific parameters
            switch (toolType) {
              case "upscale":
                const { upscaleFactor } = node.data;
                if (
                  upscaleFactor &&
                  ![2, 3, 4].includes(upscaleFactor as number)
                ) {
                  errors.push(
                    `Upscale node ${node.id} has invalid upscale factor: ${upscaleFactor}. Must be 2, 3, or 4`
                  );
                }
                break;
              case "inpaint":
                if (!node.data.maskImage) {
                  warnings.push(
                    `Inpaint node ${node.id} is missing mask image - will need to be provided during execution`
                  );
                }
                break;
              case "outpaint":
                const { outpaintDirection, outpaintAmount } = node.data;
                if (
                  outpaintDirection &&
                  !["up", "down", "left", "right", "all"].includes(
                    outpaintDirection as string
                  )
                ) {
                  warnings.push(
                    `Outpaint node ${node.id} has invalid direction: ${outpaintDirection}`
                  );
                }
                if (
                  outpaintAmount &&
                  ((outpaintAmount as number) < 10 ||
                    (outpaintAmount as number) > 200)
                ) {
                  warnings.push(
                    `Outpaint node ${node.id} has amount outside recommended 10-200 range: ${outpaintAmount}`
                  );
                }
                break;
            }
          }
          break;

        case "engine":
          // Validate engine parameters
          const { width, height, steps, cfgScale } = node.data;
          if (
            width &&
            ((width as number) < 256 ||
              (width as number) > 2048 ||
              (width as number) % 64 !== 0)
          ) {
            warnings.push(
              `Engine node ${node.id} has width outside recommended range or not divisible by 64: ${width}`
            );
          }
          if (
            height &&
            ((height as number) < 256 ||
              (height as number) > 2048 ||
              (height as number) % 64 !== 0)
          ) {
            warnings.push(
              `Engine node ${node.id} has height outside recommended range or not divisible by 64: ${height}`
            );
          }
          if (steps && ((steps as number) < 1 || (steps as number) > 100)) {
            warnings.push(
              `Engine node ${node.id} has steps outside recommended 1-100 range: ${steps}`
            );
          }
          if (
            cfgScale &&
            ((cfgScale as number) < 1 || (cfgScale as number) > 20)
          ) {
            warnings.push(
              `Engine node ${node.id} has CFG scale outside recommended 1-20 range: ${cfgScale}`
            );
          }

          // Validate model AIR identifier
          const modelAIR = this.extractModelAIRIdentifier(node);
          if (!modelAIR) {
            warnings.push(
              `Engine node ${node.id} has no model specified - will use default`
            );
          }
          break;

        case "gear":
          // Validate LoRA configurations
          const loraAIRs = this.extractLoRAAIRIdentifiers(node);
          if (loraAIRs.length === 0) {
            warnings.push(
              `Gear node ${node.id} has no valid LoRA configuration`
            );
          } else {
            loraAIRs.forEach((lora, index) => {
              if (!lora.model || typeof lora.model !== "string") {
                errors.push(
                  `Gear node ${node.id} LoRA ${index} is missing model identifier`
                );
              }
              if (lora.weight < 0 || lora.weight > 2) {
                warnings.push(
                  `Gear node ${node.id} LoRA ${index} has weight outside recommended 0-2 range: ${lora.weight}`
                );
              }
            });
          }
          break;
      }
    });
  }

  // Validate overall workflow structure and dependencies
  private validateWorkflowStructure(
    nodes: Node[],
    edges: Edge[],
    targetNodeId: string,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for isolated nodes (no connections)
    const connectedNodes = new Set<string>();
    edges.forEach((edge) => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const isolatedNodes = nodes.filter((node) => !connectedNodes.has(node.id));
    if (isolatedNodes.length > 0) {
      warnings.push(
        `Found ${
          isolatedNodes.length
        } isolated nodes that are not connected to the workflow: ${isolatedNodes
          .map((n) => n.id)
          .join(", ")}`
      );
    }

    // Check if target node is reachable
    const dependencies = this.buildDependencyGraph(nodes, edges);
    const reachableNodes = this.getReachableNodes(targetNodeId, dependencies);
    const unreachableNodes = nodes.filter(
      (node) => !reachableNodes.has(node.id) && node.id !== targetNodeId
    );

    if (unreachableNodes.length > 0) {
      warnings.push(
        `Found ${
          unreachableNodes.length
        } nodes that are not reachable from target node ${targetNodeId}: ${unreachableNodes
          .map((n) => n.id)
          .join(", ")}`
      );
    }

    // Check for potential performance issues
    const totalNodes = nodes.length;
    if (totalNodes > 20) {
      warnings.push(
        `Large workflow with ${totalNodes} nodes may have performance implications`
      );
    }

    const imageInputNodes = nodes.filter((node) => node.type === "imageInput");
    if (imageInputNodes.length > 10) {
      warnings.push(
        `Workflow has ${imageInputNodes.length} image input nodes which may impact memory usage`
      );
    }

    // Check for common workflow patterns
    const hasTextInput = nodes.some((node) => node.type === "textInput");
    const hasEngine = nodes.some((node) => node.type === "engine");
    const hasOutput = nodes.some(
      (node) => node.type === "output" || node.type === "previewNode"
    );

    if (!hasOutput) {
      warnings.push(
        "Workflow has no output nodes - results may not be visible"
      );
    }

    if (hasEngine && !hasTextInput) {
      warnings.push(
        "Engine node present but no text input found - will use default prompts"
      );
    }
  }

  // Get all nodes reachable from a target node (reverse dependency traversal)
  private getReachableNodes(
    targetNodeId: string,
    dependencies: Map<string, string[]>
  ): Set<string> {
    const reachable = new Set<string>();
    const visited = new Set<string>();

    const traverse = (nodeId: string): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      reachable.add(nodeId);

      const deps = dependencies.get(nodeId) || [];
      deps.forEach((depId) => traverse(depId));
    };

    traverse(targetNodeId);
    return reachable;
  }

  // Display execution summary with warnings and recovery information
  private displayExecutionSummary(successful: number, total: number): void {
    if (this.failedNodes.size === 0 && this.warnings.length === 0) {
      // Perfect execution
      toast.success(
        `Workflow completed successfully! Processed ${successful}/${total} nodes.`
      );
    } else if (this.recoveredNodes.size > 0) {
      // Execution with recovery
      toast.success(
        `Workflow completed with ${this.recoveredNodes.size} recovered nodes. ` +
          `${successful}/${total} nodes processed successfully.`
      );
    } else if (this.warnings.length > 0) {
      // Execution with warnings
      toast.warning(
        `Workflow completed with ${this.warnings.length} warnings. ` +
          `${successful}/${total} nodes processed.`
      );
    }
  }

  // Clear processed images cache
  clearProcessedImages(): void {
    this.processedImages.clear();
  }

  // Get processed image for a node
  getProcessedImage(nodeId: string): string | null {
    return this.processedImages.get(nodeId) || null;
  }

  // Set processed image for a node
  setProcessedImage(nodeId: string, imageUrl: string): void {
    this.processedImages.set(nodeId, imageUrl);
  }

  // Get workflow execution results with error information
  getExecutionResults(): WorkflowExecutionResult {
    const processedNodes: NodeProcessingResult[] = Array.from(
      this.processedImages.entries()
    ).map(([nodeId, result]) => ({
      nodeId,
      result,
      error: undefined,
    }));

    const failedNodes: NodeProcessingResult[] = Array.from(
      this.failedNodes.entries()
    ).map(([nodeId, error]) => ({
      nodeId,
      result: null,
      error: error.message,
    }));

    return {
      success: this.failedNodes.size === 0,
      processedNodes,
      failedNodes,
      recoveredNodes: Array.from(this.recoveredNodes),
      warnings: [...this.warnings],
    };
  }

  // Clear all execution state
  clearExecutionState(): void {
    this.processedImages.clear();
    this.processingNodes.clear();
    this.failedNodes.clear();
    this.recoveredNodes.clear();
    this.warnings = [];
  }

  // Clear all execution state and caches
  clearAllState(): void {
    this.clearExecutionState();
    this.clearCaches();
  }

  // Get error information for a specific node
  getNodeError(nodeId: string): WorkflowExecutionError | null {
    return this.failedNodes.get(nodeId) || null;
  }

  // Check if a node has failed
  hasNodeFailed(nodeId: string): boolean {
    return this.failedNodes.has(nodeId);
  }

  // Check if a node was recovered
  wasNodeRecovered(nodeId: string): boolean {
    return this.recoveredNodes.has(nodeId);
  }

  // Get all warnings from the last execution
  getWarnings(): string[] {
    return [...this.warnings];
  }

  // Execute individual node with comprehensive error handling
  private async executeNode(
    nodeId: string,
    nodeMap: Map<string, Node>,
    edgeMap: Map<string, Edge[]>,
    dependencies: Map<string, string[]>,
    targetNodeId: string
  ): Promise<string | null> {
    // Check if already processed (result caching)
    if (this.processedImages.has(nodeId)) {
      return this.processedImages.get(nodeId)!;
    }

    const node = nodeMap.get(nodeId);
    if (!node) {
      throw new WorkflowExecutionError(
        `Node ${nodeId} not found`,
        WorkflowErrorType.NODE_PROCESSING_ERROR,
        nodeId,
        undefined,
        false
      );
    }

    try {
      // Mark node as processing
      if (this.nodeProcessingCallback) {
        this.nodeProcessingCallback(nodeId, true);
      }

      // Use new comprehensive input collection system
      console.log(
        `Collecting inputs for node ${nodeId} using enhanced input detection`
      );
      const inputs = await this.collectNodeInputs(nodeId, nodeMap, edgeMap);

      // Perform comprehensive input validation
      const isValidInput = this.validateNodeInputs(node, inputs);
      if (!isValidInput) {
        const isCritical = this.isCriticalNode(
          node,
          targetNodeId,
          dependencies
        );
        const errorMessage = `Node ${nodeId} (${
          node.data?.type || node.type
        }) has invalid or missing required inputs`;

        if (isCritical) {
          throw new WorkflowExecutionError(
            errorMessage,
            WorkflowErrorType.VALIDATION_ERROR,
            nodeId,
            undefined,
            false
          );
        } else {
          this.warnings.push(errorMessage);
          console.warn(errorMessage);
        }
      }

      // Add debugging and logging for input detection and validation
      console.log(`Input validation results for node ${nodeId}:`, {
        nodeType: node.data?.type || node.type,
        inputCount: Object.keys(inputs).length,
        inputs: Object.keys(inputs),
        isValid: isValidInput,
        isCritical: this.isCriticalNode(node, targetNodeId, dependencies),
      });

      // Check for automatic ControlNet preprocessing before processing
      let processedInputs = inputs;
      if (
        this.isControlNetNode(node) &&
        this.shouldAutoPreprocess(node, inputs)
      ) {
        const preprocessorType = this.getPreprocessorType(node);
        console.log(
          `🎯 Triggering automatic ${preprocessorType} preprocessing for ControlNet node ${nodeId}`
        );

        // Check if any inputs are drag-and-drop files that need uploading
        const hasFileInputs = Object.values(inputs).some((input) =>
          input.startsWith("file:")
        );
        if (hasFileInputs) {
          console.log(
            `📁 Detected drag-and-drop image files for ControlNet preprocessing`
          );
        }

        try {
          processedInputs = await this.preprocessControlNetInputs(
            node,
            inputs,
            nodeMap
          );
          console.log(
            `✅ Automatic ${preprocessorType} preprocessing completed for node ${nodeId}`
          );
        } catch (preprocessError) {
          console.error(
            `❌ Automatic preprocessing failed for node ${nodeId}:`,
            preprocessError
          );

          // For non-critical nodes, continue with original inputs
          const isCritical = this.isCriticalNode(
            node,
            targetNodeId,
            dependencies
          );
          if (!isCritical) {
            this.warnings.push(
              `Automatic preprocessing failed for node ${nodeId}, continuing with original inputs`
            );
            processedInputs = inputs;
          } else {
            throw preprocessError;
          }
        }
      }

      // Route nodes to appropriate processing methods based on node data type or React Flow type
      let result: string | null = null;
      const nodeDataType = node.data?.type;

      // Handle drag-and-drop image nodes FIRST - be more flexible with detection
      const isImageNode =
        nodeDataType === "image-layer" ||
        node.type === "image-node" ||
        node.type === "image-layer" ||
        nodeDataType === "image-node" ||
        (node.id &&
          node.id.startsWith("image-") &&
          (node.data?.imageFile ||
            node.data?.imageUrl ||
            node.data?.right_sidebar?.imageUrl)) ||
        node.type === "previewNode" || // Add previewNode as image node type
        nodeDataType === "previewNode";

      if (isImageNode) {
        console.log(`Detected image node ${node.id}:`, {
          nodeType: node.type,
          nodeDataType: nodeDataType,
          hasImageData: !!(
            node.data?.imageFile ||
            node.data?.imageUrl ||
            node.data?.right_sidebar?.imageUrl ||
            node.data?.generatedImage
          ),
        });
      }

      if (isImageNode) {
        console.log(`Processing drag-and-drop image node ${node.id}`);
        result = await this.processImageInput(node);
      }
      // Handle specific node types from left_sidebar.ts
      else if (nodeDataType === "input-text") {
        result = await this.processTextInput(node);
      } else if (
        (nodeDataType as string)?.startsWith("control-net-") ||
        nodeDataType === "seed-image-lights"
      ) {
        result = await this.processControlNet(node, processedInputs);
      } else if ((nodeDataType as string)?.startsWith("image-to-image-")) {
        // Handle specific image-to-image operations that may not need engine
        if (nodeDataType === "image-to-image-reimagine") {
          result = await this.processReImagine(node, processedInputs);
        } else if (nodeDataType === "image-to-image-rescene") {
          result = await this.processReScene(node, processedInputs);
        } else if (nodeDataType === "image-to-image-relight") {
          result = await this.processReLight(node, processedInputs);
        } else if (nodeDataType === "image-to-image-reangle") {
          result = await this.processReAngle(node, processedInputs);
        } else if (nodeDataType === "image-to-image-remix") {
          result = await this.processReMix(node, processedInputs);
        } else {
          result = await this.processGeneration(node, processedInputs);
        }
      } else if ((nodeDataType as string)?.startsWith("engine-")) {
        result = await this.processEngine(node, processedInputs);
      } else if ((nodeDataType as string)?.startsWith("gear-")) {
        result = await this.processGear(node, processedInputs);
      } else if (
        nodeDataType === "previewNode" ||
        nodeDataType === "preview-image" ||
        nodeDataType === "preview-realtime-node"
      ) {
        result = await this.processOutput(node, processedInputs);
      } else if (nodeDataType === "connector") {
        // Router/connector nodes just pass through the first input
        result =
          processedInputs.default || Object.values(processedInputs)[0] || null;
      } else if (nodeDataType === "text-tool") {
        // Text tool nodes provide text data
        result = await this.processTextInput(node);
      } else {
        // Fallback to original type-based routing for backward compatibility
        switch (node.type) {
          case "imageInput":
            result = await this.processImageInput(node);
            break;
          case "textInput":
            result = await this.processTextInput(node);
            break;
          case "controlNet":
            result = await this.processControlNet(node, processedInputs);
            break;
          case "rerendering":
            result = await this.processGeneration(node, processedInputs);
            break;
          case "tool":
            result = await this.processTool(node, processedInputs);
            break;
          case "engine":
            result = await this.processEngine(node, processedInputs);
            break;
          case "gear":
            result = await this.processGear(node, processedInputs);
            break;
          case "output":
          case "previewNode":
            result = await this.processOutput(node, processedInputs);
            break;
          default:
            // Check if this might be an image node that wasn't caught earlier
            if (
              node.data?.imageFile ||
              node.data?.imageUrl ||
              node.data?.file ||
              node.data?.src ||
              node.data?.right_sidebar?.imageUrl
            ) {
              console.log(
                `Fallback: Processing potential image node ${node.id} with type ${node.type}`
              );
              result = await this.processImageInput(node);
            } else {
              throw new WorkflowExecutionError(
                `Unknown node type: ${node.type} with data type: ${nodeDataType}`,
                WorkflowErrorType.NODE_PROCESSING_ERROR,
                nodeId,
                undefined,
                true
              );
            }
        }
      }

      return result;
    } catch (error) {
      // Re-throw WorkflowExecutionError as-is
      if (error instanceof WorkflowExecutionError) {
        throw error;
      }

      // Wrap other errors in WorkflowExecutionError
      throw new WorkflowExecutionError(
        `Error executing node ${nodeId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        WorkflowErrorType.NODE_PROCESSING_ERROR,
        nodeId,
        error instanceof Error ? error : undefined,
        !this.isCriticalNode(node, targetNodeId, dependencies)
      );
    } finally {
      // Mark node as no longer processing
      if (this.nodeProcessingCallback) {
        this.nodeProcessingCallback(nodeId, false);
      }
    }
  }

  // Process image input node with simplified logic
  private async processImageInput(node: Node): Promise<string | null> {
    try {
      // Check for uploaded File object first
      if (node.data?.imageFile && node.data.imageFile instanceof File) {
        // Upload the image file to Runware and return the URL
        const uploadedUrl = await this.runwareService.uploadImageForURL(
          node.data.imageFile
        );
        console.log(
          `Successfully uploaded image for node ${node.id}: ${uploadedUrl}`
        );
        return uploadedUrl;
      }

      // Check for existing image URL
      if (node.data?.imageUrl && typeof node.data.imageUrl === "string") {
        console.log(
          `Image input node ${node.id} using existing URL: ${node.data.imageUrl}`
        );
        return node.data.imageUrl;
      }

      // Check for runware uploaded URL (from drag and drop)
      if (
        node.data?.runwareImageUrl &&
        typeof node.data.runwareImageUrl === "string"
      ) {
        console.log(
          `Image input node ${node.id} using Runware URL: ${node.data.runwareImageUrl}`
        );
        return node.data.runwareImageUrl;
      }

      // Check right sidebar image URL
      if (
        node.data?.right_sidebar?.imageUrl &&
        typeof node.data.right_sidebar.imageUrl === "string"
      ) {
        console.log(
          `Image input node ${node.id} using right sidebar URL: ${node.data.right_sidebar.imageUrl}`
        );
        return node.data.right_sidebar.imageUrl;
      }

      // Check for generatedImage (for preview nodes acting as inputs)
      if (
        node.data?.generatedImage &&
        typeof node.data.generatedImage === "string"
      ) {
        console.log(
          `Image input node ${node.id} using generated image: ${node.data.generatedImage}`
        );
        return node.data.generatedImage;
      }

      // Check for processed images from workflow execution (for preview nodes acting as inputs)
      const processedImage = this.processedImages.get(node.id);
      if (processedImage && typeof processedImage === "string") {
        console.log(
          `Image input node ${node.id} using processed image: ${processedImage}`
        );
        return processedImage;
      }

      console.warn(
        `Image input node ${node.id} has no valid image data available`
      );
      return null;
    } catch (error) {
      console.error(`Error processing image input node ${node.id}:`, error);
      throw new WorkflowExecutionError(
        `Failed to process image input: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        WorkflowErrorType.NODE_PROCESSING_ERROR,
        node.id,
        error instanceof Error ? error : undefined,
        true
      );
    }
  }

  // Enhanced image file extraction with multiple fallback locations
  private extractImageFileFromNode(node: Node): File | null {
    // Check primary locations for File objects
    const possibleFiles = [
      node.data?.imageFile,
      node.data?.file,
      node.data?.image,
      node.data?.content,
      node.data?.data,
    ];

    for (const file of possibleFiles) {
      if (file && file instanceof File) {
        return file;
      }
    }

    return null;
  }

  // Enhanced image URL extraction with multiple fallback locations
  private extractImageUrlFromNode(node: Node): string | null {
    // PRIORITY 1: Check for Runware uploaded URL first (from drag-and-drop strategy)
    if (
      node.data?.runwareImageUrl &&
      typeof node.data.runwareImageUrl === "string"
    ) {
      console.log(
        `Using Runware uploaded URL for node ${node.id}: ${node.data.runwareImageUrl}`
      );
      return node.data.runwareImageUrl;
    }

    // PRIORITY 2: Check for processed images from workflow execution (for preview nodes acting as inputs)
    const processedImage = this.processedImages.get(node.id);
    if (processedImage && typeof processedImage === "string") {
      console.log(
        `Using processed image for node ${node.id}: ${processedImage}`
      );
      return processedImage;
    }

    // PRIORITY 3: Check primary locations for URL strings
    const possibleUrls = [
      node.data?.generatedImage, // Add generatedImage as high priority for preview nodes
      node.data?.imageUrl,
      node.data?.url,
      node.data?.src,
      node.data?.backgroundImage,
      node.data?.image,
      node.data?.content,
      node.data?.right_sidebar?.imageUrl,
    ];

    for (const url of possibleUrls) {
      if (
        typeof url === "string" &&
        url.trim() &&
        (url.startsWith("http") ||
          url.startsWith("data:") ||
          url.startsWith("blob:"))
      ) {
        return url;
      }
    }

    return null;
  }

  // Fallback processing for image nodes that don't match standard patterns
  private processFallbackImageData(node: Node): string | null {
    // Check for data URLs in various locations
    const dataUrlSources = [
      node.data?.dataUrl,
      node.data?.base64,
      node.data?.imageData,
    ];

    for (const dataUrl of dataUrlSources) {
      if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/")) {
        return dataUrl;
      }
    }

    // Check for blob URLs
    const blobUrlSources = [node.data?.blobUrl, node.data?.objectUrl];

    for (const blobUrl of blobUrlSources) {
      if (typeof blobUrl === "string" && blobUrl.startsWith("blob:")) {
        return blobUrl;
      }
    }

    // Check for any string that looks like an image URL
    const allStringValues = Object.values(node.data || {}).filter(
      (value) => typeof value === "string"
    ) as string[];

    for (const value of allStringValues) {
      if (
        value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
        (value.includes("image") && value.startsWith("http"))
      ) {
        return value;
      }
    }

    return null;
  }

  // Process text input node - extract and pass text data between connected nodes
  private async processTextInput(node: Node): Promise<string | null> {
    // Text input nodes provide text data for use by other nodes
    const prompt = node?.data?.right_sidebar?.prompt;
    if (typeof prompt === "string" && prompt.trim()) {
      return prompt;
    }
    return null;
  }

  private async processControlNet(
    node: Node,
    _inputs: Record<string, string>
  ): Promise<string | null> {
    const d: any = node.data || {};
    // Prefer the persisted preprocessed image; fall back to any image the node already owns (e.g., Rive pose)
    const guide =
      d?.preprocessedImage?.guideImageURL ||
      d?.preprocessedImage?.imageURL ||
      d?.right_sidebar?.preprocessedImage ||
      d?.guideImageURL ||
      d?.imageUrl;

    return typeof guide === "string" && guide.length ? guide : null;
  }

  // Process generation nodes (re-imagine, reference, re-scene, etc.)
  private async processGeneration(
    node: Node,
    inputs: Record<string, string>
  ): Promise<string | null> {
    try {
      const nodeDataType = node.data?.type || node.type;
      const { rerenderingType } = node.data;

      // Map specific node types to rerendering types
      let processType = rerenderingType;
      if (nodeDataType === "image-to-image-reimagine") {
        processType = "reimagine";
      } else if (nodeDataType === "image-to-image-rescene") {
        processType = "rescene";
      } else if (nodeDataType === "image-to-image-object-relight") {
        processType = "relight";
      } else if (nodeDataType === "image-to-image-reangle") {
        processType = "reangle";
      } else if (nodeDataType === "image-to-image-remix") {
        processType = "remix";
      } else if (nodeDataType === "image-to-image-remove-bg") {
        return await this.processRemoveBackground(
          node,
          inputs.default || Object.values(inputs)[0]
        );
      } else if (nodeDataType === "image-to-image-upscale") {
        return await this.processUpscale(
          node,
          inputs.default || Object.values(inputs)[0]
        );
      } else if (nodeDataType === "image-to-image-inpainting") {
        return await this.processInpaint(
          node,
          inputs.default || Object.values(inputs)[0]
        );
      } else if (nodeDataType === "image-to-image-remove-outpainting") {
        return await this.processOutpaint(
          node,
          inputs.default || Object.values(inputs)[0]
        );
      } else if (nodeDataType === "image-to-image-merger") {
        return await this.processReMix(node, inputs);
      }

      switch (processType) {
        case "reimagine":
          return await this.processReImagine(node, inputs);
        case "rescene":
          return await this.processReScene(node, inputs);
        case "reangle":
          return await this.processReAngle(node, inputs);
        case "remix":
          return await this.processReMix(node, inputs);
        case "relight":
          return await this.processReLight(node, inputs);
        default:
          throw new Error(
            `Unknown rerendering type: ${processType} for node type: ${nodeDataType}`
          );
      }
    } catch (error) {
      console.error(`Error processing generation node ${node.id}:`, error);
      throw error;
    }
  }

  // Simplified Re-imagine processing - connects directly to output
  private async processReImagine(
    node: Node,
    inputs: Record<string, string>
  ): Promise<string | null> {
    const seedImage = inputs.default || Object.values(inputs)[0];
    if (!seedImage) return null;

    const nd: any = node.data || {};
    const strength = nd.strength ?? nd.right_sidebar?.creativity ?? 0.6;

    // Discover upstream nodes (Engine/Gear) to collect model + LoRAs
    const { nodes, edges } = useWorkflowStore.getState();
    const upstream = edges
      .filter((e) => e.target === node.id)
      .map((e) => nodes.find((n) => n.id === e.source))
      .filter(Boolean) as Node[];

    const engineNode = upstream.find(
      (n) =>
        n.type === "engine" ||
        ((n.data as any)?.type || "").startsWith("engine-")
    );
    const engineData: any = engineNode?.data || {};

    // Prefer node.data.model, then engine.model, fallback to existing default
    const modelAIR =
      nd.model || engineData.model || engineData.modelAIR || "runware:101@1";

    // Gather LoRAs from engine.data.lora and any Gear nodes upstream
    const loras: Array<{ model: string; weight: number }> = [];
    const pushLora = (x: any) => {
      if (!x) return;
      if (typeof x === "string") loras.push({ model: x, weight: 1 });
      else if (Array.isArray(x)) x.forEach(pushLora);
      else if (x.model)
        loras.push({
          model: x.model,
          weight: typeof x.weight === "number" ? x.weight : 1,
        });
    };
    pushLora(engineData.lora);
    upstream
      .filter(
        (n) =>
          n.type === "gear" || ((n.data as any)?.type || "").startsWith("gear-")
      )
      .forEach((g) => this.extractLoRAAIRIdentifiers(g).forEach(pushLora));
    const dedupedLoras = Array.from(
      new Map(loras.map((l) => [l.model, l])).values()
    );

    // Carry over width/height/steps/etc. from Engine if present
    const engineParams = {
      width: engineData.width || engineData.right_sidebar?.width,
      height: engineData.height || engineData.right_sidebar?.height,
      steps: engineData.steps || engineData.right_sidebar?.steps,
      cfgScale: engineData.CFGScale || engineData.right_sidebar?.cfgScale,
      seed: engineData.seed || engineData.right_sidebar?.seed,
    };

    // Let the unified i2i path handle the call + store updates
    return await this.executeImageToImageWorkflow(
      nd.positivePrompt ||
        nd.prompt ||
        this.extractRightSidebarData(node)?.prompt ||
        "re-imagine image",
      seedImage,
      strength,
      modelAIR,
      dedupedLoras,
      this.extractControlNetInputs(inputs),
      engineParams
    );
  }

  // Simplified Re-scene processing
  private async processReScene(
    node: Node,
    inputs: Record<string, string>
  ): Promise<string | null> {
    const inputImages = Object.values(inputs).filter(Boolean);
    if (inputImages.length < 2) return null;

    console.log(
      `🏠 Re-scene node ${node.id} with ${inputImages.length} images`
    );

    // Use flux kontext for re-scene
    const params = {
      positivePrompt: "blend this image to that scene",
      model: "bfl:3@1", // Flux Kontext
      width: 1024,
      height: 1024,
      numberResults: 1,
      outputFormat: "JPEG",
      includeCost: true,
      outputType: ["URL"],
      referenceImages: inputImages,
    };

    const result = await this.runwareService.generateImage(params);
    return result.imageURL;
  }

  // Simplified Re-light processing
  private async processReLight(
    node: Node,
    inputs: Record<string, string>
  ): Promise<string | null> {
    const inputImage = inputs.default || Object.values(inputs)[0];
    if (!inputImage) return null;

    // Get seed image from rive light node
    const nd: any = node.data || {};
    const seedImage = nd.imageUrl || nd.right_sidebar?.imageUrl;

    console.log(`💡 Re-light node ${node.id}`);

    if (!seedImage) {
      // No seed image, use flux kontext with single image
      const params = {
        positivePrompt: "apply that light to that image",
        model: "bfl:3@1",
        width: 1024,
        height: 1024,
        numberResults: 1,
        outputFormat: "JPEG",
        includeCost: true,
        outputType: ["URL"],
        referenceImages: [inputImage],
      };

      const result = await this.runwareService.generateImage(params);
      return result.imageURL;
    }

    // Use seed image for image-to-image
    const params = {
      positivePrompt: "apply that light to that image",
      model: "civitai:139562@297320",
      seedImage: seedImage,
      height: 1024,
      width: 1024,
      strength: 0.7,
      numberResults: 1,
    };

    const result = await this.runwareService.generateImage(params);
    return result.imageURL;
  }

  // Simplified Re-angle processing
  private async processReAngle(
    node: Node,
    inputs: Record<string, string>
  ): Promise<string | null> {
    const inputImage = inputs.default || Object.values(inputs)[0];
    if (!inputImage) return null;

    const nd: any = node.data || {};
    const degrees = nd.degrees || 15;
    const direction = nd.direction || "right";

    console.log(`📐 Re-angle node ${node.id}: ${degrees}° ${direction}`);

    const params = {
      positivePrompt: `obtain this angle from this degree: ${degrees}° ${direction}`,
      model: "bfl:3@1", // Flux Kontext
      width: 1024,
      height: 1024,
      numberResults: 1,
      outputFormat: "JPEG",
      includeCost: true,
      outputType: ["URL"],
      referenceImages: [inputImage],
    };

    const result = await this.runwareService.generateImage(params);
    return result.imageURL;
  }

  // Simplified Remix processing
  private async processReMix(
    node: Node,
    inputs: Record<string, string>
  ): Promise<string | null> {
    const inputImages = Object.values(inputs).filter(Boolean);
    if (inputImages.length === 0) return null;

    console.log(`🎵 Remix node ${node.id} with ${inputImages.length} images`);

    const params = {
      positivePrompt: "__BLANK__",
      model: "runware:101@1",
      height: 1024,
      width: 1024,
      ipAdapters: inputImages.map((imageUrl) => ({
        model: "runware:105@1",
        guideImage: imageUrl,
        weight: 1.0,
      })),
      numberResults: 1,
    };

    const result = await this.runwareService.generateImage(params);
    return result.imageURL;
  }

  // Process tool nodes (remove-bg, upscale, inpaint, outpaint)
  private async processTool(
    node: Node,
    inputs: Record<string, string>
  ): Promise<string | null> {
    try {
      const { toolType } = node.data;
      const inputImage = inputs.default;

      if (!inputImage) {
        throw new Error("Tool node missing input image");
      }

      switch (toolType) {
        case "removebg":
          return await this.processRemoveBackground(node, inputImage);
        case "upscale":
          return await this.processUpscale(node, inputImage);
        case "inpaint":
          return await this.processInpaint(node, inputImage);
        case "outpaint":
          return await this.processOutpaint(node, inputImage);
        default:
          throw new Error(`Unknown tool type: ${toolType}`);
      }
    } catch (error) {
      console.error(`Error processing tool node ${node.id}:`, error);
      throw error;
    }
  }

  private getNearestImageLayerUrl(start: Node): string | null {
    const nodes = useWorkflowStore.getState().nodes;
    const edges = useWorkflowStore.getState().edges;
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const seen = new Set<string>();
    const stack = [start.id];

    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);

      // walk incoming edges only (upstream)
      const incoming = edges.filter(e => e.target === cur);
      for (const e of incoming) {
        const src = nodeById.get(e.source);
        if (!src) continue;

        const t = ((src.data?.type || src.type || '') + '').toLowerCase();
        const isImageLayer = t.includes('image-layer') || t.includes('image-node');

        if (isImageLayer) {
          const url =
            src.data?.right_sidebar?.imageUrl ||
            src.data?.imageUrl ||
            src.data?.runwareImageUrl ||
            src.data?.image;
          if (typeof url === 'string' && url) return url;
        }
        stack.push(src.id);
      }
    }
    return null;
  }

  private async processInpaint(node: Node, inputImage: string): Promise<string | null> {
    const { maskImage } = node.data;
    if (typeof maskImage !== 'string') throw new Error('Inpaint node missing mask image');

    // force seed to ORIGINAL image-layer if available
    const originalSeed = this.getNearestImageLayerUrl(node) || inputImage;

    const allEdges = useWorkflowStore.getState().edges;
    const allNodes = useWorkflowStore.getState().nodes;

    // upstream of the current node
    const incoming = allEdges.filter((e) => e.target === node.id);
    const upstream = incoming
      .map((e) => allNodes.find((n) => n.id === e.source))
      .filter(Boolean) as Node[];

    // get positive prompt from the upstream text node or node data as fallback
    const textNode = upstream.find(n => {
      const nodeType = (n.type || '').toLowerCase();
      const dataType = (((n.data as any)?.type) || '').toLowerCase();
      return nodeType.includes('text') || dataType.includes('text');
    });
    const nodeData: any = node.data || {};
    const prompt =
      (textNode?.data as any)?.right_sidebar?.prompt ??
      nodeData.positivePrompt ??
      nodeData.prompt ??
      '__BLANK__';
          
    const result = await this.runwareService.inpaintImage({
      positivePrompt: prompt,
      seedImage: originalSeed,
      maskImage
    });
    return result.imageURL;
  }

  private async processOutpaint(node: Node, inputImage: string): Promise<string | null> {
    const originalSeed = this.getNearestImageLayerUrl(node) || inputImage;
    const { outpaintDirection, outpaintAmount } = node.data;

    const direction =
      typeof outpaintDirection === 'string' &&
      ['up', 'down', 'left', 'right', 'all'].includes(outpaintDirection)
        ? (outpaintDirection as 'up' | 'down' | 'left' | 'right' | 'all')
        : 'all';
    const amount = typeof outpaintAmount === 'number' ? outpaintAmount : 50;

    const result = await this.runwareService.outpaintImage({
      positivePrompt: 'Extend the image naturally',
      inputImage: originalSeed,
      outpaintDirection: direction,
      outpaintAmount: amount
    });
    return result.imageURL;
  }

  // Process remove background tool with caching
  private async processRemoveBackground(
    node: Node,
    inputImage: string
  ): Promise<string | null> {
    const cacheParams = { inputImage };
    const cachedResult = this.getCachedResult("remove_background", cacheParams);
    if (cachedResult) {
      console.log(`Using cached background removal result for node ${node.id}`);
      return cachedResult;
    }

    const result = await this.runwareService.removeBackground({
      inputImage: inputImage,
    });

    // Cache the result
    this.cacheResult("remove_background", cacheParams, result.imageURL);

    return result.imageURL;
  }

  // Process upscale tool with caching
  private async processUpscale(
    node: Node,
    inputImage: string
  ): Promise<string | null> {
    const upscaleFactor =
      typeof node.data.upscaleFactor === "number" &&
      [2, 3, 4].includes(node.data.upscaleFactor)
        ? (node.data.upscaleFactor as 2 | 3 | 4)
        : 2;

    const cacheParams = { inputImage, upscaleFactor };
    const cachedResult = this.getCachedResult("upscale", cacheParams);
    if (cachedResult) {
      console.log(`Using cached upscale result for node ${node.id}`);
      return cachedResult;
    }

    const result = await this.runwareService.upscaleImage({
      inputImage: inputImage,
      upscaleFactor,
    });

    // Cache the result
    this.cacheResult("upscale", cacheParams, result.imageURL);

    return result.imageURL;
  }

  private async processEngine(
    node: Node,
    _inputs: Record<string, string>
  ): Promise<string | null> {
    console.log(`🔧 Processing engine node ${node.id} with data:`, node.data);

    const allNodes = useWorkflowStore.getState().nodes;
    const allEdges = useWorkflowStore.getState().edges;

    // upstream of the engine
    const incoming = allEdges.filter((e) => e.target === node.id);
    const upstream = incoming
      .map((e) => allNodes.find((n) => n.id === e.source))
      .filter(Boolean) as Node[];

    console.log(
      `🔗 Found ${upstream.length} upstream nodes:`,
      upstream.map((n) => ({
        id: n.id,
        type: n.type,
        dataType: (n.data as any)?.type,
      }))
    );

    // find upstream inpaint/outpaint nodes
    const inpaintNode = upstream.find(n => {
      const t = ((n.data as any)?.type || n.type || '').toLowerCase();
      return t.includes('inpaint') || (n.data as any)?.maskImage;
    });

    const outpaintNode = upstream.find(n => {
      const t = ((n.data as any)?.type || n.type || '').toLowerCase();
      return t.includes('outpaint');
    });

    // Find a reasonable seed image from upstream image-like nodes
    const seedCandidate = upstream.find(n => this.isImageInputNode(n));
    const upstreamSeedImage =
      (seedCandidate && (this.processedImages.get(seedCandidate.id) ||
       this.extractImageUrlFromNode(seedCandidate))) || null;

    // get positive prompt from the upstream text node or engine data as fallback
    const textNode = upstream.find(n => {
      const nodeType = (n.type || '').toLowerCase();
      const dataType = (((n.data as any)?.type) || '').toLowerCase();
      return nodeType.includes('text') || dataType.includes('text');
    });
    const engineData: any = node.data || {};
    const positivePrompt =
      (textNode?.data as any)?.right_sidebar?.prompt ??
      engineData.positivePrompt ??
      engineData.prompt ??
      '__BLANK__';

    if (inpaintNode && upstreamSeedImage) {
      const maskImage = (inpaintNode.data as any).maskImage;
      if (typeof maskImage === 'string' && maskImage) {
        const originalSeed = this.getNearestImageLayerUrl(inpaintNode) || upstreamSeedImage;
        const result = await this.runwareService.inpaintImage({
          positivePrompt,
          seedImage: originalSeed,
          maskImage
        });
        return result.imageURL; // EARLY RETURN
      }
    }

    if (outpaintNode && upstreamSeedImage) {
      const { outpaintDirection, outpaintAmount } = (outpaintNode.data as any);
      const direction = outpaintDirection || 'all';
      const amount = typeof outpaintAmount === 'number' ? outpaintAmount : 50;

      const originalSeed = this.getNearestImageLayerUrl(outpaintNode) || upstreamSeedImage;
      const result = await this.runwareService.outpaintImage({
        positivePrompt: 'Extend the image naturally',
        inputImage: originalSeed,             // <- see #2
        outpaintDirection: direction,         // <- see #2
        outpaintAmount: amount                // <- see #2
      });
      return result.imageURL; // EARLY RETURN
    }

    // --- PROMPTS (from Text Prompt node data, or engine data) ---
    const textNode2 = upstream.find((n) => {
      const nodeType = n.type || "";
      const dataType = (n.data as any)?.type || "";
      return (
        nodeType.toLowerCase().includes("text") ||
        dataType.toLowerCase().includes("text")
      );
    });

    const tData: any = textNode2?.data || {};
    const pos =
      tData.positive ??
      tData.right_sidebar.prompt ??
      tData.text ??
      (node.data as any)?.positivePrompt ??
      (node.data as any)?.prompt ??
      "Generate an image, please";
    const neg =
      tData.negative ?? (node.data as any)?.negativePrompt ?? undefined;

    console.log(
      `📝 Extracted prompts - Positive: "${pos}", Negative: "${neg || "none"}"`
    );

    // --- MODEL & BASIC PARAMS (from engine node data ONLY) ---
    const nd: any = node.data || {};

    // Extract model from engine node data - check multiple possible locations
    const model =
      nd.model ||
      nd.modelAIR ||
      nd.selectedModel ||
      nd.right_sidebar?.model ||
      "runware:101@1";

    // Extract dimensions and generation params from engine node
    const width = nd.width || nd.right_sidebar?.width || 1024;
    const height = nd.height || nd.right_sidebar?.height || 1024;
    const steps = nd.steps || nd.right_sidebar?.steps || 28;
    const CFGScale =
      nd.cfgScale || nd.CFGScale || nd.right_sidebar?.cfgScale || 3.5;
    const scheduler =
      nd.scheduler ||
      nd.right_sidebar?.scheduler ||
      "FlowMatchEulerDiscreteScheduler";
    const seed = nd.seed || nd.right_sidebar?.seed || null;
    const strength = nd.strength || nd.right_sidebar?.strength || 0.7;

    console.log(
      `⚙️ Engine params - Model: ${model}, Size: ${width}x${height}, Steps: ${steps}, CFG: ${CFGScale}`
    );

    // --- CONTROLNET (from ControlNet nodes' persisted guides) ---
    const controlNetNodes = upstream.filter((n) => {
      const nodeType = n.type || "";
      const dataType = (n.data as any)?.type || "";
      return (
        (nodeType.toLowerCase().includes("control") ||
          dataType.toLowerCase().includes("control")) &&
        !dataType.includes("seed-image-lights")
      ); // Exclude seed-image-lights
    });

    console.log(
      `🎛️ Found ${controlNetNodes.length} ControlNet nodes:`,
      controlNetNodes.map((n) => ({
        id: n.id,
        type: n.type,
        dataType: (n.data as any)?.type,
      }))
    );

    const controlNet = controlNetNodes
      .map((n) => {
        const d: any = n.data || {};
        const dataType = d.type || "";

        const guide =
          d?.preprocessedImage?.guideImageURL ||
          d?.preprocessedImage?.imageURL ||
          d?.right_sidebar?.preprocessedImage ||
          d?.guideImageURL ||
          d?.imageUrl;

        if (!guide) {
          console.warn(`❌ ControlNet node ${n.id} has no guide image`);
          return null;
        }

        console.log(
          `✅ ControlNet node ${n.id} has guide: ${guide.substring(0, 50)}...`
        );

        // Map node type to ControlNet model ID according to specification
        const nodeType = dataType.toLowerCase();
        let cnModel = "runware:25@1"; // canny/edge default

        if (nodeType.includes("pose")) cnModel = "runware:29@1";
        else if (nodeType.includes("depth")) cnModel = "runware:27@1";
        else if (nodeType.includes("segments") || nodeType.includes("seg"))
          cnModel = "runware:28@1";
        else if (nodeType.includes("normal")) cnModel = "runware:29@1";
        else if (nodeType.includes("edge") || nodeType.includes("canny"))
          cnModel = "runware:25@1";

        console.log(`🎯 ControlNet ${n.id}: ${nodeType} → model ${cnModel}`);

        return {
          model: cnModel,
          guideImage: guide as string,
          weight: typeof d.weight === "number" ? d.weight : 0.8,
          startStep: typeof d.startStep === "number" ? d.startStep : 0,
          endStep:
            typeof d.endStep === "number" ? d.endStep : Math.max(1, steps - 1),
          controlMode: (d.controlMode as any) || "balanced",
        };
      })
      .filter(Boolean) as Array<{
      model: string;
      guideImage: string;
      weight: number;
      startStep: number;
      endStep: number;
      controlMode: "balanced" | "prompt" | "controlnet";
    }>;

    console.log(`🎛️ Final ControlNet array:`, controlNet);

    // --- LORAS (from engine node data ONLY, per specification) ---
    // Extract LoRAs from engine node data with comprehensive fallback checks
    const engineLorasRaw =
      nd.lora ||
      nd.loras ||
      nd.selectedLoras ||
      nd.right_sidebar?.lora ||
      nd.right_sidebar?.loras ||
      nd.right_sidebar?.selectedLoras ||
      [];

    console.log(`📦 Raw LoRA data from engine node:`, engineLorasRaw);
    console.log(
      `📦 Full engine node data for debugging:`,
      JSON.stringify(nd, null, 2)
    );

    const normLora = (val: any) => {
      if (!val) return null;
      if (typeof val === "object") {
        const model =
          val.model || val.modelAIR || val.id || val.name || val.value;
        if (!model) {
          console.warn("LoRA object missing model identifier:", val);
          return null;
        }
        return {
          model: model,
          weight: typeof val.weight === "number" ? val.weight : 1.0,
        };
      }
      if (typeof val === "string" && val.trim()) {
        return {
          model: val.trim(),
          weight: 1.0,
        };
      }
      return null;
    };

    const engineLoras = (
      Array.isArray(engineLorasRaw) ? engineLorasRaw : [engineLorasRaw]
    )
      .map(normLora)
      .filter(Boolean) as Array<{ model: string; weight: number }>;

    console.log(`📦 Processed LoRAs from engine node:`, engineLoras);

    // Note: Gear nodes are legacy - engine node data is the primary source for LoRAs
    // But we still check for backward compatibility
    const gearNodes = upstream.filter((n) => {
      const nodeType = n.type || "";
      const dataType = (n.data as any)?.type || "";
      return (
        nodeType.toLowerCase().includes("gear") ||
        dataType.toLowerCase().includes("gear")
      );
    });

    console.log(
      `⚙️ Found ${gearNodes.length} gear nodes:`,
      gearNodes.map((n) => ({
        id: n.id,
        type: n.type,
        dataType: (n.data as any)?.type,
      }))
    );

    const gearLoras = gearNodes
      .map((n) => {
        const gd: any = n.data || {};
        const model = gd.loraModel || gd.model || gd.modelAIR;
        if (!model) return null;
        console.log(
          `🎯 Gear ${n.id}: LoRA ${model} weight ${gd.weight || 1.0}`
        );
        return {
          model,
          weight: typeof gd.weight === "number" ? gd.weight : 1.0,
        };
      })
      .filter(Boolean) as Array<{ model: string; weight: number }>;

    // Combine engine LoRAs with gear LoRAs (engine takes priority as per specification)
    const loraMap = new Map(
      [...gearLoras, ...engineLoras].map((x) => [x.model, x])
    );
    const lora = Array.from(loraMap.values());

    console.log(`📦 Final LoRA array (engine data prioritized):`, lora);

    // --- SEED IMAGE (from seed-image-lights nodes) ---
    const seedImageNodes = upstream.filter((n) => {
      const dataType = (n.data as any)?.type || "";
      return dataType === "seed-image-lights";
    });

    let seedImage = null;
    if (seedImageNodes.length > 0) {
      const seedNode = seedImageNodes[0];
      const sd: any = seedNode.data || {};
      // Use Rive-generated image as seed image for image-to-image
      seedImage =
        sd?.imageUrl || sd?.right_sidebar?.imageUrl || sd?.riveImageUrl;
      console.log(
        `🌱 Found seed image from ${seedNode.id}: ${seedImage?.substring(
          0,
          50
        )}...`
      );
    }

    // --- FINAL PARAMS (following specification examples) ---
    const params: any = {
      taskType: "imageInference",
      positivePrompt: pos,
      model, // From engine node data as specified
      width,
      height,
      numberResults: 1,
      outputFormat: "WEBP",
      outputType: ["URL"],
    };

    // Add optional parameters based on specification
    if (neg) params.negativePrompt = neg;
    if (seed) params.seed = seed;

    // Standard generation parameters (not for Flux Kontext)
    if (!model.includes("bfl:") && !model.includes("kontext")) {
      params.steps = steps;
      params.CFGScale = CFGScale;
      if (scheduler) params.scheduler = scheduler;
    }

    // LoRAs from engine node data as specified
    if (lora.length) {
      params.lora = lora;
      console.log(`📦 Adding LoRAs from engine data:`, lora);
    }

    // ControlNet from persisted preprocessed images
    if (controlNet.length) {
      params.controlNet = controlNet;
      console.log(`🎛️ Adding ControlNet:`, controlNet);
    }

    // Seed image for image-to-image generation
    if (seedImage) {
      params.seedImage = seedImage;
      params.strength = strength;
      console.log(`🌱 Using seed image with strength: ${strength}`);
    }

    console.log(
      `🚀 Final API params (model and LoRA from engine data):`,
      JSON.stringify(params, null, 2)
    );

    const result = await this.runwareService.generateImage(params);
    return result?.imageURL ?? null;
  }

  /**
   * Detect workflow pattern based on inputs and node configuration
   */
  private detectWorkflowPattern(
    inputs: Record<string, string>,
    nodeParams: any
  ): {
    type:
      | "flux-kontext"
      | "image-to-image"
      | "text-to-image"
      | "tool-enhanced"
      | "standard";
    referenceImages?: string[];
    seedImage?: string;
    controlNets?: any[];
    hasLoras?: boolean;
  } {
    const hasReferenceImages =
      nodeParams.contextMenuData?.referenceImages?.length > 0;
    const hasSeedImage = !!(
      inputs.seed ||
      inputs.light ||
      inputs.image ||
      inputs.seedImage
    );
    const hasControlNets = Object.keys(inputs).some(
      (key) => key.includes("controlnet") || key.includes("control")
    );
    const hasLoras = nodeParams.loraAIRs?.length > 0;

    // Extract reference images from inputs or node data
    const referenceImages: string[] = [];
    if (nodeParams.contextMenuData?.referenceImages) {
      referenceImages.push(...nodeParams.contextMenuData.referenceImages);
    }

    // Check for reference images in inputs
    Object.entries(inputs).forEach(([key, value]) => {
      if (key.includes("reference") && value) {
        referenceImages.push(value);
      }
    });

    if (hasReferenceImages || referenceImages.length > 0) {
      return {
        type: "flux-kontext",
        referenceImages,
        hasLoras,
      };
    }

    if (hasSeedImage) {
      return {
        type: "image-to-image",
        seedImage:
          inputs.seed || inputs.light || inputs.image || inputs.seedImage,
        controlNets: hasControlNets
          ? this.extractControlNetInputs(inputs)
          : undefined,
        hasLoras,
      };
    }

    if (hasControlNets || hasLoras) {
      return {
        type: "tool-enhanced",
        controlNets: hasControlNets
          ? this.extractControlNetInputs(inputs)
          : undefined,
        hasLoras,
      };
    }

    return {
      type: "text-to-image",
      hasLoras,
    };
  }

  /**
   * Handle Flux Kontext workflow pattern
   */
  private async handleFluxKontextPattern(
    prompt: string,
    pattern: any,
    nodeParams: any
  ): Promise<string> {
    console.log("🌌 Processing Flux Kontext pattern");

    const params: any = {
      positivePrompt: prompt,
      referenceImages: pattern.referenceImages,
      model: nodeParams.modelAIR || "runware:100@1",
    };

    // Add LoRA configurations if available
    if (pattern.hasLoras && nodeParams.loraAIRs.length > 0) {
      params.lora = nodeParams.loraAIRs;
    }

    // Use appropriate Flux Kontext method based on version
    const result = await this.runwareService.generateFluxKontext(params);
    return result.imageURL;
  }

  /**
   * Handle Image-to-Image workflow pattern
   */
  private async handleImageToImagePattern(
    prompt: string,
    inputs: Record<string, string>,
    pattern: any,
    nodeParams: any
  ): Promise<string> {
    console.log("🖼️ Processing Image-to-Image pattern");

    const params: any = {
      positivePrompt: prompt,
      seedImage: pattern.seedImage,
      strength:
        nodeParams.rightSidebarData?.creativity ||
        nodeParams.rightSidebarData?.strength ||
        0.8,
      model: nodeParams.modelAIR || "runware:100@1",
      width: 1024,
      height: 1024,
      steps: 30,
      CFGScale: 7.5,
    };

    // Add LoRA configurations
    if (pattern.hasLoras && nodeParams.loraAIRs.length > 0) {
      params.lora = nodeParams.loraAIRs;
    }

    // Add ControlNet configurations
    if (pattern.controlNets && pattern.controlNets.length > 0) {
      params.controlNet = pattern.controlNets;
    }

    const result = await this.runwareService.generateImage(params);
    return result.imageURL;
  }

  /**
   * Handle Text-to-Image workflow pattern
   */
  private async handleTextToImagePattern(
    prompt: string,
    pattern: any,
    nodeParams: any
  ): Promise<string> {
    console.log("🎨 Processing Text-to-Image pattern");

    const params: any = {
      positivePrompt: prompt,
      model: nodeParams.modelAIR || "runware:100@1",
      width: 1024,
      height: 1024,
      steps: 30,
      CFGScale: 7.5,
    };

    // Add LoRA configurations
    if (pattern.hasLoras && nodeParams.loraAIRs.length > 0) {
      params.lora = nodeParams.loraAIRs;
    }

    const result = await this.runwareService.generateImage(params);
    return result.imageURL;
  }

  /**
   * Handle Tool-Enhanced workflow pattern
   */
  private async handleToolEnhancedPattern(
    prompt: string,
    inputs: Record<string, string>,
    pattern: any,
    nodeParams: any
  ): Promise<string> {
    console.log("🛠️ Processing Tool-Enhanced pattern");

    const params: any = {
      positivePrompt: prompt,
      model: nodeParams.modelAIR || "runware:100@1",
      width: 1024,
      height: 1024,
      steps: 30,
      CFGScale: 7.5,
    };

    // Add LoRA configurations
    if (pattern.hasLoras && nodeParams.loraAIRs.length > 0) {
      params.lora = nodeParams.loraAIRs;
    }

    // Add ControlNet configurations
    if (pattern.controlNets && pattern.controlNets.length > 0) {
      params.controlNet = pattern.controlNets;
    }

    const result = await this.runwareService.generateImage(params);
    return result.imageURL;
  }

  /**
   * Handle standard generation (fallback)
   */
  private async handleStandardGeneration(
    prompt: string,
    inputs: Record<string, string>,
    nodeParams: any,
    engineParams: any
  ): Promise<string> {
    console.log("⚙️ Processing Standard generation");

    // Extract ControlNet configurations from connected controlNet nodes
    const controlNetInputs = this.extractControlNetInputs(inputs);

    // Extract seed image from various input sources (light control, image inputs, etc.)
    const seedImage =
      inputs.seed || inputs.light || inputs.image || inputs.seedImage;

    // Build generation parameters using extracted AIR identifiers
    const params: any = {
      positivePrompt: prompt,
      model: nodeParams.modelAIR || "runware:100@1",
      width: engineParams.width,
      height: engineParams.height,
      steps: engineParams.steps,
      CFGScale: engineParams.cfgScale,
    };

    // Add optional parameters
    if (typeof engineParams.strength === "number")
      params.strength = engineParams.strength;
    if (nodeParams.loraAIRs.length > 0) params.lora = nodeParams.loraAIRs;
    if (controlNetInputs.length > 0) params.controlNet = controlNetInputs;
    if (seedImage) params.seedImage = seedImage;

    console.log("Engine node generating with params:", params);
    console.log("Extracted AIR identifiers:", {
      model: nodeParams.modelAIR,
      loras: nodeParams.loraAIRs,
    });

    const result = await this.runwareService.generateImage(params);
    return result.imageURL;
  }

  /**
   * Extract ControlNet inputs from connections
   */
  private extractControlNetInputs(inputs: Record<string, string>): Array<any> {
    return Object.entries(inputs).flatMap(([key, url]) => {
      const k = key.toLowerCase();
      if (!k.includes("control")) return [];

      // Simple heuristic from handle name / key
      let model = "runware:25@1"; // canny default
      if (k.includes("pose")) model = "runware:29@1";
      else if (k.includes("depth")) model = "runware:27@1";
      else if (k.includes("segment") || k.includes("seg"))
        model = "runware:28@1";
      else if (k.includes("normal")) model = "civitai:161957@182330";

      return [
        {
          model,
          guideImage: url,
          weight: 1.0,
          startStep: 0,
          endStep: 1000,
          controlMode: "balanced",
        },
      ];
    });
  }

  /**
   * Public method to execute workflow with automatic pattern detection
   * This is the main entry point for workflow execution with enhanced features
   */
  async executeWorkflowWithPatternDetection(
    nodes: Node[],
    edges: Edge[],
    targetNodeId: string
  ): Promise<{
    result: string | null;
    workflowPattern: string;
    executionSummary: {
      successful: number;
      total: number;
      failed: number;
      recovered: number;
      warnings: number;
    };
  }> {
    try {
      console.log(
        "🚀 Starting enhanced workflow execution with pattern detection"
      );

      // First, try auto-detection
      const autoResult = await this.executeAutoWorkflow(
        nodes,
        edges,
        targetNodeId
      );

      // Execute the standard workflow for comprehensive processing
      const result = await this.executeWorkflow(nodes, edges, targetNodeId);

      return {
        result: result || autoResult.result,
        workflowPattern: autoResult.workflowType,
        executionSummary: {
          successful: Array.from(this.processedImages.keys()).length,
          total: nodes.length,
          failed: this.failedNodes.size,
          recovered: this.recoveredNodes.size,
          warnings: this.warnings.length,
        },
      };
    } catch (error) {
      console.error("❌ Enhanced workflow execution failed:", error);
      throw error;
    }
  }
  private async processGear(
    node: Node,
    _inputs: Record<string, string>
  ): Promise<string | null> {
    // Extract LoRA AIR identifiers using the new extraction method
    const nodeParams = this.extractNodeParameters(node);

    if (nodeParams.loraAIRs.length > 0) {
      console.log(
        `Gear node ${node.id} configured with LoRAs:`,
        nodeParams.loraAIRs
      );

      // Store LoRA configuration for potential use by connected engine nodes
      // The LoRA data will be extracted by engine nodes when they process
      nodeParams.loraAIRs.forEach((lora) => {
        console.log(`  - LoRA AIR: ${lora.model}, weight: ${lora.weight}`);
      });
    } else {
      console.warn(`Gear node ${node.id} has no valid LoRA configuration`);
    }

    return null;
  }

  // Process output node - handle final result display and image URL extraction
  private async processOutput(
    node: Node,
    inputs: Record<string, string>
  ): Promise<string | null> {
    try {
      // Output nodes display the final result from connected nodes
      // Extract image URL from connected nodes for final display
      const inputImage =
        inputs.default ||
        inputs.image ||
        inputs.result ||
        Object.values(inputs).find(Boolean);

      if (inputImage) {
        console.log(`Output node ${node.id} displaying result: ${inputImage}`);

        // Update the output node data with the final generated image
        if (this.updateStoreCallback) {
          // Use the callback to update the WorkflowStore with the processed result
          this.updateStoreCallback(node.id, inputImage);
        }

        // Store the processed image in our local cache
        this.processedImages.set(node.id, inputImage);

        return inputImage;
      }

      // For preview nodes specifically, check if they already have a generated image
      if (node.type === "previewNode" || (node.data?.type === "previewNode")) {
        const existingImage = 
          node.data?.generatedImage ||
          node.data?.imageUrl ||
          this.processedImages.get(node.id);
          
        if (existingImage && typeof existingImage === "string") {
          console.log(`Preview node ${node.id} using existing image: ${existingImage}`);
          
          // Update the workflow store with the existing image
          if (this.updateStoreCallback) {
            this.updateStoreCallback(node.id, existingImage);
          }
          
          // Store in our local cache
          this.processedImages.set(node.id, existingImage);
          
          return existingImage;
        }
      }

      console.warn(`Output node ${node.id} has no input image to display`);
      return null;
    } catch (error) {
      console.error(`Error processing output node ${node.id}:`, error);
      throw new WorkflowExecutionError(
        `Failed to process output node: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        WorkflowErrorType.NODE_PROCESSING_ERROR,
        node.id,
        error instanceof Error ? error : undefined,
        false // Output node failures are not recoverable
      );
    }
  }

  // ===== ENHANCED WORKFLOW EXECUTION METHODS =====

  /**
   * Execute Text-to-Image workflow
   * Supports prompt + LoRA + ControlNet + Model configurations
   */
  async executeTextToImageWorkflow(
    prompt: string,
    modelAIR?: string,
    loras?: Array<{ model: string; weight: number }>,
    controlNets?: Array<{
      type: string;
      image: string;
      weight?: number;
    }>,
    engineParams?: {
      width?: number;
      height?: number;
      steps?: number;
      cfgScale?: number;
      seed?: number;
    }
  ): Promise<string | null> {
    try {
      console.log("🎨 Executing Text-to-Image workflow");

      // Build generation parameters
      const params: any = {
        positivePrompt: prompt,
        model: modelAIR || "runware:100@1",
        width: engineParams?.width || 1024,
        height: engineParams?.height || 1024,
        steps: engineParams?.steps || 30,
        CFGScale: engineParams?.cfgScale || 7.5,
      };

      // Add LoRA configurations if provided
      if (loras && loras.length > 0) {
        params.lora = loras;
        console.log("📦 Added LoRA configurations:", loras);
      }

      // Add ControlNet configurations if provided
      if (controlNets && controlNets.length > 0) {
        params.controlNet = controlNets.map((cn) => ({
          model: this.getControlNetModel(cn.type),
          guideImage: cn.image,
          weight: cn.weight || 1.0,
          startStep: 0,
          endStep: 1000,
          controlMode: "balanced",
        }));
        console.log("🎛️ Added ControlNet configurations:", params.controlNet);
      }

      if (engineParams?.seed) params.seed = engineParams.seed;

      console.log("📤 Generating Text-to-Image with params:", params);
      const result = await this.runwareService.generateImage(params);

      return result.imageURL;
    } catch (error) {
      console.error("❌ Text-to-Image workflow failed:", error);
      throw new WorkflowExecutionError(
        `Text-to-Image workflow failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        WorkflowErrorType.CRITICAL_ERROR,
        undefined,
        error instanceof Error ? error : undefined,
        false
      );
    }
  }

  /**
   * Execute Image-to-Image workflow
   * Supports seed image + strength + all Text-to-Image features
   */
  async executeImageToImageWorkflow(
    prompt: string,
    seedImage: string,
    strength: number = 0.8,
    modelAIR?: string,
    loras?: Array<{ model: string; weight: number }>,
    controlNets?: Array<{
      type: string;
      image: string;
      weight?: number;
    }>,
    engineParams?: {
      width?: number;
      height?: number;
      steps?: number;
      cfgScale?: number;
      seed?: number;
    }
  ): Promise<string | null> {
    try {
      console.log("🖼️ Executing Image-to-Image workflow");

      // Build generation parameters
      const params: any = {
        positivePrompt: prompt,
        seedImage: seedImage,
        strength: strength,
        model: modelAIR || "runware:100@1",
        lora: loras || [],
        width: engineParams?.width || 1024,
        height: engineParams?.height || 1024,
        steps: engineParams?.steps || 30,
        CFGScale: engineParams?.cfgScale || 7.5,
      };

      // Add LoRA configurations if provided
      if (loras && loras.length > 0) {
        params.lora = loras;
        console.log("📦 Added LoRA configurations:", loras);
      }

      // Add ControlNet configurations if provided
      if (controlNets && controlNets.length > 0) {
        params.controlNet = controlNets.map((cn) => ({
          model: this.getControlNetModel(cn.type),
          guideImage: cn.image,
          weight: cn.weight || 1.0,
          startStep: 0,
          endStep: 1000,
          controlMode: "balanced",
        }));
        console.log("🎛️ Added ControlNet configurations:", params.controlNet);
      }

      if (engineParams?.seed) params.seed = engineParams.seed;

      console.log("📤 Generating Image-to-Image with params:", params);
      const result = await this.runwareService.generateImage(params);

      return result.imageURL;
    } catch (error) {
      console.error("❌ Image-to-Image workflow failed:", error);
      throw new WorkflowExecutionError(
        `Image-to-Image workflow failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        WorkflowErrorType.CRITICAL_ERROR,
        undefined,
        error instanceof Error ? error : undefined,
        false
      );
    }
  }

  /**
   * Execute Flux Kontext workflow
   * Supports reference images for style/composition transfer
   */
  async executeFluxKontextWorkflow(
    prompt: string,
    referenceImages: string[],
    modelAIR?: string,
    loras?: Array<{ model: string; weight: number }>,
    dimensions?: {
      width?: number;
      height?: number;
      sizeRatio?: string;
    },
    useKontextPro: boolean = false
  ): Promise<string | null> {
    try {
      console.log("🌌 Executing Flux Kontext workflow");

      // Build Flux Kontext parameters
      const params: any = {
        positivePrompt: prompt,
        referenceImages: referenceImages,
        model: modelAIR || "runware:100@1",
      };

      // Add dimensions - use sizeRatio for Pro version, width/height for standard
      if (useKontextPro) {
        if (dimensions?.sizeRatio) {
          params.sizeRatio = dimensions.sizeRatio;
        }
      } else {
        params.width = dimensions?.width || 1024;
        params.height = dimensions?.height || 1024;
      }

      // Add LoRA configurations if provided
      if (loras && loras.length > 0) {
        params.lora = loras;
        console.log("📦 Added LoRA configurations:", loras);
      }

      console.log(
        `📤 Generating Flux Kontext${useKontextPro ? " Pro" : ""} with params:`,
        params
      );

      // Use appropriate Flux Kontext method based on version
      const result = useKontextPro
        ? await this.runwareService.generateFluxKontextPro(params)
        : await this.runwareService.generateFluxKontext(params);

      return result.imageURL;
    } catch (error) {
      console.error("❌ Flux Kontext workflow failed:", error);
      throw new WorkflowExecutionError(
        `Flux Kontext workflow failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        WorkflowErrorType.CRITICAL_ERROR,
        undefined,
        error instanceof Error ? error : undefined,
        false
      );
    }
  }

  /**
   * Execute Tool workflow
   * Supports remove-bg, upscale, inpaint, outpaint operations
   */
  async executeToolWorkflow(
    inputImage: string,
    toolType: "removebg" | "upscale" | "inpaint" | "outpaint",
    toolParams?: {
      // For upscale
      scaleFactor?: number;
      // For inpaint
      maskImage?: string;
      prompt?: string;
      // For outpaint
      direction?: "up" | "down" | "left" | "right" | "all";
      amount?: number;
    }
  ): Promise<string | null> {
    try {
      console.log(`🛠️ Executing Tool workflow: ${toolType}`);

      let result: any;

      switch (toolType) {
        case "removebg":
          console.log("🗑️ Removing background from image");
          result = await this.runwareService.removeBackground({
            inputImage: inputImage, // was image:
          });
          break;

        case "upscale":
          console.log(
            "📏 Upscaling image with factor:",
            toolParams?.scaleFactor || 2
          );
          result = await this.runwareService.upscaleImage({
            inputImage: inputImage, // was image:
            upscaleFactor: (toolParams?.scaleFactor &&
            [2, 3, 4].includes(toolParams.scaleFactor)
              ? toolParams.scaleFactor
              : 2) as 2 | 3 | 4,
          });
          break;

        case "inpaint":
          if (!toolParams?.maskImage || !toolParams?.prompt) {
            throw new Error("Inpaint requires maskImage and prompt parameters");
          }
          console.log("🎨 Inpainting image with prompt:", toolParams.prompt);
          result = await this.runwareService.inpaintImage({
            positivePrompt: toolParams.prompt!,
            seedImage: inputImage,
            maskImage: toolParams.maskImage!,
          });
          break;

        case "outpaint":
          console.log("📐 Outpainting image:", {
            direction: toolParams?.direction || "all",
            amount: toolParams?.amount || 50,
          });
          result = await this.runwareService.outpaintImage({
            positivePrompt: "Extend the image naturally",
            inputImage: inputImage,                     // was seedImage
            outpaintDirection: toolParams?.direction || "all",
            outpaintAmount: toolParams?.amount || 50,
          });
          break;

        default:
          throw new Error(`Unknown tool type: ${toolType}`);
      }

      return result.imageURL;
    } catch (error) {
      console.error(`❌ Tool workflow (${toolType}) failed:`, error);
      throw new WorkflowExecutionError(
        `Tool workflow (${toolType}) failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        WorkflowErrorType.CRITICAL_ERROR,
        undefined,
        error instanceof Error ? error : undefined,
        false
      );
    }
  }

  /**
   * Auto-detect and execute appropriate workflow based on node configuration
   */
  async executeAutoWorkflow(
    nodes: Node[],
    edges: Edge[],
    targetNodeId: string
  ): Promise<{
    workflowType:
      | "text-to-image"
      | "image-to-image"
      | "flux-kontext"
      | "tool"
      | "complex";
    result: string | null;
  }> {
    try {
      console.log("🔍 Auto-detecting workflow type for execution");

      // Analyze the workflow structure
      const hasImageInput = nodes.some(
        (n) =>
          n.type === "imageInput" ||
          n.data?.imageFile ||
          n.data?.imageUrl ||
          n.data?.type === "image-layer"
      );

      const hasTextInput = nodes.some(
        (n) => n.type === "textInput" || n.data?.type === "input-text"
      );

      const hasFluxKontext = nodes.some(
        (n) =>
          (n.data?.type as string)?.includes("flux-kontext") ||
          (n.data?.referenceImages && Array.isArray(n.data.referenceImages))
      );

      const hasToolNode = nodes.some(
        (n) =>
          (n.data?.type as string)?.startsWith("image-to-image-") &&
          ["removebg", "upscale", "inpaint", "outpaint"].some((tool) =>
            (n.data?.type as string)?.includes(tool)
          )
      );

      // Auto-detect workflow type and execute appropriate method
      let workflowType:
        | "text-to-image"
        | "image-to-image"
        | "flux-kontext"
        | "tool"
        | "complex";
      let result: string | null;

      if (hasFluxKontext) {
        workflowType = "flux-kontext";
        console.log("🌌 Detected Flux Kontext workflow");
        result = await this.executeWorkflow(nodes, edges, targetNodeId);
      } else if (hasToolNode && !hasTextInput) {
        workflowType = "tool";
        console.log("🛠️ Detected Tool workflow");
        result = await this.executeWorkflow(nodes, edges, targetNodeId);
      } else if (hasImageInput && hasTextInput) {
        workflowType = "image-to-image";
        console.log("🖼️ Detected Image-to-Image workflow");
        result = await this.executeWorkflow(nodes, edges, targetNodeId);
      } else if (hasTextInput && !hasImageInput) {
        workflowType = "text-to-image";
        console.log("🎨 Detected Text-to-Image workflow");
        result = await this.executeWorkflow(nodes, edges, targetNodeId);
      } else {
        workflowType = "complex";
        console.log("⚙️ Detected Complex workflow, using standard execution");
        result = await this.executeWorkflow(nodes, edges, targetNodeId);
      }

      return { workflowType, result };
    } catch (error) {
      console.error("❌ Auto workflow execution failed:", error);
      throw error;
    }
  }

  /**
   * Helper method to get ControlNet model AIR identifier from type
   */
  private getControlNetModel(controlNetType: string): string {
    const controlNetMap: Record<string, string> = {
      "control-net-canny": "runware:25@1",
      "control-net-pose": "runware:29@1",
      "control-net-depth": "runware:27@1",
      "control-net-edge": "runware:28@1",
      "control-net-hed": "runware:29@1",
      "control-net-normal": "runware:30@1",
      "control-net-scribble": "runware:31@1",
      "control-net-seg": "runware:32@1",
    };

    return controlNetMap[controlNetType] || "runware:25@1"; // Default to canny
  }

  // ===== INPUT DETECTION AND VALIDATION SYSTEM =====

  // Build efficient edge lookup maps for input detection
  private buildEdgeMap(edges: Edge[]): Map<string, Edge[]> {
    const edgeMap = new Map<string, Edge[]>();

    // Group edges by target node for efficient input lookup
    edges.forEach((edge) => {
      if (!edgeMap.has(edge.target)) {
        edgeMap.set(edge.target, []);
      }
      edgeMap.get(edge.target)!.push(edge);
    });

    return edgeMap;
  }

  // Collect all input data from connected source nodes
  private async collectNodeInputs(
    nodeId: string,
    nodeMap: Map<string, Node>,
    edgeMap: Map<string, Edge[]>
  ): Promise<Record<string, string>> {
    const inputs: Record<string, string> = {};
    const inputEdges = edgeMap.get(nodeId) || [];

    console.log(
      `Collecting inputs for node ${nodeId}:`,
      inputEdges.length,
      "edges"
    );

    for (const edge of inputEdges) {
      const sourceNode = nodeMap.get(edge.source);
      if (!sourceNode) {
        console.warn(
          `Source node ${edge.source} not found for edge to ${nodeId}`
        );
        continue;
      }

      // Get processed result from source node
      const sourceResult = this.processedImages.get(edge.source);
      if (sourceResult) {
        // Use sourceHandle as key, fallback to 'default' or edge source ID
        const inputKey = edge.sourceHandle || "default";
        inputs[inputKey] = sourceResult;
        console.log(`  Input ${inputKey}: ${sourceResult.substring(0, 50)}...`);
      } else {
        // Prefer a persisted ControlNet guide if the source is a ControlNet node
        const isCN = this.isControlNetNode(sourceNode);
        const guide =
          (sourceNode.data?.preprocessedImage as any)?.guideImageURL ||
          (sourceNode.data?.preprocessedImage as any)?.imageURL ||
          sourceNode.data?.guideImageURL ||
          sourceNode.data?.right_sidebar?.preprocessedImage;

        const inputKey = edge.sourceHandle || "default";

        if (isCN && guide && typeof guide === "string") {
          inputs[inputKey] = guide;
          this.processedImages.set(sourceNode.id, guide); // mirror into per-run cache
          console.log(
            `  ControlNet guide ${inputKey}: ${guide.substring(0, 50)}...`
          );
        } else {
          // Fallback: raw image from the node (unprocessed input node)
          const sourceImageData = this.extractImageDataFromNode(sourceNode);
          if (sourceImageData) {
            inputs[inputKey] = sourceImageData;
            console.log(
              `  Direct input ${inputKey}: ${sourceImageData.substring(
                0,
                50
              )}...`
            );
          } else {
            console.warn(
              `No data available from source node ${edge.source} for input to ${nodeId}`
            );
          }
        }
      }
    }

    return inputs;
  }

  // Extract image data directly from node (for unprocessed image nodes)
  private extractImageDataFromNode(node: Node): string | null {
    // Check for various image data sources
    if (node.data?.imageUrl && typeof node.data.imageUrl === "string") {
      return node.data.imageUrl;
    }

    if (node.data?.imageFile && node.data.imageFile instanceof File) {
      // For File objects, we'll need to process them first
      // Return a placeholder that indicates processing is needed
      return `file:${node.id}`;
    }

    if (
      node.data?.generatedImage &&
      typeof node.data.generatedImage === "string"
    ) {
      return node.data.generatedImage;
    }

    // Check for Rive-generated images
    const riveImageUrl = this.extractRiveGeneratedImageURL(node);
    if (riveImageUrl) {
      return riveImageUrl;
    }

    // Check for processed images from workflow execution (for preview nodes acting as inputs)
    const processedImage = this.processedImages.get(node.id);
    if (processedImage && typeof processedImage === "string") {
      return processedImage;
    }

    return null;
  }

  // Find connected image input nodes for ControlNet nodes
  private detectImageInputs(
    nodeId: string,
    edgeMap: Map<string, Edge[]>,
    nodeMap: Map<string, Node>
  ): string[] {
    const imageInputs: string[] = [];
    const inputEdges = edgeMap.get(nodeId) || [];

    for (const edge of inputEdges) {
      const sourceNode = nodeMap.get(edge.source);
      if (!sourceNode) continue;

      // Check if source node is an image input node
      if (this.isImageInputNode(sourceNode)) {
        imageInputs.push(edge.source);
      }
    }

    console.log(
      `Detected ${imageInputs.length} image inputs for node ${nodeId}:`,
      imageInputs
    );
    return imageInputs;
  }

  // Check if a node is an image input node
  private isImageInputNode(node: Node): boolean {
    const nodeDataType = node.data?.type || node.type;

    // Check for various image node types
    const imageNodeTypes = [
      "image-layer",
      "image-node",
      "imageInput",
      "image-input",
      "previewNode", // ✅ allow preview nodes as image sources
      "preview-realtime-node", // ✅ allow preview nodes as image sources
      "output", // ✅ allow output nodes as image sources (same as previewNode)
    ];

    if (
      imageNodeTypes.includes(nodeDataType as string) ||
      imageNodeTypes.includes(node.type)
    ) {
      return true;
    }

    // Check for nodes with image data
    if (
      node.data?.imageFile ||
      node.data?.imageUrl ||
      node.data?.right_sidebar?.imageUrl ||
      node.data?.generatedImage
    ) {
      return true;
    }

    // Check for drag-and-drop image nodes by ID pattern
    if (
      node.id &&
      node.id.startsWith("image-") &&
      (node.data?.imageFile ||
        node.data?.imageUrl ||
        node.data?.right_sidebar?.imageUrl)
    ) {
      return true;
    }

    return false;
  }

  // Validate that required inputs are present and valid
  private validateNodeInputs(
    node: Node,
    inputs: Record<string, string>
  ): boolean {
    const nodeDataType = node.data?.type || node.type;

    // Special handling for ControlNet nodes - they can work with any image input or preprocessed data
    if (
      (nodeDataType as string)?.startsWith("control-net-") ||
      nodeDataType === "seed-image-lights"
    ) {
      // Check if node has preprocessed image data (from auto-preprocessing)
      if ((node.data as any)?.preprocessedImage?.guideImageURL) {
        console.log(`ControlNet node ${node.id} has preprocessed image data`);
        return true;
      }

      // Check if node has Rive-generated image (for pose/lights nodes)
      const riveImageUrl = this.extractRiveGeneratedImageURL(node);
      if (riveImageUrl) {
        console.log(`ControlNet node ${node.id} has Rive-generated image`);
        return true;
      }

      // Check if there are any valid image inputs connected
      const hasImageInput = Object.values(inputs).some(
        (input) =>
          typeof input === "string" &&
          (input.startsWith("http") ||
            input.startsWith("data:") ||
            input.startsWith("file:"))
      );

      if (hasImageInput) {
        console.log(`ControlNet node ${node.id} has valid image inputs`);
        return true;
      }

      // For ControlNet nodes, if no inputs but not critical, allow it to continue
      console.warn(
        `ControlNet node ${node.id} has no image inputs but may have internal data`
      );
      return Object.keys(inputs).length > 0 || !!node.data?.imageUrl;
    }

    // Define input requirements for other node types
    const inputRequirements: Record<string, string[]> = {
      "image-to-image-reimagine": [], // Will check for any valid image input below
      "engine-text-to-image": [], // Engine nodes can work without inputs
      "preview-image": ["default"],
      "preview-realtime-node": ["default"],
      "previewNode": ["default"], // Add previewNode as a valid input type
    };

    const requiredInputs =
      (inputRequirements as any)[nodeDataType as string] || [];

    // Special handling for image-to-image-reimagine nodes
    if (nodeDataType === "image-to-image-reimagine") {
      // Check if there are any valid image inputs (any key is acceptable)
      const hasValidImageInput = Object.values(inputs).some(
        (input) =>
          typeof input === "string" &&
          (input.startsWith("http") ||
            input.startsWith("data:") ||
            input.startsWith("file:"))
      );

      if (hasValidImageInput) {
        console.log(`Re-imagine node ${node.id} has valid image inputs`);
        return true;
      }

      // Also check if the node has any connected inputs at all
      if (Object.keys(inputs).length > 0) {
        console.log(
          `Re-imagine node ${node.id} has ${
            Object.keys(inputs).length
          } connected inputs`
        );
        return true;
      }

      console.warn(`Re-imagine node ${node.id} has no valid image inputs`);
      return false;
    }

    // Special handling for preview nodes - they can act as both input and output
    if (nodeDataType === "previewNode" || node.type === "previewNode") {
      // Preview nodes can work with any valid image input
      const hasValidImageInput = Object.values(inputs).some(
        (input) =>
          typeof input === "string" &&
          (input.startsWith("http") ||
            input.startsWith("data:") ||
            input.startsWith("file:"))
      );

      if (hasValidImageInput) {
        console.log(`Preview node ${node.id} has valid image inputs`);
        return true;
      }

      // Also check if the node has any connected inputs at all
      if (Object.keys(inputs).length > 0) {
        console.log(
          `Preview node ${node.id} has ${
            Object.keys(inputs).length
          } connected inputs`
        );
        return true;
      }

      // Preview nodes can also work without inputs (as outputs)
      console.log(`Preview node ${node.id} has no inputs (acting as output)`);
      return true;
    }

    // Check if all required inputs are present
    for (const requiredInput of requiredInputs) {
      if (!inputs[requiredInput]) {
        console.warn(
          `Node ${node.id} missing required input: ${requiredInput}`
        );
        return false;
      }
    }

    return true;
  }

  // ===== CONTROLNET NODE DETECTION AND CLASSIFICATION =====

  // Identify ControlNet nodes (pose, edge, depth, segment, normal, and light control nodes)
  private isControlNetNode(node: Node): boolean {
    const nodeDataType = node.data?.type || node.type;

    // Check for ControlNet node types
    const controlNetTypes = [
      "control-net-pose",
      "control-net-edge",
      "control-net-depth",
      "control-net-segment",
      "control-net-normal",
      "seed-image-lights", // Light control nodes are also ControlNet-related
    ];

    if (controlNetTypes.includes(nodeDataType as string)) {
      return true;
    }

    // Check for legacy ControlNet node types
    if (
      (nodeDataType as string)?.startsWith("control-net-") ||
      (nodeDataType as string)?.includes("controlnet")
    ) {
      return true;
    }

    // Check for nodes with ControlNet-related data
    if (node.data?.preprocessor || node.data?.controlNetType) {
      return true;
    }

    return false;
  }

  // Determine the correct preprocessor for each ControlNet node type
  private getPreprocessorType(node: Node): string {
    const nodeDataType = node.data?.type || node.type;

    // Map node types to preprocessor types
    const preprocessorMap: Record<string, string> = {
      "control-net-pose": "pose",
      "control-net-edge": "canny",
      "control-net-depth": "depth",
      "control-net-segment": "segment",
      "control-net-normal": "normal",
      "seed-image-lights": "light", // Special case for light control
    };

    // Check direct mapping first
    if ((preprocessorMap as any)[nodeDataType as string]) {
      return (preprocessorMap as any)[nodeDataType as string];
    }

    // Check for explicit preprocessor in node data
    if (node.data?.preprocessor && typeof node.data.preprocessor === "string") {
      return node.data.preprocessor;
    }

    // Extract from node type string patterns
    if ((nodeDataType as string)?.includes("pose")) return "pose";
    if (
      (nodeDataType as string)?.includes("edge") ||
      (nodeDataType as string)?.includes("canny")
    )
      return "canny";
    if ((nodeDataType as string)?.includes("depth")) return "depth";
    if ((nodeDataType as string)?.includes("segment")) return "segment";
    if ((nodeDataType as string)?.includes("normal")) return "normal";
    if ((nodeDataType as string)?.includes("light")) return "light";

    // Default fallback
    console.warn(
      `Unknown ControlNet node type ${nodeDataType}, defaulting to 'pose' preprocessor`
    );
    return "pose";
  }

  // Check if automatic preprocessing should be triggered
  // Per specification: Stop auto-preprocessing during execution and when preprocessed data exists
  // ControlNet preprocessing should happen when the user connects/changes images, not on Render.
  private shouldAutoPreprocess(
    node: Node,
    _inputs: Record<string, string>
  ): boolean {
    // Never auto-preprocess during workflow execution
    if (this.processingNodes.size > 0) {
      console.log(
        `Skipping auto-preprocessing for ${node.id} - workflow execution in progress`
      );
      return false;
    }

    // Check if node already has preprocessed data (from reload/cache)
    const nodeData = node.data as any;
    const hasPreprocessedImage =
      nodeData?.preprocessedImage?.guideImageURL ||
      nodeData?.preprocessedImage?.imageURL ||
      nodeData?.right_sidebar?.preprocessedImage ||
      nodeData?.hasPreprocessedImage;

    if (hasPreprocessedImage) {
      console.log(
        `Skipping auto-preprocessing for ${node.id} - already has preprocessed image`
      );
      return false;
    }

    // Check global processed images cache
    const cachedResult = this.processedImages.get(node.id);
    if (cachedResult) {
      console.log(
        `Skipping auto-preprocessing for ${node.id} - found in global cache`
      );
      return false;
    }

    return false; // Default to no auto-preprocessing as per specification
  }

  // Validate to prevent duplicate preprocessing
  private preprocessingRequired(node: Node): boolean {
    const nodeId = node.id;

    // Check if we already have a preprocessed result for this node
    if (this.processedImages.has(nodeId)) {
      const existingResult = this.processedImages.get(nodeId);
      if (
        existingResult &&
        /^(https?:|blob:|data:|file:)/i.test(existingResult)
      ) {
        console.log(
          `Node ${nodeId} already has preprocessed result: ${existingResult}`
        );
        return false;
      }
    }

    // Check if node has guideImageURL from previous preprocessing
    if (
      node.data?.guideImageURL &&
      typeof node.data.guideImageURL === "string"
    ) {
      console.log(
        `Node ${nodeId} already has guideImageURL: ${node.data.guideImageURL}`
      );
      return false;
    }

    // Check if node has a Rive-generated image URL (indicates preprocessing done)
    const riveImageUrl = this.extractRiveGeneratedImageURL(node);
    if (riveImageUrl) {
      console.log(
        `Node ${nodeId} has Rive-generated image, preprocessing not required`
      );
      return false;
    }

    return true;
  }

  // ===== AUTOMATIC PREPROCESSING TRIGGER SYSTEM =====

  // Handle automatic image preprocessing for ControlNet nodes
  private async preprocessControlNetInputs(
    node: Node,
    inputs: Record<string, string>,
    _nodeMap: Map<string, Node>
  ): Promise<Record<string, string>> {
    // Never auto-preprocess on render. Prefer the node's persisted guide if present.
    const out: Record<string, string> = { ...inputs };
    if (!this.isControlNetNode(node)) return out;

    const persisted =
      (node.data?.preprocessedImage as any)?.guideImageURL ||
      (node.data?.preprocessedImage as any)?.imageURL ||
      node.data?.guideImageURL ||
      node.data?.right_sidebar?.preprocessedImage;

    if (persisted && typeof persisted === "string") {
      // Mirror into this run's cache so downstream uses it as a processed value
      this.processedImages.set(node.id, persisted);
      out.default = persisted;
    }
    return out;
  }

  // Check if input value represents an image
  private isImageInput(inputValue: string): boolean {
    return (
      typeof inputValue === "string" &&
      (inputValue.startsWith("http") ||
        inputValue.startsWith("data:image/") ||
        inputValue.startsWith("file:"))
    );
  }

  // Preprocess a single image input
  private async preprocessSingleInput(
    node: Node,
    inputValue: string,
    preprocessorType: string,
    nodeMap: Map<string, Node>
  ): Promise<string | null> {
    try {
      // Handle different input types
      if (inputValue.startsWith("file:")) {
        // Extract node ID from file placeholder
        const sourceNodeId = inputValue.replace("file:", "");
        const sourceNode = nodeMap.get(sourceNodeId);

        if (sourceNode?.data?.imageFile instanceof File) {
          // Directly preprocess; preprocessImage internally uploads
          console.log(
            `Preprocessing image file for ControlNet: ${sourceNode.data.imageFile.name}`
          );
          const preprocessResult = await this.runwareService.preprocessImage(
            sourceNode.data.imageFile,
            preprocessorType
          );

          console.log(
            `ControlNet preprocessing completed: ${preprocessResult.imageURL}`
          );
          return preprocessResult.imageURL;
        }
      } else if (inputValue.startsWith("http")) {
        // For HTTP URLs, preprocess directly using the URL
        console.log(`Preprocessing HTTP URL for ControlNet: ${inputValue}`);
        const response = await fetch(inputValue);
        const blob = await response.blob();
        const file = new File([blob], "input.jpg", { type: "image/jpeg" });
        const preprocessResult = await this.runwareService.preprocessImage(
          file,
          preprocessorType
        );

        console.log(
          `ControlNet preprocessing completed for URL: ${preprocessResult.imageURL}`
        );
        return preprocessResult.imageURL;
      } else if (inputValue.startsWith("data:")) {
        // Handle data URLs by preprocessing directly
        console.log(
          `Preprocessing data URL for ControlNet: ${inputValue.substring(
            0,
            50
          )}...`
        );
        const response = await fetch(inputValue);
        const blob = await response.blob();
        const file = new File([blob], "input.jpg", { type: "image/jpeg" });
        const preprocessResult = await this.runwareService.preprocessImage(
          file,
          preprocessorType
        );

        console.log(
          `ControlNet preprocessing completed for data URL: ${preprocessResult.imageURL}`
        );
        return preprocessResult.imageURL;
      }

      return null;
    } catch (error) {
      console.error(
        `Failed to preprocess single input for node ${node.id}:`,
        error
      );
      throw error;
    }
  }

  // Store preprocessing results for retrieval
  private storePreprocessingResult(
    nodeId: string,
    guideImageURL: string
  ): void {
    // Store in processed images cache
    this.processedImages.set(nodeId, guideImageURL);

    // Update WorkflowStore if callback is available
    if (this.updateStoreCallback) {
      this.updateStoreCallback(nodeId, guideImageURL);
    }

    console.log(
      `Stored preprocessing result for node ${nodeId}: ${guideImageURL}`
    );
  }

  // Retrieve preprocessing results
  private getPreprocessingResult(nodeId: string): string | null {
    return this.processedImages.get(nodeId) || null;
  }

  // ===== ENHANCED ERROR HANDLING AND DEBUGGING =====

  // Generate specific error messages for missing inputs
  private generateMissingInputError(
    node: Node,
    missingInputs: string[],
    nodeMap: Map<string, Node>
  ): string {
    const nodeType = node.data?.type || node.type;
    const sourceNodeInfo = missingInputs
      .map((sourceId) => {
        const sourceNode = nodeMap.get(sourceId);
        return sourceNode
          ? `${sourceId} (${sourceNode.data?.type || sourceNode.type})`
          : sourceId;
      })
      .join(", ");

    return `Node ${node.id} (${nodeType}) is missing required inputs from: ${sourceNodeInfo}`;
  }

  // Add comprehensive logging for debugging
  private logNodeProcessingDebug(
    node: Node,
    inputs: Record<string, string>,
    result: string | null
  ): void {
    console.log(`Node processing debug for ${node.id}:`, {
      nodeType: node.data?.type || node.type,
      inputKeys: Object.keys(inputs),
      inputCount: Object.keys(inputs).length,
      hasResult: !!result,
      resultType: result
        ? /^(https?:|blob:|data:|file:)/i.test(result)
          ? "URL"
          : "Other"
        : "None",
      resultPreview: result?.substring(0, 50),
    });
  }

  // Validate workflow structure for input detection issues
  private validateInputDetectionSystem(nodes: Node[], edges: Edge[]): void {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const edgeMap = this.buildEdgeMap(edges);

    console.log("Validating input detection system:");

    // Check each node's input detection
    for (const node of nodes) {
      if (this.isControlNetNode(node)) {
        const imageInputs = this.detectImageInputs(node.id, edgeMap, nodeMap);
        console.log(
          `ControlNet node ${node.id} has ${imageInputs.length} image inputs:`,
          imageInputs
        );

        if (imageInputs.length === 0) {
          console.warn(
            `ControlNet node ${node.id} has no image inputs - may need manual connection`
          );
        }
      }
    }
  }

  // ===== AUTOMATIC PREPROCESSING ON CONNECTION =====

  // Trigger ControlNet preprocessing when image nodes connect to ControlNet nodes
  async triggerControlNetPreprocessing(
    nodes: Node[],
    edges: Edge[]
  ): Promise<void> {
    try {
      const nodeMap = new Map(nodes.map((node) => [node.id, node]));
      const edgeMap = this.buildEdgeMap(edges);

      console.log(
        "🔍 Checking for new ControlNet connections requiring preprocessing..."
      );

      // Find ControlNet nodes that have new image connections
      for (const node of nodes) {
        if (this.isControlNetNode(node)) {
          const inputs = await this.collectNodeInputs(
            node.id,
            nodeMap,
            edgeMap
          );

          // Check if this ControlNet node should be preprocessed
          if (this.shouldAutoPreprocess(node, inputs)) {
            const preprocessorType = this.getPreprocessorType(node);
            console.log(
              `🎯 Triggering immediate ${preprocessorType} preprocessing for connected ControlNet node ${node.id}`
            );

            try {
              const processedInputs = await this.preprocessControlNetInputs(
                node,
                inputs,
                nodeMap
              );
              console.log(
                `✅ Immediate preprocessing completed for ControlNet node ${node.id}`
              );

              // Update the UI to show the preprocessing result
              if (this.updateStoreCallback) {
                const preprocessedUrl =
                  processedInputs.default || Object.values(processedInputs)[0];
                if (preprocessedUrl) {
                  this.updateStoreCallback(node.id, preprocessedUrl);
                }
              }
            } catch (error) {
              console.error(
                `❌ Immediate preprocessing failed for ControlNet node ${node.id}:`,
                error
              );
              // Don't throw error for immediate preprocessing failures
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in triggerControlNetPreprocessing:", error);
      // Don't throw error to avoid disrupting the UI
    }
  }
}
