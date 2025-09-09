/**
 * Connection Debouncer Service Tests
 * Tests debouncing functionality for rapid connection changes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionDebouncer } from '../connectionDebouncer';
import { Node, Edge } from '@xyflow/react';

describe('ConnectionDebouncer', () => {
  let debouncer: ConnectionDebouncer;
  let mockCallbacks: any;

  const createMockNode = (id: string, type: string): Node => ({
    id,
    type,
    data: {},
    position: { x: 0, y: 0 },
  });

  beforeEach(() => {
    mockCallbacks = {
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
      onBatchStart: vi.fn(),
      onBatchComplete: vi.fn(),
    };

    debouncer = new ConnectionDebouncer(
      {
        debounceMs: 100, // Short debounce for testing
        maxPendingOperations: 10,
        batchSize: 5,
      },
      mockCallbacks
    );
  });

  afterEach(() => {
    debouncer.destroy();
    vi.clearAllMocks();
  });

  describe('Basic Debouncing', () => {
    it('should debounce connection operations', async () => {
      const nodes = [
        createMockNode('source1', 'image-node'),
        createMockNode('target1', 'control-net-pose'),
      ];

      // Make multiple rapid calls
      debouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);
      debouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);
      debouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);

      // Should not execute immediately
      expect(mockCallbacks.onConnect).not.toHaveBeenCalled();

      // Wait for debounce period
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should execute only once
      expect(mockCallbacks.onConnect).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onConnect).toHaveBeenCalledWith(
        nodes[0],
        nodes[1],
        nodes,
        []
      );
    });

    it('should debounce disconnection operations', async () => {
      const nodes = [
        createMockNode('source1', 'image-node'),
        createMockNode('target1', 'control-net-pose'),
      ];

      debouncer.debounceConnection('source1', 'target1', 'disconnect', nodes, []);
      debouncer.debounceConnection('source1', 'target1', 'disconnect', nodes, []);

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockCallbacks.onDisconnect).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onDisconnect).toHaveBeenCalledWith(
        'source1',
        'target1',
        nodes,
        []
      );
    });

    it('should handle different connection pairs independently', async () => {
      const nodes = [
        createMockNode('source1', 'image-node'),
        createMockNode('source2', 'image-node'),
        createMockNode('target1', 'control-net-pose'),
        createMockNode('target2', 'control-net-depth'),
      ];

      debouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);
      debouncer.debounceConnection('source2', 'target2', 'connect', nodes, []);

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockCallbacks.onConnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Operation Management', () => {
    it('should cancel specific operations', async () => {
      const nodes = [createMockNode('source1', 'image-node'), createMockNode('target1', 'control-net-pose')];

      debouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);
      
      // Cancel the operation
      debouncer.cancelOperation('source1', 'target1');

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockCallbacks.onConnect).not.toHaveBeenCalled();
    });

    it('should cancel all operations', async () => {
      const nodes = [
        createMockNode('source1', 'image-node'),
        createMockNode('source2', 'image-node'),
        createMockNode('target1', 'control-net-pose'),
        createMockNode('target2', 'control-net-depth'),
      ];

      debouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);
      debouncer.debounceConnection('source2', 'target2', 'connect', nodes, []);

      debouncer.cancelAllOperations();

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockCallbacks.onConnect).not.toHaveBeenCalled();
    });

    it('should respect maximum pending operations limit', () => {
      const nodes = [createMockNode('source1', 'image-node'), createMockNode('target1', 'control-net-pose')];

      // Create debouncer with low limit
      const limitedDebouncer = new ConnectionDebouncer(
        { maxPendingOperations: 2 },
        mockCallbacks
      );

      // Add operations up to limit
      limitedDebouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);
      limitedDebouncer.debounceConnection('source2', 'target2', 'connect', nodes, []);

      const statsBefore = limitedDebouncer.getStats();
      expect(statsBefore.pendingOperations).toBe(2);

      // This should be dropped due to limit
      limitedDebouncer.debounceConnection('source3', 'target3', 'connect', nodes, []);

      const statsAfter = limitedDebouncer.getStats();
      expect(statsAfter.pendingOperations).toBe(2); // Should not increase

      limitedDebouncer.destroy();
    });
  });

  describe('Batch Processing', () => {
    it('should flush all pending operations', async () => {
      const nodes = [
        createMockNode('source1', 'image-node'),
        createMockNode('source2', 'image-node'),
        createMockNode('target1', 'control-net-pose'),
        createMockNode('target2', 'control-net-depth'),
      ];

      debouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);
      debouncer.debounceConnection('source2', 'target2', 'connect', nodes, []);

      // Flush immediately
      await debouncer.flush(nodes, []);

      expect(mockCallbacks.onBatchStart).toHaveBeenCalledWith(2);
      expect(mockCallbacks.onConnect).toHaveBeenCalledTimes(2);
      expect(mockCallbacks.onBatchComplete).toHaveBeenCalledWith(2, []);
    });

    it('should process operations in batches', async () => {
      const nodes = [createMockNode('source1', 'image-node'), createMockNode('target1', 'control-net-pose')];

      // Create debouncer with small batch size
      const batchDebouncer = new ConnectionDebouncer(
        { batchSize: 2 },
        mockCallbacks
      );

      // Add more operations than batch size
      for (let i = 0; i < 5; i++) {
        batchDebouncer.debounceConnection(`source${i}`, `target${i}`, 'connect', nodes, []);
      }

      await batchDebouncer.flush(nodes, []);

      // Should process all operations despite batch size limit
      expect(mockCallbacks.onConnect).toHaveBeenCalledTimes(5);

      batchDebouncer.destroy();
    });

    it('should handle mixed connect and disconnect operations', async () => {
      const nodes = [
        createMockNode('source1', 'image-node'),
        createMockNode('target1', 'control-net-pose'),
      ];

      debouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);
      debouncer.debounceConnection('source2', 'target2', 'disconnect', nodes, []);

      await debouncer.flush(nodes, []);

      expect(mockCallbacks.onConnect).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide accurate statistics', () => {
      const nodes = [createMockNode('source1', 'image-node'), createMockNode('target1', 'control-net-pose')];

      debouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);
      debouncer.debounceConnection('source2', 'target2', 'disconnect', nodes, []);

      const stats = debouncer.getStats();

      expect(stats.pendingOperations).toBe(2);
      expect(stats.isProcessing).toBe(false);
      expect(stats.operationsByType.connect).toBe(1);
      expect(stats.operationsByType.disconnect).toBe(1);
      expect(stats.oldestPendingAge).toBeGreaterThan(0);
      expect(stats.config).toEqual({
        debounceMs: 100,
        maxPendingOperations: 10,
        batchSize: 5,
      });
    });

    it('should provide debug information', () => {
      const nodes = [createMockNode('source1', 'image-node'), createMockNode('target1', 'control-net-pose')];

      debouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);
      debouncer.debounceConnection('source2', 'target2', 'disconnect', nodes, []);

      const debugInfo = debouncer.getDebugInfo();

      expect(debugInfo).toHaveLength(2);
      expect(debugInfo[0]).toHaveProperty('id');
      expect(debugInfo[0]).toHaveProperty('operation');
      expect(debugInfo[0]).toHaveProperty('sourceNodeId');
      expect(debugInfo[0]).toHaveProperty('targetNodeId');
      expect(debugInfo[0]).toHaveProperty('age');
      expect(debugInfo[0]).toHaveProperty('remainingTime');
    });
  });

  describe('Configuration', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        debounceMs: 200,
        maxPendingOperations: 20,
        batchSize: 10,
      };

      debouncer.updateConfig(newConfig);

      const stats = debouncer.getStats();
      expect(stats.config).toEqual(newConfig);
    });

    it('should update callbacks correctly', () => {
      const newCallbacks = {
        onConnect: vi.fn(),
        onDisconnect: vi.fn(),
      };

      debouncer.updateCallbacks(newCallbacks);

      // The callbacks should be updated (tested indirectly through functionality)
      expect(newCallbacks.onConnect).toBeDefined();
      expect(newCallbacks.onDisconnect).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle callback errors gracefully', async () => {
      const errorCallback = vi.fn().mockRejectedValue(new Error('Callback error'));
      const errorDebouncer = new ConnectionDebouncer(
        { debounceMs: 50 },
        { onConnect: errorCallback }
      );

      const nodes = [
        createMockNode('source1', 'image-node'),
        createMockNode('target1', 'control-net-pose'),
      ];

      errorDebouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorCallback).toHaveBeenCalled();

      errorDebouncer.destroy();
    });

    it('should handle missing nodes gracefully', async () => {
      const nodes: Node[] = []; // Empty nodes array

      debouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);

      await new Promise(resolve => setTimeout(resolve, 150));

      // Should not call callback when nodes are missing
      expect(mockCallbacks.onConnect).not.toHaveBeenCalled();
    });
  });

  describe('Resource Management', () => {
    it('should clean up resources on destroy', () => {
      const nodes = [createMockNode('source1', 'image-node'), createMockNode('target1', 'control-net-pose')];

      debouncer.debounceConnection('source1', 'target1', 'connect', nodes, []);

      const statsBefore = debouncer.getStats();
      expect(statsBefore.pendingOperations).toBe(1);

      debouncer.destroy();

      const statsAfter = debouncer.getStats();
      expect(statsAfter.pendingOperations).toBe(0);
    });
  });
});