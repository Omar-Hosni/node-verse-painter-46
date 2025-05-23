import { Canvas, IText, Point, Rect, Circle } from "fabric";
import { Edge, Node } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';

// Define custom interface for object options with objectId
interface ObjectOptions {
  left: number;
  top: number;
  fill?: string;
  width?: number;
  height?: number;
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: number[];
  transparentCorners?: boolean;
  cornerColor?: string;
  objectId: string;
  fontSize?: number;
  fontFamily?: string;
}

// Shape creation functions
export const createRectangle = (canvas: Canvas, pointer: Point) => {
  const rect = new Rect({
    left: pointer.x,
    top: pointer.y,
    width: 100,
    height: 50,
    fill: 'rgba(0,150,255,0.3)',
    stroke: '#0096FF',
    strokeWidth: 2,
    transparentCorners: false,
    cornerColor: '#0096FF',
    objectId: `rect-${Date.now()}`,
  } as ObjectOptions);

  canvas.add(rect);
  canvas.setActiveObject(rect);
  syncShapeToRemote(rect);
  return rect;
};

export const createCircle = (canvas: Canvas, pointer: Point) => {
  const circle = new Circle({
    left: pointer.x,
    top: pointer.y,
    radius: 40,
    fill: 'rgba(255,128,255,0.3)',
    stroke: '#FF80FF',
    strokeWidth: 2,
    transparentCorners: false,
    cornerColor: '#FF80FF',
    objectId: `circle-${Date.now()}`,
  } as ObjectOptions);

  canvas.add(circle);
  canvas.setActiveObject(circle);
  syncShapeToRemote(circle);
  return circle;
};

export const createFrame = (canvas: Canvas, pointer: Point) => {
  const frame = new Rect({
    left: pointer.x,
    top: pointer.y,
    width: 150,
    height: 150,
    fill: 'rgba(255,255,255,0.1)',
    stroke: '#FF8C00',
    strokeWidth: 2,
    strokeDashArray: [5, 5],
    transparentCorners: false,
    cornerColor: '#FF8C00',
    objectId: `frame-${Date.now()}`,
  } as ObjectOptions);

  canvas.add(frame);
  canvas.setActiveObject(frame);
  syncShapeToRemote(frame);
  return frame;
};

export const createText = (canvas: Canvas, pointer: Point) => {
  const text = new IText('Text', {
    left: pointer.x,
    top: pointer.y,
    fill: '#333333',
    fontSize: 24,
    fontFamily: 'Arial',
    objectId: `text-${Date.now()}`,
  } as ObjectOptions);

  canvas.add(text);
  canvas.setActiveObject(text);
  syncShapeToRemote(text);
  return text;
};

// Actual initialization function
export const initializeFabric = (
  canvasRef: HTMLCanvasElement | null, 
  reactFlowContainer: HTMLDivElement | null,
  onShapeChange: () => void,
  projectId?: string
) => {
  if (!canvasRef || !reactFlowContainer) return null;
  
  // Create Fabric.js canvas
  const fabricCanvas = new Canvas(canvasRef, {
    width: reactFlowContainer.clientWidth,
    height: reactFlowContainer.clientHeight,
    backgroundColor: 'transparent',
    selection: true,
    preserveObjectStacking: true,
  });
  
  // Set up event listeners for real-time collaboration
  fabricCanvas.on('object:modified', (e) => {
    if (e.target && 'objectId' in e.target) {
      syncShapeToRemote(e.target);
      onShapeChange();
    }
  });

  // Set up real-time subscriptions for this canvas if projectId is provided
  if (projectId) {
    setupRealTimeSubscription(fabricCanvas, projectId);
  }
  
  return fabricCanvas;
};

// Resize canvas to match container
export const resizeFabricCanvas = (
  fabricCanvas: Canvas | null,
  reactFlowContainer: HTMLDivElement | null
) => {
  if (!fabricCanvas || !reactFlowContainer) return;
  
  fabricCanvas.setDimensions({
    width: reactFlowContainer.clientWidth,
    height: reactFlowContainer.clientHeight
  });
  fabricCanvas.renderAll();
};

// Sync Fabric zoom and pan with ReactFlow
export const syncFabricWithReactFlow = (
  fabricCanvas: Canvas | null,
  zoom: number,
  position: { x: number, y: number }
) => {
  if (!fabricCanvas) return;
  
  // Apply zoom transformation
  fabricCanvas.setZoom(zoom);
  
  // Apply pan transformation
  const point = new Point(-position.x, -position.y);
  fabricCanvas.absolutePan(point);
};

