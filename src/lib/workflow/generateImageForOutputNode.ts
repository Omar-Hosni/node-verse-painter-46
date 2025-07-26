import { Node as XYFlowNode, Edge as XYFlowEdge } from '@xyflow/react';
import { RunwareService } from '../../services/runwareService';
import { useRunwareStore } from '../../store/runwareStore';
import { compileRunwareRequest } from './compileRunwareRequest';
import { toast } from 'sonner';

export async function generateImageForOutputNode({
  workflowId,
  nodes,
  edges,
  outputNodeId,
  runwareService,
  updateCanvasNodeData
}: {
  workflowId: string;
  nodes: XYFlowNode[];
  edges: XYFlowEdge[];
  outputNodeId: string;
  runwareService: RunwareService;
  updateCanvasNodeData: (id: string, patch: any) => void;
}): Promise<void> {
  const runwareStore = useRunwareStore.getState();
  
  try {
    // Helper function to get node data
    const getNodeData = (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId);
      return node?.data || {};
    };
    
    // Step 1: Ensure all required images are uploaded to Runware
    const imageUploadPromises: Promise<void>[] = [];
    
    nodes.forEach(node => {
      const nodeData = getNodeData(node.id);
      const functionality = nodeData.functionality || node.data?.functionality;
      
      // Check if node has base64 image but no imageUUID
      if ((functionality === 'control-net' || functionality === 'image-to-image' || nodeData.image) 
          && nodeData.image && !nodeData.imageUUID) {
        
        const uploadPromise = (async () => {
          try {
            const { imageUUID, imageURL } = await runwareService.uploadImage(nodeData.image);
            updateCanvasNodeData(node.id, { 
              imageUUID, 
              imageUrl: imageURL,
              image: imageURL 
            });
          } catch (error) {
            console.error(`Failed to upload image for node ${node.id}:`, error);
            toast.error(`Failed to upload image for ${node.data?.label || node.id}`);
          }
        })();
        
        imageUploadPromises.push(uploadPromise);
      }
    });
    
    // Wait for all image uploads to complete
    if (imageUploadPromises.length > 0) {
      await Promise.all(imageUploadPromises);
      toast.success(`Uploaded ${imageUploadPromises.length} images to Runware`);
    }
    
    // Step 2: Compile the request
    const { kind, params } = compileRunwareRequest({
      nodes,
      edges,
      outputNodeId,
      getNodeData: (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        return node?.data || {};
      }
    });
    
    // Step 3: Create generation record
    const generationId = runwareStore.create(workflowId, outputNodeId, { kind, params });
    runwareStore.setStatus(generationId, "running");
    
    toast.info(`Starting ${kind} generation...`);
    
    // Step 4: Dispatch to appropriate Runware method
    let result: any;
    
    switch (kind) {
      case 'txt2img':
        result = await runwareService.txt2img(params);
        break;
        
      case 'img2img':
        if (!params.imageUUID) {
          throw new Error('Image UUID required for img2img generation');
        }
        const baseImageUUID = params.imageUUID;
        const img2imgParams = { ...params };
        delete img2imgParams.imageUUID;
        result = await runwareService.img2img(baseImageUUID, img2imgParams);
        break;
        
      case 'upscale':
        if (!params.imageUUID) {
          throw new Error('Image UUID required for upscale');
        }
        result = await runwareService.upscale(params.imageUUID, {
          scale: params.scale,
          model: params.model,
          faceEnhance: params.faceEnhance
        });
        break;
        
      // For other tools, fall back to img2img for now
      case 'inpaint':
      case 'outpaint':
      case 'removebg':
      case 'rescene':
      case 'remix':
      case 'relight':
        if (!params.imageUUID) {
          throw new Error(`Image UUID required for ${kind}`);
        }
        const toolBaseImageUUID = params.imageUUID;
        const toolParams = { ...params };
        delete toolParams.imageUUID;
        result = await runwareService.img2img(toolBaseImageUUID, toolParams);
        break;
        
      default:
        throw new Error(`Unsupported generation kind: ${kind}`);
    }
    
    // Step 5: Update generation record with success
    runwareStore.setStatus(generationId, "succeeded", { response: result });
    
    // Step 6: Update output node with result
    const outputNodeUpdate: any = {
      image: result.imageURL,
      imageUrl: result.imageURL,
      generatedAt: Date.now(),
    };
    
    // Add additional fields if available
    if (result.imageUUID) {
      outputNodeUpdate.imageUUID = result.imageUUID;
    }
    if (result.seed) {
      outputNodeUpdate.seed = result.seed;
    }
    if (result.positivePrompt) {
      outputNodeUpdate.positivePrompt = result.positivePrompt;
    }
    if (result.NSFWContent !== undefined) {
      outputNodeUpdate.NSFWContent = result.NSFWContent;
    }
    
    updateCanvasNodeData(outputNodeId, outputNodeUpdate);
    
    toast.success(`${kind} generation completed successfully!`);
    
  } catch (error) {
    console.error('Generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Update generation record with failure
    const generationId = runwareStore.byOutputNode[outputNodeId];
    if (generationId) {
      runwareStore.setStatus(generationId, "failed", { error: errorMessage });
    }
    
    // Update output node to show error state
    updateCanvasNodeData(outputNodeId, {
      error: errorMessage,
      generatedAt: Date.now(),
    });
    
    toast.error(`Generation failed: ${errorMessage}`);
    throw error;
  }
}