/**
 * Data Persistence Demo
 * Demonstrates the data persistence functionality for preprocessed results
 */

import { Node, Edge } from '@xyflow/react';
import { PreprocessedImageData } from '../utils/controlNetUtils';

/**
 * Demo function showing how preprocessed data is preserved during save/load cycles
 */
export function demonstrateDataPersistence() {
  console.log('=== Data Persistence Demo ===');

  // Create sample preprocessed data
  const preprocessedData: PreprocessedImageData = {
    guideImageURL: 'https://example.com/preprocessed-pose.jpg',
    preprocessor: 'openpose',
    sourceImageUUID: 'source-image-uuid-123',
    timestamp: Date.now(),
  };

  // Create a ControlNet node with preprocessed data
  const controlNetNode: Node = {
    id: 'control-net-pose-demo',
    type: 'control-net-pose',
    position: { x: 200, y: 100 },
    data: {
      preprocessedImage: preprocessedData,
      hasPreprocessedImage: true,
      isPreprocessing: false,
      preprocessor: 'openpose',
      right_sidebar: {
        preprocessedImage: preprocessedData.guideImageURL,
        showPreprocessed: true,
      },
    },
  };

  console.log('1. Original node with preprocessed data:');
  console.log('   - Has preprocessed image:', controlNetNode.data.hasPreprocessedImage);
  console.log('   - Preprocessor:', controlNetNode.data.preprocessor);
  console.log('   - Guide image URL:', controlNetNode.data.preprocessedImage?.guideImageURL);
  console.log('   - Sidebar shows preprocessed:', controlNetNode.data.right_sidebar.showPreprocessed);

  // Simulate saving (JSON serialization)
  console.log('\n2. Simulating save operation (JSON serialization)...');
  const serialized = JSON.stringify(controlNetNode);
  console.log('   - Serialized successfully:', serialized.length > 0);

  // Simulate loading (JSON deserialization + restoration logic)
  console.log('\n3. Simulating load operation (JSON deserialization + restoration)...');
  const deserialized = JSON.parse(serialized);
  
  // Apply restoration logic (from dbUtils.ts)
  const restoredNode = {
    ...deserialized,
    data: {
      ...deserialized.data,
      // Ensure preprocessed data is properly restored
      hasPreprocessedImage: true,
      isPreprocessing: false,
      // Restore right_sidebar display data
      right_sidebar: {
        ...deserialized.data.right_sidebar,
        preprocessedImage: deserialized.data.preprocessedImage?.guideImageURL,
        showPreprocessed: true,
      },
    },
  };

  console.log('   - Restored node data:');
  console.log('     * Has preprocessed image:', restoredNode.data.hasPreprocessedImage);
  console.log('     * Is processing:', restoredNode.data.isPreprocessing);
  console.log('     * Preprocessor:', restoredNode.data.preprocessor);
  console.log('     * Guide image URL:', restoredNode.data.preprocessedImage?.guideImageURL);
  console.log('     * Sidebar shows preprocessed:', restoredNode.data.right_sidebar.showPreprocessed);

  // Verify data integrity
  console.log('\n4. Data integrity verification:');
  const dataIntact = 
    restoredNode.data.preprocessedImage?.guideImageURL === preprocessedData.guideImageURL &&
    restoredNode.data.preprocessedImage?.preprocessor === preprocessedData.preprocessor &&
    restoredNode.data.preprocessedImage?.sourceImageUUID === preprocessedData.sourceImageUUID &&
    restoredNode.data.hasPreprocessedImage === true &&
    restoredNode.data.right_sidebar.showPreprocessed === true;

  console.log('   - Data integrity maintained:', dataIntact ? '✅' : '❌');

  // Demonstrate cleanup functionality
  console.log('\n5. Demonstrating cleanup when connection is removed...');
  const clearedNode = {
    ...restoredNode,
    data: {
      ...restoredNode.data,
      preprocessedImage: undefined,
      isPreprocessing: false,
      hasPreprocessedImage: false,
      preprocessor: undefined,
      right_sidebar: {
        ...restoredNode.data.right_sidebar,
        preprocessedImage: undefined,
        showPreprocessed: false,
      },
    },
  };

  console.log('   - After cleanup:');
  console.log('     * Has preprocessed image:', clearedNode.data.hasPreprocessedImage);
  console.log('     * Preprocessed image data:', clearedNode.data.preprocessedImage);
  console.log('     * Sidebar shows preprocessed:', clearedNode.data.right_sidebar.showPreprocessed);

  console.log('\n=== Demo Complete ===');
  
  return {
    original: controlNetNode,
    restored: restoredNode,
    cleared: clearedNode,
    dataIntact,
  };
}

