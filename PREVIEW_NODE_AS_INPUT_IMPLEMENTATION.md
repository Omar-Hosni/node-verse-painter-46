# Preview Node as Input Implementation

## Overview

This implementation enables preview nodes (`previewNode`, `output`, `preview-realtime-node`) to act as input nodes for continuous workflows. This allows users to create workflows where the output of one generation becomes the input for another, enabling complex multi-stage image processing pipelines.

## Key Changes Made

### 1. Workflow Executor Updates (`src/services/workflowExecutor.ts`)

#### Enhanced Image URL Extraction
- **Modified `extractImageUrlFromNode()`**: Added priority check for processed images from workflow execution
- **Added processed image lookup**: Preview nodes now check the workflow's processed image cache first
- **Enhanced image source types**: Added `output` type to the list of valid image source node types

```typescript
// PRIORITY 2: Check for processed images from workflow execution (for preview nodes acting as inputs)
const processedImage = this.processedImages.get(node.id);
if (processedImage && typeof processedImage === 'string') {
  console.log(`Using processed image for node ${node.id}: ${processedImage}`);
  return processedImage;
}

// PRIORITY 3: Check primary locations for URL strings
const possibleUrls = [
  node.data?.generatedImage,  // Add generatedImage as high priority for preview nodes
  node.data?.imageUrl,
  // ... other sources
];
```

#### Image Node Type Recognition
- **Updated image node types array**: Added `output` type to be recognized as a valid image source
- **Enhanced validation**: Preview nodes are now properly recognized as image-providing nodes

### 2. Connection Validation Updates (`src/utils/connectionUtils.ts`)

#### Preview Node Connection Rules
- **Added preview node source detection**: Identifies when preview nodes are being used as sources
- **Added image input target detection**: Identifies valid targets that can accept image inputs
- **Enabled preview-to-node connections**: Allows preview nodes to connect to ControlNet, tools, engines, and other preview nodes

```typescript
// Allow preview nodes to act as image sources for continuous workflows
const isPreviewNodeSource = sourceNode.type === 'previewNode' || 
                            sourceNode.type === 'output' || 
                            sourceNode.type === 'preview-realtime-node' ||
                            sourceFunctionality === 'output';

const isImageInputTarget = targetNode.type === 'image-node' ||
                          targetFunctionality === 'control-net' ||
                          targetFunctionality === 'image-to-image' ||
                          targetFunctionality === 'engine' ||
                          targetNode.type === 'previewNode' ||
                          targetNode.type === 'output';

// Allow preview nodes to connect to other nodes that accept image inputs
if (isPreviewNodeSource && isImageInputTarget) {
  return true; // Allow preview nodes to act as image sources
}
```

### 3. Workflow Store Updates (`src/store/workflowStore.ts`)

#### Image Input Connection Detection
- **Enhanced `hasImageInputConnections()`**: Added preview node types to the list of valid image sources
- **Updated image edge filtering**: Preview nodes are now recognized when filtering for image connections
- **Enhanced image extraction**: Added processed image lookup for preview nodes in preprocessing

```typescript
// Updated to include preview nodes as valid image sources
return incomingEdges.some((edge) => {
  const sourceNode = nodes.find((node) => node.id === edge.source);
  return (
    sourceNode &&
    (sourceNode.type === "image-node" ||
      sourceNode.type?.includes("image") ||
      sourceNode.type?.includes("preview") ||
      sourceNode.type === "previewNode" ||
      sourceNode.type === "output" ||
      sourceNode.data?.image ||
      sourceNode.data?.imageUrl ||
      sourceNode.data?.generatedImage)
  );
});
```

#### ControlNet Preprocessing Support
- **Enhanced image data extraction**: Preview nodes can now provide images for ControlNet preprocessing
- **Added processed image priority**: Workflow-generated images take priority over static image URLs
- **Improved image source detection**: Multiple fallback locations for finding image data

### 4. Validation Updates

#### Node Validation
- **Removed outgoing connection restrictions**: Preview nodes can now have outgoing connections without warnings
- **Enhanced image source validation**: Preview nodes are properly validated as image sources
- **Maintained input requirements**: Preview nodes still require input connections to function as outputs

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

Created comprehensive tests in `src/services/__tests__/previewNodeAsInput.test.ts`:

- ✅ Preview nodes can act as image sources
- ✅ Processed images are properly extracted from workflow execution
- ✅ Preview nodes are recognized as valid image node types

## Usage Instructions

