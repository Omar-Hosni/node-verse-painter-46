
import React, { useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Loader2 } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';

interface InputNodeProps {
  id: string;
  data: {
    inputType: string;
    text?: string;
    image?: string | null;
    imageId?: string;
    uploading?: boolean;
    displayName: string;
  };
  selected: boolean;
}

export const InputNode = ({ id, data, selected }: InputNodeProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInputImage = useCanvasStore(state => state.uploadInputImage);
  
  const handleImageClick = () => {
    if (data.inputType === 'image' && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && data.inputType === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && e.target.result) {
          const imageData = e.target.result as string;
          
          // Update the local image preview
          useCanvasStore.getState().updateNodeData(id, {
            image: imageData,
            uploading: true
          });
          
          // Upload the image
          uploadInputImage(id, imageData);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const renderContent = () => {
    if (data.inputType === 'text') {
      return (
        <div className="w-full">
          <textarea 
            className="w-full h-20 p-2 bg-black bg-opacity-20 rounded-md text-white resize-none border border-gray-600 focus:border-blue-400 focus:outline-none"
            placeholder="Enter your prompt here..."
            value={data.text || ''}
            onChange={(e) => useCanvasStore.getState().updateNodeData(id, { text: e.target.value })}
          />
        </div>
      );
    } else if (data.inputType === 'image') {
      return (
        <div className="w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          {data.image ? (
            <div className="w-full h-24 overflow-hidden rounded-md border border-gray-600 relative">
              {data.uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
              <img 
                src={data.image} 
                alt="Input image"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div 
              className="w-full h-24 flex items-center justify-center border border-dashed border-gray-400 rounded-md bg-black bg-opacity-20 text-white cursor-pointer"
              onClick={handleImageClick}
            >
              <span>Click to upload image</span>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div 
      className={`relative rounded-lg overflow-hidden bg-gray-800 input-node shadow-md
        ${selected ? 'border border-purple-500' : 'border border-transparent'}`}
      style={{ width: 220 }}
    >
      <div className="p-3 border-b border-gray-700">
        <span className="text-sm font-semibold text-white">
          {data.displayName || 'Input'}
        </span>
      </div>

      <div className="p-3">
        {renderContent()}
      </div>

      {/* Horizontal handles - both input and output */}
      <Handle
        type="target"
        position={Position.Left}
        id="input-in"
        className="!bg-white !border-2 !border-blue-300 w-3 h-3"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="input-out"
        className="!bg-white !border-2 !border-blue-300 w-3 h-3"
      />
    </div>
  );
};
