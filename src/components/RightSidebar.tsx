
import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { X, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const RightSidebar = () => {
  const selectedNode = useCanvasStore(state => state.selectedNode);
  const updateNodeData = useCanvasStore(state => state.updateNodeData);
  
  if (!selectedNode) {
    return null;
  }

  const handleClose = () => {
    useCanvasStore.getState().setSelectedNode(null);
  };

  const handleStyleChange = (property: string, value: string) => {
    updateNodeData(selectedNode.id, { [property]: value });
  };

  const renderNodeSpecificControls = () => {
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
                    className="bg-field text-white border-none focus:ring-primary"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Width</Label>
                  <Input
                    type="number"
                    placeholder="Width"
                    value={Number(selectedNode.data.width) || 512}
                    onChange={(e) => updateNodeData(selectedNode.id, { width: parseInt(e.target.value) })}
                    className="bg-field text-white border-none focus:ring-primary"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Height</Label>
                  <Input
                    type="number"
                    placeholder="Height"
                    value={Number(selectedNode.data.height) || 512}
                    onChange={(e) => updateNodeData(selectedNode.id, { height: parseInt(e.target.value) })}
                    className="bg-field text-white border-none focus:ring-primary"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Steps</Label>
                  <Input
                    type="number"
                    placeholder="Steps"
                    value={Number(selectedNode.data.steps) || 30}
                    onChange={(e) => updateNodeData(selectedNode.id, { steps: parseInt(e.target.value) })}
                    className="bg-field text-white border-none focus:ring-primary"
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
                    className="bg-field text-white border-none focus:ring-primary"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Prompt</Label>
                  <Textarea
                    placeholder="Enter your prompt here"
                    value={(selectedNode.data.prompt as string) || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })}
                    className="bg-field text-white border-none focus:ring-primary min-h-[80px]"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Negative Prompt</Label>
                  <Textarea
                    placeholder="Enter your negative prompt here"
                    value={(selectedNode.data.negativePrompt as string) || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { negativePrompt: e.target.value })}
                    className="bg-field text-white border-none focus:ring-primary min-h-[80px]"
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
                    className="bg-field text-white border-none focus:ring-primary"
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
                  <div className="text-white py-2">{selectedNode.data.type}</div>
                </div>
                
                <div>
                  <Label className="text-sm text-gray-400">Upload Image</Label>
                  <div className="mt-2">
                    {selectedNode.data.image ? (
                      <div className="relative">
                        <img 
                          src={selectedNode.data.image as string} 
                          alt="ControlNet input" 
                          className="w-full rounded-md border border-field"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => updateNodeData(selectedNode.id, { image: null })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full bg-field text-white border-none focus:ring-primary flex gap-2"
                        onClick={() => {
                          // In a real app, this would open a file picker
                          // For now, we'll use a placeholder image URL
                          const placeholderUrl = "https://images.unsplash.com/photo-1617296538902-887900d9b592?q=80&w=2080";
                          updateNodeData(selectedNode.id, { image: placeholderUrl });
                        }}
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
                      className="w-full rounded-md border border-field"
                    />
                  </div>
                ) : (
                  <div className="bg-field rounded-md border border-gray-700 h-64 flex items-center justify-center text-gray-400">
                    No image generated yet.
                  </div>
                )}
                <Button
                  variant="default"
                  className="w-full"
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

  return (
    <div className="w-80 h-screen bg-sidebar border-l border-field overflow-y-auto">
      <div>
        <div className="p-4 border-b border-field flex justify-between items-center">
          <h2 className="text-lg font-medium text-white">Node Properties</h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <Accordion type="single" collapsible defaultValue="style">
            {/* Node Style Preferences Section */}
            <AccordionItem value="style" className="border-b border-field">
              <AccordionTrigger className="text-sm font-medium text-gray-400 py-2">
                Style Preferences
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 py-2">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                    <Input
                      type="text"
                      value={(selectedNode.data.displayName as string) || ''}
                      onChange={(e) => handleStyleChange('displayName', e.target.value)}
                      className="w-full bg-field text-white border-none focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Emoji</label>
                    <Input
                      type="text"
                      value={(selectedNode.data.emoji as string) || ''}
                      onChange={(e) => handleStyleChange('emoji', e.target.value)}
                      className="w-full bg-field text-white border-none focus:ring-primary"
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
                        className="w-12 h-8 p-1 bg-field border-none focus:ring-primary"
                      />
                      <Input
                        type="text"
                        value={(selectedNode.data.color as string) || '#ff69b4'}
                        onChange={(e) => handleStyleChange('color', e.target.value)}
                        className="flex-1 bg-field text-white border-none focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {/* Node-specific settings section */}
            <AccordionItem value="settings" className="border-b border-field">
              <AccordionTrigger className="text-sm font-medium text-gray-400 py-2">
                Node Settings
              </AccordionTrigger>
              <AccordionContent>
                {renderNodeSpecificControls()}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
};
