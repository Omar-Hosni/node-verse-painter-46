
// Fix the typings for the inputs in RightSidebar.tsx
import React, { useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { 
  Trash, 
  Copy, 
  ChevronRight, 
  Settings,
  Upload,
  Link
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from 'sonner';

export const RightSidebar = () => {
  const { 
    selectedNode, 
    updateNodeData, 
    deleteSelectedNode,
    copySelectedNode,
    selectedEdge,
    deleteEdge,
    uploadControlNetImage,
    uploadInputImage
  } = useCanvasStore();
  
  const [isUploading, setIsUploading] = useState(false);

  // Handle image upload for ControlNet or Input nodes
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedNode) return;
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      
      // Update node to indicate upload in progress
      updateNodeData(selectedNode.id, { uploading: true });
      
      // Different upload function based on node type
      if (selectedNode.type === 'controlnetNode') {
        await uploadControlNetImage(selectedNode.id, file);
      } else if (selectedNode.type === 'inputNode' && selectedNode.data?.inputType === 'image') {
        await uploadInputImage(selectedNode.id, file);
      }
      
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error("Upload error:", error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };
  
  // This function safely renders inputs with proper type casting
  const renderNumericInput = (
    label: string,
    property: string,
    min: number,
    max: number,
    step: number
  ) => {
    if (!selectedNode?.data) return null;
    
    // Safely cast the value to number
    const value = selectedNode.data[property];
    const numericValue = typeof value === 'number' ? value : 0;
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
        <input
          type="number"
          value={numericValue}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue) && newValue >= min && newValue <= max) {
              updateNodeData(selectedNode.id, { [property]: newValue });
            }
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  };
  
  const renderTextInput = (
    label: string,
    property: string,
  ) => {
    if (!selectedNode?.data) return null;
    
    // Safely cast the value to string
    const value = selectedNode.data[property];
    const textValue = typeof value === 'string' ? value : '';
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
        <input
          type="text"
          value={textValue}
          onChange={(e) => updateNodeData(selectedNode.id, { [property]: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    );
  };
  
  const renderSlider = (
    label: string,
    property: string,
    min: number,
    max: number,
    step: number
  ) => {
    if (!selectedNode?.data) return null;
    
    // Safely cast the value to number
    const value = selectedNode.data[property];
    const numericValue = typeof value === 'number' ? value : 0;
    
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium text-gray-300">{label}</label>
          <span className="text-xs text-gray-400">{numericValue}</span>
        </div>
        <input
          type="range"
          value={numericValue}
          min={min}
          max={max}
          step={step}
          onChange={(e) => updateNodeData(selectedNode.id, { [property]: parseFloat(e.target.value) })}
          className="w-full bg-gray-700 rounded-lg appearance-none cursor-pointer h-2 accent-blue-500"
        />
      </div>
    );
  };
  
  const renderTextArea = (
    label: string,
    property: string,
    placeholder: string = ""
  ) => {
    if (!selectedNode?.data) return null;
    
    // Safely cast the value to string
    const value = selectedNode.data[property];
    const textValue = typeof value === 'string' ? value : '';
    
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
        <textarea
          value={textValue}
          placeholder={placeholder}
          onChange={(e) => updateNodeData(selectedNode.id, { [property]: e.target.value })}
          className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
        />
      </div>
    );
  };
  
  // Utility to check if a property exists
  const hasProperty = (property: string) => {
    return selectedNode?.data && property in selectedNode.data;
  };

  // Render node-specific controls based on type
  const renderNodeSpecificControls = () => {
    if (!selectedNode) return null;
    
    switch (selectedNode.type) {
      // Model node controls
      case 'modelNode':
        return (
          <>
            {/* Model settings */}
            {renderTextInput('Model Name', 'modelName')}
            {renderNumericInput('Width', 'width', 256, 1024, 8)}
            {renderNumericInput('Height', 'height', 256, 1024, 8)}
            {renderNumericInput('Steps', 'steps', 1, 150, 1)}
            {renderSlider('CFG Scale', 'cfgScale', 1, 20, 0.1)}
            {renderTextArea('Prompt', 'prompt', 'Enter your prompt here...')}
            {renderTextArea('Negative Prompt', 'negativePrompt', 'Enter your negative prompt here...')}
          </>
        );
        
      // LoRA node controls
      case 'loraNode':
        return (
          <>
            {renderTextInput('LoRA Name', 'loraName')}
            {renderSlider('Strength', 'strength', 0, 1, 0.01)}
          </>
        );
        
      // ControlNet node controls
      case 'controlnetNode':
        return (
          <>
            {renderSlider('Strength', 'strength', 0, 1, 0.01)}
            
            {/* Image upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Control Image
              </label>
              
              {selectedNode.data.image ? (
                <div className="relative mb-2">
                  <img 
                    src={typeof selectedNode.data.image === 'string' ? selectedNode.data.image : ''}
                    alt="Control"
                    className="w-full h-auto rounded-md"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => updateNodeData(selectedNode.id, { image: null })}
                  >
                    <Trash className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-500 transition-colors"
                  onClick={() => document.getElementById('controlnet-image-upload')?.click()}>
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {isUploading ? 'Uploading...' : 'Click to upload image'}
                    </p>
                  </div>
                  <input
                    id="controlnet-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </div>
              )}
            </div>
            
            {/* Canny specific controls */}
            {selectedNode.data.controlNetType === 'canny' && (
              <>
                {renderNumericInput('Low Threshold', 'low_threshold', 0, 255, 1)}
                {renderNumericInput('High Threshold', 'high_threshold', 0, 255, 1)}
              </>
            )}
          </>
        );
        
      // Input node controls
      case 'inputNode':
        if (selectedNode.data.inputType === 'text') {
          return renderTextArea('Text Input', 'text', 'Enter your text here...');
        }
        else if (selectedNode.data.inputType === 'image') {
          return (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Input Image
                </label>
                
                {selectedNode.data.image ? (
                  <div className="relative mb-2">
                    <img 
                      src={typeof selectedNode.data.image === 'string' ? selectedNode.data.image : ''}
                      alt="Input"
                      className="w-full h-auto rounded-md"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => updateNodeData(selectedNode.id, { image: null })}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-6 cursor-pointer hover:border-gray-500 transition-colors"
                    onClick={() => document.getElementById('input-image-upload')?.click()}>
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        {isUploading ? 'Uploading...' : 'Click to upload image'}
                      </p>
                    </div>
                    <input
                      id="input-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </div>
                )}
              </div>
            </>
          );
        }
        return null;
        
      // Preview node controls
      case 'previewNode':
        return (
          <>
            {selectedNode.data.image ? (
              <div className="mb-4">
                <p className="text-sm text-gray-300 mb-2">Generated Image</p>
                <img 
                  src={typeof selectedNode.data.image === 'string' ? selectedNode.data.image : ''}
                  alt="Generated"
                  className="w-full h-auto rounded-md"
                />
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  No image generated yet. Connect a model node to this preview node.
                </p>
              </div>
            )}
          </>
        );
        
      default:
        return (
          <p className="text-sm text-gray-500">
            Select a node to view and edit its properties.
          </p>
        );
    }
  };
  
  // If no node is selected but an edge is selected
  const renderEdgeControls = () => {
    if (!selectedEdge) return null;
    
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Edge Properties</h2>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteEdge(selectedEdge.id)}
          >
            <Trash className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
        
        <p className="text-sm text-gray-400 mb-2">
          Source: {selectedEdge.source}
        </p>
        <p className="text-sm text-gray-400 mb-2">
          Target: {selectedEdge.target}
        </p>
      </div>
    );
  };
  
  // Helper function to get node color
  const getNodeColor = () => {
    if (!selectedNode?.data) return "#666666";
    
    // If node has color property in its data
    if (selectedNode.data.color && typeof selectedNode.data.color === 'string') {
      return selectedNode.data.color;
    }
    
    // Or determine by node type
    switch (selectedNode.type) {
      case 'modelNode': return "#8000ff";
      case 'loraNode': return "#9370db";
      case 'controlnetNode': return "#4CAF50";
      case 'inputNode': return "#FFD700";
      case 'previewNode': return "#f59e0b";
      default: return "#666666";
    }
  };
  
  // Empty state when nothing is selected
  const renderEmptyState = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Settings className="h-16 w-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-medium text-gray-400 mb-2">No Selection</h3>
        <p className="text-sm text-gray-500">
          Select a node or edge on the canvas to view and edit its properties.
        </p>
      </div>
    );
  };

  // Main render
  return (
    <div className="w-80 h-full bg-sidebar border-l border-field flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-sidebar-accent border-b border-field p-4">
        <h2 className="text-lg font-medium text-white">Properties</h2>
      </div>
      
      {/* Properties panel */}
      <div className="flex-1 overflow-y-auto">
        {selectedNode ? (
          <div className="p-4">
            {/* Node header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: getNodeColor() }}
                />
                <h2 className="text-lg font-medium text-white truncate" 
                    title={selectedNode.data?.displayName && typeof selectedNode.data.displayName === 'string' 
                      ? selectedNode.data.displayName 
                      : selectedNode.id}>
                  {selectedNode.data?.displayName && typeof selectedNode.data.displayName === 'string'
                    ? selectedNode.data.displayName
                    : selectedNode.id}
                </h2>
              </div>
              
              <div className="flex space-x-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copySelectedNode()}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy node</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      onClick={() => deleteSelectedNode()}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete node</TooltipContent>
                </Tooltip>
              </div>
            </div>
            
            {/* Type and ID info */}
            <div className="mb-4 text-xs text-gray-500">
              <p>Type: {selectedNode.type}</p>
              <p>ID: {selectedNode.id}</p>
            </div>
            
            {/* Node-specific controls */}
            <div className="mt-6">
              {renderNodeSpecificControls()}
            </div>
          </div>
        ) : selectedEdge ? (
          renderEdgeControls()
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
};

export default RightSidebar;
