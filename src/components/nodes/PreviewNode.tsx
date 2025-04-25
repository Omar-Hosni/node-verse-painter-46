
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Button } from "@/components/ui/button";
import { Image as ImageIcon } from 'lucide-react';

interface PreviewNodeProps {
  id: string;
  data: {
    image: string | null;
  };
  selected: boolean;
}

export const PreviewNode = ({ id, data, selected }: PreviewNodeProps) => {
  const generateImage = useCanvasStore(state => state.generateImageFromNodes);
  
  const handleGenerateClick = () => {
    generateImage();
  };

  return (
    <div className={`min-w-[250px] max-w-[250px] ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="node-header">Preview</div>
      <div className="node-content">
        {data.image ? (
          <div className="mb-4">
            <img 
              src={data.image} 
              alt="Generated preview" 
              className="w-full h-52 object-cover rounded-md"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-52 border-2 border-dashed border-gray-600 rounded-md bg-gray-800 mb-4">
            <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-400">Image will appear here</span>
          </div>
        )}
        
        <Button 
          onClick={handleGenerateClick} 
          className="w-full bg-primary hover:bg-blue-600 text-white"
        >
          Generate Image
        </Button>
      </div>

      {/* Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="preview-in"
        style={{ top: -6 }}
      />
    </div>
  );
};
