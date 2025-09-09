/**
 * Error Handling Integration Tests
 * Tests the complete error handling flow for ControlNet preprocessing
 * Verifies requirements 1.4 and 4.3 implementation
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { PreprocessingTrigger } from '../preprocessingTrigger';
import { RunwareService } from '../runwareService';
import { ErrorRecoveryService } from '../errorRecoveryService';
import { PreprocessingStateManagerImpl } from '../../store/preprocessingState';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  }
}));

vi.mock('../runwareService');

describe('Error Handling Integration', () => {
  let preprocessingTrigger: PreprocessingTrigger;
  let mockRunwareService: vi.Mocked<RunwareService>;
  let stateManager: PreprocessingStateManagerImpl;
  let errorRecoveryService: ErrorRecoveryService;

  const mockSourceNode = {
    id: 'source-1',
    type: 'image-node',
    position: { x: 0, y: 0 },
    data: {
      imageUrl: 'https://example.com/image.jpg',
      imageUUID: 'test-uuid'
    }
  };

  const mockTargetNode = {
    id: 'target-1',
    type: 'control-net-pose',
    position: { x: 100, y: 0 },
    data: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock RunwareService
    mockRunwareService = {
      preprocessForControlNet: vi.fn(),
      getPreprocessorForControlNet: vi.fn(),
    } as any;

    // Create preprocessing trigger with mocked dependencies
    preprocessingTrigger = new PreprocessingTrigger(mockRunwareService, {
      updateNodeData: vi.fn()
    });

    // Get access to internal services for testing
    stateManager = (preprocessingTrigger as any).stateManager;
    errorRecoveryService = (preprocessingTrigger as any).errorRecoveryService;
  });

  describe('Network Error Handling', () => {
    it('should retry network errors with exponential backoff', async () => {
      // Mock network error on first call, success on second
      mockRunwareService.preprocessForControlNet
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockResolvedValueOnce({
          guideImageURL: 'https://example.com/processed.jpg',
          preprocessor: 'openpose'
        });

      await preprocessingTrigger.triggerPreprocessing(
        mockSourceNode,
        mockTargetNode,
        [mockSourceNode, mockTargetNode],
        []
      );

      // Should have called the service twice (initial + retry)
      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledTimes(2);
      
      // Should show retry toast
      expect(toast.loading).toHaveBeenCalledWith(
        expect.stringContaining('Retrying'),
        expect.any(Object)
      );
    });

    it('should provide system-wide network error suggestions', () => {
      // Simulate multiple network errors
      stateManager.setError('node1', 'Network connection failed');
      stateManager.setError('node2', 'Network timeout occurred');
      stateManager.setError('node3', 'Network error during processing');

      const suggestions = errorRecoveryService.getSystemRecoverySuggestions();
      
      expect(suggestions).toContain('Check your internet connection - multiple network errors detected');
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle invalid image data gracefully', async () => {
      const invalidSourceNode = {
        ...mockSourceNode,
        data: { imageUrl: '' } // Invalid empty URL
      };

      await preprocessingTrigger.triggerPreprocessing(
        invalidSourceNode,
        mockTargetNode,
        [invalidSourceNode, mockTargetNode],
        []
      );

      // Should not call the service
      expect(mockRunwareService.preprocessForControlNet).not.toHaveBeenCalled();
      
      // Should set error state
      const state = stateManager.getState(mockTargetNode.id);
      expect(state.status).toBe('error');
      expect(state.error).toContain('valid image data');
    });

    it('should handle unsupported ControlNet types', async () => {
      const unsupportedNode = {
        ...mockTargetNode,
        type: 'unsupported-controlnet-type'
      };

      await preprocessingTrigger.triggerPreprocessing(
        mockSourceNode,
        unsupportedNode,
        [mockSourceNode, unsupportedNode],
        []
      );

      // Should not call the service
      expect(mockRunwareService.preprocessForControlNet).not.toHaveBeenCalled();
      
      // Should set error state
      const state = stateManager.getState(unsupportedNode.id);
      expect(state.status).toBe('error');
      expect(state.error).toContain('No preprocessor found');
    });
  });

  describe('Concurrent Operation Handling', () => {
    it('should handle multiple concurrent preprocessing operations', async () => {
      // Mock successful preprocessing
      mockRunwareService.preprocessForControlNet.mockResolvedValue({
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose'
      });

      const nodes = [mockSourceNode, mockTargetNode];
      const promises = [];

      // Start multiple concurrent operations
      for (let i = 0; i < 3; i++) {
        const targetNode = { ...mockTargetNode, id: `target-${i}` };
        promises.push(
          preprocessingTrigger.triggerPreprocessing(
            mockSourceNode,
            targetNode,
            [...nodes, targetNode],
            []
          )
        );
      }

      await Promise.all(promises);

      // All operations should complete successfully
      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledTimes(3);
      
      // Check that all nodes have completed state
      for (let i = 0; i < 3; i++) {
        const state = stateManager.getState(`target-${i}`);
        expect(state.status).toBe('completed');
      }
    });

    it('should prevent too many concurrent operations', async () => {
      // Mock the canHandleConcurrentOperation to return false
      vi.spyOn(stateManager, 'canHandleConcurrentOperation').mockReturnValue(false);

      await preprocessingTrigger.triggerPreprocessing(
        mockSourceNode,
        mockTargetNode,
        [mockSourceNode, mockTargetNode],
        []
      );

      // Should not call the service
      expect(mockRunwareService.preprocessForControlNet).not.toHaveBeenCalled();
      
      // Should show warning toast
      expect(toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('Too many concurrent'),
        expect.any(Object)
      );
    });
  });

  describe('Fallback Behavior', () => {
    it('should use original image as fallback for compatible ControlNet types', async () => {
      const depthControlNetNode = {
        ...mockTargetNode,
        type: 'control-net-depth'
      };

      // Mock preprocessing failure
      mockRunwareService.preprocessForControlNet.mockRejectedValue(
        new Error('Preprocessing failed')
      );

      await preprocessingTrigger.triggerPreprocessing(
        mockSourceNode,
        depthControlNetNode,
        [mockSourceNode, depthControlNetNode],
        []
      );

      // Should show fallback info toast
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining('Using original image'),
        expect.any(Object)
      );
    });

    it('should suggest alternative ControlNet types for unsupported types', async () => {
      const action = errorRecoveryService.analyzeError(
        'node1',
        'No preprocessor available for ControlNet type: unsupported-type',
        'unsupported-type'
      );

      expect(action.type).toBe('manual');
      expect(action.message).toContain('not supported');
    });
  });

  describe('Error Recovery and User Feedback', () => {
    it('should provide actionable error messages', async () => {
      const testCases = [
        {
          error: 'Authentication failed - invalid API key',
          expectedMessage: 'Authentication failed',
          expectedAction: 'manual'
        },
        {
          error: 'Network connection timeout',
          expectedMessage: 'Network error detected',
          expectedAction: 'retry'
        },
        {
          error: 'Invalid image format provided',
          expectedMessage: 'Invalid input',
          expectedAction: 'manual'
        }
      ];

      for (const testCase of testCases) {
        const action = errorRecoveryService.analyzeError(
          'test-node',
          testCase.error,
          'control-net-pose'
        );

        expect(action.type).toBe(testCase.expectedAction);
        expect(action.message).toContain(testCase.expectedMessage);
      }
    });

    it('should track retry attempts and suggest fallback after multiple failures', () => {
      // Simulate multiple retry attempts
      for (let i = 0; i < 3; i++) {
        errorRecoveryService.analyzeError('node1', 'API error occurred', 'control-net-pose');
      }

      const action = errorRecoveryService.analyzeError(
        'node1',
        'API error occurred',
        'control-net-pose'
      );

      expect(action.type).toBe('fallback');
      expect(action.message).toContain('failed multiple times');
    });

    it('should provide system maintenance capabilities', () => {
      // Set up a stuck operation
      stateManager.setProcessing('stuck-node');
      const stuckState = stateManager.getState('stuck-node');
      stuckState.startTime = Date.now() - 70000; // 70 seconds ago

      // Perform system maintenance
      preprocessingTrigger.performSystemMaintenance();

      // Should clean up stuck operation
      const cleanedState = stateManager.getState('stuck-node');
      expect(cleanedState.status).toBe('error');
      expect(cleanedState.error).toContain('timed out');
    });
  });

  describe('User Experience', () => {
    it('should show appropriate loading states during processing', async () => {
      mockRunwareService.preprocessForControlNet.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const promise = preprocessingTrigger.triggerPreprocessing(
        mockSourceNode,
        mockTargetNode,
        [mockSourceNode, mockTargetNode],
        []
      );

      // Should show loading toast immediately
      expect(toast.loading).toHaveBeenCalledWith(
        expect.stringContaining('Preprocessing image'),
        expect.objectContaining({
          id: expect.stringContaining('preprocess-'),
          description: expect.stringContaining('may take a few seconds')
        })
      );

      await promise;
    });

    it('should provide clear success feedback with timing information', async () => {
      mockRunwareService.preprocessForControlNet.mockResolvedValue({
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose'
      });

      await preprocessingTrigger.triggerPreprocessing(
        mockSourceNode,
        mockTargetNode,
        [mockSourceNode, mockTargetNode],
        []
      );

      // Should dismiss loading toast and show success
      expect(toast.dismiss).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('successfully'),
        expect.any(Object)
      );
    });
  });

  describe('System Status and Monitoring', () => {
    it('should provide comprehensive system status', () => {
      // Set up various states
      stateManager.setProcessing('processing-node');
      stateManager.setCompleted('completed-node', {
        guideImageURL: 'test.jpg',
        preprocessor: 'openpose',
        sourceImageUUID: 'test',
        timestamp: Date.now()
      });
      stateManager.setError('error-node', 'Test error');

      const status = preprocessingTrigger.getSystemStatus();

      expect(status.stats.processing).toBe(1);
      expect(status.stats.completed).toBe(1);
      expect(status.stats.errors).toBe(1);
      expect(status.canHandleConcurrent).toBe(true);
    });

    it('should allow manual error recovery reset', () => {
      // Set up error state
      stateManager.setError('error-node', 'Test error');
      errorRecoveryService.analyzeError('error-node', 'test error', 'control-net-pose');

      expect(errorRecoveryService.getRetryCount('error-node')).toBe(1);

      // Reset error recovery
      preprocessingTrigger.resetNodeErrorRecovery('error-node');

      expect(errorRecoveryService.getRetryCount('error-node')).toBe(0);
      expect(stateManager.getState('error-node').status).toBe('idle');
    });
  });
});