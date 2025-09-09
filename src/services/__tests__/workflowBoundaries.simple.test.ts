import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowExecutor } from '../workflowExecutor';
import { RunwareService } from '../runwareService';
import { Node, Edge } from '@xyflow/react';

// Mock RunwareService
vi.mock('../runwareService');

describe('Workflow Boundaries - Core Functionality', () => {
  let workflowExecutor: WorkflowExecutor;
  let mockRunwareService: vi.Mocked<RunwareService>;

  beforeEach(() => {
    mockRunwareService = new RunwareService('test-key') as vi.Mocked<RunwareService>;
    workflowExecutor = new WorkflowExecutor(mockRunwareService);
  });

  it('should prune execution order when preview has persisted image', async () => {
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
        id: 'text-2',
        type: 'textInput',
        position: { x: 600, y: 0 },
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
      { id: 'e3', source: 'preview-1', target: 'engine-2' },
      { id: 'e4', source: 'text-2', target: 'engine-2' },
      { id: 'e5', source: 'engine-2', target: 'preview-2' }
    ];

    // Build dependency graph and check pruning
    const dependencies = workflowExecutor['buildDependencyGraph'](nodes, edges);
    const prunedDeps = workflowExecutor['pruneAtPersistedBoundaries'](nodes, dependencies, 'preview-2');
    
    // preview-1 should have no dependencies (pruned because it has persisted image)
    expect(prunedDeps.get('preview-1')).toEqual([]);
    
    // engine-2 should still depend on preview-1 and text-2
    expect(prunedDeps.get('engine-2')).toContain('preview-1');
    expect(prunedDeps.get('engine-2')).toContain('text-2');
    
    // But preview-1 should not depend on engine-1 anymore
    expect(prunedDeps.get('preview-1')).not.toContain('engine-1');
  });

  it('should not prune when preview has no persisted image', async () => {
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
        id: 'text-2',
        type: 'textInput',
        position: { x: 600, y: 0 },
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
      { id: 'e3', source: 'preview-1', target: 'engine-2' },
      { id: 'e4', source: 'text-2', target: 'engine-2' },
      { id: 'e5', source: 'engine-2', target: 'preview-2' }
    ];

    const dependencies = workflowExecutor['buildDependencyGraph'](nodes, edges);
    const prunedDeps = workflowExecutor['pruneAtPersistedBoundaries'](nodes, dependencies, 'preview-2');
    
    // preview-1 should still have its dependencies (not pruned because no persisted image)
    expect(prunedDeps.get('preview-1')).toContain('engine-1');
    expect(prunedDeps.get('engine-1')).toContain('text-1');
  });

  it('should prime persisted images correctly', () => {
    const nodes: Node[] = [
      {
        id: 'preview-1',
        type: 'previewNode',
        position: { x: 0, y: 0 },
        data: {
          imageUrl: 'https://example.com/persisted.jpg'
        }
      },
      {
        id: 'output-1',
        type: 'output',
        position: { x: 200, y: 0 },
        data: {
          generatedImage: 'https://example.com/generated.jpg'
        }
      },
      {
        id: 'preview-2',
        type: 'previewNode',
        position: { x: 400, y: 0 },
        data: {} // No persisted image
      }
    ];

    // Clear any existing processed images
    workflowExecutor['clearProcessedImages']();
    
    // Prime the cache
    workflowExecutor['primePersistedImageSources'](nodes);

    // Check that persisted images were added to cache
    expect(workflowExecutor['processedImages'].get('preview-1')).toBe('https://example.com/persisted.jpg');
    expect(workflowExecutor['processedImages'].get('output-1')).toBe('https://example.com/generated.jpg');
    expect(workflowExecutor['processedImages'].has('preview-2')).toBe(false);
  });
});