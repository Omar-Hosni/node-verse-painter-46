/**
 * Connection Debouncer Service
 * Implements debouncing for rapid connection changes to prevent excessive API calls
 * Addresses requirement 4.4 - performance optimizations
 */

import { Node, Edge } from "@xyflow/react";

// Debounced operation interface
export interface DebouncedOperation {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  operation: 'connect' | 'disconnect';
  timestamp: number;
  timeout?: NodeJS.Timeout;
}

// Debouncer configuration
export interface DebouncerConfig {
  debounceMs: number; // Debounce delay in milliseconds
  maxPendingOperations: number; // Maximum pending operations
  batchSize: number; // Maximum operations to process in one batch
}

// Debouncer callbacks
export interface DebouncerCallbacks {
  onConnect?: (sourceNode: Node, targetNode: Node, nodes: Node[], edges: Edge[]) => Promise<void>;
  onDisconnect?: (sourceNodeId: string, targetNodeId: string, nodes: Node[], edges: Edge[]) => void;
  onBatchStart?: (operationCount: number) => void;
  onBatchComplete?: (processedCount: number, errors: string[]) => void;
}

/**
 * Connection Debouncer Service
 * Manages debouncing of connection changes to optimize performance
 */
export class ConnectionDebouncer {
  private pendingOperations: Map<string, DebouncedOperation> = new Map();
  private config: DebouncerConfig;
  private callbacks: DebouncerCallbacks;
  private isProcessing = false;

  constructor(
    config: Partial<DebouncerConfig> = {},
    callbacks: DebouncerCallbacks = {}
  ) {
    this.config = {
      debounceMs: config.debounceMs || 300, // 300ms default debounce
      maxPendingOperations: config.maxPendingOperations || 50,
      batchSize: config.batchSize || 10,
    };
    this.callbacks = callbacks;
  }

  /**
   * Debounce a connection operation
   * @param sourceNodeId - Source node ID
   * @param targetNodeId - Target node ID
   * @param operation - Operation type (connect/disconnect)
   * @param nodes - Current nodes array
   * @param edges - Current edges array
   */
  debounceConnection(
    sourceNodeId: string,
    targetNodeId: string,
    operation: 'connect' | 'disconnect',
    nodes: Node[],
    edges: Edge[]
  ): void {
    const operationId = this.generateOperationId(sourceNodeId, targetNodeId);
    
    // Cancel existing timeout for this connection
    const existingOperation = this.pendingOperations.get(operationId);
    if (existingOperation?.timeout) {
      clearTimeout(existingOperation.timeout);
    }

    // Check if we're at capacity
    if (this.pendingOperations.size >= this.config.maxPendingOperations) {
      console.warn(
        `ConnectionDebouncer: Maximum pending operations (${this.config.maxPendingOperations}) reached. ` +
        `Dropping operation: ${operation} ${sourceNodeId} -> ${targetNodeId}`
      );
      return;
    }

    // Create new debounced operation
    const debouncedOperation: DebouncedOperation = {
      id: operationId,
      sourceNodeId,
      targetNodeId,
      operation,
      timestamp: Date.now(),
    };

    // Set timeout for execution
    debouncedOperation.timeout = setTimeout(() => {
      this.executeOperation(debouncedOperation, nodes, edges);
    }, this.config.debounceMs);

    // Store the operation
    this.pendingOperations.set(operationId, debouncedOperation);

    console.log(
      `ConnectionDebouncer: Debounced ${operation} operation for ${sourceNodeId} -> ${targetNodeId} ` +
      `(${this.config.debounceMs}ms delay, ${this.pendingOperations.size} pending)`
    );
  }

  /**
   * Execute a debounced operation
   * @param operation - The operation to execute
   * @param nodes - Current nodes array
   * @param edges - Current edges array
   */
  private async executeOperation(
    operation: DebouncedOperation,
    nodes: Node[],
    edges: Edge[]
  ): Promise<void> {
    // Remove from pending operations
    this.pendingOperations.delete(operation.id);

    try {
      if (operation.operation === 'connect') {
        await this.executeConnect(operation, nodes, edges);
      } else {
        this.executeDisconnect(operation, nodes, edges);
      }
    } catch (error) {
      console.error(
        `ConnectionDebouncer: Error executing ${operation.operation} operation:`,
        error
      );
    }
  }

