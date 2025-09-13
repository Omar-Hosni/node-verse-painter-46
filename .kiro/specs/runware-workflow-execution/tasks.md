# Implementation Plan

- [x] 1. Set up core service infrastructure and interfaces

  - Create RunwareService class with WebSocket connection management
  - Implement authentication and message handling for Runware API
  - Create WorkflowExecutor class with dependency resolution logic
  - Set up WorkflowStore with Zustand for state management
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. Implement image upload and preprocessing functionality

  - [x] 2.1 Create image upload methods for UUID and URL responses

    - Implement uploadImage() method for UUID-based operations (upscaling)
    - Implement uploadImageForURL() method for URL-based operations (other workflows)
    - Add proper file reading and data URI conversion
    - _Requirements: 5.1, 5.2_

  - [x] 2.2 Implement ControlNet preprocessing integration

    - Create preprocessImage() method for imageControlNetPreProcess API calls
    - Handle pose, edge, depth, segment map, and normal map preprocessing
    - Store guidedImageURL results for later ControlNet usage
    - _Requirements: 1.1, 1.2_

- [x] 3. Implement text-to-image workflow execution

  - [x] 3.1 Create generateImage method with comprehensive parameter support

    - Support positivePrompt, negativePrompt, model, dimensions, steps, CFGScale
    - Implement ControlNet parameter integration with guideImage arrays
    - Add LoRA support with model and weight configurations
    - Handle seed image and strength parameters for image-to-image scenarios
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 3.2 Implement node processing logic for text-to-image workflows

    - Create processImageInput() for handling image file uploads and URL persistence
    - Create processControlNet() for preprocessing and Rive-generated image handling
    - Create processEngine() with ControlNet, LoRA, and seed image integration
    - Handle light control nodes as seed images instead of ControlNet
    - _Requirements: 1.1, 1.2, 1.6, 1.7_

- [x] 4. Implement image-to-image workflow execution

  - [x] 4.1 Create generateImageToImage method for re-imagine functionality

    - Implement imageInference API call with seed image and strength parameters
    - Extract creativity value from re-imagine node's right_sidebar data
    - Handle model selection and generation parameters
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.2 Implement re-imagine node processing in WorkflowExecutor

    - Create processGeneration() method with re-imagine case handling
    - Extract strength parameter from node data for creativity control
    - Integrate with engine node processing for final generation
    - _Requirements: 2.1, 2.4_

- [x] 5. Implement FLUX Kontext workflow execution

  - [x] 5.1 Create FLUX Kontext generation methods

    - Implement generateFluxKontext() for standard FLUX operations
    - Implement generateFluxKontextPro() with size ratio support
    - Handle referenceImages parameter and specialized model configurations
    - _Requirements: 3.1, 3.6_

  - [x] 5.2 Implement specialized FLUX Kontext node methods

    - Create generateReference() with reference-type specific prompts
    - Create generateReScene() for object and scene blending with built-in prompts
    - Create generateReAngle() with degree and direction parameter handling
    - Create generateReMix() with IPAdapter configuration for multiple images
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 5.3 Implement FLUX Kontext node processing logic

    - Handle reference node with output URL storage and reference-type prompts
    - Implement re-scene node with SCENE/OBJECT image type detection
    - Process re-angle node with degree and direction extraction
    - Handle re-light and re-mix nodes with appropriate API configurations
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6. Implement image editing tools integration

  - [x] 6.1 Create background removal functionality

    - Implement removeBackground() method with imageBackgroundRemoval API
    - Handle input image parameter and output format configuration
    - Return ProcessedImageResult for workflow integration
    - _Requirements: 4.1_

  - [x] 6.2 Create image upscaling functionality

    - Implement upscaleImage() method with imageUpscale API
    - Handle upscaleFactor parameter (2, 3, or 4) and UUID-based input
    - Process upscale results for subsequent workflow usage
    - _Requirements: 4.2_

  - [x] 6.3 Create inpainting functionality

    - Implement inpaintImage() method with imageInference API and mask parameters
    - Handle seedImage and maskImage parameters for inpainting operations
    - Integrate mask editing tools rendering for user interaction
    - _Requirements: 4.3_

  - [x] 6.4 Create outpainting functionality

    - Implement outpaintImage() method with outpaint parameter configuration
    - Handle outpaint direction and amount parameters
    - Integrate outpaint editing tools for user mask creation
    - _Requirements: 4.4_

  - [x] 6.5 Implement tool node processing in WorkflowExecutor

    - Create processTool() method with tool type switching logic
    - Handle remove-bg, up-scale, in-paint, and out-paint operations
    - Store processed results for subsequent workflow usage as seed/input images
    - _Requirements: 4.5_

- [x] 7. Implement workflow execution orchestration

  - [x] 7.1 Create dependency resolution and execution order logic

    - Build node dependency graph from edges array
    - Implement topological sorting for proper execution sequence
    - Handle circular dependency detection and error reporting
    - _Requirements: 5.5_

  - [x] 7.2 Implement executeWorkflow method in WorkflowExecutor

    - Create executeNode() recursive method for dependency-based processing
    - Build nodeMap and edgeMap for efficient node lookup and traversal
    - Handle input collection from connected nodes before processing
    - Implement result caching to avoid duplicate processing
    - _Requirements: 5.5, 5.6_

  - [x] 7.3 Implement node type routing and processing

    - Route nodes to appropriate processing methods based on type
    - Handle imageInput, textInput, controlNet, rerendering, tool, engine, gear, output nodes
    - Extract and pass input data between connected nodes
    - Update WorkflowStore with processed results
    - _Requirements: 5.1, 5.6_

