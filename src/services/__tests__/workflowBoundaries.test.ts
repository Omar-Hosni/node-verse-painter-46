import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowExecutor } from '../workflowExecutor';
import { RunwareService } from '../runwareService';
import { Node, Edge } from '@xyflow/react';

// Mock RunwareService
vi.mock('../runwareService');

describe('Workflow Boundaries', () => {
  let workflowExecutor: WorkflowExecutor;
  let mockRunwareService: vi.Mocked<RunwareService>;

  beforeEach(() => {
    mockRunwareService = new RunwareService('test-key') as vi.Mocked<RunwareService>;
    workflowExecutor = new WorkflowExecutor(mockRunwareService);
  });

  it('should prime persisted image sources from preview nodes', () => {
    const nodes: Node[] = [
      {
        id: 'preview-1',
        type: 'previewNode',
        position: { x: 0, y: 0 },
        data: {
          imageUrl: 'https://example.com/persisted-image.jpg'
        }
      },
      {
        id: 'preview-2',
        type: 'output',
        position: { x: 200, y: 0 },
        data: {
          generatedImage: 'https://example.com/generated-image.jpg'
        }
      },
      {
        id: 'preview-3',
        type: 'previewNode',
        position: { x: 400, y: 0 },
        data: {} // No persisted image
      }
    ];

    // Call the private method through bracket notation
    workflowExecutor['primePersistedImageSources'](nodes);

    // Check that persisted images were added to cache
    expect(workflowExecutor['processedImages'].get('preview-1')).toBe('https://example.com/persisted-image.jpg');
    expect(workflowExecutor['processedImages'].get('preview-2')).toBe('https://example.com/generated-image.jpg');
    expect(workflowExecutor['processedImages'].has('preview-3')).toBe(false);
  });

  it('should identify preview-like nodes correctly', () => {
    const previewNode: Node = {
      id: 'preview-1',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {}
    };

    const outputNode: Node = {
      id: 'output-1',
      type: 'output',
      position: { x: 0, y: 0 },
      data: {}
    };

    const realtimeNode: Node = {
      id: 'realtime-1',
      type: 'preview-realtime-node',
      position: { x: 0, y: 0 },
      data: {}
    };

    const normalNode: Node = {
      id: 'normal-1',
      type: 'normal-node',
      position: { x: 0, y: 0 },
      data: {}
    };

    expect(workflowExecutor['isPreviewLike'](previewNode)).toBe(true);
    expect(workflowExecutor['isPreviewLike'](outputNode)).toBe(true);
    expect(workflowExecutor['isPreviewLike'](realtimeNode)).toBe(true);
    expect(workflowExecutor['isPreviewLike'](normalNode)).toBe(false);
  });

  it('should extract persisted images from various locations', () => {
    const nodeWithImageUrl: Node = {
      id: 'node-1',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {
        imageUrl: 'https://example.com/image1.jpg'
      }
    };

    const nodeWithGeneratedImage: Node = {
      id: 'node-2',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {
        generatedImage: 'https://example.com/image2.jpg'
      }
    };

    const nodeWithSidebarImage: Node = {
      id: 'node-3',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {
        right_sidebar: {
          imageUrl: 'https://example.com/image3.jpg'
        }
      }
    };

    const nodeWithoutImage: Node = {
      id: 'node-4',
      type: 'previewNode',
      position: { x: 0, y: 0 },
      data: {}
    };

    expect(workflowExecutor['persistedImage'](nodeWithImageUrl)).toBe('https://example.com/image1.jpg');
    expect(workflowExecutor['persistedImage'](nodeWithGeneratedImage)).toBe('https://example.com/image2.jpg');
    expect(workflowExecutor['persistedImage'](nodeWithSidebarImage)).toBe('https://example.com/image3.jpg');
    expect(workflowExecutor['persistedImage'](nodeWithoutImage)).toBe(null);
  });

  it('should prune dependencies at persisted boundaries', () => {
    const nodes: Node[] = [
      {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: {}
      },
      {
        id: 'engine-1',
        type: 'normal-node',
        position: { x: 200, y: 0 },
        data: { functionality: 'engine' }
      },
      {
        id: 'preview-1',
        type: 'previewNode',
        position: { x: 400, y: 0 },
        data: {
          imageUrl: 'https://example.com/persisted.jpg' // Has persisted image
        }
      },
      {
        id: 'controlnet-1',
        type: 'normal-node',
        position: { x: 600, y: 0 },
        data: { functionality: 'control-net' }
      },
      {
        id: 'engine-2',
        type: 'normal-node',
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

    // Create dependency map: preview-2 depends on engine-2, engine-2 depends on controlnet-1, etc.
    const dependencies = new Map([
      ['preview-2', ['engine-2']],
      ['engine-2', ['controlnet-1']],
      ['controlnet-1', ['preview-1']],
      ['preview-1', ['engine-1']],
      ['engine-1', ['image-1']],
      ['image-1', []]
    ]);

    const prunedDeps = workflowExecutor['pruneAtPersistedBoundaries'](nodes, dependencies, 'preview-2');

    // preview-1 should have no dependencies (pruned because it has persisted image)
    expect(prunedDeps.get('preview-1')).toEqual([]);
    
    // controlnet-1 should still depend on preview-1 (kept as boundary)
    expect(prunedDeps.get('controlnet-1')).toEqual(['preview-1']);
    
    // Other dependencies should remain intact
    expect(prunedDeps.get('preview-2')).toEqual(['engine-2']);
    expect(prunedDeps.get('engine-2')).toEqual(['controlnet-1']);
  });
});