import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { User } from 'lucide-react';
import SvgIcon from '@/components/SvgIcon';
import { E } from 'node_modules/@liveblocks/react/dist/room-CqT08uWZ';

interface NormalNodeData {
  displayName?: string;
  type?: string;
  functionality?: string;
  image_url?: string;
  order?: number;
  [key: string]: any;
}

const NormalNode: React.FC<NodeProps<NormalNodeData>> = ({ data, selected }) => {
  

  const getIconName = (type: string) => {
    // Extract icon name from type (e.g., 'control-net-pose' -> 'pose')    
    if(type==="connector") return "router";
    if(type.includes('engine')) return "engine";
    if(type.includes('gear')) return "gear";

    const parts = type.split('-');
    return parts[parts.length - 1];
  };

  const getIconImage = (type: string) => {
    if (type.includes('edge')) return 'edge';
    if (type.includes('engine')) return 'engine';
    if (type.includes('gear')) return 'gear';
    if (type.includes('lights')) return 'lights';
    if (type.includes('outpainting')) return 'outpainting';
    if (type.includes('pose')) return 'pose';
    if (type.includes('reference')) return 'reference';
    if (type.includes('remove-bg')) return 'remove-bg';
    if (type.includes('rescene')) return 'rescene';
    if (type.includes('segment')) return 'segment';
    if (type.includes('upscale')) return 'upscale';
    if (type.includes('text')) return 'text';
    return 'default';
  };

  
  const iconName = getIconName(data.type);
  const modelImage = getIconImage(data.type);

  const colorDegreeMap = {
    "purple":500,
    "orange":700,
    "red":500,
    "green":700,
    "blue":500,
    "pink":500,
    "cyan":500
  }

  console.log(data?.nodeShape)

  const currentNodeShape = data?.nodeShape

  let nodeStyle = {}
  let roundedDegree = ""
  let isSquare = false;

  if(currentNodeShape === "rectangle"){
    nodeStyle = { width: 170, height:50 }
    roundedDegree = "full"
  }
  else if(currentNodeShape === "square"){
    nodeStyle = { width: 120, height:90 }
    roundedDegree = "2xl"
    isSquare = true;
  }

  //if isSquare then flex-col, else flex-row

  const bgColor = data?.color.toLowerCase() === "black" ? "bg-[#111]" : `bg-${data.color.toLowerCase()}-${colorDegreeMap[data.color.toLowerCase()]}`

  return (
    <div
      className={`flex flex-${isSquare ? 'col' : 'row'} items-center justify-between ${bgColor} bg-opacity-80 rounded-${roundedDegree} px-3 py-2 shadow-lg ${
        selected ? 'ring-2 ring-white' : ''
      }`}
      style={nodeStyle}
    >
      {isSquare ? (
        <>
          {/* Circular Image on top in column layout */}
          <div className="w-10 h-10 rounded-full overflow-hidden mb-1">
            <img
              src={`/nodes/data/icons/images/${modelImage}.png`}
              alt={data.displayName}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Icon and label below the image */}
          <div className="flex items-center justify-center mb-2 gap-2.5">
            <SvgIcon name={iconName} className="h-2.5 w-2.5" />
            <span className="text-white text-sm font-medium">
              {data.displayName || 'Node'}
            </span>
          </div>
        </>
      ) : (
        <>
          {/* Icon and label on the left */}
          <div className="flex items-center space-x-2">
            <SvgIcon name={iconName} className="h-3.5 w-3.5" />
            <span className="text-white text-sm font-medium">
              {data.displayName || 'Node'}
            </span>
          </div>

          {/* Circular image on the right */}
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img
              src={`/nodes/data/icons/images/${modelImage}.png`}
              alt={data.displayName}
              className="w-full h-full object-cover"
            />
          </div>
        </>
      )}


      {/* Handles for connection */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!bg-white !border-none w-2.5 h-2.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!bg-white !border-none w-2.5 h-2.5"
      />
    </div>
  );
};

export default NormalNode;