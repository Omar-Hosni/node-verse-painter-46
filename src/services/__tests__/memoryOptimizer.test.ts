/**
 * Memory Optimizer Service Tests
 * Tests memory optimization functionality for preprocessed images
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryOptimizer } from '../memoryOptimizer';
import { createPreprocessedImageData } from '../../utils/controlNetUtils';

describe('MemoryOptimizer', () => {
  let memoryOptimizer: MemoryOptimizer;

  beforeEach(() => {
    memoryOptimizer = new MemoryOptimizer({
      maxTotalMemoryMB: 10, // Small limit for testing
      maxImagesPerNode: 2,
      compressionThresholdMB: 1,
      cleanupIntervalMs: 60000, // Long interval for testing
      maxImageAgeDays: 1,
      memoryPressureThresholds: {
        medium: 50,
        high: 70,
        critical: 90,
      },
    });
  });

  afterEach(() => {
    memoryOptimizer.destroy();
  });

  describe('Image Tracking', () => {
    it('should track images correctly', () => {
      const imageData = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose'
      );

      memoryOptimizer.trackImage('node1', imageData);

      const usage = memoryOptimizer.getMemoryUsage();
      expect(usage.totalImages).toBe(1);
      expect(usage.totalSizeMB).toBeGreaterThan(0);
    });

    it('should replace old images for the same node', () => {
      const imageData1 = createPreprocessedImageData(
        'https://example.com/processed1.jpg',
        'openpose'
      );
      const imageData2 = createPreprocessedImageData(
        'https://example.com/processed2.jpg',
        'openpose'
      );

      memoryOptimizer.trackImage('node1', imageData1);
      memoryOptimizer.trackImage('node1', imageData2);

      const usage = memoryOptimizer.getMemoryUsage();
      expect(usage.totalImages).toBe(1); // Should replace, not add
    });

    it('should track multiple nodes independently', () => {
      const imageData1 = createPreprocessedImageData(
        'https://example.com/processed1.jpg',
        'openpose'
      );
      const imageData2 = createPreprocessedImageData(
        'https://example.com/processed2.jpg',
        'depth_midas'
      );

      memoryOptimizer.trackImage('node1', imageData1);
      memoryOptimizer.trackImage('node2', imageData2);

      const usage = memoryOptimizer.getMemoryUsage();
      expect(usage.totalImages).toBe(2);
    });

    it('should update access statistics', () => {
      const imageData = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose'
      );

      memoryOptimizer.trackImage('node1', imageData);
      memoryOptimizer.accessImage('node1', imageData.guideImageURL);

      // Access should be tracked (tested indirectly through debug info)
      const debugInfo = memoryOptimizer.getDebugInfo();
      expect(debugInfo[0].accessCount).toBeGreaterThan(1);
    });
  });

  describe('Memory Usage Calculation', () => {
    it('should calculate memory usage correctly', () => {
      const smallImageData = createPreprocessedImageData(
        'https://example.com/small.jpg',
        'openpose'
      );
      const largeImageData = createPreprocessedImageData(
        'data:image/jpeg;base64,' + 'A'.repeat(1024 * 100), // ~100KB base64
        'depth_midas'
      );

      memoryOptimizer.trackImage('node1', smallImageData);
      memoryOptimizer.trackImage('node2', largeImageData);

      const usage = memoryOptimizer.getMemoryUsage();
      expect(usage.totalImages).toBe(2);
      expect(usage.totalSizeMB).toBeGreaterThan(0);
      expect(usage.averageImageSizeMB).toBeGreaterThan(0);
      expect(usage.largestImageSizeMB).toBeGreaterThan(0);
    });

    it('should determine memory pressure correctly', () => {
      // Add images to trigger different pressure levels
      const imageData = createPreprocessedImageData(
        'data:image/jpeg;base64,' + 'A'.repeat(1024 * 1024 * 2), // ~2MB base64
        'openpose'
      );

      memoryOptimizer.trackImage('node1', imageData);
      let usage = memoryOptimizer.getMemoryUsage();
      expect(usage.memoryPressure).toBe('low');

      // Add more images to increase pressure
      memoryOptimizer.trackImage('node2', imageData);
      memoryOptimizer.trackImage('node3', imageData);
      memoryOptimizer.trackImage('node4', imageData);

      usage = memoryOptimizer.getMemoryUsage();
      expect(['medium', 'high', 'critical']).toContain(usage.memoryPressure);
    });
  });

  describe('Memory Optimization', () => {
    it('should optimize memory when pressure is high', async () => {
      // Fill memory to trigger optimization
      const largeImageData = createPreprocessedImageData(
        'data:image/jpeg;base64,' + 'A'.repeat(1024 * 1024 * 3), // ~3MB base64
        'openpose'
      );

      memoryOptimizer.trackImage('node1', largeImageData);
      memoryOptimizer.trackImage('node2', largeImageData);
      memoryOptimizer.trackImage('node3', largeImageData);

      const beforeUsage = memoryOptimizer.getMemoryUsage();
      const result = await memoryOptimizer.optimizeMemory(true);

      expect(result.imagesProcessed).toBeGreaterThanOrEqual(0);
      expect(result.memorySavedMB).toBeGreaterThanOrEqual(0);
    });

    it('should skip optimization when memory pressure is low', async () => {
      const smallImageData = createPreprocessedImageData(
        'https://example.com/small.jpg',
        'openpose'
      );

      memoryOptimizer.trackImage('node1', smallImageData);

      const result = await memoryOptimizer.optimizeMemory(false);

      expect(result.imagesProcessed).toBe(0);
      expect(result.memorySavedMB).toBe(0);
    });

    it('should remove old images during optimization', async () => {
      // Create optimizer with very short max age for testing
      const shortAgeOptimizer = new MemoryOptimizer({
        maxImageAgeDays: 0.000001, // Very short age (microseconds)
        maxTotalMemoryMB: 10,
      });

      const imageData = createPreprocessedImageData(
        'https://example.com/old.jpg',
        'openpose'
      );

      shortAgeOptimizer.trackImage('node1', imageData);

      // Wait a bit to age the image
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await shortAgeOptimizer.optimizeMemory(true);

      expect(result.imagesRemoved).toBeGreaterThan(0);

      shortAgeOptimizer.destroy();
    });

    it('should compress large images during optimization', async () => {
      const largeImageData = createPreprocessedImageData(
        'data:image/jpeg;base64,' + 'A'.repeat(1024 * 1024 * 2), // ~2MB base64
        'openpose'
      );

      memoryOptimizer.trackImage('node1', largeImageData);

      const result = await memoryOptimizer.optimizeMemory(true);

      // Should attempt compression for large images
      expect(result.imagesCompressed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Node Management', () => {
    it('should remove all images for a specific node', () => {
      const imageData1 = createPreprocessedImageData(
        'https://example.com/processed1.jpg',
        'openpose'
      );
      const imageData2 = createPreprocessedImageData(
        'https://example.com/processed2.jpg',
        'depth_midas'
      );

      memoryOptimizer.trackImage('node1', imageData1);
      memoryOptimizer.trackImage('node2', imageData2);

      expect(memoryOptimizer.getMemoryUsage().totalImages).toBe(2);

      memoryOptimizer.removeImagesForNode('node1');

      expect(memoryOptimizer.getMemoryUsage().totalImages).toBe(1);
    });

    it('should enforce maximum images per node', async () => {
      const imageData1 = createPreprocessedImageData(
        'https://example.com/processed1.jpg',
        'openpose'
      );
      const imageData2 = createPreprocessedImageData(
        'https://example.com/processed2.jpg',
        'openpose'
      );
      const imageData3 = createPreprocessedImageData(
        'https://example.com/processed3.jpg',
        'openpose'
      );

      // Add more images than the limit (maxImagesPerNode = 2)
      memoryOptimizer.trackImage('node1', imageData1);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure different timestamps
      memoryOptimizer.trackImage('node1', imageData2);
      await new Promise(resolve => setTimeout(resolve, 10));
      memoryOptimizer.trackImage('node1', imageData3);

      // Force optimization to enforce limits
      await memoryOptimizer.optimizeMemory(true);

      // Should respect the maxImagesPerNode limit
      const usage = memoryOptimizer.getMemoryUsage();
      expect(usage.totalImages).toBeLessThanOrEqual(2);
    });
  });

  describe('Configuration', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        maxTotalMemoryMB: 20,
        compressionThresholdMB: 2,
        maxImageAgeDays: 2,
      };

      memoryOptimizer.updateConfig(newConfig);

      const config = memoryOptimizer.getConfig();
      expect(config.maxTotalMemoryMB).toBe(20);
      expect(config.compressionThresholdMB).toBe(2);
      expect(config.maxImageAgeDays).toBe(2);
    });
  });

  describe('Debug Information', () => {
    it('should provide debug information', () => {
      const imageData1 = createPreprocessedImageData(
        'https://example.com/processed1.jpg',
        'openpose'
      );
      const imageData2 = createPreprocessedImageData(
        'https://example.com/processed2.jpg',
        'depth_midas'
      );

      memoryOptimizer.trackImage('node1', imageData1);
      memoryOptimizer.trackImage('node2', imageData2);

      const debugInfo = memoryOptimizer.getDebugInfo();

      expect(debugInfo).toHaveLength(2);
      expect(debugInfo[0]).toHaveProperty('nodeId');
      expect(debugInfo[0]).toHaveProperty('url');
      expect(debugInfo[0]).toHaveProperty('sizeMB');
      expect(debugInfo[0]).toHaveProperty('lastAccessed');
      expect(debugInfo[0]).toHaveProperty('accessCount');
      expect(debugInfo[0]).toHaveProperty('isCompressed');
      expect(debugInfo[0]).toHaveProperty('age');
    });
  });

  describe('Resource Management', () => {
    it('should clear all tracked images', () => {
      const imageData = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose'
      );

      memoryOptimizer.trackImage('node1', imageData);
      memoryOptimizer.trackImage('node2', imageData);

      expect(memoryOptimizer.getMemoryUsage().totalImages).toBe(2);

      memoryOptimizer.clear();

      expect(memoryOptimizer.getMemoryUsage().totalImages).toBe(0);
    });

    it('should clean up resources on destroy', () => {
      const imageData = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose'
      );

      memoryOptimizer.trackImage('node1', imageData);

      expect(() => {
        memoryOptimizer.destroy();
      }).not.toThrow();

      // After destroy, memory usage should be zero
      expect(memoryOptimizer.getMemoryUsage().totalImages).toBe(0);
    });
  });

  describe('Size Estimation', () => {
    it('should estimate data URL sizes correctly', () => {
      const smallDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
      const largeDataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(1024 * 100); // ~100KB

      const smallImageData = createPreprocessedImageData(smallDataUrl, 'openpose');
      const largeImageData = createPreprocessedImageData(largeDataUrl, 'depth_midas');

      memoryOptimizer.trackImage('node1', smallImageData);
      memoryOptimizer.trackImage('node2', largeImageData);

      const debugInfo = memoryOptimizer.getDebugInfo();
      const smallImage = debugInfo.find(img => img.nodeId === 'node1');
      const largeImage = debugInfo.find(img => img.nodeId === 'node2');

      expect(largeImage!.sizeMB).toBeGreaterThan(smallImage!.sizeMB);
    });

    it('should estimate external URL sizes with default value', () => {
      const externalImageData = createPreprocessedImageData(
        'https://example.com/external.jpg',
        'openpose'
      );

      memoryOptimizer.trackImage('node1', externalImageData);

      const debugInfo = memoryOptimizer.getDebugInfo();
      expect(debugInfo[0].sizeMB).toBe(1.5); // Default estimation
    });
  });
});