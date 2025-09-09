/**
 * Preprocessing Trigger Service
 * Handles automatic preprocessing when image nodes connect to ControlNet nodes
 * Implements validation and handles special cases like light ControlNet nodes
 */

import { Node, Edge } from "@xyflow/react";
import { RunwareService } from "./runwareService";
import {
  getPreprocessorForControlNet,
  requiresPreprocessing,
  createPreprocessedImageData,
  PreprocessedImageData,
} from "../utils/controlNetUtils";
import {
  PreprocessingStateManager,
  PreprocessingStateManagerImpl,
  PreprocessingState,
} from "../store/preprocessingState";
import { ErrorRecoveryService } from "./errorRecoveryService";
import { PerformanceOptimizer } from "./performanceOptimizer";
import { toast } from "sonner";

export interface PreprocessingTriggerCallbacks {
  onPreprocessingStarted?: (nodeId: string) => void;
  onPreprocessingCompleted?: (
    nodeId: string,
    result: PreprocessedImageData
  ) => void;
  onPreprocessingFailed?: (nodeId: string, error: string) => void;
  updateNodeData?: (nodeId: string, data: any) => void;
}

/**
 * Preprocessing Trigger Service
 * Manages automatic preprocessing when image-to-ControlNet connections are made
 * Implements comprehensive state management for preprocessing operations
 */
export class PreprocessingTrigger {
  private runwareService: RunwareService;
  private callbacks: PreprocessingTriggerCallbacks;
  private stateManager: PreprocessingStateManager;
  private errorRecoveryService: ErrorRecoveryService;
  private performanceOptimizer?: PerformanceOptimizer;

  constructor(
    runwareService: RunwareService,
    callbacks: PreprocessingTriggerCallbacks = {},
    performanceOptimizer?: PerformanceOptimizer
  ) {
    this.runwareService = runwareService;
    this.callbacks = callbacks;
    this.performanceOptimizer = performanceOptimizer;

    // Initialize state manager with callback integration
    this.stateManager = new PreprocessingStateManagerImpl(
      (nodeId: string, state: PreprocessingState) => {
        this.handleStateChange(nodeId, state);
      }
    );

    // Initialize error recovery service
    this.errorRecoveryService = new ErrorRecoveryService(this.stateManager);
  }

