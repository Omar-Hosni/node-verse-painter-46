// @ts-nocheck
/**
 * Performance Optimizer Service
 * Integrates caching, debouncing, and memory optimization for ControlNet preprocessing
 * Implements requirement 4.4 - performance optimizations and caching
 */

import { Node, Edge } from "@xyflow/react";
import { PreprocessedImageData } from "../utils/controlNetUtils";
import { PreprocessingCache, preprocessingCache } from "./preprocessingCache";
import { ConnectionDebouncer } from "./connectionDebouncer";
import { MemoryOptimizer, memoryOptimizer } from "./memoryOptimizer";
import { RunwareService } from "./runwareService";
import { toast } from "sonner";

// Performance metrics
export interface PerformanceMetrics {
  cacheHitRate: number;
  averageProcessingTime: number;
  totalPreprocessingOperations: number;
  memoryUsageMB: number;
  pendingOperations: number;
  optimizationsSaved: number;
}

// Performance optimizer configuration
export interface PerformanceOptimizerConfig {
  enableCaching: boolean;
  enableDebouncing: boolean;
  enableMemoryOptimization: boolean;
  cacheConfig?: {
    maxEntries?: number;
    maxMemoryMB?: number;
    ttlMs?: number;
  };
  debouncerConfig?: {
    debounceMs?: number;
    maxPendingOperations?: number;
  };
  memoryConfig?: {
    maxTotalMemoryMB?: number;
    compressionThresholdMB?: number;
  };
}

// Performance optimizer callbacks
export interface PerformanceOptimizerCallbacks {
  onPreprocessingStarted?: (nodeId: string) => void;
  onPreprocessingCompleted?: (nodeId: string, result: PreprocessedImageData, fromCache: boolean) => void;
  onPreprocessingFailed?: (nodeId: string, error: string) => void;
  updateNodeData?: (nodeId: string, data: any) => void;
}

/**
 * Performance Optimizer Service
 * Coordinates caching, debouncing, and memory optimization for optimal performance
 */
export class PerformanceOptimizer {
  private cache: PreprocessingCache;
  private debouncer: ConnectionDebouncer;
  private memoryOptimizer: MemoryOptimizer;
  private runwareService: RunwareService;
  private config: PerformanceOptimizerConfig;
  private callbacks: PerformanceOptimizerCallbacks;
  private metrics = {
    totalOperations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalProcessingTime: 0,
    optimizationsSaved: 0,
  };

  constructor(
    runwareService: RunwareService,
    config: PerformanceOptimizerConfig = {},
    callbacks: PerformanceOptimizerCallbacks = {}
  ) {
    this.runwareService = runwareService;
    this.config = {
      enableCaching: config.enableCaching ?? true,
      enableDebouncing: config.enableDebouncing ?? true,
      enableMemoryOptimization: config.enableMemoryOptimization ?? true,
      ...config,
    };
    this.callbacks = callbacks;

    // Initialize optimization services
    this.cache = config.cacheConfig ? new PreprocessingCache(config.cacheConfig) : preprocessingCache;
    this.memoryOptimizer = config.memoryConfig ? new MemoryOptimizer(config.memoryConfig) : memoryOptimizer;
    
    this.debouncer = new ConnectionDebouncer(
      config.debouncerConfig,
      {
        onConnect: this.handleDebouncedConnection.bind(this),
        onDisconnect: this.handleDebouncedDisconnection.bind(this),
        onBatchStart: this.handleBatchStart.bind(this),
        onBatchComplete: this.handleBatchComplete.bind(this),
      }
    );

    console.log('PerformanceOptimizer: Initialized with config', this.config);
  }

  /**
   * Process a connection with full performance optimization
   * @param sourceNode - Source image node
   * @param targetNode - Target ControlNet node
   * @param nodes - All nodes in the workflow
   * @param edges - All edges in the workflow
   */
  async processConnection(
    sourceNode: Node,
    targetNode: Node,
    nodes: Node[],
    edges: Edge[]
  ): Promise<void> {
    const nodeId = targetNode.id;
    const imageUrl = this.getImageUrlFromNode(sourceNode);
    const preprocessor = this.getPreprocessorFromNode(targetNode);

    if (!imageUrl || !preprocessor) {
      console.warn('PerformanceOptimizer: Invalid connection parameters');
      return;
    }

    // Use debouncing if enabled
    if (this.config.enableDebouncing) {
      this.debouncer.debounceConnection(
        sourceNode.id,
        targetNode.id,
        'connect',
        nodes,
        edges
      );
      return;
    }

    // Process immediately if debouncing is disabled
    await this.handleDebouncedConnection(sourceNode, targetNode, nodes, edges);
  }

