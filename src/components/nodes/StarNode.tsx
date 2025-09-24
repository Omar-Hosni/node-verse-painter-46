import { memo, useState, useEffect } from 'react';
import { NodeProps, NodeResizer, NodeToolbar, Handle, Position, useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';

interface StarNodeData {
  displayName?: string;
  width?: number;
  height?: number;
  right_sidebar?: {
    pin?: boolean;
    visibility?: boolean;
    opacity?: number;
    cornerRadius?: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    strokeStyle?: 'solid' | 'dashed';
    aspectRatioLocked?: boolean;
    starCount?: number;
    starAngle?: number;
    rotation?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
  };
  color?: string;
  icon?: string;
}

const StarNode = memo(({ id, data, selected }: NodeProps) => {
  const updateNodeData = useCanvasStore(state => state.updateNodeData);
  const { getZoom } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(getZoom());

  // Simple dimension management - use data values directly like FrameNode
  const width = (data as StarNodeData)?.width || 200;
  const height = (data as StarNodeData)?.height || 200;

  // Get star properties with defaults
  const starProps = (data as StarNodeData)?.right_sidebar || {};
  const {
    visibility = true,
    opacity = 100,
    cornerRadius = 0,
    fillColor = '#007AFF',
    strokeColor = '#FFFFFF',
    strokeWidth = 0,
    strokeStyle = 'solid',
    starCount = 5,
    starAngle = 40,
    rotation = 0,
    flipHorizontal = false,
    flipVertical = false
  } = starProps;



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



  // Generate star path with proper corner radius
  const generateStarPath = (width: number, height: number, points: number, cornerRadius: number, angle: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - Math.max(strokeWidth, 1);
    // Convert angle percentage to inner radius ratio (10% = 0.1, 50% = 0.5, 65% = 0.65)
    const innerRadius = outerRadius * (angle / 100);
    
    // Calculate all points first
    const starPoints = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      starPoints.push({ x, y });
    }
    
    if (cornerRadius === 0) {
      // No corner radius - simple path
      let path = `M ${starPoints[0].x} ${starPoints[0].y}`;
      for (let i = 1; i < starPoints.length; i++) {
        path += ` L ${starPoints[i].x} ${starPoints[i].y}`;
      }
      path += ' Z';
      return path;
    }
    
    // With corner radius - create rounded corners
    let path = '';
    
    for (let i = 0; i < starPoints.length; i++) {
      const current = starPoints[i];
      const prev = starPoints[(i - 1 + starPoints.length) % starPoints.length];
      const next = starPoints[(i + 1) % starPoints.length];
      
      // Calculate vectors from current point to previous and next
      const prevVector = { x: prev.x - current.x, y: prev.y - current.y };
      const nextVector = { x: next.x - current.x, y: next.y - current.y };
      
      // Normalize vectors
      const prevLength = Math.sqrt(prevVector.x * prevVector.x + prevVector.y * prevVector.y);
      const nextLength = Math.sqrt(nextVector.x * nextVector.x + nextVector.y * nextVector.y);
      
      if (prevLength > 0 && nextLength > 0) {
        prevVector.x /= prevLength;
        prevVector.y /= prevLength;
        nextVector.x /= nextLength;
        nextVector.y /= nextLength;
        
        // Calculate the distance to move along each edge for the radius
        const radiusDistance = cornerRadius;
        
        // Calculate start and end points of the arc
        const startPoint = {
          x: current.x + prevVector.x * radiusDistance,
          y: current.y + prevVector.y * radiusDistance
        };
        const endPoint = {
          x: current.x + nextVector.x * radiusDistance,
          y: current.y + nextVector.y * radiusDistance
        };
        
        if (i === 0) {
          path += `M ${startPoint.x} ${startPoint.y}`;
        } else {
          path += ` L ${startPoint.x} ${startPoint.y}`;
        }
        
        // Add quadratic curve for rounded corner
        path += ` Q ${current.x} ${current.y} ${endPoint.x} ${endPoint.y}`;
      } else {
        // Fallback for degenerate cases
        if (i === 0) {
          path += `M ${current.x} ${current.y}`;
        } else {
          path += ` L ${current.x} ${current.y}`;
        }
      }
    }
    
    path += ' Z';
    return path;
  };

  const starPath = generateStarPath(width, height, starCount, cornerRadius, starAngle);

  const starStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    opacity: opacity / 100,
    display: visibility ? 'block' : 'none',
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
      {/* Star content using SVG */}
      <svg style={starStyle} viewBox={`0 0 ${width} ${height}`}>
        <path
          d={starPath}
          fill={fillColor}
          stroke={strokeWidth > 0 ? strokeColor : 'none'}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeStyle === 'dashed' ? '5,5' : 'none'}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

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
            onResize={(_, params) => {
              // Simple real-time update like FrameNode - no complex state management
              updateNodeData(id, {
                ...(data as StarNodeData),
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

      {/* Node handles - hidden for star nodes as they don't connect */}
      {/* Node handles - hidden for star nodes as they don't connect */}
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

StarNode.displayName = 'StarNode';

export default StarNode;