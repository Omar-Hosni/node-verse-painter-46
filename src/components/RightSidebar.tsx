
import React, { useRef } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getRunwareService } from '@/services/runwareService';

export const RightSidebar = () => {
  const selectedNode = useCanvasStore(state => state.selectedNode);
  const updateNodeData = useCanvasStore(state => state.updateNodeData);
  const runwayApiKey = useCanvasStore(state => state.runwayApiKey);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleStyleChange = (property: string, value: string) => {
    if (selectedNode) {
      updateNodeData(selectedNode.id, { [property]: value });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedNode || !event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    
    try {
      toast.info("Uploading image...");
      
      if (!runwayApiKey) {
        toast.error("API key not set! Please set your API key in the settings.");
        return;
      }
      
      // Get instance of the service
      const runwareService = getRunwareService(runwayApiKey);
      
      // Convert file to data URL
      const dataUrl = await runwareService.fileToDataURL(file);
      
      // Update the node data with the image
      updateNodeData(selectedNode.id, { image: dataUrl });
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderNodeSpecificControls = () => {
    if (!selectedNode) return null;
    
    switch(selectedNode.type) {
      case 'modelNode':
        return (
          <div className="space-y-4">
            <div className="border-b border-field pb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Model Settings</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-400">Model Name</Label>
                  <Input
                    type="text"
                    placeholder="Model Name"
                    value={(selectedNode.data.modelName as string) || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { modelName: e.target.value })}
                    className="bg-field text-white border-none focus:ring-primary rounded-full"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Width</Label>
                  <Input
                    type="number"
                    placeholder="Width"
                    value={Number(selectedNode.data.width) || 512}
                    onChange={(e) => updateNodeData(selectedNode.id, { width: parseInt(e.target.value) })}
                    className="bg-field text-white border-none focus:ring-primary rounded-full"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Height</Label>
                  <Input
                    type="number"
                    placeholder="Height"
                    value={Number(selectedNode.data.height) || 512}
                    onChange={(e) => updateNodeData(selectedNode.id, { height: parseInt(e.target.value) })}
                    className="bg-field text-white border-none focus:ring-primary rounded-full"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Steps</Label>
                  <Input
                    type="number"
                    placeholder="Steps"
                    value={Number(selectedNode.data.steps) || 30}
                    onChange={(e) => updateNodeData(selectedNode.id, { steps: parseInt(e.target.value) })}
                    className="bg-field text-white border-none focus:ring-primary rounded-full"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">CFG Scale</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="CFG Scale"
                    value={Number(selectedNode.data.cfgScale) || 7.5}
                    onChange={(e) => updateNodeData(selectedNode.id, { cfgScale: parseFloat(e.target.value) })}
                    className="bg-field text-white border-none focus:ring-primary rounded-full"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Prompt</Label>
                  <Textarea
                    placeholder="Enter your prompt here"
                    value={(selectedNode.data.prompt as string) || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })}
                    className="bg-field text-white border-none focus:ring-primary min-h-[80px] rounded-2xl"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Negative Prompt</Label>
                  <Textarea
                    placeholder="Enter your negative prompt here"
                    value={(selectedNode.data.negativePrompt as string) || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { negativePrompt: e.target.value })}
                    className="bg-field text-white border-none focus:ring-primary min-h-[80px] rounded-2xl"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'loraNode':
        return (
          <div className="space-y-4">
            <div className="border-b border-field pb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">LoRA Settings</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-400">LoRA Name</Label>
                  <Input
                    type="text"
                    placeholder="LoRA Name"
                    value={(selectedNode.data.loraName as string) || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { loraName: e.target.value })}
                    className="bg-field text-white border-none focus:ring-primary rounded-full"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Strength: {Number(selectedNode.data.strength).toFixed(2)}</Label>
                  <Slider
                    value={[Number(selectedNode.data.strength) || 0.8]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={(values) => updateNodeData(selectedNode.id, { strength: values[0] })}
                    className="my-2"
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'controlnetNode':
        return (
          <div className="space-y-4">
            <div className="border-b border-field pb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">ControlNet Settings</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-400">Type</Label>
                  <div className="text-white py-2">{selectedNode.data.type as string}</div>
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Upload Image</Label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="mt-2">
                    {selectedNode.data.image ? (
                      <div className="relative">
                        <img 
                          src={selectedNode.data.image as string} 
                          alt="ControlNet input" 
                          className="w-full rounded-2xl border border-field"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 rounded-full"
                          onClick={() => updateNodeData(selectedNode.id, { image: null })}
                        >
                          X
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full bg-field text-white border-none focus:ring-primary flex gap-2 rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4" />
                        Upload Image
                      </Button>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Strength: {Number(selectedNode.data.strength).toFixed(2)}</Label>
                  <Slider
                    value={[Number(selectedNode.data.strength) || 0.8]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={(values) => updateNodeData(selectedNode.id, { strength: values[0] })}
                    className="my-2"
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'previewNode':
        return (
          <div className="space-y-4">
            <div className="border-b border-field pb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Preview Settings</h3>
              <div className="space-y-3">
                {selectedNode.data.image ? (
                  <div className="relative">
                    <img 
                      src={selectedNode.data.image as string} 
                      alt="Generated image" 
                      className="w-full rounded-2xl border border-field"
                    />
                  </div>
                ) : (
                  <div className="bg-field rounded-2xl border border-gray-700 h-64 flex items-center justify-center text-gray-400">
                    No image generated yet.
                  </div>
                )}
                <Button
                  variant="default"
                  className="w-full rounded-full"
                  onClick={() => {
                    useCanvasStore.getState().generateImageFromNodes();
                  }}
                >
                  Generate Image
                </Button>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Style properties section - always visible
  const renderStyleProperties = () => {
    if (!selectedNode) return null;
    
    return (
      <div className="space-y-3 py-2">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Display Name</label>
          <Input
            type="text"
            value={(selectedNode.data.displayName as string) || ''}
            onChange={(e) => handleStyleChange('displayName', e.target.value)}
            className="w-full bg-field text-white border-none focus:ring-primary rounded-full"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Emoji</label>
          <Input
            type="text"
            value={(selectedNode.data.emoji as string) || ''}
            onChange={(e) => handleStyleChange('emoji', e.target.value)}
            className="w-full bg-field text-white border-none focus:ring-primary rounded-full"
            placeholder="Enter an emoji"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Color</label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={(selectedNode.data.color as string) || '#ff69b4'}
              onChange={(e) => handleStyleChange('color', e.target.value)}
              className="w-12 h-8 p-1 bg-field border-none focus:ring-primary rounded-full"
            />
            <Input
              type="text"
              value={(selectedNode.data.color as string) || '#ff69b4'}
              onChange={(e) => handleStyleChange('color', e.target.value)}
              className="flex-1 bg-field text-white border-none focus:ring-primary rounded-full"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 h-screen bg-sidebar border-l border-field overflow-y-auto">
      <div>
        <div className="p-4 border-b border-field">
          <h2 className="text-lg font-medium text-white">Node Properties</h2>
        </div>
        
        <div className="p-4">
          {/* Style Preferences Section - Always visible */}
          <div className="border-b border-field pb-4 mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Style Preferences</h3>
            {renderStyleProperties()}
          </div>
          
          {/* Node-specific settings section - Always visible */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">Node Settings</h3>
            {renderNodeSpecificControls()}
          </div>
        </div>
      </div>
    </div>
  );
};
