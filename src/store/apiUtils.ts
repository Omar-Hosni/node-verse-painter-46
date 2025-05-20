import { toast } from 'sonner';
import { getRunwareService } from '@/services/runwareService';
import { WorkflowJson } from './types';
import { Node } from '@xyflow/react';

export const uploadControlNetImage = async (
  nodeId: string, 
  imageData: File, 
  apiKey: string | null,
  updateNodeData: (nodeId: string, data: any) => void
) => {
  try {
    if (!apiKey) {
      toast.error("API key not set! Please set your API key in the settings.");
      return;
    }

    // Set uploading flag
    updateNodeData(nodeId, { uploading: true });
    
    // Get RunwareService instance and upload image
    const runwareService = getRunwareService(apiKey);
    const uploadedImage = await runwareService.uploadImage(imageData);
    
    // Update node with uploaded image ID
    updateNodeData(nodeId, {
      imageId: uploadedImage.imageUUID,
      uploading: false
    });
    
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Reset uploading flag
    updateNodeData(nodeId, { uploading: false });
    
    // Show error
    toast.error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const uploadInputImage = async (
  nodeId: string, 
  imageData: File,
  apiKey: string | null,
  updateNodeData: (nodeId: string, newData: any) => void
) => {
  try {
    if (!apiKey) {
      toast.error("API key not set! Please set your API key in the settings.");
      return;
    }

    // Set uploading flag
    updateNodeData(nodeId, { uploading: true });
    
    // Get RunwareService instance and upload image
    const runwareService = getRunwareService(apiKey);
    const uploadedImage = await runwareService.uploadImage(imageData);
    
    // Update node with uploaded image ID
    updateNodeData(nodeId, {
      imageId: uploadedImage.imageUUID,
      uploading: false
    });
    
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Reset uploading flag
    updateNodeData(nodeId, { uploading: false });
    
    // Show error
    toast.error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const sendWorkflowToAPI = async (
  workflowJson: any,
  updateNodeData: (nodeId: string, data: any) => void,
  nodes: any[]
) => {
  try {
    // Send to local API
    const response = await fetch('http://localhost:8000/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workflow: workflowJson }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'API request failed');
    }

    const result = await response.json();
    
    // Find preview node and update it with the result
    const previewNode = nodes.find(n => n.type === 'previewNode');
    if (previewNode && result.imageUrl) {
      updateNodeData(previewNode.id, { image: result.imageUrl });
    }
    
    return true;
  } catch (error) {
    console.error('Error sending workflow to API:', error);
    toast.error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

export const generateImage = async (
  nodes: any[],
  edges: any[],
  apiKey: string | null,
  updateNodeData: (nodeId: string, data: any) => void,
  useCreditsForGeneration: () => Promise<boolean>,
  sendWorkflowToAPI: () => Promise<any>
) => {
  const modelNode = nodes.find(n => n.type === 'modelNode');
  if (!modelNode) {
    toast.error("No model node found! Please add a model node to your canvas.");
    return;
  }

  if (!apiKey) {
    toast.error("Runware API key not set! Please set your API key in the settings.");
    return;
  }

  // Check if user has enough credits
  const hasEnoughCredits = await useCreditsForGeneration();
  if (!hasEnoughCredits) {
    toast.error("Not enough credits! Please purchase more credits to continue generating images.");
    return;
  }

  // Use local API endpoint instead of Runware API
  const hasAPIAccess = await sendWorkflowToAPI();
  if (hasAPIAccess) {
    toast.success("Image generation request sent to API successfully!");
    return;
  }
  
  const loraNodes = nodes.filter(n => n.type === 'loraNode');
  const controlNetNodes = nodes.filter(n => n.type === 'controlnetNode');
  const previewNode = nodes.find(n => n.type === 'previewNode');
  if (!previewNode) {
    toast.error("No preview node found! Please add a preview node to your canvas.");
    return;
  }

  try {
    toast.info("Preparing image generation...");
    
    // Get RunwareService instance
    const runwareService = getRunwareService(apiKey);
    
    // Check if all ControlNet nodes with images have their images already uploaded
    for (const node of controlNetNodes) {
      if (node.data.image && !node.data.imageId) {
        // We need to upload this image first
        toast.info(`Uploading ${node.data.type} control image...`);
        
        // Set uploading flag
        updateNodeData(node.id, { 
          uploading: true 
        });
        
        try {
          // Fix: Ensure we're passing a string to uploadImage
          const imageData = node.data.image as string;
          const uploadedImage = await runwareService.uploadImage(imageData);
          console.log(`${node.data.type} image uploaded:`, uploadedImage);
          
          // Update node with the uploaded image ID
          updateNodeData(node.id, {
            imageId: uploadedImage.imageUUID,
            uploading: false
          });
        } catch (error) {
          console.error(`Error uploading ${node.data.type} image:`, error);
          
          // Reset uploading flag
          updateNodeData(node.id, { uploading: false });
          
          // Show error and abort generation
          toast.error(`Failed to upload ${node.data.type} control image: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
      }
    }

    // All ControlNet images are uploaded, proceed with image generation
    toast.info("Generating image...");
    
    const loraArray = loraNodes
      .filter(n => n.data.loraName)
      .map(n => ({
        name: n.data.loraName as string,
        strength: Number(n.data.strength) as number
      }));
    
    const controlnetArray = controlNetNodes
      .filter(n => n.data.image && n.data.imageId)
      .map(n => {
        return {
          type: n.data.type as string,
          imageUrl: n.data.imageId as string, // Use the uploaded image ID
          strength: Number(n.data.strength) as number
        };
      });
    
    const params = {
      positivePrompt: modelNode.data.prompt as string || "beautiful landscape",
      negativePrompt: modelNode.data.negativePrompt as string || "",
      model: modelNode.data.modelName as string || "runware:100@1",
      width: Number(modelNode.data.width) || 1024,
      height: Number(modelNode.data.height) || 1024,
      CFGScale: Number(modelNode.data.cfgScale) || 7.5,
      scheduler: "EulerDiscreteScheduler",
      steps: Number(modelNode.data.steps) || 30,
      lora: loraArray.length > 0 ? loraArray : undefined,
      controlnet: controlnetArray.length > 0 ? controlnetArray : undefined,
    };
    
    console.log("Generating image with params:", params);
    
    const generatedImage = await runwareService.generateImage(params);
    
    console.log("Generated image:", generatedImage);
    
    if (generatedImage && generatedImage.imageURL) {
      updateNodeData(previewNode.id, { image: generatedImage.imageURL });
      toast.success("Image generated successfully!");
    } else {
      toast.error("Failed to generate image. Please try again.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    toast.error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
