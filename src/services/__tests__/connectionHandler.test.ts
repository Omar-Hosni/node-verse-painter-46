/**
 * Unit tests for ConnectionHandler service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Node, Edge } from '@xyflow/react';
import { ConnectionHandler, ConnectionEvent } from '../connectionHandler';

describe('ConnectionHandler', () => {
  let connectionHandler: ConnectionHandler;
  let mockCallbacks: {
    onPreprocessingTriggered: ReturnType<typeof vi.fn>;
    onPreprocessedDataCleared: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCallbacks = {
      onPreprocessingTriggered: vi.fn(),
      onPreprocessedDataCleared: vi.fn(),
    };
    connectionHandler = new ConnectionHandler(mockCallbacks);
  });

  describe('handleNewConnection', () => {
    it('should trigger preprocessing for image-to-ControlNet connections', async () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'test-image.jpg' },
        },
        {
          id: 'controlnet-1',
          type: 'control-net-pose',
          position: { x: 100, y: 0 },
          data: {},
        },
      ];

      const connection: ConnectionEvent = {
        source: {
          nodeId: 'image-1',
          handleId: 'output',
          nodeType: 'image-node',
        },
        target: {
          nodeId: 'controlnet-1',
          handleId: 'input',
          nodeType: 'control-net-pose',
        },
        connectionType: 'new',
      };

      await connectionHandler.handleNewConnection(connection, nodes);

      expect(mockCallbacks.onPreprocessingTriggered).toHaveBeenCalledWith('controlnet-1');
    });

    it('should not trigger preprocessing for non-image-to-ControlNet connections', async () => {
      const nodes: Node[] = [
        {
          id: 'text-1',
          type: 'input-text',
          position: { x: 0, y: 0 },
          data: { prompt: 'test' },
        },
        {
          id: 'controlnet-1',
          type: 'control-net-pose',
          position: { x: 100, y: 0 },
          data: {},
        },
      ];

      const connection: ConnectionEvent = {
        source: {
          nodeId: 'text-1',
          handleId: 'output',
          nodeType: 'input-text',
        },
        target: {
          nodeId: 'controlnet-1',
          handleId: 'input',
          nodeType: 'control-net-pose',
        },
        connectionType: 'new',
      };

      await connectionHandler.handleNewConnection(connection, nodes);

      expect(mockCallbacks.onPreprocessingTriggered).not.toHaveBeenCalled();
    });

    it('should not trigger preprocessing for light ControlNet nodes', async () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'test-image.jpg' },
        },
        {
          id: 'light-1',
          type: 'seed-image-lights',
          position: { x: 100, y: 0 },
          data: {},
        },
      ];

      const connection: ConnectionEvent = {
        source: {
          nodeId: 'image-1',
          handleId: 'output',
          nodeType: 'image-node',
        },
        target: {
          nodeId: 'light-1',
          handleId: 'input',
          nodeType: 'seed-image-lights',
        },
        connectionType: 'new',
      };

      await connectionHandler.handleNewConnection(connection, nodes);

      expect(mockCallbacks.onPreprocessingTriggered).not.toHaveBeenCalled();
    });

    it('should not trigger preprocessing if source node has no valid image data', async () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: {}, // No image data
        },
        {
          id: 'controlnet-1',
          type: 'control-net-pose',
          position: { x: 100, y: 0 },
          data: {},
        },
      ];

      const connection: ConnectionEvent = {
        source: {
          nodeId: 'image-1',
          handleId: 'output',
          nodeType: 'image-node',
        },
        target: {
          nodeId: 'controlnet-1',
          handleId: 'input',
          nodeType: 'control-net-pose',
        },
        connectionType: 'new',
      };

      await connectionHandler.handleNewConnection(connection, nodes);

      expect(mockCallbacks.onPreprocessingTriggered).not.toHaveBeenCalled();
    });
  });

  describe('handleConnectionRemoval', () => {
    it('should clear preprocessed data when ControlNet node loses all image connections', () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'test-image.jpg' },
        },
        {
          id: 'controlnet-1',
          type: 'control-net-pose',
          position: { x: 100, y: 0 },
          data: {},
        },
      ];

      const remainingEdges: Edge[] = []; // No remaining edges

      const connection: ConnectionEvent = {
        source: {
          nodeId: 'image-1',
          handleId: 'output',
          nodeType: 'image-node',
        },
        target: {
          nodeId: 'controlnet-1',
          handleId: 'input',
          nodeType: 'control-net-pose',
        },
        connectionType: 'removed',
      };

      connectionHandler.handleConnectionRemoval(connection, nodes, remainingEdges);

      expect(mockCallbacks.onPreprocessedDataCleared).toHaveBeenCalledWith('controlnet-1');
    });

    it('should not clear preprocessed data when ControlNet node still has other image connections', () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'test-image.jpg' },
        },
        {
          id: 'image-2',
          type: 'image-node',
          position: { x: 0, y: 50 },
          data: { imageUrl: 'test-image2.jpg' },
        },
        {
          id: 'controlnet-1',
          type: 'control-net-pose',
          position: { x: 100, y: 0 },
          data: {},
        },
      ];

      const remainingEdges: Edge[] = [
        {
          id: 'edge-2',
          source: 'image-2',
          target: 'controlnet-1',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ];

      const connection: ConnectionEvent = {
        source: {
          nodeId: 'image-1',
          handleId: 'output',
          nodeType: 'image-node',
        },
        target: {
          nodeId: 'controlnet-1',
          handleId: 'input',
          nodeType: 'control-net-pose',
        },
        connectionType: 'removed',
      };

      connectionHandler.handleConnectionRemoval(connection, nodes, remainingEdges);

      expect(mockCallbacks.onPreprocessedDataCleared).not.toHaveBeenCalled();
    });
  });

  describe('detectConnectionChanges', () => {
    it('should detect new connections and handle them', async () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'test-image.jpg' },
        },
        {
          id: 'controlnet-1',
          type: 'control-net-pose',
          position: { x: 100, y: 0 },
          data: {},
        },
      ];

      const previousEdges: Edge[] = [];
      const currentEdges: Edge[] = [
        {
          id: 'edge-1',
          source: 'image-1',
          target: 'controlnet-1',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ];

      await connectionHandler.detectConnectionChanges(previousEdges, currentEdges, nodes);

      expect(mockCallbacks.onPreprocessingTriggered).toHaveBeenCalledWith('controlnet-1');
    });

    it('should detect removed connections and handle them', async () => {
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'test-image.jpg' },
        },
        {
          id: 'controlnet-1',
          type: 'control-net-pose',
          position: { x: 100, y: 0 },
          data: {},
        },
      ];

      const previousEdges: Edge[] = [
        {
          id: 'edge-1',
          source: 'image-1',
          target: 'controlnet-1',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ];
      const currentEdges: Edge[] = [];

      await connectionHandler.detectConnectionChanges(previousEdges, currentEdges, nodes);

      expect(mockCallbacks.onPreprocessedDataCleared).toHaveBeenCalledWith('controlnet-1');
    });
  });

  describe('updateCallbacks', () => {
    it('should update callbacks correctly', () => {
      const newCallbacks = {
        onPreprocessingTriggered: vi.fn(),
      };

      connectionHandler.updateCallbacks(newCallbacks);

      // Test that the new callback is used
      const nodes: Node[] = [
        {
          id: 'image-1',
          type: 'image-node',
          position: { x: 0, y: 0 },
          data: { imageUrl: 'test-image.jpg' },
        },
        {
          id: 'controlnet-1',
          type: 'control-net-pose',
          position: { x: 100, y: 0 },
          data: {},
        },
      ];

      const connection: ConnectionEvent = {
        source: {
          nodeId: 'image-1',
          handleId: 'output',
          nodeType: 'image-node',
        },
        target: {
          nodeId: 'controlnet-1',
          handleId: 'input',
          nodeType: 'control-net-pose',
        },
        connectionType: 'new',
      };

      connectionHandler.handleNewConnection(connection, nodes);

      expect(newCallbacks.onPreprocessingTriggered).toHaveBeenCalledWith('controlnet-1');
      expect(mockCallbacks.onPreprocessingTriggered).not.toHaveBeenCalled();
    });
  });
});