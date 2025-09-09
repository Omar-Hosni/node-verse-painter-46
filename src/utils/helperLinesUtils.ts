import { Node, NodePositionChange, XYPosition } from '@xyflow/react';

type GetHelperLinesResult = {
  horizontal?: number;
  vertical?: number;
  snapPosition: Partial<XYPosition>;
};

// Helper function to calculate absolute position of a node, accounting for nested frame hierarchy
function getAbsolutePosition(node: Node, nodes: Node[]): { x: number; y: number } {
  let absoluteX = node.position.x;
  let absoluteY = node.position.y;
  
  // Traverse up the parent hierarchy to calculate absolute position
  let currentNode = node;
  while (currentNode.parentId) {
    const parentNode = nodes.find(n => n.id === currentNode.parentId);
    if (parentNode) {
      absoluteX += parentNode.position.x;
      absoluteY += parentNode.position.y;
      currentNode = parentNode;
    } else {
      break;
    }
  }
  
  return { x: absoluteX, y: absoluteY };
}

// Helper function to calculate the correct helper line position
function getHelperLinePosition(
  isNodeAChildOfB: boolean,
  areNodesSiblings: boolean,
  nodeA: Node,
  nodeB: Node,
  nodes: Node[],
  boundValue: number,
  axis: 'x' | 'y'
): number {
  if (isNodeAChildOfB && nodeB.type === 'frame-node') {
    const absolutePos = getAbsolutePosition(nodeB, nodes);
    return (axis === 'x' ? absolutePos.x : absolutePos.y) + boundValue;
  } else if (areNodesSiblings) {
    const parentFrame = nodes.find(n => n.id === nodeA.parentId);
    if (parentFrame) {
      const absolutePos = getAbsolutePosition(parentFrame, nodes);
      return (axis === 'x' ? absolutePos.x : absolutePos.y) + boundValue;
    } else {
      return boundValue;
    }
  } else {
    return boundValue;
  }
}

