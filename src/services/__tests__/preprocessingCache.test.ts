/**
 * Preprocessing Cache Service Tests
 * Tests caching functionality for preprocessed images
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PreprocessingCache } from '../preprocessingCache';
import { createPreprocessedImageData } from '../../utils/controlNetUtils';

describe('PreprocessingCache', () => {
  let cache: PreprocessingCache;

  beforeEach(() => {
    cache = new PreprocessingCache({
      maxEntries: 5,
      maxMemoryMB: 10,
      ttlMs: 60000, // 1 minute for testing
      cleanupIntervalMs: 5000, // 5 seconds for testing
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Caching', () => {
    it('should store and retrieve cached data', () => {
      const imageUrl = 'https://example.com/image.jpg';
      const preprocessor = 'openpose';
      const data = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        preprocessor
      );

      cache.set(imageUrl, preprocessor, data);
      const retrieved = cache.get(imageUrl, preprocessor);

      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent cache entries', () => {
      const result = cache.get('nonexistent.jpg', 'openpose');
      expect(result).toBeNull();
    });

    it('should check if cache has entry', () => {
      const imageUrl = 'https://example.com/image.jpg';
      const preprocessor = 'openpose';
      const data = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        preprocessor
      );

      expect(cache.has(imageUrl, preprocessor)).toBe(false);

      cache.set(imageUrl, preprocessor, data);

      expect(cache.has(imageUrl, preprocessor)).toBe(true);
    });
  });

  describe('Cache Eviction', () => {
    it('should evict LRU entries when max entries exceeded', () => {
      // Fill cache to capacity
      for (let i = 0; i < 5; i++) {
        const data = createPreprocessedImageData(
          `https://example.com/processed${i}.jpg`,
          'openpose'
        );
        cache.set(`image${i}.jpg`, 'openpose', data);
      }

      // Add one more entry (should evict the first one)
      const newData = createPreprocessedImageData(
        'https://example.com/processed5.jpg',
        'openpose'
      );
      cache.set('image5.jpg', 'openpose', newData);

      // First entry should be evicted
      expect(cache.get('image0.jpg', 'openpose')).toBeNull();
      // Last entry should still be there
      expect(cache.get('image5.jpg', 'openpose')).toEqual(newData);
    });

    it('should evict entries when memory limit exceeded', () => {
      // Create large data URL to simulate large image
      const largeDataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(1024 * 1024 * 3); // ~3MB base64
      const data = createPreprocessedImageData(largeDataUrl, 'openpose');

      // This should trigger memory-based eviction
      cache.set('large1.jpg', 'openpose', data);
      cache.set('large2.jpg', 'openpose', data);
      cache.set('large3.jpg', 'openpose', data);
      cache.set('large4.jpg', 'openpose', data); // Should evict earlier entries

      const stats = cache.getStats();
      expect(stats.totalMemoryMB).toBeLessThanOrEqual(10); // Should respect memory limit
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      // Create cache with very short TTL for testing
      const shortTtlCache = new PreprocessingCache({
        ttlMs: 100, // 100ms
      });

      const imageUrl = 'https://example.com/image.jpg';
      const preprocessor = 'openpose';
      const data = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        preprocessor
      );

      shortTtlCache.set(imageUrl, preprocessor, data);
      expect(shortTtlCache.get(imageUrl, preprocessor)).toEqual(data);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(shortTtlCache.get(imageUrl, preprocessor)).toBeNull();
      shortTtlCache.destroy();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics correctly', () => {
      const imageUrl1 = 'https://example.com/image1.jpg';
      const imageUrl2 = 'https://example.com/image2.jpg';
      const preprocessor = 'openpose';
      
      const data1 = createPreprocessedImageData(
        'https://example.com/processed1.jpg',
        preprocessor
      );
      const data2 = createPreprocessedImageData(
        'https://example.com/processed2.jpg',
        preprocessor
      );

      // Add entries
      cache.set(imageUrl1, preprocessor, data1);
      cache.set(imageUrl2, preprocessor, data2);

      // Access entries to generate hits/misses
      cache.get(imageUrl1, preprocessor); // Hit
      cache.get(imageUrl2, preprocessor); // Hit
      cache.get('nonexistent.jpg', preprocessor); // Miss

      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(66.67); // 2/3 * 100, rounded
      expect(stats.missRate).toBe(33.33); // 1/3 * 100, rounded
      expect(stats.totalMemoryMB).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear all cache entries', () => {
      const data = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose'
      );

      cache.set('image1.jpg', 'openpose', data);
      cache.set('image2.jpg', 'depth_midas', data);

      expect(cache.getStats().totalEntries).toBe(2);

      cache.clear();

      expect(cache.getStats().totalEntries).toBe(0);
    });

    it('should remove specific cache entries', () => {
      const data = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose'
      );

      cache.set('image1.jpg', 'openpose', data);
      cache.set('image2.jpg', 'openpose', data);

      expect(cache.getStats().totalEntries).toBe(2);

      cache.remove('image1.jpg', 'openpose');

      expect(cache.getStats().totalEntries).toBe(1);
      expect(cache.get('image1.jpg', 'openpose')).toBeNull();
      expect(cache.get('image2.jpg', 'openpose')).toEqual(data);
    });

    it('should perform maintenance correctly', () => {
      const data = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose'
      );

      // Add some entries
      cache.set('image1.jpg', 'openpose', data);
      cache.set('image2.jpg', 'openpose', data);

      const beforeStats = cache.getStats();
      
      // Perform maintenance
      cache.performMaintenance();

      const afterStats = cache.getStats();

      // Maintenance should not remove valid entries
      expect(afterStats.totalEntries).toBe(beforeStats.totalEntries);
    });
  });

  describe('Configuration', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        maxEntries: 20,
        maxMemoryMB: 20,
        ttlMs: 120000,
      };

      cache.updateConfig(newConfig);

      const config = cache.getConfig();
      expect(config.maxEntries).toBe(20);
      expect(config.maxMemoryMB).toBe(20);
      expect(config.ttlMs).toBe(120000);
    });
  });

  describe('Debug Information', () => {
    it('should provide debug information', () => {
      const data = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        'openpose'
      );

      cache.set('image1.jpg', 'openpose', data);
      cache.set('image2.jpg', 'depth_midas', data);

      const debugInfo = cache.getDebugInfo();

      expect(debugInfo).toHaveLength(2);
      expect(debugInfo[0]).toHaveProperty('key');
      expect(debugInfo[0]).toHaveProperty('preprocessor');
      expect(debugInfo[0]).toHaveProperty('accessCount');
      expect(debugInfo[0]).toHaveProperty('lastAccessed');
      expect(debugInfo[0]).toHaveProperty('size');
      expect(debugInfo[0]).toHaveProperty('age');
    });
  });

  describe('Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const imageUrl = 'https://example.com/image.jpg';
      const preprocessor = 'openpose';
      const data = createPreprocessedImageData(
        'https://example.com/processed.jpg',
        preprocessor
      );

      // Set and get multiple times
      cache.set(imageUrl, preprocessor, data);
      const result1 = cache.get(imageUrl, preprocessor);
      const result2 = cache.get(imageUrl, preprocessor);

      expect(result1).toEqual(data);
      expect(result2).toEqual(data);
      expect(result1).toEqual(result2);
    });

    it('should generate different keys for different parameters', () => {
      const imageUrl = 'https://example.com/image.jpg';
      const data1 = createPreprocessedImageData(
        'https://example.com/processed1.jpg',
        'openpose'
      );
      const data2 = createPreprocessedImageData(
        'https://example.com/processed2.jpg',
        'depth_midas'
      );

      cache.set(imageUrl, 'openpose', data1);
      cache.set(imageUrl, 'depth_midas', data2);

      expect(cache.get(imageUrl, 'openpose')).toEqual(data1);
      expect(cache.get(imageUrl, 'depth_midas')).toEqual(data2);
      expect(cache.getStats().totalEntries).toBe(2);
    });
  });
});