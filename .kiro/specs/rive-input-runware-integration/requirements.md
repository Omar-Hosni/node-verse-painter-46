# Requirements Document

## Introduction

This feature enhances the RiveInput component to properly integrate with the runwareService for uploading images with specific workflow purposes. The component currently uploads images but doesn't store the necessary metadata for different workflow types (pose control vs lighting control). This enhancement will ensure that uploaded images from pose nodes are properly configured for ControlNet usage, while images from lighting nodes are configured for seed image usage in the Runware API workflow.

## Requirements

### Requirement 1

**User Story:** As a developer using the RiveInput component for pose control, I want the uploaded image to be stored with the correct metadata for ControlNet workflow usage, so that it can be properly referenced as a guideImage in subsequent Runware API calls.

#### Acceptance Criteria

1. WHEN a user clicks "Done" on a pose-type RiveInput THEN the system SHALL upload the image using runwareService.uploadImage()
2. WHEN the pose image upload is successful THEN the system SHALL store both imageUUID and imageURL in the node's data
3. WHEN the pose image upload is successful THEN the system SHALL store the image metadata with controlnet-specific properties
4. IF the pose image upload fails THEN the system SHALL display an appropriate error message and maintain the previous state

### Requirement 2

**User Story:** As a developer using the RiveInput component for lighting control, I want the uploaded image to be stored with the correct metadata for seed image workflow usage, so that it can be properly referenced as a seedImage in subsequent Runware API calls.

#### Acceptance Criteria

1. WHEN a user clicks "Done" on a lights-type RiveInput THEN the system SHALL upload the image using runwareService.uploadImage()
2. WHEN the lights image upload is successful THEN the system SHALL store both imageUUID and imageURL in the node's data
3. WHEN the lights image upload is successful THEN the system SHALL store the image metadata with seed-image-specific properties
4. IF the lights image upload fails THEN the system SHALL display an appropriate error message and maintain the previous state

### Requirement 3

**User Story:** As a developer integrating with the Runware workflow system, I want the uploaded images to have consistent metadata structure, so that downstream workflow components can reliably access the required image references.

#### Acceptance Criteria

1. WHEN any RiveInput uploads an image THEN the system SHALL store the data in a consistent format with imageUUID, imageURL, and workflow type
2. WHEN storing pose images THEN the system SHALL include metadata indicating the image is for ControlNet usage
3. WHEN storing lighting images THEN the system SHALL include metadata indicating the image is for seed image usage
4. WHEN accessing stored image data THEN the system SHALL provide clear indicators of the intended workflow usage

### Requirement 4

**User Story:** As a user of the RiveInput component, I want to see clear feedback during the upload process, so that I understand the current state of my image processing.

#### Acceptance Criteria

1. WHEN an image upload begins THEN the system SHALL display a loading indicator
2. WHEN an image upload completes successfully THEN the system SHALL display a success message
3. WHEN an image upload fails THEN the system SHALL display a clear error message with actionable information
4. WHEN an upload is in progress THEN the system SHALL prevent duplicate upload attempts

### Requirement 5

**User Story:** As a developer maintaining the RiveInput component, I want the runwareService integration to handle errors gracefully, so that the component remains stable and provides good user experience.

#### Acceptance Criteria

1. WHEN the runwareService is unavailable THEN the system SHALL display an appropriate error message
2. WHEN network connectivity issues occur THEN the system SHALL attempt retry with exponential backoff
3. WHEN API authentication fails THEN the system SHALL display a clear authentication error message
4. WHEN any upload error occurs THEN the system SHALL maintain the component in a usable state without breaking functionality