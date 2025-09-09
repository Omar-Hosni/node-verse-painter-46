import { Node, Edge } from '@xyflow/react';

export interface TreeNode {
  id: string;
  reactFlowNode: Node;
  children: TreeNode[];
  parent?: TreeNode;
  isVisualChild?: boolean; // True if this is a visual-only child (connected via edge)
  realParentId?: string; // ID of the actual parent (when visual parent takes priority)
}

/**
 * Build tree structure from ReactFlow nodes and edges
 * - Explicit parentId relationships create real parent-child hierarchy
 * - Edge connections create visual-only hierarchy (for display purposes)
 * - Visual children are treated as independent nodes for zIndex calculation
 */
export const buildTreeStructure = (nodes: Node[], edges: Edge[]): TreeNode[] => {
  // Create a map of all nodes as TreeNodes
  const nodeMap = new Map<string, TreeNode>();
  
  nodes.forEach(node => {
    nodeMap.set(node.id, {
      id: node.id,
      reactFlowNode: node,
      children: [],
    });
  });

  const childrenSet = new Set<string>();
  
  // Get frame nodes for spatial hierarchy
  const frameNodes = nodes.filter(n => n.type === 'frame-node');

  // 1. Handle frame-based containment (spatial hierarchy)
  // Support both old and new frame node types (already filtered above for debug)
  
  // Removed spatial containment logic - only use explicit parentId relationships

  // 1. Handle edge-based visual hierarchy FIRST (takes priority)
  edges.forEach(edge => {
    const sourceTreeNode = nodeMap.get(edge.source);
    const targetTreeNode = nodeMap.get(edge.target);
    const sourceNode = nodes.find(n => n.id === edge.source);
    
    // Skip if source is a frame node - frames should NEVER be visual children
    if (sourceNode && (sourceNode.type === 'frame-node' || sourceNode.type === 'labeledFrameGroupNode')) {
      return;
    }
    
    if (sourceTreeNode && targetTreeNode) {
      // Target becomes visual parent of source (for display purposes only)
      targetTreeNode.children.push(sourceTreeNode);
      sourceTreeNode.parent = targetTreeNode;
      // Mark as visual-only relationship
      sourceTreeNode.isVisualChild = true;
      childrenSet.add(edge.source);
    }
  });

  // 2. Add nodes based on explicit parentId relationships as fallback
  nodes.forEach(node => {
    if (node.parentId) {
      const parentTreeNode = nodeMap.get(node.parentId);
      const childTreeNode = nodeMap.get(node.id);
      
      // Only add real parent relationship if node doesn't already have a visual parent
      if (parentTreeNode && childTreeNode && !childrenSet.has(node.id)) {
        parentTreeNode.children.push(childTreeNode);
        childTreeNode.parent = parentTreeNode;
        childrenSet.add(node.id);
        

      } else if (childrenSet.has(node.id) && childTreeNode) {
        // Node already has visual parent, but store the real parent info for display
        childTreeNode.realParentId = node.parentId;

      }
    }
  });

  // 3. Sort children within each parent by order
  const sortNodeChildren = (treeNode: TreeNode) => {
    // Sort children by order (higher order first)
    treeNode.children.sort((a, b) => {
      const orderA = a.reactFlowNode.data?.order || 0;
      const orderB = b.reactFlowNode.data?.order || 0;
      return orderB - orderA; // Higher order first
    });
    
    // Recursively sort grandchildren
    treeNode.children.forEach(child => sortNodeChildren(child));
  };

  // Apply sorting to all nodes
  Array.from(nodeMap.values()).forEach(treeNode => {
    sortNodeChildren(treeNode);
  });

  // 4. Return top-level nodes (nodes without parents)
  const topLevelNodes = Array.from(nodeMap.values())
    .filter(treeNode => !childrenSet.has(treeNode.id))
    .sort((a, b) => {
      // Sort by order if available, otherwise by creation time
      const orderA = a.reactFlowNode.data?.order || 0;
      const orderB = b.reactFlowNode.data?.order || 0;
      return orderB - orderA; // Higher order first
    });

  return topLevelNodes;
};

/**
 * Calculate zIndex values based on tree structure
 * Logic: 
 * - Parents are counted first in descending zIndex order (topmost parent gets highest zIndex)
 * - Children of each parent are counted immediately after, in reverse order with higher zIndex first
 * - Overall counting goes backwards from high numbers to ensure proper layering
 */
