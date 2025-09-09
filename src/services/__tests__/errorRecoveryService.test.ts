/**
 * Error Recovery Service Tests
 * Tests comprehensive error handling and user feedback for ControlNet preprocessing
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ErrorRecoveryService } from '../errorRecoveryService';
import { PreprocessingStateManagerImpl } from '../../store/preprocessingState';
import { toast } from 'sonner';

// Mock sonner toast
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

describe('ErrorRecoveryService', () => {
  let errorRecoveryService: ErrorRecoveryService;
  let stateManager: PreprocessingStateManagerImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    stateManager = new PreprocessingStateManagerImpl();
    errorRecoveryService = new ErrorRecoveryService(stateManager);
  });

  describe('analyzeError', () => {
    it('should identify network errors and suggest retry', () => {
      const action = errorRecoveryService.analyzeError(
        'node1',
        'Network connection failed',
        'control-net-pose'
      );

      expect(action.type).toBe('retry');
      expect(action.message).toContain('Network error detected');
    });

    it('should identify authentication errors and suggest manual intervention', () => {
      const action = errorRecoveryService.analyzeError(
        'node1',
        'Authentication failed - invalid API key',
        'control-net-pose'
      );

      expect(action.type).toBe('manual');
      expect(action.message).toContain('Authentication failed');
    });

    it('should identify validation errors and provide guidance', () => {
      const action = errorRecoveryService.analyzeError(
        'node1',
        'Invalid image format provided',
        'control-net-depth'
      );

      expect(action.type).toBe('manual');
      expect(action.message).toContain('Invalid input for Depth ControlNet');
    });

    it('should identify timeout errors and suggest image optimization', () => {
      const action = errorRecoveryService.analyzeError(
        'node1',
        'Request timed out after 30 seconds',
        'control-net-edge'
      );

      expect(action.type).toBe('manual');
      expect(action.message).toContain('Processing timed out');
    });

    it('should identify rate limit errors and suggest retry with delay', () => {
      const action = errorRecoveryService.analyzeError(
        'node1',
        'Rate limit exceeded - too many requests',
        'control-net-canny'
      );

      expect(action.type).toBe('retry');
      expect(action.message).toContain('Rate limit reached');
    });

    it('should suggest fallback after multiple API errors', () => {
      // Simulate multiple retry attempts
      errorRecoveryService.analyzeError('node1', 'API error occurred', 'control-net-pose');
      errorRecoveryService.analyzeError('node1', 'API error occurred', 'control-net-pose');
      
      const action = errorRecoveryService.analyzeError(
        'node1',
        'API error occurred',
        'control-net-pose'
      );

      expect(action.type).toBe('fallback');
      expect(action.message).toContain('failed multiple times');
    });
  });

  describe('executeRecovery', () => {
    it('should show appropriate toast for retry actions', async () => {
      const action = {
        type: 'retry' as const,
        message: 'Retrying operation...',
        action: vi.fn()
      };

      await errorRecoveryService.executeRecovery(action);

      expect(toast.info).toHaveBeenCalledWith(
        'Retrying operation...',
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Retry Now'
          })
        })
      );
    });

    it('should show warning toast for fallback actions', async () => {
      const action = {
        type: 'fallback' as const,
        message: 'Using fallback behavior',
        action: vi.fn()
      };

      await errorRecoveryService.executeRecovery(action);

      expect(toast.warning).toHaveBeenCalledWith('Using fallback behavior');
    });

    it('should show error toast for manual intervention', async () => {
      const action = {
        type: 'manual' as const,
        message: 'Manual intervention required',
        action: vi.fn()
      };

      await errorRecoveryService.executeRecovery(action);

      expect(toast.error).toHaveBeenCalledWith(
        'Manual intervention required',
        expect.objectContaining({
          duration: 8000,
          action: expect.objectContaining({
            label: 'Learn More'
          })
        })
      );
    });

    it('should execute action callback when provided', async () => {
      const actionCallback = vi.fn();
      const action = {
        type: 'retry' as const,
        message: 'Test message',
        action: actionCallback
      };

      await errorRecoveryService.executeRecovery(action);

      expect(actionCallback).toHaveBeenCalled();
    });

    it('should not show toast when showToast is false', async () => {
      const action = {
        type: 'retry' as const,
        message: 'Test message'
      };

      await errorRecoveryService.executeRecovery(action, { showToast: false });

      expect(toast.info).not.toHaveBeenCalled();
    });
  });

  describe('retry tracking', () => {
    it('should track retry attempts for nodes', () => {
      expect(errorRecoveryService.getRetryCount('node1')).toBe(0);

      errorRecoveryService.analyzeError('node1', 'network error', 'control-net-pose');
      expect(errorRecoveryService.getRetryCount('node1')).toBe(1);

      errorRecoveryService.analyzeError('node1', 'network error', 'control-net-pose');
      expect(errorRecoveryService.getRetryCount('node1')).toBe(2);
    });

    it('should reset retry attempts', () => {
      errorRecoveryService.analyzeError('node1', 'network error', 'control-net-pose');
      expect(errorRecoveryService.getRetryCount('node1')).toBe(1);

      errorRecoveryService.resetRetryAttempts('node1');
      expect(errorRecoveryService.getRetryCount('node1')).toBe(0);
    });
  });

  describe('system-wide error analysis', () => {
    beforeEach(() => {
      // Set up error states to trigger suggestions (need >2 network errors, >1 validation errors)
      stateManager.setError('node1', 'Network connection failed');
      stateManager.setError('node2', 'Network timeout occurred');
      stateManager.setError('node3', 'Network error during processing');
      stateManager.setError('node4', 'Invalid image format provided');
      stateManager.setError('node5', 'Validation failed for input');
    });

    it('should provide system recovery suggestions', () => {
      const suggestions = errorRecoveryService.getSystemRecoverySuggestions();
      
      expect(suggestions).toContain('Check your internet connection - multiple network errors detected');
      expect(suggestions).toContain('Verify image formats and ControlNet types - validation errors detected');
    });

    it('should clean up stuck operations', () => {
      // Set up a stuck operation
      stateManager.setProcessing('stuckNode');
      
      // Mock the state to appear stuck (older than timeout)
      const stuckState = stateManager.getState('stuckNode');
      stuckState.startTime = Date.now() - 70000; // 70 seconds ago
      
      const cleanedNodes = errorRecoveryService.cleanupStuckOperations(60000);
      
      expect(cleanedNodes).toContain('stuckNode');
      expect(stateManager.getState('stuckNode').status).toBe('error');
    });
  });

  describe('error categorization', () => {
    const testCases = [
      { error: 'network connection failed', expectedType: 'retry' },
      { error: 'authentication failed', expectedType: 'manual' },
      { error: 'invalid image format', expectedType: 'manual' },
      { error: 'request timed out', expectedType: 'manual' },
      { error: 'rate limit exceeded', expectedType: 'retry' },
      { error: 'api server error', expectedType: 'retry' },
      { error: 'unknown error occurred', expectedType: 'manual' }
    ];

    testCases.forEach(({ error, expectedType }) => {
      it(`should categorize "${error}" as ${expectedType}`, () => {
        const action = errorRecoveryService.analyzeError('node1', error, 'control-net-pose');
        expect(action.type).toBe(expectedType);
      });
    });
  });

  describe('ControlNet type display names', () => {
    const testCases = [
      { type: 'control-net-pose', expected: 'Pose ControlNet' },
      { type: 'control-net-depth', expected: 'Depth ControlNet' },
      { type: 'control-net-edge', expected: 'Edge ControlNet' },
      { type: 'control-net-canny', expected: 'Canny ControlNet' },
      { type: 'control-net-segments', expected: 'Segmentation ControlNet' },
      { type: 'control-net-normal-map', expected: 'Normal Map ControlNet' },
      { type: 'seed-image-lights', expected: 'Light ControlNet' },
      { type: 'unknown-type', expected: 'unknown-type' }
    ];

    testCases.forEach(({ type, expected }) => {
      it(`should display "${type}" as "${expected}"`, () => {
        const action = errorRecoveryService.analyzeError('node1', 'test error', type);
        expect(action.message).toContain(expected);
      });
    });
  });
});