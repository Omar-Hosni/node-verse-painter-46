import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionHandler } from '../connectionHandler';
import { PreprocessingTrigger } from '../preprocessingTrigger';
import { RunwareService } from '../runwareService';
import { Node, Edge } from '@xyflow/react';

// Mock dependencies
vi.mock('../runwareService');
vi.mock('../preprocessingTrigger');

describe('Preview Node Preprocessing', () => {
  let connectionHandler: ConnectionHandler;
  let mockPreprocessingTrigger: vi.Mocked<PreprocessingTrigger>;
  let mockRunwareService: vi.Mocked<RunwareService>;
  let mockCallbacks: any;

  beforeEach(() => {
    mockRunwareService = new RunwareService('test-key') as vi.Mocked<RunwareService>;
    mockPreprocessingTrigger = new PreprocessingTrigger(mockRunwareService, {}) as vi.Mocked<PreprocessingTrigger>;
    
    mockCallbacks = {
      onPreprocessingTriggered: vi.fn(),
      onPreprocessedDataCleared: vi.fn()
    };

    connectionHandler = new ConnectionHandler(mockCallbacks, mockPreprocessingTrigger);
  });

  it('should recognize preview nodes as image nodes', () => {
    const previewNode: Node = {
      id: 'preview-1',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {
        type: 'preview-image',
        generatedImage: 'https://example.com/image.jpg'
      }
    };

    const controlNetNode: Node = {
      id: 'controlnet-1',
      type: 'normal-node',
      position: { x: 200, y: 0 },
      data: {
        type: 'control-net-pose',
        functionality: 'control-net'
      }
    };

    // Test the private method through connection detection
    const isImageNode = connectionHandler['isImageNode'](previewNode);
    const isControlNetNode = connectionHandler['isControlNetNode'](controlNetNode);
    const isImageToControlNet = connectionHandler['isImageToControlNetConnection'](previewNode, controlNetNode);

    expect(isImageNode).toBe(true);
    expect(isControlNetNode).toBe(true);
    expect(isImageToControlNet).toBe(true);
  });

  it('should recognize output nodes as image nodes', () => {
    const outputNode: Node = {
      id: 'output-1',
      type: 'output',
      position: { x: 0, y: 0 },
      data: {
        type: 'preview-image',
        generatedImage: 'https://example.com/image.jpg'
      }
    };

    const isImageNode = connectionHandler['isImageNode'](outputNode);
    expect(isImageNode).toBe(true);
  });

  it('should validate image data from preview nodes', () => {
    const previewNodeWithImage: Node = {
      id: 'preview-1',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {
        generatedImage: 'https://example.com/image.jpg'
      }
    };

    const previewNodeWithoutImage: Node = {
      id: 'preview-2',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {}
    };

    const hasValidData1 = connectionHandler['hasValidImageData'](previewNodeWithImage);
    const hasValidData2 = connectionHandler['hasValidImageData'](previewNodeWithoutImage);

    expect(hasValidData1).toBe(true);
    expect(hasValidData2).toBe(false);
  });

  it('should detect image input connections from preview nodes', () => {
    const nodes: Node[] = [
      {
        id: 'preview-1',
        type: 'previewNode',
        position: { x: 0, y: 0 },
        data: { generatedImage: 'https://example.com/image.jpg' }
      },
      {
        id: 'controlnet-1',
        type: 'normal-node',
        position: { x: 200, y: 0 },
        data: { type: 'control-net-pose' }
      }
    ];

    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'preview-1',
        target: 'controlnet-1'
      }
    ];

    const hasImageInputs = connectionHandler['hasImageInputConnections']('controlnet-1', nodes, edges);
    expect(hasImageInputs).toBe(true);
  });

  it('should trigger preprocessing when preview node connects to controlnet', async () => {
    const nodes: Node[] = [
      {
        id: 'preview-1',
        type: 'previewNode',
        position: { x: 0, y: 0 },
        data: { generatedImage: 'https://example.com/image.jpg' }
      },
      {
        id: 'controlnet-1',
        type: 'normal-node',
        position: { x: 200, y: 0 },
        data: { type: 'control-net-pose' }
      }
    ];

    // Mock the preprocessing trigger to return true for shouldTriggerPreprocessing
    mockPreprocessingTrigger.shouldTriggerPreprocessing.mockReturnValue(true);
    mockPreprocessingTrigger.triggerPreprocessing.mockResolvedValue();

    const connectionEvent = {
      source: {
        nodeId: 'preview-1',
        handleId: 'output',
        nodeType: 'previewNode'
      },
      target: {
        nodeId: 'controlnet-1',
        handleId: 'input',
        nodeType: 'normal-node'
      },
      connectionType: 'new' as const
    };

    await connectionHandler.handleNewConnection(connectionEvent, nodes);

    // Should trigger preprocessing via the preprocessing trigger
    expect(mockPreprocessingTrigger.shouldTriggerPreprocessing).toHaveBeenCalled();
    expect(mockPreprocessingTrigger.triggerPreprocessing).toHaveBeenCalledWith(
      nodes[0], // source node
      nodes[1], // target node
      nodes,
      []
    );
  });
});