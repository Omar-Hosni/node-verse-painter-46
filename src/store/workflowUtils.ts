import { Node, Edge } from '@xyflow/react';
import { WorkflowJson } from './types';

export const exportWorkflowAsJson = (nodes: Node[], edges: Edge[]): WorkflowJson => {
  return {
    nodes,
    edges,
    version: '1.0.0',
    settings: {
      // Default settings
    }
  };
};
