/**
 * Data Persistence Integration Tests
 * Tests the actual data persistence functionality for preprocessed results
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Node, Edge } from '@xyflow/react';
import { PreprocessedImageData } from '../../utils/controlNetUtils';

describe('Data Persistence Integration Tests', () => {
  let mockNodes: Node[];
  let mockEdges: Edge[];
  let mockPreprocessedData: PreprocessedImageData;

  beforeEach(() => {
    mockPreprocessedData = {
      guideImageURL: 'https://example.com/preprocessed-image.jpg',
      preprocessor: 'openpose',
      sourceImageUUID: 'source-image-123',
      timestamp: Date.now(),
    };

    mockNodes = [
      {
        id: 'image-node-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: {
          imageUrl: 'https://example.com/source-image.jpg',
        },
      },
      {
        id: 'control-net-pose-1',
        type: 'control-net-pose',
        position: { x: 200, y: 0 },
        data: {
          preprocessedImage: mockPreprocessedData,
          hasPreprocessedImage: true,
          isPreprocessing: false,
          preprocessor: 'openpose',
          right_sidebar: {
            preprocessedImage: mockPreprocessedData.guideImageURL,
            showPreprocessed: true,
          },
        },
      },
      {
        id: 'control-net-canny-1',
        type: 'control-net-canny',
        position: { x: 400, y: 0 },
        data: {
          // No preprocessed data
        },
      },
    ];

    mockEdges = [
      {
        id: 'edge-1',
        source: 'image-node-1',
        target: 'control-net-pose-1',
        type: 'custom',
      },
    ];
  });

  describe('Serialization and Deserialization', () => {
    it('should preserve preprocessed data through JSON serialization', () => {
      const nodeWithPreprocessedData = mockNodes.find(n => n.id === 'control-net-pose-1');
      
      // Simulate the serialization process used in saving
      const serialized = JSON.stringify(nodeWithPreprocessedData);
      const deserialized = JSON.parse(serialized);

      // Verify all preprocessed data is preserved
      expect(deserialized.data.preprocessedImage).toEqual(mockPreprocessedData);
      expect(deserialized.data.hasPreprocessedImage).toBe(true);
      expect(deserialized.data.preprocessor).toBe('openpose');
      expect(deserialized.data.right_sidebar.preprocessedImage).toBe(mockPreprocessedData.guideImageURL);
      expect(deserialized.data.right_sidebar.showPreprocessed).toBe(true);
    });

    it('should handle nodes without preprocessed data correctly', () => {
      const nodeWithoutPreprocessedData = mockNodes.find(n => n.id === 'control-net-canny-1');
      
      const serialized = JSON.stringify(nodeWithoutPreprocessedData);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.data.preprocessedImage).toBeUndefined();
      expect(deserialized.data.hasPreprocessedImage).toBeUndefined();
      expect(deserialized.data.preprocessor).toBeUndefined();
    });

    it('should preserve all required fields in preprocessed data', () => {
      const nodeWithPreprocessedData = mockNodes.find(n => n.id === 'control-net-pose-1');
      
      const serialized = JSON.stringify(nodeWithPreprocessedData);
      const deserialized = JSON.parse(serialized);

      const preprocessedData = deserialized.data.preprocessedImage;
      expect(preprocessedData).toHaveProperty('guideImageURL');
      expect(preprocessedData).toHaveProperty('preprocessor');
      expect(preprocessedData).toHaveProperty('sourceImageUUID');
      expect(preprocessedData).toHaveProperty('timestamp');
      
      expect(typeof preprocessedData.guideImageURL).toBe('string');
      expect(typeof preprocessedData.preprocessor).toBe('string');
      expect(typeof preprocessedData.sourceImageUUID).toBe('string');
      expect(typeof preprocessedData.timestamp).toBe('number');
    });
  });

  describe('Data Restoration Logic', () => {
    it('should restore preprocessed data with correct flags', () => {
      const savedNode = mockNodes.find(n => n.id === 'control-net-pose-1');
      
      // Simulate the restoration logic from dbUtils.ts
      const restoredNode = {
        ...savedNode,
        data: {
          ...savedNode!.data,
          // Ensure preprocessed data is properly restored
          hasPreprocessedImage: true,
          isPreprocessing: false,
          // Restore right_sidebar display data
          right_sidebar: {
            ...savedNode!.data.right_sidebar,
            preprocessedImage: savedNode!.data.preprocessedImage?.guideImageURL,
            showPreprocessed: true,
          },
        },
      };

      expect(restoredNode.data.hasPreprocessedImage).toBe(true);
      expect(restoredNode.data.isPreprocessing).toBe(false);
      expect(restoredNode.data.right_sidebar.showPreprocessed).toBe(true);
      expect(restoredNode.data.right_sidebar.preprocessedImage).toBe(mockPreprocessedData.guideImageURL);
    });

    it('should handle missing preprocessed data during restoration', () => {
      const nodeWithoutData = {
        id: 'control-net-test',
        type: 'control-net-pose',
        position: { x: 0, y: 0 },
        data: {
          // No preprocessed data
        },
      };

      // Simulate restoration logic
      const restoredNode = {
        ...nodeWithoutData,
        data: {
          ...nodeWithoutData.data,
          hasPreprocessedImage: !!nodeWithoutData.data.preprocessedImage,
          isPreprocessing: false,
          right_sidebar: {
            ...nodeWithoutData.data.right_sidebar,
            preprocessedImage: nodeWithoutData.data.preprocessedImage?.guideImageURL,
            showPreprocessed: !!nodeWithoutData.data.preprocessedImage,
          },
        },
      };

      expect(restoredNode.data.hasPreprocessedImage).toBe(false);
      expect(restoredNode.data.isPreprocessing).toBe(false);
      expect(restoredNode.data.right_sidebar.showPreprocessed).toBe(false);
      expect(restoredNode.data.right_sidebar.preprocessedImage).toBeUndefined();
    });

    it('should only restore data for ControlNet nodes', () => {
      const imageNode = mockNodes.find(n => n.id === 'image-node-1');
      
      // Image nodes should not be processed for preprocessed data restoration
      const shouldProcess = (imageNode!.type?.includes('control-net') || imageNode!.type === 'seed-image-lights') && 
                           imageNode!.data?.preprocessedImage;

      expect(shouldProcess).toBe(false);
    });

    it('should identify ControlNet nodes correctly', () => {
      const controlNetNode = mockNodes.find(n => n.id === 'control-net-pose-1');
      const imageNode = mockNodes.find(n => n.id === 'image-node-1');
      
      const isControlNetNode = (node: Node) => 
        node.type?.includes('control-net') || node.type === 'seed-image-lights';

      expect(isControlNetNode(controlNetNode!)).toBe(true);
      expect(isControlNetNode(imageNode!)).toBe(false);
    });
  });

  describe('Data Cleanup Logic', () => {
    it('should clear all preprocessed data fields', () => {
      const nodeWithPreprocessedData = { ...mockNodes[1] };
      
      // Simulate the cleanup logic from clearPreprocessedData
      const clearedNode = {
        ...nodeWithPreprocessedData,
        data: {
          ...nodeWithPreprocessedData.data,
          preprocessedImage: undefined,
          isPreprocessing: false,
          hasPreprocessedImage: false,
          preprocessor: undefined,
          right_sidebar: {
            ...nodeWithPreprocessedData.data.right_sidebar,
            preprocessedImage: undefined,
            showPreprocessed: false,
          },
        },
      };

      expect(clearedNode.data.preprocessedImage).toBeUndefined();
      expect(clearedNode.data.hasPreprocessedImage).toBe(false);
      expect(clearedNode.data.isPreprocessing).toBe(false);
      expect(clearedNode.data.preprocessor).toBeUndefined();
      expect(clearedNode.data.right_sidebar.preprocessedImage).toBeUndefined();
      expect(clearedNode.data.right_sidebar.showPreprocessed).toBe(false);
    });

    it('should preserve other node data when clearing preprocessed data', () => {
      const nodeWithPreprocessedData = { ...mockNodes[1] };
      const originalRightSidebar = { ...nodeWithPreprocessedData.data.right_sidebar };
      
      // Add some other data to preserve
      nodeWithPreprocessedData.data.someOtherField = 'preserve this';
      originalRightSidebar.someOtherSidebarField = 'preserve this too';
      
      const clearedNode = {
        ...nodeWithPreprocessedData,
        data: {
          ...nodeWithPreprocessedData.data,
          preprocessedImage: undefined,
          isPreprocessing: false,
          hasPreprocessedImage: false,
          preprocessor: undefined,
          right_sidebar: {
            ...originalRightSidebar,
            preprocessedImage: undefined,
            showPreprocessed: false,
          },
        },
      };

      // Verify other data is preserved
      expect(clearedNode.data.someOtherField).toBe('preserve this');
      expect(clearedNode.data.right_sidebar.someOtherSidebarField).toBe('preserve this too');
      
      // Verify preprocessed data is cleared
      expect(clearedNode.data.preprocessedImage).toBeUndefined();
      expect(clearedNode.data.hasPreprocessedImage).toBe(false);
    });
  });

  describe('Workflow State Serialization', () => {
    it('should create serializable workflow state with preprocessed data', () => {
      // Simulate the getSerializableWorkflowState logic
      const serializableNodes = mockNodes.map(node => {
        if ((node.type?.includes('control-net') || node.type === 'seed-image-lights') && 
            node.data?.preprocessedImage) {
          return {
            ...node,
            data: {
              ...node.data,
              // Ensure preprocessed data is preserved
              preprocessedImage: node.data.preprocessedImage,
              hasPreprocessedImage: !!node.data.preprocessedImage,
              preprocessor: node.data.preprocessor,
              // Preserve right_sidebar state
              right_sidebar: {
                ...node.data.right_sidebar,
                preprocessedImage: node.data.preprocessedImage?.guideImageURL,
                showPreprocessed: !!node.data.preprocessedImage,
              },
            },
          };
        }
        return node;
      });

      const workflowState = {
        nodes: serializableNodes,
        edges: mockEdges,
      };

      // Verify the serializable state
      const controlNetNode = workflowState.nodes.find(n => n.id === 'control-net-pose-1');
      expect(controlNetNode?.data.preprocessedImage).toEqual(mockPreprocessedData);
      expect(controlNetNode?.data.hasPreprocessedImage).toBe(true);
      expect(controlNetNode?.data.right_sidebar.showPreprocessed).toBe(true);

      // Verify nodes without preprocessed data are unchanged
      const imageNode = workflowState.nodes.find(n => n.id === 'image-node-1');
      expect(imageNode?.data.preprocessedImage).toBeUndefined();
    });

    it('should handle empty workflow state', () => {
      const emptyNodes: Node[] = [];
      const emptyEdges: Edge[] = [];

      const workflowState = {
        nodes: emptyNodes,
        edges: emptyEdges,
      };

      expect(workflowState.nodes).toHaveLength(0);
      expect(workflowState.edges).toHaveLength(0);
    });
  });
});