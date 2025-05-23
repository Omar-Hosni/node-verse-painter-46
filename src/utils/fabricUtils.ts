
import { Canvas, Circle, Rect, IEvent, Object as FabricObject } from "fabric";
import { type Json } from "@/store/types";

// Extend FabricObject with id property
interface FabricObjectWithId extends FabricObject {
  id: string;
  _fromSync?: boolean; // Add _fromSync property
}

// Helper function to generate a unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

// Convert a Fabric.js object to a serializable object
export const serializeFabricObject = (obj: FabricObjectWithId): Record<string, any> => {
  // Use JSON serialization instead of toObject()
  const serialized = JSON.parse(JSON.stringify(obj));
  return {
    ...serialized,
    id: obj.id,
  };
};

// Create a rectangle
export const createRectangle = (
  canvas: Canvas, 
  options: {
    left: number;
    top: number;
    width: number;
    height: number;
    fill: string;
    id?: string;
  }
): FabricObjectWithId => {
  const id = options.id || generateId();
  const rect = new Rect({
    left: options.left,
    top: options.top,
    width: options.width,
    height: options.height,
    fill: options.fill,
    stroke: "#000000",
    strokeWidth: 1,
    cornerStyle: 'circle',
    transparentCorners: false,
    objectCaching: false,
  }) as FabricObjectWithId;
  
  rect.id = id;
  canvas.add(rect);
  canvas.renderAll();
  return rect;
};

// Create a circle
export const createCircle = (
  canvas: Canvas,
  options: {
    left: number;
    top: number;
    radius: number;
    fill: string;
    id?: string;
  }
): FabricObjectWithId => {
  const id = options.id || generateId();
  const circle = new Circle({
    left: options.left,
    top: options.top,
    radius: options.radius,
    fill: options.fill,
    stroke: "#000000",
    strokeWidth: 1,
    cornerStyle: 'circle',
    transparentCorners: false,
    objectCaching: false,
  }) as FabricObjectWithId;
  
  circle.id = id;
  canvas.add(circle);
  canvas.renderAll();
  return circle;
};

// Initialize Fabric canvas that syncs with XYflow's pan and zoom
export const initializeFabric = (
  canvasRef: HTMLCanvasElement, 
  reactFlowInstance: any, 
  onObjectAdded: (object: FabricObjectWithId) => void,
  onObjectModified: (object: FabricObjectWithId) => void
): Canvas => {
  const fabricCanvas = new Canvas(canvasRef, {
    width: canvasRef.width,
    height: canvasRef.height,
    backgroundColor: 'transparent',
    selection: true,
    preserveObjectStacking: true,
    renderOnAddRemove: true,
  });
  
  // Initialize the freeDrawingBrush right after canvas creation
  fabricCanvas.freeDrawingBrush.color = "#000000";
  fabricCanvas.freeDrawingBrush.width = 2;
  
  // Listen for object modifications
  fabricCanvas.on('object:modified', (e: IEvent) => {
    const modifiedObj = e.target as FabricObjectWithId;
    if (modifiedObj && modifiedObj.id && !modifiedObj._fromSync) {
      onObjectModified(modifiedObj);
    }
  });
  
  // Listen for new objects
  fabricCanvas.on('object:added', (e: IEvent) => {
    const addedObj = e.target as FabricObjectWithId;
    if (addedObj && addedObj.id && !addedObj._fromSync) {
      onObjectAdded(addedObj);
    }
  });

  return fabricCanvas;
};

// Create or update a fabric object based on data from Liveblocks
export const createOrUpdateFabricObject = (
  canvas: Canvas, 
  objectData: Record<string, any>
): void => {
  // Check if the object already exists in the canvas
  const existingObject = canvas.getObjects().find(obj => {
    const fabricObj = obj as FabricObjectWithId;
    return fabricObj.id === objectData.id;
  });

  if (existingObject) {
    // Update existing object
    existingObject.set(objectData.props);
    existingObject.setCoords();
  } else {
    // Create new object based on type
    if (objectData.type === 'rect') {
      createRectangle(canvas, {
        left: objectData.props.left || 0,
        top: objectData.props.top || 0,
        width: objectData.props.width || 100,
        height: objectData.props.height || 100,
        fill: objectData.props.fill || '#aaaaaa',
        id: objectData.id
      });
    } else if (objectData.type === 'circle') {
      createCircle(canvas, {
        left: objectData.props.left || 0,
        top: objectData.props.top || 0,
        radius: objectData.props.radius || 50,
        fill: objectData.props.fill || '#aaaaaa',
        id: objectData.id
      });
    }
  }
  
  canvas.renderAll();
};

// Reset the canvas
export const resetCanvas = (canvas: Canvas): void => {
  canvas.clear();
  canvas.backgroundColor = 'transparent';
  canvas.renderAll();
};

// Function to delete selected object
export const deleteSelectedObject = (canvas: Canvas): string | null => {
  const activeObject = canvas.getActiveObject() as FabricObjectWithId | undefined;
  
  if (activeObject) {
    const objectId = activeObject.id;
    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
    return objectId;
  }
  
  return null;
};
