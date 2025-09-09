import { describe, it, expect } from 'vitest';
import { Node, Edge } from '@xyflow/react';

// Extract the workflow traversal logic for testing
function findWorkflowSegment(
  selectedNodeId: string,
  nodes: Node[],
  edges: Edge[]
): Set<string> {
  const visited = new Set<string>();
  const segmentNodes = new Set<string>();
  
  const traverse = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    segmentNodes.add(id);
    
    edges.forEach(e => {
      if (e.source === id) traverse(e.target);
      if (e.target === id) traverse(e.source);
    });
  };
  
  traverse(selectedNodeId);
  return segmentNodes;
}

describe('Workflow Traversal', () => {
  it('should traverse entire connected workflow including preview nodes', () => {
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
        id: 'preview-1',
        type: 'previewNode',
        position: { x: 400, y: 0 },
        data: { type: 'preview-image', functionality: 'output' }
      },
      {
        id: 'controlnet-1',
        type: 'normal-node',
        position: { x: 600, y: 0 },
        data: { type: 'control-net-pose', functionality: 'control-net' }
      },
      {
        id: 'engine-2',
        type: 'normal-node',
        position: { x: 800, y: 0 },
        data: { type: 'engine-real', functionality: 'engine' }
      },
      {
        id: 'preview-2',
        type: 'previewNode',
        position: { x: 1000, y: 0 },
        data: { type: 'preview-image', functionality: 'output' }
      }
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'image-1', target: 'engine-1' },
      { id: 'e2', source: 'engine-1', target: 'preview-1' },
      { id: 'e3', source: 'preview-1', target: 'controlnet-1' },
      { id: 'e4', source: 'controlnet-1', target: 'engine-2' },
      { id: 'e5', source: 'engine-2', target: 'preview-2' }
    ];

    // All nodes should be included regardless of starting point
    const allNodeIds = new Set(['image-1', 'engine-1', 'preview-1', 'controlnet-1', 'engine-2', 'preview-2']);
    
    const fromEngine1 = findWorkflowSegment('engine-1', nodes, edges);
    expect(fromEngine1).toEqual(allNodeIds);

    const fromControlnet = findWorkflowSegment('controlnet-1', nodes, edges);
    expect(fromControlnet).toEqual(allNodeIds);

    const fromEngine2 = findWorkflowSegment('engine-2', nodes, edges);
    expect(fromEngine2).toEqual(allNodeIds);
  });

  it('should find rightmost preview node as target', () => {
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
        data: {}
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
        data: {}
      }
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'image-1', target: 'engine-1' },
      { id: 'e2', source: 'engine-1', target: 'preview-1' },
      { id: 'e3', source: 'preview-1', target: 'controlnet-1' },
      { id: 'e4', source: 'controlnet-1', target: 'engine-2' },
      { id: 'e5', source: 'engine-2', target: 'preview-2' }
    ];

    const runnableTargets = nodes.filter(n => ['previewNode', 'output', 'preview-realtime-node'].includes(n.type ?? ''));
    
    // From any node, should find both preview nodes but select the rightmost (preview-2)
    const segment = findWorkflowSegment('controlnet-1', nodes, edges);
    const workflowTargets = runnableTargets.filter(t => segment.has(t.id));
    const rightmostTarget = workflowTargets.sort((a, b) => (b.position?.x ?? 0) - (a.position?.x ?? 0))[0];
    
    expect(workflowTargets).toHaveLength(2);
    expect(rightmostTarget.id).toBe('preview-2');
  });
});