/**
 * Integration tests for ConnectionHandler with WorkflowStore
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Node, Edge } from '@xyflow/react';
import { ConnectionHandler } from '../connectionHandler';

describe('ConnectionHandler Integration', () => {
  let connectionHandler: ConnectionHandler;
  let mockPreprocessingCallback: ReturnType<typeof vi.fn>;
  let mockClearDataCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPreprocessingCallback = vi.fn();
    mockClearDataCallback = vi.fn();
    
    connectionHandler = new ConnectionHandler({
      onPreprocessingTriggered: mockPreprocessingCallback,
      onPreprocessedDataCleared: mockClearDataCallback,
    });
  });

  describe('workflow integration scenarios', () => {
    it('should handle complete workflow connection scenario', async () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'https://example.com/test-image.jpg' },
        },
        {
          id: 'controlnet-pose',
          type: 'control-net-pose',
          position: { x: 200, y: 0 },
          data: {},
        },
        {
          id: 'controlnet-depth',
          type: 'control-net-depth',
          position: { x: 200, y: 100 },
          data: {},
        },
      ];

      // Initial state - no connections
      const initialEdges: Edge[] = [];

      // Add connection to pose ControlNet
      const edgesWithPoseConnection: Edge[] = [
        {
          id: 'edge-1',
          source: 'image-1',
          target: 'controlnet-pose',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ];

      // Detect connection changes
      await connectionHandler.detectConnectionChanges(
        initialEdges,
        edgesWithPoseConnection,
        nodes
      );

      expect(mockPreprocessingCallback).toHaveBeenCalledWith('controlnet-pose');
      expect(mockPreprocessingCallback).toHaveBeenCalledTimes(1);

      // Add second connection to depth ControlNet
      const edgesWithBothConnections: Edge[] = [
        ...edgesWithPoseConnection,
        {
          id: 'edge-2',
          source: 'image-1',
          target: 'controlnet-depth',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ];

      await connectionHandler.detectConnectionChanges(
        edgesWithPoseConnection,
        edgesWithBothConnections,
        nodes
      );

      expect(mockPreprocessingCallback).toHaveBeenCalledWith('controlnet-depth');
      expect(mockPreprocessingCallback).toHaveBeenCalledTimes(2);

      // Remove pose connection
      const edgesWithOnlyDepth: Edge[] = [
        {
          id: 'edge-2',
          source: 'image-1',
          target: 'controlnet-depth',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ];

      await connectionHandler.detectConnectionChanges(
        edgesWithBothConnections,
        edgesWithOnlyDepth,
        nodes
      );

      expect(mockClearDataCallback).toHaveBeenCalledWith('controlnet-pose');
      expect(mockClearDataCallback).toHaveBeenCalledTimes(1);

      // Remove all connections
      await connectionHandler.detectConnectionChanges(
        edgesWithOnlyDepth,
        [],
        nodes
      );

      expect(mockClearDataCallback).toHaveBeenCalledWith('controlnet-depth');
      expect(mockClearDataCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple image sources to single ControlNet', async () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'https://example.com/image1.jpg' },
        },
        {
          id: 'image-2',
          type: 'image-node',
          position: { x: 0, y: 100 },
          data: { imageUrl: 'https://example.com/image2.jpg' },
        },
        {
          id: 'controlnet-1',
          type: 'control-net-pose',
          position: { x: 200, y: 50 },
          data: {},
        },
      ];

      // Connect first image
      const edgesWithFirstImage: Edge[] = [
        {
          id: 'edge-1',
          source: 'image-1',
          target: 'controlnet-1',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ];

      await connectionHandler.detectConnectionChanges(
        [],
        edgesWithFirstImage,
        nodes
      );

      expect(mockPreprocessingCallback).toHaveBeenCalledWith('controlnet-1');

      // Connect second image (should trigger preprocessing again)
      const edgesWithBothImages: Edge[] = [
        ...edgesWithFirstImage,
        {
          id: 'edge-2',
          source: 'image-2',
          target: 'controlnet-1',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ];

      await connectionHandler.detectConnectionChanges(
        edgesWithFirstImage,
        edgesWithBothImages,
        nodes
      );

      expect(mockPreprocessingCallback).toHaveBeenCalledTimes(2);

      // Remove first image connection (should NOT clear data as second image still connected)
      const edgesWithSecondImageOnly: Edge[] = [
        {
          id: 'edge-2',
          source: 'image-2',
          target: 'controlnet-1',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ];

      await connectionHandler.detectConnectionChanges(
        edgesWithBothImages,
        edgesWithSecondImageOnly,
        nodes
      );

      expect(mockClearDataCallback).not.toHaveBeenCalled();

      // Remove second image connection (should clear data now)
      await connectionHandler.detectConnectionChanges(
        edgesWithSecondImageOnly,
        [],
        nodes
      );

      expect(mockClearDataCallback).toHaveBeenCalledWith('controlnet-1');
    });

    it('should handle mixed node types correctly', async () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'https://example.com/image.jpg' },
        },
        {
          id: 'text-1',
          type: 'input-text',
          position: { x: 0, y: 100 },
          data: { prompt: 'test prompt' },
        },
        {
          id: 'controlnet-1',
          type: 'control-net-pose',
          position: { x: 200, y: 0 },
          data: {},
        },
        {
          id: 'light-1',
          type: 'seed-image-lights',
          position: { x: 200, y: 100 },
          data: {},
        },
      ];

      const edges: Edge[] = [
        // Image to ControlNet (should trigger preprocessing)
        {
          id: 'edge-1',
          source: 'image-1',
          target: 'controlnet-1',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
        // Text to ControlNet (should NOT trigger preprocessing)
        {
          id: 'edge-2',
          source: 'text-1',
          target: 'controlnet-1',
          sourceHandle: 'output',
          targetHandle: 'text-input',
        },
        // Image to light ControlNet (should NOT trigger preprocessing)
        {
          id: 'edge-3',
          source: 'image-1',
          target: 'light-1',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ];

      await connectionHandler.detectConnectionChanges([], edges, nodes);

      // Only the image-to-ControlNet connection should trigger preprocessing
      expect(mockPreprocessingCallback).toHaveBeenCalledWith('controlnet-1');
      expect(mockPreprocessingCallback).toHaveBeenCalledTimes(1);
      expect(mockPreprocessingCallback).not.toHaveBeenCalledWith('light-1');
    });
  });
});