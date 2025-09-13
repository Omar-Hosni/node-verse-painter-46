import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import SvgIcon from '@/components/SvgIcon';
import NodeIcon from '../NodeIcon';

interface NormalNodeData {
  displayName?: string;
  type?: string;
  functionality?: string;
  image_url?: string;
  order?: number;
  nodeStyle?: string;
  nodeFillColor?: string;
  nodeShape?: string;
  icon?: string;
  iconBgColor?: string;
  [key: string]: any;
}

type NormalNodeProps = NodeProps<NormalNodeData>;

const NormalNode: React.FC<NormalNodeProps> = React.memo(({ data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { getZoom } = useReactFlow();
  const [currentZoom, setCurrentZoom] = useState(getZoom());

  // Update zoom level when node is selected or hovered
  useEffect(() => {
    if (!selected && !isHovered) return;

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

  // Get the icon name based on node type
  const getIconName = (type: string) => {
    if (type === "connector") return "router";
    if (type.includes('engine')) return "engine";
    if (type.includes('gear')) return "gear";
    if (type.includes('remove')) return "removebg";
    if (type.includes('remix')) return "merger";
    if (type.includes('relight')) return "objectrelight";
    if (type.includes('normal')) return "normal_map";


    // Extract last part after dash (e.g., 'control-net-pose' -> 'pose')
    const parts = type.split('-');
    return parts[parts.length - 1];
  };

  const iconName = getIconName(data.type || '');

  // Determine node styling
  const nodeStyle = data?.nodeStyle || "accent";
  const nodeFillColor = data?.nodeFillColor;
  const nodeShape = data?.nodeShape;
  const nodeType = data?.type || '';

  // Check if this node type supports custom fill colors
  const supportsFillMode = [
    'engine', 'gear', 'input-text', 'image-to-image-reangle',
    'control-net-pose', 'control-net-lights', 'control-net-edge',
    'control-net-depth', 'control-net-reference'
  ].some(type => nodeType.includes(type));

  // Set background color
  const hasCustomBackground = supportsFillMode && nodeStyle === "fill" && nodeFillColor;
  const backgroundColor = hasCustomBackground ? nodeFillColor : '#0D0D0D';
  const bgClass = hasCustomBackground ? '' : 'bg-[#0D0D0D]';

  // Determine shape properties
  const isSquare = nodeShape === "square";
  const isTextInputNode = nodeType.includes('input-text');


  // Style configuration
  const containerClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    isSquare ? 'flex-col' : 'flex-row',
    isSquare ? 'gap-4' : '',
    isSquare ? 'rounded-[48px]' : 'rounded-full',
    bgClass
  ].filter(Boolean).join(' ');

  const containerStyle = {
    position: 'relative' as const,
    padding: isSquare ? '40px 52px' : '28px 28px 28px 56px',
    backgroundColor: hasCustomBackground ? backgroundColor : undefined
  };

  return (
    <div
      className={containerClasses}
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Node Content */}
      {isSquare ? (
        // pill layout: icon on top, label below
        <>
          <NodeIcon
            icon={data.icon}
            iconBgColor={hasCustomBackground ? "rgba(0, 0, 0, 0.15)" : data.iconBgColor}
            className="!w-28 !h-28 !text-6xl !min-w-28 !max-w-28 !min-h-28 !max-h-28"
            style={{
              width: '112px',
              height: '112px',
              minWidth: '112px',
              maxWidth: '112px',
              minHeight: '112px',
              maxHeight: '112px',
              flexShrink: 0,
              flexGrow: 0
            }}
          />
          <div className="flex items-center justify-center gap-10">
            <SvgIcon name={iconName} className="h-10 w-10" />
            <span className="text-white text-4xl whitespace-nowrap" style={{ fontWeight: 500 }}>
              {data.displayName || 'Node'}
            </span>
          </div>
        </>
      ) : (
        // Rectangle layout: label on left, icon on right
        <>
          <div className="flex items-center space-x-10" style={{ marginRight: '40px' }}>
            <SvgIcon name={iconName} className="h-10 w-10" />
            <span className="text-white text-4xl whitespace-nowrap" style={{ fontWeight: 500 }}>
              {data.displayName || 'Node'}
            </span>
          </div>
          <NodeIcon
            icon={data.icon}
            iconBgColor={hasCustomBackground ? "rgba(0, 0, 0, 0.15)" : data.iconBgColor}
            className="!w-28 !h-28 !text-6xl !min-w-28 !max-w-28 !min-h-28 !max-h-28"
            style={{
              width: '112px',
              height: '112px',
              minWidth: '112px',
              maxWidth: '112px',
              minHeight: '112px',
              maxHeight: '112px',
              flexShrink: 0,
              flexGrow: 0
            }}
          />
        </>
      )}


      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          width: '40px',
          height: '40px',
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
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: 'transparent',
          opacity: 0,
          border: 'none',
          right: '-40px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10
        }}
      />

      {/* Hover Indicators - always present for smooth transitions */}
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
      >
          <circle cx="12.5" cy="12.5" r="12.5" fill="#007AFF" />
        </svg>
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
        <circle cx="12.5" cy="12.5" r="12.5" fill="#007AFF" />
      </svg>

      {/* Selection Border - always present for smooth transitions */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 99999999
        }}
      >
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
          rx={isSquare ? "46" : "77"}
          ry={isSquare ? "46" : "77"}
          style={{
            transition: 'stroke-opacity 10ms ease-out',
            transitionDelay: isHovered && !selected ? '5ms' : '0ms'
          }}
        />
      </svg>
    </div>
  );
});

export default NormalNode;