/**
 * Demo function showing workflow-level serialization
 */
export function demonstrateWorkflowSerialization() {
  console.log('\n=== Workflow Serialization Demo ===');

  const preprocessedData: PreprocessedImageData = {
    guideImageURL: 'https://example.com/preprocessed-canny.jpg',
    preprocessor: 'canny',
    sourceImageUUID: 'source-image-uuid-456',
    timestamp: Date.now(),
  };

  const nodes: Node[] = [
    {
      id: 'image-node-1',
      type: 'image-node',
      position: { x: 0, y: 0 },
      data: {
        imageUrl: 'https://example.com/source-image.jpg',
      },
    },
    {
      id: 'control-net-canny-1',
      type: 'control-net-canny',
      position: { x: 300, y: 0 },
      data: {
        preprocessedImage: preprocessedData,
        hasPreprocessedImage: true,
        isPreprocessing: false,
        preprocessor: 'canny',
        right_sidebar: {
          preprocessedImage: preprocessedData.guideImageURL,
          showPreprocessed: true,
        },
      },
    },
    {
      id: 'control-net-pose-1',
      type: 'control-net-pose',
      position: { x: 600, y: 0 },
      data: {
        // No preprocessed data
      },
    },
  ];

  const edges: Edge[] = [
    {
      id: 'edge-1',
      source: 'image-node-1',
      target: 'control-net-canny-1',
      type: 'custom',
    },
  ];

  console.log('1. Original workflow:');
  console.log('   - Total nodes:', nodes.length);
  console.log('   - Nodes with preprocessed data:', 
    nodes.filter(n => n.data?.preprocessedImage).length);

  // Simulate the serialization logic from useCanvasStore
  const serializableNodes = nodes.map(node => {
    if ((node.type?.includes('control-net') || node.type === 'seed-image-lights') && 
        node.data?.preprocessedImage) {
      return {
        ...node,
        data: {
          ...node.data,
          // Ensure preprocessed data is preserved
          preprocessedImage: node.data.preprocessedImage,
          hasPreprocessedImage: !!node.data.preprocessedImage,
          preprocessor: node.data.preprocessor,
          // Preserve right_sidebar state
          right_sidebar: {
            ...node.data.right_sidebar,
            preprocessedImage: node.data.preprocessedImage?.guideImageURL,
            showPreprocessed: !!node.data.preprocessedImage,
          },
        },
      };
    }
    return node;
  });

  const workflowState = {
    nodes: serializableNodes,
    edges: edges,
  };

  console.log('\n2. Serialized workflow state:');
  console.log('   - Serialization successful:', JSON.stringify(workflowState).length > 0);
  
  const serializedControlNetNode = workflowState.nodes.find(n => n.id === 'control-net-canny-1');
  console.log('   - ControlNet node preserved:', !!serializedControlNetNode?.data.preprocessedImage);
  console.log('   - Preprocessor preserved:', serializedControlNetNode?.data.preprocessor);

  // Simulate restoration
  const restoredNodes = workflowState.nodes.map(node => {
    if ((node.type?.includes('control-net') || node.type === 'seed-image-lights') && 
        node.data?.preprocessedImage) {
      return {
        ...node,
        data: {
          ...node.data,
          hasPreprocessedImage: true,
          isPreprocessing: false,
          right_sidebar: {
            ...node.data.right_sidebar,
            preprocessedImage: node.data.preprocessedImage.guideImageURL,
            showPreprocessed: true,
          },
        },
      };
    }
    return node;
  });

  console.log('\n3. Restored workflow:');
  const restoredControlNetNode = restoredNodes.find(n => n.id === 'control-net-canny-1');
  console.log('   - Preprocessed data restored:', !!restoredControlNetNode?.data.preprocessedImage);
  console.log('   - Display flags set correctly:', restoredControlNetNode?.data.right_sidebar.showPreprocessed);

  console.log('\n=== Workflow Demo Complete ===');

  return {
    original: workflowState,
    restored: { nodes: restoredNodes, edges },
  };
}

// Export for use in development/testing
export const dataPersistenceDemo = {
  demonstrateDataPersistence,
  demonstrateWorkflowSerialization,
};