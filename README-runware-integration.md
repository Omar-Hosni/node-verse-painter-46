# Runware Integration - Complete Workflow System

## Overview
Complete implementation of 4-flow Runware integration: Text-to-Image, Image-to-Image, Flux Kontext, and Tools.

## Usage

### Generate from "Generate Image" button:
```typescript
// Automatically detects flow type and executes
await executeWorkflow({
  workflowId: 'project-id',
  outputNodeId: 'output-node-id', 
  nodes, edges, runwareService,
  updateCanvasNodeData
});
```

### Node Data Requirements:
- **Images**: `imageUUID`, `imageURL`, `image`
- **Text**: `text`, `promptType: 'positive'|'negative'` 
- **Engine**: `model`, `lora[]`
- **ControlNet**: `imageUUID`, `guidedImageURL`, `strength`
- **Tools**: scale, model, faceEnhance, margins, etc.

## Flow Detection:
1. **Tool** → upscale/remove-bg/inpaint/outpaint nodes
2. **Flux Kontext** → reference/re-scene/re-angle/re-mix nodes  
3. **Image-to-Image** → reimagine/rescene/objectrelight nodes
4. **Text-to-Image** → default with optional ControlNets

## Architecture:
- `runwareStore`: Persists generations + assets
- `compile.ts`: Workflow → Runware requests
- `execute.ts`: Orchestrates preprocessing + generation
- `LayerImageNode` + `RiveInput`: Upload to Runware, display results

System is client-side ready with server migration path.