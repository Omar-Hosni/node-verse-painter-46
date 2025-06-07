import { Node } from '@xyflow/react';

export interface AlignmentGuide {
  type: 'horizontal' | 'vertical';
  position: number;
  nodeId: string;
  alignPart?: 'start' | 'center' | 'end';
}

const SNAP_DISTANCE = 10; // Distance in pixels to show guides

export const calculateAlignmentGuides = (
  draggedNode: Node,
  allNodes: Node[]
): AlignmentGuide[] => {
  const guides: AlignmentGuide[] = [];
  
  if (!draggedNode) return guides;

  const draggedRect = {
    x: draggedNode.position.x,
    y: draggedNode.position.y,
    width: draggedNode.style?.width ? 
      (typeof draggedNode.style.width === 'string' ? parseFloat(draggedNode.style.width) : draggedNode.style.width) : 80,
    height: draggedNode.style?.height ? 
      (typeof draggedNode.style.height === 'string' ? parseFloat(draggedNode.style.height) : draggedNode.style.height) : 80,
    centerX: draggedNode.position.x + (draggedNode.style?.width ? 
      (typeof draggedNode.style.width === 'string' ? parseFloat(draggedNode.style.width) : draggedNode.style.width) / 2 : 40),
    centerY: draggedNode.position.y + (draggedNode.style?.height ? 
      (typeof draggedNode.style.height === 'string' ? parseFloat(draggedNode.style.height) : draggedNode.style.height) / 2 : 40),
  };

  allNodes.forEach(node => {
    if (node.id === draggedNode.id) return;

    const nodeRect = {
      x: node.position.x,
      y: node.position.y,
      width: node.style?.width ? 
        (typeof node.style.width === 'string' ? parseFloat(node.style.width) : node.style.width) : 80,
      height: node.style?.height ? 
        (typeof node.style.height === 'string' ? parseFloat(node.style.height) : node.style.height) : 80,
      centerX: node.position.x + (node.style?.width ? 
        (typeof node.style.width === 'string' ? parseFloat(node.style.width) : node.style.width) / 2 : 40),
      centerY: node.position.y + (node.style?.height ? 
        (typeof node.style.height === 'string' ? parseFloat(node.style.height) : node.style.height) / 2 : 40),
    };

    // Horizontal alignment
    if (Math.abs(draggedRect.y - nodeRect.y) <= SNAP_DISTANCE) {
      guides.push({
        type: 'horizontal',
        position: nodeRect.y,
        nodeId: node.id,
        alignPart: 'start',
      });
    }

    if (Math.abs((draggedRect.y + draggedRect.height) - (nodeRect.y + nodeRect.height)) <= SNAP_DISTANCE) {
      guides.push({
        type: 'horizontal',
        position: nodeRect.y + nodeRect.height,
        nodeId: node.id,
        alignPart: 'end',
      });
    }

    if (Math.abs(draggedRect.centerY - nodeRect.centerY) <= SNAP_DISTANCE) {
      guides.push({
        type: 'horizontal',
        position: nodeRect.centerY,
        nodeId: node.id,
        alignPart: 'center',
      });
    }

    // Vertical alignment
    if (Math.abs(draggedRect.x - nodeRect.x) <= SNAP_DISTANCE) {
      guides.push({
        type: 'vertical',
        position: nodeRect.x,
        nodeId: node.id,
        alignPart: 'start',
      });
    }

    if (Math.abs((draggedRect.x + draggedRect.width) - (nodeRect.x + nodeRect.width)) <= SNAP_DISTANCE) {
      guides.push({
        type: 'vertical',
        position: nodeRect.x + nodeRect.width,
        nodeId: node.id,
        alignPart: 'end',
      });
    }

    if (Math.abs(draggedRect.centerX - nodeRect.centerX) <= SNAP_DISTANCE) {
      guides.push({
        type: 'vertical',
        position: nodeRect.centerX,
        nodeId: node.id,
        alignPart: 'center',
      });
    }
  });

  return guides;
};

export const snapNodeToGuides = (
  node: Node,
  guides: AlignmentGuide[]
): { x: number; y: number } => {
  let snappedX = node.position.x;
  let snappedY = node.position.y;

  const nodeWidth = node.style?.width ? 
    (typeof node.style.width === 'string' ? parseFloat(node.style.width) : node.style.width) : 80;
  const nodeHeight = node.style?.height ? 
    (typeof node.style.height === 'string' ? parseFloat(node.style.height) : node.style.height) : 80;

  guides.forEach(guide => {
    if (guide.type === 'horizontal') {
      // Snap to top edge
      if (Math.abs(node.position.y - guide.position) <= SNAP_DISTANCE) {
        snappedY = guide.position;
      }
      // Snap to center
      else if (Math.abs((node.position.y + nodeHeight / 2) - guide.position) <= SNAP_DISTANCE) {
        snappedY = guide.position - nodeHeight / 2;
      }
      // Snap to bottom edge
      else if (Math.abs((node.position.y + nodeHeight) - guide.position) <= SNAP_DISTANCE) {
        snappedY = guide.position - nodeHeight;
      }
    } else if (guide.type === 'vertical') {
      // Snap to left edge
      if (Math.abs(node.position.x - guide.position) <= SNAP_DISTANCE) {
        snappedX = guide.position;
      }
      // Snap to center
      else if (Math.abs((node.position.x + nodeWidth / 2) - guide.position) <= SNAP_DISTANCE) {
        snappedX = guide.position - nodeWidth / 2;
      }
      // Snap to right edge
      else if (Math.abs((node.position.x + nodeWidth) - guide.position) <= SNAP_DISTANCE) {
        snappedX = guide.position - nodeWidth;
      }
    }
  });

  return { x: snappedX, y: snappedY };
};