/**
 * Integration test for PreprocessingTrigger service
 * Manual verification of preprocessing trigger functionality
 */

import { Node, Edge } from '@xyflow/react';
import { PreprocessingTrigger } from '../preprocessingTrigger';
import { RunwareService } from '../runwareService';

/**
 * Manual integration test for preprocessing trigger
 * This test can be run manually to verify the implementation
 */
export async function testPreprocessingTrigger() {
  console.log('=== PreprocessingTrigger Integration Test ===');

  // Mock RunwareService for testing
  const mockRunwareService = {
    preprocessForControlNet: async (imageUrl: string, controlNetType: string) => {
      console.log(`Mock preprocessing: ${imageUrl} for ${controlNetType}`);
      return {
        guideImageURL: 'https://example.com/preprocessed.jpg',
        preprocessor: 'openpose',
      };
    },
  } as any;

  // Create callbacks to track behavior
  const callbacks = {
    onPreprocessingStarted: (nodeId: string) => {
      console.log(`✓ Preprocessing started for node: ${nodeId}`);
    },
    onPreprocessingCompleted: (nodeId: string, result: any) => {
      console.log(`✓ Preprocessing completed for node: ${nodeId}`, result);
    },
    onPreprocessingFailed: (nodeId: string, error: string) => {
      console.log(`✗ Preprocessing failed for node: ${nodeId}`, error);
    },
    updateNodeData: (nodeId: string, data: any) => {
      console.log(`✓ Node data updated for: ${nodeId}`, data);
    },
  };

  const preprocessingTrigger = new PreprocessingTrigger(mockRunwareService, callbacks);

  // Test 1: Valid image-to-ControlNet connection
  console.log('\n--- Test 1: Valid image-to-ControlNet connection ---');
  const imageNode: Node = {
    id: 'image-1',
    type: 'image-node',
    position: { x: 0, y: 0 },
    data: { imageUrl: 'https://example.com/image.jpg' },
  };

  const controlNetNode: Node = {
    id: 'controlnet-1',
    type: 'control-net-pose',
    position: { x: 100, y: 0 },
    data: {},
  };

  const shouldTrigger = preprocessingTrigger.shouldTriggerPreprocessing(imageNode, controlNetNode);
  console.log(`Should trigger preprocessing: ${shouldTrigger}`);

  if (shouldTrigger) {
    try {
      await preprocessingTrigger.triggerPreprocessing(imageNode, controlNetNode, [imageNode, controlNetNode], []);
      console.log('✓ Test 1 passed: Preprocessing triggered successfully');
    } catch (error) {
      console.log('✗ Test 1 failed:', error);
    }
  }

  // Test 2: Light ControlNet node (should not trigger)
  console.log('\n--- Test 2: Light ControlNet node (should not trigger) ---');
  const lightControlNetNode: Node = {
    id: 'controlnet-2',
    type: 'seed-image-lights',
    position: { x: 100, y: 0 },
    data: {},
  };

  const shouldNotTrigger = preprocessingTrigger.shouldTriggerPreprocessing(imageNode, lightControlNetNode);
  console.log(`Should trigger preprocessing: ${shouldNotTrigger}`);
  console.log(shouldNotTrigger ? '✗ Test 2 failed: Should not trigger for light ControlNet' : '✓ Test 2 passed: Light ControlNet correctly skipped');

  // Test 3: Node without valid image data
  console.log('\n--- Test 3: Node without valid image data ---');
  const imageNodeWithoutData: Node = {
    id: 'image-2',
    type: 'image-node',
    position: { x: 0, y: 0 },
    data: {},
  };

  const shouldNotTriggerNoData = preprocessingTrigger.shouldTriggerPreprocessing(imageNodeWithoutData, controlNetNode);
  console.log(`Should trigger preprocessing: ${shouldNotTriggerNoData}`);
  console.log(shouldNotTriggerNoData ? '✗ Test 3 failed: Should not trigger without image data' : '✓ Test 3 passed: Node without image data correctly skipped');

  // Test 4: Node type detection
  console.log('\n--- Test 4: Node type detection ---');
  console.log(`Is image node: ${preprocessingTrigger.isImageNode(imageNode)}`);
  console.log(`Is ControlNet node: ${preprocessingTrigger.isControlNetNode(controlNetNode)}`);
  console.log(`Is light ControlNet node: ${preprocessingTrigger.isControlNetNode(lightControlNetNode)}`);

  console.log('\n=== Integration Test Complete ===');
}

// Export test function for manual execution
if (typeof window !== 'undefined') {
  (window as any).testPreprocessingTrigger = testPreprocessingTrigger;
}