export const calculateZIndices = (nodes: Node[], treeStructure: TreeNode[]): Node[] => {
  const updatedNodes = [...nodes];
  const nodeMap = new Map(updatedNodes.map(node => [node.id, node]));
  
  // First, calculate total number of nodes to determine starting zIndex
  const countTotalNodes = (treeNodes: TreeNode[]): number => {
    let count = 0;
    treeNodes.forEach(node => {
      count++; // Count the parent
      count += countTotalNodes(node.children); // Count all children recursively
    });
    return count;
  };
  
  const totalNodes = countTotalNodes(treeStructure);
  let currentZIndex = totalNodes; // Start from the highest number and count down

  // Helper function to assign zIndex to a tree node and its children
  const assignZIndex = (treeNode: TreeNode): void => {
    const node = nodeMap.get(treeNode.id);
    if (!node) return;

    // FIRST: Process children (so they get higher zIndex than parent)
    // Process only REAL children (not visual children from edge connections)
    const realChildren = treeNode.children.filter(child => !child.isVisualChild);
    
    // Sort real children by their order (higher order first, then reverse for bottom-up processing)
    const sortedChildren = [...realChildren].sort((a, b) => {
      const orderA = a.reactFlowNode.data?.order || 0;
      const orderB = b.reactFlowNode.data?.order || 0;
      return orderA - orderB; // Lower order first, so when reversed, higher order comes first
    }).reverse();

    // Assign zIndex to children first (they get higher zIndex)
    sortedChildren.forEach(child => {
      assignZIndex(child);
    });

    // THEN: Assign zIndex to parent (so it gets lower zIndex than its children)
    node.zIndex = currentZIndex;
    node.data = { ...node.data, zIndex: currentZIndex };
    currentZIndex--; // Decrease for next assignment
  };

  // Get all nodes that should be treated as independent for zIndex calculation
  // This includes top-level nodes AND visual children (connected nodes)
  const independentNodes: TreeNode[] = [];
  
  // Add top-level nodes
  treeStructure.forEach(node => independentNodes.push(node));
  
  // Add visual children as independent nodes
  const addVisualChildren = (treeNode: TreeNode) => {
    treeNode.children.forEach(child => {
      if (child.isVisualChild) {
        independentNodes.push(child);
      }
      addVisualChildren(child); // Recursively check for nested visual children
    });
  };
  
  treeStructure.forEach(node => addVisualChildren(node));
  
  // Sort all independent nodes by order (higher order = visually higher = processed first for higher zIndex)
  const sortedIndependentNodes = [...independentNodes].sort((a, b) => {
    const orderA = a.reactFlowNode.data?.order || 0;
    const orderB = b.reactFlowNode.data?.order || 0;
    return orderB - orderA; // Higher order first (gets higher zIndex since we count down)
  });

  // Process each independent node and its real children only
  // Higher order nodes are processed first and get higher z-indices
  sortedIndependentNodes.forEach(node => {
    assignZIndex(node);
  });

  return updatedNodes;
};

/**
 * Reorder nodes in the tree structure
 * This will be used for drag and drop functionality
 */
export const reorderTreeNodes = (
  treeStructure: TreeNode[],
  draggedNodeId: string,
  targetNodeId: string,
  position: 'before' | 'after' | 'inside'
): TreeNode[] => {
  // Find the dragged node and remove it from its current position
  let draggedNode: TreeNode | null = null;
  
  const removeNodeFromTree = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.filter(node => {
      if (node.id === draggedNodeId) {
        draggedNode = node;
        return false;
      }
      node.children = removeNodeFromTree(node.children);
      return true;
    });
  };

  const newTreeStructure = removeNodeFromTree([...treeStructure]);
  
  if (!draggedNode) return treeStructure;

  // Find target node and insert dragged node
  const insertNode = (nodes: TreeNode[]): TreeNode[] => {
    const result: TreeNode[] = [];
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      if (node.id === targetNodeId) {
        if (position === 'before') {
          result.push(draggedNode);
          result.push(node);
        } else if (position === 'after') {
          result.push(node);
          result.push(draggedNode);
        } else if (position === 'inside') {
          // Add as child
          node.children.push(draggedNode);
          draggedNode.parent = node;
          result.push(node);
        }
      } else {
        // Recursively check children
        node.children = insertNode(node.children);
        result.push(node);
      }
    }
    
    return result;
  };

  return insertNode(newTreeStructure);
};