- [x] 8. Implement data extraction and AIR identifier handling

  - [x] 8.1 Create AIR identifier extraction from node data

    - Extract model AIR identifiers from engine node configurations
    - Extract LoRA AIR identifiers from gear node data
    - Handle backward compatibility with legacy LoRA configurations
    - _Requirements: 5.1_

  - [x] 8.2 Implement parameter extraction from node configurations

    - Extract right_sidebar data for creativity, reference types, angles, directions
    - Handle context menu data for image type detection (SCENE/OBJECT)
    - Process Rive-generated image URLs from node data
    - _Requirements: 1.6, 3.1, 3.2, 3.3_

- [x] 9. Implement user interface integration and controls

  - [x] 9.1 Create workflow execution trigger mechanism

    - Implement generate image button click handler
    - Connect UI trigger to WorkflowStore executeWorkflow method
    - Handle target node identification for execution
    - _Requirements: 6.1_

  - [x] 9.2 Implement progress feedback and status indicators

    - Add isGenerating state management in WorkflowStore
    - Create visual progress indicators during workflow execution
    - Handle loading states for individual node processing
    - _Requirements: 6.2_

  - [x] 9.3 Create editing tool interfaces

    - Implement mask editing interface for inpainting operations
    - Create outpaint controls for direction and amount selection
    - Add context menu for image type selection in re-scene nodes
    - _Requirements: 6.3, 6.4_

- [x] 10. Implement error handling and recovery mechanisms

  - [x] 10.1 Create comprehensive error handling for API operations

    - Handle WebSocket connection errors with automatic reconnection
    - Implement retry logic with exponential backoff for transient failures
    - Provide meaningful error messages for different failure types
    - _Requirements: 5.4_

  - [x] 10.2 Implement workflow execution error handling

    - Handle individual node processing failures gracefully
    - Continue workflow execution when non-critical nodes fail
    - Preserve processed results during error recovery
    - Display user-friendly error messages with actionable guidance
    - _Requirements: 5.4, 6.6_

- [x] 11. Implement result management and output handling

  - [x] 11.1 Create processed image storage and retrieval

    - Implement setProcessedImage and getProcessedImage in WorkflowStore
    - Handle image URL persistence across workflow execution
    - Update node data with generated results for UI display
    - _Requirements: 5.3_

  - [x] 11.2 Implement output node result rendering

    - Create processOutput() method for final result display
    - Handle image URL extraction from connected nodes
    - Update output node data with final generated images
    - _Requirements: 6.5_

-

- [x] 12. Add workflow validation and optimization

  - [x] 12.1 Implement workflow validation logic

    - Validate node connections and required parameters
    - Check for missing inputs and invalid configurations
    - Provide validation feedback before execution starts
    - _Requirements: 5.4_

  - [x] 12.2 Implement performance optimizations

    - Add image caching to avoid re-uploading identical images
    - Implement result caching within workflow execution
    - Optimize WebSocket connection reuse across operations
    - _Requirements: 5.2, 5.3_

- [x] 13. Implement automatic ControlNet preprocessing and input detection

  - [x] 13.1 Create comprehensive input detection system

    - Implement buildEdgeMap() method to create efficient edge lookup maps
    - Create collectNodeInputs() method to gather all input data from connected source nodes
    - Add detectImageInputs() method to find connected image input nodes for ControlNet nodes
    - Implement validateNodeInputs() method to ensure required inputs are present and valid
    - _Requirements: 5A.1, 5A.2, 5A.3, 5A.4_

  - [x] 13.2 Implement ControlNet node detection and classification

    - Create isControlNetNode() method to identify pose, edge, depth, segment, normal, and light control nodes
    - Implement getPreprocessorType() method to determine the correct preprocessor for each ControlNet node type
    - Add shouldAutoPreprocess() method to check if automatic preprocessing should be triggered
    - Create preprocessingRequired() validation to prevent duplicate preprocessing
    - _Requirements: 1A.1, 1A.3, 1A.5_

  - [x] 13.3 Implement automatic preprocessing trigger system

    - Add automatic preprocessing detection in executeNode() method before processing ControlNet nodes
    - Create preprocessControlNetInputs() method to handle automatic image preprocessing
    - Implement preprocessing result storage and retrieval for ControlNet nodes
    - Add error handling for automatic preprocessing failures with specific error messages
    - _Requirements: 1A.2, 1A.4, 1A.7_

  - [x] 13.4 Fix image input processing for drag-and-drop images

    - Ensure processImageInput() properly handles drag-and-drop image nodes with type 'image-node'
    - Fix image data extraction from both imageFile and imageUrl properties
    - Add robust image node detection that works with various image node types and IDs
    - Implement fallback processing for image nodes that don't match standard patterns
    - _Requirements: 5A.6, 5A.7_

  - [x] 13.5 Enhance workflow execution with improved input validation

    - Update executeNode() method to use new collectNodeInputs() for all node types
    - Add comprehensive input validation before processing each node
    - Implement specific error messages for missing inputs that identify source and target nodes
    - Add debugging and logging for input detection and validation processes
    - _Requirements: 5A.4, 5A.5_
