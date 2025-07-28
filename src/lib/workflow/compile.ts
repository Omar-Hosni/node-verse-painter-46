import { Node, Edge } from '@xyflow/react';
import { CONTROLNET_AIR_BY_NODE_TYPE } from '../runware/controlnetMap';

export type FlowKind = "t2i" | "i2i" | "flux-kontext" | "tool";

export interface CompileResult {
  flow: FlowKind;
  // Possible multi-step:
  // - preprocess steps (for controlnets)
  // - the main generation request
  preprocess?: Array<{
    nodeId: string;
    type: "controlnet-preprocess";
    inputImageUUID: string;
    controlType: string; // pose, depth, etc
  }>;
  main: {
    // which runwareService method we should call
    method:
      | "txt2img"
      | "img2img"
      | "fluxKontext"
      | "upscale"
      | "removeBackground"
      | "inpaint"
      | "outpaint"
      | "ipadapters";
    params: any; // exact shape for that method
    // for img2img/upscale/outpaint/inpaint we also include the imageUUID/mask etc.
  };
}

interface WorkflowNode extends Node {
  data: {
    functionality?: string;
    type?: string;
    right_sidebar?: any;
    imageUUID?: string;
    imageURL?: string;
    image?: string;
    promptType?: 'positive' | 'negative';
    strength?: number;
    creativity?: number;
    model?: string;
    lora?: string[];
    [key: string]: any;
  };
}

export function compileWorkflow({
  nodes,
  edges,
  outputNodeId,
  getNodeData,
}: {
  nodes: WorkflowNode[];
  edges: Edge[];
  outputNodeId: string;
  getNodeData: (nodeId: string) => any;
}): CompileResult {
  
  // Build node lookup and find upstream nodes for the output
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const upstreamNodes = findUpstreamNodes(outputNodeId, nodes, edges);
  
  // Categorize nodes by functionality
  const engineNodes = upstreamNodes.filter(n => n.data.functionality === 'engine');
  const loraNodes = upstreamNodes.filter(n => n.data.functionality === 'lora');
  const textNodes = upstreamNodes.filter(n => n.data.functionality === 'input' && n.type === 'input-text');
  const controlNetNodes = upstreamNodes.filter(n => n.data.functionality === 'control-net');
  const imageToImageNodes = upstreamNodes.filter(n => n.data.functionality === 'image-to-image');
  const imageNodes = upstreamNodes.filter(n => n.data.imageUUID || n.data.imageURL || n.data.image);
  
  // Determine flow based on node types
  const flow = determineFlow(upstreamNodes);
  
  // Extract common parameters
  const model = engineNodes[0]?.data.model || "runware:100@1";
  const loras = extractLoras(engineNodes, loraNodes);
  const { positivePrompt, negativePrompt } = extractPrompts(textNodes);
  
  switch (flow) {
    case "t2i":
      return compileT2I(upstreamNodes, model, loras, positivePrompt, negativePrompt);
    
    case "i2i":
      return compileI2I(upstreamNodes, imageToImageNodes, imageNodes, model, loras, positivePrompt, negativePrompt);
    
    case "flux-kontext":
      return compileFluxKontext(upstreamNodes, imageNodes, positivePrompt);
    
    case "tool":
      return compileTool(upstreamNodes, imageNodes);
    
    default:
      throw new Error(`Unsupported flow: ${flow}`);
  }
}

