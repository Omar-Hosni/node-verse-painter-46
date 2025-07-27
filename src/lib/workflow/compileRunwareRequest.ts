import { Node as XYFlowNode, Edge as XYFlowEdge } from '@xyflow/react';
import { CONTROLNET_MODEL_BY_TYPE } from '../runware/controlnetMap';

export interface CompileResult {
  kind: "txt2img" | "img2img" | "upscale" | "inpaint" | "outpaint" | "removebg" | "rescene" | "remix" | "relight";
  params: any;
}

export function compileRunwareRequest({
  nodes,
  edges,
  outputNodeId,
  getNodeData
}: {
  nodes: XYFlowNode[];
  edges: XYFlowEdge[];
  outputNodeId: string;
  getNodeData: (nodeId: string) => any;
}): CompileResult {
  
  // Build node lookup for easy access
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  
  // Build edge lookup for traversal
  const incomingEdges = new Map<string, XYFlowEdge[]>();
  edges.forEach(edge => {
    if (!incomingEdges.has(edge.target)) {
      incomingEdges.set(edge.target, []);
    }
    incomingEdges.get(edge.target)!.push(edge);
  });
  
  // Find all upstream nodes from output node
  const visitedNodes = new Set<string>();
  const upstreamNodes: XYFlowNode[] = [];
  
  function traverseUpstream(nodeId: string) {
    if (visitedNodes.has(nodeId)) return;
    visitedNodes.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (node) {
      upstreamNodes.push(node);
    }
    
    const incoming = incomingEdges.get(nodeId) || [];
    incoming.forEach(edge => {
      traverseUpstream(edge.source);
    });
  }
  
  traverseUpstream(outputNodeId);
  
  // Extract components from upstream nodes
  let model = "runware:100@1"; // default
  const loras: any[] = [];
  const positivePrompts: string[] = [];
  const negativePrompts: string[] = [];
  const controlNets: any[] = [];
  let baseImageUUID: string | undefined;
  let baseImageNode: XYFlowNode | undefined;
  let lastTool: string | undefined;
  let toolParams: any = {};
  
  // Default parameters
  const defaultParams = {
    steps: 30,
    CFGScale: 7.5,
    scheduler: "EulerDiscreteScheduler",
    numberResults: 1,
    outputFormat: "WEBP",
    width: 1024,
    height: 1024,
  };
  
  // Process each upstream node
  upstreamNodes.forEach(node => {
    const nodeData = getNodeData(node.id);
    const functionality = nodeData?.functionality || node.data?.functionality;
    
    switch (functionality) {
      case 'engine':
        if (nodeData?.model) {
          model = nodeData.model;
        }
        if (nodeData?.lora && Array.isArray(nodeData.lora)) {
          loras.push(...nodeData.lora);
        }
        break;
        
      case 'lora':
        if (nodeData?.name && nodeData?.strength) {
          loras.push({
            name: nodeData.name,
            strength: nodeData.strength
          });
        }
        break;
        
      case 'input':
        if (node.type === 'input-text') {
          const text = nodeData?.text || nodeData?.value || '';
          const promptType = nodeData?.promptType || 'positive';
          
          if (promptType === 'negative') {
            negativePrompts.push(text);
          } else {
            positivePrompts.push(text);
          }
        }
        break;
        
      case 'control-net':
        if (nodeData?.imageUUID || nodeData?.image) {
          const controlNetType = node.type;
          const modelKey = CONTROLNET_MODEL_BY_TYPE[controlNetType];
          
          if (modelKey) {
            controlNets.push({
              type: controlNetType.replace('control-net-', ''),
              guideImage: nodeData.imageUUID || nodeData.image,
              strength: nodeData.strength || 1.0,
              model: nodeData.model || modelKey
            });
          }
        }
        break;
        
      case 'image-to-image':
        lastTool = node.type;
        
        // Extract tool-specific parameters
        if (node.type === 'image-to-image-upscale') {
          toolParams.scale = nodeData?.scale || 4;
          toolParams.model = nodeData?.model || "ESRGAN-4x";
          toolParams.faceEnhance = nodeData?.faceEnhance || false;
        } else if (node.type === 'image-to-image-inpainting') {
          toolParams.mask = nodeData?.mask;
        } else if (node.type === 'image-to-image-outpainting') {
          toolParams.outpaintingDirection = nodeData?.direction || 'all';
        }
        
        // Look for base image in this node or upstream
        if (nodeData?.imageUUID) {
          baseImageUUID = nodeData.imageUUID;
          baseImageNode = node;
        }
        break;
        
      case 'output':
        // This is our target output node
        break;
        
      default:
        // Check if this node has an image that could be used as base
        if (nodeData?.imageUUID && !baseImageUUID) {
          baseImageUUID = nodeData.imageUUID;
          baseImageNode = node;
        }
        break;
    }
  });
  
  // If no base image found but we have control nets, try to find an image from any upstream node
  if (!baseImageUUID && controlNets.length === 0) {
    const imageNode = upstreamNodes.find(node => {
      const data = getNodeData(node.id);
      return data?.imageUUID || data?.image;
    });
    
    if (imageNode) {
      const data = getNodeData(imageNode.id);
      baseImageUUID = data?.imageUUID || data?.image;
      baseImageNode = imageNode;
    }
  }
  
  // Determine generation kind and build parameters
  let kind: CompileResult['kind'] = 'txt2img';
  let params: any = {
    ...defaultParams,
    model,
    positivePrompt: positivePrompts.join('\n\n') || 'high quality image',
    lora: loras,
  };
  
  // Only add negativePrompt if we have valid negative prompts
  const negativePromptText = negativePrompts.join('\n\n').trim();
  if (negativePromptText.length >= 2) {
    params.negativePrompt = negativePromptText;
  }
  
  // Add controlnets if any
  if (controlNets.length > 0) {
    params.controlnet = controlNets;
  }
  
  // Determine the kind based on the workflow
  if (lastTool === 'image-to-image-upscale') {
    kind = 'upscale';
    params = {
      imageUUID: baseImageUUID,
      ...toolParams
    };
  } else if (lastTool && lastTool.startsWith('image-to-image-')) {
    kind = 'img2img';
    params.imageUUID = baseImageUUID;
    params.strength = toolParams.strength || 0.8;
    
    // Map specific tools
    switch (lastTool) {
      case 'image-to-image-inpainting':
        kind = 'inpaint';
        break;
      case 'image-to-image-remove-outpainting':
        kind = 'outpaint';
        break;
      case 'image-to-image-remove-bg':
        kind = 'removebg';
        break;
      case 'image-to-image-rescene':
        kind = 'rescene';
        break;
      case 'image-to-image-remix':
        kind = 'remix';
        break;
      case 'image-to-image-objectrelight':
        kind = 'relight';
        break;
    }
  } else if (baseImageUUID && (controlNets.length > 0 || lastTool)) {
    kind = 'img2img';
    params.imageUUID = baseImageUUID;
    params.strength = 0.8;
  }
  
  return { kind, params };
}