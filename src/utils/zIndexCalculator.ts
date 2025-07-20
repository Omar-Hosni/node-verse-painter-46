export interface TreeNode {
  id: string;
  parentId: string | null;
  children: TreeNode[];
  zIndex: number;
}

/**
 * Calculate z-indices for all nodes based on tree structure and layer order
 * Uses the new counting system: root first, then parents in reverse order with their children
 */
export function calculateZIndices(
  tree: TreeNode[], 
  layerOrder: string[]
): Record<string, number> {
  const result: Record<string, number> = {};
  let currentZIndex = 1;

  // Create a map for quick lookup of layer order positions
  const orderMap = new Map(layerOrder.map((id, index) => [id, index]));

  // Sort tree nodes by their position in layerOrder (reverse for processing)
  const sortedTree = [...tree].sort((a, b) => {
    const aOrder = orderMap.get(a.id) ?? Infinity;
    const bOrder = orderMap.get(b.id) ?? Infinity;
    return bOrder - aOrder; // Reverse order
  });

  // Function to assign z-index to a node and all its children
  function assignZIndex(node: TreeNode): void {
    // Assign z-index to the parent first
    result[node.id] = currentZIndex++;

    // Sort children in reverse order based on layerOrder
    const sortedChildren = [...node.children].sort((a, b) => {
      const aOrder = orderMap.get(a.id) ?? Infinity;
      const bOrder = orderMap.get(b.id) ?? Infinity;
      return bOrder - aOrder; // Reverse order
    });

    // Assign z-indices to all children (in reverse order) before moving to next parent
    for (const child of sortedChildren) {
      assignZIndex(child);
    }
  }

  // Process all root nodes in reverse layer order
  for (const rootNode of sortedTree) {
    assignZIndex(rootNode);
  }

  return result;
}