/**
 * Image Caption Trigger Service
 * Handles automatic image captioning when image nodes connect to text input nodes
 */

import { Node, Edge } from "@xyflow/react";
import { RunwareService } from "./runwareService";
import {
  isTextInputNodeFromNode,
  hasValidImageDataForCaptioning,
  extractImageUrlForCaptioning,
  createImageCaptionData,
  ImageCaptionData,
} from "../utils/imageCaptionUtils";
import { toast } from "sonner";
import { useCanvasStore } from "../store/useCanvasStore";

export interface ImageCaptionTriggerCallbacks {
  onCaptioningStarted?: (nodeId: string) => void;
  onCaptioningCompleted?: (nodeId: string, result: ImageCaptionData) => void;
  onCaptioningFailed?: (nodeId: string, error: string) => void;
}

/**
 * Image Caption Trigger Service
 * Manages automatic image captioning when image-to-text connections are made
 */
export class ImageCaptionTrigger {
  private runwareService: RunwareService;
  private callbacks: ImageCaptionTriggerCallbacks;
  private processingNodes: Set<string> = new Set();

  constructor(
    runwareService: RunwareService,
    callbacks: ImageCaptionTriggerCallbacks = {}
  ) {
    this.runwareService = runwareService;
    this.callbacks = callbacks;
  }

  /**
   * Check if image captioning should be triggered for a connection
   */
  shouldTriggerImageCaptioning(sourceNode: Node, targetNode: Node): boolean {
    return (
      this.isImageNode(sourceNode) &&
      isTextInputNodeFromNode(targetNode) &&
      hasValidImageDataForCaptioning(sourceNode) &&
      !this.processingNodes.has(targetNode.id)
    );
  }

  /**
   * Trigger image captioning for a text input node
   */
  async triggerImageCaptioning(
    sourceNode: Node,
    targetNode: Node,
    _nodes: Node[],
    _edges: Edge[]
  ): Promise<void> {
    const nodeId = targetNode.id;

    try {
      // Check if already processing
      if (this.processingNodes.has(nodeId)) {
        console.log(
          `ImageCaptionTrigger: Node ${nodeId} is already processing, skipping`
        );
        return;
      }

      // Validate that source node has valid image data
      if (!hasValidImageDataForCaptioning(sourceNode)) {
        const errorMessage =
          "Source node must have valid image data for captioning";
        console.warn(`ImageCaptionTrigger: ${errorMessage}`);
        this.handleCaptioningFailure(nodeId, errorMessage);
        return;
      }

      // Extract image URL
      let imageUrl = extractImageUrlForCaptioning(sourceNode);

      if (!imageUrl) {
        const errorMessage = "Could not extract image URL from source node";
        console.warn(`ImageCaptionTrigger: ${errorMessage}`);
        this.handleCaptioningFailure(nodeId, errorMessage);
        return;
      }

      // Start processing
      this.processingNodes.add(nodeId);
      this.handleCaptioningStarted(nodeId);

      console.log(
        `🖼️ Starting image captioning for node ${nodeId} with image: ${imageUrl.substring(
          0,
          50
        )}...`
      );

      // Call the image caption API
      const result = await this.runwareService.generateImageCaption({
        inputImage: imageUrl,
        includeCost: false,
      });

      // Create caption data
      const captionData = createImageCaptionData(
        result.text,
        imageUrl,
        result.taskUUID
      );

      // Update the text input node with the caption using Canvas store's updateNodeData
      const canvasStore = useCanvasStore.getState();
      const selectedNode = canvasStore.nodes.map((n)=>n.id === nodeId)
      const sidebar = selectedNode?.data?.right_sidebar || {};
      canvasStore.updateNodeData(nodeId, {
        right_sidebar: {
          ...sidebar,
          prompt: result.text,
        },
        lastCaptionUpdate: Date.now(),
      });

      this.handleCaptioningCompleted(nodeId, captionData);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error during image captioning";
      console.error(`❌ Image captioning failed for node ${nodeId}:`, error);
      this.handleCaptioningFailure(nodeId, errorMessage);
    } finally {
      this.processingNodes.delete(nodeId);
    }
  }

  /**
   * Handle captioning started
   */
  private handleCaptioningStarted(nodeId: string): void {
    console.log(`🖼️ Image captioning started for node ${nodeId}`);

    toast.loading("Generating image caption...", {
      id: `caption-${nodeId}`,
      description: "Converting image to descriptive text",
    });

    if (this.callbacks.onCaptioningStarted) {
      this.callbacks.onCaptioningStarted(nodeId);
    }

    const canvasStore = useCanvasStore.getState();
    canvasStore.updateNodeData(nodeId, {
      isCaptioning: true,
      captionError: null,
    });
  }

  /**
   * Handle captioning completed
   */
  private handleCaptioningCompleted(
    nodeId: string,
    result: ImageCaptionData
  ): void {
    console.log(`✅ Image captioning completed for node ${nodeId}:`, {
      textLength: result.captionText.length,
      taskUUID: result.taskUUID,
    });

    toast.success("Image caption generated!", {
      id: `caption-${nodeId}`,
      description: `Generated ${result.captionText.length} character description`,
    });

    if (this.callbacks.onCaptioningCompleted) {
      this.callbacks.onCaptioningCompleted(nodeId, result);
    }

    const canvasStore = useCanvasStore.getState();
    canvasStore.updateNodeData(nodeId, {
      isCaptioning: false,
      captionError: null,
    });
  }

  /**
   * Handle captioning failure
   */
  private handleCaptioningFailure(nodeId: string, error: string): void {
    console.error(`❌ Image captioning failed for node ${nodeId}:`, error);

    toast.error("Image captioning failed", {
      id: `caption-${nodeId}`,
      description: error,
    });

    if (this.callbacks.onCaptioningFailed) {
      this.callbacks.onCaptioningFailed(nodeId, error);
    }

    const canvasStore = useCanvasStore.getState();
    canvasStore.updateNodeData(nodeId, {
      isCaptioning: false,
      captionError: error,
    });
  }

  /**
   * Check if a node is an image node
   */
  private isImageNode(node: Node): boolean {
    const nodeType = node.type || "";
    const dataType = (node.data?.type as string) || "";

    return (
      // React Flow node types
      nodeType === "imageInput" ||
      nodeType === "image-node" ||
      nodeType === "previewNode" ||
      nodeType === "output" ||
      nodeType === "preview-realtime-node" ||
      nodeType.includes("image") ||
      nodeType.includes("preview") ||
      // Custom data types
      dataType.includes("image") ||
      dataType.includes("preview") ||
      // Has valid image data
      hasValidImageDataForCaptioning(node)
    );
  }

  /**
   * Clear captioning state for a node
   */
  clearCaptioningState(nodeId: string): void {
    this.processingNodes.delete(nodeId);

    const canvasStore = useCanvasStore.getState();
    canvasStore.updateNodeData(nodeId, {
      isCaptioning: false,
      captionError: null,
      imageCaptionData: null,
    });
  }

  /**
   * Update callbacks
   */
  updateCallbacks(callbacks: ImageCaptionTriggerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}
