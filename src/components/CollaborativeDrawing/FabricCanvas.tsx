
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import { useReactFlow } from '@xyflow/react';
import { useParams } from 'react-router-dom';
import { 
  useStorage, 
  useMutation, 
  useUndo, 
  useRedo, 
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  RoomProvider,
  LiveMap,
} from '@/integrations/liveblocks/client';
import { 
  initializeFabric, 
  createRectangle, 
  createCircle, 
  resetCanvas, 
  deleteSelectedObject,
  serializeFabricObject
} from '@/utils/fabricUtils';
import { toast } from "sonner";

interface FabricCanvasProps {
  activeTool: 'select' | 'rectangle' | 'circle' | 'freehand' | 'highlight';
  activeColor: string;
}

export const FabricDrawingLayer: React.FC<FabricCanvasProps> = ({ activeTool, activeColor }) => {
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricInstance, setFabricInstance] = useState<FabricCanvas | null>(null);
  const { projectId } = useParams<{ projectId: string }>();
  const reactFlowInstance = useReactFlow();
  const viewportChangeListener = useRef<any>(null);

  // Liveblocks hooks - safely accessing storage with proper typing
  const canvasObjects = useStorage((root) => root?.canvasObjects);
  const room = useRoom();
  const [myPresence, updateMyPresence] = useMyPresence();
  const undo = useUndo();
  const redo = useRedo();
  
  // Liveblocks mutations with proper typing
  const addObject = useMutation(({ storage }, object) => {
    if (!storage) return;
    
    const canvasObjects = storage.get("canvasObjects");
    if (!canvasObjects) return;
    
    canvasObjects.set(object.id, {
      id: object.id,
      type: object.type,
      version: 1,
      props: object.props
    });
  }, []);
  
  const updateObject = useMutation(({ storage }, objectId, props) => {
    if (!storage) return;
    
    const canvasObjects = storage.get("canvasObjects");
    if (!canvasObjects) return;
    
    const object = canvasObjects.get(objectId);
    if (object) {
      canvasObjects.set(objectId, {
        ...object,
        version: object.version + 1,
        props: { ...object.props, ...props }
      });
    }
  }, []);
  
  const deleteObject = useMutation(({ storage }, objectId) => {
    if (!storage) return;
    
    const canvasObjects = storage.get("canvasObjects");
    if (!canvasObjects) return;
    
    canvasObjects.delete(objectId);
  }, []);
  
  const resetAllObjects = useMutation(({ storage }) => {
    if (!storage) return;
    
    const canvasObjects = storage.get("canvasObjects");
    if (!canvasObjects) return;
    
    // Clear all objects
    const keys = Array.from(canvasObjects.keys());
    keys.forEach(key => {
      canvasObjects.delete(key);
    });
  }, []);

  // Initialize Fabric.js canvas when component mounts
  useEffect(() => {
    if (!fabricCanvasRef.current || !reactFlowInstance) return;

    const handleObjectAdded = (obj: any) => {
      // Ignore objects being added from Liveblocks sync
      if (obj._fromSync) return;
      
      // Add object to Liveblocks storage
      const serialized = serializeFabricObject(obj);
      addObject({
        id: obj.id,
        type: obj.type,
        props: serialized
      });
      
      toast.success('Shape added');
    };

    const handleObjectModified = (obj: any) => {
      // Ignore objects being modified from Liveblocks sync
      if (obj._fromSync) return;
      
      // Update object in Liveblocks storage
      const serialized = serializeFabricObject(obj);
      updateObject(obj.id, serialized);
    };

    const canvas = initializeFabric(
      fabricCanvasRef.current,
      reactFlowInstance,
      handleObjectAdded,
      handleObjectModified
    );
    
    setFabricInstance(canvas);
    
    // Sync with ReactFlow's viewport when it changes
    const handleViewportChange = () => {
      const { x, y, zoom } = reactFlowInstance.getViewport();
      canvas.setViewportTransform([zoom, 0, 0, zoom, x, y]);
    };
    
    // Add listener using a manual approach since reactFlowInstance.on is not available
    viewportChangeListener.current = handleViewportChange;
    
    // Set up a MutationObserver to watch for viewport changes
    const observer = new MutationObserver(() => {
      if (viewportChangeListener.current) {
        viewportChangeListener.current();
      }
    });
    
    // Observe the ReactFlow container
    const reactFlowContainer = document.querySelector('.react-flow');
    if (reactFlowContainer) {
      observer.observe(reactFlowContainer, { attributes: true, childList: true, subtree: true });
    }
    
    // Initial sync
    handleViewportChange();
    
    return () => {
      observer.disconnect();
      canvas.dispose();
    };
  }, [reactFlowInstance, addObject, updateObject]);

  // Set drawing mode based on active tool
  useEffect(() => {
    if (!fabricInstance) return;
    
    // Clear selection when switching tools
    fabricInstance.discardActiveObject();
    
    // Update cursor based on active tool
    switch (activeTool) {
      case 'select':
        fabricInstance.isDrawingMode = false;
        fabricInstance.selection = true;
        fabricInstance.defaultCursor = 'default';
        break;
        
      case 'rectangle':
        fabricInstance.isDrawingMode = false;
        fabricInstance.selection = false;
        fabricInstance.defaultCursor = 'crosshair';
        break;
        
      case 'circle':
        fabricInstance.isDrawingMode = false;
        fabricInstance.selection = false;
        fabricInstance.defaultCursor = 'crosshair';
        break;
        
      case 'freehand':
        fabricInstance.isDrawingMode = true;
        fabricInstance.selection = false;
        fabricInstance.freeDrawingBrush.width = 2;
        fabricInstance.freeDrawingBrush.color = activeColor;
        break;
        
      case 'highlight':
        fabricInstance.isDrawingMode = true;
        fabricInstance.selection = false;
        fabricInstance.freeDrawingBrush.width = 15;
        fabricInstance.freeDrawingBrush.color = `${activeColor}80`; // Add transparency
        break;
    }
    
    // Update presence with current tool
    updateMyPresence({ tool: activeTool });
    
    fabricInstance.renderAll();
  }, [activeTool, activeColor, fabricInstance, updateMyPresence]);

  // Set up click handlers for creating shapes
  useEffect(() => {
    if (!fabricInstance) return;
    
    const handleCanvasClick = (event: any) => {
      if (activeTool === 'select' || activeTool === 'freehand' || activeTool === 'highlight') {
        return;
      }
      
      const pointer = fabricInstance.getPointer(event.e);
      
      if (activeTool === 'rectangle') {
        createRectangle(fabricInstance, {
          left: pointer.x - 50,
          top: pointer.y - 50,
          width: 100,
          height: 100,
          fill: activeColor
        });
      } else if (activeTool === 'circle') {
        createCircle(fabricInstance, {
          left: pointer.x - 50,
          top: pointer.y - 50,
          radius: 50,
          fill: activeColor
        });
      }
    };
    
    fabricInstance.on('mouse:down', handleCanvasClick);
    
    return () => {
      fabricInstance.off('mouse:down', handleCanvasClick);
    };
  }, [fabricInstance, activeTool, activeColor]);

  // Sync objects from Liveblocks
  useEffect(() => {
    if (!fabricInstance || !canvasObjects) return;
    
    // Get the existing object IDs in the canvas
    const existingIds = new Set(
      fabricInstance.getObjects().map((obj: any) => obj.id)
    );
    
    // Handle adds and updates
    canvasObjects.forEach((objectData, id) => {
      // Mark objects as from sync to avoid infinite loops
      try {
        const existingObject = fabricInstance.getObjects().find((obj: any) => obj.id === id);
        
        if (existingObject) {
          // Update existing object
          existingObject._fromSync = true;
          existingObject.set(objectData.props);
          existingObject.setCoords();
          existingIds.delete(id);
        } else {
          // Create new object
          if (objectData.type === 'rect') {
            const rect = createRectangle(fabricInstance, {
              left: objectData.props.left || 0,
              top: objectData.props.top || 0,
              width: objectData.props.width || 100,
              height: objectData.props.height || 100,
              fill: objectData.props.fill || '#aaaaaa',
              id: id
            });
            if (rect) rect._fromSync = true;
          } else if (objectData.type === 'circle') {
            const circle = createCircle(fabricInstance, {
              left: objectData.props.left || 0,
              top: objectData.props.top || 0,
              radius: objectData.props.radius || 50,
              fill: objectData.props.fill || '#aaaaaa',
              id: id
            });
            if (circle) circle._fromSync = true;
          }
        }
      } catch (error) {
        console.error("Error syncing object:", error);
      }
    });
    
    // Remove objects that no longer exist in Liveblocks
    existingIds.forEach(id => {
      const objToRemove = fabricInstance.getObjects().find((obj: any) => obj.id === id);
      if (objToRemove) {
        fabricInstance.remove(objToRemove);
      }
    });
    
    fabricInstance.renderAll();
  }, [canvasObjects, fabricInstance]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if input is focused
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      // Handle delete/backspace to remove selected object
      if ((e.key === 'Delete' || e.key === 'Backspace') && fabricInstance) {
        const deletedId = deleteSelectedObject(fabricInstance);
        if (deletedId) {
          deleteObject(deletedId);
          toast.info('Object deleted');
        }
      }
      
      // Undo/Redo with Ctrl+Z / Ctrl+Y
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
            toast.info('Redo');
          } else {
            undo();
            toast.info('Undo');
          }
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
          toast.info('Redo');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricInstance, undo, redo, deleteObject]);

  // Provide reset canvas method
  const handleResetCanvas = useCallback(() => {
    if (fabricInstance) {
      resetCanvas(fabricInstance);
      resetAllObjects();
      toast.success('Canvas cleared');
    }
  }, [fabricInstance, resetAllObjects]);

  // Expose methods for the toolbar
  React.useEffect(() => {
    // Add methods to window for the parent component to access
    (window as any).fabricActions = {
      resetCanvas: handleResetCanvas,
      undoCanvas: undo,
      redoCanvas: redo,
      deleteSelected: () => {
        if (fabricInstance) {
          const deletedId = deleteSelectedObject(fabricInstance);
          if (deletedId) {
            deleteObject(deletedId);
            toast.info('Object deleted');
          }
        }
      }
    };
    
    return () => {
      delete (window as any).fabricActions;
    };
  }, [fabricInstance, handleResetCanvas, undo, redo, deleteObject]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (fabricCanvasRef.current && fabricInstance) {
        fabricInstance.setDimensions({
          width: fabricCanvasRef.current.parentElement?.clientWidth || window.innerWidth,
          height: fabricCanvasRef.current.parentElement?.clientHeight || window.innerHeight
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial resize
    
    return () => window.removeEventListener('resize', handleResize);
  }, [fabricInstance]);

  return (
    <canvas 
      ref={fabricCanvasRef} 
      className="absolute top-0 left-0 w-full h-full pointer-events-auto z-10"
    />
  );
};

// Wrap the component with Liveblocks room provider
interface CollaborativeCanvasProps extends FabricCanvasProps {
  projectId: string;
}

export const CollaborativeCanvas: React.FC<CollaborativeCanvasProps> = ({ projectId, ...props }) => {
  // Create a new LiveMap instance for the initial storage
  const initialCanvasObjects = new LiveMap();
  
  return (
    <RoomProvider 
      id={`fabric-canvas-${projectId}`}
      initialPresence={{ cursor: null, isDrawing: false, tool: 'select', color: '#ff0000' }}
      initialStorage={{ canvasObjects: initialCanvasObjects }}
    >
      <FabricDrawingLayer {...props} />
    </RoomProvider>
  );
};
