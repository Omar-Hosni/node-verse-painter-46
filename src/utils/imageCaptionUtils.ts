// @ts-nocheck
/**
 * Image Caption Utilities
 * Helper functions for image-to-text functionality
 */

import { Node } from '@xyflow/react';

/**
 * Check if a node is a text input node that supports image captioning
 */
export function isTextInputNode(nodeType: string): boolean {
  return nodeType === 'textInput' || nodeType.includes('input-text');
}

/**
 * Check if a node is a text input node (checking both type and data.type)
 */
export function isTextInputNodeFromNode(node: Node): boolean {
  const nodeType = node.type || '';
  const dataType = node.data?.type || '';
  return isTextInputNode(nodeType) || isTextInputNode(dataType);
}

/**
 * Check if a node requires image captioning preprocessing
 */
export function requiresImageCaptioning(nodeType: string): boolean {
  return isTextInputNode(nodeType);
}

/**
 * Check if a node has valid image data for captioning
 */
export function hasValidImageDataForCaptioning(node: Node): boolean {
  if (!node.data) return false;

  // Check for various image data sources
  const imageUrl = node.data.imageUrl || 
                  node.data.generatedImage || 
                  node.data.image ||
                  node.data.src ||
                  node.data.url ||
                  node.data.imageURL ||
                  node.data.right_sidebar?.imageUrl ||
                  node.data.right_sidebar?.image ||
                  node.data.right_sidebar?.imageURL ||
                  node.data.image_url;

  return typeof imageUrl === 'string' && imageUrl.length > 0;
}

/**
 * Extract image URL from a node for captioning
 */
export function extractImageUrlForCaptioning(node: Node): string | null {
  if (!node.data) return null;

  const imageUrl = node.data.imageUrl || 
                  node.data.generatedImage || 
                  node.data.image ||
                  node.data.src ||
                  node.data.url ||
                  node.data.imageURL ||
                  node.data.right_sidebar?.imageUrl ||
                  node.data.right_sidebar?.image ||
                  node.data.right_sidebar?.imageURL ||
                  node.data.image_url;

  return typeof imageUrl === 'string' && imageUrl.length > 0 ? imageUrl : null;
}

/**
 * Create image caption data structure
 */
export interface ImageCaptionData {
  captionText: string;
  sourceImageUrl: string;
  timestamp: number;
  taskUUID: string;
}

/**
 * Create processed image caption data
 */
export function createImageCaptionData(
  captionText: string,
  sourceImageUrl: string,
  taskUUID: string
): ImageCaptionData {
  return {
    captionText,
    sourceImageUrl,
    timestamp: Date.now(),
    taskUUID
  };
}