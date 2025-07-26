# Runware Integration Guide

## Overview
This integration provides end-to-end Runware-powered image generation for the node-based GenAI workflow editor.

## Calling Generation from UI

To trigger image generation, call `generateImageForOutputNode()` from your "Generate Image" button:

```typescript
import { generateImageForOutputNode } from './lib/workflow/generateImageForOutputNode';
import { getRunwareService } from './services/runwareService';
import { useCanvasStore } from './store/useCanvasStore';

// In your component
const handleGenerateImage = async (outputNodeId: string) => {
  const { nodes, edges, runwayApiKey, updateNodeData } = useCanvasStore.getState();
  
  if (!runwayApiKey) {
    toast.error('Please set your Runware API key first');
    return;
  }
  
  const runwareService = getRunwareService({ apiKey: runwayApiKey });
  const workflowId = 'current-workflow'; // or get from your workflow state
  
  try {
    await generateImageForOutputNode({
      workflowId,
      nodes,
      edges,
      outputNodeId,
      runwareService,
      updateCanvasNodeData: updateNodeData
    });
  } catch (error) {
    console.error('Generation failed:', error);
  }
};
```

## Node Data Structure

Nodes should store the following data properties:

### For Image Nodes (input/output):
```typescript
{
  imageURL: string;     // Display URL for the image
  imageUUID: string;    // Runware's UUID for the image
  image: string;        // Same as imageURL (for backward compatibility)
}
```

### For Text Input Nodes:
```typescript
{
  text: string;                           // The prompt text
  promptType: "positive" | "negative";    // Whether this is positive or negative prompt
}
```

### For Engine Nodes:
```typescript
{
  model: string;        // Runware model ID (e.g., "runware:100@1")
  lora?: Array<{        // Optional LoRA attachments
    name: string;
    strength: number;
  }>;
}
```

### For LoRA Nodes:
```typescript
{
  name: string;         // LoRA identifier
  strength: number;     // Strength value (0.0 - 2.0)
}
```

### For ControlNet Nodes:
```typescript
{
  imageUUID: string;    // Guide image UUID from Runware
  strength: number;     // Control strength (0.0 - 2.0)
  model?: string;       // Override default model mapping
}
```

### For Tool Nodes (upscale, inpaint, etc.):
```typescript
{
  // Tool-specific parameters
  scale?: 2 | 4;        // For upscale
  mask?: string;        // For inpainting
  direction?: string;   // For outpainting
  strength?: number;    // For img2img tools
}
```

## Workflow Compilation

The system automatically:

1. **Walks the graph** from output node backwards through connected edges
2. **Extracts parameters** from each node type:
   - Engine nodes → model + LoRAs
   - Text inputs → positive/negative prompts
   - ControlNet nodes → guide images + models
   - Image nodes → base images for img2img
   - Tool nodes → specific parameters

3. **Determines generation type**:
   - `txt2img` - No base image, just prompts/controlnets
   - `img2img` - Has base image and any img2img tools
   - `upscale` - Ends with upscale tool
   - Other tools map to specialized endpoints

4. **Calls appropriate Runware method** with compiled parameters

## Generation States

Monitor generation progress via `useRunwareStore`:

```typescript
import { useRunwareStore } from './store/runwareStore';

const MyComponent = () => {
  const latestGeneration = useRunwareStore(state => 
    state.latestForOutput('my-output-node-id')
  );
  
  // latestGeneration.status will be:
  // "idle" | "running" | "succeeded" | "failed" | "canceled"
  
  return (
    <div>
      {latestGeneration?.status === 'running' && <div>Generating...</div>}
      {latestGeneration?.status === 'failed' && <div>Error: {latestGeneration.error}</div>}
    </div>
  );
};
```

## Image Upload Flow

1. **User uploads image** → RiveInput "Done" button or LayerImageNode file picker
2. **Automatic Runware upload** → Returns `imageUUID` and `imageURL`  
3. **Node data updated** → Both UUID (for API) and URL (for display) stored
4. **Ready for generation** → UUID used as guide image or base image in workflow

## Error Handling

- All errors are caught and displayed via toast notifications
- Generation records track error states in `runwareStore`
- Failed uploads retry automatically where appropriate
- Detailed error logging to console for debugging

## Performance Notes

- Images are uploaded to Runware only when needed
- Multiple concurrent uploads are batched
- Generation results are persisted across sessions
- Local caching provides immediate UI feedback