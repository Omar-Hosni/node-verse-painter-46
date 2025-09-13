// @ts-nocheck
/**
 * Preprocessing State Management
 * Manages the state of ControlNet preprocessing operations
 * Implements requirements 4.1, 4.2, 4.3, and 1.4
 */

import { PreprocessedImageData } from "../utils/controlNetUtils";

export interface PreprocessingState {
  nodeId: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  result?: PreprocessedImageData;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface PreprocessingStateManager {
  // State queries
  getState(nodeId: string): PreprocessingState;
  isProcessing(nodeId: string): boolean;
  hasError(nodeId: string): boolean;
  hasResult(nodeId: string): boolean;
  getAllProcessingNodes(): string[];
  
  // State mutations
  setProcessing(nodeId: string): void;
  setCompleted(nodeId: string, result: PreprocessedImageData): void;
  setError(nodeId: string, error: string): void;
  setIdle(nodeId: string): void;
  clearState(nodeId: string): void;
  clearAllStates(): void;
  
  // Callbacks
  onStateChange?: (nodeId: string, state: PreprocessingState) => void;
}

/**
 * Implementation of preprocessing state management
 * Provides centralized state tracking for all preprocessing operations
 */
export class PreprocessingStateManagerImpl implements PreprocessingStateManager {
  private states: Map<string, PreprocessingState> = new Map();
  public onStateChange?: (nodeId: string, state: PreprocessingState) => void;

  constructor(onStateChange?: (nodeId: string, state: PreprocessingState) => void) {
    this.onStateChange = onStateChange;
  }

  /**
   * Get the current state for a node
   */
  getState(nodeId: string): PreprocessingState {
    return this.states.get(nodeId) || {
      nodeId,
      status: 'idle'
    };
  }

  /**
   * Check if a node is currently processing
   */
  isProcessing(nodeId: string): boolean {
    const state = this.getState(nodeId);
    return state.status === 'processing';
  }

  /**
   * Check if a node has an error
   */
  hasError(nodeId: string): boolean {
    const state = this.getState(nodeId);
    return state.status === 'error';
  }

  /**
   * Check if a node has a completed result
   */
  hasResult(nodeId: string): boolean {
    const state = this.getState(nodeId);
    return state.status === 'completed' && !!state.result;
  }

  /**
   * Get all nodes that are currently processing
   */
  getAllProcessingNodes(): string[] {
    const processingNodes: string[] = [];
    this.states.forEach((state, nodeId) => {
      if (state.status === 'processing') {
        processingNodes.push(nodeId);
      }
    });
    return processingNodes;
  }

  /**
   * Set a node to processing state
   */
  setProcessing(nodeId: string): void {
    const newState: PreprocessingState = {
      nodeId,
      status: 'processing',
      startTime: Date.now(),
      error: undefined,
      result: undefined
    };
    
    this.states.set(nodeId, newState);
    this.notifyStateChange(nodeId, newState);
  }

  /**
   * Set a node to completed state with result
   */
  setCompleted(nodeId: string, result: PreprocessedImageData): void {
    const existingState = this.getState(nodeId);
    const newState: PreprocessingState = {
      ...existingState,
      status: 'completed',
      result,
      error: undefined,
      endTime: Date.now()
    };
    
    this.states.set(nodeId, newState);
    this.notifyStateChange(nodeId, newState);
  }

  /**
   * Set a node to error state
   */
  setError(nodeId: string, error: string): void {
    const existingState = this.getState(nodeId);
    const newState: PreprocessingState = {
      ...existingState,
      status: 'error',
      error,
      result: undefined,
      endTime: Date.now()
    };
    
    this.states.set(nodeId, newState);
    this.notifyStateChange(nodeId, newState);
  }

  /**
   * Set a node to idle state
   */
  setIdle(nodeId: string): void {
    const newState: PreprocessingState = {
      nodeId,
      status: 'idle',
      error: undefined,
      result: undefined
    };
    
    this.states.set(nodeId, newState);
    this.notifyStateChange(nodeId, newState);
  }

  /**
   * Clear state for a specific node
   */
  clearState(nodeId: string): void {
    this.states.delete(nodeId);
    // Notify with idle state when cleared
    this.notifyStateChange(nodeId, {
      nodeId,
      status: 'idle'
    });
  }

