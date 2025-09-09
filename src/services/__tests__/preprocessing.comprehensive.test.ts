/**
 * Comprehensive unit tests for ControlNet preprocessing functionality
 * Tests the complete preprocessing workflow including mapping, connection detection,
 * trigger logic, and data storage/retrieval
 * 
 * Requirements tested: 1.1, 1.2, 3.1-3.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Node, Edge } from '@xyflow/react';
import { ConnectionHandler } from '../connectionHandler';
import { PreprocessingTrigger } from '../preprocessingTrigger';
import { RunwareService } from '../runwareService';
import { PreprocessingStateManagerImpl } from '../../store/preprocessingState';
import { 
  getPreprocessorForControlNet,
  isControlNetNodeType,
  requiresPreprocessing,
  createPreprocessedImageData,
  CONTROLNET_PREPROCESSOR_MAP
} from '../../utils/controlNetUtils';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../runwareService');

describe('ControlNet Preprocessing - Comprehensive Tests', () => {
  let connectionHandler: ConnectionHandler;
  let preprocessingTrigger: PreprocessingTrigger;
  let stateManager: PreprocessingStateManagerImpl;
  let mockRunwareService: vi.Mocked<RunwareService>;
  let mockCallbacks: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRunwareService = {
      preprocessForControlNet: vi.fn(),
      getPreprocessorForControlNet: vi.fn(),
    } as any;

    mockCallbacks = {
      onPreprocessingTriggered: vi.fn(),
      onPreprocessedDataCleared: vi.fn(),
      onPreprocessingStarted: vi.fn(),
      onPreprocessingCompleted: vi.fn(),
      onPreprocessingFailed: vi.fn(),
      updateNodeData: vi.fn(),
    };

    stateManager = new PreprocessingStateManagerImpl(vi.fn());
    connectionHandler = new ConnectionHandler(mockCallbacks);
    preprocessingTrigger = new PreprocessingTrigger(mockRunwareService, mockCallbacks);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Preprocessor Mapping - All ControlNet Types (Requirement 3.1-3.7)', () => {
    const testCases = [
      { nodeType: 'control-net-pose', expectedPreprocessor: 'openpose', requirement: '3.1' },
      { nodeType: 'control-net-depth', expectedPreprocessor: 'depth', requirement: '3.2' },
      { nodeType: 'control-net-canny', expectedPreprocessor: 'canny', requirement: '3.3' },
      { nodeType: 'control-net-normal-map', expectedPreprocessor: 'normalbae', requirement: '3.4' },
      { nodeType: 'control-net-edge', expectedPreprocessor: 'lineart', requirement: '3.5' },
      { nodeType: 'control-net-segments', expectedPreprocessor: 'seg', requirement: '3.6' },
      { nodeType: 'seed-image-lights', expectedPreprocessor: null, requirement: '3.7' },
    ];

    testCases.forEach(({ nodeType, expectedPreprocessor, requirement }) => {
      it(`should map ${nodeType} to ${expectedPreprocessor || 'null'} (Requirement ${requirement})`, () => {
        expect(getPreprocessorForControlNet(nodeType)).toBe(expectedPreprocessor);
        expect(CONTROLNET_PREPROCESSOR_MAP[nodeType]).toBe(expectedPreprocessor);
      });
    });

    it('should correctly identify all ControlNet node types', () => {
      testCases.forEach(({ nodeType }) => {
        expect(isControlNetNodeType(nodeType)).toBe(true);
      });
    });

    it('should correctly identify which nodes require preprocessing', () => {
      testCases.forEach(({ nodeType, expectedPreprocessor }) => {
        const shouldRequirePreprocessing = expectedPreprocessor !== null;
        expect(requiresPreprocessing(nodeType)).toBe(shouldRequirePreprocessing);
      });
    });
  });

  describe('Connection Detection and Preprocessing Trigger (Requirements 1.1, 1.2)', () => {
    const createImageNode = (id: string, imageUrl: string): Node => ({
      id,
      type: 'image-node',
      position: { x: 0, y: 0 },
      data: { imageUrl },
    });

    const createControlNetNode = (id: string, type: string): Node => ({
      id,
      type,
      position: { x: 100, y: 0 },
      data: {},
    });

    describe('Requirement 1.1 - Automatic preprocessing trigger', () => {
      it('should trigger preprocessing when image connects to ControlNet node', async () => {
        const imageNode = createImageNode('image-1', 'https://example.com/image.jpg');
        const controlNetNode = createControlNetNode('controlnet-1', 'control-net-pose');
        const nodes = [imageNode, controlNetNode];

        const connection = {
          source: { nodeId: 'image-1', handleId: 'output', nodeType: 'image-node' },
          target: { nodeId: 'controlnet-1', handleId: 'input', nodeType: 'control-net-pose' },
          connectionType: 'new' as const,
        };

        await connectionHandler.handleNewConnection(connection, nodes);
        expect(mockCallbacks.onPreprocessingTriggered).toHaveBeenCalledWith('controlnet-1');
      });

      it('should not trigger preprocessing for light ControlNet nodes', async () => {
        const imageNode = createImageNode('image-1', 'https://example.com/image.jpg');
        const lightNode = createControlNetNode('light-1', 'seed-image-lights');
        const nodes = [imageNode, lightNode];

        const connection = {
          source: { nodeId: 'image-1', handleId: 'output', nodeType: 'image-node' },
          target: { nodeId: 'light-1', handleId: 'input', nodeType: 'seed-image-lights' },
          connectionType: 'new' as const,
        };

        await connectionHandler.handleNewConnection(connection, nodes);
        expect(mockCallbacks.onPreprocessingTriggered).not.toHaveBeenCalled();
      });

      it('should not trigger preprocessing for non-image source nodes', async () => {
        const textNode: Node = {
          id: 'text-1',
          type: 'text-node',
          position: { x: 0, y: 0 },
          data: { text: 'hello' },
        };
        const controlNetNode = createControlNetNode('controlnet-1', 'control-net-pose');
        const nodes = [textNode, controlNetNode];

        const connection = {
          source: { nodeId: 'text-1', handleId: 'output', nodeType: 'text-node' },
          target: { nodeId: 'controlnet-1', handleId: 'input', nodeType: 'control-net-pose' },
          connectionType: 'new' as const,
        };

        await connectionHandler.handleNewConnection(connection, nodes);
        expect(mockCallbacks.onPreprocessingTriggered).not.toHaveBeenCalled();
      });
    });

    describe('Requirement 1.2 - API integration with correct preprocessor', () => {
      it('should call API with correct preprocessor for each ControlNet type', async () => {
        const testCases = [
          { nodeType: 'control-net-pose', expectedPreprocessor: 'openpose' },
          { nodeType: 'control-net-depth', expectedPreprocessor: 'depth' },
          { nodeType: 'control-net-canny', expectedPreprocessor: 'canny' },
          { nodeType: 'control-net-normal-map', expectedPreprocessor: 'normalbae' },
          { nodeType: 'control-net-edge', expectedPreprocessor: 'lineart' },
          { nodeType: 'control-net-segments', expectedPreprocessor: 'seg' },
        ];

        for (const { nodeType, expectedPreprocessor } of testCases) {
          const mockResult = {
            guideImageURL: `https://example.com/processed-${expectedPreprocessor}.jpg`,
            preprocessor: expectedPreprocessor,
          };
          mockRunwareService.preprocessForControlNet.mockResolvedValue(mockResult);

          const imageNode = createImageNode('image-1', 'https://example.com/input.jpg');
          const controlNetNode = createControlNetNode('controlnet-1', nodeType);

          await preprocessingTrigger.triggerPreprocessing(
            imageNode,
            controlNetNode,
            [imageNode, controlNetNode],
            []
          );

          expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledWith(
            'https://example.com/input.jpg',
            nodeType
          );

          mockRunwareService.preprocessForControlNet.mockClear();
        }
      });
    });
  });

  describe('Data Storage and Retrieval (Requirements 5.1, 5.2, 5.3, 5.4)', () => {
    describe('Requirement 5.1 - Store guideImageURL in node data', () => {
      it('should store preprocessed data in ControlNet node', async () => {
        const mockResult = {
          guideImageURL: 'https://example.com/processed.jpg',
          preprocessor: 'openpose',
        };
        mockRunwareService.preprocessForControlNet.mockResolvedValue(mockResult);

        const imageNode = createImageNode('image-1', 'https://example.com/input.jpg');
        const controlNetNode = createControlNetNode('controlnet-1', 'control-net-pose');

        await preprocessingTrigger.triggerPreprocessing(
          imageNode,
          controlNetNode,
          [imageNode, controlNetNode],
          []
        );

        expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith(
          'controlnet-1',
          expect.objectContaining({
            hasPreprocessedImage: true,
            isPreprocessing: false,
            preprocessedImage: expect.objectContaining({
              guideImageURL: 'https://example.com/processed.jpg',
              preprocessor: 'openpose',
            }),
          })
        );
      });
    });

    describe('Requirement 5.2 - Workflow persistence', () => {
      it('should create preprocessed data that can be serialized', () => {
        const preprocessedData = createPreprocessedImageData(
          'https://example.com/processed.jpg',
          'openpose',
          'source-uuid-123'
        );

        // Test serialization
        const serialized = JSON.stringify(preprocessedData);
        const deserialized = JSON.parse(serialized);

        expect(deserialized.guideImageURL).toBe(preprocessedData.guideImageURL);
        expect(deserialized.preprocessor).toBe(preprocessedData.preprocessor);
        expect(deserialized.sourceImageUUID).toBe(preprocessedData.sourceImageUUID);
        expect(deserialized.timestamp).toBe(preprocessedData.timestamp);
      });

      it('should include all required fields for persistence', () => {
        const preprocessedData = createPreprocessedImageData(
          'https://example.com/processed.jpg',
          'depth_midas'
        );

        expect(preprocessedData).toHaveProperty('guideImageURL');
        expect(preprocessedData).toHaveProperty('preprocessor');
        expect(preprocessedData).toHaveProperty('timestamp');
        expect(typeof preprocessedData.timestamp).toBe('number');
        expect(preprocessedData.timestamp).toBeGreaterThan(0);
      });
    });

    describe('Requirement 5.4 - Clear data on disconnection', () => {
      it('should clear preprocessed data when connection is removed', () => {
        const nodes: Node[] = [
          createImageNode('image-1', 'https://example.com/input.jpg'),
          createControlNetNode('controlnet-1', 'control-net-pose'),
        ];

        const connection = {
          source: { nodeId: 'image-1', handleId: 'output', nodeType: 'image-node' },
          target: { nodeId: 'controlnet-1', handleId: 'input', nodeType: 'control-net-pose' },
          connectionType: 'removed' as const,
        };

        const remainingEdges: Edge[] = []; // No remaining connections

        connectionHandler.handleConnectionRemoval(connection, nodes, remainingEdges);

        expect(mockCallbacks.onPreprocessedDataCleared).toHaveBeenCalledWith('controlnet-1');
      });

      it('should not clear data if other image connections remain', () => {
        const nodes: Node[] = [
          createImageNode('image-1', 'https://example.com/input1.jpg'),
          createImageNode('image-2', 'https://example.com/input2.jpg'),
          createControlNetNode('controlnet-1', 'control-net-pose'),
        ];

        const connection = {
          source: { nodeId: 'image-1', handleId: 'output', nodeType: 'image-node' },
          target: { nodeId: 'controlnet-1', handleId: 'input', nodeType: 'control-net-pose' },
          connectionType: 'removed' as const,
        };

        const remainingEdges: Edge[] = [
          {
            id: 'edge-2',
            source: 'image-2',
            target: 'controlnet-1',
            sourceHandle: 'output',
            targetHandle: 'input',
          },
        ];

        connectionHandler.handleConnectionRemoval(connection, nodes, remainingEdges);

        expect(mockCallbacks.onPreprocessedDataCleared).not.toHaveBeenCalled();
      });
    });
  });

  describe('Complete Preprocessing Workflow Integration', () => {
    it('should handle complete preprocessing workflow from connection to completion', async () => {
      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };
      mockRunwareService.preprocessForControlNet.mockResolvedValue(mockResult);

      const imageNode = createImageNode('image-1', 'https://example.com/input.jpg');
      const controlNetNode = createControlNetNode('controlnet-1', 'control-net-pose');
      const nodes = [imageNode, controlNetNode];

      // Step 1: Connection is made
      const connection = {
        source: { nodeId: 'image-1', handleId: 'output', nodeType: 'image-node' },
        target: { nodeId: 'controlnet-1', handleId: 'input', nodeType: 'control-net-pose' },
        connectionType: 'new' as const,
      };

      await connectionHandler.handleNewConnection(connection, nodes);

      // Step 2: Preprocessing is triggered
      expect(mockCallbacks.onPreprocessingTriggered).toHaveBeenCalledWith('controlnet-1');

      // Step 3: Actual preprocessing
      await preprocessingTrigger.triggerPreprocessing(imageNode, controlNetNode, nodes, []);

      // Step 4: Verify complete workflow
      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledWith(
        'https://example.com/input.jpg',
        'control-net-pose'
      );
      expect(mockCallbacks.onPreprocessingStarted).toHaveBeenCalledWith('controlnet-1');
      expect(mockCallbacks.onPreprocessingCompleted).toHaveBeenCalledWith(
        'controlnet-1',
        expect.objectContaining({
          guideImageURL: 'https://example.com/processed.jpg',
          preprocessor: 'openpose',
        })
      );
      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith(
        'controlnet-1',
        expect.objectContaining({
          hasPreprocessedImage: true,
          isPreprocessing: false,
        })
      );
    });

    it('should handle preprocessing errors gracefully', async () => {
      const error = new Error('API Error: Preprocessing failed');
      mockRunwareService.preprocessForControlNet.mockRejectedValue(error);

      const imageNode = createImageNode('image-1', 'https://example.com/input.jpg');
      const controlNetNode = createControlNetNode('controlnet-1', 'control-net-pose');

      await preprocessingTrigger.triggerPreprocessing(imageNode, controlNetNode, [imageNode, controlNetNode], []);

      expect(mockCallbacks.onPreprocessingFailed).toHaveBeenCalledWith(
        'controlnet-1',
        'API Error: Preprocessing failed'
      );
      expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith(
        'controlnet-1',
        expect.objectContaining({
          isPreprocessing: false,
          hasPreprocessedImage: false,
          preprocessedImage: undefined,
        })
      );
      expect(toast.error).toHaveBeenCalledWith('Failed to preprocess image: API Error: Preprocessing failed');
    });

    it('should handle multiple concurrent preprocessing operations', async () => {
      const mockResults = [
        { guideImageURL: 'https://example.com/processed1.jpg', preprocessor: 'openpose' },
        { guideImageURL: 'https://example.com/processed2.jpg', preprocessor: 'depth_midas' },
      ];

      mockRunwareService.preprocessForControlNet
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const imageNode1 = createImageNode('image-1', 'https://example.com/input1.jpg');
      const imageNode2 = createImageNode('image-2', 'https://example.com/input2.jpg');
      const controlNetNode1 = createControlNetNode('controlnet-1', 'control-net-pose');
      const controlNetNode2 = createControlNetNode('controlnet-2', 'control-net-depth');

      const nodes = [imageNode1, imageNode2, controlNetNode1, controlNetNode2];

      // Trigger both preprocessing operations concurrently
      const promises = [
        preprocessingTrigger.triggerPreprocessing(imageNode1, controlNetNode1, nodes, []),
        preprocessingTrigger.triggerPreprocessing(imageNode2, controlNetNode2, nodes, []),
      ];

      await Promise.all(promises);

      // Verify both operations completed successfully
      expect(mockCallbacks.onPreprocessingCompleted).toHaveBeenCalledTimes(2);
      expect(mockCallbacks.onPreprocessingCompleted).toHaveBeenCalledWith(
        'controlnet-1',
        expect.objectContaining({ preprocessor: 'openpose' })
      );
      expect(mockCallbacks.onPreprocessingCompleted).toHaveBeenCalledWith(
        'controlnet-2',
        expect.objectContaining({ preprocessor: 'depth_midas' })
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid image URLs gracefully', async () => {
      const imageNode = createImageNode('image-1', ''); // Empty URL
      const controlNetNode = createControlNetNode('controlnet-1', 'control-net-pose');

      await preprocessingTrigger.triggerPreprocessing(imageNode, controlNetNode, [imageNode, controlNetNode], []);

      expect(mockRunwareService.preprocessForControlNet).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Source node must have valid image data for ControlNet preprocessing');
    });

    it('should handle unknown ControlNet types', () => {
      expect(getPreprocessorForControlNet('unknown-controlnet-type')).toBe(null);
      expect(isControlNetNodeType('unknown-controlnet-type')).toBe(false);
      expect(requiresPreprocessing('unknown-controlnet-type')).toBe(false);
    });

    it('should handle missing nodes in connection detection', async () => {
      const connection = {
        source: { nodeId: 'missing-image', handleId: 'output', nodeType: 'image-node' },
        target: { nodeId: 'missing-controlnet', handleId: 'input', nodeType: 'control-net-pose' },
        connectionType: 'new' as const,
      };

      // Empty nodes array
      await connectionHandler.handleNewConnection(connection, []);

      expect(mockCallbacks.onPreprocessingTriggered).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Memory Considerations', () => {
    it('should create unique timestamps for different preprocessing operations', () => {
      const data1 = createPreprocessedImageData('url1', 'openpose');
      const data2 = createPreprocessedImageData('url2', 'depth_midas');

      expect(data2.timestamp).toBeGreaterThanOrEqual(data1.timestamp);
    });

    it('should handle rapid connection changes without conflicts', async () => {
      const imageNode = createImageNode('image-1', 'https://example.com/input.jpg');
      const controlNetNode = createControlNetNode('controlnet-1', 'control-net-pose');
      const nodes = [imageNode, controlNetNode];

      const connection = {
        source: { nodeId: 'image-1', handleId: 'output', nodeType: 'image-node' },
        target: { nodeId: 'controlnet-1', handleId: 'input', nodeType: 'control-net-pose' },
        connectionType: 'new' as const,
      };

      // Simulate rapid connection changes
      const promises = Array(5).fill(null).map(() => 
        connectionHandler.handleNewConnection(connection, nodes)
      );

      await Promise.all(promises);

      // Should handle all requests without errors
      expect(mockCallbacks.onPreprocessingTriggered).toHaveBeenCalledTimes(5);
    });
  });
});