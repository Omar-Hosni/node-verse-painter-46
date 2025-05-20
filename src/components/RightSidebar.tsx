
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
import { ScrollArea } from '@/components/ui/scroll-area';

export const RightSidebar = () => {
  const selectedNode = useCanvasStore(state => state.selectedNode);
  const updateNodeData = useCanvasStore(state => state.updateNodeData);
  const runwayApiKey = useCanvasStore(state => state.runwayApiKey);
  const uploadControlNetImage = useCanvasStore(state => state.uploadControlNetImage);
  const uploadInputImage = useCanvasStore(state => state.uploadInputImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStyleChange = (property: string, value: string) => {
    if (selectedNode) {
      updateNodeData(selectedNode.id, {
        [property]: value
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedNode || !event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    try {
      toast.info("Processing image...");
      if (!runwayApiKey) {
        toast.error("API key not set! Please set your API key in the settings.");
        return;
      }

      // Get instance of the service
      const runwareService = getRunwareService(runwayApiKey);

      // Convert file to data URL for preview
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        
        // First update the node with the local image for preview
        updateNodeData(selectedNode.id, {
          image: dataUrl,
          uploading: true
        });

        // Upload based on node type with the actual File object
        if (selectedNode.type === 'controlnetNode' && selectedNode.data.type === 'pose') {
          await uploadControlNetImage(selectedNode.id, file);
        } else if (selectedNode.type === 'inputNode' && selectedNode.data.inputType === 'image') {
          await uploadInputImage(selectedNode.id, file);
        }
      };
      
      reader.readAsDataURL(file);

    } catch (error) {
      console.error("Error processing image:", error);
      toast.error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderNodeSpecificControls = () => {
    if (!selectedNode) return null;
    
    switch (selectedNode.type) {
      case 'modelNode':
        return <div className="space-y-4">
            <div className="border-b border-field pb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Model Settings</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-400">Model Name</Label>
                  <Input 
                    type="text" 
                    placeholder="Model Name" 
                    value={String(selectedNode.data.modelName || '')} 
                    onChange={e => updateNodeData(selectedNode.id, {
                      modelName: e.target.value
                    })} 
                    className="bg-field text-white border-none focus:ring-primary rounded-full" 
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Width</Label>
                  <Input 
                    type="number" 
                    placeholder="Width" 
                    value={Number(selectedNode.data.width) || 512} 
                    onChange={e => updateNodeData(selectedNode.id, {
                      width: parseInt(e.target.value)
                    })} 
                    className="bg-field text-white border-none focus:ring-primary rounded-full" 
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Height</Label>
                  <Input 
                    type="number" 
                    placeholder="Height" 
                    value={Number(selectedNode.data.height) || 512} 
                    onChange={e => updateNodeData(selectedNode.id, {
                      height: parseInt(e.target.value)
                    })} 
                    className="bg-field text-white border-none focus:ring-primary rounded-full" 
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Steps</Label>
                  <Input 
                    type="number" 
                    placeholder="Steps" 
                    value={Number(selectedNode.data.steps) || 30} 
                    onChange={e => updateNodeData(selectedNode.id, {
                      steps: parseInt(e.target.value)
                    })} 
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
                    onChange={e => updateNodeData(selectedNode.id, {
                      cfgScale: parseFloat(e.target.value)
                    })} 
                    className="bg-field text-white border-none focus:ring-primary rounded-full" 
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Prompt</Label>
                  <Textarea 
                    placeholder="Enter your prompt here" 
                    value={String(selectedNode.data.prompt || '')} 
                    onChange={e => updateNodeData(selectedNode.id, {
                      prompt: e.target.value
                    })} 
                    className="bg-field text-white border-none focus:ring-primary min-h-[80px] rounded-2xl" 
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Negative Prompt</Label>
                  <Textarea 
                    placeholder="Enter your negative prompt here" 
                    value={String(selectedNode.data.negativePrompt || '')} 
                    onChange={e => updateNodeData(selectedNode.id, {
                      negativePrompt: e.target.value
                    })} 
                    className="bg-field text-white border-none focus:ring-primary min-h-[80px] rounded-2xl" 
                  />
                </div>
              </div>
            </div>
          </div>;
          
      case 'loraNode':
        return <div className="space-y-4">
            <div className="border-b border-field pb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">LoRA Settings</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-400">LoRA Name</Label>
                  <Input type="text" placeholder="LoRA Name" value={String(selectedNode.data.loraName || '')} onChange={e => updateNodeData(selectedNode.id, {
                  loraName: e.target.value
                })} className="bg-field text-white border-none focus:ring-primary rounded-full" />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Strength: {Number(selectedNode.data.strength).toFixed(2)}</Label>
                  <Slider 
                    value={[Number(selectedNode.data.strength) || 0.8]} 
                    min={0} 
                    max={1} 
                    step={0.01} 
                    onValueChange={values => updateNodeData(selectedNode.id, {
                      strength: values[0]
                    })} 
                    className="my-2" 
                  />
                </div>
              </div>
            </div>
          </div>;
          
      case 'controlnetNode':
        return <div className="space-y-4">
            <div className="border-b border-field pb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">ControlNet Settings</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-400">Type</Label>
                  <div className="text-white py-2">{String(selectedNode.data.type || '')}</div>
                </div>
                
                {/* Only show image upload for Pose ControlNet */}
                {selectedNode.data.type === 'pose' && (
                  <div>
                    <Label className="text-sm text-gray-400">Upload Image</Label>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                    <div className="mt-2">
                      {selectedNode.data.image ? (
                        <div className="relative">
                          <img src={String(selectedNode.data.image || '')} alt="ControlNet input" className="w-full rounded-2xl border border-field" />
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
                )}
                
                <div>
                  <Label className="text-sm text-gray-400">Strength: {Number(selectedNode.data.strength).toFixed(2)}</Label>
                  <Slider 
                    value={[Number(selectedNode.data.strength) || 0.8]} 
                    min={0} 
                    max={1} 
                    step={0.01} 
                    onValueChange={values => updateNodeData(selectedNode.id, { strength: values[0] })} 
                    className="my-2" 
                  />
                </div>
                
                {/* Canny-specific controls */}
                {selectedNode.data.type === 'canny' && (
                  <>
                    <div>
                      <Label className="text-sm text-gray-400">Low Threshold</Label>
                      <Input
                        type="number"
                        value={selectedNode.data.low_threshold || 100}
                        onChange={(e) => updateNodeData(selectedNode.id, { 
                          low_threshold: parseInt(e.target.value) 
                        })}
                        className="bg-field text-white border-none focus:ring-primary rounded-full"
                        min={0}
                        max={255}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-400">High Threshold</Label>
                      <Input
                        type="number"
                        value={selectedNode.data.high_threshold || 200}
                        onChange={(e) => updateNodeData(selectedNode.id, { 
                          high_threshold: parseInt(e.target.value) 
                        })}
                        className="bg-field text-white border-none focus:ring-primary rounded-full"
                        min={0}
                        max={255}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-400">Resolution</Label>
                      <Input
                        type="number"
                        value={selectedNode.data.resolution || 512}
                        onChange={(e) => updateNodeData(selectedNode.id, { 
                          resolution: parseInt(e.target.value) 
                        })}
                        className="bg-field text-white border-none focus:ring-primary rounded-full"
                        min={64}
                        max={1024}
                        step={64}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>;
          
      case 'inputNode':
        return <div className="space-y-4">
            <div className="border-b border-field pb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Input Settings</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-400">Input Type</Label>
                  <div className="text-white py-2">{String(selectedNode.data.inputType || '')}</div>
                </div>
                
                {selectedNode.data.inputType === 'text' && (
                  <div>
                    <Label className="text-sm text-gray-400">Text</Label>
                    <Textarea 
                      value={String(selectedNode.data.text || '')}
                      onChange={e => updateNodeData(selectedNode.id, { text: e.target.value })}
                      className="bg-field text-white border-none focus:ring-primary min-h-[80px] rounded-2xl"
                      placeholder="Enter your prompt here..."
                    />
                  </div>
                )}
                
                {/* Only show image upload for Image Input */}
                {selectedNode.data.inputType === 'image' && (
                  <div>
                    <Label className="text-sm text-gray-400">Upload Image</Label>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                    <div className="mt-2">
                      {selectedNode.data.image ? (
                        <div className="relative">
                          <img src={String(selectedNode.data.image || '')} alt="Input image" className="w-full rounded-2xl border border-field" />
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
                )}
              </div>
            </div>
          </div>;
          
      case 'previewNode':
        return <div className="space-y-4">
            <div className="border-b border-field pb-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Preview Settings</h3>
              <div className="space-y-3">
                {selectedNode.data.image ? <div className="relative">
                    <img src={String(selectedNode.data.image || '')} alt="Generated image" className="w-full rounded-2xl border border-field" />
                  </div> : <div className="bg-field rounded-2xl border border-gray-700 h-64 flex items-center justify-center text-gray-400">
                    No image generated yet.
                  </div>}
                <Button variant="default" className="w-full rounded-full" onClick={() => {
                useCanvasStore.getState().generateImageFromNodes();
              }}>
                  Generate Image
                </Button>
              </div>
            </div>
          </div>;
          
      default:
        return null;
    }
  };

  const renderStyleProperties = () => {
    if (!selectedNode) return null;
    return <div className="space-y-3 py-2">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Display Name</label>
          <Input type="text" value={String(selectedNode.data.displayName || '')} onChange={e => handleStyleChange('displayName', e.target.value)} className="w-full bg-field text-white border-none focus:ring-primary rounded-full" />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Emoji</label>
          <Input type="text" value={String(selectedNode.data.emoji || '')} onChange={e => handleStyleChange('emoji', e.target.value)} className="w-full bg-field text-white border-none focus:ring-primary rounded-full" placeholder="Enter an emoji" />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Color</label>
          <div className="flex gap-2">
            <Input type="color" value={String(selectedNode.data.color || '#ff69b4')} onChange={e => handleStyleChange('color', e.target.value)} className="w-12 h-8 p-1 bg-field border-none focus:ring-primary rounded-full" />
            <Input type="text" value={String(selectedNode.data.color || '#ff69b4')} onChange={e => handleStyleChange('color', e.target.value)} className="flex-1 bg-field text-white border-none focus:ring-primary rounded-full" />
          </div>
        </div>
      </div>;
  };

  return (
    <div className="w-80 h-screen bg-sidebar border-l border-field">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-field">
          <h2 className="text-white text-sm font-medium">Node Properties</h2>
        </div>
        
        {/* Fix: Use proper height to ensure scrolling works */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-4">
            <div className="py-4">
              {/* Style Preferences Section */}
              <div className="border-b border-field pb-4 mb-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Style Preferences</h3>
                {renderStyleProperties()}
              </div>
              
              {/* Node-specific settings section */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Node Settings</h3>
                {renderNodeSpecificControls()}
              </div>
              
              {/* Add padding at the bottom to ensure all content is scrollable */}
              <div className="pb-8"></div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
