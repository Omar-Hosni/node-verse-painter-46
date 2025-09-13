# Implementation Plan

- [x] 1. Add dataUrl to File conversion utility

  - Create helper function to convert canvas dataUrl to File object
  - Handle proper MIME type and filename generation
  - _Requirements: 1.1, 2.1_

- [x] 2. Fix handleDone method to use proper runwareService API

  - Convert canvas dataUrl to File before upload
  - Call runwareService.uploadImage(file) instead of uploadImage(dataUrl)
  - Handle the response to get both imageUUID and imageURL
  - _Requirements: 1.1, 2.1_

- [ ] 3. Store workflow-specific metadata in node data

  - For pose nodes: store as controlnet guideImage metadata
  - For lights nodes: store as seedImage metadata

  - Keep existing image/imageUrl properties for compatibility
  - _Requirements: 1.2, 1.3, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 4. Clean up hardcoded API key and improve error handling

  - Remove hardcoded API key from component
  - Add better error messages for upload failures
  - _Requirements: 4.2, 4.3, 5.3_
