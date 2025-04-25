
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useCanvasStore } from '@/store/useCanvasStore';

interface ModelNodeProps {
  id: string;
  data: {
    modelName: string;
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    prompt: string;
    negativePrompt: string;
  };
  selected: boolean;
}

export const ModelNode = ({ id, data, selected }: ModelNodeProps) => {
  const updateNodeData = useCanvasStore(state => state.updateNodeData);
  
  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(id, { modelName: e.target.value });
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { prompt: e.target.value });
  };

  const handleNegativePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { negativePrompt: e.target.value });
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const width = parseInt(e.target.value, 10);
    if (!isNaN(width)) {
      updateNodeData(id, { width });
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const height = parseInt(e.target.value, 10);
    if (!isNaN(height)) {
      updateNodeData(id, { height });
    }
  };

  const handleStepsChange = (value: number[]) => {
    updateNodeData(id, { steps: value[0] });
  };

  const handleCfgScaleChange = (value: number[]) => {
    updateNodeData(id, { cfgScale: value[0] });
  };

  return (
    <div className={`min-w-[300px] max-w-[300px] ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="node-header">Model</div>
      <div className="node-content">
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-200 mb-1">Model</label>
          <Input 
            type="text" 
            value={data.modelName} 
            onChange={handleModelChange} 
            className="w-full bg-field text-white border-none focus:ring-primary"
          />
        </div>
        
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-200 mb-1">Prompt</label>
          <textarea 
            value={data.prompt}
            onChange={handlePromptChange}
            className="w-full h-16 bg-field text-white border-none rounded-md p-2 focus:ring-primary focus:outline-none"
          />
        </div>
        
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-200 mb-1">Negative Prompt</label>
          <textarea 
            value={data.negativePrompt}
            onChange={handleNegativePromptChange}
            className="w-full h-16 bg-field text-white border-none rounded-md p-2 focus:ring-primary focus:outline-none"
          />
        </div>
        
        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-200 mb-1">Width</label>
            <Input 
              type="number" 
              value={data.width} 
              onChange={handleWidthChange} 
              className="w-full bg-field text-white border-none focus:ring-primary"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-200 mb-1">Height</label>
            <Input 
              type="number" 
              value={data.height} 
              onChange={handleHeightChange} 
              className="w-full bg-field text-white border-none focus:ring-primary"
            />
          </div>
        </div>
        
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-200 mb-1">
            Steps: {data.steps}
          </label>
          <Slider 
            defaultValue={[data.steps]} 
            min={10} 
            max={50} 
            step={1}
            onValueChange={handleStepsChange}
            className="my-2" 
          />
        </div>
        
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-200 mb-1">
            CFG Scale: {data.cfgScale}
          </label>
          <Slider 
            defaultValue={[data.cfgScale]} 
            min={1} 
            max={20} 
            step={0.5}
            onValueChange={handleCfgScaleChange}
            className="my-2" 
          />
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="model-out"
        style={{ bottom: -6 }}
      />
    </div>
  );
};