function findUpstreamNodes(targetId: string, nodes: WorkflowNode[], edges: Edge[]): WorkflowNode[] {
  const visited = new Set<string>();
  const result: WorkflowNode[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  function dfs(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (node) {
      result.push(node);
    }
    
    // Find all edges that target this node
    const incomingEdges = edges.filter(e => e.target === nodeId);
    for (const edge of incomingEdges) {
      dfs(edge.source);
    }
  }
  
  dfs(targetId);
  return result;
}

function determineFlow(nodes: WorkflowNode[]): FlowKind {
  // Check for tools first
  const toolNodes = nodes.filter(n => 
    n.type?.includes('upscale') || 
    n.type?.includes('remove-bg') || 
    n.type?.includes('inpainting') || 
    n.type?.includes('outpainting')
  );
  if (toolNodes.length > 0) return "tool";
  
  // Check for Flux Kontext nodes
  const fluxNodes = nodes.filter(n => 
    n.type === 'control-net-reference' ||
    n.type === 'image-to-image-rescene' ||
    n.type === 'image-to-image-reangle' ||
    n.type === 'image-to-image-remix'
  );
  if (fluxNodes.length > 0) return "flux-kontext";
  
  // Check for image-to-image nodes
  const i2iNodes = nodes.filter(n => n.data.functionality === 'image-to-image');
  if (i2iNodes.length > 0) return "i2i";
  
  // Default to text-to-image
  return "t2i";
}

function extractLoras(engineNodes: WorkflowNode[], loraNodes: WorkflowNode[]): any[] {
  const loras: any[] = [];
  
  // Extract from engine nodes
  engineNodes.forEach(node => {
    if (node.data.lora) {
      loras.push(...node.data.lora);
    }
  });
  
  // Extract from dedicated lora nodes
  loraNodes.forEach(node => {
    if (node.data.lora) {
      loras.push(node.data.lora);
    }
  });
  
  return loras;
}

function extractPrompts(textNodes: WorkflowNode[]): { positivePrompt: string; negativePrompt: string } {
  const positivePrompts: string[] = [];
  const negativePrompts: string[] = [];
  
  textNodes.forEach(node => {
    const prompt = node.data.text || node.data.value || '';
    if (prompt.trim()) {
      if (node.data.promptType === 'negative') {
        negativePrompts.push(prompt.trim());
      } else {
        positivePrompts.push(prompt.trim());
      }
    }
  });
  
  return {
    positivePrompt: positivePrompts.join('\n\n') || 'A beautiful image',
    negativePrompt: negativePrompts.join('\n\n')
  };
}

function compileT2I(
  nodes: WorkflowNode[], 
  model: string, 
  loras: any[], 
  positivePrompt: string, 
  negativePrompt: string
): CompileResult {
  const controlNetNodes = nodes.filter(n => 
    n.data.functionality === 'control-net' && 
    n.type !== 'control-net-lights' // lights is special - used as seed image
  );
  
  const lightsNode = nodes.find(n => n.type === 'control-net-lights');
  
  // Build preprocess steps for controlnets
  const preprocess = controlNetNodes
    .filter(n => n.data.imageUUID || n.data.imageURL)
    .map(n => ({
      nodeId: n.id,
      type: "controlnet-preprocess" as const,
      inputImageUUID: n.data.imageUUID!,
      controlType: n.type!.replace('control-net-', '')
    }));
  
  // Build controlNet array for main request
  const controlNet = controlNetNodes.map(n => ({
    type: n.type!.replace('control-net-', ''),
    guideImage: n.data.guidedImageURL || n.data.imageURL || n.data.image,
    strength: n.data.right_sidebar?.strength || n.data.strength || 1.0,
    model: CONTROLNET_AIR_BY_NODE_TYPE[n.type!] || "runware:25@1"
  })).filter(cn => cn.guideImage);
  
  const params: any = {
    positivePrompt,
    model,
    width: 1024,
    height: 1024,
    numberResults: 1,
    outputFormat: "WEBP",
    CFGScale: 7.5,
    scheduler: "EulerDiscreteScheduler",
    steps: 30,
    strength: 0.8,
    lora: loras
  };
  
  // Only add negativePrompt if it has valid content
  if (negativePrompt && negativePrompt.trim().length >= 2) {
    params.negativePrompt = negativePrompt;
  }
  
  if (controlNet.length > 0) {
    params.controlnet = controlNet;
  }
  
  // If lights node exists, this becomes img2img with seed image
  if (lightsNode && (lightsNode.data.imageUUID || lightsNode.data.imageURL)) {
    return {
      flow: "t2i",
      preprocess: preprocess.length > 0 ? preprocess : undefined,
      main: {
        method: "img2img",
        params: {
          ...params,
          imageUUID: lightsNode.data.imageUUID,
          // Lights provides seed/base image for img2img
        }
      }
    };
  }
  
  return {
    flow: "t2i",
    preprocess: preprocess.length > 0 ? preprocess : undefined,
    main: {
      method: "txt2img",
      params
    }
  };
}

function compileI2I(
  nodes: WorkflowNode[], 
  i2iNodes: WorkflowNode[], 
  imageNodes: WorkflowNode[],
  model: string, 
  loras: any[], 
  positivePrompt: string, 
  negativePrompt: string
): CompileResult {
  const baseImageNode = imageNodes.find(n => n.data.imageUUID);
  if (!baseImageNode) {
    throw new Error("Image-to-image requires a base image");
  }
  
  const i2iNode = i2iNodes[0];
  const strength = i2iNode?.data.creativity || i2iNode?.data.strength || 0.8;
  
  const params: any = {
    positivePrompt,
    model,
    numberResults: 1,
    outputFormat: "WEBP",
    CFGScale: 7.5,
    scheduler: "EulerDiscreteScheduler",
    steps: 30,
    strength,
    lora: loras
  };
  
  if (negativePrompt && negativePrompt.trim().length >= 2) {
    params.negativePrompt = negativePrompt;
  }
  
  return {
    flow: "i2i",
    main: {
      method: "img2img",
      params: {
        imageUUID: baseImageNode.data.imageUUID,
        ...params
      }
    }
  };
}

function compileFluxKontext(
  nodes: WorkflowNode[], 
  imageNodes: WorkflowNode[], 
  positivePrompt: string
): CompileResult {
  const fluxNode = nodes.find(n => 
    n.type === 'control-net-reference' ||
    n.type === 'image-to-image-rescene' ||
    n.type === 'image-to-image-reangle' ||
    n.type === 'image-to-image-remix'
  );
  
  if (!fluxNode) {
    throw new Error("No Flux Kontext node found");
  }
  
  switch (fluxNode.type) {
    case 'control-net-reference':
      return compileReference(fluxNode, imageNodes, positivePrompt);
    
    case 'image-to-image-rescene':
      return compileRescene(fluxNode, imageNodes, positivePrompt);
    
    case 'image-to-image-reangle':
      return compileReangle(fluxNode, imageNodes, positivePrompt);
    
    case 'image-to-image-remix':
      return compileRemix(fluxNode, imageNodes, positivePrompt);
    
    default:
      throw new Error(`Unsupported Flux Kontext type: ${fluxNode.type}`);
  }
}

function compileReference(node: WorkflowNode, imageNodes: WorkflowNode[], positivePrompt: string): CompileResult {
  const referenceImage = imageNodes.find(n => n.data.imageUUID);
  if (!referenceImage) {
    throw new Error("Reference node requires an input image");
  }
  
  const referenceType = node.data.right_sidebar?.referenceType || 'style';
  
  return {
    flow: "flux-kontext",
    main: {
      method: "fluxKontext",
      params: {
        prompt: positivePrompt || "Apply the reference style to generate a new image",
        referenceImage: referenceImage.data.imageUUID,
        referenceType,
        strength: node.data.right_sidebar?.strength || 0.8
      }
    }
  };
}

function compileRescene(node: WorkflowNode, imageNodes: WorkflowNode[], positivePrompt: string): CompileResult {
  const sceneImage = imageNodes.find(n => n.data.tag === 'SCENE');
  const objectImage = imageNodes.find(n => n.data.tag === 'OBJECT');
  
  if (!sceneImage || !objectImage) {
    throw new Error("Re-scene requires both SCENE and OBJECT images");
  }
  
  const defaultPrompt = "Seamlessly blend the object into the scene while maintaining realistic lighting and perspective";
  
  return {
    flow: "flux-kontext",
    main: {
      method: "fluxKontext",
      params: {
        prompt: positivePrompt || defaultPrompt,
        sceneImage: sceneImage.data.imageUUID,
        objectImage: objectImage.data.imageUUID,
        strength: node.data.right_sidebar?.strength || 0.8
      }
    }
  };
}

function compileReangle(node: WorkflowNode, imageNodes: WorkflowNode[], positivePrompt: string): CompileResult {
  const inputImage = imageNodes.find(n => n.data.imageUUID);
  if (!inputImage) {
    throw new Error("Re-angle requires an input image");
  }
  
  const angle = node.data.right_sidebar?.angle || 15;
  const direction = node.data.right_sidebar?.direction || 'up';
  const defaultPrompt = `Change the camera angle of this image by ${angle} degrees ${direction}`;
  
  return {
    flow: "flux-kontext",
    main: {
      method: "fluxKontext",
      params: {
        prompt: positivePrompt || defaultPrompt,
        inputImage: inputImage.data.imageUUID,
        angle,
        direction,
        strength: node.data.right_sidebar?.strength || 0.8
      }
    }
  };
}

function compileRemix(node: WorkflowNode, imageNodes: WorkflowNode[], positivePrompt: string): CompileResult {
  const inputImages = imageNodes.filter(n => n.data.imageUUID);
  if (inputImages.length === 0) {
    throw new Error("Re-mix requires at least one input image");
  }
  
  const ipAdapters = inputImages.map(img => ({
    imageUUID: img.data.imageUUID,
    strength: img.data.strength || 0.8
  }));
  
  return {
    flow: "flux-kontext",
    main: {
      method: "ipadapters",
      params: {
        prompt: positivePrompt || "Create a creative remix combining the input images",
        ipAdapters,
        strength: node.data.right_sidebar?.strength || 0.8
      }
    }
  };
}

function compileTool(nodes: WorkflowNode[], imageNodes: WorkflowNode[]): CompileResult {
  const toolNode = nodes.find(n => 
    n.type?.includes('upscale') || 
    n.type?.includes('remove-bg') || 
    n.type?.includes('inpainting') || 
    n.type?.includes('outpainting')
  );
  
  if (!toolNode) {
    throw new Error("No tool node found");
  }
  
  const inputImage = imageNodes.find(n => n.data.imageUUID);
  if (!inputImage) {
    throw new Error("Tool operations require an input image");
  }
  
  if (toolNode.type?.includes('upscale')) {
    return {
      flow: "tool",
      main: {
        method: "upscale",
        params: {
          imageUUID: inputImage.data.imageUUID,
          scale: toolNode.data.right_sidebar?.scale || 4,
          model: toolNode.data.right_sidebar?.model || "ESRGAN-4x",
          faceEnhance: toolNode.data.right_sidebar?.faceEnhance || false
        }
      }
    };
  }
  
  if (toolNode.type?.includes('remove-bg')) {
    return {
      flow: "tool",
      main: {
        method: "removeBackground",
        params: {
          imageUUID: inputImage.data.imageUUID
        }
      }
    };
  }
  
  if (toolNode.type?.includes('inpainting')) {
    return {
      flow: "tool",
      main: {
        method: "inpaint",
        params: {
          imageUUID: inputImage.data.imageUUID,
          maskUUID: toolNode.data.maskUUID,
          prompt: toolNode.data.prompt || "Inpaint this area"
        }
      }
    };
  }
  
  if (toolNode.type?.includes('outpainting')) {
    return {
      flow: "tool",
      main: {
        method: "outpaint",
        params: {
          imageUUID: inputImage.data.imageUUID,
          margins: toolNode.data.right_sidebar?.margins || { top: 100, bottom: 100, left: 100, right: 100 }
        }
      }
    };
  }
  
  throw new Error(`Unsupported tool type: ${toolNode.type}`);
}