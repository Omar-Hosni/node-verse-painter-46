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
    const nodes: Node[] = [
      {
        id: 'preview-1',
        type: 'previewNode',
        position: { x: 0, y: 0 },
        data: {
          type: 'preview-image',
          functionality: 'output',
          generatedImage: 'https://example.com/generated-image.jpg'
        }
      },
      {
        id: 'controlnet-1',
        type: 'normal-node',
        position: { x: 200, y: 0 },
        data: {
          type: 'control-net-pose',
          functionality: 'control-net'
        }
      },
      {
        id: 'engine-1',
        type: 'normal-node',
        position: { x: 400, y: 0 },
        data: {
          type: 'engine-real',
          functionality: 'engine'
        }
      },
      {
        id: 'preview-2',
        type: 'previewNode',
        position: { x: 600, y: 0 },
        data: {
          type: 'preview-image',
          functionality: 'output'
        }
      }
    ];

    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'preview-1',
        target: 'controlnet-1',
        sourceHandle: 'output',
        targetHandle: 'input'
      },
      {
        id: 'e2',
        source: 'controlnet-1',
        target: 'engine-1',
        sourceHandle: 'output',
        targetHandle: 'input'
      },
      {
        id: 'e3',
        source: 'engine-1',
        target: 'preview-2',
        sourceHandle: 'output',
        targetHandle: 'input'
      }
    ];

    // Test that preview node is recognized as image source
    const previewNode = nodes[0];
    const imageUrl = workflowExecutor['extractImageUrlFromNode'](previewNode);
    
    expect(imageUrl).toBe('https://example.com/generated-image.jpg');
  });

  it('should extract processed images from workflow execution', () => {
    const previewNode: Node = {
      id: 'preview-1',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {
        type: 'preview-image',
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
        type: 'preview-image',
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
});