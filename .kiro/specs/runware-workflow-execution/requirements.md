# Requirements Document

## Introduction

This feature implements comprehensive workflow execution capabilities for a visual node-based editor that integrates with Runware AI APIs. The system supports four main workflow types: text-to-image generation with ControlNet preprocessing, image-to-image transformation, FLUX Kontext operations, and image editing tools. Each workflow type processes different combinations of nodes, handles API requests appropriately, and manages the flow of data between preprocessing steps and final image generation.

## Requirements

### Requirement 1: Text-to-Image Workflow Execution

**User Story:** As a user, I want to execute text-to-image workflows with ControlNet preprocessing, so that I can generate images with precise control over pose, edges, depth, segmentation, and lighting.

#### Acceptance Criteria

1. WHEN a workflow contains pose control, edge control, depth, segment map, or normal map nodes THEN the system SHALL perform imageControlNetPreProcess API calls for connected input images
2. WHEN imageControlNetPreProcess API responds THEN the system SHALL persist the guidedImageURL for later use as guideImage in ControlNet parameters
3. WHEN a light control node is present THEN the system SHALL use the edited image as seed image for text-to-image generation instead of ControlNet
4. WHEN all preprocessing is complete THEN the system SHALL execute imageInference API with appropriate ControlNet configurations
5. WHEN the workflow includes gear nodes (LoRAs) THEN the system SHALL extract AIR identifiers from node data and include them in the API request
6. WHEN the workflow includes an engine node THEN the system SHALL extract model and LoRA AIR identifiers for the final generation request
7. WHEN generation is complete THEN the system SHALL render the result in the connected output node

### Requirement 1A: Automatic ControlNet Preprocessing

**User Story:** As a user, I want ControlNet nodes to automatically detect and preprocess connected images, so that I don't need to manually trigger preprocessing when I connect an image to a pose, edge, depth, or other ControlNet node.

#### Acceptance Criteria

1. WHEN an image input is connected to a ControlNet node (pose, edge, depth, segment map, normal map) THEN the system SHALL automatically detect the connection
2. WHEN a ControlNet node detects a connected image input THEN the system SHALL automatically trigger preprocessing for that image using the appropriate preprocessor type
3. WHEN preprocessing is triggered automatically THEN the system SHALL use the node's preprocessor type (pose, canny, depth, etc.) to determine the correct API parameters
4. WHEN automatic preprocessing completes THEN the system SHALL store the guidedImageURL result in the ControlNet node for later use
5. WHEN a ControlNet node already has a preprocessed result THEN the system SHALL NOT reprocess the same image input
6. WHEN multiple images are connected to the same ControlNet node THEN the system SHALL process each image input separately
7. WHEN preprocessing fails THEN the system SHALL provide clear error feedback indicating which ControlNet node and image input failed

### Requirement 2: Image-to-Image Workflow Execution

**User Story:** As a user, I want to execute image-to-image workflows with re-imagine functionality, so that I can transform existing images with controlled creativity levels.

#### Acceptance Criteria

1. WHEN a workflow contains a re-imagine node THEN the system SHALL use the input image as seed image for imageInference API
2. WHEN extracting creativity value THEN the system SHALL use the strength parameter from the re-imagine node's right_sidebar data
3. WHEN the API request is made THEN the system SHALL include the seed image and strength parameters in the imageInference call
4. WHEN generation is complete THEN the system SHALL store the result for further workflow processing or output rendering

### Requirement 3: FLUX Kontext Workflow Execution

**User Story:** As a user, I want to execute FLUX Kontext workflows for advanced image manipulation, so that I can perform reference-based transformations, scene blending, angle changes, and multi-image mixing.

#### Acceptance Criteria

