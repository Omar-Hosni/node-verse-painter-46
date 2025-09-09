/**
 * Tests for ControlNet preprocessing methods in RunwareService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RunwareService, RunwareError, ErrorType } from '../runwareService';

// Mock the toast function
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('RunwareService ControlNet Methods', () => {
  let service: RunwareService;

  beforeEach(() => {
    service = new RunwareService('test-api-key');
  });

  describe('getPreprocessorForControlNet', () => {
    it('should return correct preprocessor for pose ControlNet', () => {
      expect(service.getPreprocessorForControlNet('control-net-pose')).toBe('openpose');
    });

    it('should return correct preprocessor for depth ControlNet', () => {
      expect(service.getPreprocessorForControlNet('control-net-depth')).toBe('depth');
    });

    it('should return correct preprocessor for edge ControlNet', () => {
      expect(service.getPreprocessorForControlNet('control-net-edge')).toBe('lineart');
    });

    it('should return correct preprocessor for segments ControlNet', () => {
      expect(service.getPreprocessorForControlNet('control-net-segments')).toBe('seg');
    });

    it('should return correct preprocessor for normal map ControlNet', () => {
      expect(service.getPreprocessorForControlNet('control-net-normal-map')).toBe('normalbae');
    });

    it('should return canny for canny ControlNet', () => {
      expect(service.getPreprocessorForControlNet('control-net-canny')).toBe('canny');
    });

    it('should return null for light ControlNet (no preprocessing)', () => {
      expect(service.getPreprocessorForControlNet('seed-image-lights')).toBe(null);
    });

    it('should return null for unknown node types', () => {
      expect(service.getPreprocessorForControlNet('unknown-node')).toBe(null);
      expect(service.getPreprocessorForControlNet('imageInput')).toBe(null);
      expect(service.getPreprocessorForControlNet('')).toBe(null);
    });
  });

  describe('preprocessForControlNet', () => {
    beforeEach(() => {
      // Mock the authenticate method
      vi.spyOn(service, 'authenticate').mockResolvedValue();
      // Mock the sendMessage method
      vi.spyOn(service as any, 'sendMessage').mockResolvedValue({
        guideImageURL: 'https://example.com/processed-image.webp',
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should successfully preprocess image for pose ControlNet', async () => {
      const result = await service.preprocessForControlNet(
        'https://example.com/input-image.jpg',
        'control-net-pose'
      );

      expect(result).toEqual({
        guideImageURL: 'https://example.com/processed-image.webp',
        preprocessor: 'openpose',
      });
    });

    it('should throw validation error for unsupported ControlNet type', async () => {
      await expect(
        service.preprocessForControlNet(
          'https://example.com/input-image.jpg',
          'unsupported-type'
        )
      ).rejects.toThrow(RunwareError);

      await expect(
        service.preprocessForControlNet(
          'https://example.com/input-image.jpg',
          'unsupported-type'
        )
      ).rejects.toThrow('No preprocessor available for ControlNet type: unsupported-type');
    });

    it('should throw validation error for light ControlNet (no preprocessing)', async () => {
      await expect(
        service.preprocessForControlNet(
          'https://example.com/input-image.jpg',
          'seed-image-lights'
        )
      ).rejects.toThrow(RunwareError);

      await expect(
        service.preprocessForControlNet(
          'https://example.com/input-image.jpg',
          'seed-image-lights'
        )
      ).rejects.toThrow('No preprocessor available for ControlNet type: seed-image-lights');
    });

    it('should throw validation error for empty image URL', async () => {
      await expect(
        service.preprocessForControlNet('', 'control-net-pose')
      ).rejects.toThrow(RunwareError);

      await expect(
        service.preprocessForControlNet('', 'control-net-pose')
      ).rejects.toThrow('Valid image URL is required for ControlNet preprocessing');
    });

    it('should throw validation error for invalid image URL', async () => {
      await expect(
        service.preprocessForControlNet('   ', 'control-net-pose')
      ).rejects.toThrow(RunwareError);

      await expect(
        service.preprocessForControlNet('   ', 'control-net-pose')
      ).rejects.toThrow('Valid image URL is required for ControlNet preprocessing');
    });

    it('should handle API error when no guide image URL is returned', async () => {
      // Mock sendMessage to return empty result
      vi.spyOn(service as any, 'sendMessage').mockResolvedValue({});

      await expect(
        service.preprocessForControlNet(
          'https://example.com/input-image.jpg',
          'control-net-pose'
        )
      ).rejects.toThrow(RunwareError);

      await expect(
        service.preprocessForControlNet(
          'https://example.com/input-image.jpg',
          'control-net-pose'
        )
      ).rejects.toThrow('Preprocessing completed but no guide image URL was returned');
    });

    it('should use guideImageUUID as fallback when guideImageURL is not available', async () => {
      // Mock sendMessage to return guideImageUUID instead of guideImageURL
      vi.spyOn(service as any, 'sendMessage').mockResolvedValue({
        guideImageUUID: 'uuid-123-processed',
      });

      const result = await service.preprocessForControlNet(
        'https://example.com/input-image.jpg',
        'control-net-depth'
      );

      expect(result).toEqual({
        guideImageURL: 'uuid-123-processed',
        preprocessor: 'depth_midas',
      });
    });

    it('should call sendMessage with correct parameters', async () => {
      const sendMessageSpy = vi.spyOn(service as any, 'sendMessage');
      
      await service.preprocessForControlNet(
        'https://example.com/input-image.jpg',
        'control-net-edge'
      );

      expect(sendMessageSpy).toHaveBeenCalledWith({
        taskType: 'imageControlNetPreProcess',
        taskUUID: expect.any(String),
        outputType: 'URL',
        outputFormat: 'WEBP',
        inputImage: 'https://example.com/input-image.jpg',
        preprocessor: 'lineart',
      });
    });
  });

  describe('error handling', () => {
    it('should provide specific error messages for different error types', () => {
      const authError = new RunwareError('Auth failed', ErrorType.AUTHENTICATION_ERROR);
      const networkError = new RunwareError('Network failed', ErrorType.NETWORK_ERROR);
      const validationError = new RunwareError('Validation failed', ErrorType.VALIDATION_ERROR);
      const timeoutError = new RunwareError('Timeout', ErrorType.TIMEOUT_ERROR);
      const connectionError = new RunwareError('Connection failed', ErrorType.CONNECTION_ERROR);

      // Test the private method through reflection
      const getErrorMessage = (service as any).getControlNetPreprocessingErrorMessage;

      expect(getErrorMessage.call(service, authError, 'control-net-pose')).toContain('Authentication failed');
      expect(getErrorMessage.call(service, networkError, 'control-net-pose')).toContain('Network error');
      expect(getErrorMessage.call(service, validationError, 'control-net-pose')).toContain('Invalid input');
      expect(getErrorMessage.call(service, timeoutError, 'control-net-pose')).toContain('timed out');
      expect(getErrorMessage.call(service, connectionError, 'control-net-pose')).toContain('Connection error');
    });

    it('should provide specific error message for unsupported ControlNet type', () => {
      const validationError = new RunwareError('No preprocessor available for ControlNet type: unknown', ErrorType.VALIDATION_ERROR);
      const getErrorMessage = (service as any).getControlNetPreprocessingErrorMessage;

      const message = getErrorMessage.call(service, validationError, 'unknown');
      expect(message).toContain('ControlNet type "unknown" is not supported for preprocessing');
    });
  });
});