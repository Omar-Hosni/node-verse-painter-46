// @ts-nocheck
import { toast } from 'sonner';
import { Node, Edge } from '@xyflow/react';
import { WorkflowJson } from './types';
import { getRunwareService } from '@/services/runwareService';

// Control Net Image Upload
export const uploadControlNetImage = async (
  nodeId: string,
  imageFile: File,
  apiKey: string | null,
  updateNodeData: (nodeId: string, data: any) => void
): Promise<void> => {
  try {
    if (!apiKey) {
      toast.error('API Key not set. Please set your API key in settings.');
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      };
    });
    reader.readAsDataURL(imageFile);
    const base64data = await base64Promise;

    // Simulate API call - In real implementation, we would send this to the API
    console.log(`Uploaded control net image for node ${nodeId} with API key ${apiKey.substring(0, 5)}...`);
    
    // Return the base64 data as the image URL
    updateNodeData(nodeId, { 
      image: base64data,
      uploading: false 
    });
  } catch (error: any) {
    console.error('Error uploading control net image:', error);
    toast.error(`Failed to upload image: ${error.message}`);
    updateNodeData(nodeId, { uploading: false });
  }
};

// Input Image Upload 
export const uploadInputImage = async (
  nodeId: string,
  imageFile: File,
  apiKey: string | null,
  updateNodeData: (nodeId: string, data: any) => void
): Promise<void> => {
  try {
    if (!apiKey) {
      toast.error('API Key not set. Please set your API key in settings.');
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      };
    });
    reader.readAsDataURL(imageFile);
    const base64data = await base64Promise;

    // Simulate API call - In real implementation, we would send this to the API
    console.log(`Uploaded input image for node ${nodeId} with API key ${apiKey.substring(0, 5)}...`);
    
    // Update node with image data and mark as not uploading
    updateNodeData(nodeId, { 
      image: base64data,
      uploading: false 
    });
  } catch (error: any) {
    console.error('Error uploading input image:', error);
    toast.error(`Failed to upload image: ${error.message}`);
    updateNodeData(nodeId, { uploading: false });
  }
};

// Generate an Image from the workflow nodes
export const generateImage = async (
  nodes: Node[],
  edges: Edge[],
  apiKey: string | null,
  updateNodeData: (nodeId: string, data: any) => void,
  useCreditsForGeneration: () => Promise<boolean>
): Promise<void> => {
  try {
    if (!apiKey) {
      toast.error('API Key not set. Please set your API key in settings.');
      return;
    }
    
    // Verify user has credits and use one
    const hasCredits = await useCreditsForGeneration();
    if (!hasCredits) {
      return;
    }
    
    toast.success('Image generation initiated...');
    
    // Create a proper WorkflowJson object
    const workflowJson: WorkflowJson = {
      nodes,
      edges,
      version: '1.0.0',
      settings: {
        autoLayout: false,
        snapToGrid: true,
        gridSize: 15,
        theme: 'dark'
      }
    };
    
    // Send workflow to API
    await sendWorkflowToAPI(workflowJson, updateNodeData, nodes);
    
  } catch (error: any) {
    console.error('Error generating image:', error);
    toast.error(`Failed to generate image: ${error.message}`);
    
    // Find preview node and update it to show the error
    const previewNode = nodes.find(n => n.type === 'previewNode');
    if (previewNode) {
      updateNodeData(previewNode.id, {
        error: error.message,
        loading: false
      });
    }
  }
};

// Send workflow to API with proper node functionality mapping
export const sendWorkflowToAPI = async (
  workflow: WorkflowJson,
  updateNodeData: (nodeId: string, data: any) => void,
  nodes: Node[]
): Promise<any> => {
  try {
    const apiKey = 'mroO1ot3dGvbiI9c7e9lQuvpxXyXxAjl'; // This should come from settings
    const runwareService = getRunwareService(apiKey);
    
    // Find nodes by functionality from node_schema.ts
    const inputNodes = nodes.filter(n => n.data?.functionality === 'input');
    const engineNodes = nodes.filter(n => n.data?.functionality === 'engine');
    const previewNodes = nodes.filter(n => n.data?.functionality === 'preview' || n.type === 'previewNode');
    const controlNetNodes = nodes.filter(n => n.data?.functionality === 'control-net');
    const loraNodes = nodes.filter(n => n.data?.functionality === 'lora');
    
    // Get prompt from text input nodes
    let prompt = 'A beautiful landscape';
    let negativePrompt = '';
    const textInputNode = inputNodes.find(n => n.data?.type === 'input-text');
    if (textInputNode && textInputNode.data?.right_sidebar) {
      const rightSidebar = textInputNode.data.right_sidebar as Record<string, any>;
      if (rightSidebar.prompt) {
        prompt = String(rightSidebar.prompt);
      }
      if (rightSidebar.negative) {
        negativePrompt = String(rightSidebar.negative);
      }
    }
    
    // Get model from engine nodes
    let model = 'runware:100@1';
    const engineNode = engineNodes[0];
    if (engineNode && engineNode.data?.model) {
      model = String(engineNode.data.model);
    }
    
    // Get LoRA configurations
    const loras = loraNodes.map(node => {
      const rightSidebar = (node.data?.right_sidebar as Record<string, any>) || {};
      return {
        name: String(node.data?.lora || 'realistic-vision'),
        strength: Number(rightSidebar.power || 80) / 100
      };
    });
    
    // Get ControlNet configurations
    const controlnets = controlNetNodes.map(node => {
      const rightSidebar = (node.data?.right_sidebar as Record<string, any>) || {};
      return {
        type: String(node.data?.controlnet || 'canny'),
        imageUrl: String(node.data?.image || ''),
        strength: Number(rightSidebar.strength || 80) / 100
      };
    }).filter(cn => cn.imageUrl); // Only include controlnets with images
    
    // Update preview nodes to show loading
    previewNodes.forEach(node => {
      updateNodeData(node.id, {
        loading: true,
        error: null
      });
    });
    
    console.log('Generating image with:', {
      prompt,
      negativePrompt,
      model,
      loras,
      controlnets
    });
    
    // Generate image with all configurations
    const result = await runwareService.generateImage({
      positivePrompt: prompt,
      negativePrompt: negativePrompt,
      model: model,
      width: 1024,
      height: 1024,
      numberResults: 1,
      outputFormat: 'WEBP',
      lora: loras,
      controlnet: controlnets
    });
    
    // Update preview nodes with result
    previewNodes.forEach(node => {
      updateNodeData(node.id, {
        image: result.imageURL,
        loading: false,
        error: null
      });
    });
    
    toast.success('Image generated successfully!');
    return { success: true, result };
    
  } catch (error) {
    console.error('Error in sendWorkflowToAPI:', error);
    
    // Update preview nodes with error
    const previewNodes = nodes.filter(n => n.data?.functionality === 'preview' || n.type === 'previewNode');
    previewNodes.forEach(node => {
      updateNodeData(node.id, {
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });
    
    toast.error('Failed to generate image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    throw error;
  }
};
