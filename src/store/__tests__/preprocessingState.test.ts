/**
 * Unit tests for preprocessing state management
 * Tests requirements 4.1, 4.2, 4.3, and 1.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  PreprocessingStateManagerImpl, 
  PreprocessingState 
} from '../preprocessingState';
import { createPreprocessedImageData } from '../../utils/controlNetUtils';

describe('PreprocessingStateManager', () => {
  let stateManager: PreprocessingStateManagerImpl;
  let onStateChangeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onStateChangeMock = vi.fn();
    stateManager = new PreprocessingStateManagerImpl(onStateChangeMock);
  });

  describe('Initial State', () => {
    it('should return idle state for new nodes', () => {
      const state = stateManager.getState('test-node');
      expect(state).toEqual({
        nodeId: 'test-node',
        status: 'idle'
      });
    });

    it('should report no processing nodes initially', () => {
      expect(stateManager.getAllProcessingNodes()).toEqual([]);
    });

    it('should report empty stats initially', () => {
      const stats = stateManager.getStats();
      expect(stats).toEqual({
        total: 0,
        processing: 0,
        completed: 0,
        errors: 0,
        idle: 0
      });
    });
  });

  describe('Processing State Management', () => {
    it('should set node to processing state', () => {
      stateManager.setProcessing('test-node');
      
      const state = stateManager.getState('test-node');
      expect(state.status).toBe('processing');
      expect(state.startTime).toBeDefined();
      expect(state.error).toBeUndefined();
      expect(state.result).toBeUndefined();
    });

    it('should identify processing nodes', () => {
      stateManager.setProcessing('node1');
      stateManager.setProcessing('node2');
      
      expect(stateManager.isProcessing('node1')).toBe(true);
      expect(stateManager.isProcessing('node2')).toBe(true);
      expect(stateManager.isProcessing('node3')).toBe(false);
    });

    it('should track all processing nodes', () => {
      stateManager.setProcessing('node1');
      stateManager.setProcessing('node2');
      
      const processingNodes = stateManager.getAllProcessingNodes();
      expect(processingNodes).toContain('node1');
      expect(processingNodes).toContain('node2');
      expect(processingNodes).toHaveLength(2);
    });

    it('should call state change callback when setting processing', () => {
      stateManager.setProcessing('test-node');
      
      expect(onStateChangeMock).toHaveBeenCalledWith('test-node', expect.objectContaining({
        nodeId: 'test-node',
        status: 'processing'
      }));
    });
  });

  describe('Completion State Management', () => {
    it('should set node to completed state with result', () => {
      const mockResult = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose',
        'source-uuid'
      );

      stateManager.setProcessing('test-node');
      stateManager.setCompleted('test-node', mockResult);
      
      const state = stateManager.getState('test-node');
      expect(state.status).toBe('completed');
      expect(state.result).toEqual(mockResult);
      expect(state.error).toBeUndefined();
      expect(state.endTime).toBeDefined();
    });

    it('should identify nodes with results', () => {
      const mockResult = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose',
        'source-uuid'
      );

      stateManager.setCompleted('test-node', mockResult);
      
      expect(stateManager.hasResult('test-node')).toBe(true);
      expect(stateManager.hasResult('other-node')).toBe(false);
    });

    it('should call state change callback when setting completed', () => {
      const mockResult = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose',
        'source-uuid'
      );

      stateManager.setCompleted('test-node', mockResult);
      
      expect(onStateChangeMock).toHaveBeenCalledWith('test-node', expect.objectContaining({
        nodeId: 'test-node',
        status: 'completed',
        result: mockResult
      }));
    });
  });

  describe('Error State Management', () => {
    it('should set node to error state', () => {
      const errorMessage = 'Preprocessing failed';
      
      stateManager.setError('test-node', errorMessage);
      
      const state = stateManager.getState('test-node');
      expect(state.status).toBe('error');
      expect(state.error).toBe(errorMessage);
      expect(state.result).toBeUndefined();
      expect(state.endTime).toBeDefined();
    });

    it('should identify nodes with errors', () => {
      stateManager.setError('test-node', 'Error message');
      
      expect(stateManager.hasError('test-node')).toBe(true);
      expect(stateManager.hasError('other-node')).toBe(false);
    });

    it('should call state change callback when setting error', () => {
      const errorMessage = 'Preprocessing failed';
      
      stateManager.setError('test-node', errorMessage);
      
      expect(onStateChangeMock).toHaveBeenCalledWith('test-node', expect.objectContaining({
        nodeId: 'test-node',
        status: 'error',
        error: errorMessage
      }));
    });
  });

  describe('State Transitions', () => {
    it('should transition from processing to completed', () => {
      const mockResult = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose',
        'source-uuid'
      );

      stateManager.setProcessing('test-node');
      expect(stateManager.isProcessing('test-node')).toBe(true);
      
      stateManager.setCompleted('test-node', mockResult);
      expect(stateManager.isProcessing('test-node')).toBe(false);
      expect(stateManager.hasResult('test-node')).toBe(true);
    });

    it('should transition from processing to error', () => {
      stateManager.setProcessing('test-node');
      expect(stateManager.isProcessing('test-node')).toBe(true);
      
      stateManager.setError('test-node', 'Failed');
      expect(stateManager.isProcessing('test-node')).toBe(false);
      expect(stateManager.hasError('test-node')).toBe(true);
    });

    it('should preserve start time across state transitions', () => {
      stateManager.setProcessing('test-node');
      const processingState = stateManager.getState('test-node');
      const startTime = processingState.startTime;
      
      stateManager.setError('test-node', 'Failed');
      const errorState = stateManager.getState('test-node');
      
      expect(errorState.startTime).toBe(startTime);
    });
  });

  describe('State Clearing', () => {
    it('should clear individual node state', () => {
      stateManager.setProcessing('test-node');
      expect(stateManager.isProcessing('test-node')).toBe(true);
      
      stateManager.clearState('test-node');
      expect(stateManager.isProcessing('test-node')).toBe(false);
      
      const state = stateManager.getState('test-node');
      expect(state.status).toBe('idle');
    });

    it('should clear all states', () => {
      stateManager.setProcessing('node1');
      stateManager.setProcessing('node2');
      stateManager.setError('node3', 'Error');
      
      expect(stateManager.getAllProcessingNodes()).toHaveLength(2);
      
      stateManager.clearAllStates();
      
      expect(stateManager.getAllProcessingNodes()).toHaveLength(0);
      expect(stateManager.getStats().total).toBe(0);
    });

    it('should call state change callback when clearing', () => {
      stateManager.setProcessing('test-node');
      onStateChangeMock.mockClear();
      
      stateManager.clearState('test-node');
      
      expect(onStateChangeMock).toHaveBeenCalledWith('test-node', {
        nodeId: 'test-node',
        status: 'idle'
      });
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide accurate statistics', () => {
      const mockResult = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose',
        'source-uuid'
      );

      stateManager.setProcessing('node1');
      stateManager.setProcessing('node2');
      stateManager.setCompleted('node3', mockResult);
      stateManager.setError('node4', 'Error');
      stateManager.setIdle('node5');
      
      const stats = stateManager.getStats();
      expect(stats).toEqual({
        total: 5,
        processing: 2,
        completed: 1,
        errors: 1,
        idle: 1
      });
    });

    it('should calculate processing duration', () => {
      stateManager.setProcessing('test-node');
      
      // Wait a bit to ensure time difference
      setTimeout(() => {
        const duration = stateManager.getProcessingDuration('test-node');
        expect(duration).toBeGreaterThan(0);
      }, 10);
    });

    it('should calculate total processing duration after completion', () => {
      const mockResult = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose',
        'source-uuid'
      );

      stateManager.setProcessing('test-node');
      
      setTimeout(() => {
        stateManager.setCompleted('test-node', mockResult);
        const duration = stateManager.getProcessingDuration('test-node');
        expect(duration).toBeGreaterThan(0);
      }, 10);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent preprocessing operations', () => {
      stateManager.setProcessing('node1');
      stateManager.setProcessing('node2');
      stateManager.setProcessing('node3');
      
      expect(stateManager.getAllProcessingNodes()).toHaveLength(3);
      expect(stateManager.isProcessing('node1')).toBe(true);
      expect(stateManager.isProcessing('node2')).toBe(true);
      expect(stateManager.isProcessing('node3')).toBe(true);
    });

    it('should handle independent state transitions', () => {
      const mockResult = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose',
        'source-uuid'
      );

      stateManager.setProcessing('node1');
      stateManager.setProcessing('node2');
      
      stateManager.setCompleted('node1', mockResult);
      stateManager.setError('node2', 'Failed');
      
      expect(stateManager.hasResult('node1')).toBe(true);
      expect(stateManager.hasError('node2')).toBe(true);
      expect(stateManager.isProcessing('node1')).toBe(false);
      expect(stateManager.isProcessing('node2')).toBe(false);
    });
  });
});