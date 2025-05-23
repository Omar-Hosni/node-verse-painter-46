
import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useReactFlow } from '@xyflow/react';
import { toast } from 'sonner';
import { 
  initFabricCanvas, 
  resizeFabricCanvas,
  syncFabricWithReactFlow,
  createRectangle,
  createCircle,
  createText,
  createFrame,
  loadShapesFromRemote,
  deleteShapeFromRemote
} from '@/utils/fabricUtils';
import { fabric } from 'fabric';

interface FabricCanvasProps {
  activeTool: string;
  reactFlowContainerRef: React.RefObject<HTMLDivElement>;
  projectId?: string;
}

const FabricCanvas: React.FC<FabricCanvasProps> = ({ 
  activeTool, 
  reactFlowContainerRef,
  projectId
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const { getZoom, getViewport } = useReactFlow();
  const [isDrawing, setIsDrawing] = useState(false);
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const actualProjectId = projectId || routeProjectId;
  
  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || !reactFlowContainerRef.current) return;
    
    // Initialize the Fabric canvas
    const fabricCanvas = initFabricCanvas(
      canvasRef.current, 
      reactFlowContainerRef.current,
      () => {
        // This callback is fired when shapes change
        console.log('Shape changed');
      },
      actualProjectId
    );
    
    if (fabricCanvas) {
      fabricRef.current = fabricCanvas;
      
      // Load existing shapes if we have a project ID
      if (actualProjectId) {
        loadShapesFromRemote(fabricCanvas, actualProjectId);
      }
      
      // Setup event listeners
      window.addEventListener('resize', handleResize);
      
      // Clean up on unmount
      return () => {
        window.removeEventListener('resize', handleResize);
        fabricCanvas.dispose();
      };
    }
  }, [reactFlowContainerRef.current, actualProjectId]);
  
  // Sync with ReactFlow's zoom and pan
  useEffect(() => {
    const zoom = getZoom();
    const { x, y } = getViewport();
    
    syncFabricWithReactFlow(fabricRef.current, zoom, { x, y });
  }, [getZoom, getViewport]);
  
  // Update drawing mode and tool behavior when activeTool changes
  useEffect(() => {
    if (!fabricRef.current) return;
    
    const canvas = fabricRef.current;
    
    // Disable freehand drawing mode unless 'draw' tool is active
    canvas.isDrawingMode = activeTool === 'draw';
    
    if (activeTool === 'draw') {
      // Configure brush options
      canvas.freeDrawingBrush.width = 3;
      canvas.freeDrawingBrush.color = '#333333';
    }
    
    // Setup click handlers based on active tool
    canvas.off('mouse:down');
    canvas.on('mouse:down', (options) => {
      const pointer = canvas.getPointer(options.e);
      
      switch(activeTool) {
        case 'rectangle':
          createRectangle(canvas, pointer);
          break;
        case 'circle':
          createCircle(canvas, pointer);
          break;
        case 'text':
          createText(canvas, pointer);
          break;
        case 'frame':
          createFrame(canvas, pointer);
          break;
        default:
          // For select tool, no special action needed
          break;  
      }
    });
    
    // Handle keyboard events for delete
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          if ('objectId' in activeObject) {
            deleteShapeFromRemote(activeObject.objectId as string);
          }
          canvas.remove(activeObject);
          canvas.renderAll();
          toast.info('Shape deleted');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTool]);
  
  // Handle window resize
  const handleResize = () => {
    if (reactFlowContainerRef.current) {
      resizeFabricCanvas(fabricRef.current, reactFlowContainerRef.current);
    }
  };
  
  return (
    <canvas 
      ref={canvasRef} 
      className="fabric-layer"
    />
  );
};

export default FabricCanvas;
