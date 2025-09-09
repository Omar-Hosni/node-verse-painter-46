/**
 * Demo component to test preprocessing state management
 * Shows current preprocessing states and allows manual testing
 */

import React from 'react';
import { useWorkflowStore } from '../store/workflowStore';

export const PreprocessingStateDemo: React.FC = () => {
  const {
    nodes,
    getAllProcessingNodes,
    getPreprocessingStats,
    getPreprocessingState,
    isNodePreprocessing,
    hasPreprocessingError,
    hasPreprocessingResult,
    clearPreprocessingState,
  } = useWorkflowStore();

  const processingNodes = getAllProcessingNodes();
  const stats = getPreprocessingStats();
  const controlNetNodes = nodes.filter(node => 
    node.type?.includes('control-net') || node.type === 'seed-image-lights'
  );

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Preprocessing State Management Demo</h3>
      
      {/* Statistics */}
      <div className="mb-4">
        <h4 className="text-md font-medium mb-2">Statistics</h4>
        <div className="grid grid-cols-5 gap-2 text-sm">
          <div className="bg-gray-800 p-2 rounded">
            <div className="text-gray-400">Total</div>
            <div className="text-xl">{stats.total}</div>
          </div>
          <div className="bg-blue-800 p-2 rounded">
            <div className="text-gray-400">Processing</div>
            <div className="text-xl">{stats.processing}</div>
          </div>
          <div className="bg-green-800 p-2 rounded">
            <div className="text-gray-400">Completed</div>
            <div className="text-xl">{stats.completed}</div>
          </div>
          <div className="bg-red-800 p-2 rounded">
            <div className="text-gray-400">Errors</div>
            <div className="text-xl">{stats.errors}</div>
          </div>
          <div className="bg-gray-700 p-2 rounded">
            <div className="text-gray-400">Idle</div>
            <div className="text-xl">{stats.idle}</div>
          </div>
        </div>
      </div>

      {/* Currently Processing */}
      {processingNodes.length > 0 && (
        <div className="mb-4">
          <h4 className="text-md font-medium mb-2">Currently Processing</h4>
          <div className="space-y-1">
            {processingNodes.map(nodeId => (
              <div key={nodeId} className="bg-blue-900 p-2 rounded text-sm">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2"></div>
                  {nodeId}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ControlNet Nodes */}
      <div className="mb-4">
        <h4 className="text-md font-medium mb-2">ControlNet Nodes</h4>
        {controlNetNodes.length === 0 ? (
          <div className="text-gray-400 text-sm">No ControlNet nodes found</div>
        ) : (
          <div className="space-y-2">
            {controlNetNodes.map(node => {
              const state = getPreprocessingState(node.id);
              const isProcessing = isNodePreprocessing(node.id);
              const hasError = hasPreprocessingError(node.id);
              const hasResult = hasPreprocessingResult(node.id);

              return (
                <div key={node.id} className="bg-gray-800 p-3 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{node.type}</div>
                    <div className="text-xs text-gray-400">{node.id}</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded text-xs ${
                        state.status === 'processing' ? 'bg-blue-600' :
                        state.status === 'completed' ? 'bg-green-600' :
                        state.status === 'error' ? 'bg-red-600' :
                        'bg-gray-600'
                      }`}>
                        {state.status}
                      </div>
                      
                      {isProcessing && (
                        <div className="text-xs text-blue-400">Processing...</div>
                      )}
                      
                      {hasError && (
                        <div className="text-xs text-red-400">
                          Error: {state.error}
                        </div>
                      )}
                      
                      {hasResult && (
                        <div className="text-xs text-green-400">
                          Result: {state.result?.preprocessor}
                        </div>
                      )}
                    </div>
                    
                    {state.status !== 'idle' && (
                      <button
                        onClick={() => clearPreprocessingState(node.id)}
                        className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};