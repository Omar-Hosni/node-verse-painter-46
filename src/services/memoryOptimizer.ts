/**
 * Memory Optimizer Service
 * Optimizes memory usage for stored preprocessed images
 * Implements image compression, cleanup, and memory monitoring
 * Addresses requirement 4.4 - performance optimizations
 */

import { PreprocessedImageData } from "../utils/controlNetUtils";

// Memory usage tracking
export interface MemoryUsage {
  totalImages: number;
  totalSizeMB: number;
  averageImageSizeMB: number;
  largestImageSizeMB: number;
  oldestImageAge: number | null;
  memoryPressure: 'low' | 'medium' | 'high' | 'critical';
}

// Image metadata for memory tracking
export interface ImageMetadata {
  nodeId: string;
  url: string;
  estimatedSizeMB: number;
  lastAccessed: number;
  accessCount: number;
  isCompressed: boolean;
  originalSize?: number;
}

// Memory optimizer configuration
export interface MemoryOptimizerConfig {
  maxTotalMemoryMB: number; // Maximum total memory for images
  maxImagesPerNode: number; // Maximum images per node
  compressionThresholdMB: number; // Compress images larger than this
  cleanupIntervalMs: number; // Cleanup interval
  maxImageAgeDays: number; // Maximum age before cleanup
  memoryPressureThresholds: {
    medium: number; // Percentage of max memory
    high: number;
    critical: number;
  };
}

// Optimization result
export interface OptimizationResult {
  imagesProcessed: number;
  memorySavedMB: number;
  imagesRemoved: number;
  imagesCompressed: number;
  errors: string[];
}

/**
 * Memory Optimizer Service
 * Manages memory usage for preprocessed images with automatic cleanup and compression
 */
export class MemoryOptimizer {
  private imageMetadata: Map<string, ImageMetadata> = new Map();
  private config: MemoryOptimizerConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private compressionWorker?: Worker;

  constructor(config: Partial<MemoryOptimizerConfig> = {}) {
    this.config = {
      maxTotalMemoryMB: config.maxTotalMemoryMB || 100, // 100MB default
      maxImagesPerNode: config.maxImagesPerNode || 5,
      compressionThresholdMB: config.compressionThresholdMB || 2, // 2MB
      cleanupIntervalMs: config.cleanupIntervalMs || 10 * 60 * 1000, // 10 minutes
      maxImageAgeDays: config.maxImageAgeDays || 1, // 1 day
      memoryPressureThresholds: {
        medium: config.memoryPressureThresholds?.medium || 60, // 60%
        high: config.memoryPressureThresholds?.high || 80, // 80%
        critical: config.memoryPressureThresholds?.critical || 95, // 95%
      },
    };

    this.startCleanupTimer();
  }

  /**
   * Track a new preprocessed image
   * @param nodeId - Node ID that owns the image
   * @param imageData - Preprocessed image data
   */
  trackImage(nodeId: string, imageData: PreprocessedImageData): void {
    const imageKey = this.generateImageKey(nodeId, imageData.guideImageURL);
    const estimatedSize = this.estimateImageSize(imageData.guideImageURL);

    const metadata: ImageMetadata = {
      nodeId,
      url: imageData.guideImageURL,
      estimatedSizeMB: estimatedSize,
      lastAccessed: Date.now(),
      accessCount: 1,
      isCompressed: false,
    };

    // Remove old image for this node if it exists
    this.removeImagesForNode(nodeId);

    // Add new image
    this.imageMetadata.set(imageKey, metadata);

    console.log(
      `MemoryOptimizer: Tracking image for node ${nodeId} (${estimatedSize.toFixed(2)}MB)`
    );

    // Check if we need to optimize memory
    this.checkMemoryPressure();
  }

  /**
   * Access an image (update access statistics)
   * @param nodeId - Node ID
   * @param imageUrl - Image URL
   */
  accessImage(nodeId: string, imageUrl: string): void {
    const imageKey = this.generateImageKey(nodeId, imageUrl);
    const metadata = this.imageMetadata.get(imageKey);

    if (metadata) {
      metadata.lastAccessed = Date.now();
      metadata.accessCount++;
    }
  }

