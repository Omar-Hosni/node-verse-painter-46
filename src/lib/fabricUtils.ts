
import { fabric } from 'fabric';
import { toast } from 'sonner';

// Initialize the Fabric canvas
export const initializeFabricCanvas = (canvasRef: HTMLCanvasElement): fabric.Canvas => {
  const fabricCanvas = new fabric.Canvas(canvasRef, {
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#151515'
  });
  
  // Configure the canvas
  fabricCanvas.selection = true;
  fabricCanvas.preserveObjectStacking = true;
  
  return fabricCanvas;
};

// Create a circle on the canvas
export const createCircle = (
  canvas: fabric.Canvas,
  position: { x: number, y: number },
  options?: fabric.ICircleOptions
): fabric.Circle => {
  const circle = new fabric.Circle({
    left: position.x - 50, // Center the circle on the cursor
    top: position.y - 50,
    radius: 50,
    fill: '#4f46e5',
    stroke: '#6366f1',
    strokeWidth: 2,
    ...options
  });
  
  canvas.add(circle);
  canvas.setActiveObject(circle);
  canvas.renderAll();
  
  return circle;
};

// Create a rectangle on the canvas
export const createRectangle = (
  canvas: fabric.Canvas,
  position: { x: number, y: number },
  options?: fabric.IRectOptions
): fabric.Rect => {
  const rect = new fabric.Rect({
    left: position.x - 50, // Center the rectangle on the cursor
    top: position.y - 50,
    width: 100,
    height: 100,
    fill: '#4f46e5',
    stroke: '#6366f1',
    strokeWidth: 2,
    ...options
  });
  
  canvas.add(rect);
  canvas.setActiveObject(rect);
  canvas.renderAll();
  
  return rect;
};

// Create a text object on the canvas
export const createText = (
  canvas: fabric.Canvas,
  position: { x: number, y: number },
  text = 'Edit this text',
  options?: fabric.ITextOptions
): fabric.IText => {
  const textObj = new fabric.IText(text, {
    left: position.x - 50,
    top: position.y - 25,
    fontSize: 20,
    fill: '#ffffff',
    fontFamily: 'Arial',
    ...options
  });
  
  canvas.add(textObj);
  canvas.setActiveObject(textObj);
  canvas.renderAll();
  
  return textObj;
};

// Create a frame (rectangle with no fill)
export const createFrame = (
  canvas: fabric.Canvas,
  position: { x: number, y: number },
  options?: fabric.IRectOptions
): fabric.Rect => {
  const frame = new fabric.Rect({
    left: position.x - 100,
    top: position.y - 75,
    width: 200,
    height: 150,
    fill: 'transparent',
    stroke: '#ffffff',
    strokeWidth: 2,
    strokeDashArray: [5, 5],
    ...options
  });
  
  canvas.add(frame);
  canvas.setActiveObject(frame);
  canvas.renderAll();
  
  return frame;
};

// Handle window resize
export const handleResize = (canvas: fabric.Canvas | null) => {
  if (canvas) {
    canvas.setDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });
    canvas.renderAll();
  }
};

// Delete selected objects
export const deleteSelectedObjects = (canvas: fabric.Canvas | null) => {
  if (!canvas) return;
  
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length === 0) {
    toast.info('No objects selected to delete');
    return;
  }
  
  canvas.discardActiveObject();
  activeObjects.forEach((obj) => {
    canvas.remove(obj);
  });
  
  canvas.requestRenderAll();
  toast.success(`Deleted ${activeObjects.length} object(s)`);
};

// Clear the canvas
export const clearCanvas = (canvas: fabric.Canvas | null) => {
  if (!canvas) return;
  canvas.clear();
  canvas.backgroundColor = '#151515';
  canvas.renderAll();
  toast.info('Canvas cleared');
};
