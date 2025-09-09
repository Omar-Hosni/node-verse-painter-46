/**
 * Integration tests for the complete ControlNet preprocessing system
 * Tests the interaction between all components: mapping, connection detection,
 * preprocessing trigger, state management, and data persistence
 * 
 * Requirements tested: 1.1, 1.2, 3.1-3.7, 4.1-4.4, 5.1-5.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Node, Edge } from '@xyflow/react';
import { ConnectionHandler } from '../services/connectionHandler';
import { PreprocessingTrigger } from '../services/preprocessingTrigger';
import { RunwareService } from '../services/runwareService';
import { PreprocessingStateManagerImpl } from '../store/preprocessingState';
import { 
  getPreprocessorForControlNet,
  createPreprocessedImageData,
  CONTROLNET_PREPROCESSOR_MAP
} from '../utils/controlNetUtils';
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

vi.mock('../services/runwareService');

describe('ControlNet Preprocessing - Full Integration Tests', () => {
  let connectionHandler: ConnectionHandler;
  let preprocessingTrigger: PreprocessingTrigger;
  let stateManager: PreprocessingStateManagerImpl;
  let mockRunwareService: vi.Mocked<RunwareService>;
  let mockWorkflowCallbacks: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRunwareService = {
      preprocessForControlNet: vi.fn(),
      getPreprocessorForControlNet: vi.fn(),
    } as any;

    mockWorkflowCallbacks = {
      onPreprocessingTriggered: vi.fn(),
      onPreprocessedDataCleared: vi.fn(),
      onPreprocessingStarted: vi.fn(),
      onPreprocessingCompleted: vi.fn(),
      onPreprocessingFailed: vi.fn(),
      updateNodeData: vi.fn(),
      saveWorkflow: vi.fn(),
      loadWorkflow: vi.fn(),
    };

    stateManager = new PreprocessingStateManagerImpl((nodeId, state) => {
      mockWorkflowCallbacks.onStateChange?.(nodeId, state);
    });

    connectionHandler = new ConnectionHandler(mockWorkflowCallbacks);
    preprocessingTrigger = new PreprocessingTrigger(mockRunwareService, mockWorkflowCallbacks);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('End-to-End Preprocessing Workflow', () => {
    const createTestWorkflow = () => {
      const imageNode: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: { imageUrl: 'https://example.com/input.jpg' },
      };

      const controlNetNode: Node = {
        id: 'controlnet-1',
        type: 'control-net-pose',
        position: { x: 200, y: 0 },
        data: {
          id: 'controlnet-1',
          type: 'control-net-pose',
          isPreprocessing: false,
          hasPreprocessedImage: false,
        },
      };

      const edge: Edge = {
        id: 'edge-1',
        source: 'image-1',
        target: 'controlnet-1',
        sourceHandle: 'output',
        targetHandle: 'input',
      };

      return { imageNode, controlNetNode, edge, nodes: [imageNode, controlNetNode] };
    };

    it('should complete full preprocessing workflow successfully', async () => {
      const { imageNode, controlNetNode, edge, nodes } = createTestWorkflow();
      
      const mockResult = {
        guideImageURL: 'https://example.com/processed-pose.jpg',
        preprocessor: 'openpose',
      };
      mockRunwareService.preprocessForControlNet.mockResolvedValue(mockResult);

      // Step 1: Detect new connection
      const connection = {
        source: { nodeId: 'image-1', handleId: 'output', nodeType: 'image-node' },
        target: { nodeId: 'controlnet-1', handleId: 'input', nodeType: 'control-net-pose' },
        connectionType: 'new' as const,
      };

      await connectionHandler.handleNewConnection(connection, nodes);

      // Step 2: Verify preprocessing was triggered
      expect(mockWorkflowCallbacks.onPreprocessingTriggered).toHaveBeenCalledWith('controlnet-1');

      // Step 3: Execute preprocessing
      await preprocessingTrigger.triggerPreprocessing(imageNode, controlNetNode, nodes, [edge]);

      // Step 4: Verify complete workflow
      expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledWith(
        'https://example.com/input.jpg',
        'control-net-pose'
      );

      expect(mockWorkflowCallbacks.onPreprocessingStarted).toHaveBeenCalledWith('controlnet-1');
      expect(mockWorkflowCallbacks.onPreprocessingCompleted).toHaveBeenCalledWith(
        'controlnet-1',
        expect.objectContaining({
          guideImageURL: 'https://example.com/processed-pose.jpg',
          preprocessor: 'openpose',
        })
      );

      expect(mockWorkflowCallbacks.updateNodeData).toHaveBeenCalledWith(
        'controlnet-1',
        expect.objectContaining({
          hasPreprocessedImage: true,
          isPreprocessing: false,
          preprocessedImage: expect.objectContaining({
            guideImageURL: 'https://example.com/processed-pose.jpg',
            preprocessor: 'openpose',
          }),
        })
      );

      expect(toast.success).toHaveBeenCalledWith('Image preprocessed successfully for control-net-pose');
    });

    it('should handle workflow with multiple ControlNet types', async () => {
      const imageNode: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: { imageUrl: 'https://example.com/input.jpg' },
      };

      const poseNode: Node = {
        id: 'controlnet-pose',
        type: 'control-net-pose',
        position: { x: 200, y: 0 },
        data: { id: 'controlnet-pose', type: 'control-net-pose' },
      };

      const depthNode: Node = {
        id: 'controlnet-depth',
        type: 'control-net-depth',
        position: { x: 200, y: 100 },
        data: { id: 'controlnet-depth', type: 'control-net-depth' },
      };

      const cannyNode: Node = {
        id: 'controlnet-canny',
        type: 'control-net-canny',
        position: { x: 200, y: 200 },
        data: { id: 'controlnet-canny', type: 'control-net-canny' },
      };

      const nodes = [imageNode, poseNode, depthNode, cannyNode];

      const mockResults = [
        { guideImageURL: 'https://example.com/pose.jpg', preprocessor: 'openpose' },
        { guideImageURL: 'https://example.com/depth.jpg', preprocessor: 'depth' },
        { guideImageURL: 'https://example.com/canny.jpg', preprocessor: 'canny' },
      ];

      mockRunwareService.preprocessForControlNet
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      // Process all connections
      const connections = [
        { target: poseNode, expectedPreprocessor: 'openpose' },
        { target: depthNode, expectedPreprocessor: 'depth' },
        { target: cannyNode, expectedPreprocessor: 'canny' },
      ];

      for (const { target, expectedPreprocessor } of connections) {
        await preprocessingTrigger.triggerPreprocessing(imageNode, target, nodes, []);
        
        expect(mockRunwareService.preprocessForControlNet).toHaveBeenCalledWith(
          'https://example.com/input.jpg',
          target.type
        );
      }

      expect(mockWorkflowCallbacks.onPreprocessingCompleted).toHaveBeenCalledTimes(3);
    });

    it('should handle light ControlNet node correctly (no preprocessing)', async () => {
      const imageNode: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: { imageUrl: 'https://example.com/input.jpg' },
      };

      const lightNode: Node = {
        id: 'light-1',
        type: 'seed-image-lights',
        position: { x: 200, y: 0 },
        data: { id: 'light-1', type: 'seed-image-lights' },
      };

      const connection = {
        source: { nodeId: 'image-1', handleId: 'output', nodeType: 'image-node' },
        target: { nodeId: 'light-1', handleId: 'input', nodeType: 'seed-image-lights' },
        connectionType: 'new' as const,
      };

      await connectionHandler.handleNewConnection(connection, [imageNode, lightNode]);

      // Should not trigger preprocessing for light nodes
      expect(mockWorkflowCallbacks.onPreprocessingTriggered).not.toHaveBeenCalled();
      expect(mockRunwareService.preprocessForControlNet).not.toHaveBeenCalled();
    });
  });

  describe('Workflow Persistence and Recovery', () => {
    it('should save and restore workflow with preprocessed data', async () => {
      const preprocessedData = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose',
        'source-123'
      );

      const workflowData = {
        nodes: [
          {
            id: 'image-1',
            type: 'image-node',
            position: { x: 0, y: 0 },
            data: { imageUrl: 'https://example.com/input.jpg' },
          },
          {
            id: 'controlnet-1',
            type: 'control-net-pose',
            position: { x: 200, y: 0 },
            data: {
              id: 'controlnet-1',
              type: 'control-net-pose',
              preprocessedImage: preprocessedData,
              isPreprocessing: false,
              hasPreprocessedImage: true,
              preprocessor: 'openpose',
            },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'image-1',
            target: 'controlnet-1',
            sourceHandle: 'output',
            targetHandle: 'input',
          },
        ],
      };

      // Simulate saving workflow
      const serialized = JSON.stringify(workflowData);
      mockWorkflowCallbacks.saveWorkflow.mockResolvedValue(serialized);

      // Simulate loading workflow
      const restored = JSON.parse(serialized);
      mockWorkflowCallbacks.loadWorkflow.mockResolvedValue(restored);

      // Verify data integrity after save/load cycle
      const restoredControlNetNode = restored.nodes.find((n: Node) => n.type === 'control-net-pose');
      expect(restoredControlNetNode.data.hasPreprocessedImage).toBe(true);
      expect(restoredControlNetNode.data.preprocessedImage.guideImageURL).toBe(preprocessedData.guideImageURL);
      expect(restoredControlNetNode.data.preprocessedImage.preprocessor).toBe(preprocessedData.preprocessor);
      expect(restoredControlNetNode.data.preprocessedImage.timestamp).toBe(preprocessedData.timestamp);
    });

    it('should handle workflow recovery after preprocessing errors', async () => {
      const { imageNode, controlNetNode, nodes } = createTestWorkflow();

      // Simulate preprocessing failure
      const error = new Error('Network error during preprocessing');
      mockRunwareService.preprocessForControlNet.mockRejectedValue(error);

      await preprocessingTrigger.triggerPreprocessing(imageNode, controlNetNode, nodes, []);

      // Verify error handling
      expect(mockWorkflowCallbacks.onPreprocessingFailed).toHaveBeenCalledWith(
        'controlnet-1',
        'Network error during preprocessing'
      );

      expect(mockWorkflowCallbacks.updateNodeData).toHaveBeenCalledWith(
        'controlnet-1',
        expect.objectContaining({
          isPreprocessing: false,
          hasPreprocessedImage: false,
          preprocessedImage: undefined,
        })
      );

      // Verify workflow can be saved even with failed preprocessing
      const workflowData = {
        nodes: [
          imageNode,
          {
            ...controlNetNode,
            data: {
              ...controlNetNode.data,
              isPreprocessing: false,
              hasPreprocessedImage: false,
            },
          },
        ],
      };

      const serialized = JSON.stringify(workflowData);
      const restored = JSON.parse(serialized);

      expect(restored.nodes[1].data.hasPreprocessedImage).toBe(false);
    });
  });

  describe('Connection Management and Data Cleanup', () => {
    it('should clean up preprocessed data when connections are removed', () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'https://example.com/input.jpg' },
        },
        {
          id: 'controlnet-1',
          type: 'control-net-pose',
          position: { x: 200, y: 0 },
          data: {
            id: 'controlnet-1',
            type: 'control-net-pose',
            preprocessedImage: createPreprocessedImageData(
              'https://example.com/processed.jpg',
              'openpose'
            ),
            hasPreprocessedImage: true,
          },
        },
      ];

      const connection = {
        source: { nodeId: 'image-1', handleId: 'output', nodeType: 'image-node' },
        target: { nodeId: 'controlnet-1', handleId: 'input', nodeType: 'control-net-pose' },
        connectionType: 'removed' as const,
      };

      const remainingEdges: Edge[] = []; // No remaining connections

      connectionHandler.handleConnectionRemoval(connection, nodes, remainingEdges);

      expect(mockWorkflowCallbacks.onPreprocessedDataCleared).toHaveBeenCalledWith('controlnet-1');
    });

    it('should handle multiple connection changes efficiently', async () => {
      const { imageNode, controlNetNode, nodes } = createTestWorkflow();

      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };
      mockRunwareService.preprocessForControlNet.mockResolvedValue(mockResult);

      const connection = {
        source: { nodeId: 'image-1', handleId: 'output', nodeType: 'image-node' },
        target: { nodeId: 'controlnet-1', handleId: 'input', nodeType: 'control-net-pose' },
        connectionType: 'new' as const,
      };

      // Simulate rapid connection changes
      const operations = [
        () => connectionHandler.handleNewConnection(connection, nodes),
        () => connectionHandler.handleConnectionRemoval(
          { ...connection, connectionType: 'removed' },
          nodes,
          []
        ),
        () => connectionHandler.handleNewConnection(connection, nodes),
      ];

      for (const operation of operations) {
        await operation();
      }

      // Should handle all operations without conflicts
      expect(mockWorkflowCallbacks.onPreprocessingTriggered).toHaveBeenCalledTimes(2);
      expect(mockWorkflowCallbacks.onPreprocessedDataCleared).toHaveBeenCalledTimes(1);
    });
  });

  describe('State Management Integration', () => {
    it('should coordinate state management across all components', async () => {
      const { imageNode, controlNetNode, nodes } = createTestWorkflow();

      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };
      mockRunwareService.preprocessForControlNet.mockResolvedValue(mockResult);

      // Track state changes
      const stateChanges: Array<{ nodeId: string; status: string }> = [];
      const stateChangeCallback = (nodeId: string, state: any) => {
        stateChanges.push({ nodeId, status: state.status });
      };

      const stateManagerWithTracking = new PreprocessingStateManagerImpl(stateChangeCallback);

      // Simulate state transitions
      stateManagerWithTracking.setProcessing('controlnet-1');
      await preprocessingTrigger.triggerPreprocessing(imageNode, controlNetNode, nodes, []);
      stateManagerWithTracking.setCompleted('controlnet-1', createPreprocessedImageData(
        mockResult.guideImageURL,
        mockResult.preprocessor
      ));

      // Verify state progression
      expect(stateChanges).toEqual([
        { nodeId: 'controlnet-1', status: 'processing' },
        { nodeId: 'controlnet-1', status: 'completed' },
      ]);

      // Verify final state
      const finalState = stateManagerWithTracking.getState('controlnet-1');
      expect(finalState.status).toBe('completed');
      expect(finalState.result?.guideImageURL).toBe(mockResult.guideImageURL);
    });

    it('should handle concurrent preprocessing operations with state management', async () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'https://example.com/input.jpg' },
        },
        {
          id: 'controlnet-1',
          type: 'control-net-pose',
          position: { x: 200, y: 0 },
          data: { id: 'controlnet-1', type: 'control-net-pose' },
        },
        {
          id: 'controlnet-2',
          type: 'control-net-depth',
          position: { x: 200, y: 100 },
          data: { id: 'controlnet-2', type: 'control-net-depth' },
        },
      ];

      const mockResults = [
        { guideImageURL: 'https://example.com/pose.jpg', preprocessor: 'openpose' },
        { guideImageURL: 'https://example.com/depth.jpg', preprocessor: 'depth' },
      ];

      mockRunwareService.preprocessForControlNet
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      // Start both operations concurrently
      stateManager.setProcessing('controlnet-1');
      stateManager.setProcessing('controlnet-2');

      const promises = [
        preprocessingTrigger.triggerPreprocessing(nodes[0], nodes[1], nodes, []),
        preprocessingTrigger.triggerPreprocessing(nodes[0], nodes[2], nodes, []),
      ];

      await Promise.all(promises);

      // Complete both operations
      stateManager.setCompleted('controlnet-1', createPreprocessedImageData(
        mockResults[0].guideImageURL,
        mockResults[0].preprocessor
      ));
      stateManager.setCompleted('controlnet-2', createPreprocessedImageData(
        mockResults[1].guideImageURL,
        mockResults[1].preprocessor
      ));

      // Verify both operations completed successfully
      expect(stateManager.hasResult('controlnet-1')).toBe(true);
      expect(stateManager.hasResult('controlnet-2')).toBe(true);
      expect(stateManager.getAllProcessingNodes()).toHaveLength(0);

      const stats = stateManager.getStats();
      expect(stats.completed).toBe(2);
      expect(stats.processing).toBe(0);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover gracefully from API failures', async () => {
      const { imageNode, controlNetNode, nodes } = createTestWorkflow();

      // First attempt fails
      const error = new Error('API temporarily unavailable');
      mockRunwareService.preprocessForControlNet.mockRejectedValueOnce(error);

      await preprocessingTrigger.triggerPreprocessing(imageNode, controlNetNode, nodes, []);

      expect(mockWorkflowCallbacks.onPreprocessingFailed).toHaveBeenCalledWith(
        'controlnet-1',
        'API temporarily unavailable'
      );

      // Second attempt succeeds
      const mockResult = {
        guideImageURL: 'https://example.com/processed.jpg',
        preprocessor: 'openpose',
      };
      mockRunwareService.preprocessForControlNet.mockResolvedValue(mockResult);

      await preprocessingTrigger.triggerPreprocessing(imageNode, controlNetNode, nodes, []);

      expect(mockWorkflowCallbacks.onPreprocessingCompleted).toHaveBeenCalledWith(
        'controlnet-1',
        expect.objectContaining({
          guideImageURL: 'https://example.com/processed.jpg',
          preprocessor: 'openpose',
        })
      );
    });

    it('should handle invalid node configurations gracefully', async () => {
      const invalidImageNode: Node = {
        id: 'image-1',
        type: 'image-node',
        position: { x: 0, y: 0 },
        data: {}, // No image URL
      };

      const controlNetNode: Node = {
        id: 'controlnet-1',
        type: 'control-net-pose',
        position: { x: 200, y: 0 },
        data: { id: 'controlnet-1', type: 'control-net-pose' },
      };

      await preprocessingTrigger.triggerPreprocessing(
        invalidImageNode,
        controlNetNode,
        [invalidImageNode, controlNetNode],
        []
      );

      expect(mockRunwareService.preprocessForControlNet).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        'Source node must have valid image data for ControlNet preprocessing'
      );
    });
  });
});