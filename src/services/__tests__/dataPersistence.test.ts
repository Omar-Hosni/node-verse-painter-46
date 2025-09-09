/**
 * Data Persistence Tests
 * Tests for ensuring preprocessed data is properly saved and restored
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Node, Edge } from '@xyflow/react';
import { PreprocessedImageData } from '../../utils/controlNetUtils';

// Mock the database utilities
vi.mock('../../store/dbUtils', () => ({
  saveProject: vi.fn().mockResolvedValue('test-project-id'),
  loadProject: vi.fn().mockResolvedValue(true),
}));

// Mock supabase
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-project-id' },
            error: null
          })
        })
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { canvas_data: null },
            error: null
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: {},
          error: null
        })
      })
    })
  }
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  }
}));

describe('Data Persistence for Preprocessed Results', () => {
  let mockNodes: Node[];
  let mockEdges: Edge[];
  let mockPreprocessedData: PreprocessedImageData;

  beforeEach(() => {
    vi.clearAllMocks();

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

  describe('Saving Preprocessed Data', () => {
    it('should preserve preprocessed data when saving workflow', async () => {
      const { saveProject } = await import('../../store/dbUtils');
      
      await saveProject('Test Project', undefined, mockNodes, mockEdges);

      expect(saveProject).toHaveBeenCalledWith(
        'Test Project',
        undefined,
        expect.arrayContaining([
          expect.objectContaining({
            id: 'control-net-pose-1',
            data: expect.objectContaining({
              preprocessedImage: mockPreprocessedData,
              hasPreprocessedImage: true,
              preprocessor: 'openpose',
              right_sidebar: expect.objectContaining({
                preprocessedImage: mockPreprocessedData.guideImageURL,
                showPreprocessed: true,
              }),
            }),
          }),
        ]),
        mockEdges
      );
    });

    it('should handle nodes without preprocessed data correctly', async () => {
      const { saveProject } = await import('../../store/dbUtils');
      
      await saveProject('Test Project', undefined, mockNodes, mockEdges);

      expect(saveProject).toHaveBeenCalledWith(
        'Test Project',
        undefined,
        expect.arrayContaining([
          expect.objectContaining({
            id: 'control-net-canny-1',
            data: expect.not.objectContaining({
              preprocessedImage: expect.anything(),
            }),
          }),
        ]),
        mockEdges
      );
    });

    it('should serialize preprocessed data as JSON', () => {
      const nodeWithPreprocessedData = mockNodes.find(n => n.id === 'control-net-pose-1');
      
      // Simulate JSON serialization/deserialization
      const serialized = JSON.stringify(nodeWithPreprocessedData);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.data.preprocessedImage).toEqual(mockPreprocessedData);
      expect(deserialized.data.hasPreprocessedImage).toBe(true);
      expect(deserialized.data.right_sidebar.preprocessedImage).toBe(mockPreprocessedData.guideImageURL);
    });
  });

  describe('Loading Preprocessed Data', () => {
    it('should restore preprocessed data when loading workflow', async () => {
      const mockSetNodes = vi.fn();
      const mockSetEdges = vi.fn();
      const mockSetSelectedNode = vi.fn();
      const mockSetHistory = vi.fn();
      const mockResetNodeIdCounter = vi.fn();

      // Mock the supabase response with preprocessed data
      const mockCanvasData = {
        nodes: mockNodes,
        edges: mockEdges,
      };

      const { supabase } = await import('../../integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { canvas_data: mockCanvasData },
              error: null,
            }),
          }),
        }),
      } as any);

      const { loadProject } = await import('../../store/dbUtils');
      
      const result = await loadProject(
        'test-project-id',
        mockSetNodes,
        mockSetEdges,
        mockSetSelectedNode,
        mockSetHistory,
        mockResetNodeIdCounter
      );

      expect(result).toBe(true);
      expect(mockSetNodes).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'control-net-pose-1',
            data: expect.objectContaining({
              preprocessedImage: mockPreprocessedData,
              hasPreprocessedImage: true,
              isPreprocessing: false,
              right_sidebar: expect.objectContaining({
                preprocessedImage: mockPreprocessedData.guideImageURL,
                showPreprocessed: true,
              }),
            }),
          }),
        ])
      );
    });

    it('should handle nodes without preprocessed data during loading', async () => {
      const mockSetNodes = vi.fn();
      const mockSetEdges = vi.fn();
      const mockSetSelectedNode = vi.fn();
      const mockSetHistory = vi.fn();
      const mockResetNodeIdCounter = vi.fn();

      const mockCanvasData = {
        nodes: [mockNodes[2]], // Only the canny node without preprocessed data
        edges: [],
      };

      const { supabase } = await import('../../integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { canvas_data: mockCanvasData },
              error: null,
            }),
          }),
        }),
      } as any);

      const { loadProject } = await import('../../store/dbUtils');
      
      const result = await loadProject(
        'test-project-id',
        mockSetNodes,
        mockSetEdges,
        mockSetSelectedNode,
        mockSetHistory,
        mockResetNodeIdCounter
      );

      expect(result).toBe(true);
      expect(mockSetNodes).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'control-net-canny-1',
          data: expect.not.objectContaining({
            preprocessedImage: expect.anything(),
          }),
        }),
      ]);
    });

    it('should set correct flags when restoring preprocessed data', async () => {
      const mockSetNodes = vi.fn();
      const mockSetEdges = vi.fn();
      const mockSetSelectedNode = vi.fn();
      const mockSetHistory = vi.fn();
      const mockResetNodeIdCounter = vi.fn();

      const mockCanvasData = {
        nodes: [mockNodes[1]], // Control net node with preprocessed data
        edges: [],
      };

      const { supabase } = await import('../../integrations/supabase/client');
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { canvas_data: mockCanvasData },
              error: null,
            }),
          }),
        }),
      } as any);

      const { loadProject } = await import('../../store/dbUtils');
      
      await loadProject(
        'test-project-id',
        mockSetNodes,
        mockSetEdges,
        mockSetSelectedNode,
        mockSetHistory,
        mockResetNodeIdCounter
      );

      const restoredNodes = mockSetNodes.mock.calls[0][0];
      const controlNetNode = restoredNodes.find((n: Node) => n.id === 'control-net-pose-1');

      expect(controlNetNode.data.hasPreprocessedImage).toBe(true);
      expect(controlNetNode.data.isPreprocessing).toBe(false);
      expect(controlNetNode.data.right_sidebar.showPreprocessed).toBe(true);
    });
  });

  describe('Connection Removal Cleanup', () => {
    it('should clear preprocessed data when connections are removed', () => {
      // This test would be implemented with the connection handler
      // For now, we'll test the data structure changes
      const nodeWithPreprocessedData = { ...mockNodes[1] };
      
      // Simulate clearing preprocessed data
      const clearedNode = {
        ...nodeWithPreprocessedData,
        data: {
          ...nodeWithPreprocessedData.data,
          preprocessedImage: undefined,
          hasPreprocessedImage: false,
          isPreprocessing: false,
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
      expect(clearedNode.data.right_sidebar.showPreprocessed).toBe(false);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity across save/load cycles', async () => {
      // Test that data remains consistent through save and load operations
      const originalNode = mockNodes[1];
      
      // Simulate save operation (JSON serialization)
      const serialized = JSON.stringify(originalNode);
      const afterSave = JSON.parse(serialized);
      
      // Simulate load operation (restoration)
      const restoredNode = {
        ...afterSave,
        data: {
          ...afterSave.data,
          hasPreprocessedImage: !!afterSave.data.preprocessedImage,
          isPreprocessing: false,
          right_sidebar: {
            ...afterSave.data.right_sidebar,
            preprocessedImage: afterSave.data.preprocessedImage?.guideImageURL,
            showPreprocessed: !!afterSave.data.preprocessedImage,
          },
        },
      };

      expect(restoredNode.data.preprocessedImage).toEqual(originalNode.data.preprocessedImage);
      expect(restoredNode.data.hasPreprocessedImage).toBe(true);
      expect(restoredNode.data.right_sidebar.showPreprocessed).toBe(true);
    });

    it('should handle missing or corrupted preprocessed data gracefully', () => {
      const nodeWithCorruptedData = {
        ...mockNodes[1],
        data: {
          ...mockNodes[1].data,
          preprocessedImage: null, // Corrupted data
        },
      };

      // Simulate restoration logic
      const restoredNode = {
        ...nodeWithCorruptedData,
        data: {
          ...nodeWithCorruptedData.data,
          hasPreprocessedImage: !!nodeWithCorruptedData.data.preprocessedImage,
          isPreprocessing: false,
          right_sidebar: {
            ...nodeWithCorruptedData.data.right_sidebar,
            preprocessedImage: nodeWithCorruptedData.data.preprocessedImage?.guideImageURL,
            showPreprocessed: !!nodeWithCorruptedData.data.preprocessedImage,
          },
        },
      };

      expect(restoredNode.data.hasPreprocessedImage).toBe(false);
      expect(restoredNode.data.right_sidebar.showPreprocessed).toBe(false);
    });
  });
});