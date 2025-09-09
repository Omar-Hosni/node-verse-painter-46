import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageCaptionTrigger } from '../imageCaptionTrigger';
import { RunwareService } from '../runwareService';
import { Node, Edge } from '@xyflow/react';

// Mock RunwareService
vi.mock('../runwareService');

describe('ImageCaptionTrigger', () => {
  let imageCaptionTrigger: ImageCaptionTrigger;
  let mockRunwareService: vi.Mocked<RunwareService>;
  let mockCallbacks: any;

  beforeEach(() => {
    mockRunwareService = new RunwareService('test-key') as vi.Mocked<RunwareService>;
    mockCallbacks = {
      onCaptioningStarted: vi.fn(),
      onCaptioningCompleted: vi.fn(),
      onCaptioningFailed: vi.fn(),
      updateNodeData: vi.fn()
    };
    
    imageCaptionTrigger = new ImageCaptionTrigger(mockRunwareService, mockCallbacks);
  });

  describe('shouldTriggerImageCaptioning', () => {
    it('should return true for image-to-text connection', () => {
      const sourceNode: Node = {
        id: 'image-1',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {
          imageUrl: 'https://example.com/image.jpg'
        }
      };

      const targetNode: Node = {
        id: 'text-1',
        type: 'textInput',
        position: { x: 200, y: 0 },
        data: {}
      };

      expect(imageCaptionTrigger.shouldTriggerImageCaptioning(sourceNode, targetNode)).toBe(true);
    });

    it('should return false for non-image source', () => {
      const sourceNode: Node = {
        id: 'text-1',
        type: 'textInput',
        position: { x: 0, y: 0 },
        data: {}
      };

      const targetNode: Node = {
        id: 'text-2',
        type: 'textInput',
        position: { x: 200, y: 0 },
        data: {}
      };

      expect(imageCaptionTrigger.shouldTriggerImageCaptioning(sourceNode, targetNode)).toBe(false);
    });

    it('should return false for non-text target', () => {
      const sourceNode: Node = {
        id: 'image-1',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {
          imageUrl: 'https://example.com/image.jpg'
        }
      };

      const targetNode: Node = {
        id: 'engine-1',
        type: 'engine',
        position: { x: 200, y: 0 },
        data: {}
      };

      expect(imageCaptionTrigger.shouldTriggerImageCaptioning(sourceNode, targetNode)).toBe(false);
    });

    it('should return false if source has no valid image data', () => {
      const sourceNode: Node = {
        id: 'image-1',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {} // No image data
      };

      const targetNode: Node = {
        id: 'text-1',
        type: 'textInput',
        position: { x: 200, y: 0 },
        data: {}
      };

      expect(imageCaptionTrigger.shouldTriggerImageCaptioning(sourceNode, targetNode)).toBe(false);
    });
  });

  describe('triggerImageCaptioning', () => {
    it('should successfully trigger image captioning', async () => {
      const sourceNode: Node = {
        id: 'image-1',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {
          imageUrl: 'https://example.com/image.jpg'
        }
      };

      const targetNode: Node = {
        id: 'text-1',
        type: 'textInput',
        position: { x: 200, y: 0 },
        data: {}
      };

      // Mock the API response
      mockRunwareService.generateImageCaption = vi.fn().mockResolvedValue({
        taskType: 'imageCaption',
        taskUUID: 'test-uuid',
        text: 'A beautiful landscape with mountains and trees'
      });

      await imageCaptionTrigger.triggerImageCaptioning(sourceNode, targetNode, [sourceNode, targetNode], []);

      // Verify API was called
      expect(mockRunwareService.generateImageCaption).toHaveBeenCalledWith({
        inputImage: 'https://example.com/image.jpg',
        includeCost: false
      });

      // Verify callbacks were called
      expect(mockCallbacks.onCaptioningStarted).toHaveBeenCalledWith('text-1');
      expect(mockCallbacks.onCaptioningCompleted).toHaveBeenCalledWith('text-1', expect.objectContaining({
        captionText: 'A beautiful landscape with mountains and trees',
        sourceImageUrl: 'https://example.com/image.jpg',
        taskUUID: 'test-uuid'
      }));

      // Verify node data was updated
      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith('text-1', expect.objectContaining({
        right_sidebar: {
          prompt: 'A beautiful landscape with mountains and trees'
        }
      }));
    });

    it('should handle API errors gracefully', async () => {
      const sourceNode: Node = {
        id: 'image-1',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {
          imageUrl: 'https://example.com/image.jpg'
        }
      };

      const targetNode: Node = {
        id: 'text-1',
        type: 'textInput',
        position: { x: 200, y: 0 },
        data: {}
      };

      // Mock API error
      mockRunwareService.generateImageCaption = vi.fn().mockRejectedValue(new Error('API Error'));

      await imageCaptionTrigger.triggerImageCaptioning(sourceNode, targetNode, [sourceNode, targetNode], []);

      // Verify error handling
      expect(mockCallbacks.onCaptioningFailed).toHaveBeenCalledWith('text-1', 'API Error');
      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith('text-1', expect.objectContaining({
        isCaptioning: false,
        captionError: 'API Error'
      }));
    });

    it('should skip if node is already processing', async () => {
      const sourceNode: Node = {
        id: 'image-1',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {
          imageUrl: 'https://example.com/image.jpg'
        }
      };

      const targetNode: Node = {
        id: 'text-1',
        type: 'textInput',
        position: { x: 200, y: 0 },
        data: {}
      };

      // Start first captioning
      const promise1 = imageCaptionTrigger.triggerImageCaptioning(sourceNode, targetNode, [sourceNode, targetNode], []);
      
      // Try to start second captioning immediately
      const promise2 = imageCaptionTrigger.triggerImageCaptioning(sourceNode, targetNode, [sourceNode, targetNode], []);

      await Promise.all([promise1, promise2]);

      // Should only be called once
      expect(mockCallbacks.onCaptioningStarted).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearCaptioningState', () => {
    it('should clear captioning state for a node', () => {
      imageCaptionTrigger.clearCaptioningState('text-1');

      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith('text-1', {
        isCaptioning: false,
        captionError: null,
        imageCaptionData: null
      });
    });
  });
});