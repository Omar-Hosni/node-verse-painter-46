import React from 'react';
import { Button } from './ui/button';
import { NodeType, NodeOption } from '@/store/types';
import { useReactFlow } from '@xyflow/react';
import { getHighestOrder } from '@/store/nodeActions';
import { useCanvasStore } from '@/store/useCanvasStore';
import { X } from 'lucide-react';
import { FaPlus } from "react-icons/fa6";

interface LeftSidebarNodeDescProps {
  selectedInsertNode: NodeOption | null;
  setSelectedInsertNode: (node: NodeOption | null) => void;
}

const LeftSidebarNodeDesc: React.FC<LeftSidebarNodeDescProps> = ({ selectedInsertNode, setSelectedInsertNode }) => {
  const addNode = useCanvasStore(state => state.addNode);
  const reactFlowInstance = useReactFlow();
  const { getNodes } = useReactFlow();

  if (!selectedInsertNode) return null;

  const handleAddNode = (nodeType: NodeType) => {
    const center = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    const position = reactFlowInstance.screenToFlowPosition(center);
    const order = getHighestOrder(getNodes()) + 1;

    addNode(nodeType, position, order);
    setSelectedInsertNode(null); // Close panel after insert
  };

  return (
    <div className="w-[275px] px-3 py-4 bg-[#0d0d0d] border-l border-gray-800 overflow-y-auto relative z-10">
      {/* Close button */}
      <button
        className="absolute top-2 right-2 text-gray-500 hover:text-white"
        onClick={() => setSelectedInsertNode(null)}
        aria-label="Close description"
      >
        <X className="w-4 h-4" />
      </button>

      {selectedInsertNode.node_desc_image_url && (
        <img
          src={`/nodes/data/icons/description/${selectedInsertNode.node_desc_image_url}.png`}
          alt="Node preview"
          className="rounded-xl mb-4 w-full object-cover"
        />
      )}

      <h4 className="text-white text-sm font-semibold mb-1">
        {selectedInsertNode.label}
      </h4>

      {/* Placeholder for usage text, if you want to add stats */}
      <p className="text-[11px] text-gray-400 mb-4">👤 1.5M uses</p>

      <p className="text-xs text-gray-400 mb-6 leading-snug">
        {selectedInsertNode.description}
      </p>

      <Button
        onClick={() => handleAddNode(selectedInsertNode.type)}
        className="text-base px-4 py-1.5 bg-[#007aff] hover:bg-blue-600 rounded-full"
      >
        <FaPlus className="mt-0.5"/> Insert
      </Button>
    </div>
  );
};

export default LeftSidebarNodeDesc;
