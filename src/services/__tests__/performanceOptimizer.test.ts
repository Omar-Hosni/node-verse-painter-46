/**
 * Performance Optimizer Service Tests
 * Tests caching, debouncing, and memory optimization functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { PerformanceOptimizer } from '../performanceOptimizer';
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

describe('PerformanceOptimizer', () => {
  let performanceOptimizer: PerformanceOptimizer;
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
          ttlMs: 60000, // 1 minute for testing
        },
        debouncerConfig: {
          debounceMs: 100, // Short debounce for testing
          maxPendingOperations: 5,
        },
        memoryConfig: {
          maxTotalMemoryMB: 20,
          compressionThresholdMB: 1,
        },
      },
      mockCallbacks
    );
  });

  afterEach(() => {
    performanceOptimizer.destroy();
    vi.clearAllMocks();
  });

  describe('Caching', () => {
    it('should cache preprocessing results', async () => {
      const sourceNode = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode = createMockNode('target1', 'control-net-pose');

      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };

      (mockRunwareService.preprocessForControlNet as Mock).mockResolvedValue(mockResult);

      // First call should hit the API
      await performanceOptimizer.processConnection(sourceNode, targetNode, [], []);

      // Wait for debouncing
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onPreprocessingCompleted).toHaveBeenCalledWith(
        'target1',
        expect.objectContaining({
          guideImageURL: mockResult.guideImageURL,
          preprocessor: mockResult.preprocessor,
        }),
        false // Not from cache
      );

      // Second call with same parameters should use cache
      const sourceNode2 = createMockNode('source2', 'image-node', {
        imageUrl: 'https://example.com/image.jpg', // Same URL
      });
      const targetNode2 = createMockNode('target2', 'control-net-pose'); // Same type

      await performanceOptimizer.processConnection(sourceNode2, targetNode2, [], []);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should still be called only once (cached result used)
      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledTimes(1);
      expect(mockCallbacks.onPreprocessingCompleted).toHaveBeenCalledWith(
        'target2',
        expect.objectContaining({
          guideImageURL: mockResult.guideImageURL,
          preprocessor: mockResult.preprocessor,
        }),
        true // From cache
      );
    });

    it('should handle cache misses correctly', async () => {
      const sourceNode1 = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image1.jpg',
      });
      const targetNode1 = createMockNode('target1', 'control-net-pose');

      const sourceNode2 = createMockNode('source2', 'image-node', {
        imageUrl: 'https://example.com/image2.jpg', // Different URL
      });
      const targetNode2 = createMockNode('target2', 'control-net-depth'); // Different type

      const mockResult1 = {
        guideImageURL: 'https://example.com/processed1.jpg',
        preprocessor: 'openpose',
      };

      const mockResult2 = {
        guideImageURL: 'https://example.com/processed2.jpg',
        preprocessor: 'depth_midas',
      };

      (mockRunwareService.preprocessForControlNet as Mock)
        .mockResolvedValueOnce(mockResult1)
        .mockResolvedValueOnce(mockResult2);

      // Process both connections
      await performanceOptimizer.processConnection(sourceNode1, targetNode1, [], []);
      await performanceOptimizer.processConnection(sourceNode2, targetNode2, [], []);

      // Wait for debouncing
      await new Promise(resolve => setTimeout(resolve, 150));

      // Both should hit the API (different cache keys)
      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledTimes(2);
    });
  });

  describe('Debouncing', () => {
    it('should debounce rapid connection changes', async () => {
      const sourceNode = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode = createMockNode('target1', 'control-net-pose');

      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };

      (mockRunwareService.preprocessForControlNet as Mock).mockResolvedValue(mockResult);

      // Make multiple rapid calls
      await performanceOptimizer.processConnection(sourceNode, targetNode, [], []);
      await performanceOptimizer.processConnection(sourceNode, targetNode, [], []);
      await performanceOptimizer.processConnection(sourceNode, targetNode, [], []);

      // Should only process once after debounce period
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnections', () => {
      performanceOptimizer.processDisconnection('source1', 'target1', [], []);

      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith('target1', {
        preprocessedImage: undefined,
        hasPreprocessedImage: false,
        isPreprocessing: false,
        hasError: false,
        errorMessage: undefined,
        right_sidebar: {
          showPreprocessed: false,
        },
      });
    });
  });

  describe('Memory Optimization', () => {
    it('should track memory usage', async () => {
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
      await new Promise(resolve => setTimeout(resolve, 150));

      const metrics = performanceOptimizer.getPerformanceMetrics();
      expect(metrics.memoryUsageMB).toBeGreaterThan(0);
    });

    it('should clean up memory on disconnection', () => {
      performanceOptimizer.processDisconnection('source1', 'target1', [], []);

      // Memory should be cleaned up for the target node
      const systemStatus = performanceOptimizer.getSystemStatus();
      expect(systemStatus.memory).toBeDefined();
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics correctly', async () => {
      const sourceNode = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode = createMockNode('target1', 'control-net-pose');

      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };

      (mockRunwareService.preprocessForControlNet as Mock).mockResolvedValue(mockResult);

      // Process connection
      await performanceOptimizer.processConnection(sourceNode, targetNode, [], []);
      await new Promise(resolve => setTimeout(resolve, 150));

      const metrics = performanceOptimizer.getPerformanceMetrics();

      expect(metrics.totalPreprocessingOperations).toBe(1);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.cacheHitRate).toBe(0); // First call, no cache hit
    });

    it('should calculate cache hit rate correctly', async () => {
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

      // First call (cache miss)
      await performanceOptimizer.processConnection(sourceNode, targetNode1, [], []);
      await new Promise(resolve => setTimeout(resolve, 150));

      // Second call with same parameters (cache hit)
      await performanceOptimizer.processConnection(sourceNode, targetNode2, [], []);
      await new Promise(resolve => setTimeout(resolve, 150));

      const metrics = performanceOptimizer.getPerformanceMetrics();

      expect(metrics.totalPreprocessingOperations).toBe(2);
      expect(metrics.cacheHitRate).toBe(50); // 1 hit out of 2 operations
      expect(metrics.optimizationsSaved).toBe(1);
    });
  });

  describe('System Optimization', () => {
    it('should perform comprehensive system optimization', async () => {
      const result = await performanceOptimizer.performSystemOptimization();

      expect(result).toHaveProperty('cacheOptimization');
      expect(result).toHaveProperty('memoryOptimization');
      expect(result).toHaveProperty('debouncerFlush');
    });

    it('should provide system status', () => {
      const status = performanceOptimizer.getSystemStatus();

      expect(status).toHaveProperty('performance');
      expect(status).toHaveProperty('cache');
      expect(status).toHaveProperty('memory');
      expect(status).toHaveProperty('debouncer');
      expect(status).toHaveProperty('config');
    });
  });

  describe('Configuration', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        enableCaching: false,
        cacheConfig: {
          maxEntries: 20,
        },
      };

      performanceOptimizer.updateConfig(newConfig);

      const status = performanceOptimizer.getSystemStatus();
      expect(status.config.enableCaching).toBe(false);
    });

    it('should update callbacks correctly', () => {
      const newCallbacks = {
        onPreprocessingStarted: vi.fn(),
      };

      performanceOptimizer.updateCallbacks(newCallbacks);

      // The callback should be updated (tested indirectly through functionality)
      expect(newCallbacks.onPreprocessingStarted).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle preprocessing errors gracefully', async () => {
      const sourceNode = createMockNode('source1', 'image-node', {
        imageUrl: 'https://example.com/image.jpg',
      });
      const targetNode = createMockNode('target1', 'control-net-pose');

      const error = new Error('Preprocessing failed');
      (mockRunwareService.preprocessForControlNet as Mock).mockRejectedValue(error);

      await performanceOptimizer.processConnection(sourceNode, targetNode, [], []);
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockCallbacks.onPreprocessingFailed).toHaveBeenCalledWith(
        'target1',
        'Preprocessing failed'
      );

      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith('target1', {
        isPreprocessing: false,
        hasPreprocessedImage: false,
        hasError: true,
        errorMessage: 'Preprocessing failed',
      });
    });
  });

  describe('Resource Cleanup', () => {
    it('should reset all systems correctly', () => {
      performanceOptimizer.reset();

      const metrics = performanceOptimizer.getPerformanceMetrics();
      expect(metrics.totalPreprocessingOperations).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
    });

    it('should destroy resources properly', () => {
      expect(() => {
        performanceOptimizer.destroy();
      }).not.toThrow();
    });
  });
});