1. WHEN a workflow contains reference node THEN the system SHALL store generated output URL and apply reference-type specific prompts based on right_sidebar data
2. WHEN a workflow contains re-scene node THEN the system SHALL detect SCENE and OBJECT image types from context menu data and send both images with built-in blending prompts
3. WHEN a workflow contains re-angle node THEN the system SHALL extract degree and direction parameters and send appropriate camera angle change prompts
4. WHEN a workflow contains re-light node THEN the system SHALL process lighting adjustments using FLUX Kontext API
5. WHEN a workflow contains re-mix node THEN the system SHALL use multiple input images with IPAdapter configuration
6. WHEN FLUX Kontext nodes are present THEN the system SHALL connect directly to output node without requiring engine node

### Requirement 4: Image Editing Tools Integration

**User Story:** As a user, I want to use image editing tools within workflows, so that I can preprocess images with background removal, upscaling, inpainting, and outpainting before final generation.

#### Acceptance Criteria

1. WHEN remove-bg node is connected THEN the system SHALL call imageBackgroundRemoval API and store result for subsequent workflow usage
2. WHEN up-scale node is connected THEN the system SHALL call imageUpscale API and store result for subsequent workflow usage
3. WHEN in-paint node is connected THEN the system SHALL render mask editing tools, collect mask data, and call imageInference with inpainting parameters
4. WHEN out-paint node is connected THEN the system SHALL render outpaint editing tools, collect outpaint values, and call imageInference with outpainting parameters
5. WHEN tool processing is complete THEN the system SHALL make processed images available as seed images, input images, or FLUX Kontext inputs based on workflow type

### Requirement 5: Workflow Data Management and API Integration

**User Story:** As a developer, I want robust data management and API integration, so that workflow execution is reliable, efficient, and properly handles all node configurations.

#### Acceptance Criteria

1. WHEN extracting node data THEN the system SHALL properly parse AIR identifiers from engine and gear node configurations
2. WHEN making API requests THEN the system SHALL use proper Runware API endpoints with correct parameter structures
3. WHEN handling asynchronous operations THEN the system SHALL manage API responses and update workflow state appropriately
4. WHEN errors occur THEN the system SHALL provide meaningful error messages and handle failures gracefully
5. WHEN workflows execute THEN the system SHALL maintain proper execution order based on node dependencies
6. WHEN multiple preprocessing steps are required THEN the system SHALL coordinate sequential API calls and data flow

### Requirement 5A: Node Input Detection and Validation

**User Story:** As a developer, I want the workflow executor to properly detect and validate node inputs, so that connected nodes can access data from their input connections reliably.

#### Acceptance Criteria

1. WHEN executing a workflow THEN the system SHALL build a complete map of node connections from the edges array
2. WHEN processing a node THEN the system SHALL collect all input data from connected source nodes before processing
3. WHEN a node requires specific input types THEN the system SHALL validate that connected inputs provide the expected data format
4. WHEN input validation fails THEN the system SHALL provide specific error messages indicating which node is missing which inputs
5. WHEN a node has multiple input connections THEN the system SHALL collect and organize all input data appropriately
6. WHEN processing ControlNet nodes THEN the system SHALL specifically detect image inputs and ensure they are available for preprocessing
7. WHEN image inputs are detected THEN the system SHALL verify the image data is accessible (either as File object or URL string)

### Requirement 6: User Interface and Interaction

**User Story:** As a user, I want intuitive workflow execution controls, so that I can easily generate images and monitor progress.

#### Acceptance Criteria

1. WHEN clicking generate image button THEN the system SHALL initiate workflow execution based on connected nodes
2. WHEN workflow is executing THEN the system SHALL provide visual feedback and progress indicators
3. WHEN editing tools are active THEN the system SHALL render appropriate editing interfaces (mask editing, outpaint controls)
4. WHEN context menus are needed THEN the system SHALL display image type selection for re-scene node inputs
5. WHEN execution completes THEN the system SHALL display results in output nodes with appropriate formatting
6. WHEN errors occur THEN the system SHALL display user-friendly error messages with actionable guidance