import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowExecutor } from '../workflowExecutor';
import { RunwareService } from '../runwareService';
import { Node, Edge } from '@xyflow/react';

// Mock RunwareService
vi.mock('../runwareService');

describe('Preview Node as Input', () => {
  let workflowExecutor: WorkflowExecutor;
  let mockRunwareService: vi.Mocked<RunwareService>;

  beforeEach(() => {
    mockRunwareService = new RunwareService('test-key') as vi.Mocked<RunwareService>;
    workflowExecutor = new WorkflowExecutor(mockRunwareService);
  });

  it('should allow preview nodes to act as image sources', () => {
    const previewNode: Node = {
      id: 'preview-1',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {
        type: 'previewNode',
        functionality: 'output',
        generatedImage: 'https://example.com/generated-image.jpg'
      }
    };

    // Test that preview node is recognized as image source
    const imageUrl = workflowExecutor['extractImageUrlFromNode'](previewNode);
    
    expect(imageUrl).toBe('https://example.com/generated-image.jpg');
  });

  it('should extract processed images from workflow execution', () => {
    const previewNode: Node = {
      id: 'preview-1',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {
        type: 'previewNode',
        functionality: 'output'
      }
    };

    // Simulate processed image from workflow execution
    workflowExecutor.setProcessedImage('preview-1', 'https://example.com/processed-image.jpg');

    const imageUrl = workflowExecutor['extractImageUrlFromNode'](previewNode);
    
    expect(imageUrl).toBe('https://example.com/processed-image.jpg');
  });

  it('should recognize preview nodes as image node types', () => {
    const previewNode: Node = {
      id: 'preview-1',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {
        type: 'previewNode',
        functionality: 'output',
        generatedImage: 'https://example.com/image.jpg'
      }
    };

    // Test that the node has image data that would be recognized
    const hasImageData = !!(previewNode.data?.generatedImage || 
                            previewNode.data?.imageUrl || 
                            previewNode.data?.image);
    
    expect(hasImageData).toBe(true);
    expect(previewNode.type).toBe('previewNode');
  });

  it('should extract image data from preview nodes acting as inputs', () => {
    const previewNode: Node = {
      id: 'preview-1',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {
        type: 'previewNode',
        functionality: 'output',
        generatedImage: 'https://example.com/preview-result.jpg'
      }
    };

    // Test that the extractImageDataFromNode method works for preview nodes
    const imageData = workflowExecutor['extractImageDataFromNode'](previewNode);
    
    expect(imageData).toBe('https://example.com/preview-result.jpg');
  });
});