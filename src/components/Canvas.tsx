import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  useReactFlow,
  Connection,
  SelectionMode,
  Node,
  NodeChange,
  PanOnScrollMode
} from '@xyflow/react';

import { useCanvasStore } from '@/store/useCanvasStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { NodeData, EdgeData } from '@/store/types';
import { RectangleTool } from './tools/RectangleTool';
import { CircleTool } from './tools/CircleTool';
import { StarTool } from './tools/StarTool';
import { FrameTool } from './tools/FrameTool';
import { PreviewNode } from './nodes/PreviewNode';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { getRunwareService } from '@/services/runwareService';
import NormalNode from './nodes/NormalNode';
import FrameNode from './nodes/FrameNode';
import TextNode from './nodes/TextNode';
import ImageNode from './nodes/ImageNode';
import RectangleNode from './nodes/RectangleNode';
import CircleNode from './nodes/CircleNode';
import StarNode from './nodes/StarNode';
import isValidConnection from '@/utils/connectionUtils';
import { getHelperLines } from '@/utils/helperLinesUtils';
import HelperLines from './HelperLines';
import ContextMenu from './ContextMenu';
import CanvasContextMenu from './CanvasContextMenu';
import CustomEdge from './edges/CustomEdge';
import ReSceneTagMenu from './ReSceneTagMenu';
import { ensureParentChildOrder } from '@/utils/nodeOrderUtils';

import '@xyflow/react/dist/style.css';

// Custom CSS to disable drag animations but preserve positioning
const dragOptimizationStyles = `
  .react-flow__node {
    transition: none !important;
  }
  
  .react-flow__node.dragging {
    transition: none !important;
  }
  
  .react-flow__node-default {
    transition: none !important;
  }
  
  .react-flow__handle {
    transition: none !important;
  }
  
  .react-flow__edge {
    transition: none !important;
  }
`;

// Inject the styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = dragOptimizationStyles;
  document.head.appendChild(styleElement);
}

const nodeTypes: NodeTypes = {
  output: PreviewNode,          // ✅ add this
  previewNode: PreviewNode,
  'normal-node': NormalNode,
  'preview-realtime-node': PreviewNode,
  'frame-node': FrameNode as any,
  'text-node': TextNode as any,
  'image-node': ImageNode as any,
  'rectangle-node': RectangleNode as any,
  'circle-node': CircleNode as any,
  'star-node': StarNode as any
};

const edgeTypes: EdgeTypes = {
  default: CustomEdge,
  custom: CustomEdge,
};

