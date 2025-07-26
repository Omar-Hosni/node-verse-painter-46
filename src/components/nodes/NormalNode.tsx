import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import SvgIcon from '@/components/SvgIcon';
import NodeIcon from '../NodeIcon';

interface NormalNodeData {
  displayName?: string;
  type?: string;
  functionality?: string;
  image_url?: string;
  order?: number;
  color?: string;
  nodeShape?: string;
  icon?: string;
  iconBgColor?: string;
  skip?: boolean;
  [key: string]: any;
}

const NormalNode: React.FC<NodeProps<NormalNodeData>> = ({ data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);

  const getIconName = (type: string) => {
    if(type==="connector") return "router";
    if(type.includes('engine')) return "engine";
    if(type.includes('gear')) return "gear";
    if(type.includes('remove')) return "removebg";

    const parts = type.split('-');
    return parts[parts.length - 1];
  };

  // Color mapping to hex colors
  const colorMap: Record<string, string> = {
    purple: "#8B5CF6",
    orange: "#F97316", 
    red: "#EF4444",
    green: "#10B981",
    blue: "#3B82F6",
    pink: "#EC4899",
    cyan: "#06B6D4",
    black: "#111111",
  };

  const rawColor = data?.color?.toLowerCase() || "blue";
  const nodeColor = colorMap[rawColor] || "#3B82F6";
  
  const currentNodeShape = data?.nodeShape || "pill";
  const nodeTitle = data?.displayName || 'Node';
  const isSkipped = data?.skip || false;
  const isTextInputNode = data?.type?.includes('input-text');

  // Apply shape styling
  const shapeStyle = currentNodeShape === 'rectangle' ? '24px' : '24px';
  
  // Background color - always dark
  const backgroundColor = '#0D0D0D';
  const circleColor = nodeColor;

  const iconName = getIconName(data?.type || '');

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: backgroundColor,
        border: selected ? '1px solid #007AFF' : '1px solid transparent',
        borderRadius: shapeStyle,
        padding: '14px 10px',
        width: 'fit-content',
        height: currentNodeShape === 'square' ? '80px' : '48px',
        display: 'flex',
        flexDirection: currentNodeShape === 'square' ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: currentNodeShape === 'square' ? 'center' : 'space-between',
        gap: currentNodeShape === 'square' ? '8px' : '12px',
        position: 'relative',
        transition: 'all 0.2s ease',
        opacity: isSkipped ? 0.5 : 1,
      }}
    >
      {currentNodeShape === 'square' ? (
        <>
          {/* Square layout - icon on top, text below */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: circleColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <NodeIcon icon={data?.icon} iconBgColor={data?.iconBgColor} />
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <SvgIcon name={iconName} className="h-2.5 w-2.5" style={{ color: 'white', opacity: 0.4 }} />
            <div style={{
              color: 'white',
              fontSize: '10px',
              fontWeight: '500',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}>
              {nodeTitle}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Regular layout - left icon, middle text, right circle */}
          <div style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.4,
          }}>
            <SvgIcon name={iconName} className="h-3 w-3" style={{ color: 'white' }} />
          </div>

          <div style={{
            flex: 1,
            color: 'white',
            fontSize: '10px',
            fontWeight: '500',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}>
            {nodeTitle}
          </div>

          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: circleColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}>
            <NodeIcon icon={data?.icon} iconBgColor={data?.iconBgColor} />
          </div>
        </>
      )}

      {/* Left Handle - appears on hover for non-text-input nodes */}
      {!isTextInputNode && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{
            background: isHovered ? '#007AFF' : 'transparent',
            border: isHovered ? '2px solid #007AFF' : 'none',
            width: isHovered ? '8px' : '8px',
            height: isHovered ? '8px' : '8px',
            opacity: isHovered ? 1 : 0,
            transition: 'all 0.2s ease',
            left: '-6px',
          }}
        />
      )}

      {/* Right Handle - appears on hover */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          background: isHovered ? '#007AFF' : 'transparent',
          border: isHovered ? '2px solid #007AFF' : 'none',
          width: isHovered ? '8px' : '8px',
          height: isHovered ? '8px' : '8px',
          opacity: isHovered ? 1 : 0,
          transition: 'all 0.2s ease',
          right: '-6px',
        }}
      />
    </div>
  );
};

export default NormalNode;