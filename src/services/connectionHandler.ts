/**
 * Connection Handler Service
 * Detects and handles connections between image nodes and ControlNet nodes
 * Triggers preprocessing when appropriate and manages connection lifecycle
 */

import { Node, Edge } from "@xyflow/react";
import { requiresPreprocessing } from "../utils/controlNetUtils";
import { PreprocessingTrigger } from "./preprocessingTrigger";
import { ImageCaptionTrigger } from "./imageCaptionTrigger";
import { isTextInputNode, isTextInputNodeFromNode } from "../utils/imageCaptionUtils";

// Interface for connection events
export interface ConnectionEvent {
  source: {
    nodeId: string;
    handleId: string;
    nodeType: string;
  };
  target: {
    nodeId: string;
    handleId: string;
    nodeType: string;
  };
  connectionType: 'new' | 'removed';
}

// Interface for connection handler callbacks
export interface ConnectionHandlerCallbacks {
  onPreprocessingTriggered?: (nodeId: string) => Promise<void>;
  onPreprocessedDataCleared?: (nodeId: string) => void;
  onImageCaptioningTriggered?: (nodeId: string) => Promise<void>;
}

// Interface for preprocessing trigger integration
export interface PreprocessingTriggerIntegration {
  preprocessingTrigger?: PreprocessingTrigger;
  imageCaptionTrigger?: ImageCaptionTrigger;
}

/**
 * Connection Handler Service
 * Manages detection and handling of image-to-ControlNet connections
 */
export class ConnectionHandler {
  private callbacks: ConnectionHandlerCallbacks;
  private preprocessingTrigger?: PreprocessingTrigger;
  private imageCaptionTrigger?: ImageCaptionTrigger;

  constructor(
    callbacks: ConnectionHandlerCallbacks = {}, 
    preprocessingTrigger?: PreprocessingTrigger,
    imageCaptionTrigger?: ImageCaptionTrigger
  ) {
    this.callbacks = callbacks;
    this.preprocessingTrigger = preprocessingTrigger;
    this.imageCaptionTrigger = imageCaptionTrigger;
  }

  /**
   * Handle new connection between nodes
   * @param connection - The connection event data
   * @param nodes - Current nodes in the workflow
   */
  async handleNewConnection(connection: ConnectionEvent, nodes: Node[]): Promise<void> {
    const { source, target } = connection;

    // Find the actual nodes
    const sourceNode = nodes.find(node => node.id === source.nodeId);
    const targetNode = nodes.find(node => node.id === target.nodeId);

    if (!sourceNode || !targetNode) {
      console.warn('ConnectionHandler: Source or target node not found');
      return;
    }

    // Check if this is an image-to-ControlNet connection
    if (this.isImageToControlNetConnection(sourceNode, targetNode)) {
      await this.triggerPreprocessing(sourceNode, targetNode, nodes, []);
    }

    // Check if this is an image-to-text connection for captioning
    if (this.isImageToTextConnection(sourceNode, targetNode)) {
      await this.triggerImageCaptioning(sourceNode, targetNode, nodes, []);
    }
  }

  /**
   * Handle connection removal
   * @param connection - The connection event data
   * @param nodes - Current nodes in the workflow
   * @param remainingEdges - Edges that remain after the removal
   */
  handleConnectionRemoval(
    connection: ConnectionEvent, 
    nodes: Node[], 
    remainingEdges: Edge[]
  ): void {
    const { target } = connection;

    // Find the target node
    const targetNode = nodes.find(node => node.id === target.nodeId);

    if (!targetNode || !this.isControlNetNode(targetNode)) {
      return;
    }

    // Check if this ControlNet node still has other image connections
    const hasOtherImageConnections = this.hasImageInputConnections(
      target.nodeId, 
      nodes, 
      remainingEdges
    );

    // Clear preprocessed data if no other image connections exist
    if (!hasOtherImageConnections) {
      this.clearPreprocessedData(target.nodeId);
    }
  }