  /**
   * Trigger preprocessing for a ControlNet node when connected to an image
   * Implements comprehensive error handling, retry logic, and fallback behavior
   * @param sourceNode - The source image node
   * @param targetNode - The target ControlNet node
   * @param nodes - All nodes in the workflow (for context)
   * @param edges - All edges in the workflow (for validation)
   */
  async triggerPreprocessing(
    sourceNode: Node,
    targetNode: Node,
    nodes: Node[],
    edges: Edge[]
  ): Promise<void> {
    const nodeId = targetNode.id;

    try {
      // Check if already processing to prevent duplicate operations
      if (this.stateManager.isProcessing(nodeId)) {
        console.log(
          `PreprocessingTrigger: Node ${nodeId} is already processing, skipping`
        );
        return;
      }

      // Check if system can handle concurrent operations (requirement 4.3)
      // Skip if there are already nodes being processed to prevent overload
      const processingNodes = this.stateManager.getAllProcessingNodes();
      if (processingNodes.length > 2) { // Allow up to 2 concurrent operations
        const errorMessage = "Too many concurrent preprocessing operations. Please wait for current operations to complete.";
        console.warn(`PreprocessingTrigger: ${errorMessage}`);
        toast.warning(errorMessage, { duration: 4000 });
        return;
      }

      // Validate that target node requires preprocessing
      if (!requiresPreprocessing(String(targetNode.data?.type) || "")) {
        console.log(
          `PreprocessingTrigger: Node ${targetNode.data?.type} does not require preprocessing (light ControlNet exception)`
        );
        return;
      }

      // Validate that source node has valid image data
      if (!this.hasValidImageData(sourceNode)) {
        const errorMessage =
          "Source node must have valid image data for ControlNet preprocessing";
        console.warn(`PreprocessingTrigger: ${errorMessage}`);
        this.stateManager.setError(nodeId, errorMessage);
        this.handlePreprocessingFailure(nodeId, errorMessage, sourceNode, targetNode);
        return;
      }

      // Get the preprocessor for this ControlNet type
      const preprocessor = getPreprocessorForControlNet(String(targetNode.data?.type) || "");
      if (!preprocessor) {
        const errorMessage = `No preprocessor found for ControlNet type: ${targetNode.data?.type}`;
        console.warn(`PreprocessingTrigger: ${errorMessage}`);
        this.stateManager.setError(nodeId, errorMessage);
        this.handlePreprocessingFailure(nodeId, errorMessage, sourceNode, targetNode);
        return;
      }

      console.log(
        `PreprocessingTrigger: Starting preprocessing for ${targetNode.data?.type} using ${preprocessor}`
      );

      // Set processing state - this will trigger state change callbacks
      this.stateManager.setProcessing(nodeId);

      // Get image URL from source node
      const imageUrl = this.getImageUrlFromNode(sourceNode);
      if (!imageUrl) {
        throw new Error("Unable to extract image URL from source node");
      }

      // Perform preprocessing using the runware service with enhanced error handling
      // Convert URL to File object before preprocessing as per simplified workflow
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const imageFile = new File([blob], 'input.jpg', { type: 'image/jpeg' });
      
      const preprocessedResult = await this.runwareService.preprocessImage(
        imageFile,
        preprocessor
      );

      // Create preprocessed image data object
      const preprocessedImageData = createPreprocessedImageData(
        preprocessedResult.imageURL,
        preprocessedResult.preprocessor,
        String(sourceNode.data?.imageUUID || sourceNode.data?.imageUrl || "")
      );

      // Set completed state - this will trigger state change callbacks
      this.stateManager.setCompleted(nodeId, preprocessedImageData);

      console.log(
        `PreprocessingTrigger: Successfully preprocessed image for ${targetNode.data?.type}`
      );
    } catch (error) {
      console.error("PreprocessingTrigger: Error during preprocessing:", error);

      // Set error state - this will trigger state change callbacks
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.stateManager.setError(nodeId, errorMessage);
      
      // Implement fallback behavior
      await this.handlePreprocessingFailure(nodeId, errorMessage, sourceNode, targetNode);
    }
  }

  /**
   * Handle preprocessing failure with comprehensive error recovery and user guidance
   * @param nodeId - The ControlNet node ID that failed
   * @param errorMessage - The error message
   * @param sourceNode - The source image node
   * @param targetNode - The target ControlNet node
   */
  private async handlePreprocessingFailure(
    nodeId: string,
    errorMessage: string,
    sourceNode: Node,
    targetNode: Node
  ): Promise<void> {
    console.log(`PreprocessingTrigger: Handling preprocessing failure for node ${nodeId}`);

    // Use error recovery service to analyze and provide recovery recommendations
    const recoveryAction = this.errorRecoveryService.analyzeError(
      nodeId, 
      errorMessage, 
      String(targetNode.data?.type) || ""
    );

    // Execute the recovery action
    await this.errorRecoveryService.executeRecovery(recoveryAction, {
      showToast: true,
      autoRetry: recoveryAction.type === 'retry'
    });

    // Implement specific fallback behaviors based on recovery action type
    switch (recoveryAction.type) {
      case 'fallback':
        await this.useOriginalImageAsFallback(nodeId, sourceNode, targetNode);
        break;
        
      case 'retry':
        // Retry logic is handled by the error recovery service
        break;
        
      case 'manual':
        this.maintainConnectionWithError(nodeId, errorMessage);
        break;
        
      default:
        this.maintainConnectionWithError(nodeId, errorMessage);
        break;
    }
  }

