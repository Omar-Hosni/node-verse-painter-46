import React, { useState, useEffect, useMemo } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Node } from '@xyflow/react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayerTreeNode } from './LayerTreeNode';
import { TreeNode, buildTreeStructure, calculateZIndices } from '@/utils/layerTreeUtils';
import { ensureParentChildOrder } from '@/utils/nodeOrderUtils';

export const LayerPanel = () => {
  const { nodes, edges, onNodesChange } = useCanvasStore();
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Build tree structure from nodes and edges
  const treeStructure = useMemo(() => {
    return buildTreeStructure(nodes, edges);
  }, [nodes, edges]);

  // Calculate and apply zIndex values based on tree structure
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const updatedNodes = calculateZIndices(nodes, treeStructure);
    
    // Only update if zIndex values have actually changed
    const hasChanges = updatedNodes.some(updatedNode => {
      const originalNode = nodes.find(n => n.id === updatedNode.id);
      return originalNode && originalNode.zIndex !== updatedNode.zIndex;
    });
    
    if (hasChanges) {
      // Ensure parent nodes come before child nodes in the array (ReactFlow requirement)
      const reorderedNodes = ensureParentChildOrder(updatedNodes);
      
      const nodeChanges = reorderedNodes.map(node => ({
        id: node.id,
        type: 'replace' as const,
        item: node
      }));
      onNodesChange(nodeChanges);
    }
  }, [treeStructure]);

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const handleReorder = (draggedNodeId: string, targetNodeId: string, position: 'before' | 'after' | 'inside') => {
    if (draggedNodeId === targetNodeId) return;

    try {
      const updatedNodes = [...nodes];
      const draggedNode = updatedNodes.find(n => n.id === draggedNodeId);
      const targetNode = updatedNodes.find(n => n.id === targetNodeId);
      
      if (!draggedNode || !targetNode) {
        console.warn('Could not find dragged or target node:', { draggedNodeId, targetNodeId });
        return;
      }

      // Handle parent-child relationship and position changes
      let newParentId: string | undefined = undefined;
      let newPosition = { ...draggedNode.position };
      
      // Debug logging
      console.log(`Reordering: ${draggedNodeId} ${position} ${targetNodeId}`, {
        draggedParent: draggedNode.parentId,
        targetParent: targetNode.parentId,
        isChildOfTarget: draggedNode.parentId === targetNodeId,
        targetType: targetNode.type
      });

      if (position === 'inside') {
        // Node becomes child of target
        if (targetNode.type === 'frame-node') {
          newParentId = targetNodeId;
          
          // If moving from absolute to relative positioning
          if (!draggedNode.parentId) {
            // Convert absolute position to relative position within the frame
            const relativeX = draggedNode.position.x - targetNode.position.x;
            const relativeY = draggedNode.position.y - targetNode.position.y;
            
            // Ensure the node stays within frame bounds
            const frameWidth = (targetNode.data as any)?.width || 400;
            const frameHeight = (targetNode.data as any)?.height || 300;
            newPosition = {
              x: Math.max(10, Math.min(relativeX, frameWidth - 110)),
              y: Math.max(10, Math.min(relativeY, frameHeight - 60))
            };
          }
        }
      } else {
        // Special case: Child node dragged before/after its own parent frame
        if (draggedNode.parentId && draggedNode.parentId === targetNodeId) {
          // Child is being dragged relative to its parent frame - detach from parent
          newParentId = targetNode.parentId; // Become sibling of the parent frame (or top-level if parent has no parent)
          
          // Convert relative position to absolute position (detaching from frame)
          const currentParent = updatedNodes.find(n => n.id === draggedNode.parentId);
          if (currentParent) {
            newPosition = {
              x: draggedNode.position.x + currentParent.position.x,
              y: draggedNode.position.y + currentParent.position.y
            };
          }
          
          console.log(`🔥 DETACHING: Child ${draggedNodeId} from parent frame ${targetNodeId}`, {
            oldParent: draggedNode.parentId,
            newParent: newParentId,
            position: position,
            newPosition
          });
        } else {
          // Normal case: Node becomes sibling of target (same parent as target)
          newParentId = targetNode.parentId;
          
          // Handle position conversion based on parent change
          if (draggedNode.parentId && !newParentId) {
            // Node is moving from inside a frame to top level
            const currentParent = updatedNodes.find(n => n.id === draggedNode.parentId);
            if (currentParent) {
              // Convert relative position to absolute position
              newPosition = {
                x: draggedNode.position.x + currentParent.position.x,
                y: draggedNode.position.y + currentParent.position.y
              };
            }
          } else if (!draggedNode.parentId && newParentId) {
            // Node is moving from top level into a frame (as sibling of target)
            const newParent = updatedNodes.find(n => n.id === newParentId);
            if (newParent) {
              // Convert absolute position to relative position
              newPosition = {
                x: draggedNode.position.x - newParent.position.x,
                y: draggedNode.position.y - newParent.position.y
              };
            }
          }
        }
      }

      // Update the dragged node with new parent and position
      const draggedIndex = updatedNodes.findIndex(n => n.id === draggedNodeId);
      updatedNodes[draggedIndex] = {
        ...draggedNode,
        parentId: newParentId,
        extent: undefined, // Always undefined to allow free movement
        position: newPosition,
      };

      // Comprehensive order calculation that handles all scenarios
      let newOrder = draggedNode.data?.order || 0;
      const targetOrder = (targetNode.data?.order as number) || 0;
      
      if (position === 'inside') {
        // Node becomes child of target frame
        newOrder = targetOrder + 1;
      } else {
        // Node becomes sibling of target (before/after)
        // Get all siblings in the target parent context (excluding the dragged node)
        const siblings = updatedNodes.filter(n => 
          n.parentId === newParentId && n.id !== draggedNodeId
        ).sort((a, b) => ((b.data?.order as number) || 0) - ((a.data?.order as number) || 0));
        
        const targetIndex = siblings.findIndex(n => n.id === targetNodeId);
        
        if (position === 'before') {
          // Should appear before target (higher order)
          if (targetIndex >= 0) {
            const nextSibling = siblings[targetIndex - 1]; // Node that comes before target in the list
            if (nextSibling) {
              // Insert between target and next sibling
              const nextOrder = (nextSibling.data?.order as number) || 0;
              newOrder = (targetOrder + nextOrder) / 2;
            } else {
              // No next sibling, insert before target
              newOrder = targetOrder + 1;
            }
          } else {
            // Fallback
            newOrder = targetOrder + 1;
          }
        } else { // after
          // Should appear after target (lower order)
          if (targetIndex >= 0) {
            const prevSibling = siblings[targetIndex + 1]; // Node that comes after target in the list
            if (prevSibling) {
              // Insert between target and previous sibling
              const prevOrder = (prevSibling.data?.order as number) || 0;
              newOrder = (targetOrder + prevOrder) / 2;
            } else {
              // No previous sibling, insert after target
              newOrder = targetOrder - 1;
            }
          } else {
            // Fallback
            newOrder = targetOrder - 1;
          }
        }
      }

      // Update the dragged node's order
      updatedNodes[draggedIndex].data = {
        ...updatedNodes[draggedIndex].data,
        order: newOrder
      };

      // Ensure parent nodes come before child nodes in the array (ReactFlow requirement)
      const reorderedNodes = ensureParentChildOrder(updatedNodes);

      // Apply changes
      const nodeChanges = reorderedNodes.map(node => ({
        id: node.id,
        type: 'replace' as const,
        item: node
      }));
      
      console.log(`Final result for ${draggedNodeId}:`, {
        oldParent: draggedNode.parentId,
        newParent: newParentId,
        newOrder,
        parentChanged: draggedNode.parentId !== newParentId
      });
      
      onNodesChange(nodeChanges);
    } catch (error) {
      console.error('Error in handleReorder:', error);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div>
            {treeStructure.map(node => (
              <LayerTreeNode
                key={node.id}
                node={node}
                level={0}
                isExpanded={expandedNodes[node.id] !== false}
                onToggleExpanded={toggleNodeExpanded}
                onReorder={handleReorder}
              />
            ))}
          </div>
        </ScrollArea>
    </div>
  );
};