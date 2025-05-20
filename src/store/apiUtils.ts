
import { toast } from 'sonner';
import { Node, Edge } from '@xyflow/react';
import { WorkflowJson } from './types';

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
  useCreditsForGeneration: () => Promise<boolean>,
  sendWorkflowToAPI: () => Promise<any>
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
    
    // Send workflow to API
    const result = await sendWorkflowToAPI();
    
    // Find preview node and update it with the generated image
    const previewNode = nodes.find(n => n.type === 'previewNode');
    if (previewNode) {
      // For demo purposes, use a placeholder image
      updateNodeData(previewNode.id, {
        image: 'https://images.unsplash.com/photo-1682687981974-c5ef2111640c',
        loading: false
      });
    }
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

// Send workflow to API
export const sendWorkflowToAPI = async (
  workflow: WorkflowJson,
  updateNodeData: (nodeId: string, data: any) => void,
  nodes: Node[]
): Promise<any> => {
  // In a real implementation, you would send the workflow to the API
  // For now, simulate an API call with a delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Find preview node and update it with the generated image
  const previewNode = nodes.find(n => n.type === 'previewNode');
  if (previewNode) {
    updateNodeData(previewNode.id, {
      loading: true
    });
  }
  
  return { success: true };
};

// Export all the API utility functions
export {
  uploadControlNetImage,
  uploadInputImage,
  generateImage,
  sendWorkflowToAPI
};
