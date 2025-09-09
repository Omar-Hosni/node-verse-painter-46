import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowExecutor } from '../workflowExecutor';
import { RunwareService } from '../runwareService';
import { Node, Edge } from '@xyflow/react';

// Mock RunwareService
vi.mock('../runwareService');

describe('Workflow Boundaries Integration', () => {
  let workflowExecutor: WorkflowExecutor;
  let mockRunwareService: vi.Mocked<RunwareService>;

  beforeEach(() => {
    mockRunwareService = new RunwareService('test-key') as vi.Mocked<RunwareService>;
    workflowExecutor = new WorkflowExecutor(mockRunwareService);
    
    // Mock the service methods
    mockRunwareService.generateImage = vi.fn().mockResolvedValue({
      data: [{ imageURL: 'https://example.com/generated.jpg' }]
    });
    mockRunwareService.enhancePrompt = vi.fn().mockResolvedValue({
      data: [{ text: 'enhanced prompt' }]
    });
    mockRunwareService.controlNetPreprocess = vi.fn().mockResolvedValue({
      data: [{ imageURL: 'https://example.com/processed.jpg' }]
    });
  });

  it('should execute only the second segment when first preview has persisted image', async () => {
    // Create a workflow with two segments separated by a preview boundary
    const nodes: Node[] = [
      // First segment
      {
        id: 'text-1',
        type: 'textInput',
        position: { x: 0, y: 0 },
        data: { prompt: 'first prompt' }
      },
      {
        id: 'engine-1',
        type: 'engine',
        position: { x: 200, y: 0 },
        data: { functionality: 'engine' }
      },
      {
        id: 'preview-1',
        type: 'previewNode',
        position: { x: 400, y: 0 },
        data: {
          imageUrl: 'https://example.com/persisted-first.jpg' // Has persisted image
        }
      },
      // Second segment
      {
        id: 'controlnet-1',
        type: 'controlNet',
        position: { x: 600, y: 0 },
        data: { 
          functionality: 'control-net',
          preprocessor: 'pose'
        }
      },
      {
        id: 'text-2',
        type: 'textInput',
        position: { x: 600, y: 100 },
        data: { prompt: 'second prompt' }
      },
      {
        id: 'engine-2',
        type: 'engine',
        position: { x: 800, y: 0 },
        data: { functionality: 'engine' }
      },
      {
        id: 'preview-2',
        type: 'previewNode',
        position: { x: 1000, y: 0 },
        data: {} // No persisted image
      }
    ];

    const edges: Edge[] = [
      // First segment connections
      { id: 'e1', source: 'text-1', target: 'engine-1' },
      { id: 'e2', source: 'engine-1', target: 'preview-1' },
      // Second segment connections
      { id: 'e3', source: 'preview-1', target: 'controlnet-1' },
      { id: 'e4', source: 'text-2', target: 'engine-2' },
      { id: 'e5', source: 'controlnet-1', target: 'engine-2' },
      { id: 'e6', source: 'engine-2', target: 'preview-2' }
    ];

    // Execute targeting the second preview
    const result = await workflowExecutor.executeWorkflow(nodes, edges, 'preview-2');

    // Preview nodes don't return results, they just display
    expect(result).toBe(null);

    // First segment should not have been executed (no calls for text-1 or engine-1)
    expect(mockRunwareService.generateImage).toHaveBeenCalledTimes(1); // Only engine-2
    expect(mockRunwareService.controlNetPreprocess).toHaveBeenCalledTimes(1); // controlnet-1

    // Verify the persisted image was used as input for controlnet
    const controlnetCall = mockRunwareService.controlNetPreprocess.mock.calls[0][0];
    expect(controlnetCall.imageInitiator).toBe('https://example.com/persisted-first.jpg');
  });

  it('should execute both segments when first preview has no persisted image', async () => {
    // Same workflow but preview-1 has no persisted image
    const nodes: Node[] = [
      {
        id: 'text-1',
        type: 'textInput',
        position: { x: 0, y: 0 },
        data: { prompt: 'first prompt' }
      },
      {
        id: 'engine-1',
        type: 'engine',
        position: { x: 200, y: 0 },
        data: { functionality: 'engine' }
      },
      {
        id: 'preview-1',
        type: 'previewNode',
        position: { x: 400, y: 0 },
        data: {} // No persisted image
      },
      {
        id: 'controlnet-1',
        type: 'controlNet',
        position: { x: 600, y: 0 },
        data: { 
          functionality: 'control-net',
          preprocessor: 'pose'
        }
      },
      {
        id: 'text-2',
        type: 'textInput',
        position: { x: 600, y: 100 },
        data: { prompt: 'second prompt' }
      },
      {
        id: 'engine-2',
        type: 'engine',
        position: { x: 800, y: 0 },
        data: { functionality: 'engine' }
      },
      {
        id: 'preview-2',
        type: 'previewNode',
        position: { x: 1000, y: 0 },
        data: {}
      }
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'text-1', target: 'engine-1' },
      { id: 'e2', source: 'engine-1', target: 'preview-1' },
      { id: 'e3', source: 'preview-1', target: 'controlnet-1' },
      { id: 'e4', source: 'text-2', target: 'engine-2' },
      { id: 'e5', source: 'controlnet-1', target: 'engine-2' },
      { id: 'e6', source: 'engine-2', target: 'preview-2' }
    ];

    const result = await workflowExecutor.executeWorkflow(nodes, edges, 'preview-2');

    expect(result).toBe(null); // Preview nodes don't return results

    // Both segments should have been executed
    expect(mockRunwareService.generateImage).toHaveBeenCalledTimes(2); // engine-1 and engine-2
    expect(mockRunwareService.controlNetPreprocess).toHaveBeenCalledTimes(1); // controlnet-1
  });

  it('should handle multiple preview boundaries correctly', async () => {
    const nodes: Node[] = [
      // First segment
      {
        id: 'text-1',
        type: 'textInput',
        position: { x: 0, y: 0 },
        data: { prompt: 'first prompt' }
      },
      {
        id: 'engine-1',
        type: 'engine',
        position: { x: 200, y: 0 },
        data: { functionality: 'engine' }
      },
      {
        id: 'preview-1',
        type: 'previewNode',
        position: { x: 400, y: 0 },
        data: { imageUrl: 'https://example.com/persisted-1.jpg' }
      },
      // Second segment
      {
        id: 'controlnet-1',
        type: 'controlNet',
        position: { x: 600, y: 0 },
        data: { 
          functionality: 'control-net',
          preprocessor: 'pose'
        }
      },
      {
        id: 'preview-2',
        type: 'output',
        position: { x: 800, y: 0 },
        data: { generatedImage: 'https://example.com/persisted-2.jpg' }
      },
      // Third segment
      {
        id: 'text-3',
        type: 'textInput',
        position: { x: 1000, y: 0 },
        data: { prompt: 'third prompt' }
      },
      {
        id: 'engine-3',
        type: 'engine',
        position: { x: 1200, y: 0 },
        data: { functionality: 'engine' }
      },
      {
        id: 'preview-3',
        type: 'previewNode',
        position: { x: 1400, y: 0 },
        data: {}
      }
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'text-1', target: 'engine-1' },
      { id: 'e2', source: 'engine-1', target: 'preview-1' },
      { id: 'e3', source: 'preview-1', target: 'controlnet-1' },
      { id: 'e4', source: 'controlnet-1', target: 'preview-2' },
      { id: 'e5', source: 'preview-2', target: 'engine-3' },
      { id: 'e6', source: 'text-3', target: 'engine-3' },
      { id: 'e7', source: 'engine-3', target: 'preview-3' }
    ];

    // Execute targeting the third preview
    const result = await workflowExecutor.executeWorkflow(nodes, edges, 'preview-3');

    expect(result).toBe(null); // Preview nodes don't return results

    // Only the third segment should execute (engine-3)
    expect(mockRunwareService.generateImage).toHaveBeenCalledTimes(1);
    expect(mockRunwareService.controlNetPreprocess).not.toHaveBeenCalled();

    // Verify the persisted image from preview-2 was used
    const engineCall = mockRunwareService.generateImage.mock.calls[0][0];
    expect(engineCall.imageInitiator).toBe('https://example.com/persisted-2.jpg');
  });
});