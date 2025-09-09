# Preview Node as Input Extension

## Overview

This implementation extends the functionality of preview nodes to allow them to act as input nodes for continuous workflows. This enables users to create workflows where the output of one generation becomes the input for another, enabling complex multi-stage image processing pipelines.

## Key Changes Made

### 1. Enhanced Image Data Extraction (`workflowExecutor.ts`)

Modified the `extractImageDataFromNode` method to check for processed images from workflow execution:

```typescript
// Check for processed images from workflow execution (for preview nodes acting as inputs)
const processedImage = this.processedImages.get(node.id);
if (processedImage && typeof processedImage === "string") {
  return processedImage;
}
```

### 2. Updated Input Validation (`workflowExecutor.ts`)

Enhanced the `validateNodeInputs` method to properly handle preview nodes as both inputs and outputs:

```typescript
// Special handling for preview nodes - they can act as both input and output
if (nodeDataType === "previewNode" || node.type === "previewNode") {
  // Preview nodes can work with any valid image input
  const hasValidImageInput = Object.values(inputs).some(
    (input) =>
      typeof input === "string" &&
      (input.startsWith("http") ||
        input.startsWith("data:") ||
        input.startsWith("file:"))
  );

  if (hasValidImageInput) {
    console.log(`Preview node ${node.id} has valid image inputs`);
    return true;
  }

  // Also check if the node has any connected inputs at all
  if (Object.keys(inputs).length > 0) {
    console.log(
      `Preview node ${node.id} has ${
        Object.keys(inputs).length
      } connected inputs`
    );
    return true;
  }

  // Preview nodes can also work without inputs (as outputs)
  console.log(`Preview node ${node.id} has no inputs (acting as output)`);
  return true;
}
```

### 3. Enhanced Process Image Input (`workflowExecutor.ts`)

Updated the `processImageInput` method to handle preview nodes properly:

```typescript
// Check for generatedImage (for preview nodes acting as inputs)
if (
  node.data?.generatedImage &&
  typeof node.data.generatedImage === "string"
) {
  console.log(
    `Image input node ${node.id} using generated image: ${node.data.generatedImage}`
  );
  return node.data.generatedImage;
}

// Check for processed images from workflow execution (for preview nodes acting as inputs)
const processedImage = this.processedImages.get(node.id);
if (processedImage && typeof processedImage === "string") {
  console.log(
    `Image input node ${node.id} using processed image: ${processedImage}`
  );
  return processedImage;
}
```

### 4. Updated Process Output (`workflowExecutor.ts`)

Enhanced the `processOutput` method to ensure preview nodes can properly pass their generated images:

```typescript
// For preview nodes specifically, check if they already have a generated image
if (node.type === "previewNode" || (node.data?.type === "previewNode")) {
  const existingImage = 
    node.data?.generatedImage ||
    node.data?.imageUrl ||
    this.processedImages.get(node.id);
    
  if (existingImage && typeof existingImage === "string") {
    console.log(`Preview node ${node.id} using existing image: ${existingImage}`);
    
    // Update the workflow store with the existing image
    if (this.updateStoreCallback) {
      this.updateStoreCallback(node.id, existingImage);
    }
    
    // Store in our local cache
    this.processedImages.set(node.id, existingImage);
    
    return existingImage;
  }
}
```

## Workflow Examples

### Example 1: Basic Continuous Workflow
```
Input Image → ControlNet → Engine → Preview Node → ControlNet → Engine → Preview Node
```

### Example 2: Multi-Stage Processing
```
Input Image → Tool Node → Engine → Preview Node → Different Tool → Engine → Preview Node
```

### Example 3: Branching Workflow
```
Input Image → Engine → Preview Node ┬→ ControlNet → Engine → Preview Node
                                    └→ Tool Node → Engine → Preview Node
```

## Technical Benefits

1. **Seamless Integration**: Preview nodes maintain their original functionality while gaining input capabilities
2. **Performance Optimized**: Uses processed image cache to avoid re-uploading images
3. **Backward Compatible**: Existing workflows continue to work without changes
4. **Flexible Architecture**: Supports complex multi-stage workflows with branching and merging

## Testing

Created comprehensive tests in `src/services/__tests__/previewNodeInput.test.ts`:

- ✅ Preview nodes can act as image sources
- ✅ Processed images are properly extracted from workflow execution
- ✅ Preview nodes are recognized as valid image node types
- ✅ Image data is correctly extracted from preview nodes acting as inputs

## Usage Instructions

1. **Create Initial Workflow**: Set up your first workflow ending with a preview node
2. **Connect Preview Node**: Drag from the preview node's output handle to another node's input
3. **Continue Workflow**: Add ControlNet, tools, or engine nodes after the preview node
4. **Execute**: Run the workflow - the preview node will provide its generated image to the next stage

This implementation successfully enables the continuous workflow functionality you requested, allowing preview nodes to seamlessly transition from output nodes to input nodes for subsequent processing stages.