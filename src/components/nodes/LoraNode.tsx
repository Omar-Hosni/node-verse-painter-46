
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useCanvasStore } from '@/store/useCanvasStore';

interface LoraNodeProps {
  id: string;
  data: {
    loraName: string;
    strength: number;
  };
  selected: boolean;
}

export const LoraNode = ({ id, data, selected }: LoraNodeProps) => {
  const updateNodeData = useCanvasStore(state => state.updateNodeData);
  
  const handleLoraNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { loraName: e.target.value });
  };

  const handleStrengthChange = (value: number[]) => {
    updateNodeData(id, { strength: value[0] });
  };

  return (
    <div className={`min-w-[250px] max-w-[250px] ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="node-header">LoRA</div>
      <div className="node-content">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-200 mb-1">LoRA Name</label>
          <Input 
            type="text" 
            value={data.loraName} 
            onChange={handleLoraNameChange} 
            placeholder="Enter LoRA name or ID"
            className="w-full bg-field text-white border-none focus:ring-primary"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">
            Strength: {data.strength.toFixed(2)}
          </label>
          <Slider 
            defaultValue={[data.strength]} 
            min={0} 
            max={1} 
            step={0.05}
            onValueChange={handleStrengthChange}
            className="my-2" 
          />
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="lora-in"
        style={{ top: -6 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="lora-out"
        style={{ bottom: -6 }}
      />
    </div>
  );
};
