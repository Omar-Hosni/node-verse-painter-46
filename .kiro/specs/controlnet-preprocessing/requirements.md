# Requirements Document

## Introduction

This feature implements automatic ControlNet preprocessing when image nodes are connected to ControlNet nodes in the workflow editor. When a connection is made, the system will automatically preprocess the input image using the appropriate preprocessor based on the ControlNet node type, and display the preprocessed result in the right sidebar instead of the default Rive animation.

## Requirements

### Requirement 1

**User Story:** As a user, I want images to be automatically preprocessed when I connect an image node to a ControlNet node, so that I can see the processed guide image immediately without manual intervention.

#### Acceptance Criteria

1. WHEN an image node is connected to a ControlNet node THEN the system SHALL automatically trigger preprocessing using the appropriate preprocessor
2. WHEN preprocessing is triggered THEN the system SHALL use the imageControlNetPreProcess API with the correct preprocessor parameter based on the ControlNet node type
3. WHEN preprocessing completes successfully THEN the system SHALL store the guideImageURL in the ControlNet node's data
4. WHEN preprocessing fails THEN the system SHALL display an error message and maintain the original connection

### Requirement 2

**User Story:** As a user, I want to see the preprocessed image displayed in the right sidebar when a ControlNet node is selected, so that I can visually verify the preprocessing result.

#### Acceptance Criteria

1. WHEN a ControlNet node with preprocessed data is selected THEN the right sidebar SHALL display the preprocessed image instead of the Rive component
2. WHEN the preprocessed image is displayed THEN it SHALL show the actual processed result from the API
3. WHEN a ControlNet node without preprocessed data is selected THEN the sidebar SHALL show the default Rive component
4. WHEN the light ControlNet node is selected THEN it SHALL NOT show preprocessed images as it uses seed images directly

### Requirement 3

**User Story:** As a user, I want the system to map ControlNet node types to their corresponding preprocessors automatically, so that the correct preprocessing is applied without manual configuration.

#### Acceptance Criteria

1. WHEN a pose ControlNet node receives an image THEN the system SHALL use the "openpose" preprocessor
2. WHEN a depth ControlNet node receives an image THEN the system SHALL use the "depth_midas" preprocessor  
3. WHEN a canny ControlNet node receives an image THEN the system SHALL use the "canny" preprocessor
4. WHEN a normal ControlNet node receives an image THEN the system SHALL use the "normal_bae" preprocessor
5. WHEN an edge ControlNet node receives an image THEN the system SHALL use the "lineart_coarse" preprocessor
6. WHEN a segments ControlNet node receives an image THEN the system SHALL use the "seg_ofade20k" preprocessor
7. WHEN a light ControlNet node receives an image THEN the system SHALL NOT trigger preprocessing

### Requirement 4

**User Story:** As a user, I want the preprocessing to happen seamlessly in the background, so that my workflow editing experience is not interrupted by loading states or blocking operations.

#### Acceptance Criteria

1. WHEN preprocessing is triggered THEN the connection SHALL be established immediately without waiting for preprocessing completion
2. WHEN preprocessing is in progress THEN the system SHALL show a loading indicator in the right sidebar
3. WHEN preprocessing completes THEN the system SHALL automatically update the display without user intervention
4. WHEN multiple preprocessing operations are triggered simultaneously THEN each SHALL be handled independently without conflicts

### Requirement 5

**User Story:** As a user, I want the preprocessed data to be persisted in the workflow, so that I don't lose the preprocessing results when I save and reload the workflow.

#### Acceptance Criteria

1. WHEN preprocessing completes successfully THEN the guideImageURL SHALL be stored in the ControlNet node's data
2. WHEN a workflow is saved THEN the preprocessed data SHALL be included in the saved workflow
3. WHEN a workflow is loaded THEN the preprocessed images SHALL be available for display without re-processing
4. WHEN a ControlNet node is disconnected from an image THEN the preprocessed data SHALL be cleared from the node