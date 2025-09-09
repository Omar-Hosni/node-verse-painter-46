/**
 * Test file to verify ControlNet node data structures for preprocessing
 * This test verifies that the enhanced node data structures support preprocessing functionality
 */

import { describe, it, expect, test } from 'vitest';
import { NodeData } from '../../../store/types';
import { PreprocessedImageData, createPreprocessedImageData } from '../controlNetUtils';

// Mock test data
const mockPreprocessedImageData: PreprocessedImageData = {
  guideImageURL: 'https://example.com/preprocessed-image.jpg',
  preprocessor: 'openpose',
  sourceImageUUID: 'source-uuid-123',
  timestamp: Date.now(),
};

const mockControlNetNodeData: NodeData = {
  id: 'control-net-pose-1',
  type: 'control-net-pose',
  preprocessedImage: mockPreprocessedImageData,
  isPreprocessing: false,
  hasPreprocessedImage: true,
  preprocessor: 'openpose',
};

// Test that the data structures are properly typed and can be used
describe('ControlNet Node Data Structures', () => {
  test('NodeData interface supports preprocessing fields', () => {
    // This test verifies that the NodeData interface includes all required preprocessing fields
    const nodeData: NodeData = {
      id: 'test-node',
      type: 'control-net-pose',
      preprocessedImage: undefined,
      isPreprocessing: false,
      hasPreprocessedImage: false,
      preprocessor: undefined,
    };

    // Verify the fields exist and have correct types
    expect(typeof nodeData.isPreprocessing).toBe('boolean');
    expect(typeof nodeData.hasPreprocessedImage).toBe('boolean');
    expect(nodeData.preprocessedImage).toBeUndefined();
    expect(nodeData.preprocessor).toBeUndefined();
  });

  test('PreprocessedImageData can be created and assigned', () => {
    const imageData = createPreprocessedImageData(
      'https://example.com/image.jpg',
      'openpose',
      'source-123'
    );

    expect(imageData.guideImageURL).toBe('https://example.com/image.jpg');
    expect(imageData.preprocessor).toBe('openpose');
    expect(imageData.sourceImageUUID).toBe('source-123');
    expect(typeof imageData.timestamp).toBe('number');
    expect(imageData.timestamp).toBeGreaterThan(0);
  });

  test('ControlNet node data can store preprocessing state', () => {
    // Test initial state (no preprocessing)
    const initialNodeData: NodeData = {
      id: 'control-net-pose-1',
      type: 'control-net-pose',
      isPreprocessing: false,
      hasPreprocessedImage: false,
    };

    expect(initialNodeData.isPreprocessing).toBe(false);
    expect(initialNodeData.hasPreprocessedImage).toBe(false);
    expect(initialNodeData.preprocessedImage).toBeUndefined();

    // Test processing state
    const processingNodeData: NodeData = {
      ...initialNodeData,
      isPreprocessing: true,
    };

    expect(processingNodeData.isPreprocessing).toBe(true);
    expect(processingNodeData.hasPreprocessedImage).toBe(false);

    // Test completed state
    const completedNodeData: NodeData = {
      ...initialNodeData,
      isPreprocessing: false,
      hasPreprocessedImage: true,
      preprocessedImage: mockPreprocessedImageData,
      preprocessor: 'openpose',
    };

    expect(completedNodeData.isPreprocessing).toBe(false);
    expect(completedNodeData.hasPreprocessedImage).toBe(true);
    expect(completedNodeData.preprocessedImage).toBeDefined();
    expect(completedNodeData.preprocessor).toBe('openpose');
  });

  test('Node data can be serialized and deserialized for persistence', () => {
    // Test that the node data can be properly serialized for saving
    const nodeData: NodeData = mockControlNetNodeData;
    
    const serialized = JSON.stringify(nodeData);
    const deserialized = JSON.parse(serialized) as NodeData;

    expect(deserialized.id).toBe(nodeData.id);
    expect(deserialized.type).toBe(nodeData.type);
    expect(deserialized.isPreprocessing).toBe(nodeData.isPreprocessing);
    expect(deserialized.hasPreprocessedImage).toBe(nodeData.hasPreprocessedImage);
    expect(deserialized.preprocessor).toBe(nodeData.preprocessor);
    expect(deserialized.preprocessedImage?.guideImageURL).toBe(nodeData.preprocessedImage?.guideImageURL);
    expect(deserialized.preprocessedImage?.preprocessor).toBe(nodeData.preprocessedImage?.preprocessor);
  });

  test('Node data supports clearing preprocessing state', () => {
    // Start with a node that has preprocessed data
    const nodeWithData: NodeData = {
      ...mockControlNetNodeData,
    };

    expect(nodeWithData.hasPreprocessedImage).toBe(true);
    expect(nodeWithData.preprocessedImage).toBeDefined();

    // Clear the preprocessing data
    const clearedNodeData: NodeData = {
      ...nodeWithData,
      preprocessedImage: undefined,
      isPreprocessing: false,
      hasPreprocessedImage: false,
      preprocessor: undefined,
    };

    expect(clearedNodeData.hasPreprocessedImage).toBe(false);
    expect(clearedNodeData.preprocessedImage).toBeUndefined();
    expect(clearedNodeData.isPreprocessing).toBe(false);
    expect(clearedNodeData.preprocessor).toBeUndefined();
  });
});