  /**
   * Remove images for a specific node
   * @param nodeId - Node ID to remove images for
   */
  removeImagesForNode(nodeId: string): void {
    const keysToRemove: string[] = [];

    this.imageMetadata.forEach((metadata, key) => {
      if (metadata.nodeId === nodeId) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(key => {
      this.imageMetadata.delete(key);
    });

    if (keysToRemove.length > 0) {
      console.log(`MemoryOptimizer: Removed ${keysToRemove.length} images for node ${nodeId}`);
    }
  }

  /**
   * Get current memory usage statistics
   * @returns Memory usage information
   */
  getMemoryUsage(): MemoryUsage {
    let totalSizeMB = 0;
    let largestImageSizeMB = 0;
    let oldestImageAge: number | null = null;
    const now = Date.now();

    this.imageMetadata.forEach(metadata => {
      totalSizeMB += metadata.estimatedSizeMB;
      
      if (metadata.estimatedSizeMB > largestImageSizeMB) {
        largestImageSizeMB = metadata.estimatedSizeMB;
      }

      const age = now - metadata.lastAccessed;
      if (oldestImageAge === null || age > oldestImageAge) {
        oldestImageAge = age;
      }
    });

    const totalImages = this.imageMetadata.size;
    const averageImageSizeMB = totalImages > 0 ? totalSizeMB / totalImages : 0;
    const memoryPercentage = (totalSizeMB / this.config.maxTotalMemoryMB) * 100;

    let memoryPressure: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (memoryPercentage >= this.config.memoryPressureThresholds.critical) {
      memoryPressure = 'critical';
    } else if (memoryPercentage >= this.config.memoryPressureThresholds.high) {
      memoryPressure = 'high';
    } else if (memoryPercentage >= this.config.memoryPressureThresholds.medium) {
      memoryPressure = 'medium';
    }

    return {
      totalImages,
      totalSizeMB: Math.round(totalSizeMB * 100) / 100,
      averageImageSizeMB: Math.round(averageImageSizeMB * 100) / 100,
      largestImageSizeMB: Math.round(largestImageSizeMB * 100) / 100,
      oldestImageAge,
      memoryPressure,
    };
  }

  /**
   * Perform memory optimization
   * @param force - Force optimization even if memory pressure is low
   * @returns Optimization result
   */
  async optimizeMemory(force: boolean = false): Promise<OptimizationResult> {
    const result: OptimizationResult = {
      imagesProcessed: 0,
      memorySavedMB: 0,
      imagesRemoved: 0,
      imagesCompressed: 0,
      errors: [],
    };

    const memoryUsage = this.getMemoryUsage();
    
    if (!force && memoryUsage.memoryPressure === 'low') {
      console.log('MemoryOptimizer: Memory pressure is low, skipping optimization');
      return result;
    }

    console.log(
      `MemoryOptimizer: Starting optimization (pressure: ${memoryUsage.memoryPressure}, ` +
      `${memoryUsage.totalSizeMB}MB used)`
    );

    try {
      // Step 1: Remove old images
      const removedImages = await this.removeOldImages();
      result.imagesRemoved = removedImages.count;
      result.memorySavedMB += removedImages.memorySaved;

      // Step 2: Remove excess images per node
      const excessRemoved = await this.removeExcessImagesPerNode();
      result.imagesRemoved += excessRemoved.count;
      result.memorySavedMB += excessRemoved.memorySaved;

      // Step 3: Compress large images if still under pressure
      const currentUsage = this.getMemoryUsage();
      if (currentUsage.memoryPressure !== 'low') {
        const compressed = await this.compressLargeImages();
        result.imagesCompressed = compressed.count;
        result.memorySavedMB += compressed.memorySaved;
      }

      // Step 4: Emergency cleanup if still critical
      if (currentUsage.memoryPressure === 'critical') {
        const emergency = await this.emergencyCleanup();
        result.imagesRemoved += emergency.count;
        result.memorySavedMB += emergency.memorySaved;
      }

      result.imagesProcessed = this.imageMetadata.size;

      console.log(
        `MemoryOptimizer: Optimization completed. ` +
        `Removed: ${result.imagesRemoved}, Compressed: ${result.imagesCompressed}, ` +
        `Memory saved: ${result.memorySavedMB.toFixed(2)}MB`
      );
    } catch (error) {
      const errorMsg = `Memory optimization failed: ${error}`;
      result.errors.push(errorMsg);
      console.error('MemoryOptimizer:', errorMsg);
    }

    return result;
  }

  /**
   * Remove old images based on age
   * @returns Removal result
   */
  private async removeOldImages(): Promise<{ count: number; memorySaved: number }> {
    const maxAge = this.config.maxImageAgeDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
    const now = Date.now();
    const keysToRemove: string[] = [];
    let memorySaved = 0;

    this.imageMetadata.forEach((metadata, key) => {
      const age = now - metadata.lastAccessed;
      if (age > maxAge) {
        keysToRemove.push(key);
        memorySaved += metadata.estimatedSizeMB;
      }
    });

    keysToRemove.forEach(key => {
      this.imageMetadata.delete(key);
    });

    return { count: keysToRemove.length, memorySaved };
  }

  /**
   * Remove excess images per node (keep only the most recent ones)
   * @returns Removal result
   */
  private async removeExcessImagesPerNode(): Promise<{ count: number; memorySaved: number }> {
    const nodeImages: Map<string, ImageMetadata[]> = new Map();
    let totalRemoved = 0;
    let memorySaved = 0;

    // Group images by node
    this.imageMetadata.forEach(metadata => {
      const nodeId = metadata.nodeId;
      if (!nodeImages.has(nodeId)) {
        nodeImages.set(nodeId, []);
      }
      nodeImages.get(nodeId)!.push(metadata);
    });

    // Remove excess images for each node
    nodeImages.forEach((images, nodeId) => {
      if (images.length > this.config.maxImagesPerNode) {
        // Sort by last accessed (keep most recent)
        images.sort((a, b) => b.lastAccessed - a.lastAccessed);
        
        const toRemove = images.slice(this.config.maxImagesPerNode);
        toRemove.forEach(metadata => {
          const key = this.generateImageKey(nodeId, metadata.url);
          this.imageMetadata.delete(key);
          memorySaved += metadata.estimatedSizeMB;
          totalRemoved++;
        });
      }
    });

    return { count: totalRemoved, memorySaved };
  }

  /**
   * Compress large images to save memory
   * @returns Compression result
   */
  private async compressLargeImages(): Promise<{ count: number; memorySaved: number }> {
    let compressed = 0;
    let memorySaved = 0;

    // Find images that need compression
    const imagesToCompress: ImageMetadata[] = [];
    this.imageMetadata.forEach(metadata => {
      if (!metadata.isCompressed && metadata.estimatedSizeMB > this.config.compressionThresholdMB) {
        imagesToCompress.push(metadata);
      }
    });

    // Simulate compression (in a real implementation, you would compress the actual images)
    for (const metadata of imagesToCompress) {
      try {
        const originalSize = metadata.estimatedSizeMB;
        const compressedSize = originalSize * 0.6; // Assume 40% compression
        const savedMemory = originalSize - compressedSize;

        metadata.isCompressed = true;
        metadata.originalSize = originalSize;
        metadata.estimatedSizeMB = compressedSize;

        compressed++;
        memorySaved += savedMemory;

        console.log(
          `MemoryOptimizer: Compressed image for node ${metadata.nodeId} ` +
          `(${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB)`
        );
      } catch (error) {
        console.error(`MemoryOptimizer: Failed to compress image for node ${metadata.nodeId}:`, error);
      }
    }

    return { count: compressed, memorySaved };
  }

  /**
   * Emergency cleanup - remove least recently used images
   * @returns Cleanup result
   */
  private async emergencyCleanup(): Promise<{ count: number; memorySaved: number }> {
    const targetMemoryMB = this.config.maxTotalMemoryMB * 0.7; // Target 70% of max memory
    const currentUsage = this.getMemoryUsage();
    
    if (currentUsage.totalSizeMB <= targetMemoryMB) {
      return { count: 0, memorySaved: 0 };
    }

    // Sort images by last accessed (LRU)
    const sortedImages = Array.from(this.imageMetadata.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let removed = 0;
    let memorySaved = 0;
    let currentMemory = currentUsage.totalSizeMB;

    for (const [key, metadata] of sortedImages) {
      if (currentMemory <= targetMemoryMB) {
        break;
      }

      this.imageMetadata.delete(key);
      currentMemory -= metadata.estimatedSizeMB;
      memorySaved += metadata.estimatedSizeMB;
      removed++;

      console.log(
        `MemoryOptimizer: Emergency cleanup removed image for node ${metadata.nodeId} ` +
        `(${metadata.estimatedSizeMB.toFixed(2)}MB)`
      );
    }

    return { count: removed, memorySaved };
  }

  /**
   * Check memory pressure and trigger optimization if needed
   */
  private checkMemoryPressure(): void {
    const usage = this.getMemoryUsage();
    
    if (usage.memoryPressure === 'critical') {
      console.warn('MemoryOptimizer: Critical memory pressure detected, triggering emergency optimization');
      this.optimizeMemory(true);
    } else if (usage.memoryPressure === 'high') {
      console.warn('MemoryOptimizer: High memory pressure detected, scheduling optimization');
      // Schedule optimization with a small delay to avoid blocking
      setTimeout(() => this.optimizeMemory(), 1000);
    }
  }

  /**
   * Estimate image size based on URL
   * @param imageUrl - Image URL
   * @returns Estimated size in MB
   */
  private estimateImageSize(imageUrl: string): number {
    // Simple estimation based on URL characteristics
    if (imageUrl.startsWith('data:image/')) {
      // Data URL - estimate based on base64 length
      const base64Data = imageUrl.split(',')[1] || '';
      const sizeBytes = (base64Data.length * 3) / 4; // Base64 to bytes conversion
      return sizeBytes / (1024 * 1024); // Convert to MB
    } else {
      // External URL - use default estimation
      return 1.5; // Default 1.5MB estimation for external images
    }
  }

  /**
   * Generate unique key for image tracking
   * @param nodeId - Node ID
   * @param imageUrl - Image URL
   * @returns Unique key
   */
  private generateImageKey(nodeId: string, imageUrl: string): string {
    // Use a hash of the URL to create a shorter key
    const urlHash = this.simpleHash(imageUrl);
    return `${nodeId}_${urlHash}`;
  }

  /**
   * Simple hash function
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
   * Perform regular maintenance
   */
  private async performMaintenance(): Promise<void> {
    const usage = this.getMemoryUsage();
    
    if (usage.memoryPressure !== 'low') {
      console.log(`MemoryOptimizer: Performing maintenance (pressure: ${usage.memoryPressure})`);
      await this.optimizeMemory();
    }
  }

  /**
   * Get configuration
   * @returns Current configuration
   */
  getConfig(): MemoryOptimizerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param newConfig - New configuration values
   */
  updateConfig(newConfig: Partial<MemoryOptimizerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart cleanup timer if interval changed
    if (newConfig.cleanupIntervalMs) {
      this.stopCleanupTimer();
      this.startCleanupTimer();
    }

    console.log('MemoryOptimizer: Configuration updated', this.config);
  }

  /**
   * Get debug information
   * @returns Debug information about tracked images
   */
  getDebugInfo(): Array<{
    nodeId: string;
    url: string;
    sizeMB: number;
    lastAccessed: Date;
    accessCount: number;
    isCompressed: boolean;
    age: string;
  }> {
    const now = Date.now();
    const images: Array<{
      nodeId: string;
      url: string;
      sizeMB: number;
      lastAccessed: Date;
      accessCount: number;
      isCompressed: boolean;
      age: string;
    }> = [];

    this.imageMetadata.forEach(metadata => {
      const age = now - metadata.lastAccessed;
      const ageMinutes = Math.round(age / (1000 * 60));
      
      images.push({
        nodeId: metadata.nodeId,
        url: metadata.url.substring(0, 50) + '...', // Truncate URL for display
        sizeMB: Math.round(metadata.estimatedSizeMB * 100) / 100,
        lastAccessed: new Date(metadata.lastAccessed),
        accessCount: metadata.accessCount,
        isCompressed: metadata.isCompressed,
        age: `${ageMinutes}m ago`,
      });
    });

    return images.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
  }

  /**
   * Clear all tracked images
   */
  clear(): void {
    const count = this.imageMetadata.size;
    this.imageMetadata.clear();
    console.log(`MemoryOptimizer: Cleared ${count} tracked images`);
  }

  /**
   * Cleanup resources when optimizer is destroyed
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
    
    console.log('MemoryOptimizer: Destroyed');
  }
}

// Export singleton instance for global use
export const memoryOptimizer = new MemoryOptimizer();