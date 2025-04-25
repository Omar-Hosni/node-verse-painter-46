
import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
              <Input
                type="text"
                placeholder="Model Name"
                value={(selectedNode.data.modelName as string) || ''}
                onChange={(e) => updateNodeData(selectedNode.id, { modelName: e.target.value })}
                className="mb-2"
              />
              <Input
                type="number"
                placeholder="Width"
                value={selectedNode.data.width || 512}
                onChange={(e) => updateNodeData(selectedNode.id, { width: parseInt(e.target.value) })}
                className="mb-2"
              />
              {/* ... Add other model-specific controls */}
            </div>
          </div>
        );
      // ... Add cases for other node types
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
          {/* Node Style Preferences Section */}
          <div className="border-b border-field pb-4 mb-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Style Preferences</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                <Input
                  type="text"
                  value={selectedNode.data.displayName || ''}
                  onChange={(e) => handleStyleChange('displayName', e.target.value)}
                  className="w-full bg-field text-white border-none focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Emoji</label>
                <Input
                  type="text"
                  value={selectedNode.data.emoji || ''}
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
                    value={selectedNode.data.color || '#ff69b4'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="w-12 h-8 p-1 bg-field border-none focus:ring-primary"
                  />
                  <Input
                    type="text"
                    value={selectedNode.data.color || '#ff69b4'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="flex-1 bg-field text-white border-none focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Node-specific controls */}
          {renderNodeSpecificControls()}
        </div>
      </div>
    </div>
  );
};
