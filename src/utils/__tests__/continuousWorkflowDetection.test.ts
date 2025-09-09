import { describe, it, expect, beforeEach, vi } from 'vitest';
import { detectWorkflows } from '../connectionUtils';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Node, Edge } from '@xyflow/react';

// Mock the canvas store
vi.mock('@/store/useCanvasStore');

describe('Continuous Workflow Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect separate workflows connected via preview nodes', () => {
    const nodes: Node[] = [
      // First workflow
      {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: { type: 'image-node' }
      },
      {
        id: 'controlnet-1',
        type: 'normal-node',
        position: { x: 200, y: 0 },
        data: { type: 'control-net-pose', functionality: 'control-net' }
      },
      {
        id: 'engine-1',
        type: 'normal-node',
        position: { x: 400, y: 0 },
        data: { type: 'engine-real', functionality: 'engine' }
      },
      {
        id: 'preview-1',
        type: 'previewNode',
        position: { x: 600, y: 0 },
        data: { type: 'preview-image', functionality: 'output' }
      },
      // Second workflow (extended from first)
      {
        id: 'controlnet-2',
        type: 'normal-node',
        position: { x: 800, y: 0 },
        data: { type: 'control-net-edge', functionality: 'control-net' }
      },
      {
        id: 'engine-2',
        type: 'normal-node',
        position: { x: 1000, y: 0 },
        data: { type: 'engine-real', functionality: 'engine' }
      },
      {
        id: 'preview-2',
        type: 'previewNode',
        position: { x: 1200, y: 0 },
        data: { type: 'preview-image', functionality: 'output' }
      },
      // Third workflow (separate)
      {
        id: 'image-2',
        type: 'image-node',
        position: { x: 0, y: 300 },
        data: { type: 'image-node' }
      },
      {
        id: 'engine-3',
        type: 'normal-node',
        position: { x: 200, y: 300 },
        data: { type: 'engine-real', functionality: 'engine' }
      },
      {
        id: 'preview-3',
        type: 'previewNode',
        position: { x: 400, y: 300 },
        data: { type: 'preview-image', functionality: 'output' }
      }
    ];

    const edges: Edge[] = [
      // First workflow
      { id: 'e1', source: 'image-1', target: 'controlnet-1' },
      { id: 'e2', source: 'controlnet-1', target: 'engine-1' },
      { id: 'e3', source: 'engine-1', target: 'preview-1' },
      // Connection from first to second workflow
      { id: 'e4', source: 'preview-1', target: 'controlnet-2' },
      // Second workflow
      { id: 'e5', source: 'controlnet-2', target: 'engine-2' },
      { id: 'e6', source: 'engine-2', target: 'preview-2' },
      // Third workflow (separate)
      { id: 'e7', source: 'image-2', target: 'engine-3' },
      { id: 'e8', source: 'engine-3', target: 'preview-3' }
    ];

    // Mock the canvas store to return our test data
    (useCanvasStore.getState as any).mockReturnValue({
      nodes,
      edges
    });

    const workflows = detectWorkflows();

    // Should detect 3 separate workflows
    expect(workflows).toHaveLength(3);
    
    // First workflow should contain: image-1, controlnet-1, engine-1, preview-1
    const workflow1 = workflows.find(w => 
      w.nodes.some(n => n.id === 'image-1') && 
      w.nodes.some(n => n.id === 'preview-1')
    );
    expect(workflow1).toBeDefined();
    expect(workflow1!.nodes).toHaveLength(4);
    expect(workflow1!.engineNode?.id).toBe('engine-1');

    // Second workflow should contain: controlnet-2, engine-2, preview-2
    const workflow2 = workflows.find(w => 
      w.nodes.some(n => n.id === 'controlnet-2') && 
      w.nodes.some(n => n.id === 'preview-2')
    );
    expect(workflow2).toBeDefined();
    expect(workflow2!.nodes).toHaveLength(3);
    expect(workflow2!.engineNode?.id).toBe('engine-2');

    // Third workflow should contain: image-2, engine-3, preview-3
    const workflow3 = workflows.find(w => 
      w.nodes.some(n => n.id === 'image-2') && 
      w.nodes.some(n => n.id === 'preview-3')
    );
    expect(workflow3).toBeDefined();
    expect(workflow3!.nodes).toHaveLength(3);
    expect(workflow3!.engineNode?.id).toBe('engine-3');
  });

  it('should handle workflows with output nodes', () => {
    const nodes: Node[] = [
      {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: { type: 'image-node' }
      },
      {
        id: 'engine-1',
        type: 'normal-node',
        position: { x: 200, y: 0 },
        data: { type: 'engine-real', functionality: 'engine' }
      },
      {
        id: 'output-1',
        type: 'output',
        position: { x: 400, y: 0 },
        data: { type: 'preview-image', functionality: 'output' }
      }
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'image-1', target: 'engine-1' },
      { id: 'e2', source: 'engine-1', target: 'output-1' }
    ];

    (useCanvasStore.getState as any).mockReturnValue({
      nodes,
      edges
    });

    const workflows = detectWorkflows();

    expect(workflows).toHaveLength(1);
    expect(workflows[0].nodes).toHaveLength(3);
    expect(workflows[0].engineNode?.id).toBe('engine-1');
  });
});