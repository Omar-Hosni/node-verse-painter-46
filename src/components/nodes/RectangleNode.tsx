import { memo, useState, useEffect } from 'react';
import { NodeProps, NodeResizer, NodeToolbar, Handle, Position, useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';

interface RectangleNodeData {
  displayName?: string;
  width?: number;
  height?: number;
  right_sidebar?: {
    pin?: boolean;
    visibility?: boolean;
    opacity?: number;
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
    rotation?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
  };
  color?: string;
  icon?: string;
}

const RectangleNode = memo(({ id, data, selected }: NodeProps) => {
  const updateNodeData = useCanvasStore(state => state.updateNodeData);
  const { getZoom } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(getZoom());

  // Simple dimension management - use data values directly like FrameNode
  const width = (data as RectangleNodeData)?.width || 200;
  const height = (data as RectangleNodeData)?.height || 200;

  // Get rectangle properties with defaults
  const rectangleProps = (data as RectangleNodeData)?.right_sidebar || {};
  const {
    visibility = true,
    opacity = 100,
    cornerRadius = 8,
    activeCorner = 'all',
    corners = {},
    fillColor = '#007AFF',
    strokeColor = '#FFFFFF',
    strokeWidth = 0,
    strokeStyle = 'solid',
    rotation = 0,
    flipHorizontal = false,
    flipVertical = false
  } = rectangleProps;

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



  const rectangleStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: fillColor,
    opacity: opacity / 100,
    display: visibility ? 'block' : 'none',
    borderRadius: getBorderRadius(),
    border: strokeWidth > 0 ? `${strokeWidth}px ${strokeStyle} ${strokeColor}` : 'none',
    boxSizing: 'border-box',
    transform: `rotate(${rotation}deg) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
    transformOrigin: 'center center'
  };

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
      {/* Rectangle content */}
      <div style={rectangleStyle} />

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
          strokeOpacity={0}
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
            onResize={(_, params) => {
              // Simple real-time update like FrameNode - no complex state management
              updateNodeData(id, {
                ...(data as RectangleNodeData),
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

      {/* Node handles - hidden for rectangle nodes as they don't connect */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    </div>
  );
});

RectangleNode.displayName = 'RectangleNode';

export default RectangleNode;