  /**
   * Detect connection changes between two edge arrays
   * @param previousEdges - Previous edge state
   * @param currentEdges - Current edge state
   * @param nodes - Current nodes in the workflow
   */
  async detectConnectionChanges(
    previousEdges: Edge[], 
    currentEdges: Edge[], 
    nodes: Node[]
  ): Promise<void> {
    // Find new connections
    const newEdges = currentEdges.filter(
      edge => !previousEdges.some(
        prevEdge => prevEdge.source === edge.source && prevEdge.target === edge.target
      )
    );

    // Find removed connections
    const removedEdges = previousEdges.filter(
      prevEdge => !currentEdges.some(
        edge => edge.source === prevEdge.source && edge.target === prevEdge.target
      )
    );

    // Handle new connections
    for (const edge of newEdges) {
      const connectionEvent: ConnectionEvent = {
        source: {
          nodeId: edge.source,
          handleId: edge.sourceHandle || '',
          nodeType: nodes.find(n => n.id === edge.source)?.type || '',
        },
        target: {
          nodeId: edge.target,
          handleId: edge.targetHandle || '',
          nodeType: nodes.find(n => n.id === edge.target)?.type || '',
        },
        connectionType: 'new',
      };

      await this.handleNewConnection(connectionEvent, nodes);
    }

    // Handle removed connections
    for (const edge of removedEdges) {
      const connectionEvent: ConnectionEvent = {
        source: {
          nodeId: edge.source,
          handleId: edge.sourceHandle || '',
          nodeType: nodes.find(n => n.id === edge.source)?.type || '',
        },
        target: {
          nodeId: edge.target,
          handleId: edge.targetHandle || '',
          nodeType: nodes.find(n => n.id === edge.target)?.type || '',
        },
        connectionType: 'removed',
      };

      this.handleConnectionRemoval(connectionEvent, nodes, currentEdges);
    }
  }

  /**
   * Trigger preprocessing for a ControlNet node
   * @param sourceNode - The source image node
   * @param targetNode - The target ControlNet node
   * @param nodes - All nodes in the workflow
   * @param edges - All edges in the workflow
   */
  private async triggerPreprocessing(sourceNode: Node, targetNode: Node, nodes: Node[], edges: Edge[]): Promise<void> {
    // Use the new preprocessing trigger if available
    if (this.preprocessingTrigger) {
      // Check if preprocessing should be triggered using the new service
      if (this.preprocessingTrigger.shouldTriggerPreprocessing(sourceNode, targetNode)) {
        await this.preprocessingTrigger.triggerPreprocessing(sourceNode, targetNode, nodes, edges);
      }
      return;
    }

    // Fallback to legacy callback-based approach
    // Check if the target node requires preprocessing
    if (!requiresPreprocessing(targetNode.type || '')) {
      console.log(`ConnectionHandler: Node ${targetNode.type} does not require preprocessing`);
      return;
    }

    // Validate that source node has image data
    if (!this.hasValidImageData(sourceNode)) {
      console.warn('ConnectionHandler: Source node does not have valid image data');
      return;
    }

    // Trigger preprocessing callback
    if (this.callbacks.onPreprocessingTriggered) {
      try {
        await this.callbacks.onPreprocessingTriggered(targetNode.id);
      } catch (error) {
        console.error('ConnectionHandler: Error triggering preprocessing:', error);
      }
    }
  }

  /**
   * Clear preprocessed data from a ControlNet node
   * @param nodeId - The ControlNet node ID
   */
  private clearPreprocessedData(nodeId: string): void {
    // Use preprocessing trigger to clear state if available
    if (this.preprocessingTrigger) {
      this.preprocessingTrigger.clearPreprocessingState(nodeId);
    }
    
    // Also use callback for backward compatibility
    if (this.callbacks.onPreprocessedDataCleared) {
      this.callbacks.onPreprocessedDataCleared(nodeId);
    }
  }

