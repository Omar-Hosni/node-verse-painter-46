// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeResizer, NodeToolbar, useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useWorkflowStore } from '@/store/workflowStore';
import SvgIcon from '../SvgIcon';
import { NodeProcessingIndicator } from '@/components/NodeProcessingIndicator';

export const PreviewNode: React.FC<NodeProps> = React.memo(({
  id,
  data,
  selected
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [width, setWidth] = useState(data?.width || 300);
  const [height, setHeight] = useState(data?.height || 300);
  const [currentZoom, setCurrentZoom] = useState(1);
  const { updateNodeData } = useCanvasStore();
  const { getProcessedImage } = useWorkflowStore();
  const { getNodes, getEdges, getZoom } = useReactFlow();

  // Get rotation, flip, and aspect ratio values from data
  const rotation = data?.rotation || 0;
  const flipHorizontal = data?.flipHorizontal || false;
  const flipVertical = data?.flipVertical || false;
  const aspectRatioLocked = data?.aspectRatioLocked || false;
  const storedAspectRatio = data?.storedAspectRatio;

  // Update node data when dimensions change
  useEffect(() => {
    updateNodeData(id, { width, height });
  }, [width, height, id, updateNodeData]);

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

  // Update local state when data changes (from properties panel)
  useEffect(() => {
    if (data?.width !== undefined && data?.width !== width) {
      setWidth(data.width);
    }
    if (data?.height !== undefined && data?.height !== height) {
      setHeight(data.height);
    }
  }, [data?.width, data?.height]);

  // Function to get connected images from input nodes
  const getConnectedImages = () => {
    const edges = getEdges();
    const nodes = getNodes();

    // Find edges where this preview node is the target (receiving input)
    const inputEdges = edges.filter(edge => edge.target === id);

    const connectedImages: Array<{
      imageUrl: string;
      displayName: string;
      nodeId: string;
    }> = [];

    // Look for connected nodes and their processed images
    for (const edge of inputEdges) {
      const sourceNode = nodes.find(node => node.id === edge.source);
      if (sourceNode) {
        // First check for processed images from workflow execution
        const processedImage = getProcessedImage(sourceNode.id);
        
        if (processedImage) {
          connectedImages.push({
            imageUrl: processedImage,
            displayName: (sourceNode.data as any)?.displayName || 'Generated Image',
            nodeId: sourceNode.id
          });
        } else if (sourceNode.type === 'image-node') {
          // Fallback to original image from image node's right_sidebar
          const imageUrl = (sourceNode.data as any)?.right_sidebar?.imageUrl;
          if (imageUrl) {
            connectedImages.push({
              imageUrl,
              displayName: (sourceNode.data as any)?.displayName || 'Connected Image',
              nodeId: sourceNode.id
            });
          }
        }
      }
    }

    return connectedImages;
  };

  // Get connected images data - this will update when edges change
  const connectedImages = getConnectedImages();

  // Compare mode state
  const [compareSliderPosition, setCompareSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  // Force re-render when edges change by using edges as dependency
  const edges = getEdges();
  const nodes = getNodes();

  useEffect(() => {
    // This effect will run whenever edges or nodes change, 
    // ensuring the preview updates when connections are made/broken
  }, [edges, nodes]);



  // Check for processed image for this preview node itself
  const ownProcessedImage = getProcessedImage(id);

  // Determine display mode and image data
  const isCompareMode = connectedImages.length >= 2;
  const hasImage = connectedImages.length > 0 ||
  Boolean(
    ownProcessedImage ||
    (data as any)?.generatedImage ||
    (data as any)?.image ||
    (data as any)?.imageUrl
  );

const singleImageSource = ownProcessedImage ||
  connectedImages[0]?.imageUrl ||
  (data as any)?.generatedImage ||
  (data as any)?.image ||
  (data as any)?.imageUrl;
  
  const singleImageDisplayName = ownProcessedImage ? 'Generated Result' : (connectedImages[0]?.displayName || (data as any)?.displayName || 'Image Layer');

  // Handle slider drag - simplified with React Flow's nodrag class
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleSliderMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setCompareSliderPosition(percentage);
  };

  const handleSliderMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse move and up listeners for smooth dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const compareContainer = document.querySelector(`[data-node-id="${id}"] .compare-container`);
        if (compareContainer) {
          const rect = compareContainer.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
          setCompareSliderPosition(percentage);
        }
      };

      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, id]);

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative',
        border: 'none', // Remove CSS border completely
        borderRadius: '0px',
        overflow: 'visible',
        boxSizing: 'border-box'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-node-id={id}
    >
      {/* Node Processing Indicator */}
      <NodeProcessingIndicator nodeId={id} />
      
      {/* Main content container - ROTATED */}
      <div
        className={`inline-flex flex-col gap-1.5 items-start relative w-full h-full ${((data as any)?.viewMode || 'card') === 'image' ? 'bg-transparent' : 'bg-[#0D0D0D]'
          }`}
        style={{
          padding: ((data as any)?.viewMode || 'card') === 'image' ? '0px' : '18px 18px 0px 18px',
          borderRadius: ((data as any)?.viewMode || 'card') === 'image' ? '0px' : '40px',
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center'
        }}
      >
        {/* First element: Current preview box */}
        <div
          className={`overflow-hidden w-full h-full ${((data as any)?.viewMode || 'card') === 'image' ? 'bg-[#0D0D0D] rounded-lg' : 'bg-[#151515] rounded-[24px]'
            }`}
        >
          {hasImage ? (
            isCompareMode ? (
              // Compare Mode - Two images with slider
              <div
                className="w-full h-full relative cursor-col-resize compare-container nodrag"
                onMouseMove={handleSliderMouseMove}
                onMouseUp={handleSliderMouseUp}
              >
                {/* First image (left side) */}
                <div className="absolute inset-0" style={{ zIndex: 1 }}>
                  <img
                    src={connectedImages[0]?.imageUrl}
                    alt="Image A"
                    className="w-full h-full object-cover select-none"
                    draggable={false}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  />
                  {/* Image A tag */}
                  <div
                    className="absolute top-4 left-4 bg-[#007AFF] text-white z-20"
                    style={{
                      fontSize: '24px',
                      padding: '8px 16px',
                      borderRadius: '14px',
                      lineHeight: '1.2'
                    }}
                  >
                    Image A
                  </div>
                </div>

                {/* Second image (right side) with clip path */}
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath: `polygon(${compareSliderPosition}% 0%, 100% 0%, 100% 100%, ${compareSliderPosition}% 100%)`,
                    zIndex: 2
                  }}
                >
                  {/* Background to prevent transparency bleed-through */}
                  <div className="absolute inset-0 bg-black"></div>
                  <img
                    src={connectedImages[1]?.imageUrl}
                    alt="Image B"
                    className="w-full h-full object-cover relative z-10 select-none"
                    draggable={false}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  />
                  {/* Image B tag */}
                  <div
                    className="absolute top-4 right-4 bg-[#007AFF] text-white z-20"
                    style={{
                      fontSize: '24px',
                      padding: '8px 16px',
                      borderRadius: '14px',
                      lineHeight: '1.2'
                    }}
                  >
                    Image B
                  </div>
                </div>

                {/* Slider line and handle */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-[#007AFF] pointer-events-none"
                  style={{ left: `${compareSliderPosition}%`, zIndex: 30 }}
                />

                {/* Slider handle */}
                <div
                  className="absolute top-1/2 bg-[#007AFF] flex items-center justify-center cursor-col-resize transform -translate-y-1/2 -translate-x-1/2 nodrag"
                  style={{
                    left: `${compareSliderPosition}%`,
                    zIndex: 40,
                    borderRadius: '24px',
                    padding: '8px 10px'
                  }}
                  onMouseDown={handleSliderMouseDown}
                >
                  <div className="flex items-center" style={{ gap: '12px' }}>
                    {/* Left triangle pointing left */}
                    <svg width="14" height="20" viewBox="0 0 5 8" fill="none">
                      <polygon points="4,1 4,7 1,4" fill="white" />
                    </svg>
                    {/* Right triangle pointing right */}
                    <svg width="14" height="20" viewBox="0 0 5 8" fill="none">
                      <polygon points="1,1 1,7 4,4" fill="white" />
                    </svg>
                  </div>
                </div>

                {(data as any)?.loading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50 }}>
                    <div className="animate-spin text-white text-2xl">⌛</div>
                  </div>
                )}
              </div>
            ) : (
              // Single Image Mode
              <div className="w-full h-full relative">
                <img
                  src={singleImageSource as string}
                  alt={singleImageDisplayName as string}
                  className="w-full h-full object-cover select-none"
                  draggable={false}
                  style={{ userSelect: 'none' }}
                />
                {(data as any)?.loading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin text-white text-2xl">⌛</div>
                  </div>
                )}
              </div>
            )
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center`}
            >
              {(data as any)?.loading || (data as any)?.uploading ? (
                <div className="animate-spin text-2xl">⌛</div>
              ) : (
                <img
                  src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png"
                  alt="App Logo"
                  className="h-12 w-auto opacity-40 select-none"
                  draggable={false}
                  style={{
                    userSelect: 'none',
                    transform: `scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
                    transformOrigin: 'center center'
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Second element: Title node with icon (conditionally rendered based on viewMode) */}
        {((data as any)?.viewMode || 'card') !== 'image' && (
          <div className="inline-flex items-center gap-10 bg-[#0D0D0D] rounded-xl px-6 py-8">
            <SvgIcon name="realtime" className="h-10 w-10" />
            <span className="text-white whitespace-nowrap" style={{ fontWeight: 500, fontSize: '32px' }}>
              {(data as any)?.displayName || 'Image Output'}
            </span>
          </div>
        )}
      </div>

      {/* Custom SVG Border Overlay - always present for smooth transitions */}
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
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Border stroke with smooth transitions */}
        <rect
          x={0.5 / currentZoom}
          y={0.5 / currentZoom}
          width={`calc(100% - ${1 / currentZoom}px)`}
          height={`calc(100% - ${1 / currentZoom}px)`}
          fill="none"
          stroke="#3b82f6"
          strokeOpacity={
            selected
              ? 1
              : isHovered
                ? 0
                : 0
          }
          strokeWidth={1 / currentZoom}
          vectorEffect="non-scaling-stroke"
          rx={selected ? "0" : "39"}
          ry={selected ? "0" : "39"}
          style={{
            transition: 'stroke-opacity 10ms ease-out',
            transitionDelay: isHovered && !selected ? '5ms' : '0ms'
          }}
        />
      </svg>

      {/* SVG Corner Boxes - zoom relative */}
      {selected && (
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
          viewBox={`0 0 ${width} ${height}`}
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
            x={width - 3.5 / currentZoom}
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
            y={height - 3.5 / currentZoom}
            width={7 / currentZoom}
            height={7 / currentZoom}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1 / currentZoom}
          />
          {/* Bottom-right corner */}
          <rect
            x={width - 3.5 / currentZoom}
            y={height - 3.5 / currentZoom}
            width={7 / currentZoom}
            height={7 / currentZoom}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1 / currentZoom}
          />
        </svg>
      )}

      {/* Resize handles - only visible when selected */}
      {selected && (
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
              // Add resize start logic if needed
            }}
            onResize={(_, params) => {
              // Update visual dimensions immediately for smooth UX
              if (aspectRatioLocked && storedAspectRatio) {
                // When aspect ratio is locked, calculate proper dimensions
                const widthChange = Math.abs(params.width - width);
                const heightChange = Math.abs(params.height - height);

                let newWidth, newHeight;

                if (widthChange >= heightChange) {
                  // Width-driven resize
                  newWidth = params.width;
                  newHeight = newWidth / storedAspectRatio;
                } else {
                  // Height-driven resize
                  newHeight = params.height;
                  newWidth = newHeight * storedAspectRatio;
                }

                setWidth(newWidth);
                setHeight(newHeight);
              } else {
                // Free resize when unlocked
                setWidth(params.width);
                setHeight(params.height);
              }
            }}
            onResizeEnd={(_, params) => {
              // Update store dimensions only when resize is complete
              if (aspectRatioLocked && storedAspectRatio) {
                // When aspect ratio is locked, calculate proper dimensions
                const widthChange = Math.abs(params.width - width);
                const heightChange = Math.abs(params.height - height);

                let newWidth, newHeight;

                if (widthChange >= heightChange) {
                  // Width-driven resize
                  newWidth = params.width;
                  newHeight = newWidth / storedAspectRatio;
                } else {
                  // Height-driven resize
                  newHeight = params.height;
                  newWidth = newHeight * storedAspectRatio;
                }

                setWidth(newWidth);
                setHeight(newHeight);
              } else {
                // Free resize when unlocked
                setWidth(params.width);
                setHeight(params.height);
              }
            }}
          />
        </>
      )}

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
      {/* Size display when selected */}
      <NodeToolbar
        isVisible={selected}
        position="bottom"
        offset={4}
      >
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
          {Math.round(width)} × {Math.round(height)}
        </div>
      </NodeToolbar>
    </div>
  );
});

export default PreviewNode;