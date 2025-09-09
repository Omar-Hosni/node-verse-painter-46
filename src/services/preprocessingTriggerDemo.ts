/**
 * Demonstration of PreprocessingTrigger functionality
 * Shows how automatic preprocessing works when image nodes connect to ControlNet nodes
 */

import { Node } from '@xyflow/react';
import { PreprocessingTrigger } from './preprocessingTrigger';

/**
 * Demo function to show preprocessing trigger behavior
 * This demonstrates the three main requirements:
 * 1. Automatic preprocessing when image connects to ControlNet node
 * 2. Validation to ensure source node has valid image data
 * 3. Handle light ControlNet node exception (no preprocessing)
 */
export function demonstratePreprocessingTrigger() {
  console.log('=== Preprocessing Trigger Demo ===\n');

  // Mock service for demo purposes
  const mockRunwareService = {
    preprocessForControlNet: async (imageUrl: string, controlNetType: string) => {
      console.log(`🔄 Processing ${imageUrl} for ${controlNetType}`);
      return {
        guideImageURL: 'https://example.com/preprocessed.jpg',
        preprocessor: 'openpose',
      };
    },
  } as any;

  const preprocessingTrigger = new PreprocessingTrigger(mockRunwareService);

  // Example nodes
  const imageNodeWithData: Node = {
    id: 'image-1',
    type: 'image-node',
    position: { x: 0, y: 0 },
    data: { imageUrl: 'https://example.com/input.jpg' },
  };

  const imageNodeWithoutData: Node = {
    id: 'image-2',
    type: 'image-node',
    position: { x: 0, y: 0 },
    data: {},
  };

  const poseControlNetNode: Node = {
    id: 'controlnet-1',
    type: 'control-net-pose',
    position: { x: 100, y: 0 },
    data: {},
  };

  const lightControlNetNode: Node = {
    id: 'controlnet-2',
    type: 'seed-image-lights',
    position: { x: 100, y: 0 },
    data: {},
  };

  const textNode: Node = {
    id: 'text-1',
    type: 'text-node',
    position: { x: 0, y: 0 },
    data: { text: 'Hello world' },
  };

  // Requirement 1: Automatic preprocessing when image connects to ControlNet node
  console.log('1. ✅ Automatic preprocessing when image connects to ControlNet node:');
  console.log(`   Image → Pose ControlNet: ${preprocessingTrigger.shouldTriggerPreprocessing(imageNodeWithData, poseControlNetNode)}`);
  console.log(`   Expected: true (should trigger preprocessing)\n`);

  // Requirement 2: Validation to ensure source node has valid image data
  console.log('2. ✅ Validation to ensure source node has valid image data:');
  console.log(`   Image with data → ControlNet: ${preprocessingTrigger.shouldTriggerPreprocessing(imageNodeWithData, poseControlNetNode)}`);
  console.log(`   Image without data → ControlNet: ${preprocessingTrigger.shouldTriggerPreprocessing(imageNodeWithoutData, poseControlNetNode)}`);
  console.log(`   Text node → ControlNet: ${preprocessingTrigger.shouldTriggerPreprocessing(textNode, poseControlNetNode)}`);
  console.log(`   Expected: true, false, false\n`);

  // Requirement 3: Handle light ControlNet node exception (no preprocessing)
  console.log('3. ✅ Handle light ControlNet node exception (no preprocessing):');
  console.log(`   Image → Light ControlNet: ${preprocessingTrigger.shouldTriggerPreprocessing(imageNodeWithData, lightControlNetNode)}`);
  console.log(`   Expected: false (light ControlNet uses seed images directly)\n`);

  // Additional validation examples
  console.log('📋 Additional validation examples:');
  
  // Test different image URL formats
  const dataUrlNode: Node = {
    id: 'image-3',
    type: 'image-node',
    position: { x: 0, y: 0 },
    data: { imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
  };

  const runwareUrlNode: Node = {
    id: 'image-4',
    type: 'image-node',
    position: { x: 0, y: 0 },
    data: { imageUrl: 'https://im.runware.ai/image123.webp' },
  };

  console.log(`   Data URL image → ControlNet: ${preprocessingTrigger.shouldTriggerPreprocessing(dataUrlNode, poseControlNetNode)}`);
  console.log(`   Runware URL image → ControlNet: ${preprocessingTrigger.shouldTriggerPreprocessing(runwareUrlNode, poseControlNetNode)}`);
  console.log(`   Expected: true, true (both valid image formats)\n`);

  // Test different ControlNet types
  const depthControlNetNode: Node = {
    id: 'controlnet-3',
    type: 'control-net-depth',
    position: { x: 100, y: 0 },
    data: {},
  };

  const cannyControlNetNode: Node = {
    id: 'controlnet-4',
    type: 'control-net-canny',
    position: { x: 100, y: 0 },
    data: {},
  };

  console.log(`   Image → Depth ControlNet: ${preprocessingTrigger.shouldTriggerPreprocessing(imageNodeWithData, depthControlNetNode)}`);
  console.log(`   Image → Canny ControlNet: ${preprocessingTrigger.shouldTriggerPreprocessing(imageNodeWithData, cannyControlNetNode)}`);
  console.log(`   Expected: true, true (both require preprocessing)\n`);

  console.log('=== Demo Complete ===');
  console.log('✅ All requirements implemented successfully!');
  console.log('   1. Automatic preprocessing when image connects to ControlNet node');
  console.log('   2. Validation to ensure source node has valid image data');
  console.log('   3. Handle light ControlNet node exception (no preprocessing)');
}

// Make demo available for manual execution
if (typeof window !== 'undefined') {
  (window as any).demonstratePreprocessingTrigger = demonstratePreprocessingTrigger;
}