  /**
   * Check if a connection is from an image node to a ControlNet node
   * @param sourceNode - The source node
   * @param targetNode - The target node
   * @returns True if this is an image-to-ControlNet connection
   */
  private isImageToControlNetConnection(sourceNode: Node, targetNode: Node): boolean {
    return this.isImageNode(sourceNode) && this.isControlNetNode(targetNode);
  }

  /**
   * Check if a node is an image node
   * @param node - The node to check
   * @returns True if the node is an image node
   */
  private isImageNode(node: Node): boolean {
    return (
      node.type === "image-node" ||
      node.type?.includes("image") ||
      node.type === "previewNode" ||
      node.type === "output" ||
      node.type === "preview-realtime-node" ||
      !!node.data?.image ||
      !!node.data?.imageUrl ||
      !!node.data?.generatedImage
    );
  }

  /**
   * Check if a node is a ControlNet node
   * @param node - The node to check
   * @returns True if the node is a ControlNet node
   */
  private isControlNetNode(node: Node): boolean {
    return node.data?.type?.includes("control-net") || node.data?.type === "seed-image-lights";
  }

  /**
   * Check if this is an image-to-text connection for captioning
   * @param sourceNode - The source node
   * @param targetNode - The target node
   * @returns True if this is an image-to-text connection
   */
  private isImageToTextConnection(sourceNode: Node, targetNode: Node): boolean {
    return this.isImageNode(sourceNode) && isTextInputNodeFromNode(targetNode);
  }

  /**
   * Trigger image captioning for a text input node
   * @param sourceNode - The source image node
   * @param targetNode - The target text input node
   * @param nodes - All nodes in the workflow
   * @param edges - All edges in the workflow
   */
  private async triggerImageCaptioning(sourceNode: Node, targetNode: Node, nodes: Node[], edges: Edge[]): Promise<void> {
    // Use the image caption trigger if available
    if (this.imageCaptionTrigger) {
      // Check if image captioning should be triggered
      if (this.imageCaptionTrigger.shouldTriggerImageCaptioning(sourceNode, targetNode)) {
        await this.imageCaptionTrigger.triggerImageCaptioning(sourceNode, targetNode, nodes, edges);
      }
      return;
    }

    // Fallback to callback-based approach
    if (this.callbacks.onImageCaptioningTriggered) {
      try {
        await this.callbacks.onImageCaptioningTriggered(targetNode.id);
      } catch (error) {
        console.error('ConnectionHandler: Error triggering image captioning:', error);
      }
    }
  }

  /**
   * Check if a source node has valid image data
   * @param node - The node to check
   * @returns True if the node has valid image data
   */
  private hasValidImageData(node: Node): boolean {
    const imageUrl = node.data?.imageUrl || 
                     node.data?.image || 
                     node.data?.generatedImage;
    return typeof imageUrl === 'string' && imageUrl.length > 0;
  }

  /**
   * Check if a ControlNet node has image input connections
   * @param nodeId - The ControlNet node ID
   * @param nodes - Current nodes in the workflow
   * @param edges - Current edges in the workflow
   * @returns True if the node has image input connections
   */
  private hasImageInputConnections(nodeId: string, nodes: Node[], edges: Edge[]): boolean {
    // Find edges that connect to this node
    const incomingEdges = edges.filter(edge => edge.target === nodeId);

    // Check if any incoming edge is from an image node
    return incomingEdges.some(edge => {
      const sourceNode = nodes.find(node => node.id === edge.source);
      return sourceNode && this.isImageNode(sourceNode);
    });
  }

  /**
   * Update callbacks for the connection handler
   * @param callbacks - New callback functions
   */
  updateCallbacks(callbacks: ConnectionHandlerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Set the preprocessing trigger service
   * @param preprocessingTrigger - The preprocessing trigger service
   */
  setPreprocessingTrigger(preprocessingTrigger: PreprocessingTrigger): void {
    this.preprocessingTrigger = preprocessingTrigger;
  }
}