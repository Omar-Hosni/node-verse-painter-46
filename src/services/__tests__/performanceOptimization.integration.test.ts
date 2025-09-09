/**
 * Performance Optimization Integration Tests
 * Tests the complete performance optimization system with caching, debouncing, and memory optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { PerformanceOptimizer } from '../performanceOptimizer';
import { PreprocessingTrigger } from '../preprocessingTrigger';
import { ConnectionHandler } from '../connectionHandler';
import { RunwareService } from '../runwareService';
import { Node, Edge } from '@xyflow/react';

// Mock dependencies
vi.mock('../runwareService');
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('Performance Optimization Integration', () => {
  let performanceOptimizer: PerformanceOptimizer;
  let preprocessingTrigger: PreprocessingTrigger;
  let connectionHandler: ConnectionHandler;
  let mockRunwareService: RunwareService;
  let mockCallbacks: any;

  const createMockNode = (id: string, type: string, data: any = {}): Node => ({
    id,
    type,
    data,
    position: { x: 0, y: 0 },
  });

  const createMockEdge = (source: string, target: string): Edge => ({
    id: `${source}-${target}`,
    source,
    target,
  });

  beforeEach(() => {
    // Create mock RunwareService
    mockRunwareService = {
      preprocessForControlNet: vi.fn(),
      getPreprocessorForControlNet: vi.fn(),
    } as any;

    // Create mock callbacks
    mockCallbacks = {
      onPreprocessingStarted: vi.fn(),
      onPreprocessingCompleted: vi.fn(),
      onPreprocessingFailed: vi.fn(),
      updateNodeData: vi.fn(),
    };

    // Create performance optimizer with test configuration
    performanceOptimizer = new PerformanceOptimizer(
      mockRunwareService,
      {
        enableCaching: true,
        enableDebouncing: true,
        enableMemoryOptimization: true,
        cacheConfig: {
          maxEntries: 10,
          maxMemoryMB: 10,
          ttlMs: 60000,
        },
        debouncerConfig: {
          debounceMs: 50, // Very short for testing
          maxPendingOperations: 5,
        },
        memoryConfig: {
          maxTotalMemoryMB: 20,
          compressionThresholdMB: 1,
        },
      },
      mockCallbacks
    );

    // Create preprocessing trigger with performance optimizer
    preprocessingTrigger = new PreprocessingTrigger(
      mockRunwareService,
      mockCallbacks,
      performanceOptimizer
    );

    // Create connection handler with preprocessing trigger
    connectionHandler = new ConnectionHandler(mockCallbacks, preprocessingTrigger);
  });

  afterEach(() => {
    performanceOptimizer.destroy();
    vi.clearAllMocks();
  });

  describe('End-to-End Workflow', () => {
    it('should handle complete preprocessing workflow with optimizations', async () => {
      const sourceNode = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode = createMockNode('target1', 'control-net-pose');
      const nodes = [sourceNode, targetNode];
      const edges: Edge[] = [];

      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };

      (mockRunwareService.preprocessForControlNet as Mock).mockResolvedValue(mockResult);
      (mockRunwareService.getPreprocessorForControlNet as Mock).mockReturnValue('openpose');

      // Simulate connection creation
      const newEdge = createMockEdge('source1', 'target1');
      const newEdges = [newEdge];

      await connectionHandler.detectConnectionChanges([], newEdges, nodes);

      // Wait for debouncing and processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify preprocessing was triggered
      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
        'control-net-pose'
      );

      // Verify callbacks were called
      expect(mockCallbacks.onPreprocessingStarted).toHaveBeenCalledWith('target1');
      expect(mockCallbacks.onPreprocessingCompleted).toHaveBeenCalledWith(
        'target1',
        expect.objectContaining({
          guideImageURL: mockResult.guideImageURL,
          preprocessor: mockResult.preprocessor,
        }),
        false // Not from cache on first call
      );

      // Verify node data was updated
      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith(
        'target1',
        expect.objectContaining({
          hasPreprocessedImage: true,
          isPreprocessing: false,
          preprocessedImage: expect.objectContaining({
            guideImageURL: mockResult.guideImageURL,
          }),
        })
      );
    });

    it('should use cache on subsequent identical requests', async () => {
      const sourceNode1 = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode1 = createMockNode('target1', 'control-net-pose');
      
      const sourceNode2 = createMockNode('source2', 'image-node', {
        imageUrl: 'https://example.com/image.jpg', // Same URL
      });
      const targetNode2 = createMockNode('target2', 'control-net-pose'); // Same type

      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };

      (mockRunwareService.preprocessForControlNet as Mock).mockResolvedValue(mockResult);
      (mockRunwareService.getPreprocessorForControlNet as Mock).mockReturnValue('openpose');

      // First connection
      await performanceOptimizer.processConnection(sourceNode1, targetNode1, [], []);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second connection with same parameters
      await performanceOptimizer.processConnection(sourceNode2, targetNode2, [], []);
      await new Promise(resolve => setTimeout(resolve, 100));

      // API should only be called once (second call uses cache)
      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledTimes(1);

      // Both callbacks should be called, but second one should indicate cache usage
      expect(mockCallbacks.onPreprocessingCompleted).toHaveBeenCalledTimes(2);
      expect(mockCallbacks.onPreprocessingCompleted).toHaveBeenNthCalledWith(
        2,
        'target2',
        expect.objectContaining({
          guideImageURL: mockResult.guideImageURL,
        }),
        true // From cache
      );
    });

    it('should handle connection removal and cleanup', async () => {
      const sourceNode = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode = createMockNode('target1', 'control-net-pose');
      const nodes = [sourceNode, targetNode];

      const edge = createMockEdge('source1', 'target1');

      // First, create connection
      await connectionHandler.detectConnectionChanges([], [edge], nodes);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then remove connection
      await connectionHandler.detectConnectionChanges([edge], [], nodes);

      // Verify cleanup was performed
      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith(
        'target1',
        expect.objectContaining({
          preprocessedImage: undefined,
          hasPreprocessedImage: false,
          right_sidebar: {
            showPreprocessed: false,
          },
        })
      );
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics across operations', async () => {
      const sourceNode = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode = createMockNode('target1', 'control-net-pose');

      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };

      (mockRunwareService.preprocessForControlNet as Mock).mockResolvedValue(mockResult);

      // Process multiple connections
      await performanceOptimizer.processConnection(sourceNode, targetNode, [], []);
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = performanceOptimizer.getPerformanceMetrics();

      expect(metrics.totalPreprocessingOperations).toBe(1);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.memoryUsageMB).toBeGreaterThan(0);
      expect(metrics.cacheHitRate).toBe(0); // First operation, no cache hits
    });

    it('should show improved performance with caching', async () => {
      const sourceNode = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode1 = createMockNode('target1', 'control-net-pose');
      const targetNode2 = createMockNode('target2', 'control-net-pose');

      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };

      (mockRunwareService.preprocessForControlNet as Mock).mockResolvedValue(mockResult);

      // First operation (cache miss)
      await performanceOptimizer.processConnection(sourceNode, targetNode1, [], []);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second operation (cache hit)
      await performanceOptimizer.processConnection(sourceNode, targetNode2, [], []);
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = performanceOptimizer.getPerformanceMetrics();

      expect(metrics.totalPreprocessingOperations).toBe(2);
      expect(metrics.cacheHitRate).toBe(50); // 1 hit out of 2 operations
      expect(metrics.optimizationsSaved).toBe(1);
    });
  });

  describe('System Optimization', () => {
    it('should perform comprehensive system optimization', async () => {
      // Add some data to optimize
      const sourceNode = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode = createMockNode('target1', 'control-net-pose');

      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };

      (mockRunwareService.preprocessForControlNet as Mock).mockResolvedValue(mockResult);

      await performanceOptimizer.processConnection(sourceNode, targetNode, [], []);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Perform system optimization
      const result = await performanceOptimizer.performSystemOptimization();

      expect(result).toHaveProperty('cacheOptimization');
      expect(result).toHaveProperty('memoryOptimization');
      expect(result).toHaveProperty('debouncerFlush');
      expect(result.debouncerFlush).toBe(true);
    });

    it('should provide comprehensive system status', async () => {
      const status = performanceOptimizer.getSystemStatus();

      expect(status).toHaveProperty('performance');
      expect(status).toHaveProperty('cache');
      expect(status).toHaveProperty('memory');
      expect(status).toHaveProperty('debouncer');
      expect(status).toHaveProperty('config');

      expect(status.performance).toHaveProperty('cacheHitRate');
      expect(status.performance).toHaveProperty('averageProcessingTime');
      expect(status.performance).toHaveProperty('totalPreprocessingOperations');
      expect(status.performance).toHaveProperty('memoryUsageMB');
      expect(status.performance).toHaveProperty('pendingOperations');
      expect(status.performance).toHaveProperty('optimizationsSaved');
    });
  });

  describe('Error Handling with Optimizations', () => {
    it('should handle errors gracefully while maintaining optimization benefits', async () => {
      const sourceNode = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode = createMockNode('target1', 'control-net-pose');

      const error = new Error('Preprocessing failed');
      (mockRunwareService.preprocessForControlNet as Mock).mockRejectedValue(error);

      await performanceOptimizer.processConnection(sourceNode, targetNode, [], []);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify error handling
      expect(mockCallbacks.onPreprocessingFailed).toHaveBeenCalledWith(
        'target1',
        'Preprocessing failed'
      );

      // Verify metrics still track the failed operation
      const metrics = performanceOptimizer.getPerformanceMetrics();
      expect(metrics.totalPreprocessingOperations).toBe(1);
    });

    it('should not cache failed results', async () => {
      const sourceNode = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode1 = createMockNode('target1', 'control-net-pose');
      const targetNode2 = createMockNode('target2', 'control-net-pose');

      const error = new Error('Preprocessing failed');
      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };

      // First call fails
      (mockRunwareService.preprocessForControlNet as Mock).mockRejectedValueOnce(error);
      // Second call succeeds
      (mockRunwareService.preprocessForControlNet as Mock).mockResolvedValueOnce(mockResult);

      // First connection (fails)
      await performanceOptimizer.processConnection(sourceNode, targetNode1, [], []);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second connection (should not use cache, should call API again)
      await performanceOptimizer.processConnection(sourceNode, targetNode2, [], []);
      await new Promise(resolve => setTimeout(resolve, 100));

      // API should be called twice (failed result not cached)
      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledTimes(2);
    });
  });

  describe('Memory Pressure Handling', () => {
    it('should handle memory pressure during intensive operations', async () => {
      // Create many large images to trigger memory pressure
      const largeImageUrl = 'data:image/jpeg;base64,' + 'A'.repeat(1024 * 1024); // ~1MB base64

      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };

      (mockRunwareService.preprocessForControlNet as Mock).mockResolvedValue(mockResult);

      // Process multiple connections with large images
      for (let i = 0; i < 5; i++) {
        const sourceNode = createMockNode(`source${i}`, 'image-node', {
          imageUrl: largeImageUrl,
        });
        const targetNode = createMockNode(`target${i}`, 'control-net-pose');

        await performanceOptimizer.processConnection(sourceNode, targetNode, [], []);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // System should handle memory pressure gracefully
      const status = performanceOptimizer.getSystemStatus();
      expect(status.memory).toBeDefined();
      expect(status.memory.memoryPressure).toBeDefined();
    });
  });

  describe('Configuration Updates', () => {
    it('should handle configuration updates during operation', async () => {
      const sourceNode = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode = createMockNode('target1', 'control-net-pose');

      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };

      (mockRunwareService.preprocessForControlNet as Mock).mockResolvedValue(mockResult);

      // Process initial connection
      await performanceOptimizer.processConnection(sourceNode, targetNode, [], []);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update configuration
      performanceOptimizer.updateConfig({
        enableCaching: false,
        debouncerConfig: {
          debounceMs: 200,
        },
      });

      // Process another connection
      const targetNode2 = createMockNode('target2', 'control-net-pose');
      await performanceOptimizer.processConnection(sourceNode, targetNode2, [], []);
      await new Promise(resolve => setTimeout(resolve, 250));

      // Should work with new configuration
      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledTimes(2);
    });
  });
});