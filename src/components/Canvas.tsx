import React, { useCallback, useRef, useEffect, Suspense, useState  } from 'react';
import {
  ReactFlow,
  NodeTypes,
  EdgeTypes,
  useReactFlow,
  MiniMap,
  Controls,
  Background,
  Panel,
  ConnectionLineType,
  SelectionMode,
  NodePositionChange,
  NodeDimensionChange,
  MarkerType
} from '@xyflow/react';

import { useCanvasStore } from '@/store/useCanvasStore';
import { PreviewNode } from './nodes/PreviewNode';
import CustomEdge from './edges/CustomEdge';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DrawingLayer } from './CollaborativeDrawing/DrawingLayer';
import { RectangleNode } from './nodes/RectangleNode';
import { CircleNode } from './nodes/CircleNode';
import { SectionNode } from './nodes/SectionNode';
import { CommentNode } from './nodes/CommentNode';

import '@xyflow/react/dist/style.css';
import { TriangleNode } from './nodes/TriangleNode';
import { DrawingNode } from './nodes/DrawingNode';
import {LabeledFrameGroupNodeWrapper} from './nodes/LabeledFrameGroupNodeWrapper';

import { getSubtree } from '@/utils/nodeHierarchy';
import { getHighestOrder } from '@/store/nodeActions';

import AlignmentGuides from './AlignmentGuides';
import { calculateAlignmentGuides, snapNodeToGuides, AlignmentGuide } from '@/utils/alignmentUtils';
import NormalNode from './nodes/NormalNode';
import LayerImageNode from './nodes/LayerImageNode';

import isValidConnection from '@/utils/connectionUtils';

