
import { Node, Edge } from '@xyflow/react';
import { WorkflowJson } from './types';

export const exportWorkflowAsJson = (nodes: Node[], edges: Edge[]): WorkflowJson => {
  return {
    nodes,
    edges,
    version: '1.0.0',
    settings: {
      // Default settings
      autoLayout: false,
      snapToGrid: true,
      gridSize: 15,
      theme: 'dark'
    }
  };
};

/**
 * Helper function to download object as a JSON file
 */
export const downloadObjectAsJson = (exportObj: object, exportName: string) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};