  /**
   * Handle debounced connection (with caching and memory optimization)
   * @param sourceNode - Source image node
   * @param targetNode - Target ControlNet node
   * @param nodes - All nodes in the workflow
   * @param edges - All edges in the workflow
   */
  private async handleDebouncedConnection(
    sourceNode: Node,
    targetNode: Node,
    nodes: Node[],
    edges: Edge[]
  ): Promise<void> {
    const nodeId = targetNode.id;
    const imageUrl = this.getImageUrlFromNode(sourceNode);
    const preprocessor = this.getPreprocessorFromNode(targetNode);

    if (!imageUrl || !preprocessor) {
      return;
    }

    const startTime = Date.now();
    this.metrics.totalOperations++;

    try {
      // Notify preprocessing started
      if (this.callbacks.onPreprocessingStarted) {
        this.callbacks.onPreprocessingStarted(nodeId);
      }

      let result: PreprocessedImageData;
      let fromCache = false;

      // Check cache first if enabled
      if (this.config.enableCaching) {
        const cachedResult = this.cache.get(imageUrl, preprocessor);
        if (cachedResult) {
          result = cachedResult;
          fromCache = true;
          this.metrics.cacheHits++;
          this.metrics.optimizationsSaved++;
          
          console.log(
            `PerformanceOptimizer: Cache hit for ${preprocessor} preprocessing ` +
            `(saved ${Date.now() - startTime}ms)`
          );
        } else {
          this.metrics.cacheMisses++;
        }
      }

      // Perform actual preprocessing if not cached
      if (!fromCache) {
        console.log(`PerformanceOptimizer: Processing ${preprocessor} for node ${nodeId}`);
        
        // Convert URL to File object before preprocessing as per simplified workflow
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const imageFile = new File([blob], 'input.jpg', { type: 'image/jpeg' });
        
        const preprocessedResult = await this.runwareService.preprocessImage(
          imageFile,
          preprocessor
        );

        result = {
          guideImageURL: preprocessedResult.imageURL,
          preprocessor: preprocessedResult.preprocessor,
          sourceImageUUID: String(sourceNode.data?.imageUUID || sourceNode.data?.imageUrl || ""),
          timestamp: Date.now(),
        };

        // Cache the result if caching is enabled
        if (this.config.enableCaching) {
          this.cache.set(imageUrl, preprocessor, result);
        }
      }

      // Track memory usage if memory optimization is enabled
      if (this.config.enableMemoryOptimization) {
        this.memoryOptimizer.trackImage(nodeId, result);
      }

      // Update processing time metrics
      const processingTime = Date.now() - startTime;
      this.metrics.totalProcessingTime += processingTime;

      // Update node data
      if (this.callbacks.updateNodeData) {
        this.callbacks.updateNodeData(nodeId, {
          preprocessedImage: result,
          preprocessor: result.preprocessor,
          hasPreprocessedImage: true,
          isPreprocessing: false,
          hasError: false,
          errorMessage: undefined,
          processingTime,
          fromCache,
          right_sidebar: {
            preprocessedImage: result.guideImageURL,
            showPreprocessed: true,
            fromCache,
          },
        });
      }

      // Notify completion
      if (this.callbacks.onPreprocessingCompleted) {
        this.callbacks.onPreprocessingCompleted(nodeId, result, fromCache);
      }

      // Note: Success toast notifications are handled by preprocessingTrigger to avoid duplication
      // This prevents infinite toast messages when multiple systems update the same state

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error('PerformanceOptimizer: Preprocessing failed:', error);

      // Notify failure
      if (this.callbacks.onPreprocessingFailed) {
        this.callbacks.onPreprocessingFailed(nodeId, errorMessage);
      }

      // Update node with error state
      if (this.callbacks.updateNodeData) {
        this.callbacks.updateNodeData(nodeId, {
          isPreprocessing: false,
          hasPreprocessedImage: false,
          hasError: true,
          errorMessage,
        });
      }

      toast.error(`Preprocessing failed: ${errorMessage}`, { duration: 5000 });
    }
  }

