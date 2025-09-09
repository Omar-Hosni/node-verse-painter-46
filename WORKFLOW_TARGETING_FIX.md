# Workflow Targeting Fix

## Problem
When executing continuous/extended workflows, the EditorHeader was executing the wrong workflow segment. Despite selecting a node in the extended workflow, it would execute the first workflow instead of the correct segment.

## Root Cause
The `findWorkflowTarget` function in EditorHeader was traversing ALL connected nodes without respecting workflow segment boundaries. This caused it to find both preview nodes in a continuous workflow instead of just the one in the current segment.

## Solution
Enhanced the workflow segmentation logic to respect preview node boundaries, ensuring that each workflow segment is treated independently for execution targeting.

### Key Changes

#### 1. Enhanced Workflow Segmentation Logic
```typescript
const traverseSegment = (nodeId: string) => {
  // ... existing logic ...
  
  // Don't cross preview node boundaries when traversing
  if (isPreviewNode && edge.source === nodeId) {
    // Current node is preview node acting as source - don't traverse to target
    return;
  }
  if (nextIsPreviewNode && edge.target === nextNodeId) {
    // Next node is preview node acting as target - include it but don't traverse beyond
    segmentNodes.add(nextNodeId);
    visited.add(nextNodeId);
    return;
  }
  // Don't traverse backwards through a preview node connection
  if (nextIsPreviewNode && edge.source === nextNodeId) {
    // Next node is preview node acting as source - don't traverse backwards
    return;
  }
  traverseSegment(nextNodeId);
};
```

#### 2. Precise Target Selection
The function now:
- Finds only nodes within the same workflow segment as the selected node
- Respects preview node boundaries (doesn't cross them during traversal)
- Selects the rightmost preview node within that specific segment

## Test Coverage
Added comprehensive tests to verify the fix:

### ✅ Workflow Segmentation Tests
- Verifies that continuous workflows are properly segmented at preview node boundaries
- Ensures each segment finds only its own preview node as target
- Tests both forward and backward traversal scenarios

### ✅ Integration Tests
- All existing preview node functionality tests still pass
- Workflow detection tests confirm proper segmentation
- Connection handler tests verify preprocessing still works

## Results

### Before Fix
```
Workflow: Image → Engine → Preview1 → ControlNet → Engine2 → Preview2
Selected: Engine2
Executed: Preview1 ❌ (Wrong target)
```

### After Fix
```
Workflow: Image → Engine → Preview1 → ControlNet → Engine2 → Preview2
Selected: Engine2
Executed: Preview2 ✅ (Correct target)
```

## Technical Benefits

1. **Precise Targeting**: Each workflow segment executes independently
2. **Boundary Respect**: Preview nodes act as proper workflow boundaries
3. **User Intent**: Execution matches user's selected workflow segment
4. **Backward Compatible**: Existing single workflows continue to work perfectly

## Test Results
```
✓ Preview Node as Input (3 tests)
✓ Continuous Workflow Detection (2 tests)
✓ Preview Node Preprocessing (5 tests)
✓ Workflow Segmentation (2 tests)

Total: 12 tests passed
```

This fix ensures that when you select a node in an extended workflow and click the Render button, it will execute the correct workflow segment and render the result in the appropriate preview node.