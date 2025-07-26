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
  MarkerType,
  NodeChange,
  OnNodesChange,
  applyNodeChanges,
  Node as ReactFlowNode,
  Edge as ReactFlowEdge,
  Connection
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

import HelperLinesRenderer from './HelperLines';
import { getHelperLines } from '@/utils/helperLinesUtils';
import NormalNode from './nodes/NormalNode';
import LayerImageNode from './nodes/LayerImageNode';

import isValidConnection from '@/utils/connectionUtils';
import { Lasso } from './Lasso';

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
    onNodesChange: originalOnNodesChange, 
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

  // Helper lines state
  const [helperLineHorizontal, setHelperLineHorizontal] = useState<number | undefined>(undefined);
  const [helperLineVertical, setHelperLineVertical] = useState<number | undefined>(undefined);

  const highestNodeOrder = nodes.length > 0 ? Math.max(...nodes.map(node => (node?.data?.order as number) || 0)) : 0;

  useEffect(()=>{

  },[activeTool])

  const isSelectTool = activeTool === 'select';
  const isHandTool = activeTool === 'hand';
  

  const lastUpdateRef = useRef<{nodesHash: string, edgesHash: string}>({ nodesHash: '', edgesHash: '' });

  useEffect(() => {
    if (!projectId) return;

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
          if (useCanvasStore.getState().isLocalUpdate) {
            useCanvasStore.getState().setIsLocalUpdate(false);
            return;
          }

          const canvasData = payload.new.canvas_data;
          if (
            canvasData && 
            canvasData.nodes && 
            canvasData.edges && 
            !useCanvasStore.getState().externalUpdateInProgress
          ) {
            const nodesHash = JSON.stringify(canvasData.nodes);
            const edgesHash = JSON.stringify(canvasData.edges);

            if (
              nodesHash === lastUpdateRef.current.nodesHash &&
              edgesHash === lastUpdateRef.current.edgesHash
            ) {
              return; // No meaningful change
            }

            lastUpdateRef.current = { nodesHash, edgesHash };
            setExternalUpdateInProgress(true);
            toast.info('Canvas updated by another user');
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

  const isNodeInsideFrame = (node: ReactFlowNode, frame: ReactFlowNode): boolean => {
    const frameWidth = (frame.style?.width as number) ?? 300; // Default to 300 if undefined
    const frameHeight = (frame.style?.height as number) ?? 200; // Default to 200 if undefined
    const nodeWidth = (node.style?.width as number) ?? 80; // Default to 80 if undefined
    const nodeHeight = (node.style?.height as number) ?? 80; // Default to 80 if undefined

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
    
    // Clear helper lines when drag stops
    setHelperLineHorizontal(undefined);
    setHelperLineVertical(undefined);
  };

  const updateNodeGrouping = (nodes: ReactFlowNode[]): ReactFlowNode[] => {
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
            x: node.position.x + movement!.deltaX,
            y: node.position.y + movement!.deltaY,
          },
        };
      }
      return node;
    });
  };

  // Helper lines functionality with enhanced node positioning
  const updateHelperLines = useCallback(
    (changes: NodeChange[], nodes: ReactFlowNode[]) => {
      // Reset the helper lines (clear existing lines, if any)
      setHelperLineHorizontal(undefined);
      setHelperLineVertical(undefined);

      // This will be true if it's a single node being dragged
      // Inside we calculate the helper lines and snap position for the position where the node is being moved to
      if (
        changes.length === 1 &&
        changes[0].type === 'position' &&
        changes[0].dragging &&
        changes[0].position
      ) {
        const positionChange = changes[0] as NodePositionChange;
        
        // Calculate helper lines using the utility function
        const helperLines = getHelperLines(positionChange, nodes);

        // If we have a helper line, we snap the node to the helper line position
        // This is being done by manipulating the node position inside the change object
        positionChange.position.x = helperLines.snapPosition.x ?? positionChange.position.x;
        positionChange.position.y = helperLines.snapPosition.y ?? positionChange.position.y;

        // If helper lines are returned, we set them so that they can be displayed
        setHelperLineHorizontal(helperLines.horizontal);
        setHelperLineVertical(helperLines.vertical);
      }

      return changes;
    },
    []
  );

  const handleNodesChange: OnNodesChange = useCallback((changes) => {
    // Apply helper lines logic first
    const updatedChanges = updateHelperLines(changes, nodes);
    
    // Update the store with the helper lines changes
    originalOnNodesChange(updatedChanges);
  }, [updateHelperLines, nodes, originalOnNodesChange]);

  const onConnect = useCallback((connection: Connection) => {
    const currentNodes = reactFlowInstance.getNodes();
    const currentEdges = reactFlowInstance.getEdges();

    if (isValidConnection(connection, currentNodes, currentEdges)) {
      originalOnConnect({
          ...connection,
          id: `${connection.source}-${connection.target}-${Date.now()}`
        });
      

      //if layer-image connected to a certain control-net nodes, then the target node will update its data.right_sidebar.image_input
      const control_net_options = ['edge', 'depth', 'normal', 'segment']
      const isConnectionTargetAControlNet = control_net_options.some(o => connection.target.includes(o))

      if(isConnectionTargetAControlNet && connection.source.includes('layer-image')){
            const imageInputValue = localStorage.getItem(`layer-image-${connection.source}`)
            console.log(`layer-image-${connection.source}`)
            console.log(imageInputValue)
            const targetNode = currentNodes.find((n)=>n.id === connection.target);

            if(targetNode && imageInputValue !== null)
            {
              const updatedNodes = currentNodes.map((node) =>
                node.id === targetNode.id
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                         right_sidebar: {
                           ...(node.data as any)?.right_sidebar,
                           image_input: imageInputValue,
                         },
                      },
                    }
                  : node
              );
              reactFlowInstance.setNodes(updatedNodes);
            }
          }
    }
  }, [originalOnConnect, reactFlowInstance, edges, nodes]);

  useEffect(()=>{

  },[activeTool])

  const nodesOrdered = [...useCanvasStore.getState().nodes].sort((a, b) => ((a.data as any)?.order ?? 0) - ((b.data as any)?.order ?? 0));

  const defaultEdgeOptions = {
    animated: false,
    type: 'floating',
    markerEnd: {
      type: MarkerType.Arrow,
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
        deleteKeyCode={['Delete', 'Backspace']}
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
        proOptions={{ hideAttribution: true }}
      >
        {/*Canva Visualizer and Zoom in Zoom Out buttons*/}
        {/* <MiniMap style={{ backgroundColor: '#1A1A1A' }} /> */}
        <Controls className="text-black mb-20 bg-[#1A1A1A] border-[#333]" />
        {activeTool === "lasso" ? <Lasso partial={false}/> : <></>}
        
        {/* <Background color="#333333" gap={16} /> */}

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

        <HelperLinesRenderer
          horizontal={helperLineHorizontal}
          vertical={helperLineVertical}
        />

        </ReactFlow>
    </div>
  );
};