  /**
   * Clear all preprocessing states
   */
  clearAllStates(): void {
    const nodeIds = Array.from(this.states.keys());
    this.states.clear();
    
    // Notify all cleared nodes
    nodeIds.forEach(nodeId => {
      this.notifyStateChange(nodeId, {
        nodeId,
        status: 'idle'
      });
    });
  }

  /**
   * Get processing duration for a node (if available)
   */
  getProcessingDuration(nodeId: string): number | null {
    const state = this.getState(nodeId);
    if (state.startTime && state.endTime) {
      return state.endTime - state.startTime;
    }
    if (state.startTime && state.status === 'processing') {
      return Date.now() - state.startTime;
    }
    return null;
  }

  /**
   * Get statistics about current preprocessing operations
   */
  getStats(): {
    total: number;
    processing: number;
    completed: number;
    errors: number;
    idle: number;
    averageProcessingTime: number | null;
  } {
    const stats = {
      total: this.states.size,
      processing: 0,
      completed: 0,
      errors: 0,
      idle: 0,
      averageProcessingTime: null as number | null
    };

    const processingTimes: number[] = [];

    this.states.forEach(state => {
      switch (state.status) {
        case 'processing':
          stats.processing++;
          break;
        case 'completed':
          stats.completed++;
          if (state.startTime && state.endTime) {
            processingTimes.push(state.endTime - state.startTime);
          }
          break;
        case 'error':
          stats.errors++;
          break;
        case 'idle':
          stats.idle++;
          break;
      }
    });

    // Calculate average processing time
    if (processingTimes.length > 0) {
      stats.averageProcessingTime = Math.round(
        processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      );
    }

    return stats;
  }

  /**
   * Check if the system can handle additional concurrent preprocessing operations
   * Implements requirement 4.3 - handle multiple operations independently
   */
  canHandleConcurrentOperation(): boolean {
    const maxConcurrentOperations = 5; // Reasonable limit to prevent overwhelming the API
    const currentProcessing = this.getAllProcessingNodes().length;
    return currentProcessing < maxConcurrentOperations;
  }

  /**
   * Get nodes that have been processing for too long (potential stuck operations)
   */
  getStuckOperations(timeoutMs: number = 60000): string[] {
    const now = Date.now();
    const stuckNodes: string[] = [];

    this.states.forEach((state, nodeId) => {
      if (state.status === 'processing' && state.startTime) {
        const processingTime = now - state.startTime;
        if (processingTime > timeoutMs) {
          stuckNodes.push(nodeId);
        }
      }
    });

    return stuckNodes;
  }

  /**
   * Clean up stuck operations and set them to error state
   */
  cleanupStuckOperations(timeoutMs: number = 60000): string[] {
    const stuckNodes = this.getStuckOperations(timeoutMs);
    
    stuckNodes.forEach(nodeId => {
      this.setError(nodeId, 'Operation timed out and was automatically cancelled');
    });

    return stuckNodes;
  }

  /**
   * Get error recovery suggestions based on error patterns
   */
  getErrorRecoverySuggestions(): {
    networkErrors: number;
    validationErrors: number;
    apiErrors: number;
    suggestions: string[];
  } {
    const errorCounts = {
      networkErrors: 0,
      validationErrors: 0,
      apiErrors: 0,
      suggestions: [] as string[]
    };

    this.states.forEach(state => {
      if (state.status === 'error' && state.error) {
        const errorMessage = state.error.toLowerCase();
        
        if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          errorCounts.networkErrors++;
        } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
          errorCounts.validationErrors++;
        } else {
          errorCounts.apiErrors++;
        }
      }
    });

    // Generate suggestions based on error patterns
    if (errorCounts.networkErrors > 2) {
      errorCounts.suggestions.push('Check your internet connection - multiple network errors detected');
    }
    if (errorCounts.validationErrors > 1) {
      errorCounts.suggestions.push('Verify image formats and ControlNet types - validation errors detected');
    }
    if (errorCounts.apiErrors > 3) {
      errorCounts.suggestions.push('API service may be experiencing issues - try again later');
    }

    return errorCounts;
  }

  /**
   * Notify state change callback
   */
  private notifyStateChange(nodeId: string, state: PreprocessingState): void {
    if (this.onStateChange) {
      this.onStateChange(nodeId, state);
    }
  }
}

/**
 * Export types for use in other modules
 */
export type { PreprocessingState, PreprocessingStateManager };