# Preview Node Fixes Summary

This document summarizes the changes made to fix the preview node behavior as an input source for extending workflows.

## Problem Description

The issue was that preview nodes were "detectable but not executable" when used as sources for downstream workflows because:

1. On every run, the executor wipes its in-memory cache (`clearProcessedImages`)
2. When a node produces a result, it's saved for that node id via `updateStoreCallback(nodeId, result)`
3. A preview/output node only gets the image saved for itself when the preview node is actually processed (via `processOutput`) or when it's the chosen `targetNodeId` at the end of the run
4. If you then start a new (downstream) chain where that preview acts as the source, the executor will try to read inputs from its per-run cache first (now empty), then fall back to `node.data.generatedImage/imageUrl`
5. If the preview was never "materialized" (i.e., it didn't get its own data updated), nothing flows—exactly the bug: "detectable but not executable"

## Implemented Fixes

### 1. Mirror Results into Downstream Previews

**File:** `src/store/workflowStore.ts`
**Function:** `setProcessedImage`

**Changes:**
- Extended the existing `setProcessedImage` function to mirror results to immediately connected preview/output nodes
- Whenever any node produces an image, we also persist it onto directly connected previews/outputs
- This ensures a preview is always a "materialized" source for future runs, even if it wasn't the target previously

**Code Added:**
```typescript
// NEW: if a node produced an image, mirror it to any immediately connected preview/output nodes
try {
  const edges = get().edges;
  const outgoing = edges.filter(e => e.source === nodeId);
  for (const e of outgoing) {
    const tgt = get().nodes.find(n => n.id === e.target);
    if (!tgt) continue;

    const isPreview =
      tgt.type === 'previewNode' ||
      tgt.type === 'output' ||
      (tgt.type && tgt.type.includes('preview')) ||
      (tgt.data?.type && String(tgt.data.type).includes('preview'));

    if (isPreview) {
      // update cache
      set(state => {
        const m = new Map(state.processedImages);
        m.set(tgt.id, imageUrl);
        return { processedImages: m };
      });

      // persist on the preview itself so it can be a source in later runs
      useCanvasStore.getState().updateNodeData(tgt.id, {
        generatedImage: imageUrl,
        imageUrl: imageUrl,  // keep both for all readers
      });
    }
  }
} catch (err) {
  console.warn('Mirror to downstream preview failed', err);
}
```

### 2. Let ControlNet Preprocessing Accept Preview Outputs

**File:** `src/services/preprocessingTrigger.ts`
**Functions:** `hasValidImageData`, `getImageUrlFromNode`

**Changes:**
- Updated both validator and extractor functions to include `generatedImage` when checking/extracting image data
- This aligns the preprocessor with the executor, which already prefers `generatedImage` when using a preview as an input node

**Code Changes:**

In `hasValidImageData`:
```typescript
const imageUrl = nodeData?.generatedImage || nodeData?.imageUrl || nodeData?.image || nodeData?.right_sidebar?.imageUrl;
```

In `getImageUrlFromNode`:
```typescript
return nodeData?.generatedImage || nodeData?.imageUrl || nodeData?.image || nodeData?.right_sidebar?.imageUrl || null;
```

### 3. Confirmation of Existing Functionality

**File:** `src/store/workflowStore.ts`
**Function:** `hydrateProcessedImagesFromNodes`

**Status:** Already implemented and working correctly
- This function hydrates the per-run cache from node data before each run
- Ensures starting a downstream chain doesn't require re-executing the upstream one
- Already includes `generatedImage` in its hydration logic

## Why This Fixes the Exact Symptom

Previously, the "last image" often lived only on the engine node (because `updateStoreCallback` always runs for the node that produced it). If the preview wasn't processed/targeted, it didn't get its own `generatedImage/imageUrl`.

With the mirror in `setProcessedImage`, the preview always receives the image the moment its parent produces it, so it becomes a proper source.

Preprocessing now recognizes `generatedImage` too, so ControlNet nodes hanging off a preview will preprocess and run without needing to re-run the original segment.

Users will now be able to execute any extended workflow independently (pick the last preview/output of that subchain in the header—your target selector already restricts to preview/output nodes) without triggering or disrupting other chains.