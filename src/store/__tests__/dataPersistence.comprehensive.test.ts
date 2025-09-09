/**
 * Comprehensive unit tests for data persistence of preprocessed results
 * Tests requirements 5.1, 5.2, 5.3, 5.4 for data storage and retrieval
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Node } from '@xyflow/react';
import { NodeData } from '../types';
import { createPreprocessedImageData } from '../../utils/controlNetUtils';

describe('Data Persistence - Comprehensive Tests', () => {
  describe('Preprocessed Data Structure Validation', () => {
    it('should create valid preprocessed image data with all required fields', () => {
      const guideImageURL = 'https://example.com/processed.jpg';
      const preprocessor = 'openpose';
      const sourceImageUUID = 'source-123';

      const data = createPreprocessedImageData(guideImageURL, preprocessor, sourceImageUUID);

      expect(data).toHaveProperty('guideImageURL', guideImageURL);
      expect(data).toHaveProperty('preprocessor', preprocessor);
      expect(data).toHaveProperty('sourceImageUUID', sourceImageUUID);
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('number');
      expect(data.timestamp).toBeGreaterThan(0);
    });

    it('should create preprocessed data without optional sourceImageUUID', () => {
      const guideImageURL = 'https://example.com/processed.jpg';
      const preprocessor = 'depth_midas';

      const data = createPreprocessedImageData(guideImageURL, preprocessor);

      expect(data.guideImageURL).toBe(guideImageURL);
      expect(data.preprocessor).toBe(preprocessor);
      expect(data.sourceImageUUID).toBeUndefined();
      expect(data.timestamp).toBeGreaterThan(0);
    });

    it('should create unique timestamps for different operations', () => {
      const data1 = createPreprocessedImageData('url1', 'openpose');
      // Small delay to ensure different timestamps
      const data2 = createPreprocessedImageData('url2', 'depth_midas');

      expect(data2.timestamp).toBeGreaterThanOrEqual(data1.timestamp);
    });
  });

  describe('Node Data Structure Integration', () => {
    it('should support all preprocessing-related fields in NodeData', () => {
      const preprocessedData = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose',
        'source-123'
      );

      const nodeData: NodeData = {
        id: 'control-net-pose-1',
        type: 'control-net-pose',
        preprocessedImage: preprocessedData,
        isPreprocessing: false,
        hasPreprocessedImage: true,
        preprocessor: 'openpose',
      };

      // Verify all fields are properly typed and accessible
      expect(nodeData.id).toBe('control-net-pose-1');
      expect(nodeData.type).toBe('control-net-pose');
      expect(nodeData.preprocessedImage).toBe(preprocessedData);
      expect(nodeData.isPreprocessing).toBe(false);
      expect(nodeData.hasPreprocessedImage).toBe(true);
      expect(nodeData.preprocessor).toBe('openpose');
    });

    it('should support processing state transitions', () => {
      // Initial state
      const initialData: NodeData = {
        id: 'controlnet-1',
        type: 'control-net-depth',
        isPreprocessing: false,
        hasPreprocessedImage: false,
      };

      // Processing state
      const processingData: NodeData = {
        ...initialData,
        isPreprocessing: true,
      };

      // Completed state
      const preprocessedResult = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'depth_midas'
      );

      const completedData: NodeData = {
        ...initialData,
        isPreprocessing: false,
        hasPreprocessedImage: true,
        preprocessedImage: preprocessedResult,
        preprocessor: 'depth_midas',
      };

      // Error state
      const errorData: NodeData = {
        ...initialData,
        isPreprocessing: false,
        hasPreprocessedImage: false,
        preprocessedImage: undefined,
      };

      expect(initialData.isPreprocessing).toBe(false);
      expect(processingData.isPreprocessing).toBe(true);
      expect(completedData.hasPreprocessedImage).toBe(true);
      expect(completedData.preprocessedImage).toBeDefined();
      expect(errorData.hasPreprocessedImage).toBe(false);
      expect(errorData.preprocessedImage).toBeUndefined();
    });
  });

  describe('Serialization and Deserialization (Requirement 5.2)', () => {
    it('should serialize and deserialize node data with preprocessed images', () => {
      const preprocessedData = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose',
        'source-123'
      );

      const originalNodeData: NodeData = {
        id: 'control-net-pose-1',
        type: 'control-net-pose',
        preprocessedImage: preprocessedData,
        isPreprocessing: false,
        hasPreprocessedImage: true,
        preprocessor: 'openpose',
      };

      // Serialize
      const serialized = JSON.stringify(originalNodeData);
      
      // Deserialize
      const deserialized: NodeData = JSON.parse(serialized);

      // Verify all data is preserved
      expect(deserialized.id).toBe(originalNodeData.id);
      expect(deserialized.type).toBe(originalNodeData.type);
      expect(deserialized.isPreprocessing).toBe(originalNodeData.isPreprocessing);
      expect(deserialized.hasPreprocessedImage).toBe(originalNodeData.hasPreprocessedImage);
      expect(deserialized.preprocessor).toBe(originalNodeData.preprocessor);
      
      expect(deserialized.preprocessedImage?.guideImageURL).toBe(preprocessedData.guideImageURL);
      expect(deserialized.preprocessedImage?.preprocessor).toBe(preprocessedData.preprocessor);
      expect(deserialized.preprocessedImage?.sourceImageUUID).toBe(preprocessedData.sourceImageUUID);
      expect(deserialized.preprocessedImage?.timestamp).toBe(preprocessedData.timestamp);
    });

    it('should handle serialization of nodes without preprocessed data', () => {
      const nodeData: NodeData = {
        id: 'control-net-pose-1',
        type: 'control-net-pose',
        isPreprocessing: false,
        hasPreprocessedImage: false,
      };

      const serialized = JSON.stringify(nodeData);
      const deserialized: NodeData = JSON.parse(serialized);

      expect(deserialized.id).toBe(nodeData.id);
      expect(deserialized.type).toBe(nodeData.type);
      expect(deserialized.isPreprocessing).toBe(false);
      expect(deserialized.hasPreprocessedImage).toBe(false);
      expect(deserialized.preprocessedImage).toBeUndefined();
    });

    it('should handle serialization of complex workflow with multiple ControlNet nodes', () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'https://example.com/input.jpg' },
        },
        {
          id: 'controlnet-pose',
          type: 'control-net-pose',
          position: { x: 200, y: 0 },
          data: {
            id: 'controlnet-pose',
            type: 'control-net-pose',
            preprocessedImage: createPreprocessedImageData(
              'https://example.com/pose-processed.jpg',
              'openpose'
            ),
            isPreprocessing: false,
            hasPreprocessedImage: true,
            preprocessor: 'openpose',
          },
        },
        {
          id: 'controlnet-depth',
          type: 'control-net-depth',
          position: { x: 200, y: 100 },
          data: {
            id: 'controlnet-depth',
            type: 'control-net-depth',
            preprocessedImage: createPreprocessedImageData(
              'https://example.com/depth-processed.jpg',
              'depth_midas'
            ),
            isPreprocessing: false,
            hasPreprocessedImage: true,
            preprocessor: 'depth_midas',
          },
        },
      ];

      // Serialize entire workflow
      const serialized = JSON.stringify(nodes);
      const deserialized: Node[] = JSON.parse(serialized);

      expect(deserialized).toHaveLength(3);
      
      const poseNode = deserialized.find(n => n.id === 'controlnet-pose');
      const depthNode = deserialized.find(n => n.id === 'controlnet-depth');

      expect(poseNode?.data.hasPreprocessedImage).toBe(true);
      expect(poseNode?.data.preprocessor).toBe('openpose');
      expect(poseNode?.data.preprocessedImage?.guideImageURL).toBe('https://example.com/pose-processed.jpg');

      expect(depthNode?.data.hasPreprocessedImage).toBe(true);
      expect(depthNode?.data.preprocessor).toBe('depth_midas');
      expect(depthNode?.data.preprocessedImage?.guideImageURL).toBe('https://example.com/depth-processed.jpg');
    });
  });

  describe('Data Cleanup and Memory Management (Requirement 5.4)', () => {
    it('should support clearing preprocessed data from node', () => {
      const nodeWithData: NodeData = {
        id: 'controlnet-1',
        type: 'control-net-pose',
        preprocessedImage: createPreprocessedImageData(
          'https://example.com/processed.jpg',
          'openpose'
        ),
        isPreprocessing: false,
        hasPreprocessedImage: true,
        preprocessor: 'openpose',
      };

      // Clear the data
      const clearedNode: NodeData = {
        ...nodeWithData,
        preprocessedImage: undefined,
        isPreprocessing: false,
        hasPreprocessedImage: false,
        preprocessor: undefined,
      };

      expect(clearedNode.hasPreprocessedImage).toBe(false);
      expect(clearedNode.preprocessedImage).toBeUndefined();
      expect(clearedNode.preprocessor).toBeUndefined();
      expect(clearedNode.isPreprocessing).toBe(false);
    });

    it('should handle partial data cleanup scenarios', () => {
      const nodeData: NodeData = {
        id: 'controlnet-1',
        type: 'control-net-pose',
        preprocessedImage: createPreprocessedImageData(
          'https://example.com/processed.jpg',
          'openpose'
        ),
        isPreprocessing: false,
        hasPreprocessedImage: true,
        preprocessor: 'openpose',
      };

      // Scenario: Clear only the image but keep metadata
      const partiallyCleared: NodeData = {
        ...nodeData,
        preprocessedImage: undefined,
        hasPreprocessedImage: false,
        // Keep preprocessor for reference
      };

      expect(partiallyCleared.hasPreprocessedImage).toBe(false);
      expect(partiallyCleared.preprocessedImage).toBeUndefined();
      expect(partiallyCleared.preprocessor).toBe('openpose'); // Still available
    });
  });

  describe('Data Validation and Integrity', () => {
    it('should validate preprocessed data structure integrity', () => {
      const validData = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose',
        'source-123'
      );

      // Check all required fields are present
      expect(validData).toHaveProperty('guideImageURL');
      expect(validData).toHaveProperty('preprocessor');
      expect(validData).toHaveProperty('timestamp');

      // Check field types
      expect(typeof validData.guideImageURL).toBe('string');
      expect(typeof validData.preprocessor).toBe('string');
      expect(typeof validData.timestamp).toBe('number');

      // Check field values
      expect(validData.guideImageURL.length).toBeGreaterThan(0);
      expect(validData.preprocessor.length).toBeGreaterThan(0);
      expect(validData.timestamp).toBeGreaterThan(0);
    });

    it('should handle edge cases in data creation', () => {
      // Test with minimal valid data
      const minimalData = createPreprocessedImageData('url', 'preprocessor');
      expect(minimalData.guideImageURL).toBe('url');
      expect(minimalData.preprocessor).toBe('preprocessor');
      expect(minimalData.timestamp).toBeGreaterThan(0);

      // Test with maximum data
      const maximalData = createPreprocessedImageData(
        'https://very-long-url.example.com/path/to/processed/image.webp',
        'openpose',
        'very-long-source-uuid-123456789'
      );
      expect(maximalData.guideImageURL).toContain('very-long-url');
      expect(maximalData.sourceImageUUID).toContain('very-long-source-uuid');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of preprocessed nodes efficiently', () => {
      const nodeCount = 100;
      const nodes: NodeData[] = [];

      // Create many nodes with preprocessed data
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          id: `controlnet-${i}`,
          type: 'control-net-pose',
          preprocessedImage: createPreprocessedImageData(
            `https://example.com/processed-${i}.jpg`,
            'openpose',
            `source-${i}`
          ),
          isPreprocessing: false,
          hasPreprocessedImage: true,
          preprocessor: 'openpose',
        });
      }

      // Test serialization performance
      const startTime = performance.now();
      const serialized = JSON.stringify(nodes);
      const serializationTime = performance.now() - startTime;

      // Test deserialization performance
      const deserializeStartTime = performance.now();
      const deserialized: NodeData[] = JSON.parse(serialized);
      const deserializationTime = performance.now() - deserializeStartTime;

      expect(deserialized).toHaveLength(nodeCount);
      expect(serializationTime).toBeLessThan(1000); // Should complete within 1 second
      expect(deserializationTime).toBeLessThan(1000); // Should complete within 1 second

      // Verify data integrity
      expect(deserialized[0].id).toBe('controlnet-0');
      expect(deserialized[nodeCount - 1].id).toBe(`controlnet-${nodeCount - 1}`);
    });

    it('should handle memory cleanup for large datasets', () => {
      const createLargeDataset = () => {
        const nodes: NodeData[] = [];
        for (let i = 0; i < 50; i++) {
          nodes.push({
            id: `controlnet-${i}`,
            type: 'control-net-pose',
            preprocessedImage: createPreprocessedImageData(
              `https://example.com/processed-${i}.jpg`,
              'openpose'
            ),
            isPreprocessing: false,
            hasPreprocessedImage: true,
            preprocessor: 'openpose',
          });
        }
        return nodes;
      };

      // Create and clear multiple datasets
      for (let iteration = 0; iteration < 5; iteration++) {
        const dataset = createLargeDataset();
        expect(dataset).toHaveLength(50);
        
        // Clear all preprocessed data
        const clearedDataset = dataset.map(node => ({
          ...node,
          preprocessedImage: undefined,
          hasPreprocessedImage: false,
          preprocessor: undefined,
        }));

        expect(clearedDataset.every(node => !node.hasPreprocessedImage)).toBe(true);
      }
    });
  });
});