1. **Create Initial Workflow**: Set up your first workflow ending with a preview node
2. **Connect Preview Node**: Drag from the preview node's output handle to another node's input
3. **Continue Workflow**: Add ControlNet, tools, or engine nodes after the preview node
4. **Execute**: Run the workflow - the preview node will provide its generated image to the next stage

## Future Enhancements

- **Visual Indicators**: Add UI indicators to show when preview nodes are acting as inputs
- **Connection Hints**: Provide visual feedback during connection attempts
- **Workflow Templates**: Create pre-built continuous workflow templates
- **Performance Monitoring**: Add metrics for multi-stage workflow execution

## Additional Fixes Applied

### 4. Workflow Detection Updates (`src/utils/connectionUtils.ts`)

#### Enhanced Workflow Segmentation
- **Fixed workflow detection**: Modified to properly detect separate workflow segments connected via preview nodes
- **Improved engine node detection**: Enhanced logic to find engine nodes by checking both `node.type` and `node.data.type`
- **Workflow boundary handling**: Preview nodes now act as proper boundaries between workflow segments

```typescript
// Enhanced workflow segment detection
const findWorkflowSegment = (startNodeId: string, visitedInSegment: Set<string>): Set<string> => {
  // ... logic to find connected nodes while respecting preview node boundaries
  if (isPreviewNode && edge.source === currentNodeId) {
    // Current node is preview node acting as source - don't traverse to target
    return;
  }
  if (nextIsPreviewNode && edge.target === nextNodeId) {
    // Next node is preview node acting as target - include it but don't traverse beyond
    segmentNodes.add(nextNodeId);
    visitedInSegment.add(nextNodeId);
    return;
  }
};
```

### 5. Connection Handler Updates (`src/services/connectionHandler.ts`)

#### Preview Node Recognition
- **Enhanced `isImageNode()`**: Added preview node types to image node detection
- **Updated `hasValidImageData()`**: Added support for `generatedImage` property from preview nodes
- **Improved preprocessing trigger**: Preview nodes now properly trigger ControlNet preprocessing

### 6. EditorHeader Workflow Selection (`src/components/EditorHeader.tsx`)

#### Smart Workflow Target Selection
- **Added `findWorkflowTarget()`**: Function to find the correct preview node for the selected node's workflow
- **Enhanced target selection logic**: Now considers which workflow a selected node belongs to
- **Improved execution accuracy**: Ensures the correct workflow is executed based on user selection

```typescript
const findWorkflowTarget = React.useCallback((selectedNodeId: string) => {
  // Find all nodes connected to the selected node
  const visited = new Set<string>();
  const connectedNodes = new Set<string>();
  
  const traverse = (nodeId: string) => {
    // ... traverse connected nodes
  };
  
  // Return the rightmost target in this workflow
  return workflowTargets.sort(
    (a, b) => (b.position?.x ?? 0) - (a.position?.x ?? 0)
  )[0] || null;
}, [nodes, edges, runnableTargets]);
```

## Issues Resolved

### ✅ Workflow Detection
- **Problem**: Extended workflows were not being detected as separate flows
- **Solution**: Enhanced workflow segmentation to respect preview node boundaries
- **Result**: Each workflow segment is now properly detected and can be executed independently

### ✅ EditorHeader Execution
- **Problem**: Wrong workflow was being executed when multiple workflows existed
- **Solution**: Added smart workflow target selection based on selected node
- **Result**: Correct workflow is now executed based on user's current selection

### ✅ ControlNet Preprocessing
- **Problem**: Preview nodes weren't triggering ControlNet preprocessing
- **Solution**: Enhanced connection handler to recognize preview nodes as image sources
- **Result**: Preview nodes now properly trigger preprocessing when connected to ControlNet nodes

## Comprehensive Testing

### Test Coverage Added
- ✅ **Preview Node as Input Tests**: Validates basic preview node input functionality
- ✅ **Continuous Workflow Detection Tests**: Ensures proper workflow segmentation
- ✅ **Preview Node Preprocessing Tests**: Confirms ControlNet preprocessing triggers

### Test Results
```
✓ Preview Node as Input (3 tests)
✓ Continuous Workflow Detection (2 tests) 
✓ Preview Node Preprocessing (5 tests)
```

This implementation successfully enables the continuous workflow functionality you requested, allowing preview nodes to seamlessly transition from output nodes to input nodes for subsequent processing stages, with proper workflow detection, execution targeting, and ControlNet preprocessing support.