interface CanvasProps {
  onCanvasClick?: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({ onCanvasClick }) => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
    setSelectedEdge,
    copySelectedNode,
    pasteNodes,
    cutSelectedNode,
    deleteSelectedNode,
    undo,
    redo,
    credits,
    fetchUserCredits,
    useCreditsForGeneration,
    sendWorkflowToAPI,
    exportWorkflowAsJson,
    activeTool,
    setActiveTool,
    runwareApiKey, // Add API key from store
  } = useCanvasStore();

  const reactFlowInstance = useReactFlow();
  
  // Get workflow store for cache hydration and connection handling
  const { hydrateProcessedImagesFromNodes, initializeServices, connectionHandler, updateImageCaptionCallbacks } = useWorkflowStore();

  // Hydrate preprocessed image cache on component mount to prevent reprocessing on reload
  useEffect(() => {
    // Small delay to ensure nodes are loaded
    const timer = setTimeout(() => {
      hydrateProcessedImagesFromNodes();
      console.log('Canvas: Hydrated preprocessed images cache on mount');
    }, 100);
    
    return () => clearTimeout(timer);
  }, []); // Run once on mount

  // Update image caption trigger with Canvas store's updateNodeData
  useEffect(() => {
    if (updateImageCaptionCallbacks) {
      updateImageCaptionCallbacks((nodeId: string, data: any) => {
        // Use Canvas store's updateNodeData to properly persist data
        const currentNodes = reactFlowInstance.getNodes();
        const targetNode = currentNodes.find(n => n.id === nodeId);
        if (targetNode) {
          const updatedNode = {
            ...targetNode,
            data: {
              ...targetNode.data,
              ...data
            }
          };
          reactFlowInstance.setNodes(currentNodes.map(n => n.id === nodeId ? updatedNode : n));
        }
      });
    }
  }, [updateImageCaptionCallbacks, reactFlowInstance]);

  // Helper lines state
  const [helperLineHorizontal, setHelperLineHorizontal] = useState<number | undefined>(undefined);
  const [helperLineVertical, setHelperLineVertical] = useState<number | undefined>(undefined);

  // Initialize runware services with API key
  useEffect(() => {
    if (runwareApiKey) {
      initializeServices(runwareApiKey);
    }
  }, [runwareApiKey, initializeServices]);


  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    id: string;
    top: number;
    left: number;
    right?: number;
    bottom?: number;
  } | null>(null);

  // Canvas context menu state
  const [canvasContextMenu, setCanvasContextMenu] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Re-scene tag menu state
  const [reSceneTagMenu, setReSceneTagMenu] = useState<{
    edgeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    position: { x: number; y: number };
    currentTag: 'object' | 'scene';
  } | null>(null);

  // Mouse position tracking for tag menu positioning
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Custom onNodesChange handler with helper lines logic
  const updateHelperLines = useCallback(
    (changes: NodeChange[], nodes: Node[]) => {
      // reset the helper lines (clear existing lines, if any)
      setHelperLineHorizontal(undefined);
      setHelperLineVertical(undefined);

      // this will be true if it's a single node being dragged
      // inside we calculate the helper lines and snap position for the position where the node is being moved to
      if (
        changes.length === 1 &&
        changes[0].type === 'position' &&
        changes[0].dragging &&
        changes[0].position
      ) {
        // Get current zoom level and calculate zoom-relative distance
        const currentZoom = reactFlowInstance.getZoom();
        const zoomRelativeDistance = 5 / currentZoom;

        const helperLines = getHelperLines(changes[0], nodes, zoomRelativeDistance);

        // if we have a helper line, we snap the node to the helper line position
        // this is being done by manipulating the node position inside the change object
        changes[0].position.x =
          helperLines.snapPosition.x ?? changes[0].position.x;
        changes[0].position.y =
          helperLines.snapPosition.y ?? changes[0].position.y;

        // if helper lines are returned, we set them so that they can be displayed
        setHelperLineHorizontal(helperLines.horizontal);
        setHelperLineVertical(helperLines.vertical);
      }

      return changes;
    },
    [reactFlowInstance]
  );



  // Function to clean up orphaned nodes (nodes with invalid parent references)
  const cleanupOrphanedNodes = useCallback((nodes: Node[]) => {
    const frameNodes = nodes.filter(node => node.type === 'frame-node');
    const frameIds = new Set(frameNodes.map(f => f.id));
    let hasOrphans = false;

    const cleanedNodes = nodes.map(node => {
      // Skip frame nodes
      if (node.type === 'frame-node') return node;

      // Check if node has a parent that doesn't exist
      if (node.parentId && !frameIds.has(node.parentId)) {
        console.warn(`Found orphaned node ${node.id} with invalid parent ${node.parentId}. Making it independent.`);
        hasOrphans = true;

        return {
          ...node,
          parentId: undefined,
          extent: undefined
        };
      }

      return node;
    });

    if (hasOrphans) {
      console.log('Cleaned up orphaned nodes');
      return cleanedNodes;
    }

    return nodes;
  }, []);

  // Frame relationship management with actual drop positions
  const updateFrameRelationships = useCallback((nodeChanges?: NodeChange[]) => {
    const currentNodes = reactFlowInstance.getNodes();
    const frameNodes = currentNodes.filter(node => node.type === 'frame-node');

    // Create a map of actual drop positions from the changes
    const dropPositions = new Map();
    if (nodeChanges) {
      nodeChanges.forEach(change => {
        if (change.type === 'position' && change.position && !change.dragging) {
          dropPositions.set(change.id, change.position);
        }
      });
    }

    let hasChanges = false;
    const updatedNodes = currentNodes.map(node => {
      if (node.type === 'frame-node') return node;

      const currentParent = node.parentId;
      const wasDropped = dropPositions.has(node.id);

      // Only check for new parent-child relationships if the node was actually dropped
      // This prevents existing relationships from being broken when frames are moved
      let newParent = currentParent;

      if (wasDropped && !currentParent) {
        // Only allow NEW parent-child relationships for independent nodes
        // Do NOT break existing relationships when dragging outside frame boundaries
        const containingFrame = frameNodes.find(frame => {
          const frameLeft = frame.position.x;
          const frameTop = frame.position.y;
          const frameWidth = (frame.data?.width as number) || 400;
          const frameHeight = (frame.data?.height as number) || 300;
          const frameRight = frameLeft + frameWidth;
          const frameBottom = frameTop + frameHeight;

          // Use actual drop position for overlap detection
          let actualPosition = dropPositions.get(node.id)!;

          const nodeLeft = actualPosition.x;
          const nodeTop = actualPosition.y;
          const nodeWidth = node.measured?.width || 100;
          const nodeHeight = node.measured?.height || 50;
          const nodeRight = nodeLeft + nodeWidth;
          const nodeBottom = nodeTop + nodeHeight;

          // Check if node is mostly inside frame (at least 50% overlap)
          const overlapLeft = Math.max(frameLeft, nodeLeft);
          const overlapTop = Math.max(frameTop, nodeTop);
          const overlapRight = Math.min(frameRight, nodeRight);
          const overlapBottom = Math.min(frameBottom, nodeBottom);

          const overlapWidth = Math.max(0, overlapRight - overlapLeft);
          const overlapHeight = Math.max(0, overlapBottom - overlapTop);
          const overlapArea = overlapWidth * overlapHeight;
          const nodeArea = nodeWidth * nodeHeight;

          return overlapArea > (nodeArea * 0.5); // 50% overlap threshold
        });

        newParent = containingFrame?.id || null;
      }

      if (currentParent !== newParent) {
        hasChanges = true;

        // Calculate position based on the relationship change
        const actualPosition = dropPositions.get(node.id) || node.position;
        let newPosition = actualPosition;

        if (newParent && wasDropped) {
          // Node is becoming a child - calculate relative position
          const containingFrame = frameNodes.find(f => f.id === newParent);
          if (containingFrame) {
            const relativeX = actualPosition.x - containingFrame.position.x;
            const relativeY = actualPosition.y - containingFrame.position.y;
            newPosition = {
              x: relativeX,
              y: relativeY
            };
            console.log(`Node ${node.id} becoming child of frame ${newParent}:`, {
              actualDropPosition: actualPosition,
              framePosition: containingFrame.position,
              newRelative: newPosition
            });
          }
        } else if (!newParent && currentParent && wasDropped) {
          // Node is becoming independent - convert to absolute position
          const parentFrame = frameNodes.find(f => f.id === currentParent);
          if (parentFrame) {
            newPosition = {
              x: actualPosition.x + parentFrame.position.x,
              y: actualPosition.y + parentFrame.position.y
            };
            console.log(`Node ${node.id} becoming independent from frame ${currentParent}:`, {
              nodeRelative: actualPosition,
              framePosition: parentFrame.position,
              newAbsolute: newPosition
            });
          }
        }

        return {
          ...node,
          parentId: newParent,
          extent: undefined, // Always undefined to allow free movement
          position: newPosition,
          draggable: true
        };
      }

      return node;
    });

    if (hasChanges) {
      // Clean up any orphaned nodes before updating
      const cleanedNodes = cleanupOrphanedNodes(updatedNodes);

      // Ensure parent nodes come before child nodes in the array (ReactFlow requirement)
      const reorderedNodes = ensureParentChildOrder(cleanedNodes);

      // Force React Flow to update by using the functional form
      reactFlowInstance.setNodes((nodes) => {
        return reorderedNodes;
      });
    }
  }, [reactFlowInstance]);

  // Custom onNodesChange that integrates with helper lines and frame relationships
  const handleNodesChangeWithHelperLines = useCallback(
    (changes: NodeChange[]) => {
      // Get current nodes from React Flow instance to ensure we have the latest positions
      const currentNodes = reactFlowInstance.getNodes();

      // Check if this is a resize operation (dimensions change)
      const isResizeOperation = changes.some(change => 
        change.type === 'dimensions' || 
        (change.type === 'position' && changes.some(c => c.type === 'dimensions'))
      );

      let updatedChanges = changes;

      // Only apply helper lines for drag operations, not resize operations
      if (!isResizeOperation) {
        updatedChanges = updateHelperLines(changes, currentNodes);
      }

      // Apply the changes through the store
      onNodesChange(updatedChanges);

      // Only update frame relationships when dragging is complete (not during active drag or resize)
      const hasPositionChanges = changes.some(change =>
        change.type === 'position' && !change.dragging
      );
      if (hasPositionChanges && !isResizeOperation) {
        // Pass the actual changes to get the real drop positions
        setTimeout(() => updateFrameRelationships(updatedChanges), 10);
      }
    },
    [onNodesChange, reactFlowInstance, updateHelperLines, updateFrameRelationships]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check if an input or textarea element is focused
    if (document.activeElement && (
      document.activeElement.tagName === 'INPUT' ||
      document.activeElement.tagName === 'TEXTAREA'
    )) {
      return; // Skip shortcuts when an input field is focused
    }

    const { key, ctrlKey, metaKey } = event;
    const cmdOrCtrl = metaKey || ctrlKey;

    if (cmdOrCtrl) {
      switch (key.toLowerCase()) {
        case 'c': // Copy
          event.preventDefault();
          copySelectedNode();
          toast.info('Node copied to clipboard');
          break;
        case 'x': // Cut
          event.preventDefault();
          cutSelectedNode();
          toast.info('Node cut to clipboard');
          break;
        case 'v': // Paste
          event.preventDefault();
          // Paste at viewport center for keyboard shortcut (more predictable than stale mouse position)
          if (reactFlowInstance) {
            // Get the center of the current viewport
            const viewportCenter = {
              x: window.innerWidth / 2,
              y: window.innerHeight / 2
            };

            const flowPosition = reactFlowInstance.screenToFlowPosition(viewportCenter);
            pasteNodes(flowPosition);
            toast.info('Node pasted from clipboard');
          }
          break;
        case 'z': // Undo
          event.preventDefault();
          if (event.shiftKey) {
            redo(); // Ctrl+Shift+Z or Cmd+Shift+Z for Redo
            toast.info('Redo action');
          } else {
            undo(); // Ctrl+Z or Cmd+Z for Undo
            toast.info('Undo action');
          }
          break;
        case 'y': // Redo (alternative)
          event.preventDefault();
          redo();
          toast.info('Redo action');
          break;
      }
    } else if (key === 'Delete' || key === 'Backspace') {
      // Only handle Delete/Backspace when not in an input field
      deleteSelectedNode();
      toast.info('Node deleted');
    }
  }, [copySelectedNode, pasteNodes, cutSelectedNode, deleteSelectedNode, undo, redo, reactFlowInstance]);

  // Register and unregister keyboard event handlers
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Periodic cleanup to catch orphaned nodes
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      if (reactFlowInstance) {
        const currentNodes = reactFlowInstance.getNodes();
        const cleanedNodes = cleanupOrphanedNodes(currentNodes);

        // Only update if there were orphaned nodes
        if (cleanedNodes !== currentNodes) {
          reactFlowInstance.setNodes(cleanedNodes);
        }
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(cleanupInterval);
  }, [reactFlowInstance, cleanupOrphanedNodes]);

  // File drop handlers for image drag and drop
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error('Please drop image files only');
      return;
    }

    // Get drop position relative to the canvas
    const reactFlowBounds = event.currentTarget.getBoundingClientRect();
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    // Process each image file
    for (let index = 0; index < imageFiles.length; index++) {
      const file = imageFiles[index];
      const nodeId = `image-${Date.now()}-${index}`;
      
      try {
        // Show upload progress
        toast.loading(`Uploading ${file.name} to Runware...`, { 
          id: `upload-${nodeId}`,
          duration: 30000 // 30 second timeout
        });

        // Read file as data URL for immediate display
        const reader = new FileReader();
        const imageUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        // Get image dimensions
        const img = new Image();
        const { finalWidth, finalHeight } = await new Promise<{finalWidth: number, finalHeight: number}>((resolve) => {
          img.onload = () => {
            // Calculate dimensions with max 1024px while preserving aspect ratio
            const maxSize = 1024;
            let { width: imgWidth, height: imgHeight } = img;

            // If both dimensions are within max size, use original dimensions
            if (imgWidth <= maxSize && imgHeight <= maxSize) {
              // Keep original size
            } else {
              // Scale down while preserving aspect ratio
              const aspectRatio = imgWidth / imgHeight;

              if (imgWidth > imgHeight) {
                // Landscape: limit by width
                imgWidth = maxSize;
                imgHeight = maxSize / aspectRatio;
              } else {
                // Portrait or square: limit by height
                imgHeight = maxSize;
                imgWidth = maxSize * aspectRatio;
              }
            }

            // Round to nearest 0.5px for clean dimensions
            const finalWidth = Math.round(imgWidth * 2) / 2;
            const finalHeight = Math.round(imgHeight * 2) / 2;
            resolve({ finalWidth, finalHeight });
          };
          img.src = imageUrl;
        });

        // Create a new image node with temporary data
        const newNode = {
          id: nodeId,
          type: 'image-node',
          position: {
            x: position.x + (index * 20), // Offset multiple images
            y: position.y + (index * 20)
          },
          data: {
            displayName: file.name,
            width: finalWidth,
            height: finalHeight,
            functionality: 'input',
            type: 'image-layer',
            imageFile: file, // Store the File object for upload
            isUploading: true, // Mark as uploading
            right_sidebar: {
              pin: false,
              visibility: true,
              opacity: 100,
              blendMode: 'normal',
              imageUrl: imageUrl, // Use data URL for immediate display
              imageName: file.name
            }
          }
        };

        // Add the node to the canvas immediately
        reactFlowInstance.addNodes([newNode]);

        // Upload to Runware in the background
        try {
          console.log(`📤 Uploading ${file.name} to Runware...`);
          
          // Check if API key is available
          if (!runwareApiKey) {
            throw new Error('Runware API key not set. Please set your API key in settings.');
          }
          const runwareService = getRunwareService(runwareApiKey);
          const uploadedUrl = await runwareService.uploadImageForURL(file);
          console.log(`✅ Successfully uploaded ${file.name}:`, uploadedUrl);

          // Update the node with the Runware URL
          const currentNodes = reactFlowInstance.getNodes();
          const updatedNodes = currentNodes.map(node => {
            if (node.id === nodeId) {
              const nodeData = node.data as NodeData;
              return {
                ...node,
                data: {
                  ...nodeData,
                  imageUrl: uploadedUrl, // Use Runware URL
                  runwareImageUrl: uploadedUrl, // Store Runware URL separately
                  isUploading: false,
                  right_sidebar: {
                    ...(nodeData.right_sidebar || {}),
                    imageUrl: uploadedUrl // Update right sidebar as well
                  }
                } as NodeData
              };
            }
            return node;
          });
          reactFlowInstance.setNodes(updatedNodes);

          // Dismiss loading toast and show success
          toast.dismiss(`upload-${nodeId}`);
          toast.success(`${file.name} uploaded and ready for ControlNet! (${finalWidth}×${finalHeight})`);
        } catch (uploadError) {
          console.error(`❌ Failed to upload ${file.name}:`, uploadError);
          
          // Update node to show upload failed
          const currentNodes = reactFlowInstance.getNodes();
          const updatedNodes = currentNodes.map(node => {
            if (node.id === nodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  isUploading: false,
                  uploadError: true
                }
              };
            }
            return node;
          });
          reactFlowInstance.setNodes(updatedNodes);

          // Dismiss loading toast and show specific error
          toast.dismiss(`upload-${nodeId}`);
          
          // Provide specific error message based on error type
          let errorMessage = `Failed to upload ${file.name}.`;
          if (uploadError instanceof Error) {
            if (uploadError.message.includes('API key')) {
              errorMessage = 'Upload failed: API key not configured. Please set your Runware API key in settings.';
            } else if (uploadError.message.includes('Authentication')) {
              errorMessage = 'Upload failed: Invalid API key. Please check your Runware API key in settings.';
            } else if (uploadError.message.includes('Network') || uploadError.message.includes('Connection')) {
              errorMessage = 'Upload failed: Network error. Please check your connection and try again.';
            } else if (uploadError.message.includes('timeout')) {
              errorMessage = 'Upload failed: Request timed out. Please try again with a smaller image.';
            } else {
              errorMessage = `Upload failed: ${uploadError.message}`;
            }
          }
          
          toast.error(`${errorMessage} You can still use the image locally, but ControlNet preprocessing may not work.`);
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        toast.dismiss(`upload-${nodeId}`);
        toast.error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, [reactFlowInstance]);


  // Handle re-scene tag selection
  const handleReSceneTagSelect = useCallback((tag: 'object' | 'scene') => {
    if (reSceneTagMenu && reactFlowInstance) {
      try {
        const currentEdges = reactFlowInstance.getEdges();
        const currentNodes = reactFlowInstance.getNodes();

        // Check for duplicate tags on the same rescene node
        const targetNodeConnections = currentEdges.filter(edge =>
          edge.target === reSceneTagMenu.targetNodeId &&
          edge.id !== reSceneTagMenu.edgeId &&
          currentNodes.find(n => n.id === edge.source)?.type === 'image-node' &&
          edge.data?.tag === tag
        );

        if (targetNodeConnections.length > 0) {
          toast.error(`Re-scene node already has an image tagged as "${tag}". Each image must have a unique tag.`);
          return;
        }

        // Find and update the edge
        const edgeToUpdate = currentEdges.find(edge => edge.id === reSceneTagMenu.edgeId);

        if (edgeToUpdate) {
          const updatedEdges = currentEdges.map(edge =>
            edge.id === reSceneTagMenu.edgeId
              ? { ...edge, data: { ...edge.data, tag } }
              : edge
          );

          reactFlowInstance.setEdges(updatedEdges);
        }
      } catch (error) {
        console.error('Error updating edge tag:', error);
      }
    }
  }, [reSceneTagMenu, reactFlowInstance]);

  // Handle clicking on an edge tag to reopen the menu
  const handleTagClick = useCallback((edgeId: string, position: { x: number; y: number }) => {
    const currentEdges = reactFlowInstance.getEdges();
    const clickedEdge = currentEdges.find(edge => edge.id === edgeId);

    if (clickedEdge) {
      setReSceneTagMenu({
        edgeId: clickedEdge.id,
        sourceNodeId: clickedEdge.source,
        targetNodeId: clickedEdge.target,
        position: position,
        currentTag: (clickedEdge.data as EdgeData)?.tag || 'object'
      });
    }
  }, [reactFlowInstance]);

  // Listen for edge tag click events
  useEffect(() => {
    const handleEdgeTagClick = (event: CustomEvent) => {
      const { edgeId, position } = event.detail;
      handleTagClick(edgeId, position);
    };

    window.addEventListener('edgeTagClick', handleEdgeTagClick as EventListener);
    return () => {
      window.removeEventListener('edgeTagClick', handleEdgeTagClick as EventListener);
    };
  }, [handleTagClick]);

  const isSelectTool = activeTool === 'select';
  const isHandTool = activeTool === 'hand';

  console.log(nodes)
  return (
    <div
      className="flex-1 h-screen bg-[#121212] relative transition-all duration-200"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        selectionOnDrag={isSelectTool}
        nodesDraggable={isSelectTool}
        panOnDrag={isHandTool ? true : [1, 2]}
        
        /* trackpad/touchpad friendliness */
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        panOnScrollSpeed={0.7}   // tweak 0.4–1.0 to taste
        zoomOnPinch
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        onNodesChange={handleNodesChangeWithHelperLines}
        onEdgesChange={onEdgesChange}
        onConnect={(connection: Connection) => {
          const currentNodes = reactFlowInstance.getNodes();
          const currentEdges = reactFlowInstance.getEdges();

          if (isValidConnection(connection, currentNodes, currentEdges)) {
            // Handle image to re-scene connections - VALIDATE FIRST
            const sourceNode = currentNodes.find(n => n.id === connection.source);
            const targetNode = currentNodes.find(n => n.id === connection.target);

            const isImageToReScene = sourceNode?.type === 'image-node' &&
              (targetNode?.type === 'image-to-image-re-scene' ||
                targetNode?.type?.toLowerCase().includes('rescene') ||
                targetNode?.type?.toLowerCase().includes('re-scene') ||
                targetNode?.id?.toLowerCase().includes('rescene') ||
                targetNode?.id?.toLowerCase().includes('re-scene'));

            if (isImageToReScene) {
              // Validate re-scene connection rules
              const existingImageConnections = currentEdges.filter(edge =>
                edge.target === connection.target &&
                currentNodes.find(n => n.id === edge.source)?.type === 'image-node'
              );

              // Rule 1: Maximum 2 images per rescene node
              if (existingImageConnections.length >= 2) {
                toast.error('Re-scene node can only accept maximum 2 images');
                return; // Don't create the connection
              }
            }

            // Create the connection
            onConnect(connection);

            // Trigger connection handler for preprocessing/captioning
            if (connectionHandler && connection.source && connection.target) {
              const connectionEvent = {
                source: connection.source,
                target: connection.target,
                sourceHandle: connection.sourceHandle,
                targetHandle: connection.targetHandle,
              };

              // Use setTimeout to ensure the edge is added before processing
              setTimeout(async () => {
                try {
                  // await connectionHandler.handleNewConnection({
                  //   source: connection.source || '',
                  //   target: connection.target || '',
                  //   sourceHandle: connection.sourceHandle || '',
                  //   targetHandle: connection.targetHandle || '',
                  //   connectionType: 'new'
                  // }, currentNodes);
                } catch (error) {
                  console.error('Error handling connection:', error);
                }
              }, 100);
            }

            // Handle layer-image to control-net connections
            const control_net_options = ['edge', 'depth', 'normal', 'segment'];
            const isConnectionTargetAControlNet = control_net_options.some(o => connection.target?.includes(o));

            if (isConnectionTargetAControlNet && (connection.source?.includes('layer-image') || connection.source?.includes('preview'))) {
              // const imageInputValue = localStorage.getItem(`layer-image-${connection.source}`);
              
              const wf = useWorkflowStore.getState();
              const srcNode = currentNodes.find(n => n.id === connection.source);
              const cached = wf.getProcessedImage(connection.source || '');
              const imageInputValue = cached ||
              (srcNode?.data as any)?.imageUrl ||
              (srcNode?.data as any)?.generatedImage ||
              localStorage.getItem(`layer-image-${connection.source}`);

              const targetNode = currentNodes.find((n) => n.id === connection.target);

              if (targetNode && imageInputValue !== null) {
                const updatedNodes = currentNodes.map((node) => {
                  if (node.id === targetNode.id) {
                    const nodeData = node.data as NodeData;
                    return {
                      ...node,
                      data: {
                        ...nodeData,
                        right_sidebar: {
                          ...(nodeData.right_sidebar || {}),
                          image_input: imageInputValue,
                        },
                      } as NodeData,
                    };
                  }
                  return node;
                });
                reactFlowInstance.setNodes(updatedNodes);
              }
            }

            if (isImageToReScene) {
              // Show the tag menu for this connection with a small delay to ensure edge is created
              setTimeout(() => {
                // Find the newly created edge
                const currentEdgesForTag = reactFlowInstance.getEdges();
                const createdEdge = currentEdgesForTag.find(edge =>
                  edge.source === connection.source &&
                  edge.target === connection.target
                );

                if (!createdEdge) {
                  console.error('Edge was not created properly!');
                  return;
                }

                // Initialize the edge with empty data if it doesn't have any
                if (!createdEdge.data) {
                  const updatedEdges = currentEdgesForTag.map(edge =>
                    edge.id === createdEdge.id ? { ...edge, data: {} } : edge
                  );
                  reactFlowInstance.setEdges(updatedEdges);
                }

                // Calculate smart default tag based on existing tags
                const existingTags = currentEdgesForTag.filter(edge =>
                  edge.target === connection.target &&
                  edge.id !== createdEdge.id &&
                  currentNodes.find(n => n.id === edge.source)?.type === 'image-node' &&
                  edge.data?.tag
                ).map(edge => edge.data.tag as 'object' | 'scene');

                const smartDefaultTag: 'object' | 'scene' =
                  existingTags.includes('object') ? 'scene' : 'object';

                setReSceneTagMenu({
                  edgeId: createdEdge.id,
                  sourceNodeId: connection.source!,
                  targetNodeId: connection.target!,
                  position: mousePosition,
                  currentTag: smartDefaultTag
                });
              }, 100);
            }
          }
        }}
        onNodeClick={useCallback((event: React.MouseEvent, node: any) => {
          setSelectedNode(node);
        }, [setSelectedNode])}
        onEdgeClick={useCallback((event: React.MouseEvent, edge: any) => {
          // Do nothing - edges should not be selectable
        }, [])}
        onPaneClick={useCallback(() => {
          setSelectedNode(null);
          setContextMenu(null);
          setCanvasContextMenu(null);
          setReSceneTagMenu(null);
          onCanvasClick?.();
        }, [setSelectedNode, onCanvasClick])}
        onPaneMouseMove={useCallback((event: React.MouseEvent) => {
          setMousePosition({ x: event.clientX, y: event.clientY });
        }, [])}
        onNodeContextMenu={useCallback((event: React.MouseEvent, node: Node) => {
          event.preventDefault();

          // Select the node when right-clicking
          setSelectedNode(node);

          const pane = document.querySelector('.react-flow__pane');
          if (pane) {
            const paneRect = pane.getBoundingClientRect();

            setContextMenu({
              id: node.id,
              top: event.clientY - paneRect.top,
              left: event.clientX - paneRect.left,
            });
          }
        }, [setSelectedNode])}
        onPaneContextMenu={useCallback((event: React.MouseEvent) => {
          event.preventDefault();

          // Close node context menu if open
          setContextMenu(null);

          const pane = document.querySelector('.react-flow__pane');
          if (pane) {
            const paneRect = pane.getBoundingClientRect();

            setCanvasContextMenu({
              top: event.clientY - paneRect.top,
              left: event.clientX - paneRect.left,
            });
          }
        }, [])}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        // nodesDraggable={true}
        nodesConnectable
        nodesFocusable
        className="bg-[#151515]"
        // ZOOM CONFIGURATION - Wider range for better flexibility
        minZoom={0.04}
        maxZoom={10}
        defaultViewport={{ x: 350, y: 200, zoom: 0.7 }}
        // ADVANCED NODE SELECTION
        // selectionOnDrag={true}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={['Meta', 'Shift']}
        deleteKeyCode={['Delete', 'Backspace']}
        // PERFORMANCE OPTIMIZATIONS FOR SMOOTH DRAGGING
        snapToGrid={false}
        selectNodesOnDrag={false}
        onlyRenderVisibleElements={!nodes.some(node => {
          if (node.type !== 'image-node') return false;

          // Check if image node is in OutPaint or Out-painted mode
          // This would need to be determined based on connections to outpainting nodes
          const hasOutpaintingConnection = edges.some(edge => {
            if (edge.source === node.id || edge.target === node.id) {
              const otherNodeId = edge.source === node.id ? edge.target : edge.source;
              const otherNode = nodes.find(n => n.id === otherNodeId);
              if (otherNode) {
                const nodeType = otherNode.type?.toLowerCase() || '';
                const nodeId = otherNode.id?.toLowerCase() || '';
                return nodeType.includes('outpainting') ||
                  nodeType.includes('outpaint') ||
                  nodeType.includes('out-paint') ||
                  nodeId.includes('outpainting') ||
                  nodeId.includes('outpaint') ||
                  nodeId.includes('out-paint');
              }
            }
            return false;
          });

          return hasOutpaintingConnection;
        })} // Disable optimization only when image nodes are in OutPaint modes
        elevateNodesOnSelect={false}
        elevateEdgesOnSelect={true}
        // CLEAN EDGE STYLING WITH CIRCLE START AND ARROW END
        defaultEdgeOptions={{
          animated: false,
          type: 'default',
          markerStart: {
            type: MarkerType.ArrowClosed,
            color: '#007AFF',
            width: 20,
            height: 20,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#007AFF',
            width: 20,
            height: 20,
          },
          style: {
            stroke: '#007AFF',
            strokeWidth: 1.3,
          },
        }}
      >
        {/* Custom SVG definitions for arrow markers */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
          <defs>
            <marker
              id="custom-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="3.5"
              refY="2.1"
              orient="auto"
              markerUnits="strokeWidth"
              overflow="visible"
            >
              <polygon
                points="0,0 0,4.2 3.5,2.1"
                fill="#007AFF"
                stroke="#007AFF"
                strokeWidth="0.5"
              />
            </marker>
            <marker
              id="custom-circle"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="2.5"
              orient="auto"
              markerUnits="strokeWidth"
              overflow="visible"
            >
              <circle
                cx="3.6"
                cy="2.5"
                r="2.5"
                fill="#007AFF"
                stroke="none"
              />
            </marker>
          </defs>
        </svg>

        <HelperLines
          horizontal={helperLineHorizontal}
          vertical={helperLineVertical}
        />



        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            id={contextMenu.id}
            top={contextMenu.top}
            left={contextMenu.left}
            right={contextMenu.right}
            bottom={contextMenu.bottom}
            mousePosition={mousePosition}
            reactFlowInstance={reactFlowInstance}
            onClick={() => setContextMenu(null)}
          />
        )}

        {/* Canvas Context Menu */}
        {canvasContextMenu && (
          <CanvasContextMenu
            top={canvasContextMenu.top}
            left={canvasContextMenu.left}
            mousePosition={mousePosition}
            reactFlowInstance={reactFlowInstance}
            onClick={() => setCanvasContextMenu(null)}
          />
        )}

      </ReactFlow>

      {/* SVG Drag Indicator */}
      {isDragOver && (
        <svg
          className="absolute inset-0 pointer-events-none z-50"
          style={{ width: '100%', height: '100%' }}
        >
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="none"
            stroke="#007AFF"
            strokeWidth="1"
            strokeOpacity="0.5"
          />
        </svg>
      )}

      {/* Rectangle Drawing Tool */}
      {activeTool === 'rectangle' && <RectangleTool />}

      {/* Circle Drawing Tool */}
      {activeTool === 'circle' && <CircleTool />}

      {/* Star Drawing Tool */}
      {activeTool === 'star' && <StarTool />}

      {/* Frame Drawing Tool */}
      {activeTool === 'frame' && <FrameTool />}

      {/* Re-Scene Tag Menu */}
      {reSceneTagMenu && (
        <ReSceneTagMenu
          edgeId={reSceneTagMenu.edgeId}
          sourceNodeId={reSceneTagMenu.sourceNodeId}
          targetNodeId={reSceneTagMenu.targetNodeId}
          onClose={() => setReSceneTagMenu(null)}
          onTagSelect={handleReSceneTagSelect}
          initialTag={reSceneTagMenu.currentTag}
          position={reSceneTagMenu.position}
          unavailableTags={(() => {
            // Calculate which tags are already taken for this target node
            const currentEdges = reactFlowInstance.getEdges();
            const currentNodes = reactFlowInstance.getNodes();
            const existingTags = currentEdges.filter(edge =>
              edge.target === reSceneTagMenu.targetNodeId &&
              edge.id !== reSceneTagMenu.edgeId &&
              currentNodes.find(n => n.id === edge.source)?.type === 'image-node' &&
              edge.data?.tag
            ).map(edge => edge.data.tag as 'object' | 'scene');
            return existingTags;
          })()}
        />
      )}
    </div>
  );
};