/**
 * Test file for enhanced WorkflowExecutor functionality
 * Tests all 4 workflow types: Text-to-Image, Image-to-Image, Flux Kontext, Tools
 */

import { WorkflowExecutor } from '../services/workflowExecutor';
import { RunwareService } from '../services/runwareService';

// Mock RunwareService for testing
class MockRunwareService extends RunwareService {
  constructor() {
    super('test-api-key');
  }

  async generateImage(params: any) {
    console.log('🎨 Mock Text-to-Image generation:', params);
    return { imageURL: 'https://example.com/generated-text-to-image.jpg' };
  }

  async generateFluxKontext(params: any) {
    console.log('🌌 Mock Flux Kontext generation:', params);
    return { imageURL: 'https://example.com/generated-flux-kontext.jpg' };
  }

  async generateFluxKontextPro(params: any) {
    console.log('🌌 Mock Flux Kontext Pro generation:', params);
    return { imageURL: 'https://example.com/generated-flux-kontext-pro.jpg' };
  }

  async removeBackground(params: any) {
    console.log('🗑️ Mock Remove Background:', params);
    return { imageURL: 'https://example.com/removed-bg.jpg' };
  }

  async upscaleImage(params: any) {
    console.log('📈 Mock Upscale Image:', params);
    return { imageURL: 'https://example.com/upscaled.jpg' };
  }

  async inpaintImage(params: any) {
    console.log('🎨 Mock Inpaint Image:', params);
    return { imageURL: 'https://example.com/inpainted.jpg' };
  }

  async outpaintImage(params: any) {
    console.log('📐 Mock Outpaint Image:', params);
    return { imageURL: 'https://example.com/outpainted.jpg' };
  }
}

// Test the enhanced WorkflowExecutor
async function testWorkflowExecutor() {
  console.log('🚀 Starting Enhanced WorkflowExecutor Tests\n');

  const mockService = new MockRunwareService();
  const executor = new WorkflowExecutor(mockService);

  try {
    // Test 1: Text-to-Image Workflow
    console.log('=== Test 1: Text-to-Image Workflow ===');
    const textToImageResult = await executor.executeTextToImageWorkflow(
      'A beautiful landscape with mountains and rivers',
      'runware:100@1', // Model AIR
      [{ model: 'runware:lora1@1', weight: 0.8 }], // LoRA
      [{ type: 'control-net-canny', image: 'https://example.com/input.jpg', weight: 1.0 }], // ControlNet
      { width: 1024, height: 1024, steps: 30, cfgScale: 7.5, seed: 12345 } // Engine params
    );
    console.log('✅ Text-to-Image Result:', textToImageResult);
    console.log('');

    // Test 2: Image-to-Image Workflow
    console.log('=== Test 2: Image-to-Image Workflow ===');
    const imageToImageResult = await executor.executeImageToImageWorkflow(
      'Transform this image into a fantasy artwork',
      'https://example.com/seed-image.jpg', // Seed image
      0.7, // Strength
      'runware:100@1', // Model AIR
      [{ model: 'runware:lora2@1', weight: 0.6 }], // LoRA
      [{ type: 'control-net-pose', image: 'https://example.com/pose.jpg', weight: 0.9 }], // ControlNet
      { width: 512, height: 512, steps: 25, cfgScale: 8.0 } // Engine params
    );
    console.log('✅ Image-to-Image Result:', imageToImageResult);
    console.log('');

    // Test 3: Flux Kontext Workflow (Standard)
    console.log('=== Test 3: Flux Kontext Workflow (Standard) ===');
    const fluxKontextResult = await executor.executeFluxKontextWorkflow(
      'Create an artwork inspired by these reference images',
      ['https://example.com/ref1.jpg', 'https://example.com/ref2.jpg'], // Reference images
      'runware:100@1', // Model AIR
      [{ model: 'runware:lora3@1', weight: 0.5 }], // LoRA
      { width: 1024, height: 1024 }, // Dimensions
      false // Standard version
    );
    console.log('✅ Flux Kontext Result:', fluxKontextResult);
    console.log('');

    // Test 4: Flux Kontext Pro Workflow
    console.log('=== Test 4: Flux Kontext Pro Workflow ===');
    const fluxKontextProResult = await executor.executeFluxKontextWorkflow(
      'Professional quality artwork with style transfer',
      ['https://example.com/style1.jpg', 'https://example.com/style2.jpg'], // Reference images
      'runware:100@1', // Model AIR
      [{ model: 'runware:lora4@1', weight: 0.7 }], // LoRA
      { sizeRatio: '16:9' }, // Size ratio for Pro
      true // Pro version
    );
    console.log('✅ Flux Kontext Pro Result:', fluxKontextProResult);
    console.log('');

    // Test 5: Tool Workflows
    console.log('=== Test 5: Tool Workflows ===');

    // Remove Background
    const removeBgResult = await executor.executeToolWorkflow(
      'https://example.com/image-with-bg.jpg',
      'removebg'
    );
    console.log('✅ Remove Background Result:', removeBgResult);

    // Upscale Image
    const upscaleResult = await executor.executeToolWorkflow(
      'https://example.com/small-image.jpg',
      'upscale',
      { scaleFactor: 2 }
    );
    console.log('✅ Upscale Result:', upscaleResult);

    // Inpaint Image
    const inpaintResult = await executor.executeToolWorkflow(
      'https://example.com/image-to-inpaint.jpg',
      'inpaint',
      { 
        maskImage: 'https://example.com/mask.jpg',
        prompt: 'Fill the masked area with flowers'
      }
    );
    console.log('✅ Inpaint Result:', inpaintResult);

    // Outpaint Image
    const outpaintResult = await executor.executeToolWorkflow(
      'https://example.com/image-to-outpaint.jpg',
      'outpaint',
      { 
        direction: 'all',
        amount: 100
      }
    );
    console.log('✅ Outpaint Result:', outpaintResult);
    console.log('');

    // Test 6: Auto Workflow Detection
    console.log('=== Test 6: Auto Workflow Detection ===');
    const mockNodes = [
      { id: 'text1', type: 'textInput', data: { text: 'Test prompt' } },
      { id: 'engine1', type: 'engine', data: { model: 'runware:100@1' } },
      { id: 'output1', type: 'output', data: {} }
    ];
    const mockEdges = [
      { id: 'e1', source: 'text1', target: 'engine1' },
      { id: 'e2', source: 'engine1', target: 'output1' }
    ];

    const autoDetectResult = await executor.executeAutoWorkflow(
      mockNodes as any,
      mockEdges as any,
      'output1'
    );
    console.log('✅ Auto-detected workflow type:', autoDetectResult.workflowType);
    console.log('✅ Auto workflow result:', autoDetectResult.result);
    console.log('');

    console.log('🎉 All Enhanced WorkflowExecutor Tests Completed Successfully!');
    
    return {
      textToImage: textToImageResult,
      imageToImage: imageToImageResult,
      fluxKontext: fluxKontextResult,
      fluxKontextPro: fluxKontextProResult,
      tools: {
        removeBg: removeBgResult,
        upscale: upscaleResult,
        inpaint: inpaintResult,
        outpaint: outpaintResult
      },
      autoDetect: autoDetectResult
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Export for use in browser console or other testing
if (typeof window !== 'undefined') {
  (window as any).testWorkflowExecutor = testWorkflowExecutor;
}

export { testWorkflowExecutor };