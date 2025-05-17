
import { Node, Edge } from '@xyflow/react';
import { WorkflowJson } from './types';

export const exportWorkflowAsJson = (nodes: Node[], edges: Edge[]): WorkflowJson => {
  // Initialize with required properties to satisfy TypeScript
  const workflowJson: WorkflowJson = {
    nodes: JSON.parse(JSON.stringify(nodes)), 
    edges: JSON.parse(JSON.stringify(edges)),
    version: '1.0',
    settings: {}
  };
  
  // Create a counter for node IDs in the JSON
  let idCounter = 1;
  
  // Map to store React Flow node ID to JSON node ID mapping
  const nodeIdMap = new Map<string, string>();
  
  // First pass: create node entries without connections
  nodes.forEach((node) => {
    const jsonNodeId = idCounter.toString();
    nodeIdMap.set(node.id, jsonNodeId);
    idCounter++;
    
    // Define the node structure based on node type
    switch (node.type) {
      case 'modelNode':
        workflowJson[jsonNodeId] = {
          inputs: {
            modelName: node.data.modelName as string || "runware:100@1",
            width: node.data.width as number || 512,
            height: node.data.height as number || 512,
            steps: node.data.steps as number || 30,
            cfgScale: node.data.cfgScale as number || 7.5,
            prompt: node.data.prompt as string || "",
            negativePrompt: node.data.negativePrompt as string || "",
          },
          class_type: "ModelNode",
          _meta: {
            title: node.data.displayName as string || "Model"
          }
        };
        break;
      case 'loraNode':
        workflowJson[jsonNodeId] = {
          inputs: {
            loraName: node.data.loraName as string || "",
            strength: node.data.strength as number || 0.8
          },
          class_type: "LoraNode",
          _meta: {
            title: node.data.displayName as string || "LoRA"
          }
        };
        break;
      case 'controlnetNode':
        workflowJson[jsonNodeId] = {
          inputs: {
            type: node.data.type as string || "canny",
            imageId: node.data.imageId as string || null,
            strength: node.data.strength as number || 0.8
          },
          class_type: "ControlnetNode",
          _meta: {
            title: node.data.displayName as string || `${node.data.type} Control`
          }
        };
        break;
      case 'previewNode':
        workflowJson[jsonNodeId] = {
          inputs: {
            image: node.data.image as string || null
          },
          class_type: "PreviewNode",
          _meta: {
            title: node.data.displayName as string || "Preview"
          }
        };
        break;
    }
  });
  
  // Second pass: add connections to the node inputs
  edges.forEach((edge) => {
    const sourceNodeJsonId = nodeIdMap.get(edge.source);
    const targetNodeJsonId = nodeIdMap.get(edge.target);
    
    if (sourceNodeJsonId && targetNodeJsonId && workflowJson[targetNodeJsonId]) {
      // Add connection to the target node's inputs
      if (!workflowJson[targetNodeJsonId].inputs.connections) {
        workflowJson[targetNodeJsonId].inputs.connections = [];
      }
      
      workflowJson[targetNodeJsonId].inputs.connections.push([sourceNodeJsonId, 0]);
    }
  });
  
  return workflowJson;
};
