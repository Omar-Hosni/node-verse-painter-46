// @ts-nocheck
import { Node } from '@xyflow/react';

/**
 * Gets a node and all its children recursively
 */
export const getNodeAndChildren = (nodeId: string, nodes: Node[]): string[] => {
  const result = [nodeId];
  const children = nodes.filter(n => n.parentId === nodeId);
  
  for (const child of children) {
    result.push(...getNodeAndChildren(child.id, nodes));
  }
  
  return result;
};

/**
 * Gets the complete subtree for a node (including the node itself)
 */
export const getSubtree = (nodeId: string, nodes: Node[]): Node[] => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return [];
  
  const result = [node];
  const children = nodes.filter(n => n.parentId === nodeId);
  
  for (const child of children) {
    result.push(...getSubtree(child.id, nodes));
  }
  
  return result;
};

/**
 * Calculates a new order when dropping a node relative to another node
 */
export const calculateNewOrder = (
  referenceNode: Node, 
  nodes: Node[], 
  position: 'above' | 'below' = 'above'
): number => {
  const siblings = nodes.filter(n => 
    n.parentId === referenceNode.parentId && 
    n.id !== referenceNode.id
  );
  
  if (position === 'above') {
    // When placing above, we want a higher order than the reference node
    const nodesAbove = siblings.filter(n => (n.data?.order ?? 0) > (referenceNode.data?.order ?? 0));
    if (nodesAbove.length === 0) {
      return (referenceNode.data?.order ?? 0) + 1;
    }
    const minAbove = Math.min(...nodesAbove.map(n => n.data?.order ?? 0));
    return ((referenceNode.data?.order ?? 0) + minAbove) / 2;
  } else {
    // When placing below, we want a lower order than the reference node
    const nodesBelow = siblings.filter(n => (n.data?.order ?? 0) < (referenceNode.data?.order ?? 0));
    if (nodesBelow.length === 0) {
      return (referenceNode.data?.order ?? 0) - 1;
    }
    const maxBelow = Math.max(...nodesBelow.map(n => n.data?.order ?? 0));
    return ((referenceNode.data?.order ?? 0) + maxBelow) / 2;
  }
};

/**
 * Validates node orders and fixes duplicates
 */
export const validateAndFixNodeOrders = (nodes: Node[]): Node[] => {
  const orders = nodes.map(n => n.data?.order ?? 0);
  const uniqueOrders = new Set(orders);
  
  if (uniqueOrders.size === orders.length) {
    return nodes; // No duplicates found
  }
  
  // Fix duplicates by reassigning orders
  const sortedNodes = [...nodes].sort((a, b) => (a.data?.order ?? 0) - (b.data?.order ?? 0));
  
  return sortedNodes.map((node, index) => ({
    ...node,
    data: {
      ...node.data,
      order: index
    }
  }));
};