  /**
   * Handle debounced disconnection
   * @param sourceNodeId - Source node ID
   * @param targetNodeId - Target node ID
   * @param nodes - All nodes in the workflow
   * @param edges - All edges in the workflow
   */
  private handleDebouncedDisconnection(
    sourceNodeId: string,
    targetNodeId: string,
    nodes: Node[],
    edges: Edge[]
  ): void {
    console.log(`PerformanceOptimizer: Handling disconnection ${sourceNodeId} -> ${targetNodeId}`);

    // Clear memory tracking for the target node
    if (this.config.enableMemoryOptimization) {
      this.memoryOptimizer.removeImagesForNode(targetNodeId);
    }

    // Update node data to clear preprocessing
    if (this.callbacks.updateNodeData) {
      this.callbacks.updateNodeData(targetNodeId, {
        preprocessedImage: undefined,
        hasPreprocessedImage: false,
        isPreprocessing: false,
        hasError: false,
        errorMessage: undefined,
        right_sidebar: {
          showPreprocessed: false,
        },
      });
    }
  }

  /**
   * Handle batch processing start
   * @param operationCount - Number of operations in the batch
   */
  private handleBatchStart(operationCount: number): void {
    console.log(`PerformanceOptimizer: Starting batch processing of ${operationCount} operations`);
    toast.loading(`Processing ${operationCount} connection changes...`, {
      id: 'batch-processing',
    });
  }

  /**
   * Handle batch processing completion
   * @param processedCount - Number of operations processed
   * @param errors - Array of error messages
   */
  private handleBatchComplete(processedCount: number, errors: string[]): void {
    toast.dismiss('batch-processing');
    
    if (errors.length === 0) {
      toast.success(`Processed ${processedCount} connections successfully`, {
        duration: 3000,
      });
    } else {
      toast.warning(
        `Processed ${processedCount} connections with ${errors.length} errors`,
        { duration: 4000 }
      );
    }

    console.log(
      `PerformanceOptimizer: Batch processing completed. ` +
      `Processed: ${processedCount}, Errors: ${errors.length}`
    );
  }

  /**
   * Process disconnection with performance optimization
   * @param sourceNodeId - Source node ID
   * @param targetNodeId - Target node ID
   * @param nodes - All nodes in the workflow
   * @param edges - All edges in the workflow
   */
  processDisconnection(
    sourceNodeId: string,
    targetNodeId: string,
    nodes: Node[],
    edges: Edge[]
  ): void {
    // Use debouncing if enabled
    if (this.config.enableDebouncing) {
      this.debouncer.debounceConnection(
        sourceNodeId,
        targetNodeId,
        'disconnect',
        nodes,
        edges
      );
      return;
    }

    // Process immediately if debouncing is disabled
    this.handleDebouncedDisconnection(sourceNodeId, targetNodeId, nodes, edges);
  }

