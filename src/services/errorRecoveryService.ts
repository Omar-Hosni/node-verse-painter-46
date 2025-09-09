/**
 * Error Recovery Service
 * Provides comprehensive error recovery and user guidance for ControlNet preprocessing
 * Implements requirement 1.4 and 4.3 for error handling and user feedback
 */

import { toast } from "sonner";
import { PreprocessingStateManager } from "../store/preprocessingState";

export interface ErrorRecoveryOptions {
  showToast?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'manual' | 'ignore';
  message: string;
  action?: () => void;
}

/**
 * Error Recovery Service for ControlNet preprocessing operations
 * Provides intelligent error analysis and recovery suggestions
 */
export class ErrorRecoveryService {
  private stateManager: PreprocessingStateManager;
  private retryAttempts: Map<string, number> = new Map();

  constructor(stateManager: PreprocessingStateManager) {
    this.stateManager = stateManager;
  }

  /**
   * Analyze error and provide recovery recommendations
   * @param nodeId - The node that encountered the error
   * @param error - The error message or object
   * @param controlNetType - The ControlNet type
   * @returns Recovery action recommendation
   */
  analyzeError(nodeId: string, error: string | Error, controlNetType: string): RecoveryAction {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const lowerError = errorMessage.toLowerCase();

    // Handle specific API success with missing data errors - these should never retry
    if (this.isApiSuccessWithMissingData(errorMessage)) {
      return this.createManualAction(
        `${this.getControlNetDisplayName(controlNetType)} processing completed but returned incomplete data. This indicates an API issue that cannot be resolved by retrying. Please try with a different image or contact support.`,
        () => this.showApiDataIssueGuidance()
      );
    }

    // Network/Connection errors - suggest retry
    if (this.isNetworkError(lowerError)) {
      return this.createRetryAction(nodeId, errorMessage, 'network');
    }

    // Authentication errors - suggest API key check
    if (this.isAuthenticationError(lowerError)) {
      return this.createManualAction(
        'Authentication failed. Please check your API key in settings.',
        () => this.showApiKeyGuidance()
      );
    }

    // Validation errors - suggest alternatives
    if (this.isValidationError(lowerError)) {
      return this.createManualAction(
        `Invalid input for ${this.getControlNetDisplayName(controlNetType)}. Please check your image and try again.`,
        () => this.showValidationGuidance(controlNetType)
      );
    }

    // Timeout errors - suggest image optimization
    if (this.isTimeoutError(lowerError)) {
      return this.createManualAction(
        'Processing timed out. Try using a smaller image (under 2MB).',
        () => this.showImageOptimizationGuidance()
      );
    }

    // Rate limit errors - suggest waiting
    if (this.isRateLimitError(lowerError)) {
      return this.createRetryAction(nodeId, errorMessage, 'rate_limit', 30000); // 30 second delay
    }

    // API errors - suggest fallback or retry
    if (this.isApiError(lowerError)) {
      const retryCount = this.retryAttempts.get(nodeId) || 0;
      if (retryCount < 2) {
        return this.createRetryAction(nodeId, errorMessage, 'api');
      } else {
        return this.createFallbackAction(nodeId, controlNetType);
      }
    }

    // Unknown errors - suggest general troubleshooting
    return this.createManualAction(
      `Failed to preprocess image for ${this.getControlNetDisplayName(controlNetType)}: ${errorMessage}. Please try again or contact support.`,
      () => this.showGeneralTroubleshooting()
    );
  }

  /**
   * Execute recovery action
   * @param action - The recovery action to execute
   * @param options - Recovery options
   */
  async executeRecovery(action: RecoveryAction, options: ErrorRecoveryOptions = {}): Promise<void> {
    const { showToast = true } = options;

    if (showToast) {
      switch (action.type) {
        case 'retry':
          toast.info(action.message, {
            action: action.action ? {
              label: 'Retry Now',
              onClick: action.action
            } : undefined
          });
          break;
        case 'fallback':
          toast.warning(action.message);
          break;
        case 'manual':
          toast.error(action.message, {
            duration: 8000,
            action: action.action ? {
              label: 'Learn More',
              onClick: action.action
            } : undefined
          });
          break;
        case 'ignore':
          toast.info(action.message);
          break;
      }
    }

    // Execute the action if provided
    if (action.action) {
      action.action();
    }
  }

  /**
   * Get system-wide error recovery suggestions
   */
  getSystemRecoverySuggestions(): string[] {
    const errorAnalysis = this.stateManager.getErrorRecoverySuggestions();
    return errorAnalysis.suggestions;
  }

  /**
   * Clean up stuck operations
   */
  cleanupStuckOperations(): string[] {
    return this.stateManager.cleanupStuckOperations();
  }

  /**
   * Reset retry attempts for a node
   */
  resetRetryAttempts(nodeId: string): void {
    this.retryAttempts.delete(nodeId);
  }

  /**
   * Get retry count for a node
   */
  getRetryCount(nodeId: string): number {
    return this.retryAttempts.get(nodeId) || 0;
  }