// Save shape data to remote storage (Supabase)
export const syncShapeToRemote = async (object: any) => {
  if (!object || !('objectId' in object)) return;
  
  const objectId = object.objectId as string;
  const jsonData = object.toJSON(['objectId']);
  const projectId = window.location.pathname.split('/').pop();
  
  try {
    const { error } = await supabase
      .from('canvas_shapes')
      .upsert({ 
        id: objectId,
        project_id: projectId || 'default',
        shape_data: jsonData,
        updated_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error syncing shape:', error);
    }
  } catch (err) {
    console.error('Failed to sync shape:', err);
  }
};

// Delete shape from remote storage
export const deleteShapeFromRemote = async (objectId: string) => {
  try {
    const { error } = await supabase
      .from('canvas_shapes')
      .delete()
      .eq('id', objectId);
      
    if (error) {
      console.error('Error deleting shape:', error);
    }
  } catch (err) {
    console.error('Failed to delete shape:', err);
  }
};

// Load all shapes from remote storage
export const loadShapesFromRemote = async (fabricCanvas: Canvas, projectId: string) => {
  if (!fabricCanvas) return;
  
  try {
    const { data, error } = await supabase
      .from('canvas_shapes')
      .select('*')
      .eq('project_id', projectId);
      
    if (error) {
      console.error('Error loading shapes:', error);
      return;
    }
    
    if (data && data.length > 0) {
      // Clear existing canvas
      fabricCanvas.clear();
      
      // Load each shape
      data.forEach(item => {
        try {
          // Use fabric.js JSON parsing to recreate objects
          const shapeData = item.shape_data;
          // Create a new object from the shape data
          const object = fabricCanvas.add(
            new (fabric[shapeData.type])()
          );
          
          // Set the properties from the shape data
          if (object) {
            object.set(shapeData);
            object.setCoords();
          }
        } catch (err) {
          console.error('Error loading shape:', err);
        }
      });
      
      fabricCanvas.renderAll();
    }
  } catch (err) {
    console.error('Failed to load shapes:', err);
  }
};

// Set up real-time subscription for canvas shapes
export const setupRealTimeSubscription = (fabricCanvas: Canvas, projectId: string) => {
  const channel = supabase
    .channel(`canvas-shapes-${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'canvas_shapes',
        filter: `project_id=eq.${projectId}`,
      },
      (payload: any) => {
        // Handle shape changes in real-time
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const shapeData = payload.new.shape_data;
          const objectId = payload.new.id;
          
          // Check if object already exists on canvas
          const existingObject = fabricCanvas.getObjects().find(
            obj => 'objectId' in obj && obj.objectId === objectId
          );
          
          if (existingObject) {
            // Update existing object
            try {
              // Remove the old object
              fabricCanvas.remove(existingObject);
              
              // Create a new object from shape data
              const object = fabricCanvas.add(
                new (fabric[shapeData.type])()
              );
              
              // Set the properties from the shape data
              if (object) {
                object.set(shapeData);
                object.setCoords();
                fabricCanvas.renderAll();
              }
            } catch (err) {
              console.error('Error updating shape:', err);
            }
          } else {
            // Add new object
            try {
              // Create a new object from shape data
              const object = fabricCanvas.add(
                new (fabric[shapeData.type])()
              );
              
              // Set the properties from the shape data
              if (object) {
                object.set(shapeData);
                object.setCoords();
                fabricCanvas.renderAll();
              }
            } catch (err) {
              console.error('Error creating shape:', err);
            }
          }
        } else if (payload.eventType === 'DELETE') {
          // Remove object from canvas
          const objectId = payload.old.id;
          const existingObject = fabricCanvas.getObjects().find(
            obj => 'objectId' in obj && obj.objectId === objectId
          );
          
          if (existingObject) {
            fabricCanvas.remove(existingObject);
            fabricCanvas.renderAll();
          }
        }
      }
    )
    .subscribe();
    
  return channel;
};

// Frame an XYFlow node with a Fabric shape
export const frameNode = (canvas: Canvas, node: Node) => {
  // Get node's position and dimensions
  const { position, width = 150, height = 40 } = node;
  
  // Create a frame around the node
  const frame = new Rect({
    left: position.x - 10,
    top: position.y - 10,
    width: (width as number) + 20,
    height: (height as number) + 20,
    fill: 'rgba(255,255,255,0.1)',
    stroke: '#FF8C00',
    strokeWidth: 2,
    strokeDashArray: [5, 5],
    transparentCorners: false,
    cornerColor: '#FF8C00',
    objectId: `frame-node-${node.id}-${Date.now()}`,
  } as ObjectOptions);

  canvas.add(frame);
  canvas.setActiveObject(frame);
  syncShapeToRemote(frame);
  return frame;
};
