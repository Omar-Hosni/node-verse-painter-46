/**
 * ControlNet preprocessing utilities
 * Maps ControlNet node types to their corresponding preprocessors and provides utility functions
 */

// ControlNet node types that support preprocessing
export type ControlNetNodeType = 
  | 'control-net-pose'
  | 'control-net-depth' 
  | 'control-net-edge'
  | 'control-net-segments'
  | 'control-net-normal-map'
  | 'seed-image-lights';

// Preprocessor names supported by the Runware API - valid types only
export type PreprocessorName = 
  | 'openpose'
  | 'depth'
  | 'mlsd'
  | 'normalbae'
  | 'tile'
  | 'seg'
  | 'lineart'
  | 'lineart_anime'
  | 'shuffle'
  | 'scribble'
  | 'softedge'
  | 'canny'
  | null; // null for nodes that don't require preprocessing

// Interface for preprocessed image data
export interface PreprocessedImageData {
  guideImageURL: string;
  preprocessor: string;
  sourceImageUUID?: string;
  timestamp: number;
}

// Interface for preprocessing state
export interface PreprocessingState {
  nodeId: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  result?: PreprocessedImageData;
  error?: string;
}

// Mapping between ControlNet node types and their corresponding preprocessors
// Using only valid Runware API preprocessor types: canny, depth, mlsd, normalbae, openpose, tile, seg, lineart, lineart_anime, shuffle, scribble, softedge
export const CONTROLNET_PREPROCESSOR_MAP: Record<ControlNetNodeType, PreprocessorName> = {
  'control-net-pose': 'openpose',
  'control-net-depth': 'depth',
  'control-net-edge': 'canny', // Changed from 'lineart' to 'canny' for better edge detection
  'control-net-segments': 'seg',
  'control-net-normal-map': 'normalbae',
  'seed-image-lights': null, // Light ControlNet uses seed images directly, no preprocessing
};

// Alternative mapping for canny edge detection (if needed)
export const CANNY_PREPROCESSOR = 'canny';

/**
 * Get the preprocessor name for a given ControlNet node type
 * @param nodeType - The ControlNet node type
 * @returns The preprocessor name or null if no preprocessing is needed
 */
export function getPreprocessorForControlNet(nodeType: string): PreprocessorName {
  // Type guard to ensure we have a valid ControlNet node type
  if (isControlNetNodeType(nodeType)) {
    return CONTROLNET_PREPROCESSOR_MAP[nodeType];
  }
  
  // Return null for unknown or non-ControlNet node types
  return null;
}

/**
 * Check if a node type is a ControlNet node type that supports preprocessing
 * @param nodeType - The node type to check
 * @returns True if the node type is a ControlNet type
 */
export function isControlNetNodeType(nodeType: string): nodeType is ControlNetNodeType {
  return nodeType in CONTROLNET_PREPROCESSOR_MAP;
}

/**
 * Check if a ControlNet node type requires preprocessing
 * @param nodeType - The ControlNet node type
 * @returns True if preprocessing is required, false otherwise
 */
export function requiresPreprocessing(nodeType: string): boolean {
  const preprocessor = getPreprocessorForControlNet(nodeType);
  return preprocessor !== null;
}

/**
 * Get all supported ControlNet node types
 * @returns Array of all ControlNet node types
 */
export function getSupportedControlNetTypes(): ControlNetNodeType[] {
  return Object.keys(CONTROLNET_PREPROCESSOR_MAP) as ControlNetNodeType[];
}

/**
 * Get all available preprocessor names (excluding null)
 * @returns Array of preprocessor names
 */
export function getAvailablePreprocessors(): string[] {
  return Object.values(CONTROLNET_PREPROCESSOR_MAP)
    .filter((preprocessor): preprocessor is Exclude<PreprocessorName, null> => preprocessor !== null);
}

/**
 * Create a preprocessed image data object
 * @param guideImageURL - The URL of the preprocessed image
 * @param preprocessor - The preprocessor used
 * @param sourceImageUUID - Optional UUID of the source image
 * @returns PreprocessedImageData object
 */
export function createPreprocessedImageData(
  guideImageURL: string,
  preprocessor: string,
  sourceImageUUID?: string
): PreprocessedImageData {
  return {
    guideImageURL,
    preprocessor,
    sourceImageUUID,
    timestamp: Date.now(),
  };
}

/**
 * Check if a preprocessor name is valid
 * @param preprocessor - The preprocessor name to validate
 * @returns True if the preprocessor is valid, false otherwise
 */
export function isValidPreprocessor(preprocessor: string): boolean {
  const validPreprocessors = getAvailablePreprocessors();
  validPreprocessors.push(CANNY_PREPROCESSOR); // Include canny as valid
  return validPreprocessors.includes(preprocessor);
}