  // Private helper methods

  private isApiSuccessWithMissingData(error: string): boolean {
    return error.includes('Upload successful but no URL returned') || 
           error.includes('Preprocessing completed but no guide image URL was returned') ||
           error.includes('Image generation completed but no image URL returned');
  }

  private isNetworkError(error: string): boolean {
    return error.includes('network') || error.includes('connection') || 
           error.includes('fetch') || error.includes('cors');
  }

  private isAuthenticationError(error: string): boolean {
    return error.includes('authentication') || error.includes('unauthorized') || 
           error.includes('api key') || error.includes('forbidden');
  }

  private isValidationError(error: string): boolean {
    return error.includes('validation') || error.includes('invalid') || 
           error.includes('required') || error.includes('format');
  }

  private isTimeoutError(error: string): boolean {
    return error.includes('timeout') || error.includes('timed out') || 
           error.includes('deadline');
  }

  private isRateLimitError(error: string): boolean {
    return error.includes('rate limit') || error.includes('too many requests') || 
           error.includes('quota exceeded');
  }

  private isApiError(error: string): boolean {
    return error.includes('api error') || error.includes('server error') || 
           error.includes('internal error') || error.includes('service unavailable');
  }

  private createRetryAction(
    nodeId: string, 
    errorMessage: string, 
    errorType: string, 
    delay: number = 2000
  ): RecoveryAction {
    const retryCount = this.retryAttempts.get(nodeId) || 0;
    this.retryAttempts.set(nodeId, retryCount + 1);

    return {
      type: 'retry',
      message: `${this.getRetryMessage(errorType)} (Attempt ${retryCount + 1}/3)`,
      action: () => {
        setTimeout(() => {
          this.stateManager.setIdle(nodeId);
          toast.info('Ready to retry. Reconnect the image to the ControlNet node.');
        }, delay);
      }
    };
  }

  private createFallbackAction(nodeId: string, controlNetType: string): RecoveryAction {
    return {
      type: 'fallback',
      message: `${this.getControlNetDisplayName(controlNetType)} preprocessing failed multiple times. Consider using a different ControlNet type or image.`,
      action: () => {
        this.showAlternativeControlNetTypes(controlNetType);
      }
    };
  }

  private createManualAction(message: string, action?: () => void): RecoveryAction {
    return {
      type: 'manual',
      message,
      action
    };
  }

  private createIgnoreAction(message: string): RecoveryAction {
    return {
      type: 'ignore',
      message
    };
  }

  private getRetryMessage(errorType: string): string {
    switch (errorType) {
      case 'network':
        return 'Network error detected. Retrying automatically...';
      case 'rate_limit':
        return 'Rate limit reached. Waiting before retry...';
      case 'api':
        return 'API error occurred. Retrying...';
      default:
        return 'Error occurred. Retrying...';
    }
  }

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

  private showApiDataIssueGuidance(): void {
    toast.info(
      'API responded successfully but with incomplete data:\n1. This usually indicates a temporary API issue\n2. Try using a different image\n3. If the problem persists, contact support\n4. The API service may be experiencing issues',
      { duration: 10000 }
    );
  }

  private showApiKeyGuidance(): void {
    toast.info(
      'To fix authentication issues:\n1. Check your API key in settings\n2. Ensure the key has preprocessing permissions\n3. Try refreshing the page',
      { duration: 10000 }
    );
  }

  private showValidationGuidance(controlNetType: string): void {
    toast.info(
      `For ${this.getControlNetDisplayName(controlNetType)}:\n1. Ensure image is properly uploaded\n2. Try a different image format (JPG, PNG, WEBP)\n3. Check image size (under 10MB)`,
      { duration: 8000 }
    );
  }

  private showImageOptimizationGuidance(): void {
    toast.info(
      'To avoid timeouts:\n1. Use images under 2MB\n2. Resize large images before upload\n3. Use WEBP format for better compression',
      { duration: 8000 }
    );
  }

  private showAlternativeControlNetTypes(currentType: string): void {
    const alternatives: Record<string, string[]> = {
      'control-net-pose': ['Depth ControlNet', 'Edge ControlNet'],
      'control-net-depth': ['Pose ControlNet', 'Normal Map ControlNet'],
      'control-net-edge': ['Canny ControlNet', 'Pose ControlNet'],
      'control-net-canny': ['Edge ControlNet', 'Depth ControlNet'],
      'control-net-segments': ['Depth ControlNet', 'Edge ControlNet'],
      'control-net-normal-map': ['Depth ControlNet', 'Edge ControlNet']
    };

    const alternativeTypes = alternatives[currentType] || [];
    if (alternativeTypes.length > 0) {
      toast.info(
        `Consider trying these alternatives:\n${alternativeTypes.join('\n')}`,
        { duration: 6000 }
      );
    }
  }

  private showGeneralTroubleshooting(): void {
    toast.info(
      'General troubleshooting:\n1. Check your internet connection\n2. Try refreshing the page\n3. Use a different image\n4. Contact support if issues persist',
      { duration: 10000 }
    );
  }
}