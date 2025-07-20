import { Node, NodePositionChange, XYPosition } from 'reactflow';

type GetHelperLinesResult = {
  horizontal?: number;
  vertical?: number;
  snapPosition: Partial<XYPosition>;
};

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
  
  // Function to get dynamic width for custom nodes with fit-content
  const getDynamicWidth = (node: Node, fallbackWidth: number): number => {
    // First try measured width (most accurate)
    if (node.measured?.width) {
      return node.measured.width;
    }
    
    // For custom nodes with dynamic width, calculate based on content
    if (node.type === 'custom') {
      // Try to get the text content to estimate width
      const label = node.data?.label || 'Upscale 4x';
      
      // Create a temporary element to measure text width
      const tempElement = document.createElement('div');
      tempElement.style.position = 'absolute';
      tempElement.style.visibility = 'hidden';
      tempElement.style.fontSize = '10px';
      tempElement.style.fontWeight = '500';
      tempElement.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      tempElement.style.whiteSpace = 'nowrap';
      tempElement.textContent = label;
      
      document.body.appendChild(tempElement);
      const textWidth = tempElement.offsetWidth;
      document.body.removeChild(tempElement);
      
      // Calculate total width based on CustomNode structure:
      // padding (20px) + left icon (20px) + gap (12px) + text (dynamic) + gap (12px) + right circle (32px)
      const calculatedWidth = 20 + 20 + 12 + textWidth + 12 + 32;
      
      return calculatedWidth;
    }
    
    // Fallback to style width or default
    return (node.style?.width as number) ?? fallbackWidth;
  };
  
  // Get node dimensions - keep height calculation exactly as before
  const getDefaultDimensions = (node: Node) => {
    if (node.type === 'custom') {
      return { width: 120, height: 48 }; // Custom nodes are typically ~120px wide, 48px high
    } else if (node.type === 'frame') {
      return { width: 250, height: 180 }; // Frame nodes default size
    }
    return { width: 150, height: 40 }; // Generic fallback
  };
  
  const nodeADefaults = getDefaultDimensions(nodeA);
  // Use dynamic width calculation for width, keep original height calculation
  const nodeAWidth = getDynamicWidth(nodeA, nodeADefaults.width);
  const nodeAHeight = nodeA.measured?.height ?? (nodeA.style?.height as number) ?? nodeADefaults.height;
  
  const nodeABounds = {
    left: change.position.x,
    right: change.position.x + nodeAWidth,
    top: change.position.y,
    bottom: change.position.y + nodeAHeight,
    width: nodeAWidth,
    height: nodeAHeight,
    centerX: change.position.x + nodeAWidth / 2,
    centerY: change.position.y + nodeAHeight / 2,
  };
  
  let horizontalDistance = distance;
  let verticalDistance = distance;
  
  // Filter nodes based on parent-child relationships
  const eligibleNodes = nodes.filter((node) => {
    if (node.id === nodeA.id) return false; // Skip self
    
    // If nodeA is a child node (has a parent)
    if (nodeA.parentId) {
      // Only allow alignment with:
      // 1. Its parent (for parent-child alignment)
      // 2. Its siblings (nodes with the same parent)
      return node.id === nodeA.parentId || node.parentId === nodeA.parentId;
    }
    
    // If nodeA is not a child (independent node), allow alignment with all nodes
    return true;
  });

  return eligibleNodes
    .reduce<GetHelperLinesResult>((result, nodeB) => {
      // Get node B dimensions - use dynamic width calculation for width, keep original height calculation
      const nodeBDefaults = getDefaultDimensions(nodeB);
      const nodeBWidth = getDynamicWidth(nodeB, nodeBDefaults.width);
      const nodeBHeight = nodeB.measured?.height ?? (nodeB.style?.height as number) ?? nodeBDefaults.height;
      
      const nodeBBounds = {
        left: nodeB.position.x,
        right: nodeB.position.x + nodeBWidth,
        top: nodeB.position.y,
        bottom: nodeB.position.y + nodeBHeight,
        width: nodeBWidth,
        height: nodeBHeight,
        centerX: nodeB.position.x + nodeBWidth / 2,
        centerY: nodeB.position.y + nodeBHeight / 2,
      };
      
      // Special handling for parent-child relationships
      const isNodeAChildOfB = nodeA.parentId === nodeB.id;
      const isNodeBChildOfA = nodeB.parentId === nodeA.id;
      
      if (isNodeAChildOfB) {
        // NodeA is child of NodeB (frame) - use special parent-child alignment
        // Child positions are relative to parent frame, so we use different calculations
        
        // Top-left alignment: child x=0, y=0
        const distanceTopLeft = Math.abs(change.position.x - 0) + Math.abs(change.position.y - 0);
        if (distanceTopLeft < distance * 2) {
          result.snapPosition.x = 0;
          result.snapPosition.y = 0;
          result.vertical = nodeBBounds.left;
          result.horizontal = nodeBBounds.top;
          verticalDistance = 0;
          horizontalDistance = 0;
        }
        
        // Top-right alignment: child x = parent width - child width, y = 0
        const topRightX = nodeBWidth - nodeAWidth;
        const distanceTopRight = Math.abs(change.position.x - topRightX) + Math.abs(change.position.y - 0);
        if (distanceTopRight < distance * 2) {
          result.snapPosition.x = topRightX;
          result.snapPosition.y = 0;
          result.vertical = nodeBBounds.right;
          result.horizontal = nodeBBounds.top;
          verticalDistance = 0;
          horizontalDistance = 0;
        }
        
        // Bottom-left alignment: child x = 0, y = parent height - child height
        const bottomLeftY = nodeBHeight - nodeAHeight;
        const distanceBottomLeft = Math.abs(change.position.x - 0) + Math.abs(change.position.y - bottomLeftY);
        if (distanceBottomLeft < distance * 2) {
          result.snapPosition.x = 0;
          result.snapPosition.y = bottomLeftY;
          result.vertical = nodeBBounds.left;
          result.horizontal = nodeBBounds.bottom;
          verticalDistance = 0;
          horizontalDistance = 0;
        }
        
        // Bottom-right alignment: child x = parent width - child width, y = parent height - child height
        const bottomRightX = nodeBWidth - nodeAWidth;
        const bottomRightY = nodeBHeight - nodeAHeight;
        const distanceBottomRight = Math.abs(change.position.x - bottomRightX) + Math.abs(change.position.y - bottomRightY);
        if (distanceBottomRight < distance * 2) {
          result.snapPosition.x = bottomRightX;
          result.snapPosition.y = bottomRightY;
          result.vertical = nodeBBounds.right;
          result.horizontal = nodeBBounds.bottom;
          verticalDistance = 0;
          horizontalDistance = 0;
        }
        
        // Center-center alignment: child x = (parent width - child width) / 2, y = (parent height - child height) / 2
        const centerX = (nodeBWidth - nodeAWidth) / 2;
        const centerY = (nodeBHeight - nodeAHeight) / 2;
        const distanceCenter = Math.abs(change.position.x - centerX) + Math.abs(change.position.y - centerY);
        if (distanceCenter < distance * 2) {
          result.snapPosition.x = centerX;
          result.snapPosition.y = centerY;
          result.vertical = nodeBBounds.centerX;
          result.horizontal = nodeBBounds.centerY;
          verticalDistance = 0;
          horizontalDistance = 0;
        }
        
        // Left edge alignment: child x = 0
        const distanceLeftEdge = Math.abs(change.position.x - 0);
        if (distanceLeftEdge < verticalDistance) {
          result.snapPosition.x = 0;
          result.vertical = nodeBBounds.left;
          verticalDistance = distanceLeftEdge;
        }
        
        // Right edge alignment: child x = parent width - child width
        const rightEdgeX = nodeBWidth - nodeAWidth;
        const distanceRightEdge = Math.abs(change.position.x - rightEdgeX);
        if (distanceRightEdge < verticalDistance) {
          result.snapPosition.x = rightEdgeX;
          result.vertical = nodeBBounds.right;
          verticalDistance = distanceRightEdge;
        }
        
        // Top edge alignment: child y = 0
        const distanceTopEdge = Math.abs(change.position.y - 0);
        if (distanceTopEdge < horizontalDistance) {
          result.snapPosition.y = 0;
          result.horizontal = nodeBBounds.top;
          horizontalDistance = distanceTopEdge;
        }
        
        // Bottom edge alignment: child y = parent height - child height
        const bottomEdgeY = nodeBHeight - nodeAHeight;
        const distanceBottomEdge = Math.abs(change.position.y - bottomEdgeY);
        if (distanceBottomEdge < horizontalDistance) {
          result.snapPosition.y = bottomEdgeY;
          result.horizontal = nodeBBounds.bottom;
          horizontalDistance = distanceBottomEdge;
        }
        
        // Center vertical alignment: child x = (parent width - child width) / 2
        const centerVerticalX = (nodeBWidth - nodeAWidth) / 2;
        const distanceCenterVertical = Math.abs(change.position.x - centerVerticalX);
        if (distanceCenterVertical < verticalDistance) {
          result.snapPosition.x = centerVerticalX;
          result.vertical = nodeBBounds.centerX;
          verticalDistance = distanceCenterVertical;
        }
        
        // Center horizontal alignment: child y = (parent height - child height) / 2
        const centerHorizontalY = (nodeBHeight - nodeAHeight) / 2;
        const distanceCenterHorizontal = Math.abs(change.position.y - centerHorizontalY);
        if (distanceCenterHorizontal < horizontalDistance) {
          result.snapPosition.y = centerHorizontalY;
          result.horizontal = nodeBBounds.centerY;
          horizontalDistance = distanceCenterHorizontal;
        }
        
        return result; // Skip normal alignment logic for parent-child relationships
      }
      
      if (isNodeBChildOfA) {
        // NodeB is child of NodeA - skip this comparison as we handle it when NodeB is being dragged
        return result;
      }
      
      // Handle sibling-to-sibling alignment (both nodes have the same parent)
      const areSiblings = nodeA.parentId && nodeB.parentId && nodeA.parentId === nodeB.parentId;
      
      if (areSiblings) {
        // Both nodes are children of the same parent - need to convert to absolute positions for helper lines
        const parentNode = nodes.find(node => node.id === nodeA.parentId);
        
        if (parentNode) {
          // Convert sibling B's relative position to absolute position for comparison
          const siblingBAbsoluteBounds = {
            left: parentNode.position.x + nodeB.position.x,
            right: parentNode.position.x + nodeB.position.x + nodeBWidth,
            top: parentNode.position.y + nodeB.position.y,
            bottom: parentNode.position.y + nodeB.position.y + nodeBHeight,
            centerX: parentNode.position.x + nodeB.position.x + nodeBWidth / 2,
            centerY: parentNode.position.y + nodeB.position.y + nodeBHeight / 2,
          };
          
          // Convert nodeA's relative position to absolute position for comparison
          const nodeAAbsoluteBounds = {
            left: parentNode.position.x + change.position.x,
            right: parentNode.position.x + change.position.x + nodeAWidth,
            top: parentNode.position.y + change.position.y,
            bottom: parentNode.position.y + change.position.y + nodeAHeight,
            centerX: parentNode.position.x + change.position.x + nodeAWidth / 2,
            centerY: parentNode.position.y + change.position.y + nodeAHeight / 2,
          };
          
          // Sibling alignment calculations using absolute positions
          
          // Left edges alignment
          const distanceLeftLeft = Math.abs(nodeAAbsoluteBounds.left - siblingBAbsoluteBounds.left);
          if (distanceLeftLeft < verticalDistance) {
            result.snapPosition.x = nodeB.position.x; // Keep relative position for snap
            result.vertical = siblingBAbsoluteBounds.left; // Use absolute position for helper line
            verticalDistance = distanceLeftLeft;
          }
          
          // Right edges alignment
          const distanceRightRight = Math.abs(nodeAAbsoluteBounds.right - siblingBAbsoluteBounds.right);
          if (distanceRightRight < verticalDistance) {
            result.snapPosition.x = nodeB.position.x + nodeBWidth - nodeAWidth;
            result.vertical = siblingBAbsoluteBounds.right;
            verticalDistance = distanceRightRight;
          }
          
          // Left edge to right edge alignment
          const distanceLeftRight = Math.abs(nodeAAbsoluteBounds.left - siblingBAbsoluteBounds.right);
          if (distanceLeftRight < verticalDistance) {
            result.snapPosition.x = nodeB.position.x + nodeBWidth;
            result.vertical = siblingBAbsoluteBounds.right;
            verticalDistance = distanceLeftRight;
          }
          
          // Right edge to left edge alignment
          const distanceRightLeft = Math.abs(nodeAAbsoluteBounds.right - siblingBAbsoluteBounds.left);
          if (distanceRightLeft < verticalDistance) {
            result.snapPosition.x = nodeB.position.x - nodeAWidth;
            result.vertical = siblingBAbsoluteBounds.left;
            verticalDistance = distanceRightLeft;
          }
          
          // Center vertical alignment
          const distanceCenterX = Math.abs(nodeAAbsoluteBounds.centerX - siblingBAbsoluteBounds.centerX);
          if (distanceCenterX < verticalDistance) {
            result.snapPosition.x = nodeB.position.x + nodeBWidth / 2 - nodeAWidth / 2;
            result.vertical = siblingBAbsoluteBounds.centerX;
            verticalDistance = distanceCenterX;
          }
          
          // Top edges alignment
          const distanceTopTop = Math.abs(nodeAAbsoluteBounds.top - siblingBAbsoluteBounds.top);
          if (distanceTopTop < horizontalDistance) {
            result.snapPosition.y = nodeB.position.y;
            result.horizontal = siblingBAbsoluteBounds.top;
            horizontalDistance = distanceTopTop;
          }
          
          // Bottom edges alignment
          const distanceBottomBottom = Math.abs(nodeAAbsoluteBounds.bottom - siblingBAbsoluteBounds.bottom);
          if (distanceBottomBottom < horizontalDistance) {
            result.snapPosition.y = nodeB.position.y + nodeBHeight - nodeAHeight;
            result.horizontal = siblingBAbsoluteBounds.bottom;
            horizontalDistance = distanceBottomBottom;
          }
          
          // Bottom edge to top edge alignment
          const distanceBottomTop = Math.abs(nodeAAbsoluteBounds.bottom - siblingBAbsoluteBounds.top);
          if (distanceBottomTop < horizontalDistance) {
            result.snapPosition.y = nodeB.position.y - nodeAHeight;
            result.horizontal = siblingBAbsoluteBounds.top;
            horizontalDistance = distanceBottomTop;
          }
          
          // Top edge to bottom edge alignment
          const distanceTopBottom = Math.abs(nodeAAbsoluteBounds.top - siblingBAbsoluteBounds.bottom);
          if (distanceTopBottom < horizontalDistance) {
            result.snapPosition.y = nodeB.position.y + nodeBHeight;
            result.horizontal = siblingBAbsoluteBounds.bottom;
            horizontalDistance = distanceTopBottom;
          }
          
          // Center horizontal alignment
          const distanceCenterY = Math.abs(nodeAAbsoluteBounds.centerY - siblingBAbsoluteBounds.centerY);
          if (distanceCenterY < horizontalDistance) {
            result.snapPosition.y = nodeB.position.y + nodeBHeight / 2 - nodeAHeight / 2;
            result.horizontal = siblingBAbsoluteBounds.centerY;
            horizontalDistance = distanceCenterY;
          }
        }
        
        return result; // Skip normal alignment logic for sibling relationships
      }
      
      // Normal alignment logic for non-parent-child relationships
      // Vertical alignments (left, center, right)
      
      // Left edges alignment
      const distanceLeftLeft = Math.abs(nodeABounds.left - nodeBBounds.left);
      if (distanceLeftLeft < verticalDistance) {
        result.snapPosition.x = nodeBBounds.left;
        result.vertical = nodeBBounds.left;
        verticalDistance = distanceLeftLeft;
      }
      
      // Right edges alignment
      const distanceRightRight = Math.abs(nodeABounds.right - nodeBBounds.right);
      if (distanceRightRight < verticalDistance) {
        result.snapPosition.x = nodeBBounds.right - nodeABounds.width;
        result.vertical = nodeBBounds.right;
        verticalDistance = distanceRightRight;
      }
      
      // Left edge to right edge alignment
      const distanceLeftRight = Math.abs(nodeABounds.left - nodeBBounds.right);
      if (distanceLeftRight < verticalDistance) {
        result.snapPosition.x = nodeBBounds.right;
        result.vertical = nodeBBounds.right;
        verticalDistance = distanceLeftRight;
      }
      
      // Right edge to left edge alignment
      const distanceRightLeft = Math.abs(nodeABounds.right - nodeBBounds.left);
      if (distanceRightLeft < verticalDistance) {
        result.snapPosition.x = nodeBBounds.left - nodeABounds.width;
        result.vertical = nodeBBounds.left;
        verticalDistance = distanceRightLeft;
      }
      
      // Center vertical alignment
      const distanceCenterX = Math.abs(nodeABounds.centerX - nodeBBounds.centerX);
      if (distanceCenterX < verticalDistance) {
        result.snapPosition.x = nodeBBounds.centerX - nodeABounds.width / 2;
        result.vertical = nodeBBounds.centerX;
        verticalDistance = distanceCenterX;
      }
      
      // Horizontal alignments (top, center, bottom)
      
      // Top edges alignment
      const distanceTopTop = Math.abs(nodeABounds.top - nodeBBounds.top);
      if (distanceTopTop < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.top;
        result.horizontal = nodeBBounds.top;
        horizontalDistance = distanceTopTop;
      }
      
      // Bottom edges alignment
      const distanceBottomBottom = Math.abs(nodeABounds.bottom - nodeBBounds.bottom);
      if (distanceBottomBottom < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.bottom - nodeABounds.height;
        result.horizontal = nodeBBounds.bottom;
        horizontalDistance = distanceBottomBottom;
      }
      
      // Bottom edge to top edge alignment
      const distanceBottomTop = Math.abs(nodeABounds.bottom - nodeBBounds.top);
      if (distanceBottomTop < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.top - nodeABounds.height;
        result.horizontal = nodeBBounds.top;
        horizontalDistance = distanceBottomTop;
      }
      
      // Top edge to bottom edge alignment
      const distanceTopBottom = Math.abs(nodeABounds.top - nodeBBounds.bottom);
      if (distanceTopBottom < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.bottom;
        result.horizontal = nodeBBounds.bottom;
        horizontalDistance = distanceTopBottom;
      }
      
      // Center horizontal alignment
      const distanceCenterY = Math.abs(nodeABounds.centerY - nodeBBounds.centerY);
      if (distanceCenterY < horizontalDistance) {
        result.snapPosition.y = nodeBBounds.centerY - nodeABounds.height / 2;
        result.horizontal = nodeBBounds.centerY;
        horizontalDistance = distanceCenterY;
      }
      
      return result;
    }, defaultResult);
}