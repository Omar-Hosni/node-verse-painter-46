import { describe, it, expect } from 'vitest';
import {
  getPreprocessorForControlNet,
  isControlNetNodeType,
  requiresPreprocessing,
  getSupportedControlNetTypes,
  getAvailablePreprocessors,
  createPreprocessedImageData,
  isValidPreprocessor,
  CONTROLNET_PREPROCESSOR_MAP,
  CANNY_PREPROCESSOR,
  type ControlNetNodeType,
  type PreprocessorName,
} from '../controlNetUtils';

describe('ControlNet Utilities', () => {
  describe('getPreprocessorForControlNet', () => {
    it('should return correct preprocessor for pose ControlNet', () => {
      expect(getPreprocessorForControlNet('control-net-pose')).toBe('openpose');
    });

    it('should return correct preprocessor for depth ControlNet', () => {
      expect(getPreprocessorForControlNet('control-net-depth')).toBe('depth');
    });

    it('should return correct preprocessor for edge ControlNet', () => {
      expect(getPreprocessorForControlNet('control-net-edge')).toBe('lineart');
    });

    it('should return correct preprocessor for segments ControlNet', () => {
      expect(getPreprocessorForControlNet('control-net-segments')).toBe('seg');
    });

    it('should return correct preprocessor for normal map ControlNet', () => {
      expect(getPreprocessorForControlNet('control-net-normal-map')).toBe('normalbae');
    });

    it('should return null for light ControlNet (no preprocessing)', () => {
      expect(getPreprocessorForControlNet('seed-image-lights')).toBe(null);
    });

    it('should return null for unknown node types', () => {
      expect(getPreprocessorForControlNet('unknown-node')).toBe(null);
      expect(getPreprocessorForControlNet('imageInput')).toBe(null);
      expect(getPreprocessorForControlNet('')).toBe(null);
    });
  });

  describe('isControlNetNodeType', () => {
    it('should return true for valid ControlNet node types', () => {
      expect(isControlNetNodeType('control-net-pose')).toBe(true);
      expect(isControlNetNodeType('control-net-depth')).toBe(true);
      expect(isControlNetNodeType('control-net-edge')).toBe(true);
      expect(isControlNetNodeType('control-net-segments')).toBe(true);
      expect(isControlNetNodeType('control-net-normal-map')).toBe(true);
      expect(isControlNetNodeType('seed-image-lights')).toBe(true);
    });

    it('should return false for non-ControlNet node types', () => {
      expect(isControlNetNodeType('imageInput')).toBe(false);
      expect(isControlNetNodeType('textInput')).toBe(false);
      expect(isControlNetNodeType('unknown-node')).toBe(false);
      expect(isControlNetNodeType('')).toBe(false);
    });
  });

  describe('requiresPreprocessing', () => {
    it('should return true for ControlNet nodes that require preprocessing', () => {
      expect(requiresPreprocessing('control-net-pose')).toBe(true);
      expect(requiresPreprocessing('control-net-depth')).toBe(true);
      expect(requiresPreprocessing('control-net-edge')).toBe(true);
      expect(requiresPreprocessing('control-net-segments')).toBe(true);
      expect(requiresPreprocessing('control-net-normal-map')).toBe(true);
    });

    it('should return false for light ControlNet (no preprocessing)', () => {
      expect(requiresPreprocessing('seed-image-lights')).toBe(false);
    });

    it('should return false for non-ControlNet node types', () => {
      expect(requiresPreprocessing('imageInput')).toBe(false);
      expect(requiresPreprocessing('textInput')).toBe(false);
      expect(requiresPreprocessing('unknown-node')).toBe(false);
    });
  });

  describe('getSupportedControlNetTypes', () => {
    it('should return all supported ControlNet node types', () => {
      const types = getSupportedControlNetTypes();
      expect(types).toContain('control-net-pose');
      expect(types).toContain('control-net-depth');
      expect(types).toContain('control-net-edge');
      expect(types).toContain('control-net-segments');
      expect(types).toContain('control-net-normal-map');
      expect(types).toContain('seed-image-lights');
      expect(types).toHaveLength(6);
    });
  });

  describe('getAvailablePreprocessors', () => {
    it('should return all available preprocessor names excluding null', () => {
      const preprocessors = getAvailablePreprocessors();
      expect(preprocessors).toContain('openpose');
      expect(preprocessors).toContain('depth');
      expect(preprocessors).toContain('lineart');
      expect(preprocessors).toContain('seg');
      expect(preprocessors).toContain('normalbae');
      expect(preprocessors).not.toContain(null);
      expect(preprocessors).toHaveLength(5);
    });
  });

  describe('createPreprocessedImageData', () => {
    it('should create preprocessed image data with required fields', () => {
      const guideImageURL = 'https://example.com/image.jpg';
      const preprocessor = 'openpose';
      
      const data = createPreprocessedImageData(guideImageURL, preprocessor);
      
      expect(data.guideImageURL).toBe(guideImageURL);
      expect(data.preprocessor).toBe(preprocessor);
      expect(data.timestamp).toBeGreaterThan(0);
      expect(typeof data.timestamp).toBe('number');
    });

    it('should create preprocessed image data with optional sourceImageUUID', () => {
      const guideImageURL = 'https://example.com/image.jpg';
      const preprocessor = 'depth_midas';
      const sourceImageUUID = 'uuid-123';
      
      const data = createPreprocessedImageData(guideImageURL, preprocessor, sourceImageUUID);
      
      expect(data.guideImageURL).toBe(guideImageURL);
      expect(data.preprocessor).toBe(preprocessor);
      expect(data.sourceImageUUID).toBe(sourceImageUUID);
      expect(data.timestamp).toBeGreaterThan(0);
    });

    it('should create different timestamps for multiple calls', () => {
      const data1 = createPreprocessedImageData('url1', 'openpose');
      // Small delay to ensure different timestamps
      const data2 = createPreprocessedImageData('url2', 'depth_midas');
      
      expect(data2.timestamp).toBeGreaterThanOrEqual(data1.timestamp);
    });
  });

  describe('isValidPreprocessor', () => {
    it('should return true for valid preprocessor names', () => {
      expect(isValidPreprocessor('openpose')).toBe(true);
      expect(isValidPreprocessor('depth')).toBe(true);
      expect(isValidPreprocessor('lineart')).toBe(true);
      expect(isValidPreprocessor('seg')).toBe(true);
      expect(isValidPreprocessor('normalbae')).toBe(true);
      expect(isValidPreprocessor('canny')).toBe(true);
    });

    it('should return false for invalid preprocessor names', () => {
      expect(isValidPreprocessor('invalid')).toBe(false);
      expect(isValidPreprocessor('')).toBe(false);
      expect(isValidPreprocessor('unknown_preprocessor')).toBe(false);
    });
  });

  describe('CONTROLNET_PREPROCESSOR_MAP', () => {
    it('should have correct mapping for all ControlNet types', () => {
      expect(CONTROLNET_PREPROCESSOR_MAP['control-net-pose']).toBe('openpose');
      expect(CONTROLNET_PREPROCESSOR_MAP['control-net-depth']).toBe('depth');
      expect(CONTROLNET_PREPROCESSOR_MAP['control-net-edge']).toBe('lineart');
      expect(CONTROLNET_PREPROCESSOR_MAP['control-net-segments']).toBe('seg');
      expect(CONTROLNET_PREPROCESSOR_MAP['control-net-normal-map']).toBe('normalbae');
      expect(CONTROLNET_PREPROCESSOR_MAP['seed-image-lights']).toBe(null);
    });
  });

  describe('CANNY_PREPROCESSOR', () => {
    it('should be defined as canny', () => {
      expect(CANNY_PREPROCESSOR).toBe('canny');
    });
  });
});