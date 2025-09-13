// @ts-nocheck
import { memo, useState, useEffect, useRef } from 'react';
import { NodeProps, NodeResizer, NodeToolbar, Handle, Position, useUpdateNodeInternals, useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';

interface CircleNodeData {
  displayName?: string;
  width?: number;
  height?: number;
  right_sidebar?: {
    pin?: boolean;
    visibility?: boolean;
    opacity?: number;
    blendMode?: string;
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

const CircleNode = memo(({ id, data, selected }: NodeProps<CircleNodeData>) => {
  const updateNodeData = useCanvasStore(state => state.updateNodeData);
  const { getZoom } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(getZoom());
  const updateNodeInternals = useUpdateNodeInternals();

  // Visual dimensions (updated in real-time during resize)
  const [visualWidth, setVisualWidth] = useState((data as CircleNodeData).width || 200);
  const [visualHeight, setVisualHeight] = useState((data as CircleNodeData).height || 200);

  // Store dimensions (only updated when resize is complete)
  const [storeWidth, setStoreWidth] = useState((data as CircleNodeData).width || 200);
  const [storeHeight, setStoreHeight] = useState((data as CircleNodeData).height || 200);

  const isResizing = useRef(false);

  // Get circle properties with defaults
  const circleProps = data?.right_sidebar || {};
  const {
    visibility = true,
    opacity = 100,
    blendMode = 'normal',
    fillColor = '#007AFF',
    strokeColor = '#FFFFFF',
    strokeWidth = 0,
    strokeStyle = 'solid',
    rotation = 0,
    flipHorizontal = false,
    flipVertical = false
  } = circleProps;

  // Update dimensions when data changes from properties panel
  useEffect(() => {
    const newWidth = (data as CircleNodeData).width || 200;
    const newHeight = (data as CircleNodeData).height || 200;

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

  const circleStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: fillColor,
    opacity: opacity / 100,
    mixBlendMode: blendMode as any,
    display: visibility ? 'block' : 'none',
    borderRadius: '50%', // Always 50% for perfect circle
    border: strokeWidth > 0 ? `${strokeWidth}px ${strokeStyle} ${strokeColor}` : 'none',
    boxSizing: 'border-box',
    transform: `rotate(${rotation}deg) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
    transformOrigin: 'center center'
  };

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
      {/* Circle content */}
      <div style={circleStyle} />

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
            onResizeStart={() => {
              isResizing.current = true;
            }}
            onResize={(_, params) => {
              // Update visual dimensions immediately for smooth UX
              setVisualWidth(params.width);
              setVisualHeight(params.height);
            }}
            onResizeEnd={(_, params) => {
              isResizing.current = false;
              // Update store dimensions only when resize is complete
              setStoreWidth(params.width);
              setStoreHeight(params.height);
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

      {/* Node handles - hidden for circle nodes as they don't connect */}
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

CircleNode.displayName = 'CircleNode';

export default CircleNode;