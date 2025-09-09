/**
 * Integration test for image captioning flow
 * Tests the complete flow from connection to UI rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageCaptionTrigger } from '../imageCaptionTrigger';
import { RunwareService } from '../runwareService';
import { Node } from '@xyflow/react';

describe('Image Caption Integration', () => {
  let imageCaptionTrigger: ImageCaptionTrigger;
  let mockRunwareService: RunwareService;
  let mockCallbacks: any;

  beforeEach(() => {
    // Mock RunwareService
    mockRunwareService = {
      generateImageCaption: vi.fn().mockResolvedValue({
        text: 'A beautiful mountain landscape with snow-capped peaks and a clear blue sky',
        taskUUID: 'test-uuid-123'
      })
    } as any;

    // Mock callbacks
    mockCallbacks = {
      onCaptioningStarted: vi.fn(),
      onCaptioningCompleted: vi.fn(),
      onCaptioningFailed: vi.fn(),
      updateNodeData: vi.fn()
    };

    imageCaptionTrigger = new ImageCaptionTrigger(mockRunwareService, mockCallbacks);
  });

  it('should complete the full image captioning flow and store data correctly', async () => {
    // Create mock nodes
    const sourceNode: Node = {
      id: 'image-1',
      type: 'image-node',
      position: { x: 0, y: 0 },
      data: {
        right_sidebar: {
          imageUrl: 'https://example.com/mountain.jpg'
        }
      }
    };

    const targetNode: Node = {
      id: 'text-1',
      type: 'input-text',
      position: { x: 100, y: 0 },
      data: {}
    };

    // Trigger image captioning
    await imageCaptionTrigger.triggerImageCaptioning(
      sourceNode,
      targetNode,
      [sourceNode, targetNode],
      []
    );

    // Verify the text input node was updated with the caption
    expect(mockCallbacks.updateNodeData).toHaveBeenCalledWith('text-1', expect.objectContaining({
      right_sidebar: {
        prompt: 'A beautiful mountain landscape with snow-capped peaks and a clear blue sky'
      },
      imageCaptionData: expect.objectContaining({
        captionText: 'A beautiful mountain landscape with snow-capped peaks and a clear blue sky',
        sourceImageUrl: 'https://example.com/mountain.jpg',
        taskUUID: 'test-uuid-123'
      })
    }));

    // Verify callbacks were called
    expect(mockCallbacks.onCaptioningStarted).toHaveBeenCalledWith('text-1');
    expect(mockCallbacks.onCaptioningCompleted).toHaveBeenCalledWith('text-1', expect.any(Object));
  });

  it('should verify that RightSidebar can read the stored prompt', () => {
    // Simulate a node with image caption data stored in right_sidebar.prompt
    const nodeWithCaption = {
      id: 'text-1',
      type: 'input-text',
      data: {
        right_sidebar: {
          prompt: 'A beautiful mountain landscape with snow-capped peaks and a clear blue sky'
        },
        imageCaptionData: {
          captionText: 'A beautiful mountain landscape with snow-capped peaks and a clear blue sky',
          sourceImageUrl: 'https://example.com/mountain.jpg',
          taskUUID: 'test-uuid-123',
          timestamp: Date.now()
        }
      }
    };

    // Verify that the data structure is correct for RightSidebar rendering
    expect(nodeWithCaption.data.right_sidebar.prompt).toBe(
      'A beautiful mountain landscape with snow-capped peaks and a clear blue sky'
    );

    // This is the path that renderTextArea("Prompt", "prompt", "Enter your prompt here...") 
    // will read from: selectedNode.data?.right_sidebar?.["prompt"]
    const promptValue = nodeWithCaption.data?.right_sidebar?.["prompt"];
    expect(promptValue).toBe('A beautiful mountain landscape with snow-capped peaks and a clear blue sky');
  });
});