/**
 * Preprocessing Cache Service
 * Implements caching to avoid redundant preprocessing of same images
 * Provides memory optimization and cache management for preprocessed results
 * Addresses requirement 4.4 - performance optimizations
 */

import { PreprocessedImageData } from "../utils/controlNetUtils";

// Cache entry interface
export interface CacheEntry {
  key: string;
  data: PreprocessedImageData;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated memory size in bytes
}

// Cache configuration
export interface CacheConfig {
  maxEntries: number;
  maxMemoryMB: number;
  ttlMs: number; // Time to live in milliseconds
  cleanupIntervalMs: number;
}

// Cache statistics
export interface CacheStats {
  totalEntries: number;
  totalMemoryMB: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

/**
 * Preprocessing Cache Service
 * Implements LRU cache with memory management and TTL support
 */
export class PreprocessingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries || 100,
      maxMemoryMB: config.maxMemoryMB || 50, // 50MB default
      ttlMs: config.ttlMs || 30 * 60 * 1000, // 30 minutes default
      cleanupIntervalMs: config.cleanupIntervalMs || 5 * 60 * 1000, // 5 minutes
    };

    this.startCleanupTimer();
  }

  /**
   * Generate cache key from image URL and preprocessor
   * @param imageUrl - Source image URL
   * @param preprocessor - Preprocessor type
   * @returns Cache key string
   */
  private generateCacheKey(imageUrl: string, preprocessor: string): string {
    // Create a hash-like key from URL and preprocessor
    // Use a simple but effective approach for cache key generation
    const urlHash = this.simpleHash(imageUrl);
    return `${preprocessor}_${urlHash}`;
  }

  /**
   * Simple hash function for URL
   * @param str - String to hash
   * @returns Hash number
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Estimate memory size of preprocessed image data
   * @param data - Preprocessed image data
   * @returns Estimated size in bytes
   */
  private estimateSize(data: PreprocessedImageData): number {
    // Rough estimation based on URL length and metadata
    const urlSize = data.guideImageURL.length * 2; // UTF-16 encoding
    const preprocessorSize = data.preprocessor.length * 2;
    const sourceUUIDSize = (data.sourceImageUUID?.length || 0) * 2;
    const metadataSize = 64; // Timestamp and other metadata
    
    return urlSize + preprocessorSize + sourceUUIDSize + metadataSize;
  }

  /**
   * Get cached preprocessed data
   * @param imageUrl - Source image URL
   * @param preprocessor - Preprocessor type
   * @returns Cached data or null if not found
   */
  get(imageUrl: string, preprocessor: string): PreprocessedImageData | null {
    const key = this.generateCacheKey(imageUrl, preprocessor);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.lastAccessed > this.config.ttlMs) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    // Move to end (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Store preprocessed data in cache
   * @param imageUrl - Source image URL
   * @param preprocessor - Preprocessor type
   * @param data - Preprocessed image data
   */
  set(imageUrl: string, preprocessor: string, data: PreprocessedImageData): void {
    const key = this.generateCacheKey(imageUrl, preprocessor);
    const size = this.estimateSize(data);
    const now = Date.now();

    const entry: CacheEntry = {
      key,
      data,
      accessCount: 1,
      lastAccessed: now,
      size,
    };

    // Check if we need to make space
    this.ensureCapacity(size);

    // Store the entry
    this.cache.set(key, entry);

    console.log(`PreprocessingCache: Cached result for ${preprocessor} (${this.formatBytes(size)})`);
  }

  /**
   * Check if data exists in cache
   * @param imageUrl - Source image URL
   * @param preprocessor - Preprocessor type
   * @returns True if cached data exists and is valid
   */
  has(imageUrl: string, preprocessor: string): boolean {
    const key = this.generateCacheKey(imageUrl, preprocessor);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.lastAccessed > this.config.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Ensure cache has capacity for new entry
   * @param newEntrySize - Size of new entry in bytes
   */
  private ensureCapacity(newEntrySize: number): void {
    const maxMemoryBytes = this.config.maxMemoryMB * 1024 * 1024;
    
    // Remove expired entries first
    this.removeExpiredEntries();

    // Check memory usage
    let currentMemory = this.getCurrentMemoryUsage();
    
    // Remove LRU entries if needed
    while (
      (this.cache.size >= this.config.maxEntries || 
       currentMemory + newEntrySize > maxMemoryBytes) &&
      this.cache.size > 0
    ) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        const entry = this.cache.get(oldestKey);
        if (entry) {
          currentMemory -= entry.size;
        }
        this.cache.delete(oldestKey);
        console.log(`PreprocessingCache: Evicted LRU entry ${oldestKey}`);
      }
    }
  }

  /**
   * Get current memory usage in bytes
   * @returns Current memory usage
   */
  private getCurrentMemoryUsage(): number {
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += entry.size;
    });
    return totalSize;
  }

  /**
   * Remove expired entries from cache
   */
  private removeExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.lastAccessed > this.config.ttlMs) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log(`PreprocessingCache: Removed ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0;

    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    this.cache.forEach(entry => {
      if (oldestEntry === null || entry.lastAccessed < oldestEntry) {
        oldestEntry = entry.lastAccessed;
      }
      if (newestEntry === null || entry.lastAccessed > newestEntry) {
        newestEntry = entry.lastAccessed;
      }
    });

    return {
      totalEntries: this.cache.size,
      totalMemoryMB: this.getCurrentMemoryUsage() / (1024 * 1024),
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    const entriesCleared = this.cache.size;
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    console.log(`PreprocessingCache: Cleared ${entriesCleared} entries`);
  }

  /**
   * Remove specific entry from cache
   * @param imageUrl - Source image URL
   * @param preprocessor - Preprocessor type
   */
  remove(imageUrl: string, preprocessor: string): void {
    const key = this.generateCacheKey(imageUrl, preprocessor);
    if (this.cache.delete(key)) {
      console.log(`PreprocessingCache: Removed entry ${key}`);
    }
  }

  /**
   * Get cache configuration
   * @returns Current cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   * @param newConfig - New configuration values
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart cleanup timer if interval changed
    if (newConfig.cleanupIntervalMs) {
      this.stopCleanupTimer();
      this.startCleanupTimer();
    }

    // Ensure current cache fits new constraints
    this.ensureCapacity(0);
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performMaintenance();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Stop automatic cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Perform cache maintenance
   */
  performMaintenance(): void {
    const beforeStats = this.getStats();
    
    // Remove expired entries
    this.removeExpiredEntries();
    
    // Ensure memory constraints
    this.ensureCapacity(0);
    
    const afterStats = this.getStats();
    
    if (beforeStats.totalEntries !== afterStats.totalEntries) {
      console.log(
        `PreprocessingCache: Maintenance completed. ` +
        `Entries: ${beforeStats.totalEntries} → ${afterStats.totalEntries}, ` +
        `Memory: ${beforeStats.totalMemoryMB.toFixed(2)}MB → ${afterStats.totalMemoryMB.toFixed(2)}MB`
      );
    }
  }

  /**
   * Format bytes to human readable string
   * @param bytes - Number of bytes
   * @returns Formatted string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get cache entries for debugging
   * @returns Array of cache entries with metadata
   */
  getDebugInfo(): Array<{
    key: string;
    preprocessor: string;
    accessCount: number;
    lastAccessed: Date;
    size: string;
    age: string;
  }> {
    const now = Date.now();
    const entries: Array<{
      key: string;
      preprocessor: string;
      accessCount: number;
      lastAccessed: Date;
      size: string;
      age: string;
    }> = [];

    this.cache.forEach(entry => {
      const ageMs = now - entry.lastAccessed;
      const ageMinutes = Math.round(ageMs / (1000 * 60));
      
      entries.push({
        key: entry.key,
        preprocessor: entry.data.preprocessor,
        accessCount: entry.accessCount,
        lastAccessed: new Date(entry.lastAccessed),
        size: this.formatBytes(entry.size),
        age: `${ageMinutes}m ago`,
      });
    });

    return entries.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
  }

  /**
   * Cleanup resources when cache is destroyed
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }
}

// Export singleton instance for global use
export const preprocessingCache = new PreprocessingCache();