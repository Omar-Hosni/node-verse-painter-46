import { memo, useState, useEffect, useRef } from 'react';
import { NodeProps, NodeResizer, NodeToolbar, Handle, Position, useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { X } from 'lucide-react';

interface ImageNodeData {
  displayName?: string;
  width?: number;
  height?: number;
  right_sidebar?: {
    pin?: boolean;
    visibility?: boolean;
    opacity?: number;
    blendMode?: string;
    cornerRadius?: number;
    activeCorner?: string;
    corners?: {
      topLeft?: number;
      topRight?: number;
      bottomLeft?: number;
      bottomRight?: number;
    };
    imageUrl?: string;
    imageName?: string;
    imageType?: 'fill' | 'fit' | 'stretch';
    strokeColor?: string;
    strokeWidth?: number;
    strokeStyle?: 'solid' | 'dashed';
    aspectRatioLocked?: boolean;
    storedAspectRatio?: number;
    rotation?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    drawingData?: string; // Base64 encoded canvas data
    drawingDimensions?: { width: number; height: number }; // Original canvas dimensions
    // Brush tool properties
    brushSize?: number;
    brushHardness?: number;
    brushFlow?: number;
    // Eraser tool properties
    eraserSize?: number;
    eraserHardness?: number;
    eraserOpacity?: number;
    eraserFlow?: number;
    // OutPaint mode padding properties
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    // Ratio property for outpaint mode
    ratio?: string;
  };
  color?: string;
  icon?: string;
}

const ImageNode = memo(({ id, data, selected }: NodeProps<ImageNodeData>) => {
  const { updateNodeData, edges, nodes, setSelectedNode } = useCanvasStore(state => ({
    updateNodeData: state.updateNodeData,
    edges: state.edges,
    nodes: state.nodes,
    setSelectedNode: state.setSelectedNode
  }));

  // Add the ref to track if we've entered inpainting mode once
  const enteredInpaintOnceRef = useRef(false);

  // Ratio options and shape map for outpaint mode
  const ratioOptions = ['1:1', '2:3', '3:2', '9:16', '16:9'];
  const ratioShapeMap: { [key: string]: JSX.Element } = {
    '1:1': (
      <div className="w-3.5 h-3.5 bg-transparent border border-[#767676] rounded-sm aspect-square" />
    ),
    '2:3': (
      <div className="h-3.5 w-auto aspect-[2/3] border border-[#767676] rounded-sm" />
    ),
    '3:2': (
      <div className="w-3.5 h-auto aspect-[3/2] border border-[#767676] rounded-sm" />
    ),
    '9:16': (
      <div className="h-3.5 w-auto aspect-[9/16] border border-[#767676] rounded-sm" />
    ),
    '16:9': (
      <div className="w-3.5 h-auto aspect-[16/9] border border-[#767676] rounded-sm" />
    ),
  };
  const { getNodes, setNodes, getZoom } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  // Toolbar state management
  const [toolbarMode, setToolbarMode] = useState<'default' | 'inpainting' | 'outpainting' | 'outpainted'>('default');
  const [selectedTool, setSelectedTool] = useState<'hand' | 'brush' | 'eraser'>('hand');
  const [userClosedInpainting, setUserClosedInpainting] = useState(false);
  const [userClosedOutpainting, setUserClosedOutpainting] = useState(false);
  const [forceOutpainted, setForceOutpainted] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(getZoom());



  // Painting layer state
  const paintingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageNaturalDimensions, setImageNaturalDimensions] = useState({ width: 0, height: 0 });
  const lastDrawPointRef = useRef<{ x: number; y: number } | null>(null);

  // Drawing storage - store as base64 data URL for persistence
  const drawingData = data?.right_sidebar?.drawingData || null;

  // Helper function to draw with brush/eraser properties
  const drawWithTool = (ctx: CanvasRenderingContext2D, x: number, y: number, tool: 'brush' | 'eraser', isStartPoint = false) => {
    // Get tool properties from node data
    const brushSize = data?.right_sidebar?.brushSize || 8;
    const brushHardness = data?.right_sidebar?.brushHardness ?? 100;
    const brushFlow = data?.right_sidebar?.brushFlow ?? 100;

    const eraserSize = data?.right_sidebar?.eraserSize || 8;
    const eraserHardness = data?.right_sidebar?.eraserHardness ?? 100;
    const eraserOpacity = data?.right_sidebar?.eraserOpacity ?? 100;
    const eraserFlow = data?.right_sidebar?.eraserFlow ?? 100;

    // Use appropriate tool properties
    const size = tool === 'brush' ? brushSize : eraserSize;
    const hardness = tool === 'brush' ? brushHardness : eraserHardness;
    const flow = tool === 'brush' ? brushFlow : eraserFlow;
    // Keep opacity only for eraser
    const opacity = tool === 'eraser' ? eraserOpacity : 100;

    // Save current context state
    ctx.save();

    // Set global alpha - full opacity for brush, configurable for eraser
    if (tool === 'brush') {
      ctx.globalAlpha = flow / 100; // Only flow affects brush
    } else {
      ctx.globalAlpha = (opacity / 100) * (flow / 100); // Both opacity and flow for eraser
    }

    if (tool === 'brush') {
      // Brush: additive white
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'white';
    } else {
      // Eraser: subtractive (destination-out removes pixels)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'black';
      ctx.strokeStyle = 'black';
    }

    // Set line properties for smooth drawing
    ctx.lineWidth = size * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Create gradient for hardness effect on the stroke
    if (hardness < 100) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      const innerAlpha = 1.0;
      const outerAlpha = Math.max(0, (hardness / 100) - 0.1);

      if (tool === 'brush') {
        gradient.addColorStop(0, `rgba(255, 255, 255, ${innerAlpha})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, ${outerAlpha})`);
      } else {
        gradient.addColorStop(0, `rgba(0, 0, 0, ${innerAlpha})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${outerAlpha})`);
      }
      ctx.strokeStyle = gradient;
      ctx.fillStyle = gradient;
    }

    if (isStartPoint || !lastDrawPointRef.current) {
      // Draw a circle for the start point
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      // Draw a line from the last point to current point
      ctx.beginPath();
      ctx.moveTo(lastDrawPointRef.current.x, lastDrawPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Also draw a circle at the current point for better coverage
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Update last draw point
    lastDrawPointRef.current = { x, y };

    // Restore context state
    ctx.restore();
  };



  // Handle selection changes - only runs when selected changes
  useEffect(() => {
    console.log(`DEBUG ImageNode ${id}: Selection changed - selected: ${selected}, toolbarMode: ${toolbarMode}`);

    // Check if connected to in-painting node
    const hasInpaintingConnection = edges.some(edge => {
      if (edge.source === id || edge.target === id) {
        const otherNodeId = edge.source === id ? edge.target : edge.source;
        const otherNode = nodes.find(node => node.id === otherNodeId);
        if (otherNode) {
          const nodeType = otherNode.type?.toLowerCase() || '';
          const nodeId = otherNode.id?.toLowerCase() || '';
          return nodeType.includes('inpainting') ||
            nodeType.includes('inpaint') ||
            nodeType.includes('in-paint') ||
            nodeId.includes('inpainting') ||
            nodeId.includes('inpaint') ||
            nodeId.includes('in-paint');
        }
      }
      return false;
    });

    // Check if connected to out-painting node
    const hasOutpaintingConnection = edges.some(edge => {
      if (edge.source === id || edge.target === id) {
        const otherNodeId = edge.source === id ? edge.target : edge.source;
        const otherNode = nodes.find(node => node.id === otherNodeId);
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

    if (selected) {
      // Reset force outpainted when selected
      setForceOutpainted(false);

      if (hasInpaintingConnection && !userClosedInpainting) {
        console.log('DEBUG ImageNode: Node selected with in-painting connection, entering painting mode');
        setToolbarMode('inpainting');
        
        // Only set the tool once when we FIRST enter inpainting mode for a selection session
        if (!enteredInpaintOnceRef.current) {
          enteredInpaintOnceRef.current = true;
          // Keep current tool or uncomment next line to default to brush ONCE:
          // setSelectedTool('brush');
        }
      } else if (hasOutpaintingConnection && !userClosedOutpainting) {
        console.log('DEBUG ImageNode: Node selected with out-painting connection, entering outpainting mode');
        setToolbarMode('outpainting');
      } else {
        setToolbarMode('default');
      }
    } else {
      // When unselected, check connections to determine mode
      console.log(`DEBUG ImageNode ${id}: hasOutpaintingConnection: ${hasOutpaintingConnection}, forceOutpainted: ${forceOutpainted}`);
      if (hasOutpaintingConnection || forceOutpainted) {
        console.log('DEBUG ImageNode: Node unselected with out-painting connection, entering outpainted mode');
        setToolbarMode('outpainted');
      } else {
        console.log('DEBUG ImageNode: Node unselected, entering default mode');
        setToolbarMode('default');
        setForceOutpainted(false); // Reset when no outpainting connection
      }
      setUserClosedInpainting(false); // Reset so it can open again next time
      setUserClosedOutpainting(false); // Reset so it can open again next time
      
      // Reset the "first entry" flag when deselecting
      enteredInpaintOnceRef.current = false;
    }
  }, [selected, edges, nodes, id, userClosedInpainting, userClosedOutpainting, forceOutpainted]); // Depend on connections too

  // Track zoom changes in real time - when selected or hovered for performance
  useEffect(() => {
    if (!selected && !isHovered) return; // Only track zoom when selected or hovered

    let animationFrameId: number;

    const updateZoom = () => {
      const newZoom = getZoom();
      if (newZoom !== currentZoom) {
        setCurrentZoom(newZoom);
      }
      animationFrameId = requestAnimationFrame(updateZoom);
    };

    animationFrameId = requestAnimationFrame(updateZoom);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [getZoom, currentZoom, selected, isHovered]);



  // This effect is now handled in the main selection effect above



  // Temporarily set rotation to 0 when in painting mode for accurate brush tracking
  useEffect(() => {
    if (toolbarMode === 'inpainting') {
      // Entering painting mode - store original rotation and set to 0
      if (originalRotationRef.current === null) {
        originalRotationRef.current = rotation;
        if (rotation !== 0) {
          updateNodeData(id, {
            right_sidebar: {
              ...data?.right_sidebar,
              rotation: 0
            }
          });
        }
      }
    } else {
      // Exiting painting mode - restore original rotation
      if (originalRotationRef.current !== null) {
        updateNodeData(id, {
          right_sidebar: {
            ...data?.right_sidebar,
            rotation: originalRotationRef.current
          }
        });
        originalRotationRef.current = null;
      }
    }
  }, [toolbarMode, id, updateNodeData, data?.right_sidebar]);

  // Visual dimensions (updated in real-time during resize) - same as FrameNode
  const [visualWidth, setVisualWidth] = useState((data as ImageNodeData).width || 200);
  const [visualHeight, setVisualHeight] = useState((data as ImageNodeData).height || 200);

  // Store dimensions (only updated when resize is complete) - same as FrameNode
  const [storeWidth, setStoreWidth] = useState((data as ImageNodeData).width || 200);
  const [storeHeight, setStoreHeight] = useState((data as ImageNodeData).height || 200);

  const isResizing = useRef(false);

  // Get image properties with defaults
  const imageProps = data?.right_sidebar || {};
  const {
    visibility = true,
    opacity = 100,
    blendMode = 'normal',
    cornerRadius = 8,
    activeCorner = 'all',
    corners = {},
    imageUrl = '',
    imageName = 'Image',
    imageType = 'fill',
    strokeColor = '#FFFFFF',
    strokeWidth = 0,
    strokeStyle = 'solid',
    aspectRatioLocked = false,
    storedAspectRatio,
    rotation = 0,
    flipHorizontal = false,
    flipVertical = false
  } = imageProps;

  // Calculate individual corner values
  const getBorderRadius = () => {
    const { topLeft = cornerRadius, topRight = cornerRadius, bottomLeft = cornerRadius, bottomRight = cornerRadius } = corners;
    return `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
  };

  // Store original rotation when entering painting mode
  const originalRotationRef = useRef<number | null>(null);

  // Track image natural dimensions for proper canvas sizing
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        setImageNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = imageUrl;
    }
  }, [imageUrl]);

  // Save drawing data to node storage
  const saveDrawingData = () => {
    const canvas = paintingCanvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL('image/png');
      updateNodeData(id, {
        right_sidebar: {
          ...data?.right_sidebar,
          drawingData: dataURL,
          drawingDimensions: { width: canvas.width, height: canvas.height }
        }
      });
    }
  };

  // Load drawing data onto canvas
  const loadDrawingData = (canvas: HTMLCanvasElement) => {
    if (drawingData) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear canvas first
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Draw the stored image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      };
      img.src = drawingData;
    }
  };

  // Clear all drawing data
  const clearDrawingData = () => {
    const canvas = paintingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    updateNodeData(id, {
      right_sidebar: {
        ...data?.right_sidebar,
        drawingData: null,
        drawingDimensions: null
      }
    });
  };

  // Export drawing data for external use (e.g., by in-painting node)
  const getDrawingData = () => {
    return {
      dataURL: drawingData,
      dimensions: data?.right_sidebar?.drawingDimensions,
      imageDisplayBounds: imageNaturalDimensions.width > 0 ? getImageDisplayBounds(
        visualWidth,
        visualHeight,
        imageNaturalDimensions.width,
        imageNaturalDimensions.height,
        getObjectFit(imageType)
      ) : null
    };
  };

  // ---- add inside ImageNode component (below getDrawingData or nearby) ----
  const makeBWMaskDataUrl = async (): Promise<string | null> => {
    try {
      if (!drawingData || !imageNaturalDimensions.width || !imageNaturalDimensions.height) return null;

      const overlay = drawingData;
      const dims = data?.right_sidebar?.drawingDimensions;
      if (!overlay) return null;

      // create mask at the seed image's natural resolution
      const mask = document.createElement('canvas');
      mask.width = imageNaturalDimensions.width;
      mask.height = imageNaturalDimensions.height;
      const mctx = mask.getContext('2d');
      if (!mctx) return null;

      await new Promise<void>((resolve, reject) => {
        const src = new Image();
        src.onload = () => {
          // IMPORTANT: keep transparent background before thresholding
          mctx.clearRect(0, 0, mask.width, mask.height);

          // scale the overlay from display size -> natural size
          mctx.drawImage(src, 0, 0, dims.width, dims.height, 0, 0, mask.width, mask.height);

          // binarize by alpha of overlay
          const img = mctx.getImageData(0, 0, mask.width, mask.height);
          const d = img.data;
          for (let i = 0; i < d.length; i += 4) {
            const a = d[i + 3];
            const on = a > 8 ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = on; // black or white
            d[i + 3] = 255;                  // make opaque
          }
          mctx.putImageData(img, 0, 0);
          resolve();
        };
        src.onerror = reject;
        src.src = overlay;
      });

      return mask.toDataURL('image/png');
    } catch (err) {
      console.warn('makeBWMaskDataUrl failed', err);
      return null;
    }
  };

  // Add a handler that you can call from your "✓ / Apply mask" button in the inpainting toolbar
  const { runwareService } = useWorkflowStore();
  const { nodes: canvasNodes, edges: canvasEdges, updateNodeData: updateCanvasNode } = useCanvasStore();

  const persistMaskToInpaintTargets = async () => {
    try {
      // ensure strokes saved
      saveDrawingData();

      const maskDataUrl = await makeBWMaskDataUrl();
      if (!maskDataUrl) return;

      const svc = runwareService ?? (useWorkflowStore.getState() as any).runwareService;
      if (!svc) return;

      const maskUrl = await svc.uploadMaskDataUrl(maskDataUrl);
      // walk downstream and set mask on inpaint/outpaint
      // (works for direct edge or via connectors)
      // update: maskImage=url (for executor), maskPreviewUrl=data URL (for UI)
      
      // BFS to all downstream nodes until we hit inpaint/outpaint nodes
      const q = [id];
      const visited = new Set<string>(q);
      while (q.length) {
        const cur = q.shift()!;
        const outgoing = canvasEdges.filter(e => e.source === cur);
        for (const e of outgoing) {
          const n = canvasNodes.find(nn => nn.id === e.target);
          if (!n || visited.has(n.id)) continue;
          visited.add(n.id);

          const t = ((n.data?.type || n.type || '') + '').toLowerCase();
          if (t.includes('inpaint') || t.includes('outpaint')) {
            updateCanvasNode(n.id, {
              maskImage: maskUrl,
              maskPreviewUrl: maskDataUrl,
              data: { ...n.data, maskImage: maskUrl, maskPreviewUrl: maskDataUrl }
            });
          } else if (t.includes('connector')) {
            q.push(n.id);
          }
        }
      }
    } catch (err) {
      console.error('persistMaskToInpaintTargets failed', err);
    }
  };

  // Update dimensions when data changes from properties panel
  useEffect(() => {
    const newWidth = (data as ImageNodeData).width || 200;

    const newHeight = (data as ImageNodeData).height || 200;

    setVisualWidth(newWidth);
    setVisualHeight(newHeight);
    setStoreWidth(newWidth);
    setStoreHeight(newHeight);
  }, [data?.width, data?.height]);

  // Only update store when store dimensions change (not during active resize)
  useEffect(() => {
    if (!isResizing.current) {
      updateNodeData(id, { width: storeWidth, height: storeHeight });

      // Force React Flow to update edge positions after dimension change
      setTimeout(() => {
        const currentNodes = getNodes();
        const updatedNodes = currentNodes.map(node =>
          node.id === id
            ? { ...node, width: storeWidth, height: storeHeight }
            : node
        );
        setNodes(updatedNodes);
      }, 50); // Small delay to ensure store update is complete
    }
  }, [storeWidth, storeHeight, id, updateNodeData, getNodes, setNodes]);





  // Convert imageType to objectFit values
  const getObjectFit = (type: string): 'cover' | 'contain' | 'fill' => {
    switch (type) {
      case 'fill': return 'cover';    // Fill container, may crop
      case 'fit': return 'contain';   // Fit entire image, may have empty space
      case 'stretch': return 'fill';  // Stretch to fill exactly, may distort
      default: return 'cover';
    }
  };

  // Calculate actual image display bounds based on objectFit
  const getImageDisplayBounds = (containerWidth: number, containerHeight: number, imageWidth: number, imageHeight: number, objectFit: string) => {
    const containerAspect = containerWidth / containerHeight;
    const imageAspect = imageWidth / imageHeight;

    switch (objectFit) {
      case 'contain': {
        // Image fits entirely within container, may have letterboxing
        if (imageAspect > containerAspect) {
          // Image is wider, fit to width
          const displayWidth = containerWidth;
          const displayHeight = containerWidth / imageAspect;
          const offsetX = 0;
          const offsetY = (containerHeight - displayHeight) / 2;
          return { width: displayWidth, height: displayHeight, offsetX, offsetY };
        } else {
          // Image is taller, fit to height
          const displayHeight = containerHeight;
          const displayWidth = containerHeight * imageAspect;
          const offsetX = (containerWidth - displayWidth) / 2;
          const offsetY = 0;
          return { width: displayWidth, height: displayHeight, offsetX, offsetY };
        }
      }
      case 'cover': {
        // Image covers entire container, may be cropped
        if (imageAspect > containerAspect) {
          // Image is wider, fit to height and crop sides
          const displayHeight = containerHeight;
          const displayWidth = containerHeight * imageAspect;
          const offsetX = (containerWidth - displayWidth) / 2;
          const offsetY = 0;
          return { width: displayWidth, height: displayHeight, offsetX, offsetY };
        } else {
          // Image is taller, fit to width and crop top/bottom
          const displayWidth = containerWidth;
          const displayHeight = containerWidth / imageAspect;
          const offsetX = 0;
          const offsetY = (containerHeight - displayHeight) / 2;
          return { width: displayWidth, height: displayHeight, offsetX, offsetY };
        }
      }
      case 'fill':
      default:
        // Image stretches to fill exactly
        return { width: containerWidth, height: containerHeight, offsetX: 0, offsetY: 0 };
    }
  };

  // Calculate aspect-ratio-adjusted dimensions for outpaint mode
  let adjustedWidth = visualWidth;
  let adjustedHeight = visualHeight;

  // Store original dimensions when entering outpainting mode
  const originalDimensions = useRef<{ width: number; height: number } | null>(null);
  const prevToolbarMode = useRef(toolbarMode);
  const prevSelected = useRef(selected);

  if ((toolbarMode === 'outpainting' || toolbarMode === 'outpainted') && imageNaturalDimensions.width > 0 && imageNaturalDimensions.height > 0) {
    const imageAspectRatio = imageNaturalDimensions.width / imageNaturalDimensions.height;
    // Prioritize height - keep current height and adjust width based on image aspect ratio
    adjustedHeight = visualHeight;
    adjustedWidth = visualHeight * imageAspectRatio;
  }

  // Helper functions to convert between percentage and pixel values
  const percentToPx = (percent: number, dimension: number) => (percent / 100) * dimension;
  const pxToPercent = (px: number, dimension: number) => dimension > 0 ? (px / dimension) * 100 : 0;

  // Get padding values for outpaint mode (stored as percentages, converted to pixels)
  const paddingTopPercent = data?.right_sidebar?.paddingTop || 0;
  const paddingBottomPercent = data?.right_sidebar?.paddingBottom || 0;
  const paddingLeftPercent = data?.right_sidebar?.paddingLeft || 0;
  const paddingRightPercent = data?.right_sidebar?.paddingRight || 0;

  // Convert percentage values to pixels for rendering
  const paddingTop = percentToPx(paddingTopPercent, adjustedHeight);
  const paddingBottom = percentToPx(paddingBottomPercent, adjustedHeight);
  const paddingLeft = percentToPx(paddingLeftPercent, adjustedWidth);
  const paddingRight = percentToPx(paddingRightPercent, adjustedWidth);

  // Handle dimension changes for outpainting/outpainted modes based on selection state
  useEffect(() => {
    // Entering outpainting or outpainted mode - store original dimensions and apply new ones
    if ((toolbarMode === 'outpainting' || toolbarMode === 'outpainted') &&
      (prevToolbarMode.current !== 'outpainting' && prevToolbarMode.current !== 'outpainted') &&
      imageNaturalDimensions.width > 0 && imageNaturalDimensions.height > 0) {

      // Store original dimensions if not already stored
      if (!originalDimensions.current) {
        originalDimensions.current = {
          width: visualWidth,
          height: visualHeight
        };
      }

      const imageAspectRatio = imageNaturalDimensions.width / imageNaturalDimensions.height;
      const newWidth = visualHeight * imageAspectRatio;

      // Only update if the calculated width is significantly different
      if (Math.abs(newWidth - visualWidth) > 1) {
        isResizing.current = true;
        updateNodeData(id, {
          width: newWidth,
          height: visualHeight
        });
        setTimeout(() => {
          isResizing.current = false;
        }, 100);
      }
    }

    // Exiting outpainting/outpainted modes - restore original dimensions
    else if (originalDimensions.current &&
      toolbarMode !== 'outpainting' && toolbarMode !== 'outpainted') {

      const restoredWidth = originalDimensions.current.width;
      const restoredHeight = originalDimensions.current.height;

      isResizing.current = true;
      updateNodeData(id, {
        width: restoredWidth,
        height: restoredHeight
      });
      setTimeout(() => {
        isResizing.current = false;
        // Workaround: Update again with slightly different values to force edge repositioning
        updateNodeData(id, {
          width: restoredWidth + 0.1,
          height: restoredHeight + 0.1
        });
      }, 2);

      // Clear stored original dimensions
      originalDimensions.current = null;
    }

    // Update previous state references
    prevToolbarMode.current = toolbarMode;
    prevSelected.current = selected;
  }, [selected, toolbarMode, imageNaturalDimensions.width, imageNaturalDimensions.height, visualHeight, visualWidth, id, updateNodeData]);





  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: getObjectFit(imageType),
    opacity: opacity / 100,
    mixBlendMode: blendMode as any,
    display: visibility ? 'block' : 'none'
  };

  return (
    <div
      style={{
        width: (toolbarMode === 'outpainting' || toolbarMode === 'outpainted') ? `${adjustedWidth + paddingLeft + paddingRight}px` : `${adjustedWidth}px`,
        height: (toolbarMode === 'outpainting' || toolbarMode === 'outpainted') ? `${adjustedHeight + paddingTop + paddingBottom}px` : `${adjustedHeight}px`,
        position: 'relative',
        padding: (toolbarMode === 'outpainting' || toolbarMode === 'outpainted') ? `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px` : '0px',
        boxSizing: 'border-box',
        // Remove CSS border completely
        border: 'none',
        borderRadius: '0px',
        // Remove box-shadow border for outpainting modes (using separate element instead)
        boxShadow: 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={
        (toolbarMode === 'inpainting' && selectedTool !== 'hand')
          ? 'nodrag'
          : ''
      }
    >
      {/* Background image for padding area in outpainting/outpainted modes */}
      {(toolbarMode === 'outpainting' || toolbarMode === 'outpainted') && imageUrl && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(5px)',
            opacity: 0.1,
            zIndex: 0,
            borderRadius: getBorderRadius()
          }}
        />
      )}

      {/* SVG 3x3 Grid overlay for OutPaint mode only (not OutPainted mode) - zoom relative */}
      {toolbarMode === 'outpainting' && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
            pointerEvents: 'none'
          }}
          viewBox={`0 0 ${adjustedWidth + paddingLeft + paddingRight} ${adjustedHeight + paddingTop + paddingBottom}`}
        >
          {/* Vertical grid lines */}
          <line
            x1={(adjustedWidth + paddingLeft + paddingRight) * 0.3333}
            y1={0}
            x2={(adjustedWidth + paddingLeft + paddingRight) * 0.3333}
            y2={adjustedHeight + paddingTop + paddingBottom}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={1 / currentZoom}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={(adjustedWidth + paddingLeft + paddingRight) * 0.6666}
            y1={0}
            x2={(adjustedWidth + paddingLeft + paddingRight) * 0.6666}
            y2={adjustedHeight + paddingTop + paddingBottom}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={1 / currentZoom}
            vectorEffect="non-scaling-stroke"
          />

          {/* Horizontal grid lines */}
          <line
            x1={0}
            y1={(adjustedHeight + paddingTop + paddingBottom) * 0.3333}
            x2={adjustedWidth + paddingLeft + paddingRight}
            y2={(adjustedHeight + paddingTop + paddingBottom) * 0.3333}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={1 / currentZoom}
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={0}
            y1={(adjustedHeight + paddingTop + paddingBottom) * 0.6666}
            x2={adjustedWidth + paddingLeft + paddingRight}
            y2={(adjustedHeight + paddingTop + paddingBottom) * 0.6666}
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={1 / currentZoom}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {/* SVG Border overlay for outpainting/outpainted modes - always on top */}
      {(toolbarMode === 'outpainting' || toolbarMode === 'outpainted') && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 15
          }}
          viewBox={`0 0 ${adjustedWidth + paddingLeft + paddingRight} ${adjustedHeight + paddingTop + paddingBottom}`}
        >
          {/* Border stroke */}
          <rect
            x={0}
            y={0}
            width={adjustedWidth + paddingLeft + paddingRight}
            height={adjustedHeight + paddingTop + paddingBottom}
            fill="none"
            stroke={toolbarMode === 'outpainted' ? 'rgba(255, 255, 255, 0.15)' : '#007AFF'}
            strokeWidth={2 / currentZoom}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {/* Inner node container */}
      <div
        style={{
          width: `${adjustedWidth}px`,
          height: `${adjustedHeight}px`,
          position: 'relative',
          background: 'transparent',
          border: 'none',
          borderRadius: '0px',
          overflow: 'visible',
          boxSizing: 'border-box',
          zIndex: 1
        }}
      >
        {/* Image container with rounded corners and clipping */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: getBorderRadius(),
            overflow: 'hidden',
            background: imageUrl ? 'transparent' : '#2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: strokeWidth > 0 ? `${strokeWidth}px ${strokeStyle} ${strokeColor}` : 'none',
            boxSizing: 'border-box',
            transform: `rotate(${rotation}deg) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
            transformOrigin: 'center center',
            position: 'relative'
          }}
        >
          {/* Image content */}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={imageName}
              style={imageStyle}
              draggable={false}
            />
          ) : (
            <div style={{
              color: '#9e9e9e',
              fontSize: '14px',
              textAlign: 'center',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}>
              Drop image here
            </div>
          )}

          {/* Painting canvas with proper coordinate tracking */}
          {toolbarMode === 'inpainting' && imageUrl && imageNaturalDimensions.width > 0 && (() => {
            // Calculate actual image display bounds based on imageType
            const imageDisplayBounds = getImageDisplayBounds(
              visualWidth,
              visualHeight,
              imageNaturalDimensions.width,
              imageNaturalDimensions.height,
              getObjectFit(imageType)
            );

            return (
              <canvas
                ref={(canvas) => {
                  paintingCanvasRef.current = canvas;
                  // Load existing drawing data when canvas is created
                  if (canvas) {
                    // Use setTimeout to ensure canvas is fully rendered
                    setTimeout(() => loadDrawingData(canvas), 0);
                  }
                }}
                width={imageDisplayBounds.width}
                height={imageDisplayBounds.height}
                style={{
                  position: 'absolute',
                  top: `${imageDisplayBounds.offsetY}px`,
                  left: `${imageDisplayBounds.offsetX}px`,
                  width: `${imageDisplayBounds.width}px`,
                  height: `${imageDisplayBounds.height}px`,
                  cursor: selectedTool === 'hand' ? 'grab' : 'crosshair',
                  zIndex: 10,
                  mixBlendMode: 'screen',
                  opacity: 0.5,
                  pointerEvents: 'auto'
                }}
                onMouseDown={(e) => {
                  // Only handle drawing for brush and eraser tools
                  if (selectedTool === 'hand') return;

                  e.stopPropagation();
                  setIsDrawing(true);

                  const canvas = e.currentTarget;
                  const rect = canvas.getBoundingClientRect();
                  const scaleX = canvas.width / rect.width;
                  const scaleY = canvas.height / rect.height;

                  // Get mouse position relative to canvas (now properly sized to image bounds)
                  let x = (e.clientX - rect.left) * scaleX;
                  let y = (e.clientY - rect.top) * scaleY;

                  // Transform coordinates to account for image transforms
                  const centerX = canvas.width / 2;
                  const centerY = canvas.height / 2;

                  // Translate to origin
                  x -= centerX;
                  y -= centerY;

                  // Apply inverse transforms in reverse order
                  // 1. Inverse flip
                  if (flipHorizontal) x = -x;
                  if (flipVertical) y = -y;

                  // 2. Inverse rotation
                  const rotationRad = (-rotation * Math.PI) / 180; // Negative for inverse
                  const rotatedX = x * Math.cos(rotationRad) - y * Math.sin(rotationRad);
                  const rotatedY = x * Math.sin(rotationRad) + y * Math.cos(rotationRad);

                  // Translate back from origin
                  const finalX = rotatedX + centerX;
                  const finalY = rotatedY + centerY;

                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    // Reset last draw point for new stroke
                    lastDrawPointRef.current = null;
                    drawWithTool(ctx, finalX, finalY, selectedTool, true);
                  }

                  console.log(`${selectedTool} drawing at transformed coords:`, finalX, finalY);
                }}
                onMouseMove={(e) => {
                  // Only handle drawing for brush and eraser tools
                  if (selectedTool === 'hand') return;

                  e.stopPropagation();

                  if (!isDrawing) return;

                  const canvas = e.currentTarget;
                  const rect = canvas.getBoundingClientRect();
                  const scaleX = canvas.width / rect.width;
                  const scaleY = canvas.height / rect.height;

                  // Get mouse position relative to canvas (now properly sized to image bounds)
                  let x = (e.clientX - rect.left) * scaleX;
                  let y = (e.clientY - rect.top) * scaleY;

                  // Transform coordinates to account for image transforms
                  const centerX = canvas.width / 2;
                  const centerY = canvas.height / 2;

                  // Translate to origin
                  x -= centerX;
                  y -= centerY;

                  // Apply inverse transforms in reverse order
                  // 1. Inverse flip
                  if (flipHorizontal) x = -x;
                  if (flipVertical) y = -y;

                  // 2. Inverse rotation
                  const rotationRad = (-rotation * Math.PI) / 180; // Negative for inverse
                  const rotatedX = x * Math.cos(rotationRad) - y * Math.sin(rotationRad);
                  const rotatedY = x * Math.sin(rotationRad) + y * Math.cos(rotationRad);

                  // Translate back from origin
                  const finalX = rotatedX + centerX;
                  const finalY = rotatedY + centerY;

                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    drawWithTool(ctx, finalX, finalY, selectedTool, false);
                  }
                }}
                onMouseUp={(e) => {
                  // Only handle drawing for brush and eraser tools
                  if (selectedTool === 'hand') return;

                  e.stopPropagation();
                  setIsDrawing(false);
                  lastDrawPointRef.current = null; // Reset for next stroke
                  // Save drawing data when user finishes drawing
                  saveDrawingData();
                }}
                onMouseLeave={(e) => {
                  // Only handle drawing for brush and eraser tools
                  if (selectedTool === 'hand') return;

                  e.stopPropagation();
                  if (isDrawing) {
                    setIsDrawing(false);
                    lastDrawPointRef.current = null; // Reset for next stroke
                    // Save drawing data if user was drawing when leaving canvas
                    saveDrawingData();
                  }
                }}
              />
            );
          })()}
        </div>

        {/* Custom SVG Border Overlay - always present for smooth transitions (not in outpaint modes) */}
        {toolbarMode !== 'outpainting' && toolbarMode !== 'outpainted' && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 99999999 // High z-index to ensure it's on top
            }}
            viewBox={`0 0 ${adjustedWidth} ${adjustedHeight}`}
          >
            {/* Border stroke with smooth transitions */}
            <rect
              x={0}
              y={0}
              width={adjustedWidth}
              height={adjustedHeight}
              fill="none"
              stroke="#3b82f6"
              strokeOpacity={
                selected
                  ? 1
                  : isHovered
                    ? 0.5
                    : 0
              }
              strokeWidth={2 / currentZoom}
              vectorEffect="non-scaling-stroke"
              style={{
                transition: 'stroke-opacity 10ms ease-out',
                transitionDelay: isHovered && !selected ? '5ms' : '0ms'
              }}
            />
          </svg>
        )}

        {/* SVG Corner Boxes - zoom relative (not in outpaint modes) */}
        {selected && toolbarMode !== 'outpainting' && toolbarMode !== 'outpainted' && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 999999999999,
              overflow: 'visible'
            }}
            viewBox={`0 0 ${adjustedWidth} ${adjustedHeight}`}
          >
            {/* Top-left corner */}
            <rect
              x={-3.5 / currentZoom}
              y={-3.5 / currentZoom}
              width={7 / currentZoom}
              height={7 / currentZoom}
              fill="white"
              stroke="#3b82f6"
              strokeWidth={1 / currentZoom}
            />
            {/* Top-right corner */}
            <rect
              x={adjustedWidth - 3.5 / currentZoom}
              y={-3.5 / currentZoom}
              width={7 / currentZoom}
              height={7 / currentZoom}
              fill="white"
              stroke="#3b82f6"
              strokeWidth={1 / currentZoom}
            />
            {/* Bottom-left corner */}
            <rect
              x={-3.5 / currentZoom}
              y={adjustedHeight - 3.5 / currentZoom}
              width={7 / currentZoom}
              height={7 / currentZoom}
              fill="white"
              stroke="#3b82f6"
              strokeWidth={1 / currentZoom}
            />
            {/* Bottom-right corner */}
            <rect
              x={adjustedWidth - 3.5 / currentZoom}
              y={adjustedHeight - 3.5 / currentZoom}
              width={7 / currentZoom}
              height={7 / currentZoom}
              fill="white"
              stroke="#3b82f6"
              strokeWidth={1 / currentZoom}
            />
          </svg>
        )}

        {/* Resize handles - only visible when selected and NOT in outpaint/outpainted modes */}
        {selected && toolbarMode !== 'outpainting' && toolbarMode !== 'outpainted' && (
          <>
            <NodeResizer
              isVisible={selected}
              minWidth={1}
              minHeight={1}
              lineStyle={{
                borderColor: 'transparent', // Hide the default border since we use SVG
                borderWidth: '0px'
              }}
              handleStyle={{
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                width: `${8 / currentZoom}px`,
                height: `${8 / currentZoom}px`,
                borderWidth: `${1.5 / currentZoom}px`,
                borderRadius: '0px',
                zIndex: '999999999999',
              }}
              keepAspectRatio={aspectRatioLocked}
              onResizeStart={() => {
                isResizing.current = true;
              }}
              onResize={(_, params) => {
                // Update visual dimensions immediately for smooth UX
                if (aspectRatioLocked && storedAspectRatio) {
                  // When aspect ratio is locked, calculate proper dimensions
                  // Use the larger dimension change to determine the resize direction
                  const currentAspectRatio = visualWidth / visualHeight;
                  const targetAspectRatio = storedAspectRatio;

                  // Determine which dimension changed more significantly
                  const widthChange = Math.abs(params.width - visualWidth);
                  const heightChange = Math.abs(params.height - visualHeight);

                  let newWidth, newHeight;

                  if (widthChange >= heightChange) {
                    // Width-driven resize
                    newWidth = params.width;
                    newHeight = newWidth / targetAspectRatio;
                  } else {
                    // Height-driven resize
                    newHeight = params.height;
                    newWidth = newHeight * targetAspectRatio;
                  }

                  setVisualWidth(newWidth);
                  setVisualHeight(newHeight);
                } else {
                  // Free resize when unlocked
                  setVisualWidth(params.width);
                  setVisualHeight(params.height);
                }
              }}
              onResizeEnd={(_, params) => {
                isResizing.current = false;
                // Update store dimensions only when resize is complete
                if (aspectRatioLocked && storedAspectRatio) {
                  // When aspect ratio is locked, calculate proper dimensions
                  const currentAspectRatio = storeWidth / storeHeight;
                  const targetAspectRatio = storedAspectRatio;

                  // Determine which dimension changed more significantly
                  const widthChange = Math.abs(params.width - storeWidth);
                  const heightChange = Math.abs(params.height - storeHeight);

                  let newWidth, newHeight;

                  if (widthChange >= heightChange) {
                    // Width-driven resize
                    newWidth = params.width;
                    newHeight = newWidth / targetAspectRatio;
                  } else {
                    // Height-driven resize
                    newHeight = params.height;
                    newWidth = newHeight * targetAspectRatio;
                  }

                  setStoreWidth(newWidth);
                  setStoreHeight(newHeight);
                } else {
                  // Free resize when unlocked
                  setStoreWidth(params.width);
                  setStoreHeight(params.height);
                }
              }}
            />
          </>
        )}

      </div>

      {/* Dynamic NodeToolbar based on mode - positioned on outer container */}
      {/* Only show toolbar when selected (not in outpainted mode) */}
      <NodeToolbar
        isVisible={selected && toolbarMode !== 'outpainted'}
        position="bottom"
        offset={8}
      >
        <div
          style={{
            transform: toolbarMode === 'outpainting' ?
              `translate(${paddingLeft * currentZoom}px, ${(paddingTop + paddingBottom) * currentZoom}px)` :
              'none'
          }}
        >
          {toolbarMode === 'default' ? (
            // Default toolbar - shows dimensions
            <div
              style={{
                background: '#007AFF',
                color: 'white',
                padding: '0px 6px',
                borderRadius: '16px',
                fontSize: '10px',
                fontWeight: '500',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                whiteSpace: 'nowrap',
                userSelect: 'none'
              }}
            >
              {Math.round(adjustedWidth)} × {Math.round(adjustedHeight)}
            </div>
          ) : toolbarMode === 'outpainting' ? (
            // Out-painting toolbar with ratio selector
            <div
              style={{
                background: '#007AFF',
                borderRadius: '24px',
                padding: '0px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                userSelect: 'none'
              }}
            >
              {/* Ratio selector */}
              <div className="flex rounded-full h-full p-0.5" style={{ minWidth: '140px' }}>
                {ratioOptions.map((r) => {
                  // Use ImageNode's own ratio property
                  const currentRatio = data?.right_sidebar?.ratio || '1:1';

                  // Create dynamic shape with appropriate colors
                  const isActive = currentRatio === r;
                  const borderColor = isActive ? '#0D0D0D' : 'white';

                  const dynamicShape = (() => {
                    switch (r) {
                      case '1:1':
                        return <div className="w-3.5 h-3.5 bg-transparent rounded-sm aspect-square" style={{ border: `1px solid ${borderColor}` }} />;
                      case '2:3':
                        return <div className="h-3.5 w-auto aspect-[2/3] bg-transparent rounded-sm" style={{ border: `1px solid ${borderColor}` }} />;
                      case '3:2':
                        return <div className="w-3.5 h-auto aspect-[3/2] bg-transparent rounded-sm" style={{ border: `1px solid ${borderColor}` }} />;
                      case '9:16':
                        return <div className="h-3.5 w-auto aspect-[9/16] bg-transparent rounded-sm" style={{ border: `1px solid ${borderColor}` }} />;
                      case '16:9':
                        return <div className="w-3.5 h-auto aspect-[16/9] bg-transparent rounded-sm" style={{ border: `1px solid ${borderColor}` }} />;
                      default:
                        return <div className="w-3.5 h-3.5 bg-transparent rounded-sm aspect-square" style={{ border: `1px solid ${borderColor}` }} />;
                    }
                  })();

                  return (
                    <button
                      key={r}
                      onClick={() => {
                        // Calculate padding based on ratio
                        const calculatePadding = (targetRatio: string) => {
                          // Parse the ratio (e.g., "1:2" -> [1, 2])
                          const [widthRatio, heightRatio] = targetRatio.split(':').map(Number);
                          const targetAspectRatio = widthRatio / heightRatio;

                          // Get current image dimensions (without padding)
                          const currentWidth = visualWidth;
                          const currentHeight = visualHeight;
                          const currentAspectRatio = currentWidth / currentHeight;

                          let paddingTop = 0;
                          let paddingBottom = 0;
                          let paddingLeft = 0;
                          let paddingRight = 0;

                          if (targetAspectRatio > currentAspectRatio) {
                            // Target is wider - need to add width (left/right padding)
                            const targetWidth = currentHeight * targetAspectRatio;
                            const totalPaddingWidth = targetWidth - currentWidth;
                            paddingLeft = totalPaddingWidth / 2;
                            paddingRight = totalPaddingWidth / 2;
                          } else if (targetAspectRatio < currentAspectRatio) {
                            // Target is taller - need to add height (top/bottom padding)
                            const targetHeight = currentWidth / targetAspectRatio;
                            const totalPaddingHeight = targetHeight - currentHeight;
                            paddingTop = totalPaddingHeight / 2;
                            paddingBottom = totalPaddingHeight / 2;
                          }
                          // If ratios are equal, no padding needed (all remain 0)

                          // Convert to percentages for storage
                          return {
                            paddingTop: (paddingTop / currentHeight) * 100,
                            paddingBottom: (paddingBottom / currentHeight) * 100,
                            paddingLeft: (paddingLeft / currentWidth) * 100,
                            paddingRight: (paddingRight / currentWidth) * 100
                          };
                        };

                        const newPadding = calculatePadding(r);

                        // Update the ImageNode's ratio property and padding
                        updateNodeData(id, {
                          right_sidebar: {
                            ...data?.right_sidebar,
                            ratio: r,
                            paddingTop: newPadding.paddingTop,
                            paddingBottom: newPadding.paddingBottom,
                            paddingLeft: newPadding.paddingLeft,
                            paddingRight: newPadding.paddingRight,
                          },
                        });

                        // Add 0.01 to width and height properties after 2ms
                        setTimeout(() => {
                          updateNodeData(id, {
                            width: (data?.width || 200) + 0.01,
                            height: (data?.height || 200) + 0.01
                          });
                        }, 2);
                      }}
                      style={{
                        background: isActive ? 'white' : 'transparent'
                      }}
                      className="flex-1 h-full flex items-center justify-center rounded-full transition-all"
                    >
                      {dynamicShape}
                    </button>
                  );
                })}
              </div>

              {/* Current ratio text */}
              <span
                style={{
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '500',
                  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  whiteSpace: 'nowrap',
                  marginLeft: '8px',
                  marginRight: '4px',
                  minWidth: '20px'
                }}
              >
                {data?.right_sidebar?.ratio || '1:1'}
              </span>

              {/* White divider */}
              <div
                style={{
                  width: '1px',
                  height: '14px',
                  background: 'rgba(255, 255, 255, 0.3)',
                  marginLeft: '6px',
                  marginRight: '6px'
                }}
              />

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('DEBUG: Close button clicked, transitioning to outpainted mode');
                  // Don't set userClosedOutpainting to true - we want outpainted mode to activate

                  // Force outpainted mode
                  setForceOutpainted(true);

                  // Use canvas store to deselect
                  setSelectedNode(null);

                  // Use ReactFlow's method to ensure proper deselection
                  const currentNodes = getNodes();
                  const updatedNodes = currentNodes.map(node => ({
                    ...node,
                    selected: node.id === id ? false : node.selected
                  }));
                  setNodes(updatedNodes);
                }}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  marginLeft: '0px',
                  marginRight: '6px'
                }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            // In-painting toolbar - shows brush/eraser tools
            <div
              style={{
                background: '#007AFF',
                borderRadius: '24px',
                padding: '2px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                userSelect: 'none'
              }}
            >
              {/* Hand tool button */}
              <button
                onClick={() => {
                  setSelectedTool('hand');
                  console.log('DEBUG: Hand tool selected');
                }}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: selectedTool === 'hand' ? 'white' : 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: selectedTool === 'hand' ? '#0D0D0D' : 'white'
                }}
              >
                {/* Hand icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                  <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
                  <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                  <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                </svg>
              </button>

              {/* Brush tool button */}
              <button
                onClick={() => {
                  setSelectedTool('brush');
                  console.log('DEBUG: Brush tool selected');
                }}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: selectedTool === 'brush' ? 'white' : 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: selectedTool === 'brush' ? '#0D0D0D' : 'white'
                }}
              >
                {/* Brush icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
                  <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08-2.34 2.91-4.02 5-5.04z" />
                </svg>
              </button>

              {/* Eraser tool button */}
              <button
                onClick={() => {
                  setSelectedTool('eraser');
                  console.log('DEBUG: Eraser tool selected');
                }}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: selectedTool === 'eraser' ? 'white' : 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: selectedTool === 'eraser' ? '#0D0D0D' : 'white'
                }}
              >
                {/* Eraser icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 21h10" />
                  <path d="M5.5 21L2 17.5c-.8-.8-.8-2.2 0-3L8.5 8l8 8-4.5 4.5c-.4.4-.9.5-1.4.5H5.5z" />
                </svg>
              </button>

              {/* Clear button */}
              <button
                onClick={() => {
                  clearDrawingData();
                  console.log('DEBUG: Drawing cleared');
                }}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white'
                }}
                title="Clear drawing"
              >
                {/* Clear/Trash icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>

              {/* White divider */}
              <div
                style={{
                  width: '1px',
                  height: '14px',
                  background: 'rgba(255, 255, 255, 0.3)',
                  marginLeft: '6px',
                  marginRight: '6px'
                }}
              />

              {/* Close button */}
              <button
                onClick={async () => {
                  console.log('DEBUG: Close button clicked, exiting painting mode');
                  // Save the mask before closing
                  await persistMaskToInpaintTargets();
                  setUserClosedInpainting(true);
                  setToolbarMode('default');
                }}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  marginLeft: '0px',
                  marginRight: '6px'
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </NodeToolbar>

      {/* Functional handles without color */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={true}
        style={{
          width: `40px`,
          height: `40px`,
          borderRadius: '0%',
          backgroundColor: 'transparent',
          opacity: 0,
          border: 'none',
          left: '-40px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10
        }}
      />

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={true}
        style={{
          width: `40px`,
          height: `40px`,
          borderRadius: '0%',
          backgroundColor: 'transparent',
          opacity: 0,
          border: 'none',
          right: '-40px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10
        }}
      />

      {/* SVG Blue Balls - always present for smooth transitions - zoom relative */}
      {/* Left edge ball */}
      <svg
        style={{
          position: 'absolute',
          left: '-40px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: `${10 / currentZoom}px`,
          height: `${10 / currentZoom}px`,
          pointerEvents: 'none',
          zIndex: 11,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 10ms ease-out',
          transitionDelay: isHovered ? '5ms' : '0ms'
        }}
        viewBox="0 0 25 25"
      >
        <circle
          cx="12.5"
          cy="12.5"
          r="12.5"
          fill="#007AFF"
        />
      </svg>

      {/* Right edge ball */}
      <svg
        style={{
          position: 'absolute',
          right: '-40px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: `${10 / currentZoom}px`,
          height: `${10 / currentZoom}px`,
          pointerEvents: 'none',
          zIndex: 11,
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 10ms ease-out',
          transitionDelay: isHovered ? '5ms' : '0ms'
        }}
        viewBox="0 0 25 25"
      >
        <circle
          cx="12.5"
          cy="12.5"
          r="12.5"
          fill="#007AFF"
        />
      </svg>

      {/* SVG padding draggers for outpaint mode - zoom relative */}
      {/* Only show padding draggers when selected and in outpainting mode (not in outpainted mode) */}
      {selected && toolbarMode === 'outpainting' && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 20,
            overflow: 'visible'
          }}
          viewBox={`0 0 ${adjustedWidth + paddingLeft + paddingRight} ${adjustedHeight + paddingTop + paddingBottom}`}
        >
          {/* Top dragger */}
          <rect
            x={(adjustedWidth + paddingLeft + paddingRight) / 2 - 16 / currentZoom}
            y={-4 / currentZoom}
            width={32 / currentZoom}
            height={8 / currentZoom}
            fill="#007AFF"
            rx={4 / currentZoom}
            style={{ cursor: 'ns-resize', pointerEvents: 'all' }}
            className="nodrag"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const startY = e.clientY;
              const startPaddingPx = paddingTop;
              const startPaddingPercent = paddingTopPercent;

              const handleMouseMove = (e: MouseEvent) => {
                e.preventDefault();
                const deltaY = startY - e.clientY; // Dragging up increases top padding
                const newPaddingPx = Math.max(0, startPaddingPx + deltaY);
                const newPaddingPercent = pxToPercent(newPaddingPx, adjustedHeight);

                updateNodeData(id, {
                  right_sidebar: { ...data?.right_sidebar, paddingTop: newPaddingPercent }
                });
              };

              const handleMouseUp = (e: MouseEvent) => {
                e.preventDefault();
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);

                // Add 0.01 to width and height properties after 2ms
                setTimeout(() => {
                  updateNodeData(id, {
                    width: (data?.width || 200) + 0.01,
                    height: (data?.height || 200) + 0.01
                  });
                }, 2);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />

          {/* Bottom dragger */}
          <rect
            x={(adjustedWidth + paddingLeft + paddingRight) / 2 - 16 / currentZoom}
            y={adjustedHeight + paddingTop + paddingBottom - 4 / currentZoom}
            width={32 / currentZoom}
            height={8 / currentZoom}
            fill="#007AFF"
            rx={4 / currentZoom}
            style={{ cursor: 'ns-resize', pointerEvents: 'all' }}
            className="nodrag"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const startY = e.clientY;
              const startPaddingPx = paddingBottom;
              const startPaddingPercent = paddingBottomPercent;

              const handleMouseMove = (e: MouseEvent) => {
                e.preventDefault();
                const deltaY = e.clientY - startY;
                const newPaddingPx = Math.max(0, startPaddingPx + deltaY);
                const newPaddingPercent = pxToPercent(newPaddingPx, adjustedHeight);

                updateNodeData(id, {
                  right_sidebar: { ...data?.right_sidebar, paddingBottom: newPaddingPercent }
                });
              };

              const handleMouseUp = (e: MouseEvent) => {
                e.preventDefault();
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);

                // Add 0.01 to width and height properties after 2ms
                setTimeout(() => {
                  updateNodeData(id, {
                    width: (data?.width || 200) + 0.01,
                    height: (data?.height || 200) + 0.01
                  });
                }, 2);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />

          {/* Left dragger */}
          <rect
            x={-4 / currentZoom}
            y={(adjustedHeight + paddingTop + paddingBottom) / 2 - 16 / currentZoom}
            width={8 / currentZoom}
            height={32 / currentZoom}
            fill="#007AFF"
            rx={4 / currentZoom}
            style={{ cursor: 'ew-resize', pointerEvents: 'all' }}
            className="nodrag"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const startX = e.clientX;
              const startPaddingPx = paddingLeft;
              const startPaddingPercent = paddingLeftPercent;

              const handleMouseMove = (e: MouseEvent) => {
                e.preventDefault();
                const deltaX = startX - e.clientX; // Dragging left increases left padding
                const newPaddingPx = Math.max(0, startPaddingPx + deltaX);
                const newPaddingPercent = pxToPercent(newPaddingPx, adjustedWidth);

                updateNodeData(id, {
                  right_sidebar: { ...data?.right_sidebar, paddingLeft: newPaddingPercent }
                });
              };

              const handleMouseUp = (e: MouseEvent) => {
                e.preventDefault();
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);

                // Add 0.01 to width and height properties after 2ms
                setTimeout(() => {
                  updateNodeData(id, {
                    width: (data?.width || 200) + 0.01,
                    height: (data?.height || 200) + 0.01
                  });
                }, 2);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />

          {/* Right dragger */}
          <rect
            x={adjustedWidth + paddingLeft + paddingRight - 4 / currentZoom}
            y={(adjustedHeight + paddingTop + paddingBottom) / 2 - 16 / currentZoom}
            width={8 / currentZoom}
            height={32 / currentZoom}
            fill="#007AFF"
            rx={4 / currentZoom}
            style={{ cursor: 'ew-resize', pointerEvents: 'all' }}
            className="nodrag"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const startX = e.clientX;
              const startPaddingPx = paddingRight;
              const startPaddingPercent = paddingRightPercent;

              const handleMouseMove = (e: MouseEvent) => {
                e.preventDefault();
                const deltaX = e.clientX - startX;
                const newPaddingPx = Math.max(0, startPaddingPx + deltaX);
                const newPaddingPercent = pxToPercent(newPaddingPx, adjustedWidth);

                updateNodeData(id, {
                  right_sidebar: { ...data?.right_sidebar, paddingRight: newPaddingPercent }
                });
              };

              const handleMouseUp = (e: MouseEvent) => {
                e.preventDefault();
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);

                // Add 0.01 to width and height properties after 2ms
                setTimeout(() => {
                  updateNodeData(id, {
                    width: (data?.width || 200) + 0.01,
                    height: (data?.height || 200) + 0.01
                  });
                }, 2);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        </svg>
      )}


    </div>
  );
});

ImageNode.displayName = 'ImageNode';

export default ImageNode;