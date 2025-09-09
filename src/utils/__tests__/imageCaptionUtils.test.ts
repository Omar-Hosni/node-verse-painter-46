import { describe, it, expect } from 'vitest';
import {
  isTextInputNode,
  requiresImageCaptioning,
  hasValidImageDataForCaptioning,
  extractImageUrlForCaptioning,
  createImageCaptionData
} from '../imageCaptionUtils';
import { Node } from '@xyflow/react';

describe('imageCaptionUtils', () => {
  describe('isTextInputNode', () => {
    it('should identify textInput nodes', () => {
      expect(isTextInputNode('textInput')).toBe(true);
      expect(isTextInputNode('input-text')).toBe(true);
      expect(isTextInputNode('some-input-text-node')).toBe(true);
    });

    it('should reject non-text input nodes', () => {
      expect(isTextInputNode('imageInput')).toBe(false);
      expect(isTextInputNode('engine')).toBe(false);
      expect(isTextInputNode('controlNet')).toBe(false);
    });
  });

  describe('requiresImageCaptioning', () => {
    it('should return true for text input nodes', () => {
      expect(requiresImageCaptioning('textInput')).toBe(true);
      expect(requiresImageCaptioning('input-text')).toBe(true);
    });

    it('should return false for other node types', () => {
      expect(requiresImageCaptioning('imageInput')).toBe(false);
      expect(requiresImageCaptioning('engine')).toBe(false);
    });
  });

  describe('hasValidImageDataForCaptioning', () => {
    it('should return true for nodes with imageUrl', () => {
      const node: Node = {
        id: 'test',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {
          imageUrl: 'https://example.com/image.jpg'
        }
      };

      expect(hasValidImageDataForCaptioning(node)).toBe(true);
    });

    it('should return true for nodes with generatedImage', () => {
      const node: Node = {
        id: 'test',
        type: 'previewNode',
        position: { x: 0, y: 0 },
        data: {
          generatedImage: 'https://example.com/generated.jpg'
        }
      };

      expect(hasValidImageDataForCaptioning(node)).toBe(true);
    });

    it('should return true for nodes with right_sidebar imageUrl', () => {
      const node: Node = {
        id: 'test',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {
          right_sidebar: {
            imageUrl: 'https://example.com/sidebar.jpg'
          }
        }
      };

      expect(hasValidImageDataForCaptioning(node)).toBe(true);
    });

    it('should return false for nodes without image data', () => {
      const node: Node = {
        id: 'test',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {}
      };

      expect(hasValidImageDataForCaptioning(node)).toBe(false);
    });

    it('should return false for nodes with empty image URLs', () => {
      const node: Node = {
        id: 'test',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {
          imageUrl: ''
        }
      };

      expect(hasValidImageDataForCaptioning(node)).toBe(false);
    });
  });

  describe('extractImageUrlForCaptioning', () => {
    it('should extract imageUrl', () => {
      const node: Node = {
        id: 'test',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {
          imageUrl: 'https://example.com/image.jpg'
        }
      };

      expect(extractImageUrlForCaptioning(node)).toBe('https://example.com/image.jpg');
    });

    it('should extract generatedImage', () => {
      const node: Node = {
        id: 'test',
        type: 'previewNode',
        position: { x: 0, y: 0 },
        data: {
          generatedImage: 'https://example.com/generated.jpg'
        }
      };

      expect(extractImageUrlForCaptioning(node)).toBe('https://example.com/generated.jpg');
    });

    it('should prioritize imageUrl over generatedImage', () => {
      const node: Node = {
        id: 'test',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {
          imageUrl: 'https://example.com/image.jpg',
          generatedImage: 'https://example.com/generated.jpg'
        }
      };

      expect(extractImageUrlForCaptioning(node)).toBe('https://example.com/image.jpg');
    });

    it('should return null for nodes without image data', () => {
      const node: Node = {
        id: 'test',
        type: 'imageInput',
        position: { x: 0, y: 0 },
        data: {}
      };

      expect(extractImageUrlForCaptioning(node)).toBe(null);
    });
  });

  describe('createImageCaptionData', () => {
    it('should create proper image caption data structure', () => {
      const captionText = 'A beautiful landscape';
      const sourceImageUrl = 'https://example.com/image.jpg';
      const taskUUID = 'test-uuid';

      const result = createImageCaptionData(captionText, sourceImageUrl, taskUUID);

      expect(result).toEqual({
        captionText,
        sourceImageUrl,
        taskUUID,
        timestamp: expect.any(Number)
      });

      expect(result.timestamp).toBeGreaterThan(0);
    });
  });
});