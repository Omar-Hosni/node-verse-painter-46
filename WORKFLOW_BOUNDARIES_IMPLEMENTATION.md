# Workflow Boundaries Implementation

## Overview

This implementation adds intelligent workflow boundary detection to prevent unnecessary re-execution of workflow segments when preview/output nodes already contain persisted images.

## Problem Solved

Previously, when executing an extended workflow chain, the executor would:
1. Walk past preview/output nodes with existing images
2. Re-execute the entire upstream workflow from the beginning
3. Either regenerate the first part unnecessarily or stall due to missing dependencies

## Solution

The implementation treats preview/output nodes with persisted images as "hard boundaries" that:
1. Act as image sources for downstream nodes
2. Prevent traversal into their upstream dependencies
3. Allow independent execution of workflow segments

## Key Components

### 1. Boundary Detection Methods

#### `isPreviewLike(node: Node): boolean`
Identifies nodes that can act as boundaries:
- `previewNode`
- `output` 
- `preview-realtime-node`

#### `persistedImage(node: Node): string | null`
Extracts persisted image URLs from various node data locations:
- `node.data.imageUrl`
- `node.data.generatedImage`
- `node.data.right_sidebar.imageUrl`

### 2. Cache Priming

#### `primePersistedImageSources(nodes: Node[]): void`
At workflow start, scans all preview-like nodes and adds their persisted images to the processed images cache. This makes them behave exactly like image-layer nodes for downstream processing.

### 3. Dependency Pruning

#### `pruneAtPersistedBoundaries(nodes, deps, targetId): Map<string, string[]>`
Modifies the dependency graph by:
- Keeping preview/output nodes with persisted images in the graph
- Removing their upstream dependencies 
- Allowing downstream nodes to read from them as cached sources

### 4. EditorHeader Integration

Updated the `findWorkflowTarget` function to respect preview boundaries when determining which workflow segment a selected node belongs to.

## Workflow Integration

The boundary logic is integrated into `executeWorkflow` as follows:

```typescript
// Clear previous execution state
this.clearProcessedImages();
// ... other clearing

// Prime cache so preview/output act like image-layer sources
this.primePersistedImageSources(nodes);

// Build dependency graph
let dependencies = this.buildDependencyGraph(nodes, edges);

// Cut graph behind preview/output that already have an image
dependencies = this.pruneAtPersistedBoundaries(nodes, dependencies, targetNodeId);

// Continue with normal execution...
```

## Behavior Examples

### Scenario 1: Extended Chain with Persisted Preview
```
[Text] → [Engine] → [Preview*] → [ControlNet] → [Engine] → [Preview]
                      ^persisted                              ^target
```
**Result**: Only executes `[ControlNet] → [Engine] → [Preview]`

### Scenario 2: Extended Chain without Persisted Preview  
```
[Text] → [Engine] → [Preview] → [ControlNet] → [Engine] → [Preview]
                                                            ^target
```
**Result**: Executes entire chain from `[Text]`

### Scenario 3: Multiple Boundaries
```
[Text] → [Engine] → [Preview*] → [ControlNet] → [Output*] → [Engine] → [Preview]
                      ^persisted                  ^persisted            ^target
```
**Result**: Only executes `[Engine] → [Preview]` using the second boundary

## Testing

Comprehensive test coverage includes:

### Unit Tests (`workflowBoundaries.test.ts`)
- Boundary node identification
- Persisted image extraction
- Cache priming functionality
- Dependency pruning logic

### Core Functionality Tests (`workflowBoundaries.simple.test.ts`)
- Dependency graph pruning verification
- Cache behavior validation
- Boundary detection accuracy

### Integration Tests (`workflowBoundaries.integration.test.ts`)
- End-to-end workflow execution with boundaries
- Multiple segment scenarios
- Service call verification

## Benefits

1. **Performance**: Avoids unnecessary re-execution of completed workflow segments
2. **Reliability**: Prevents stalls when dependencies are missing from earlier segments
3. **User Experience**: Allows independent execution of workflow extensions
4. **Flexibility**: Works with multiple separate chains and complex workflows

## Files Modified

- `src/services/workflowExecutor.ts` - Core boundary implementation
- `src/components/EditorHeader.tsx` - Target selection with boundary awareness
- `src/services/__tests__/workflowBoundaries.test.ts` - Unit tests
- `src/services/__tests__/workflowBoundaries.simple.test.ts` - Core functionality tests
- `src/services/__tests__/workflowBoundaries.integration.test.ts` - Integration tests

## Compatibility

This implementation is fully backward compatible. Workflows without persisted preview/output images continue to execute normally, while workflows with persisted images benefit from the boundary optimization.