// this utility function can be called with a position change (inside onNodesChange)
// it checks all other nodes and calculated the helper line positions and the position where the current node should snap to
export function getHelperLines(
  change: NodePositionChange,
  nodes: Node[],
  distance = 5
): GetHelperLinesResult {
  const defaultResult = {
    horizontal: undefined,
    vertical: undefined,
    snapPosition: { x: undefined, y: undefined },
  };
  const nodeA = nodes.find((node) => node.id === change.id);

  if (!nodeA || !change.position) {
    return defaultResult;
  }

  // Get actual node dimensions without handles
  const getNodeDimensions = (node: Node) => {
    let width = node.width ?? node.measured?.width ?? 100;
    let height = node.height ?? node.measured?.height ?? 50;

    
    return { width, height };
  };

  const nodeADimensions = getNodeDimensions(nodeA);
  const nodeABounds = {
    left: change.position.x,
    right: change.position.x + nodeADimensions.width,
    top: change.position.y,
    bottom: change.position.y + nodeADimensions.height,
    width: nodeADimensions.width,
    height: nodeADimensions.height,
  };

  let horizontalDistance = distance;
  let verticalDistance = distance;

  return nodes
    .filter((node) => {
      if (node.id === nodeA.id) return false;

      // If nodeA is a child, it should only align with:
      // 1. Its parent frame
      // 2. Sibling nodes (nodes with the same parent)
      if (nodeA.parentId) {
        return node.id === nodeA.parentId || node.parentId === nodeA.parentId;
      }

      // If nodeA is a frame, it should NOT align with its children
      if (nodeA.type === 'frame-node') {
        return node.parentId !== nodeA.id;
      }

      // If nodeA is independent, it should NOT align with child nodes of frames
      return !node.parentId;
    })
    .reduce<GetHelperLinesResult>((result, nodeB) => {
      const nodeBDimensions = getNodeDimensions(nodeB);

      // Check if nodeA is a child of nodeB (frame)
      const isNodeAChildOfB = nodeA.parentId === nodeB.id;
      
      // Check if nodeA and nodeB are siblings (same parent)
      const areNodesSiblings = nodeA.parentId && nodeB.parentId && nodeA.parentId === nodeB.parentId;

      let nodeBBounds;

      if (isNodeAChildOfB && nodeB.type === 'frame-node') {
        // NodeA is a child of frame nodeB - use relative coordinates for alignment
        const frameWidth = (nodeB.data?.width as number) || 400;
        const frameHeight = (nodeB.data?.height as number) || 300;

        nodeBBounds = {
          left: 0, // Frame's left edge in relative coordinates
          right: frameWidth, // Frame's right edge in relative coordinates
          top: 0, // Frame's top edge in relative coordinates
          bottom: frameHeight, // Frame's bottom edge in relative coordinates
          width: frameWidth,
          height: frameHeight,
        };
      } else {
        // Normal case - use absolute coordinates
        nodeBBounds = {
          left: nodeB.position.x,
          right: nodeB.position.x + nodeBDimensions.width,
          top: nodeB.position.y,
          bottom: nodeB.position.y + nodeBDimensions.height,
          width: nodeBDimensions.width,
          height: nodeBDimensions.height,
        };
      }

      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     A     |
      //  |___________|
      //  |
      //  |
      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     B     |
      //  |___________|
      const distanceLeftLeft = Math.abs(nodeABounds.left - nodeBBounds.left);

      if (distanceLeftLeft < verticalDistance) {
        result.snapPosition.x = nodeBBounds.left;
        // Fix helper line position for parent-child and sibling relationships
        if (isNodeAChildOfB && nodeB.type === 'frame-node') {
          const absolutePos = getAbsolutePosition(nodeB, nodes);
          result.vertical = absolutePos.x + nodeBBounds.left;
        } else if (areNodesSiblings) {
          // For sibling alignments, convert relative position to absolute
          const parentFrame = nodes.find(n => n.id === nodeA.parentId);
          if (parentFrame) {
            const absolutePos = getAbsolutePosition(parentFrame, nodes);
            result.vertical = absolutePos.x + nodeBBounds.left;
          } else {
            result.vertical = nodeBBounds.left;
          }
        } else {
          result.vertical = nodeBBounds.left;
        }
        verticalDistance = distanceLeftLeft;
      }

      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     A     |
      //  |___________|
      //              |
      //              |
      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     B     |
      //  |___________|
      const distanceRightRight = Math.abs(
        nodeABounds.right - nodeBBounds.right
      );

      if (distanceRightRight < verticalDistance) {
        result.snapPosition.x = nodeBBounds.right - nodeABounds.width;
        // Fix helper line position for parent-child and sibling relationships
        if (isNodeAChildOfB && nodeB.type === 'frame-node') {
          const absolutePos = getAbsolutePosition(nodeB, nodes);
          result.vertical = absolutePos.x + nodeBBounds.right;
        } else if (areNodesSiblings) {
          // For sibling alignments, convert relative position to absolute
          const parentFrame = nodes.find(n => n.id === nodeA.parentId);
          if (parentFrame) {
            const absolutePos = getAbsolutePosition(parentFrame, nodes);
            result.vertical = absolutePos.x + nodeBBounds.right;
          } else {
            result.vertical = nodeBBounds.right;
          }
        } else {
          result.vertical = nodeBBounds.right;
        }
        verticalDistance = distanceRightRight;
      }

      //              |‾‾‾‾‾‾‾‾‾‾‾|
      //              |     A     |
      //              |___________|
      //              |
      //              |
      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     B     |
      //  |___________|
      const distanceLeftRight = Math.abs(nodeABounds.left - nodeBBounds.right);

      if (distanceLeftRight < verticalDistance) {
        result.snapPosition.x = nodeBBounds.right;
        result.vertical = getHelperLinePosition(isNodeAChildOfB, areNodesSiblings, nodeA, nodeB, nodes, nodeBBounds.right, 'x');
        verticalDistance = distanceLeftRight;
      }

      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     A     |
      //  |___________|
      //              |
      //              |
      //              |‾‾‾‾‾‾‾‾‾‾‾|
      //              |     B     |
      //              |___________|
      const distanceRightLeft = Math.abs(nodeABounds.right - nodeBBounds.left);

      if (distanceRightLeft < verticalDistance) {
        result.snapPosition.x = nodeBBounds.left - nodeABounds.width;
        result.vertical = getHelperLinePosition(isNodeAChildOfB, areNodesSiblings, nodeA, nodeB, nodes, nodeBBounds.left, 'x');
        verticalDistance = distanceRightLeft;
      }

      //  |‾‾‾‾‾‾‾‾‾‾‾|‾‾‾‾‾|‾‾‾‾‾‾‾‾‾‾‾|
      //  |     A     |     |     B     |
      //  |___________|     |___________|
      const distanceTopTop = Math.abs(nodeABounds.top - nodeBBounds.top);

      if (distanceTopTop < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.top;
        // Fix helper line position for parent-child and sibling relationships
        if (isNodeAChildOfB && nodeB.type === 'frame-node') {
          const absolutePos = getAbsolutePosition(nodeB, nodes);
          result.horizontal = absolutePos.y + nodeBBounds.top;
        } else if (areNodesSiblings) {
          // For sibling alignments, convert relative position to absolute
          const parentFrame = nodes.find(n => n.id === nodeA.parentId);
          if (parentFrame) {
            const absolutePos = getAbsolutePosition(parentFrame, nodes);
            result.horizontal = absolutePos.y + nodeBBounds.top;
          } else {
            result.horizontal = nodeBBounds.top;
          }
        } else {
          result.horizontal = nodeBBounds.top;
        }
        horizontalDistance = distanceTopTop;
      }

      //  |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     A     |
      //  |___________|_________________
      //                    |           |
      //                    |     B     |
      //                    |___________|
      const distanceBottomTop = Math.abs(nodeABounds.bottom - nodeBBounds.top);

      if (distanceBottomTop < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.top - nodeABounds.height;
        result.horizontal = getHelperLinePosition(isNodeAChildOfB, areNodesSiblings, nodeA, nodeB, nodes, nodeBBounds.top, 'y');
        horizontalDistance = distanceBottomTop;
      }

      //  |‾‾‾‾‾‾‾‾‾‾‾|     |‾‾‾‾‾‾‾‾‾‾‾|
      //  |     A     |     |     B     |
      //  |___________|_____|___________|
      const distanceBottomBottom = Math.abs(
        nodeABounds.bottom - nodeBBounds.bottom
      );

      if (distanceBottomBottom < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.bottom - nodeABounds.height;
        result.horizontal = getHelperLinePosition(isNodeAChildOfB, areNodesSiblings, nodeA, nodeB, nodes, nodeBBounds.bottom, 'y');
        horizontalDistance = distanceBottomBottom;
      }

      //                    |‾‾‾‾‾‾‾‾‾‾‾|
      //                    |     B     |
      //                    |           |
      //  |‾‾‾‾‾‾‾‾‾‾‾|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
      //  |     A     |
      //  |___________|
      const distanceTopBottom = Math.abs(nodeABounds.top - nodeBBounds.bottom);

      if (distanceTopBottom < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.bottom;
        result.horizontal = getHelperLinePosition(isNodeAChildOfB, areNodesSiblings, nodeA, nodeB, nodes, nodeBBounds.bottom, 'y');
        horizontalDistance = distanceTopBottom;
      }

      // Vertical center alignment (nodeA center aligns with nodeB center vertically)
      const nodeACenterX = nodeABounds.left + nodeABounds.width / 2;
      const nodeBCenterX = nodeBBounds.left + nodeBBounds.width / 2;
      const distanceCenterVertical = Math.abs(nodeACenterX - nodeBCenterX);

      if (distanceCenterVertical < verticalDistance) {
        result.snapPosition.x = nodeBCenterX - nodeABounds.width / 2;
        result.vertical = getHelperLinePosition(isNodeAChildOfB, areNodesSiblings, nodeA, nodeB, nodes, nodeBCenterX, 'x');
        verticalDistance = distanceCenterVertical;
      }

      // Horizontal center alignment (nodeA center aligns with nodeB center horizontally)
      const nodeACenterY = nodeABounds.top + nodeABounds.height / 2;
      const nodeBCenterY = nodeBBounds.top + nodeBBounds.height / 2;
      const distanceCenterHorizontal = Math.abs(nodeACenterY - nodeBCenterY);

      if (distanceCenterHorizontal < horizontalDistance) {
        result.snapPosition.y = nodeBCenterY - nodeABounds.height / 2;
        result.horizontal = getHelperLinePosition(isNodeAChildOfB, areNodesSiblings, nodeA, nodeB, nodes, nodeBCenterY, 'y');
        horizontalDistance = distanceCenterHorizontal;
      }

      // Special alignment for parent-child relationships
      if (isNodeAChildOfB && nodeB.type === 'frame-node') {
        const frameWidth = nodeBBounds.width;
        const frameHeight = nodeBBounds.height;
        const childWidth = nodeABounds.width;
        const childHeight = nodeABounds.height;

        // Calculate parent frame's absolute position, accounting for nested hierarchy
        const parentAbsolutePos = getAbsolutePosition(nodeB, nodes);
        const parentAbsoluteX = parentAbsolutePos.x;
        const parentAbsoluteY = parentAbsolutePos.y;

        // Top-left alignment (child at 0, 0)
        const distanceTopLeft = Math.abs(nodeABounds.left - 0) + Math.abs(nodeABounds.top - 0);
        if (distanceTopLeft < distance * 2) {
          result.snapPosition.x = 0;
          result.snapPosition.y = 0;
          result.vertical = parentAbsoluteX; // Helper line at parent's left edge
          result.horizontal = parentAbsoluteY; // Helper line at parent's top edge
          return result;
        }

        // Top-right alignment
        const topRightX = frameWidth - childWidth;
        const distanceTopRight = Math.abs(nodeABounds.left - topRightX) + Math.abs(nodeABounds.top - 0);
        if (distanceTopRight < distance * 2) {
          result.snapPosition.x = topRightX;
          result.snapPosition.y = 0;
          result.vertical = parentAbsoluteX + frameWidth; // Helper line at parent's right edge
          result.horizontal = parentAbsoluteY; // Helper line at parent's top edge
          return result;
        }



        // Bottom-left alignment
        const bottomLeftY = frameHeight - childHeight;
        const distanceBottomLeft = Math.abs(nodeABounds.left - 0) + Math.abs(nodeABounds.top - bottomLeftY);
        if (distanceBottomLeft < distance * 2) {
          result.snapPosition.x = 0;
          result.snapPosition.y = bottomLeftY;
          result.vertical = parentAbsoluteX; // Helper line at parent's left edge
          result.horizontal = parentAbsoluteY + frameHeight; // Helper line at parent's bottom edge
          return result;
        }

        // Bottom-right alignment
        const bottomRightX = frameWidth - childWidth;
        const bottomRightY = frameHeight - childHeight;
        const distanceBottomRight = Math.abs(nodeABounds.left - bottomRightX) + Math.abs(nodeABounds.top - bottomRightY);
        if (distanceBottomRight < distance * 2) {
          result.snapPosition.x = bottomRightX;
          result.snapPosition.y = bottomRightY;
          result.vertical = parentAbsoluteX + frameWidth; // Helper line at parent's right edge
          result.horizontal = parentAbsoluteY + frameHeight; // Helper line at parent's bottom edge
          return result;
        }

        // Left edge alignment (child's left edge at parent's left edge, any Y position)
        const distanceLeft = Math.abs(nodeABounds.left - 0);
        if (distanceLeft < distance) {
          result.snapPosition.x = 0;
          result.vertical = parentAbsoluteX; // Helper line at parent's left edge
          verticalDistance = distanceLeft;
        }

        // Right edge alignment (child's left edge positioned so right edge touches parent's right edge)
        const rightX = frameWidth - childWidth;
        const distanceRight = Math.abs(nodeABounds.left - rightX);
        if (distanceRight < distance * 2) {
          result.snapPosition.x = rightX;
          result.vertical = parentAbsoluteX + frameWidth; // Helper line at parent's right edge
          return result;
        }

        // Top edge alignment (child's top edge at parent's top edge, any X position)
        const distanceTop = Math.abs(nodeABounds.top - 0);
        if (distanceTop < distance) {
          result.snapPosition.y = 0;
          result.horizontal = parentAbsoluteY; // Helper line at parent's top edge
          horizontalDistance = distanceTop;
        }

        // Bottom edge alignment (child's bottom edge at parent's bottom edge, any X position)
        const distanceBottom = Math.abs(nodeABounds.bottom - frameHeight);
        if (distanceBottom < distance) {
          result.snapPosition.y = frameHeight - childHeight;
          result.horizontal = parentAbsoluteY + frameHeight; // Helper line at parent's bottom edge
          horizontalDistance = distanceBottom;
        }

        // Center-center alignment
        const centerX = (frameWidth - childWidth) / 2;
        const centerY = (frameHeight - childHeight) / 2;
        const distanceCenter = Math.abs(nodeABounds.left - centerX) + Math.abs(nodeABounds.top - centerY);
        if (distanceCenter < distance * 2) {
          result.snapPosition.x = centerX;
          result.snapPosition.y = centerY;
          result.vertical = parentAbsoluteX + frameWidth / 2; // Helper line at parent's center vertical
          result.horizontal = parentAbsoluteY + frameHeight / 2; // Helper line at parent's center horizontal
          return result;
        }

        // Center-top alignment
        const distanceCenterTop = Math.abs(nodeABounds.left - centerX) + Math.abs(nodeABounds.top - 0);
        if (distanceCenterTop < distance * 2) {
          result.snapPosition.x = centerX;
          result.snapPosition.y = 0;
          result.vertical = parentAbsoluteX + frameWidth / 2; // Helper line at parent's center vertical
          result.horizontal = parentAbsoluteY; // Helper line at parent's top edge
          return result;
        }

        // Center-bottom alignment
        const distanceCenterBottom = Math.abs(nodeABounds.left - centerX) + Math.abs(nodeABounds.top - bottomLeftY);
        if (distanceCenterBottom < distance * 2) {
          result.snapPosition.x = centerX;
          result.snapPosition.y = bottomLeftY;
          result.vertical = parentAbsoluteX + frameWidth / 2; // Helper line at parent's center vertical
          result.horizontal = parentAbsoluteY + frameHeight; // Helper line at parent's bottom edge
          return result;
        }

        // Left-center alignment
        const distanceLeftCenter = Math.abs(nodeABounds.left - 0) + Math.abs(nodeABounds.top - centerY);
        if (distanceLeftCenter < distance * 2) {
          result.snapPosition.x = 0;
          result.snapPosition.y = centerY;
          result.vertical = parentAbsoluteX; // Helper line at parent's left edge
          result.horizontal = parentAbsoluteY + frameHeight / 2; // Helper line at parent's center horizontal
          return result;
        }

        // Right-center alignment
        const distanceRightCenter = Math.abs(nodeABounds.left - topRightX) + Math.abs(nodeABounds.top - centerY);
        if (distanceRightCenter < distance * 2) {
          result.snapPosition.x = topRightX;
          result.snapPosition.y = centerY;
          result.vertical = parentAbsoluteX + frameWidth; // Helper line at parent's right edge
          result.horizontal = parentAbsoluteY + frameHeight / 2; // Helper line at parent's center horizontal
          return result;
        }
      }

      return result;
    }, defaultResult);
}