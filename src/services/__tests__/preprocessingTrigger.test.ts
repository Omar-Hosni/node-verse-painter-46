/**
 * Unit tests for PreprocessingTrigger service
 * Tests automatic preprocessing logic, validation, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Node, Edge } from '@xyflow/react';
import { PreprocessingTrigger } from '../preprocessingTrigger';
import { RunwareService } from '../runwareService';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../runwareService');

describe('PreprocessingTrigger', () => {
  let preprocessingTrigger: PreprocessingTrigger;
  let mockRunwareService: vi.Mocked<RunwareService>;
  let mockCallbacks: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRunwareService = {
      preprocessForControlNet: vi.fn(),
    } as any;

    mockCallbacks = {
      onPreprocessingStarted: vi.fn(),
      onPreprocessingCompleted: vi.fn(),
      onPreprocessingFailed: vi.fn(),
      updateNodeData: vi.fn(),
    };

    preprocessingTrigger = new PreprocessingTrigger(mockRunwareService, mockCallbacks);
  });

  describe('shouldTriggerPreprocessing', () => {
    it('should return true for valid image-to-ControlNet connection', () => {
      const imageNode: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: { imageUrl: 'https://example.com/image.jpg' },
      };

      const controlNetNode: Node = {
        id: 'controlnet-1',
        type: 'control-net-pose',
        position: { x: 100, y: 0 },
        data: {},
      };

      const result = preprocessingTrigger.shouldTriggerPreprocessing(imageNode, controlNetNode);
      expect(result).toBe(true);
    });

    it('should return false for light ControlNet node (no preprocessing required)', () => {
      const imageNode: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: { imageUrl: 'https://example.com/image.jpg' },
      };

      const lightControlNetNode: Node = {
        id: 'controlnet-1',
        type: 'seed-image-lights',
        position: { x: 100, y: 0 },
        data: {},
      };

      const result = preprocessingTrigger.shouldTriggerPreprocessing(imageNode, lightControlNetNode);
      expect(result).toBe(false);
    });

    it('should return false for node without valid image data', () => {
      const imageNodeWithoutData: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: {},
      };

      const controlNetNode: Node = {
        id: 'controlnet-1',
        type: 'control-net-pose',
        position: { x: 100, y: 0 },
        data: {},
      };

      const result = preprocessingTrigger.shouldTriggerPreprocessing(imageNodeWithoutData, controlNetNode);
      expect(result).toBe(false);
    });

    it('should return false for non-image to ControlNet connection', () => {
      const textNode: Node = {
        id: 'text-1',
        type: 'text-node',
        position: { x: 0, y: 0 },
        data: { text: 'hello' },
      };

      const controlNetNode: Node = {
        id: 'controlnet-1',
        type: 'control-net-pose',
        position: { x: 100, y: 0 },
        data: {},
      };

      const result = preprocessingTrigger.shouldTriggerPreprocessing(textNode, controlNetNode);
      expect(result).toBe(false);
    });
  });

  describe('hasValidImageData', () => {
    it('should return true for node with HTTP URL', () => {
      const node: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: { imageUrl: 'https://example.com/image.jpg' },
      };

      const result = (preprocessingTrigger as any).hasValidImageData(node);
      expect(result).toBe(true);
    });

    it('should return true for node with data URL', () => {
      const node: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: { imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
      };

      const result = (preprocessingTrigger as any).hasValidImageData(node);
      expect(result).toBe(true);
    });

    it('should return true for node with Runware URL', () => {
      const node: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: { imageUrl: 'https://im.runware.ai/image123.webp' },
      };

      const result = (preprocessingTrigger as any).hasValidImageData(node);
      expect(result).toBe(true);
    });

    it('should return false for node without image data', () => {
      const node: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: {},
      };

      const result = (preprocessingTrigger as any).hasValidImageData(node);
      expect(result).toBe(false);
    });

    it('should return false for node with empty image URL', () => {
      const node: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: { imageUrl: '' },
      };

      const result = (preprocessingTrigger as any).hasValidImageData(node);
      expect(result).toBe(false);
    });

    it('should return false for node with invalid image URL', () => {
      const node: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: { imageUrl: 'invalid-url' },
      };

      const result = (preprocessingTrigger as any).hasValidImageData(node);
      expect(result).toBe(false);
    });
  });

  describe('triggerPreprocessing', () => {
    const imageNode: Node = {
      id: 'image-1',
      type: 'image-node',
      position: { x: 0, y: 0 },
      data: { imageUrl: 'https://example.com/image.jpg' },
    };

    const controlNetNode: Node = {
      id: 'controlnet-1',
      type: 'control-net-pose',
      position: { x: 100, y: 0 },
      data: {},
    };

    const nodes: Node[] = [imageNode, controlNetNode];
    const edges: Edge[] = [];

    it('should successfully preprocess image for ControlNet', async () => {
      const mockPreprocessedResult = {
        guideImageURL: 'https://example.com/preprocessed.jpg',
        preprocessor: 'openpose',
      };

      mockRunwareService.preprocessForControlNet.mockResolvedValue(mockPreprocessedResult);

      await preprocessingTrigger.triggerPreprocessing(imageNode, controlNetNode, nodes, edges);

      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledWith(
        'https://example.com/image.jpg',
        'control-net-pose'
      );
      expect(mockCallbacks.onPreprocessingStarted).toHaveBeenCalledWith('controlnet-1');
      expect(mockCallbacks.onPreprocessingCompleted).toHaveBeenCalledWith(
        'controlnet-1',
        expect.objectContaining({
          guideImageURL: 'https://example.com/preprocessed.jpg',
          preprocessor: 'openpose',
        })
      );
      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith('controlnet-1', expect.objectContaining({
        hasPreprocessedImage: true,
        isPreprocessing: false,
      }));
      expect(toast.success).toHaveBeenCalledWith('Image preprocessed successfully for control-net-pose');
    });

    it('should skip preprocessing for light ControlNet node', async () => {
      const lightControlNetNode: Node = {
        id: 'controlnet-1',
        type: 'seed-image-lights',
        position: { x: 100, y: 0 },
        data: {},
      };

      await preprocessingTrigger.triggerPreprocessing(imageNode, lightControlNetNode, nodes, edges);

      expect(mockRunwareService.preprocessForControlNet).not.toHaveBeenCalled();
      expect(mockCallbacks.onPreprocessingStarted).not.toHaveBeenCalled();
    });

    it('should handle preprocessing errors gracefully', async () => {
      const error = new Error('Preprocessing failed');
      mockRunwareService.preprocessForControlNet.mockRejectedValue(error);

      await preprocessingTrigger.triggerPreprocessing(imageNode, controlNetNode, nodes, edges);

      expect(mockCallbacks.onPreprocessingFailed).toHaveBeenCalledWith('controlnet-1', 'Preprocessing failed');
      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith('controlnet-1', expect.objectContaining({
        isPreprocessing: false,
        hasPreprocessedImage: false,
        preprocessedImage: undefined,
      }));
      expect(toast.error).toHaveBeenCalledWith('Failed to preprocess image: Preprocessing failed');
    });

    it('should show error for node without valid image data', async () => {
      const imageNodeWithoutData: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: {},
      };

      await preprocessingTrigger.triggerPreprocessing(imageNodeWithoutData, controlNetNode, nodes, edges);

      expect(mockRunwareService.preprocessForControlNet).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Source node must have valid image data for ControlNet preprocessing');
    });
  });

  describe('node type detection', () => {
    it('should correctly identify image nodes', () => {
      const imageNode1: Node = {
        id: '1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: {},
      };

      const imageNode2: Node = {
        id: '2',
        type: 'custom-image',
        position: { x: 0, y: 0 },
        data: {},
      };

      const imageNode3: Node = {
        id: '3',
        type: 'other',
        position: { x: 0, y: 0 },
        data: { image: 'test.jpg' },
      };

      expect(preprocessingTrigger.isImageNode(imageNode1)).toBe(true);
      expect(preprocessingTrigger.isImageNode(imageNode2)).toBe(true);
      expect(preprocessingTrigger.isImageNode(imageNode3)).toBe(true);
    });

    it('should correctly identify ControlNet nodes', () => {
      const controlNetNode1: Node = {
        id: '1',
        type: 'control-net-pose',
        position: { x: 0, y: 0 },
        data: {},
      };

      const controlNetNode2: Node = {
        id: '2',
        type: 'seed-image-lights',
        position: { x: 0, y: 0 },
        data: {},
      };

      const regularNode: Node = {
        id: '3',
        type: 'text-node',
        position: { x: 0, y: 0 },
        data: {},
      };

      expect(preprocessingTrigger.isControlNetNode(controlNetNode1)).toBe(true);
      expect(preprocessingTrigger.isControlNetNode(controlNetNode2)).toBe(true);
      expect(preprocessingTrigger.isControlNetNode(regularNode)).toBe(false);
    });
  });
});