import React from 'react';
import { useWorkflowStore } from '@/store/workflowStore';

interface NodeProcessingIndicatorProps {
  nodeId: string;
  className?: string;
}

export const NodeProcessingIndicator: React.FC<NodeProcessingIndicatorProps> = ({ 
  nodeId, 
  className = "" 
}) => {
  const { isNodeProcessing } = useWorkflowStore();
  const isProcessing = isNodeProcessing(nodeId);

  if (!isProcessing) {
    return null;
  }

  return (
    <div className={`absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10 ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
        <span className="text-white text-xs font-medium">Processing...</span>
      </div>
    </div>
  );
};

export default NodeProcessingIndicator;