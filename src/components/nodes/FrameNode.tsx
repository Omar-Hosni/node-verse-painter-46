import { NodeProps, NodeResizer, useReactFlow, NodeToolbar, Handle, Position } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { memo, useState, useEffect, useRef, useCallback } from 'react';

interface FrameNodeProps {
  id: string;
  data: any;
  selected?: boolean;
}

const FrameNode = memo(({ id, data, selected }: FrameNodeProps) => {
  const { getNodes, getZoom } = useReactFlow();
  const updateNodeData = useCanvasStore(state => state.updateNodeData);
  const [isHovered, setIsHovered] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(getZoom());

  // Simple dimension management - use data values directly like ResizeShapeNode
  const width = data?.width || 400;
  const height = data?.height || 300;

  const [isDropTarget, setIsDropTarget] = useState(false);

  // Get frame properties with defaults
  const frameProps = data?.right_sidebar || {};
  const {
    visibility = true,
    opacity = 100,
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
      const frameRight = frameLeft + width;
      const frameBottom = frameTop + height;

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
  }, [getNodes, id, width, height, isDropTarget]);



  return (
    <div
      style={{
        width: width,
        height: height,
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
          opacity: opacity / 100
        }}
      />
      {/* Frame label using NodeToolbar for scale independence */}
      <NodeToolbar
        isVisible={true}
        position={Position.Top}
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
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Border stroke with smooth transitions */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
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
            onResize={(_, params) => {
              // Simple real-time update like ResizeShapeNode - no complex state management
              updateNodeData(id, {
                ...data,
                width: params.width,
                height: params.height
              });
            }}
          />
        </>
      )}

      {/* Size tag using NodeToolbar */}
      <NodeToolbar
        isVisible={selected}
        position={Position.Bottom}
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