  /**
   * Get current performance metrics
   * @returns Performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const cacheStats = this.config.enableCaching ? this.cache.getStats() : null;
    const memoryUsage = this.config.enableMemoryOptimization ? this.memoryOptimizer.getMemoryUsage() : null;
    const debouncerStats = this.config.enableDebouncing ? this.debouncer.getStats() : null;

    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? (this.metrics.cacheHits / totalRequests) * 100 : 0;
    const averageProcessingTime = this.metrics.totalOperations > 0 
      ? this.metrics.totalProcessingTime / this.metrics.totalOperations 
      : 0;

    return {
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      averageProcessingTime: Math.round(averageProcessingTime),
      totalPreprocessingOperations: this.metrics.totalOperations,
      memoryUsageMB: memoryUsage?.totalSizeMB || 0,
      pendingOperations: debouncerStats?.pendingOperations || 0,
      optimizationsSaved: this.metrics.optimizationsSaved,
    };
  }

  /**
   * Perform comprehensive system optimization
   * @returns Optimization results
   */
  async performSystemOptimization(): Promise<{
    cacheOptimization: any;
    memoryOptimization: any;
    debouncerFlush: boolean;
  }> {
    console.log('PerformanceOptimizer: Performing comprehensive system optimization');

    const results = {
      cacheOptimization: null as any,
      memoryOptimization: null as any,
      debouncerFlush: false,
    };

    try {
      // Flush pending debounced operations
      if (this.config.enableDebouncing) {
        await this.debouncer.flush([], []); // Empty arrays since we don't have current state here
        results.debouncerFlush = true;
      }

      // Perform cache maintenance
      if (this.config.enableCaching) {
        this.cache.performMaintenance();
        results.cacheOptimization = this.cache.getStats();
      }

      // Perform memory optimization
      if (this.config.enableMemoryOptimization) {
        results.memoryOptimization = await this.memoryOptimizer.optimizeMemory(true);
      }

      console.log('PerformanceOptimizer: System optimization completed', results);
      toast.success('System optimization completed successfully', { duration: 3000 });

    } catch (error) {
      console.error('PerformanceOptimizer: System optimization failed:', error);
      toast.error('System optimization failed', { duration: 4000 });
    }

    return results;
  }

  /**
   * Get comprehensive system status for monitoring
   * @returns System status information
   */
  getSystemStatus(): {
    performance: PerformanceMetrics;
    cache: any;
    memory: any;
    debouncer: any;
    config: PerformanceOptimizerConfig;
  } {
    return {
      performance: this.getPerformanceMetrics(),
      cache: this.config.enableCaching ? this.cache.getStats() : null,
      memory: this.config.enableMemoryOptimization ? this.memoryOptimizer.getMemoryUsage() : null,
      debouncer: this.config.enableDebouncing ? this.debouncer.getStats() : null,
      config: { ...this.config },
    };
  }

  /**
   * Update configuration
   * @param newConfig - New configuration values
   */
  updateConfig(newConfig: Partial<PerformanceOptimizerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update individual service configurations
    if (newConfig.cacheConfig && this.config.enableCaching) {
      this.cache.updateConfig(newConfig.cacheConfig);
    }

    if (newConfig.debouncerConfig && this.config.enableDebouncing) {
      this.debouncer.updateConfig(newConfig.debouncerConfig);
    }

    if (newConfig.memoryConfig && this.config.enableMemoryOptimization) {
      this.memoryOptimizer.updateConfig(newConfig.memoryConfig);
    }

    console.log('PerformanceOptimizer: Configuration updated', this.config);
  }

  /**
   * Update callbacks
   * @param newCallbacks - New callback functions
   */
  updateCallbacks(newCallbacks: PerformanceOptimizerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...newCallbacks };
  }

  /**
   * Clear all caches and reset metrics
   */
  reset(): void {
    if (this.config.enableCaching) {
      this.cache.clear();
    }

    if (this.config.enableDebouncing) {
      this.debouncer.cancelAllOperations();
    }

    if (this.config.enableMemoryOptimization) {
      this.memoryOptimizer.clear();
    }

    // Reset metrics
    this.metrics = {
      totalOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalProcessingTime: 0,
      optimizationsSaved: 0,
    };

    console.log('PerformanceOptimizer: System reset completed');
    toast.info('Performance optimizer reset', { duration: 2000 });
  }

  /**
   * Extract image URL from node
   * @param node - Node to extract URL from
   * @returns Image URL or null
   */
  private getImageUrlFromNode(node: Node): string | null {
    return node.data?.imageUrl || node.data?.image || null;
  }

  /**
   * Extract preprocessor from ControlNet node
   * @param node - ControlNet node
   * @returns Preprocessor name or null
   */
  private getPreprocessorFromNode(node: Node): string | null {
    // This would typically use the controlNetUtils to get the preprocessor
    // For now, return the node type as preprocessor identifier
    return node.type || null;
  }

  /**
   * Cleanup resources when optimizer is destroyed
   */
  destroy(): void {
    if (this.config.enableDebouncing) {
      this.debouncer.destroy();
    }

    if (this.config.enableMemoryOptimization) {
      this.memoryOptimizer.destroy();
    }

    if (this.config.enableCaching) {
      this.cache.destroy();
    }

    console.log('PerformanceOptimizer: Destroyed');
  }
}