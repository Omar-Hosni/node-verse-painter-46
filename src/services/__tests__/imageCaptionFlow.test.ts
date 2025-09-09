import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Node, Edge } from '@xyflow/react';
import { ConnectionHandler } from '../connectionHandler';
import { ImageCaptionTrigger } from '../imageCaptionTrigger';
import { RunwareService } from '../runwareService';

// Mock RunwareService
vi.mock('../runwareService');

// Mock Canvas Store
const mockUpdateNodeData = vi.fn();
vi.mock('../../store/useCanvasStore', () => ({
  useCanvasStore: {
    getState: () => ({
      updateNodeData: mockUpdateNodeData
    })
  }
}));

describe('Image Caption Flow', () => {
  let connectionHandler: ConnectionHandler;
  let imageCaptionTrigger: ImageCaptionTrigger;
  let mockRunwareService: vi.Mocked<RunwareService>;

  beforeEach(() => {
    mockRunwareService = new RunwareService('test-key') as vi.Mocked<RunwareService>;
    mockUpdateNodeData.mockClear();
    
    imageCaptionTrigger = new ImageCaptionTrigger(mockRunwareService, {});
    
    connectionHandler = new ConnectionHandler(
      {},
      undefined,
      imageCaptionTrigger
    );
  });

  it('should trigger image captioning when image-layer connects to input-text', async () => {
    // Create an image node (image-layer)
    const imageNode: Node = {
      id: 'image-layer-1',
      type: 'image-node',
      position: { x: 0, y: 0 },
      data: {
        imageUrl: 'https://example.com/test-image.jpg'
      }
    };

    // Create an input-text node
    const textNode: Node = {
      id: 'text-input-1',
      type: 'normal-node',
      position: { x: 200, y: 0 },
      data: {
        type: 'input-text',
        right_sidebar: {
          prompt: ''
        }
      }
    };

    const nodes = [imageNode, textNode];

    // Mock the API response
    mockRunwareService.generateImageCaption = vi.fn().mockResolvedValue({
      taskType: 'imageCaption',
      taskUUID: 'test-uuid-123',
      text: 'A beautiful landscape with mountains and trees in the background'
    });

    // Simulate connection detection
    const previousEdges: Edge[] = [];
    const currentEdges: Edge[] = [
      {
        id: 'edge-1',
        source: 'image-layer-1',
        target: 'text-input-1',
        sourceHandle: null,
        targetHandle: null
      }
    ];

    // Trigger connection detection
    await connectionHandler.detectConnectionChanges(previousEdges, currentEdges, nodes);

    // Verify API was called
    expect(mockRunwareService.generateImageCaption).toHaveBeenCalledWith({
      inputImage: 'https://example.com/test-image.jpg',
      includeCost: false
    });

    // Verify node data was updated with the caption
    expect(mockUpdateNodeData).toHaveBeenCalledWith('text-input-1', expect.objectContaining({
      right_sidebar: {
        prompt: 'A beautiful landscape with mountains and trees in the background'
      }
    }));
  });

  it('should work with preview nodes as image source', async () => {
    // Create a preview node
    const previewNode: Node = {
      id: 'preview-1',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {
        generatedImage: 'https://example.com/generated-image.jpg'
      }
    };

    // Create an input-text node
    const textNode: Node = {
      id: 'text-input-1',
      type: 'normal-node',
      position: { x: 200, y: 0 },
      data: {
        type: 'input-text',
        right_sidebar: {
          prompt: ''
        }
      }
    };

    const nodes = [previewNode, textNode];

    // Mock the API response
    mockRunwareService.generateImageCaption = vi.fn().mockResolvedValue({
      taskType: 'imageCaption',
      taskUUID: 'test-uuid-456',
      text: 'An artistic rendering of a cityscape at sunset'
    });

    // Simulate connection detection
    const previousEdges: Edge[] = [];
    const currentEdges: Edge[] = [
      {
        id: 'edge-2',
        source: 'preview-1',
        target: 'text-input-1',
        sourceHandle: null,
        targetHandle: null
      }
    ];

    // Trigger connection detection
    await connectionHandler.detectConnectionChanges(previousEdges, currentEdges, nodes);

    // Verify API was called with the generated image
    expect(mockRunwareService.generateImageCaption).toHaveBeenCalledWith({
      inputImage: 'https://example.com/generated-image.jpg',
      includeCost: false
    });

    // Verify node data was updated
    expect(mockUpdateNodeData).toHaveBeenCalledWith('text-input-1', expect.objectContaining({
      right_sidebar: {
        prompt: 'An artistic rendering of a cityscape at sunset'
      }
    }));
  });

  it('should not trigger for non-text target nodes', async () => {
    // Create an image node
    const imageNode: Node = {
      id: 'image-1',
      type: 'image-node',
      position: { x: 0, y: 0 },
      data: {
        imageUrl: 'https://example.com/test-image.jpg'
      }
    };

    // Create a non-text node (engine node)
    const engineNode: Node = {
      id: 'engine-1',
      type: 'normal-node',
      position: { x: 200, y: 0 },
      data: {
        type: 'engine-real'
      }
    };

    const nodes = [imageNode, engineNode];

    // Simulate connection detection
    const previousEdges: Edge[] = [];
    const currentEdges: Edge[] = [
      {
        id: 'edge-3',
        source: 'image-1',
        target: 'engine-1',
        sourceHandle: null,
        targetHandle: null
      }
    ];

    // Trigger connection detection
    await connectionHandler.detectConnectionChanges(previousEdges, currentEdges, nodes);

    // Verify API was NOT called
    expect(mockRunwareService.generateImageCaption).not.toHaveBeenCalled();
    expect(mockUpdateNodeData).not.toHaveBeenCalled();
  });
});