  /**
   * Execute a connect operation
   * @param operation - The connect operation
   * @param nodes - Current nodes array
   * @param edges - Current edges array
   */
  private async executeConnect(
    operation: DebouncedOperation,
    nodes: Node[],
    edges: Edge[]
  ): Promise<void> {
    const sourceNode = nodes.find(n => n.id === operation.sourceNodeId);
    const targetNode = nodes.find(n => n.id === operation.targetNodeId);

    if (!sourceNode || !targetNode) {
      console.warn(
        `ConnectionDebouncer: Nodes not found for connect operation: ` +
        `${operation.sourceNodeId} -> ${operation.targetNodeId}`
      );
      return;
    }

    if (this.callbacks.onConnect) {
      await this.callbacks.onConnect(sourceNode, targetNode, nodes, edges);
    }

    console.log(
      `ConnectionDebouncer: Executed connect operation: ${sourceNode.type} -> ${targetNode.type}`
    );
  }

  /**
   * Execute a disconnect operation
   * @param operation - The disconnect operation
   * @param nodes - Current nodes array
   * @param edges - Current edges array
   */
  private executeDisconnect(
    operation: DebouncedOperation,
    nodes: Node[],
    edges: Edge[]
  ): void {
    if (this.callbacks.onDisconnect) {
      this.callbacks.onDisconnect(operation.sourceNodeId, operation.targetNodeId, nodes, edges);
    }

    console.log(
      `ConnectionDebouncer: Executed disconnect operation: ${operation.sourceNodeId} -> ${operation.targetNodeId}`
    );
  }

