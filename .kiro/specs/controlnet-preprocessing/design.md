# Design Document

## Overview

This feature implements automatic ControlNet preprocessing by extending the existing workflow system to detect image-to-ControlNet connections and trigger appropriate preprocessing operations. The design leverages the existing Runware service integration and extends the node connection system to handle preprocessing workflows.

## Architecture

The system follows a reactive architecture where connection changes trigger preprocessing operations:

```
Image Node Connection → ControlNet Node → Preprocessing Trigger → API Call → Data Storage → UI Update
```

### Key Components:
- **Connection Handler**: Detects and processes new connections between image and ControlNet nodes
- **Preprocessor Mapper**: Maps ControlNet node types to their corresponding API preprocessors
- **Preprocessing Service**: Manages API calls and response handling
- **Data Manager**: Stores and retrieves preprocessed results
- **UI Renderer**: Displays preprocessed images in the sidebar

## Components and Interfaces

### 1. ControlNet Preprocessor Mapping

```typescript
interface ControlNetPreprocessorMap {
  pose: 'openpose';
  depth: 'depth_midas';
  canny: 'canny';
  normal: 'normal_bae';
  edge: 'lineart_coarse';
  segments: 'seg_ofade20k';
  light: null; // No preprocessing for light nodes
}

const CONTROLNET_PREPROCESSORS: ControlNetPreprocessorMap = {
  pose: 'openpose',
  depth: 'depth_midas', 
  canny: 'canny',
  normal: 'normal_bae',
  edge: 'lineart_coarse',
  segments: 'seg_ofade20k',
  light: null
};
```

### 2. Enhanced Node Data Structure

```typescript
interface ControlNetNodeData extends NodeData {
  preprocessedImage?: {
    guideImageURL: string;
    preprocessor: string;
    sourceImageUUID: string;
    timestamp: number;
  };
  isPreprocessing?: boolean;
}
```

### 3. Connection Handler Service

```typescript
interface ConnectionHandler {
  handleNewConnection(connection: Connection): Promise<void>;
  triggerPreprocessing(sourceNode: Node, targetNode: Node): Promise<void>;
  clearPreprocessedData(nodeId: string): void;
}
```

### 4. Preprocessing Service Extension

```typescript
interface PreprocessingService {
  preprocessForControlNet(
    imageURL: string, 
    controlNetType: string
  ): Promise<PreprocessedImage>;
  getPreprocessorForControlNet(controlNetType: string): string | null;
}
```

## Data Models

### Connection Event Data
```typescript
interface ConnectionEvent {
  source: {
    nodeId: string;
    handleId: string;
    nodeType: string;
  };
  target: {
    nodeId: string;
    handleId: string;
    nodeType: string;
  };
  connectionType: 'new' | 'removed';
}
```

### Preprocessing State
```typescript
interface PreprocessingState {
  nodeId: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  result?: PreprocessedImage;
  error?: string;
}
```

## Error Handling

### Preprocessing Errors
- **Network Failures**: Retry with exponential backoff, show error toast after max retries
- **API Errors**: Display specific error messages, maintain connection but clear preprocessing state
- **Invalid Node Types**: Log warning, skip preprocessing for unsupported node types
- **Missing Image Data**: Show user-friendly error, suggest re-uploading image

### Connection Errors
- **Invalid Connections**: Prevent connection if source is not an image node
- **Multiple Connections**: Handle multiple image inputs by preprocessing the most recent
- **Disconnection Cleanup**: Ensure preprocessed data is properly cleared

## Testing Strategy

### Unit Tests
- **Preprocessor Mapping**: Test all ControlNet types map to correct preprocessors
- **Connection Detection**: Verify image-to-ControlNet connections are properly identified
- **Data Storage**: Test preprocessed data persistence and retrieval
- **Error Handling**: Test all error scenarios and recovery mechanisms

### Integration Tests
- **API Integration**: Test actual preprocessing API calls with mock responses
- **Workflow Integration**: Test preprocessing within complete workflow scenarios
- **UI Integration**: Test sidebar display updates with preprocessed images

### End-to-End Tests
- **Complete Flow**: Test full user journey from connection to display
- **Multiple Nodes**: Test preprocessing with multiple ControlNet nodes
- **Persistence**: Test save/load workflow with preprocessed data
- **Error Recovery**: Test user experience during API failures

## Implementation Phases

### Phase 1: Core Infrastructure
- Implement preprocessor mapping
- Extend node data structures
- Create connection event handling

### Phase 2: API Integration
- Extend Runware service with preprocessing methods
- Implement preprocessing trigger logic
- Add error handling and retry mechanisms

### Phase 3: UI Integration
- Update sidebar to display preprocessed images
- Add loading states and error displays
- Implement data persistence

### Phase 4: Polish & Testing
- Add comprehensive error handling
- Implement performance optimizations
- Add user feedback mechanisms

## Performance Considerations

### Optimization Strategies
- **Caching**: Cache preprocessed results to avoid redundant API calls
- **Debouncing**: Debounce rapid connection changes to prevent excessive API calls
- **Lazy Loading**: Only preprocess when ControlNet node is actually used
- **Background Processing**: Process images asynchronously without blocking UI

### Resource Management
- **Memory**: Limit cached preprocessed images to prevent memory leaks
- **API Limits**: Respect Runware API rate limits and quotas
- **Network**: Optimize image transfer and processing pipeline

## Security Considerations

### Data Protection
- **Image URLs**: Ensure preprocessed image URLs are properly validated
- **API Keys**: Maintain secure API key handling in preprocessing calls
- **User Data**: Protect user workflow data during preprocessing operations

### Input Validation
- **Node Types**: Validate ControlNet node types before preprocessing
- **Image Data**: Validate image data before sending to API
- **Connection Data**: Validate connection parameters to prevent injection attacks