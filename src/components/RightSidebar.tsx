
import React from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { X } from 'lucide-react';

export const RightSidebar = () => {
  const selectedNode = useCanvasStore(state => state.selectedNode);
  
  if (!selectedNode) {
    return null;
  }

  const handleClose = () => {
    useCanvasStore.getState().setSelectedNode(null);
  };

  const renderNodeInfo = () => {
    const nodeType = selectedNode.type || 'unknown';
    
    return (
      <div>
        <div className="p-4 border-b border-field flex justify-between items-center">
          <h2 className="text-lg font-medium text-white">
            {nodeType === 'modelNode' && 'Model Properties'}
            {nodeType === 'loraNode' && 'LoRA Properties'}
            {nodeType === 'controlnetNode' && 'ControlNet Properties'}
            {nodeType === 'previewNode' && 'Preview Properties'}
          </h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="text-sm text-gray-400 mb-2">Node Type</div>
          <div className="text-white mb-4">{nodeType}</div>
          
          <div className="text-sm text-gray-400 mb-2">Node ID</div>
          <div className="text-white mb-4">{selectedNode.id}</div>
          
          <div className="text-sm text-gray-400 mb-2">Position</div>
          <div className="text-white mb-4">
            X: {Math.round(selectedNode.position.x)}, 
            Y: {Math.round(selectedNode.position.y)}
          </div>
          
          {/* Node-specific data could be rendered here */}
          {selectedNode.data && Object.keys(selectedNode.data).length > 0 && (
            <>
              <div className="text-sm text-gray-400 mb-2">Data</div>
              <pre className="bg-field rounded-md p-2 text-xs text-white overflow-auto max-h-60">
                {JSON.stringify(selectedNode.data, null, 2)}
              </pre>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 h-screen bg-sidebar border-l border-field overflow-y-auto">
      {renderNodeInfo()}
    </div>
  );
};