const nodeTypes: NodeTypes = {
  previewNode: PreviewNode,
  labeledFrameGroupNode: LabeledFrameGroupNodeWrapper,
  'shape-rectangle': RectangleNode,
  'shape-circle': CircleNode,
  'shape-triangle': TriangleNode,
  'section-node': SectionNode,
  'drawing-node': DrawingNode,
  'comment-node': CommentNode,
  'normal-node': NormalNode,
  'layer-image-node': LayerImageNode,
  'preview-realtime-node': PreviewNode
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

export const Canvas = ({activeTool, setActiveTool}) => {
  const { projectId } = useParams<{ projectId: string }>();
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect: originalOnConnect,
    setSelectedNode,
    setSelectedEdge,
    copySelectedNode,
    pasteNodes,
    cutSelectedNode,
    deleteSelectedNode,
    deleteEdge,
    undo,
    redo,
    exportWorkflowAsJson,
    credits,
    fetchUserCredits,
    useCreditsForGeneration,
    sendWorkflowToAPI,
    setExternalUpdateInProgress,
    updateCanvasFromExternalSource,
  } = useCanvasStore();
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const {setNodes, getNodes} = useReactFlow();
  const [previousNodes, setPreviousNodes] = useState(nodes);

  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const highestNodeOrder = nodes.length > 0 ? Math.max(...nodes.map(node => node?.data?.order)) : 0;

  useEffect(()=>{

  },[activeTool])

  const isSelectTool = activeTool === 'select';
  const isHandTool = activeTool === 'hand';
  

  // Add real-time subscriptions
  useEffect(() => {
    if (!projectId) return;

    // Subscribe to project changes
    const channel = supabase
      .channel('project-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          // Skip updating if we're the ones who made the change
          if (useCanvasStore.getState().isLocalUpdate) {
            useCanvasStore.getState().setIsLocalUpdate(false);
            return;
          }
          
          const canvasData = payload.new.canvas_data;
          
          // Only update if we received valid canvas data and we're not currently updating
          if (
            canvasData && 
            canvasData.nodes && 
            canvasData.edges && 
            !useCanvasStore.getState().externalUpdateInProgress
          ) {
            // Set flag to prevent infinite loops
            setExternalUpdateInProgress(true);
            
            console.log('Received real-time update for canvas:', canvasData);
            toast.info('Canvas updated by another user');
            
            // Update canvas with new data
            updateCanvasFromExternalSource(canvasData.nodes, canvasData.edges);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, setExternalUpdateInProgress, updateCanvasFromExternalSource]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setActiveTool('select')
  }, [setSelectedNode, setSelectedEdge]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: any) => {
    setSelectedNode(null);
    setSelectedEdge(edge);
  }, [setSelectedNode, setSelectedEdge]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

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
          // Get current pane center position for paste
          if (reactFlowInstance) {
            const { x, y } = reactFlowInstance.getViewport();
            pasteNodes({ x: -x + 200, y: -y + 200 });
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

  // Fetch user credits
  useEffect(() => {
    fetchUserCredits();
  }, [fetchUserCredits]);

  const handleExportWorkflow = () => {
    const json = exportWorkflowAsJson();
    console.log("Workflow JSON:", json);
    
    // Create a blob and download the JSON file
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Workflow exported as JSON');
  };

  const handleGenerateImage = async () => {
    const previewNode = nodes.find(n => n.type === 'previewNode');
    if (!previewNode) {
      toast.error("No preview node found! Please add a preview node to your canvas.");
      return;
    }

    if (credits === null || credits === undefined) {
      await fetchUserCredits();
      if (credits === null || credits === undefined) {
        toast.error("Could not fetch your credits. Please try again.");
        return;
      }
    }

    if (credits < 1) {
      toast.error("Not enough credits! Please purchase more credits to continue generating images.");
      return;
    }

    try {
      // Update button to loading state
      toast.info("Sending request to generate image...");
      
      // Send to API
      await sendWorkflowToAPI();
      
      // Use credits
      await useCreditsForGeneration();
      
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // const defaultEdgeOptions = {
  //   type: 'custom',
  //   animated: true,
  //   style: { strokeWidth: 2, stroke: '#666' }
  // };


  const isNodeInsideFrame = (node: Node, frame: Node): boolean => {
    const frameWidth = frame.width ?? 300; // Default to 300 if undefined
    const frameHeight = frame.height ?? 200; // Default to 200 if undefined
    const nodeWidth = node.width ?? 80; // Default to 80 if undefined
    const nodeHeight = node.height ?? 80; // Default to 80 if undefined

    // Calculate the node's bounding box
    const nodeLeft = node.position.x;
    const nodeTop = node.position.y;
    const nodeRight = nodeLeft + nodeWidth;
    const nodeBottom = nodeTop + nodeHeight;

    // Calculate the frame's bounding box
    const frameLeft = frame.position.x;
    const frameTop = frame.position.y;
    const frameRight = frameLeft + frameWidth;
    const frameBottom = frameTop + frameHeight;

    // Check if the entire node is within the frame boundaries
    const isInside =
      nodeLeft >= frameLeft && // Node's left edge inside frame's left edge
      nodeTop >= frameTop && // Node's top edge inside frame's top edge
      nodeRight <= frameRight && // Node's right edge inside frame's right edge
      nodeBottom <= frameBottom; // Node's bottom edge inside frame's bottom edge

    return isInside;
  };


  // Updated onNodeDragStop (Canvas.tsx)
  const onNodeDragStop = (event, draggedNode) => {
    const currentNodes = reactFlowInstance.getNodes();
    const frames = currentNodes.filter(n => n.type === 'labeledFrameGroupNode');

    const updatedNodes = currentNodes.map(node => {
      if (node.type === 'labeledFrameGroupNode') return node;

      const matchedFrame = frames.find(frame => isNodeInsideFrame(node, frame));
      const currentGroupedWith = node.data?.groupedWith;

      if (matchedFrame && currentGroupedWith !== matchedFrame.id) {
        return {
          ...node,
          data: {
            ...node.data,
            groupedWith: matchedFrame.id,
          },
        };
      } else if (!matchedFrame && currentGroupedWith) {
        const newData = { ...node.data };
        delete newData.groupedWith;
        return {
          ...node,
          data: newData,
        };
      }

      return node;
    });

    reactFlowInstance.setNodes(updatedNodes);
  };


  const updateNodeGrouping = (nodes: Node[]): Node[] => {
    const frames = nodes.filter(node => node.type === 'labeledFrameGroupNode');
    const childNodes = nodes.filter(node => node.type !== 'labeledFrameGroupNode');

    // Update grouping relationships
    const updatedNodes = nodes.map(node => {
      if (node.type !== 'labeledFrameGroupNode') {
        const parentFrame = frames.find(frame => frame.id !== node.id && isNodeInsideFrame(node, frame));

        if (parentFrame) {
          return {
            ...node,
            data: {
              ...node.data,
              groupedWith: parentFrame.id,
            },
          };
        } else {
          const newData = { ...node.data };
          delete (newData as any).groupedWith;
          return {
            ...node,
            data: newData,
          };
        }
      }
      return node;
    });

    // Handle frame movements
    const frameMovements = new Map<string, { deltaX: number; deltaY: number }>();

    frames.forEach(frame => {
      const oldFrame = nodes.find(n => n.id === frame.id);
      if (oldFrame && (oldFrame.position.x !== frame.position.x || oldFrame.position.y !== frame.position.y)) {
        frameMovements.set(frame.id, {
          deltaX: frame.position.x - oldFrame.position.x,
          deltaY: frame.position.y - oldFrame.position.y,
        });
      }
    });

    return updatedNodes.map(node => {
      const groupedWith = (node.data as any)?.groupedWith;
      if (groupedWith && frameMovements.has(groupedWith)) {
        const movement = frameMovements.get(groupedWith);
        return {
          ...node,
          position: {
            x: node.position.x + movement.deltaX,
            y: node.position.y + movement.deltaY,
          },
        };
      }
      return node;
    });
  };



  const handleNodesChange = useCallback((changes) => {
    onNodesChange(changes); //library updates

    //other custom updates
    const positionChanges = changes.filter(
      (c) => c.type === 'position' && c.position && c.dragging !== undefined
    );

    const dimensionChanges = changes.filter((c) => c.type === 'dimensions');

    if (positionChanges.length > 0) {

      const draggingChange = positionChanges.find(c => c.dragging !== undefined);
      if (draggingChange) {
        setIsDragging(draggingChange.dragging);
        setDraggedNodeId(draggingChange.id);
      }
      reactFlowInstance.setNodes((currentNodes) => {
        // Build a map of previous node positions
        const prevMap = new Map(previousNodes.map(node => [node.id, node]));

        // Update node positions first, so we get accurate deltas
        let updatedNodes = currentNodes.map(node => {
          const change = positionChanges.find(c => c.id === node.id);
          if (change && change.position) {
            return { ...node, position: change.position };
          }
          return node;
        });

        // Now calculate frame movement deltas
        const frameMovements = new Map();
        updatedNodes.forEach(node => {
          const prevNode = prevMap.get(node.id);
          if (node.type === 'labeledFrameGroupNode' && prevNode) {
            const deltaX = node.position.x - prevNode.position.x;
            const deltaY = node.position.y - prevNode.position.y;
            if (deltaX !== 0 || deltaY !== 0) {
              frameMovements.set(node.id, { deltaX, deltaY });
            }
          }
        });

        // Apply frame movements to grouped nodes
        if (frameMovements.size > 0) {
          updatedNodes = updatedNodes.map(node => {
            const groupedWith = (node.data as any)?.groupedWith;
            if (groupedWith && frameMovements.has(groupedWith)) {
              const move = frameMovements.get(groupedWith);
              return {
                ...node,
                position: {
                  x: node.position.x + move.deltaX,
                  y: node.position.y + move.deltaY,
                },
              };
            }
            return node;
          });
        }

        if (isDragging && draggedNodeId) {
          const draggedNode = updatedNodes.find(n => n.id === draggedNodeId);
          if (draggedNode) {
            const guides = calculateAlignmentGuides(draggedNode, updatedNodes);
            setAlignmentGuides(guides);

            const snappedPos = snapNodeToGuides(draggedNode, guides);
            updatedNodes = updatedNodes.map(n =>
              n.id === draggedNodeId ? { ...n, position: snappedPos } : n
            );
          }
        } else {
          setAlignmentGuides([]); // Clear guides when not dragging
        }

        const frames = updatedNodes.filter(n => n.type === 'labeledFrameGroupNode');

        updatedNodes = updatedNodes.map(node => {
          if (node.type === 'labeledFrameGroupNode') return node;

          const matchedFrame = frames.find(frame => isNodeInsideFrame(node, frame));
          const currentGroupedWith = (node.data as any)?.groupedWith;

          if (matchedFrame) {
            // Update only if different
            if (currentGroupedWith !== matchedFrame.id) {
              return {
                ...node,
                data: {
                  ...node.data,
                  groupedWith: matchedFrame.id,
                },
              };
            }
          } else if (currentGroupedWith) {
            // Node is no longer inside any frame, remove grouping
            const newData = { ...node.data };
            delete (newData as any).groupedWith;
            return {
              ...node,
              data: newData,
            };
          }

          return node;
        });

        setPreviousNodes(updatedNodes);
        return updatedNodes;
      });
    }

    if (dimensionChanges.length > 0) {
      reactFlowInstance.setNodes((currentNodes) => {
        const updatedNodes = updateNodeGrouping(currentNodes);
        setPreviousNodes(updatedNodes);
        return updatedNodes;
      });
    }
  }, [onNodesChange, reactFlowInstance, previousNodes]);



  //The following could be used after any operation that affects Ordering
  // After adding/removing nodes in store actions:
  //setNodes(renumberOrders(updatedNodes));
  // After loading a project:
  //const loadedNodes = renumberOrdersEnhanced(nodesFromProject);
  //set({ nodes: loadedNodes });


  const onConnect = useCallback((connection: Connection) => {
    if (isValidConnection(connection, nodes, edges)) {
      originalOnConnect(connection);
    }
  }, [nodes, edges, originalOnConnect]);

  useEffect(()=>{

  },[activeTool])

  const nodesOrdered = [...useCanvasStore.getState().nodes].sort((a, b) => (a.data?.order ?? 0) - (b.data?.order ?? 0));

  const defaultEdgeOptions = {
    animated: true,
    type: 'floating',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#007bff',
    },
    style: {
      stroke: '#007bff',
      strokeWidth: 2,
    },
  };


  return (
    <div className="flex-1 h-screen bg-[#121212] relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodesOrdered}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        selectionOnDrag={isSelectTool}
        selectionMode={SelectionMode.Partial}
        panOnDrag={isHandTool ? true : [1, 2]}  // true = any button (including left click)
        panOnScroll
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        zoomActivationKeyCode="Meta"         // Zoom with Meta key (Cmd on Mac)
        multiSelectionKeyCode={['Meta', 'Shift']} // Multi-select with Cmd or Shift
        selectNodesOnDrag={false}            // Disables default selection on drag
        onNodeDragStop={onNodeDragStop}
        fitView
        nodesDraggable={isSelectTool}
        nodesConnectable
        nodesFocusable
        className="bg-[#151515]"
        connectionLineStyle={{ stroke: '#ff69b4', strokeWidth: 3 }}
        connectionLineType={ConnectionLineType.Bezier}
        defaultEdgeOptions={defaultEdgeOptions}
        snapToGrid={true}
        snapGrid={[15, 15]}
      >
        {/*Canva Visualizer and Zoom in Zoom Out buttons*/}
        {/* <MiniMap style={{ backgroundColor: '#1A1A1A' }} /> */}
        <Controls className="text-black mb-20 bg-[#1A1A1A] border-[#333]" />
        
        <Background color="#333333" gap={16} />
        <Panel position="top-right" className="flex flex-col gap-2">
          <Button 
            onClick={handleExportWorkflow}
            variant="outline"
            className="bg-[#1A1A1A] text-gray-300 border-[#333]"
          >
            Export Workflow
          </Button>
          <Button 
            onClick={handleGenerateImage}
            className="bg-blue-600 text-white"
          >
            Generate Image ({credits !== null ? credits : '...'} credits)
          </Button>
        </Panel>

        {isDragging && alignmentGuides.length > 0 && (
            <AlignmentGuides 
              guides={alignmentGuides} 
              viewport={reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }} 
            />
          )}

      </ReactFlow>
    </div>
  );
};
