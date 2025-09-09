/**
 * Integration tests for preprocessing trigger state management
 * Tests requirements 4.1, 4.2, 4.3, and 1.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PreprocessingTrigger } from '../preprocessingTrigger';
import { RunwareService } from '../runwareService';
import { Node } from '@xyflow/react';

// Mock the RunwareService
vi.mock('../runwareService');
vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('PreprocessingTrigger State Management', () => {
  let preprocessingTrigger: PreprocessingTrigger;
  let mockRunwareService: vi.Mocked<RunwareService>;
  let mockCallbacks: {
    onPreprocessingStarted: ReturnType<typeof vi.fn>;
    onPreprocessingCompleted: ReturnType<typeof vi.fn>;
    onPreprocessingFailed: ReturnType<typeof vi.fn>;
    updateNodeData: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRunwareService = {
      preprocessForControlNet: vi.fn(),
    } as any;

    mockCallbacks = {
      onPreprocessingStarted: vi.fn(),
      onPreprocessingCompleted: vi.fn(),
      onPreprocessingFailed: vi.fn(),
      updateNodeData: vi.fn(),
    };

    preprocessingTrigger = new PreprocessingTrigger(
      mockRunwareService,
      mockCallbacks
    );
  });

  const createImageNode = (id: string): Node => ({
    id,
    type: 'image-node',
    position: { x: 0, y: 0 },
    data: {
      imageUrl: 'https://example.com/image.jpg',
    },
  });

  const createControlNetNode = (id: string, type: string): Node => ({
    id,
    type,
    position: { x: 0, y: 0 },
    data: {},
  });

  describe('State Tracking', () => {
    it('should track processing state during preprocessing', async () => {
      const sourceNode = createImageNode('image-1');
      const targetNode = createControlNetNode('controlnet-1', 'control-net-pose');

      // Mock successful preprocessing
      mockRunwareService.preprocessForControlNet.mockResolvedValue({
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      });

      // Start preprocessing
      const preprocessingPromise = preprocessingTrigger.triggerPreprocessing(
        sourceNode,
        targetNode,
        [sourceNode, targetNode],
        []
      );

      // Check that node is marked as processing
      expect(preprocessingTrigger.isNodeProcessing('controlnet-1')).toBe(true);
      expect(preprocessingTrigger.hasPreprocessingError('controlnet-1')).toBe(false);
      expect(preprocessingTrigger.hasPreprocessingResult('controlnet-1')).toBe(false);

      // Wait for completion
      await preprocessingPromise;

      // Check final state
      expect(preprocessingTrigger.isNodeProcessing('controlnet-1')).toBe(false);
      expect(preprocessingTrigger.hasPreprocessingResult('controlnet-1')).toBe(true);
      expect(preprocessingTrigger.hasPreprocessingError('controlnet-1')).toBe(false);
    });

    it('should track error state when preprocessing fails', async () => {
      const sourceNode = createImageNode('image-1');
      const targetNode = createControlNetNode('controlnet-1', 'control-net-pose');

      // Mock failed preprocessing
      mockRunwareService.preprocessForControlNet.mockRejectedValue(
        new Error('API Error')
      );

      // Start preprocessing
      await preprocessingTrigger.triggerPreprocessing(
        sourceNode,
        targetNode,
        [sourceNode, targetNode],
        []
      );

      // Check error state
      expect(preprocessingTrigger.isNodeProcessing('controlnet-1')).toBe(false);
      expect(preprocessingTrigger.hasPreprocessingError('controlnet-1')).toBe(true);
      expect(preprocessingTrigger.hasPreprocessingResult('controlnet-1')).toBe(false);
    });

    it('should prevent duplicate processing operations', async () => {
      const sourceNode = createImageNode('image-1');
      const targetNode = createControlNetNode('controlnet-1', 'control-net-pose');

      // Mock slow preprocessing
      mockRunwareService.preprocessForControlNet.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          guideImageURL: 'https://example.com/processed.jpg',
          preprocessor: 'openpose',
        }), 100))
      );

      // Start first preprocessing
      const firstPromise = preprocessingTrigger.triggerPreprocessing(
        sourceNode,
        targetNode,
        [sourceNode, targetNode],
        []
      );

      // Try to start second preprocessing immediately
      const secondPromise = preprocessingTrigger.triggerPreprocessing(
        sourceNode,
        targetNode,
        [sourceNode, targetNode],
        []
      );

      await Promise.all([firstPromise, secondPromise]);

      // Should only call the service once
      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledTimes(1);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple nodes processing simultaneously', async () => {
      const sourceNode1 = createImageNode('image-1');
      const targetNode1 = createControlNetNode('controlnet-1', 'control-net-pose');
      const sourceNode2 = createImageNode('image-2');
      const targetNode2 = createControlNetNode('controlnet-2', 'control-net-canny');

      // Mock successful preprocessing for both
      mockRunwareService.preprocessForControlNet.mockResolvedValue({
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      });

      // Start both preprocessing operations
      const promise1 = preprocessingTrigger.triggerPreprocessing(
        sourceNode1,
        targetNode1,
        [sourceNode1, targetNode1],
        []
      );

      const promise2 = preprocessingTrigger.triggerPreprocessing(
        sourceNode2,
        targetNode2,
        [sourceNode2, targetNode2],
        []
      );

      // Both should be processing
      expect(preprocessingTrigger.isNodeProcessing('controlnet-1')).toBe(true);
      expect(preprocessingTrigger.isNodeProcessing('controlnet-2')).toBe(true);

      // Wait for both to complete
      await Promise.all([promise1, promise2]);

      // Both should be completed
      expect(preprocessingTrigger.hasPreprocessingResult('controlnet-1')).toBe(true);
      expect(preprocessingTrigger.hasPreprocessingResult('controlnet-2')).toBe(true);
    });

    it('should track all processing nodes', async () => {
      const nodes = [
        { source: createImageNode('image-1'), target: createControlNetNode('controlnet-1', 'control-net-pose') },
        { source: createImageNode('image-2'), target: createControlNetNode('controlnet-2', 'control-net-canny') },
        { source: createImageNode('image-3'), target: createControlNetNode('controlnet-3', 'control-net-depth') },
      ];

      // Mock slow preprocessing
      mockRunwareService.preprocessForControlNet.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          guideImageURL: 'https://example.com/processed.jpg',
          preprocessor: 'openpose',
        }), 50))
      );

      // Start all preprocessing operations
      const promises = nodes.map(({ source, target }) =>
        preprocessingTrigger.triggerPreprocessing(source, target, [source, target], [])
      );

      // Check that all nodes are being tracked
      const processingNodes = preprocessingTrigger.getAllProcessingNodes();
      expect(processingNodes).toHaveLength(3);
      expect(processingNodes).toContain('controlnet-1');
      expect(processingNodes).toContain('controlnet-2');
      expect(processingNodes).toContain('controlnet-3');

      // Wait for all to complete
      await Promise.all(promises);

      // No nodes should be processing
      expect(preprocessingTrigger.getAllProcessingNodes()).toHaveLength(0);
    });
  });

  describe('State Callbacks Integration', () => {
    it('should call callbacks in correct order for successful preprocessing', async () => {
      const sourceNode = createImageNode('image-1');
      const targetNode = createControlNetNode('controlnet-1', 'control-net-pose');

      mockRunwareService.preprocessForControlNet.mockResolvedValue({
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      });

      await preprocessingTrigger.triggerPreprocessing(
        sourceNode,
        targetNode,
        [sourceNode, targetNode],
        []
      );

      // Check callback call order
      expect(mockCallbacks.onPreprocessingStarted).toHaveBeenCalledWith('controlnet-1');
      expect(mockCallbacks.onPreprocessingCompleted).toHaveBeenCalledWith(
        'controlnet-1',
        expect.objectContaining({
          guideImageURL: 'https://example.com/processed.jpg',
          preprocessor: 'openpose',
        })
      );
      expect(mockCallbacks.onPreprocessingFailed).not.toHaveBeenCalled();
    });

    it('should call error callback for failed preprocessing', async () => {
      const sourceNode = createImageNode('image-1');
      const targetNode = createControlNetNode('controlnet-1', 'control-net-pose');

      mockRunwareService.preprocessForControlNet.mockRejectedValue(
        new Error('API Error')
      );

      await preprocessingTrigger.triggerPreprocessing(
        sourceNode,
        targetNode,
        [sourceNode, targetNode],
        []
      );

      expect(mockCallbacks.onPreprocessingStarted).toHaveBeenCalledWith('controlnet-1');
      expect(mockCallbacks.onPreprocessingFailed).toHaveBeenCalledWith('controlnet-1', 'API Error');
      expect(mockCallbacks.onPreprocessingCompleted).not.toHaveBeenCalled();
    });

    it('should update node data during state transitions', async () => {
      const sourceNode = createImageNode('image-1');
      const targetNode = createControlNetNode('controlnet-1', 'control-net-pose');

      mockRunwareService.preprocessForControlNet.mockResolvedValue({
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      });

      await preprocessingTrigger.triggerPreprocessing(
        sourceNode,
        targetNode,
        [sourceNode, targetNode],
        []
      );

      // Check that updateNodeData was called for processing state
      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith('controlnet-1', {
        isPreprocessing: true,
        hasPreprocessedImage: false,
        preprocessedImage: undefined,
      });

      // Check that updateNodeData was called for completed state
      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith('controlnet-1', 
        expect.objectContaining({
          isPreprocessing: false,
          hasPreprocessedImage: true,
          preprocessedImage: expect.objectContaining({
            guideImageURL: 'https://example.com/processed.jpg',
            preprocessor: 'openpose',
          }),
        })
      );
    });
  });

  describe('State Management API', () => {
    it('should provide state query methods', () => {
      const nodeId = 'test-node';
      
      // Initial state
      expect(preprocessingTrigger.isNodeProcessing(nodeId)).toBe(false);
      expect(preprocessingTrigger.hasPreprocessingError(nodeId)).toBe(false);
      expect(preprocessingTrigger.hasPreprocessingResult(nodeId)).toBe(false);
      
      const state = preprocessingTrigger.getPreprocessingState(nodeId);
      expect(state.status).toBe('idle');
    });

    it('should provide statistics', () => {
      const stats = preprocessingTrigger.getPreprocessingStats();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('idle');
    });

    it('should allow clearing individual node states', async () => {
      const sourceNode = createImageNode('image-1');
      const targetNode = createControlNetNode('controlnet-1', 'control-net-pose');

      mockRunwareService.preprocessForControlNet.mockResolvedValue({
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      });

      await preprocessingTrigger.triggerPreprocessing(
        sourceNode,
        targetNode,
        [sourceNode, targetNode],
        []
      );

      expect(preprocessingTrigger.hasPreprocessingResult('controlnet-1')).toBe(true);
      
      preprocessingTrigger.clearPreprocessingState('controlnet-1');
      
      expect(preprocessingTrigger.hasPreprocessingResult('controlnet-1')).toBe(false);
      const state = preprocessingTrigger.getPreprocessingState('controlnet-1');
      expect(state.status).toBe('idle');
    });

    it('should allow clearing all states', async () => {
      const sourceNode1 = createImageNode('image-1');
      const targetNode1 = createControlNetNode('controlnet-1', 'control-net-pose');
      const sourceNode2 = createImageNode('image-2');
      const targetNode2 = createControlNetNode('controlnet-2', 'control-net-canny');

      mockRunwareService.preprocessForControlNet.mockResolvedValue({
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      });

      await Promise.all([
        preprocessingTrigger.triggerPreprocessing(sourceNode1, targetNode1, [sourceNode1, targetNode1], []),
        preprocessingTrigger.triggerPreprocessing(sourceNode2, targetNode2, [sourceNode2, targetNode2], []),
      ]);

      expect(preprocessingTrigger.hasPreprocessingResult('controlnet-1')).toBe(true);
      expect(preprocessingTrigger.hasPreprocessingResult('controlnet-2')).toBe(true);
      
      preprocessingTrigger.clearAllPreprocessingStates();
      
      expect(preprocessingTrigger.hasPreprocessingResult('controlnet-1')).toBe(false);
      expect(preprocessingTrigger.hasPreprocessingResult('controlnet-2')).toBe(false);
    });
  });
});