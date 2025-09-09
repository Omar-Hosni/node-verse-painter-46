import { Node } from '@xyflow/react';

/**
 * Utility function to ensure parent nodes come before child nodes in the array.
 * This is required by ReactFlow for parent-child relationships to work properly.
 * 
 * ReactFlow throws an error if a child node appears before its parent in the nodes array:
 * "Parent node [id] not found. Please make sure that parent nodes are in front of their child nodes in the nodes array."
 * 
 * @param nodes - Array of ReactFlow nodes
 * @returns Reordered array with parents before children
 */
export const ensureParentChildOrder = (nodes: Node[]): Node[] => {
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const visited = new Set<string>();
  const result: Node[] = [];

  // Recursive function to add a node and all its ancestors first
  const addNodeWithAncestors = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    
    const node = nodeMap.get(nodeId);
    if (!node) return;

    // If this node has a parent, add the parent first
    if (node.parentId && nodeMap.has(node.parentId)) {
      addNodeWithAncestors(node.parentId);
    }

    // Add this node if not already added
    if (!visited.has(nodeId)) {
      visited.add(nodeId);
      result.push(node);
    }
  };

  // Process all nodes, ensuring parents come before children
  nodes.forEach(node => {
    addNodeWithAncestors(node.id);
  });

  return result;
};