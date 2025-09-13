// @ts-nocheck
import { memo, useState, useEffect, useRef } from 'react';
import { NodeProps, NodeResizer, useReactFlow, NodeToolbar, Handle, Position } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';

interface FrameNodeData {
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
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    strokeStyle?: 'solid' | 'dashed';
    aspectRatioLocked?: boolean;
    storedAspectRatio?: number;

    title?: string;
  };
  color?: string;
  icon?: string;
  label?: string;
  children?: string[];
  isDropTarget?: boolean;
}

const FrameNode = memo(({ id, data, selected }: NodeProps<FrameNodeData>) => {
  const { getNodes, getZoom } = useReactFlow();
  const updateNodeData = useCanvasStore(state => state.updateNodeData);
  const [isHovered, setIsHovered] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(getZoom());

  // Visual dimensions (updated in real-time during resize)
  const [visualWidth, setVisualWidth] = useState((data as FrameNodeData).width || 400);
  const [visualHeight, setVisualHeight] = useState((data as FrameNodeData).height || 300);

  // Store dimensions (only updated when resize is complete)
  const [storeWidth, setStoreWidth] = useState((data as FrameNodeData).width || 400);
  const [storeHeight, setStoreHeight] = useState((data as FrameNodeData).height || 300);

  const [isDropTarget, setIsDropTarget] = useState(false);
  const isResizing = useRef(false);

  // Get frame properties with defaults
  const frameProps = data?.right_sidebar || {};
  const {
    visibility = true,
    opacity = 100,
    blendMode = 'normal',
    cornerRadius = 1,
    activeCorner = 'all',
    corners = {},
    fillColor = '#ffffff',
    strokeColor = '#FFFFFF',
    strokeWidth = 0,
    strokeStyle = 'solid',
    aspectRatioLocked = false,
    storedAspectRatio,

    title = 'New Frame'
  } = frameProps;

  // Calculate individual corner values
  const getBorderRadius = () => {
    const { topLeft = cornerRadius, topRight = cornerRadius, bottomLeft = cornerRadius, bottomRight = cornerRadius } = corners;
    return `${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px`;
  };

  // Update dimensions when data changes from properties panel
  useEffect(() => {
    const newWidth = (data as FrameNodeData).width || 400;
    const newHeight = (data as FrameNodeData).height || 300;

    setVisualWidth(newWidth);
    setVisualHeight(newHeight);
    setStoreWidth(newWidth);
    setStoreHeight(newHeight);
  }, [data?.width, data?.height]);

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

  // Only update store when store dimensions change (not during active resize)
  useEffect(() => {
    if (!isResizing.current) {
      updateNodeData(id, { width: storeWidth, height: storeHeight });
    }
  }, [storeWidth, storeHeight, id, updateNodeData]);

  // Check if nodes are being dragged over this frame
  useEffect(() => {
    const checkDropTarget = () => {
      const nodes = getNodes();
      const frameNode = nodes.find(n => n.id === id);
      if (!frameNode) return;

      // Get the React Flow instance to access viewport transform
      const reactFlowInstance = document.querySelector('.react-flow');
      if (!reactFlowInstance) return;

      // Get the frame's DOM element to calculate screen position
      const frameElement = reactFlowInstance.querySelector(`[data-id="${id}"]`);
      if (!frameElement) return;

      const frameRect = frameElement.getBoundingClientRect();
      const frameLeft = frameRect.left;
      const frameTop = frameRect.top;
      const frameRight = frameLeft + visualWidth;
      const frameBottom = frameTop + visualHeight;

      // Check if any INDEPENDENT node (no parent) is being dragged over this frame
      const isDraggedOver = nodes.some(node => {
        // ONLY allow independent nodes - skip if node has ANY parent (check both parentNode and parentId)
        if (node.id === id || node.type === 'frame-node' || node.parentId) return false;
        if (!node.dragging) return false;

        // Get the dragged node's DOM element to calculate screen position
        const nodeElement = reactFlowInstance.querySelector(`[data-id="${node.id}"]`);
        if (!nodeElement) return false;

        const nodeRect = nodeElement.getBoundingClientRect();
        const nodeLeft = nodeRect.left;
        const nodeTop = nodeRect.top;
        const nodeWidth = nodeRect.width;
        const nodeHeight = nodeRect.height;

        // Use actual node dimensions for normal nodes
        if (node.type === 'normal-node') {
          const actualWidth = nodeWidth - 12; // Subtract handle width
          const nodeRight = nodeLeft + actualWidth;
          const nodeBottom = nodeTop + nodeHeight;

          // Check for overlap
          const overlapLeft = Math.max(frameLeft, nodeLeft);
          const overlapTop = Math.max(frameTop, nodeTop);
          const overlapRight = Math.min(frameRight, nodeRight);
          const overlapBottom = Math.min(frameBottom, nodeBottom);

          const overlapWidth = Math.max(0, overlapRight - overlapLeft);
          const overlapHeight = Math.max(0, overlapBottom - overlapTop);
          const overlapArea = overlapWidth * overlapHeight;
          const nodeArea = actualWidth * nodeHeight;

          return overlapArea > (nodeArea * 0.3); // 30% overlap threshold
        } else {
          const nodeRight = nodeLeft + nodeWidth;
          const nodeBottom = nodeTop + nodeHeight;

          // Check for overlap
          const overlapLeft = Math.max(frameLeft, nodeLeft);
          const overlapTop = Math.max(frameTop, nodeTop);
          const overlapRight = Math.min(frameRight, nodeRight);
          const overlapBottom = Math.min(frameBottom, nodeBottom);

          const overlapWidth = Math.max(0, overlapRight - overlapLeft);
          const overlapHeight = Math.max(0, overlapBottom - overlapTop);
          const overlapArea = overlapWidth * overlapHeight;
          const nodeArea = nodeWidth * nodeHeight;

          return overlapArea > (nodeArea * 0.3); // 30% overlap threshold
        }
      });

      if (isDraggedOver !== isDropTarget) {
        setIsDropTarget(isDraggedOver);
      }
    };

    const interval = setInterval(checkDropTarget, 16); // ~60fps
    return () => clearInterval(interval);
  }, [getNodes, id, visualWidth, visualHeight, isDropTarget]);



  return (
    <div
      style={{
        width: visualWidth,
        height: visualHeight,
        position: 'relative',
        background: 'transparent',
        border: 'none', // Remove CSS border completely
        borderRadius: '0px',
        overflow: 'visible',
        boxSizing: 'border-box'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Frame content with color styling */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: getBorderRadius(),
          overflow: 'hidden',
          backgroundColor: fillColor,
          display: visibility ? 'block' : 'none',
          border: strokeWidth > 0 ? `${strokeWidth}px ${strokeStyle} ${strokeColor}` : 'none',
          boxSizing: 'border-box',
          opacity: opacity / 100,
          mixBlendMode: blendMode as any
        }}
      />
      {/* Frame label using NodeToolbar for scale independence */}
      <NodeToolbar
        isVisible={true}
        position="top"
        offset={4}
        align="start"
      >
        <div
          style={{
            color: selected ? '#007AFF' : 'rgba(255, 255, 255, 0.3)',
            fontSize: '12px',
            fontWeight: '500',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            background: 'transparent',
            whiteSpace: 'nowrap',
            letterSpacing: '0.01em',
            userSelect: 'none'
          }}
        >
          {title}
        </div>
      </NodeToolbar>



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
        viewBox={`0 0 ${visualWidth} ${visualHeight}`}
      >
        {/* Border stroke with smooth transitions */}
        <rect
          x={0}
          y={0}
          width={visualWidth}
          height={visualHeight}
          fill="none"
          stroke="#3b82f6"
          strokeOpacity={
            selected
              ? 1
              : isDropTarget
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
          viewBox={`0 0 ${visualWidth} ${visualHeight}`}
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
            x={visualWidth - 3.5 / currentZoom}
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
            y={visualHeight - 3.5 / currentZoom}
            width={7 / currentZoom}
            height={7 / currentZoom}
            fill="white"
            stroke="#3b82f6"
            strokeWidth={1 / currentZoom}
          />
          {/* Bottom-right corner */}
          <rect
            x={visualWidth - 3.5 / currentZoom}
            y={visualHeight - 3.5 / currentZoom}
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
            lineStyle={{
              borderColor: 'transparent', // Hide the default border since we use SVG
              borderWidth: '0px',

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
                const targetAspectRatio = storedAspectRatio;

                // Determine which dimension changed more significantly
                const widthChange = Math.abs(params.width - visualWidth);
                const heightChange = Math.abs(params.height - visualHeight);

                let newWidth: number, newHeight: number;

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
                const targetAspectRatio = storedAspectRatio;

                // Determine which dimension changed more significantly
                const widthChange = Math.abs(params.width - storeWidth);
                const heightChange = Math.abs(params.height - storeHeight);

                let newWidth: number, newHeight: number;

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

      {/* Size tag using NodeToolbar */}
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
          {Math.round(visualWidth)} × {Math.round(visualHeight)}
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
    </div>
  );
});

FrameNode.displayName = 'FrameNode';

export default FrameNode;