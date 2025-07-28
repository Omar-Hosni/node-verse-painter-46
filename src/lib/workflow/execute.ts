import { Node, Edge } from '@xyflow/react';
import { RunwareService } from '../../services/runwareService';
import { useRunwareStore } from '../../store/runwareStore';
import { compileWorkflow, CompileResult } from './compile';

export async function executeWorkflow({
  workflowId,
  outputNodeId,
  nodes,
  edges,
  runwareService,
  updateCanvasNodeData
}: {
  workflowId: string;
  outputNodeId: string;
  nodes: Node[];
  edges: Edge[];
  runwareService: RunwareService;
  updateCanvasNodeData: (id: string, patch: any) => void;
}): Promise<void> {
  const store = useRunwareStore.getState();
  
  try {
    // Step 1: Upload any local/base64 images that don't have imageUUID
    await uploadMissingImages(nodes, runwareService, updateCanvasNodeData, store);
    
    // Step 2: Compile the workflow
    const compiled = compileWorkflow({
      nodes,
      edges,
      outputNodeId,
      getNodeData: (nodeId) => nodes.find(n => n.id === nodeId)?.data || {}
    });
    
    // Step 3: Create generation record
    const generationId = store.createGen({
      workflowId,
      outputNodeId,
      flow: compiled.flow,
      request: compiled
    });
    
    store.setGenStatus(generationId, "running");
    
    try {
      // Step 4: Execute preprocessing steps
      if (compiled.preprocess) {
        await executePreprocessing(compiled.preprocess, runwareService, store, updateCanvasNodeData);
      }
      
      // Step 5: Execute main generation
      const result = await executeMainGeneration(compiled.main, runwareService);
      
      // Step 6: Store results
      store.setGenStatus(generationId, "succeeded", { response: result });
      
      // Update output node with result
      const imageURL = result.imageURL || result.url;
      const imageUUID = result.imageUUID || result.uuid;
      
      if (imageURL) {
        updateCanvasNodeData(outputNodeId, {
          image: imageURL,
          imageURL: imageURL,
          imageUUID: imageUUID,
          generationId
        });
        
        store.upsertAsset(outputNodeId, {
          imageURL,
          imageUUID,
        });
      }
      
    } catch (error) {
      console.error('Generation failed:', error);
      store.setGenStatus(generationId, "failed", { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
    
  } catch (error) {
    console.error('Workflow execution failed:', error);
    throw error;
  }
}

async function uploadMissingImages(
  nodes: Node[],
  runwareService: RunwareService,
  updateCanvasNodeData: (id: string, patch: any) => void,
  store: ReturnType<typeof useRunwareStore.getState>
): Promise<void> {
  const imagesToUpload = nodes.filter(node => {
    const hasLocalImage = node.data.image && !node.data.imageUUID;
    const isBase64 = typeof node.data.image === 'string' && node.data.image.startsWith('data:');
    return hasLocalImage || isBase64;
  });
  
  for (const node of imagesToUpload) {
    try {
      console.log(`Uploading image for node ${node.id}`);
      const { imageUUID, imageURL } = await runwareService.uploadImage(node.data.image as string);
      
      // Update node data
      updateCanvasNodeData(node.id, {
        imageUUID,
        imageURL,
        image: imageURL // Keep image property for backward compatibility
      });
      
      // Update store
      store.upsertAsset(node.id, {
        imageUUID,
        imageURL,
      });
      
      console.log(`Uploaded image for node ${node.id}: ${imageUUID}`);
    } catch (error) {
      console.error(`Failed to upload image for node ${node.id}:`, error);
      throw new Error(`Failed to upload image for node ${node.id}: ${error}`);
    }
  }
}

async function executePreprocessing(
  preprocessSteps: NonNullable<CompileResult['preprocess']>,
  runwareService: RunwareService,
  store: ReturnType<typeof useRunwareStore.getState>,
  updateCanvasNodeData: (id: string, patch: any) => void
): Promise<void> {
  // Map node control types to Runware preprocessor types
  const preprocessorMap: Record<string, string> = {
    'pose': 'openpose',
    'edge': 'canny', 
    'depth': 'depth',
    'segments': 'seg',
    'normal-map': 'normalbae',
    'reference': 'canny' // or appropriate preprocessor for reference
  };

  for (const step of preprocessSteps) {
    try {
      console.log(`Executing preprocessing for node ${step.nodeId}, type: ${step.controlType}`);
      
      const preprocessorType = preprocessorMap[step.controlType] || 'canny';
      
      // Call Runware's controlnet preprocessing
      const result = await runwareService.imageControlNetPreProcess(
        step.inputImageUUID,
        preprocessorType
      );
      
      const guidedImageURL = result.guidedImageURL;
      
      // Update node data with guided image
      updateCanvasNodeData(step.nodeId, {
        guidedImageURL
      });
      
      // Update store
      store.upsertAsset(step.nodeId, {
        guidedImageURL,
      });
      
      console.log(`Preprocessing completed for node ${step.nodeId}: ${guidedImageURL}`);
    } catch (error) {
      console.error(`Preprocessing failed for node ${step.nodeId}:`, error);
      throw new Error(`Preprocessing failed for node ${step.nodeId}: ${error}`);
    }
  }
}

async function executeMainGeneration(
  mainStep: CompileResult['main'],
  runwareService: RunwareService
): Promise<any> {
  console.log(`Executing main generation: ${mainStep.method}`, mainStep.params);
  
  switch (mainStep.method) {
    case "txt2img":
      return await runwareService.txt2img(mainStep.params);
    
    case "img2img":
      const { imageUUID, ...img2imgParams } = mainStep.params;
      return await runwareService.img2img(imageUUID, img2imgParams);
    
    case "upscale":
      const { imageUUID: upscaleImageUUID, ...upscaleParams } = mainStep.params;
      return await runwareService.upscale(upscaleImageUUID, upscaleParams);
    
    case "removeBackground":
      return await runwareService.removeBackground(mainStep.params);
    
    case "inpaint":
      return await runwareService.inpaint(mainStep.params);
    
    case "outpaint":
      return await runwareService.outpaint(mainStep.params);
    
    case "fluxKontext":
      return await runwareService.fluxKontext(mainStep.params);
    
    case "ipadapters":
      return await runwareService.ipadapters(mainStep.params);
    
    default:
      throw new Error(`Unsupported generation method: ${(mainStep as any).method}`);
  }
}