  /**
   * Determine the appropriate fallback behavior based on error type and ControlNet type
   */
  private determineFallbackBehavior(errorMessage: string, controlNetType: string): {
    type: 'use_original_image' | 'suggest_alternative' | 'manual_intervention' | 'maintain_error';
    reason: string;
  } {
    // Network or connection errors - suggest retry
    if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('timeout')) {
      return {
        type: 'manual_intervention',
        reason: 'Network connectivity issue - user should retry when connection is stable'
      };
    }

    // Validation errors - suggest alternative
    if (errorMessage.includes('No preprocessor') || errorMessage.includes('not supported')) {
      return {
        type: 'suggest_alternative',
        reason: 'Unsupported ControlNet type - suggest alternatives'
      };
    }

    // Image-related errors - could use original as fallback for some types
    if (errorMessage.includes('image') && (controlNetType === 'control-net-depth' || controlNetType === 'control-net-normal-map')) {
      return {
        type: 'use_original_image',
        reason: 'Some ControlNet types can work with original images as guides'
      };
    }

    // Default - maintain error state
    return {
      type: 'maintain_error',
      reason: 'General error - maintain connection but show error state'
    };
  }

  /**
   * Use original image as fallback for compatible ControlNet types
   */
  private async useOriginalImageAsFallback(nodeId: string, sourceNode: Node, targetNode: Node): Promise<void> {
    const imageUrl = this.getImageUrlFromNode(sourceNode);
    if (!imageUrl) return;

    const fallbackData = createPreprocessedImageData(
      imageUrl, // Use original image URL
      'original', // Mark as original (not preprocessed)
      String(sourceNode.data?.imageUUID || sourceNode.data?.imageUrl || "")
    );

    // Update node data to indicate fallback behavior
    if (this.callbacks.updateNodeData) {
      this.callbacks.updateNodeData(nodeId, {
        preprocessedImage: fallbackData,
        preprocessor: 'original',
        hasPreprocessedImage: true,
        isPreprocessing: false,
        isFallback: true,
        right_sidebar: {
          preprocessedImage: imageUrl,
          showPreprocessed: true,
          isFallback: true
        },
      });
    }

    // Show informative message to user
    toast.info(
      `Using original image for ${this.getControlNetDisplayName(String(targetNode.data?.type) || "")} as fallback. Consider using a different ControlNet type for better results.`,
      { duration: 4000 }
    );

    // Set completed state with fallback data
    this.stateManager.setCompleted(nodeId, fallbackData);
  }

  /**
   * Suggest alternative preprocessor or ControlNet type
   */
  private suggestAlternativePreprocessor(nodeId: string, controlNetType: string): void {
    const alternatives = this.getAlternativeControlNetTypes(controlNetType);
    
    if (alternatives.length > 0) {
      toast.error(
        `${this.getControlNetDisplayName(controlNetType)} is not supported. Try using: ${alternatives.join(', ')}`,
        { duration: 6000 }
      );
    } else {
      toast.error(
        `${this.getControlNetDisplayName(controlNetType)} preprocessing is not available. Please use a different ControlNet type.`,
        { duration: 4000 }
      );
    }
  }

  /**
   * Request manual intervention from user
   */
  private requestManualIntervention(nodeId: string, controlNetType: string, errorMessage: string): void {
    toast.error(
      `${this.getControlNetDisplayName(controlNetType)} preprocessing failed: ${errorMessage}. Please check your connection and try reconnecting the nodes.`,
      { 
        duration: 8000,
        action: {
          label: 'Retry',
          onClick: () => {
            // Clear error state to allow retry
            this.stateManager.setIdle(nodeId);
            toast.info('Ready to retry preprocessing. Reconnect the image to the ControlNet node.');
          }
        }
      }
    );
  }

  /**
   * Maintain connection but show error state
   */
  private maintainConnectionWithError(nodeId: string, errorMessage: string): void {
    // Update node data to show error state but maintain connection
    if (this.callbacks.updateNodeData) {
      this.callbacks.updateNodeData(nodeId, {
        isPreprocessing: false,
        hasPreprocessedImage: false,
        preprocessedImage: undefined,
        hasError: true,
        errorMessage: errorMessage
      });
    }
  }

  /**
   * Get alternative ControlNet types for suggestions
   */
  private getAlternativeControlNetTypes(failedType: string): string[] {
    const alternatives: Record<string, string[]> = {
      'control-net-pose': ['Depth ControlNet', 'Edge ControlNet'],
      'control-net-depth': ['Pose ControlNet', 'Normal Map ControlNet'],
      'control-net-edge': ['Canny ControlNet', 'Pose ControlNet'],
      'control-net-canny': ['Edge ControlNet', 'Depth ControlNet'],
      'control-net-segments': ['Depth ControlNet', 'Edge ControlNet'],
      'control-net-normal-map': ['Depth ControlNet', 'Edge ControlNet']
    };
    
    return alternatives[failedType] || [];
  }

  /**
   * Get user-friendly display name for ControlNet types
   */
  private getControlNetDisplayName(controlNetType: string): string {
    const displayNames: Record<string, string> = {
      'control-net-pose': 'Pose ControlNet',
      'control-net-depth': 'Depth ControlNet',
      'control-net-edge': 'Edge ControlNet',
      'control-net-canny': 'Canny ControlNet',
      'control-net-segments': 'Segmentation ControlNet',
      'control-net-normal-map': 'Normal Map ControlNet',
      'seed-image-lights': 'Light ControlNet'
    };
    
    return displayNames[controlNetType] || controlNetType;
  }

  /**
   * Check if a source node has valid image data
   * @param node - The node to check
   * @returns True if the node has valid image data
   */
  private hasValidImageData(node: Node): boolean {
    // Check for various image data formats
    const nodeData = node.data as any; // Type assertion for property access
    const imageUrl = nodeData?.generatedImage || nodeData?.imageUrl || nodeData?.image || nodeData?.right_sidebar?.imageUrl;

    if (
      !imageUrl ||
      typeof imageUrl !== "string" ||
      imageUrl.trim().length === 0
    ) {
      return false;
    }

    // Validate URL format (data URL or HTTP URL)
    const isDataUrl = imageUrl.startsWith("data:image/");
    const isHttpUrl =
      imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
    const isRunwareUrl =
      imageUrl.includes("runware.ai") || imageUrl.includes("im.runware.ai");

    return isDataUrl || isHttpUrl || isRunwareUrl;
  }

  /**
   * Extract image URL from a node
   * @param node - The node to extract image URL from
   * @returns The image URL or null if not found
   */
  private getImageUrlFromNode(node: Node): string | null {
    const nodeData = node.data as any; // Type assertion for property access
    return nodeData?.generatedImage || nodeData?.imageUrl || nodeData?.image || nodeData?.right_sidebar?.imageUrl || null;
  }

  /**
   * Update callbacks for the preprocessing trigger
   * @param callbacks - New callback functions
   */
  updateCallbacks(callbacks: PreprocessingTriggerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Check if a node is an image node
   * @param node - The node to check
   * @returns True if the node is an image node
   */
  isImageNode(node: Node): boolean {
    return (
      node.type === "image-node" ||
      node.type?.includes("image") ||
      !!node.data?.image ||
      !!node.data?.imageUrl
    );
  }

  /**
   * Check if a node is a ControlNet node
   * @param node - The node to check
   * @returns True if the node is a ControlNet node
   */
  isControlNetNode(node: Node): boolean {
    const nodeData = node.data as any; // Type assertion for property access
    return (
      nodeData?.type?.includes("control-net") || nodeData?.type === "seed-image-lights"
    );
  }

  /**
   * Check if this is an image-to-ControlNet connection that should trigger preprocessing
   * @param sourceNode - The source node
   * @param targetNode - The target node
   * @returns True if preprocessing should be triggered
   */
  shouldTriggerPreprocessing(sourceNode: Node, targetNode: Node): boolean {
    // do not trigger if we already have a result in memory or on the node
    
    if (this.stateManager?.hasResult?.(targetNode.id)) return false;
    
    if ((targetNode.data as any)?.hasPreprocessedImage) return false;
    
    return (
      this.isImageNode(sourceNode) &&
      this.isControlNetNode(targetNode) &&
      requiresPreprocessing(String(targetNode.data?.type) || "") &&
      this.hasValidImageData(sourceNode)
    );
  }

  /**
   * Handle state changes from the state manager
   * Integrates with existing callback system and UI updates with enhanced error handling
   */
  private handleStateChange(nodeId: string, state: PreprocessingState): void {
    switch (state.status) {
      case "processing":
        // Show loading toast with more informative message
        toast.loading("Preprocessing image for ControlNet...", {
          id: `preprocess-${nodeId}`,
          description: "This may take a few seconds depending on image size"
        });

        // Update node data to show processing state
        if (this.callbacks.updateNodeData) {
          this.callbacks.updateNodeData(nodeId, {
            isPreprocessing: true,
            hasPreprocessedImage: false,
            preprocessedImage: undefined,
            hasError: false,
            errorMessage: undefined
          });
        }

        // Notify callback
        if (this.callbacks.onPreprocessingStarted) {
          this.callbacks.onPreprocessingStarted(nodeId);
        }
        break;

      case "completed":
        if (state.result) {
          // Calculate processing duration for user feedback
          const duration = state.endTime && state.startTime 
            ? Math.round((state.endTime - state.startTime) / 1000) 
            : null;

          // Update node data with completed result
          if (this.callbacks.updateNodeData) {
            this.callbacks.updateNodeData(nodeId, {
              preprocessedImage: state.result,
              preprocessor: state.result.preprocessor,
              hasPreprocessedImage: true,
              isPreprocessing: false,
              hasError: false,
              errorMessage: undefined,
              processingDuration: duration,
              right_sidebar: {
                preprocessedImage: state.result.guideImageURL,
                showPreprocessed: true,
                isFallback: state.result.preprocessor === 'original'
              },
            });
          }

          // Notify callback
          if (this.callbacks.onPreprocessingCompleted) {
            this.callbacks.onPreprocessingCompleted(nodeId, state.result);
          }

          // Show success toast with duration info
          toast.dismiss(`preprocess-${nodeId}`);
          // Note: Success toast removed to prevent infinite messages when multiple systems trigger state updates
          // The success state is already indicated through UI updates in the right sidebar
        }
        break;

      case "error":
        // Enhanced error handling with recovery options
        const errorData = {
          isPreprocessing: false,
          hasPreprocessedImage: false,
          preprocessedImage: undefined,
          hasError: true,
          errorMessage: state.error,
          canRetry: this.isRetryableError(state.error || "")
        };

        // Update node data with error state
        if (this.callbacks.updateNodeData) {
          this.callbacks.updateNodeData(nodeId, errorData);
        }

        // Notify callback
        if (this.callbacks.onPreprocessingFailed && state.error) {
          this.callbacks.onPreprocessingFailed(nodeId, state.error);
        }

        // Show error toast with recovery guidance (handled by the error handling methods)
        toast.dismiss(`preprocess-${nodeId}`);
        break;

      case "idle":
        // Clear any processing indicators and errors
        if (this.callbacks.updateNodeData) {
          this.callbacks.updateNodeData(nodeId, {
            isPreprocessing: false,
            hasError: false,
            errorMessage: undefined
          });
        }
        
        // Clear any lingering toasts
        toast.dismiss(`preprocess-${nodeId}`);
        toast.dismiss(`preprocess-error-${nodeId}`);
        toast.dismiss(`preprocess-retry-${nodeId}`);
        break;
    }
  }

  /**
   * Determine if an error is retryable based on error message
   */
  private isRetryableError(errorMessage: string): boolean {
    const retryablePatterns = [
      'network',
      'connection',
      'timeout',
      'temporary',
      'rate limit',
      'server error'
    ];
    
    const lowerMessage = errorMessage.toLowerCase();
    return retryablePatterns.some(pattern => lowerMessage.includes(pattern));
  }

  /**
   * Get the current preprocessing state for a node
   */
  getPreprocessingState(nodeId: string): PreprocessingState {
    return this.stateManager.getState(nodeId);
  }

  /**
   * Check if a node is currently being preprocessed
   */
  isNodeProcessing(nodeId: string): boolean {
    return this.stateManager.isProcessing(nodeId);
  }

  /**
   * Check if a node has preprocessing errors
   */
  hasPreprocessingError(nodeId: string): boolean {
    return this.stateManager.hasError(nodeId);
  }

  /**
   * Check if a node has preprocessing results
   */
  hasPreprocessingResult(nodeId: string): boolean {
    return this.stateManager.hasResult(nodeId);
  }

  /**
   * Clear preprocessing state for a node
   */
  clearPreprocessingState(nodeId: string): void {
    this.stateManager.clearState(nodeId);
  }

  /**
   * Get all nodes currently being processed
   */
  getAllProcessingNodes(): string[] {
    return this.stateManager.getAllProcessingNodes();
  }

  /**
   * Get preprocessing statistics
   */
  getPreprocessingStats() {
    // Return basic stats from state manager
    const processingNodes = this.stateManager.getAllProcessingNodes();
    return {
      totalProcessing: processingNodes.length,
      processingNodes: processingNodes
    };
  }

  /**
   * Clear all preprocessing states
   */
  clearAllPreprocessingStates(): void {
    this.stateManager.clearAllStates();
  }

  /**
   * Perform system maintenance - cleanup stuck operations and provide recovery suggestions
   * Should be called periodically to maintain system health
   */
  performSystemMaintenance(): void {
    // Clean up stuck operations
    const stuckNodes = this.errorRecoveryService.cleanupStuckOperations();
    if (stuckNodes.length > 0) {
      console.log(`PreprocessingTrigger: Cleaned up ${stuckNodes.length} stuck operations`);
      toast.warning(
        `Cleaned up ${stuckNodes.length} stuck preprocessing operation${stuckNodes.length > 1 ? 's' : ''}`,
        { duration: 4000 }
      );
    }

    // Get system-wide recovery suggestions
    const suggestions = this.errorRecoveryService.getSystemRecoverySuggestions();
    if (suggestions.length > 0) {
      console.log('PreprocessingTrigger: System recovery suggestions:', suggestions);
      // Show suggestions to user if there are recurring issues
      toast.info(
        `System suggestions:\n${suggestions.join('\n')}`,
        { duration: 8000 }
      );
    }
  }

  /**
   * Get comprehensive system status for debugging and monitoring
   */
  getSystemStatus(): {
    stats: { totalProcessing: number; processingNodes: string[] };
    stuckOperations: string[];
    recoverySuggestions: string[];
    canHandleConcurrent: boolean;
  } {
    return {
      stats: {
        totalProcessing: this.stateManager.getAllProcessingNodes().length,
        processingNodes: this.stateManager.getAllProcessingNodes()
      },
      stuckOperations: this.errorRecoveryService.cleanupStuckOperations(),
      recoverySuggestions: this.errorRecoveryService.getSystemRecoverySuggestions(),
      canHandleConcurrent: this.stateManager.getAllProcessingNodes().length < 2
    };
  }

  /**
   * Reset error recovery state for a node (useful for manual retry)
   */
  resetNodeErrorRecovery(nodeId: string): void {
    this.errorRecoveryService.resetRetryAttempts(nodeId);
    this.stateManager.setIdle(nodeId);
    toast.info('Node reset successfully. Ready for retry.');
  }
}
