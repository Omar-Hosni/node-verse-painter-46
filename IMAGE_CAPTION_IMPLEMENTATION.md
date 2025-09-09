# Image Caption Implementation

## Overview

This implementation adds automatic image-to-text captioning functionality to text input nodes. When an image node is connected to a text input node, the system automatically generates a descriptive caption using the Runware Image Caption API and populates the text input's prompt field.

## Features Implemented

### 1. Text Input Node Left Handle
- **Modified**: `src/components/nodes/NormalNode.tsx`
- **Change**: Removed the condition that prevented text input nodes from having left handles
- **Result**: Text input nodes now accept incoming connections from image nodes

### 2. Image Caption API Integration
- **Added**: `src/services/runwareService.ts` - `generateImageCaption()` method
- **API Endpoint**: Uses `imageCaption` task type
- **Request Format**:
  ```json
  {
    "taskType": "imageCaption",
    "taskUUID": "uuid-string",
    "inputImage": "image-url-or-id",
    "includeCost": false
  }
  ```
- **Response Format**:
  ```json
  {
    "taskType": "imageCaption",
    "taskUUID": "uuid-string", 
    "text": "Generated caption text",
    "cost": 0
  }
  ```

### 3. Image Caption Utilities
- **Added**: `src/utils/imageCaptionUtils.ts`
- **Functions**:
  - `isTextInputNode()` - Identifies text input nodes
  - `hasValidImageDataForCaptioning()` - Validates image data
  - `extractImageUrlForCaptioning()` - Extracts image URLs from various node data locations
  - `createImageCaptionData()` - Creates structured caption data

### 4. Image Caption Trigger Service
- **Added**: `src/services/imageCaptionTrigger.ts`
- **Responsibilities**:
  - Detects when image captioning should be triggered
  - Manages the captioning process lifecycle
  - Handles API calls and error states
  - Updates node data with generated captions
  - Provides user feedback via toasts

### 5. Connection Handler Integration
- **Modified**: `src/services/connectionHandler.ts`
- **Added**:
  - `ImageCaptionTrigger` integration
  - `isImageToTextConnection()` method
  - `triggerImageCaptioning()` method
  - Support for image-to-text connection detection

### 6. Workflow Store Integration
- **Modified**: `src/store/workflowStore.ts`
- **Added**:
  - `ImageCaptionTrigger` initialization
  - Callback configuration for node data updates
  - Integration with connection handler

## Workflow Process

### Connection Detection
1. User connects an image node to a text input node
2. `ConnectionHandler` detects the new connection
3. `isImageToTextConnection()` validates the connection type
4. `ImageCaptionTrigger.shouldTriggerImageCaptioning()` confirms prerequisites

### Image Captioning Process
1. Extract image URL from source node (supports multiple data locations)
2. Call Runware Image Caption API with the image
3. Receive descriptive text response
4. Update text input node's `prompt` field with the caption
5. Store caption metadata for reference
6. Provide user feedback via toast notifications

### Error Handling
- API failures are caught and logged
- User receives error notifications
- Node state is updated to reflect error condition
- System remains stable and functional

## Supported Image Sources

The system supports image data from multiple node types and data locations:

### Node Types
- `imageInput` - Direct image upload nodes
- `previewNode` - Preview/output nodes with generated images
- `output` - Output nodes with final results
- Any node with valid image data

### Data Locations
- `node.data.imageUrl` - Primary image URL
- `node.data.generatedImage` - Generated image URL
- `node.data.right_sidebar.imageUrl` - Sidebar image URL
- `node.data.image_url` - Alternative image URL field

## Text Input Node Types

The system recognizes these text input node types:
- `textInput` - Standard text input nodes
- `input-text` - Alternative text input node type
- Any node type containing `input-text`

## Data Structure

### Caption Data
```typescript
interface ImageCaptionData {
  captionText: string;        // Generated caption
  sourceImageUrl: string;     // Source image URL
  timestamp: number;          // Generation timestamp
  taskUUID: string;          // API task identifier
}
```

### Node Data Updates
When captioning completes, the text input node receives:
```typescript
{
  prompt: "Generated caption text",
  imageCaptionData: ImageCaptionData,
  lastCaptionUpdate: timestamp,
  isCaptioning: false,
  captionError: null
}
```

## Testing

### Unit Tests
- **`src/utils/__tests__/imageCaptionUtils.test.ts`** - 14 tests covering utility functions
- **`src/services/__tests__/imageCaptionTrigger.test.ts`** - 8 tests covering trigger service

### Integration Tests  
- **`src/services/__tests__/imageCaption.integration.test.ts`** - 6 tests covering end-to-end functionality

### Test Coverage
- ✅ Connection detection and validation
- ✅ API integration and error handling
- ✅ Multiple image source types
- ✅ Different text input node types
- ✅ Error scenarios and recovery
- ✅ Concurrent operation handling

## User Experience

### Visual Feedback
- Loading toast: "Generating image caption..."
- Success toast: "Image caption generated! Generated X character description"
- Error toast: "Image captioning failed" with error details

### Node State Indicators
- `isCaptioning: true` during processing
- `captionError: string` when errors occur
- `imageCaptionData` with full caption metadata

### Automatic Population
- Text input `prompt` field is automatically populated
- Previous content is replaced with the new caption
- Caption metadata is preserved for reference

## Performance Considerations

### Concurrency Control
- Prevents duplicate captioning operations on the same node
- Manages system resources during processing
- Provides appropriate user feedback for busy states

### Error Recovery
- Graceful handling of API failures
- Clear error messaging to users
- System remains functional after errors

### Caching
- Caption metadata is stored for reference
- Prevents unnecessary re-captioning of the same image
- Supports workflow debugging and analysis

## Files Modified/Added

### Core Implementation
- `src/services/runwareService.ts` - API integration
- `src/services/imageCaptionTrigger.ts` - Caption trigger service
- `src/utils/imageCaptionUtils.ts` - Utility functions
- `src/services/connectionHandler.ts` - Connection handling
- `src/store/workflowStore.ts` - Store integration
- `src/components/nodes/NormalNode.tsx` - UI handle support

### Tests
- `src/services/__tests__/imageCaptionTrigger.test.ts`
- `src/utils/__tests__/imageCaptionUtils.test.ts`
- `src/services/__tests__/imageCaption.integration.test.ts`

## Compatibility

This implementation is fully backward compatible:
- Existing workflows continue to function normally
- Text input nodes without image connections work as before
- No breaking changes to existing APIs or interfaces
- Progressive enhancement of text input functionality

## Future Enhancements

Potential improvements for future versions:
- Caption caching to avoid re-processing identical images
- Custom caption prompts or styles
- Multiple caption generation options
- Integration with other text processing services
- Batch captioning for multiple images