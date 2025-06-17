import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { User } from 'lucide-react';
import SvgIcon from '@/components/SvgIcon';

interface NormalNodeData {
  displayName?: string;
  type: string;
  functionality: string;
  image_url?: string;
  order?: number;
  [key: string]: any;
}

const NormalNode: React.FC<NodeProps<NormalNodeData>> = ({ data, selected }) => {
  

  const getIconName = (type: string) => {
    // Extract icon name from type (e.g., 'control-net-pose' -> 'pose')
    if(type==="connector") return "router";
    
    const parts = type.split('-');
    return parts[parts.length - 1];
  };
  console.log(data)
  const iconName = getIconName(data.type);
  const modelImage = data.image_url || '/placeholder.svg';

  return (
    <div
      className={`flex items-center justify-between bg-[#111] rounded-full px-3 py-2 shadow-lg ${
        selected ? 'ring-2 ring-white' : ''
      }`}
      style={{ width: 220 }}
    >
      {/* Left section: Icon and Label */}
      <div className="flex items-center space-x-2">
        <SvgIcon name={iconName} className="h-4 w-4 text-white" />
        <span className="text-white text-sm font-medium">
          {data.displayName || 'Node'}
        </span>
      </div>

      {/* Right section: Circular Image */}
      <div className="w-8 h-8 rounded-full overflow-hidden">
        <img
          src={modelImage}
          alt={data.displayName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Handles for connection */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!bg-white !border-none w-3 h-3"
        style={{ left: -6 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!bg-white !border-none w-3 h-3"
        style={{ right: -6 }}
      />
    </div>
  );
};

export default NormalNode;