  /**
   * Process all pending operations immediately (flush)
   * @param nodes - Current nodes array
   * @param edges - Current edges array
   */
  async flush(nodes: Node[], edges: Edge[]): Promise<void> {
    if (this.isProcessing) {
      console.log('ConnectionDebouncer: Already processing, skipping flush');
      return;
    }

    const operations = Array.from(this.pendingOperations.values());
    if (operations.length === 0) {
      return;
    }

    this.isProcessing = true;
    const errors: string[] = [];

    try {
      // Notify batch start
      if (this.callbacks.onBatchStart) {
        this.callbacks.onBatchStart(operations.length);
      }

      console.log(`ConnectionDebouncer: Flushing ${operations.length} pending operations`);

      // Clear all timeouts
      operations.forEach(op => {
        if (op.timeout) {
          clearTimeout(op.timeout);
        }
      });

      // Process operations in batches
      const batches = this.createBatches(operations);
      let processedCount = 0;

      for (const batch of batches) {
        await this.processBatch(batch, nodes, edges, errors);
        processedCount += batch.length;
      }

      // Clear all pending operations
      this.pendingOperations.clear();

      // Notify batch complete
      if (this.callbacks.onBatchComplete) {
        this.callbacks.onBatchComplete(processedCount, errors);
      }

      console.log(
        `ConnectionDebouncer: Flush completed. Processed: ${processedCount}, Errors: ${errors.length}`
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Create batches from operations array
   * @param operations - Operations to batch
   * @returns Array of operation batches
   */
  private createBatches(operations: DebouncedOperation[]): DebouncedOperation[][] {
    const batches: DebouncedOperation[][] = [];
    
    for (let i = 0; i < operations.length; i += this.config.batchSize) {
      batches.push(operations.slice(i, i + this.config.batchSize));
    }
    
    return batches;
  }

  /**
   * Process a batch of operations
   * @param batch - Batch of operations to process
   * @param nodes - Current nodes array
   * @param edges - Current edges array
   * @param errors - Array to collect errors
   */
  private async processBatch(
    batch: DebouncedOperation[],
    nodes: Node[],
    edges: Edge[],
    errors: string[]
  ): Promise<void> {
    // Group operations by type for better performance
    const connectOps = batch.filter(op => op.operation === 'connect');
    const disconnectOps = batch.filter(op => op.operation === 'disconnect');

    // Process disconnects first (cleanup)
    for (const op of disconnectOps) {
      try {
        this.executeDisconnect(op, nodes, edges);
      } catch (error) {
        const errorMsg = `Disconnect ${op.sourceNodeId}->${op.targetNodeId}: ${error}`;
        errors.push(errorMsg);
        console.error('ConnectionDebouncer:', errorMsg);
      }
    }

    // Process connects with concurrency control
    const connectPromises = connectOps.map(async (op) => {
      try {
        await this.executeConnect(op, nodes, edges);
      } catch (error) {
        const errorMsg = `Connect ${op.sourceNodeId}->${op.targetNodeId}: ${error}`;
        errors.push(errorMsg);
        console.error('ConnectionDebouncer:', errorMsg);
      }
    });

    // Wait for all connects to complete
    await Promise.allSettled(connectPromises);
  }

  /**
   * Generate unique operation ID
   * @param sourceNodeId - Source node ID
   * @param targetNodeId - Target node ID
   * @returns Unique operation ID
   */
  private generateOperationId(sourceNodeId: string, targetNodeId: string): string {
    return `${sourceNodeId}->${targetNodeId}`;
  }

  /**
   * Cancel a specific pending operation
   * @param sourceNodeId - Source node ID
   * @param targetNodeId - Target node ID
   */
  cancelOperation(sourceNodeId: string, targetNodeId: string): void {
    const operationId = this.generateOperationId(sourceNodeId, targetNodeId);
    const operation = this.pendingOperations.get(operationId);
    
    if (operation) {
      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }
      this.pendingOperations.delete(operationId);
      console.log(`ConnectionDebouncer: Cancelled operation ${operationId}`);
    }
  }

  /**
   * Cancel all pending operations
   */
  cancelAllOperations(): void {
    const count = this.pendingOperations.size;
    
    this.pendingOperations.forEach(operation => {
      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }
    });
    
    this.pendingOperations.clear();
    
    if (count > 0) {
      console.log(`ConnectionDebouncer: Cancelled ${count} pending operations`);
    }
  }

  /**
   * Get debouncer statistics
   * @returns Debouncer statistics
   */
  getStats(): {
    pendingOperations: number;
    isProcessing: boolean;
    config: DebouncerConfig;
    oldestPendingAge: number | null;
    operationsByType: { connect: number; disconnect: number };
  } {
    const now = Date.now();
    let oldestAge: number | null = null;
    const operationsByType = { connect: 0, disconnect: 0 };

    this.pendingOperations.forEach(operation => {
      const age = now - operation.timestamp;
      if (oldestAge === null || age > oldestAge) {
        oldestAge = age;
      }
      operationsByType[operation.operation]++;
    });

    return {
      pendingOperations: this.pendingOperations.size,
      isProcessing: this.isProcessing,
      config: { ...this.config },
      oldestPendingAge: oldestAge,
      operationsByType,
    };
  }

  /**
   * Update debouncer configuration
   * @param newConfig - New configuration values
   */
  updateConfig(newConfig: Partial<DebouncerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('ConnectionDebouncer: Configuration updated', this.config);
  }

  /**
   * Update callbacks
   * @param newCallbacks - New callback functions
   */
  updateCallbacks(newCallbacks: DebouncerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...newCallbacks };
  }

  /**
   * Get pending operations for debugging
   * @returns Array of pending operations with metadata
   */
  getDebugInfo(): Array<{
    id: string;
    operation: string;
    sourceNodeId: string;
    targetNodeId: string;
    age: string;
    remainingTime: string;
  }> {
    const now = Date.now();
    const operations: Array<{
      id: string;
      operation: string;
      sourceNodeId: string;
      targetNodeId: string;
      age: string;
      remainingTime: string;
    }> = [];

    this.pendingOperations.forEach(operation => {
      const age = now - operation.timestamp;
      const remainingTime = Math.max(0, this.config.debounceMs - age);
      
      operations.push({
        id: operation.id,
        operation: operation.operation,
        sourceNodeId: operation.sourceNodeId,
        targetNodeId: operation.targetNodeId,
        age: `${Math.round(age)}ms`,
        remainingTime: `${Math.round(remainingTime)}ms`,
      });
    });

    return operations.sort((a, b) => parseInt(b.age) - parseInt(a.age));
  }

  /**
   * Cleanup resources when debouncer is destroyed
   */
  destroy(): void {
    this.cancelAllOperations();
    console.log('ConnectionDebouncer: Destroyed');
  }
}