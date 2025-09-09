import { toast } from "sonner";

const API_ENDPOINT = "wss://ws-api.runware.ai/v1";

export interface IpAdapter {
  model: string;
  guideImage: string;
  weight: number;
}

export interface GenerateImageParams {
  positivePrompt: string;
  negativePrompt?: string;
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  CFGScale?: number;
  scheduler?: string;
  strength?: number;
  promptWeighting?: "compel" | "sdEmbeds";
  seed?: number | null;
  lora?: Array<{
    model: string;
    weight: number;
  }>;
  width?: number;
  height?: number;
  steps?: number;
  acceleratorOptions?: {
    teaCache: boolean;
    teaCacheDistance: number;
  };
  controlNet?: Array<{
    model: string;
    guideImage: string;
    weight: number;
    startStep: number;
    endStep: number;
    controlMode: "balanced" | "prompt" | "controlnet";
  }>;
  seedImage?: string;
  ipAdapters?: IpAdapter[];
  referenceImages?: string[];
}

export interface ImageCaptionParams {
  inputImage: string;
  taskUUID?: string;
  includeCost?: boolean;
}

export interface ImageCaptionResponse {
  taskType: "imageCaption";
  taskUUID: string;
  text: string;
  cost?: number;
}

export interface FluxKontextParams {
  positivePrompt: string;
  referenceImages: string[];
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  CFGScale?: number;
  width?: number;
  height?: number;
  steps?: number;
  sizeRatio?: string;
  lora?: Array<{
    model: string;
    weight: number;
  }>;
}

export interface ImageToImageParams {
  positivePrompt: string;
  inputImage?: string;
  seedImage?: string;
  strength: number;
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  width?: number;
  height?: number;
  steps?: number;
  CFGScale?: number;
  scheduler?: string;
}

export interface GeneratedImage {
  imageURL: string;
  positivePrompt: string;
  seed: number;
  NSFWContent: boolean;
  cost?: number;
}

export interface PreprocessedImage {
  imageURL: string;
  preprocessor: string;
}

export interface ControlNetPreprocessor {
  id: string;
  name: string;
  description: string;
  taskType: string;
  preprocessor: string;
}

export interface RemoveBackgroundParams {
  inputImage: string;
  outputFormat?: string;
}

export interface UpscaleParams {
  inputImage: string;
  upscaleFactor: 2 | 3 | 4;
  outputFormat?: string;
}

export interface InpaintParams {
  seedImage: string;
  maskImage: string;
  positivePrompt: string;
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  width?: number;
  height?: number;
  steps?: number;
  CFGScale?: number;
}

export interface OutpaintParams {
  inputImage: string;
  positivePrompt: string;
  outpaintDirection: 'up' | 'down' | 'left' | 'right' | 'all';
  outpaintAmount: number;
  model?: string;
  numberResults?: number;
  outputFormat?: string;
  steps?: number;
  CFGScale?: number;
}

export interface ProcessedImageResult {
  imageURL: string;
  taskType: string;
  cost?: number;
}

export class RunwareService {
  private ws: WebSocket | null = null;
  private apiKey: string | null = null;
  private connectionSessionUUID: string | null = null;
  private messageCallbacks: Map<string, (data: any) => void> = new Map();
  private isAuthenticated: boolean = false;
  private connectionPromise: Promise<void> | null = null;
  
  // Global fallback for updating node states when no callback is provided
  private static globalNodeUpdateCallback: ((nodeId: string, data: any) => void) | null = null;
  private static globalNodeLookup: (() => Array<{id: string, data?: any, type?: string}>) | null = null;
  
  // Method to register global fallback callbacks
  static setGlobalFallbacks(
    nodeUpdateCallback: (nodeId: string, data: any) => void,
    nodeLookup: () => Array<{id: string, data?: any, type?: string}>
  ) {
    RunwareService.globalNodeUpdateCallback = nodeUpdateCallback;
    RunwareService.globalNodeLookup = nodeLookup;
  }

  constructor(apiKey: string) {
    this.apiKey = apiKey || import.meta.env.REACT_APP_RUNWARE_API_KEY || "v8r2CamVZNCtye7uypGvHfQOh48ZQQaZ";
    this.connectionPromise = this.connect();
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(API_ENDPOINT);
      
      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.authenticate().then(resolve).catch(reject);
      };

      this.ws.onmessage = (event) => {
        console.log("WebSocket message received:", event.data);
        const response = JSON.parse(event.data);
        
        if (response.error || response.errors) {
          console.error("WebSocket error response:", response);
          const errorMessage = response.errorMessage || response.errors?.[0]?.message || "An error occurred";
          toast.error(errorMessage);
          return;
        }

        if (response.data) {
          response.data.forEach((item: any) => {
            if (item.taskType === "authentication") {
              console.log("Authentication successful, session UUID:", item.connectionSessionUUID);
              this.connectionSessionUUID = item.connectionSessionUUID;
              this.isAuthenticated = true;
            } else {
              const callback = this.messageCallbacks.get(item.taskUUID);
              if (callback) {
                callback(item);
                this.messageCallbacks.delete(item.taskUUID);
              }
            }
          });
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast.error("Connection error. Please try again.");
        reject(error);
      };

      this.ws.onclose = () => {
        console.log("WebSocket closed, attempting to reconnect...");
        this.isAuthenticated = false;
        setTimeout(() => {
          this.connectionPromise = this.connect();
        }, 1000);
      };
    });
  }

  private authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not ready for authentication"));
        return;
      }
      
      const authMessage = [{
        taskType: "authentication",
        apiKey: this.apiKey,
        ...(this.connectionSessionUUID && { connectionSessionUUID: this.connectionSessionUUID }),
      }];
      
      console.log("Sending authentication message");
      
      const authCallback = (event: MessageEvent) => {
        const response = JSON.parse(event.data);
        if (response.data?.[0]?.taskType === "authentication") {
          this.ws?.removeEventListener("message", authCallback);
          resolve();
        }
      };
      
      this.ws.addEventListener("message", authCallback);
      this.ws.send(JSON.stringify(authMessage));
    });
  }

  normalizeModel(m?: string): string | undefined {
    return m ? m.trim().replace(/^runware:/i, "runware:") : m;
  }

  async preprocessImage(imageFile: File, preprocessor: string): Promise<PreprocessedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    // Map preprocessor types to ensure valid values
    const preprocMap: Record<string, string> = {
      pose: 'openpose',
      openpose: 'openpose',
      canny: 'canny',
      edge: 'canny',
      depth: 'depth',
      segment: 'seg',
      segmentation: 'seg',
      seg: 'seg',
      normal: 'normalbae',
      normalbae: 'normalbae',
      lineart: 'lineart',
      lineart_anime: 'lineart_anime',
      softedge: 'softedge',
      mlsd: 'mlsd',
      tile: 'tile',
      scribble: 'scribble',
      shuffle: 'shuffle'
    };

    const preProcessorType = preprocMap[(preprocessor || '').toLowerCase()];
    if (!preProcessorType) {
      throw new Error(`Unknown preprocessor "${preprocessor}".`);
    }

    // First upload the image
    const uploadedImageUrl = await this.uploadImageForURL(imageFile);
    
    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageControlNetPreProcess",
        taskUUID,
        inputImage: uploadedImageUrl,
        preProcessorType: preProcessorType,
        outputType: ["URL"],
        outputFormat: "PNG"
      }];

      console.log("Sending preprocessing message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve({
            imageURL: data.guideImageURL || data.guideImageUUID,
            preprocessor
          });
        }
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  // Upload image and get UUID for upscaling operations
  async uploadImage(imageFile: File): Promise<string> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result as string;
        
        const message = [{
          taskType: "imageUpload",
          taskUUID,
          image: dataUri,
          outputType: "UUID"
        }];

        console.log("Sending image upload message for UUID");

        this.messageCallbacks.set(taskUUID, (data) => {
          if (data.error) {
            reject(new Error(data.errorMessage));
          } else {
            console.log("Upload response:", data);
            resolve(data.imageUUID);
          }
        });

        this.ws!.send(JSON.stringify(message));
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(imageFile);
    });
  }

  // Upload image and get URL for other operations
  async uploadImageForURL(imageFile: File): Promise<string> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result as string;
        
        const message = [{
          taskType: "imageUpload",
          taskUUID,
          image: dataUri,
          outputType: "URL"
        }];

        console.log("Sending image upload message for URL");

        this.messageCallbacks.set(taskUUID, (data) => {
          if (data.error) {
            reject(new Error(data.errorMessage));
          } else {
            resolve(data.imageURL);
          }
        });

        this.ws!.send(JSON.stringify(message));
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(imageFile);
    });
  }

  // Upload image and get both UUID and URL
  async uploadImageWithBothValues(imageFile: File): Promise<{ imageUUID: string; imageURL: string }> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result as string;
        
        const message = [{
          taskType: "imageUpload",
          taskUUID,
          image: dataUri
        }];

        console.log("Sending image upload message for both UUID and URL");

        this.messageCallbacks.set(taskUUID, (data) => {
          if (data.error) {
            reject(new Error(data.errorMessage));
          } else {
            resolve({
              imageUUID: data.imageUUID,
              imageURL: data.imageURL
            });
          }
        });

        this.ws!.send(JSON.stringify(message));
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(imageFile);
    });
  }

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message: any = [{
        taskType: "imageInference",
        taskUUID,
        model: this.normalizeModel(params.model) || "runware:101@1",
        width: params.width || 1024,
        height: params.height || 1024,
        numberResults: params.numberResults || 1,
        outputFormat: "JPG",
        includeCost: true,
        outputType: "URL",
        outputQuality:95,
        positivePrompt: params.positivePrompt,
        ...(params.negativePrompt && { negativePrompt: params.negativePrompt }),
        ...(params.acceleratorOptions && { acceleratorOptions: params.acceleratorOptions }),
        ...(params.controlNet && { controlNet: params.controlNet }),
        ...(params.seedImage && { seedImage: params.seedImage }),
        ...(params.strength && { strength: params.strength }),
        ...(params.ipAdapters && { ipAdapters: params.ipAdapters }),
        ...(params.referenceImages && { referenceImages: params.referenceImages })
      }];

      // Only add these parameters if they exist in the original params
      if (params.steps !== undefined) {
        message[0].steps = params.steps;
      } else if (!params.referenceImages) {
        message[0].steps = 4;
      }

      if (params.CFGScale !== undefined) {
        message[0].CFGScale = params.CFGScale;
      } else if (!params.referenceImages) {
        message[0].CFGScale = 1;
      }

      if (params.scheduler !== undefined) {
        message[0].scheduler = params.scheduler;
      } else if (!params.referenceImages) {
        message[0].scheduler = "FlowMatchEulerDiscreteScheduler";
      }

      if (params.lora !== undefined) {
        message[0].lora = params.lora;
      } else if (!params.referenceImages) {
        message[0].lora = [];
      }

      console.log("Sending image generation message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  // Image-to-Image generation (re-imagine)
  async generateImageToImage(params: ImageToImageParams): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageInference",
        taskUUID,
        model: this.normalizeModel(params.model) || "runware:101@1",
        numberResults: params.numberResults || 1,
        outputFormat: params.outputFormat || "JPEG",
        width: params.width || 1024,
        height: params.height || 1024,
        steps: params.steps || 28,
        CFGScale: params.CFGScale || 4,
        scheduler: params.scheduler || "FlowMatchEulerDiscreteScheduler",
        includeCost: true,
        outputType: ["URL"],
        positivePrompt: params.positivePrompt,
        seedImage: params.seedImage || params.inputImage, // accept either, send as seedImage
        strength: params.strength
      }];

      console.log("Sending image-to-image generation message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  // Flux Kontext generation
  async generateFluxKontext(params: FluxKontextParams): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message: any = [{
        taskType: "imageInference",
        taskUUID,
        model: params.model || "runware:106@1",
        numberResults: params.numberResults || 1,
        outputFormat: params.outputFormat || "JPEG",
        steps: params.steps || 28,
        CFGScale: params.CFGScale || 2.5,
        scheduler: "Default",
        includeCost: true,
        outputType: ["dataURI", "URL"],
        positivePrompt: params.positivePrompt,
        referenceImages: params.referenceImages,
        outputQuality: 85,
        advancedFeatures: {
          guidanceEndStepPercentage: 75
        }
      }];

      // Only add LoRA if it exists and has valid models
      if (params.lora && params.lora.length > 0) {
        const validLoras = params.lora.filter(lora => lora.model && lora.model.trim() !== '');
        if (validLoras.length > 0) {
          message[0].lora = validLoras;
        }
      }

      console.log("Sending Flux Kontext generation message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  // Image caption - generates descriptive text from images
  async generateImageCaption(params: ImageCaptionParams): Promise<ImageCaptionResponse> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = params.taskUUID || crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageCaption",
        taskUUID,
        inputImage: params.inputImage,
        ...(params.includeCost && { includeCost: params.includeCost })
      }];

      console.log("🖼️ Sending image caption message:", {
        taskType: "imageCaption",
        taskUUID,
        inputImage: params.inputImage.substring(0, 50) + "...",
        includeCost: params.includeCost
      });

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          console.error("❌ Image caption failed:", data.errorMessage);
          reject(new Error(data.errorMessage));
        } else {
          console.log("✅ Image caption completed:", {
            taskUUID: data.taskUUID,
            textLength: data.text?.length || 0,
            cost: data.cost
          });
          resolve({
            taskType: "imageCaption",
            taskUUID: data.taskUUID,
            text: data.text,
            ...(data.cost !== undefined && { cost: data.cost })
          });
        }
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  // Background removal
  async removeBackground(params: RemoveBackgroundParams): Promise<ProcessedImageResult> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageBackgroundRemoval",
        taskUUID,
        inputImage: params.inputImage,
        outputFormat: params.outputFormat || "PNG",
        outputType: ["URL"]
      }];

      console.log("Sending background removal message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve({
            imageURL: data.imageURL,
            taskType: "imageBackgroundRemoval",
            cost: data.cost
          });
        }
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  // Image upscaling 
  async upscaleImage(params: UpscaleParams): Promise<ProcessedImageResult> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageUpscale",
        taskUUID,
        inputImage: params.inputImage,
        upscaleFactor: params.upscaleFactor,
        outputFormat: params.outputFormat || "JPG",
        outputType: ["URL"]
      }];

      console.log("Sending upscale message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve({
            imageURL: data.imageURL,
            taskType: "imageUpscale",
            cost: data.cost
          });
        }
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  // Image inpainting
  async inpaintImage(params: InpaintParams): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageInference",
        taskUUID,
        model: params.model || "runware:100@1",
        outputFormat: params.outputFormat || "JPEG",
        width: params.width || 1024,
        height: params.height || 1024,
        steps: params.steps || 28,
        CFGScale: params.CFGScale || 3.5,
        includeCost: true,
        outputType: ["URL"],
        positivePrompt: params.positivePrompt,
        seedImage: params.seedImage,
        maskImage: params.maskImage
      }];

      console.log("Sending inpainting message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  // Image outpainting
  async outpaintImage(params: OutpaintParams): Promise<GeneratedImage> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageInference",
        taskUUID,
        model: params.model || "runware:100@1",
        outputFormat: params.outputFormat || "JPEG",
        steps: params.steps || 28,
        CFGScale: params.CFGScale || 3.5,
        includeCost: true,
        outputType: ["URL"],
        positivePrompt: params.positivePrompt,
        inputImage: params.inputImage,
        outpaintDirection: params.outpaintDirection,
        outpaintAmount: params.outpaintAmount
      }];

      console.log("Sending outpainting message:", message);

      this.messageCallbacks.set(taskUUID, (data) => {
        if (data.error) {
          reject(new Error(data.errorMessage));
        } else {
          resolve(data);
        }
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  // ControlNet preprocessing - preprocesses an image for use with ControlNet
  async preprocessForControlNet(
    imageUrl: string, 
    controlNetType: string, 
    options?: {
      nodeId?: string;
      onStateUpdate?: (nodeId: string, data: any) => void;
    }
  ): Promise<{ guideImageURL: string; preprocessor: string }> {
    await this.connectionPromise;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      this.connectionPromise = this.connect();
      await this.connectionPromise;
    }

    // Get the correct preprocessor for the ControlNet type
    const preprocessor = this.getPreprocessorForControlNet(controlNetType);
    if (!preprocessor) {
      throw new Error(`No preprocessor found for ControlNet type: ${controlNetType}`);
    }

    const taskUUID = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      const message = [{
        taskType: "imageControlNetPreProcess",
        taskUUID,
        inputImage: imageUrl,
        preProcessorType: preprocessor,
        outputType: "URL",
        outputFormat: "WEBP"
      }];

      console.log("🎯 Sending ControlNet preprocessing message:", {
        taskType: "imageControlNetPreProcess",
        taskUUID,
        inputImage: imageUrl.substring(0, 50) + "...",
        preProcessorType: preprocessor,
        controlNetType
      });

      this.messageCallbacks.set(taskUUID, (data) => {
        console.log("📥 ControlNet preprocessing response:", {
          taskUUID,
          guideImageURL: data.guideImageURL,
          preprocessor,
          error: data.error,
          nodeId: options?.nodeId
        });
        
        if (data.error) {
          // Update node state on error if callback provided
          if (options?.nodeId && options?.onStateUpdate) {
            options.onStateUpdate(options.nodeId, {
              isPreprocessing: false,
              hasPreprocessedImage: false,
              preprocessedImage: undefined,
              hasError: true,
              errorMessage: data.errorMessage
            });
          }
          reject(new Error(data.errorMessage));
        } else {
          // Validate response data
          if (!data.guideImageURL && !data.guideImageUUID) {
            const error = "Preprocessing completed but no guide image URL was returned";
            // Update node state on validation error if callback provided
            if (options?.nodeId && options?.onStateUpdate) {
              options.onStateUpdate(options.nodeId, {
                isPreprocessing: false,
                hasPreprocessedImage: false,
                preprocessedImage: undefined,
                hasError: true,
                errorMessage: error
              });
            }
            reject(new Error(error));
            return;
          }
          
          const result = {
            guideImageURL: data.guideImageURL || data.guideImageUUID,
            preprocessor
          };
          
          // Update node state on success if callback provided
          if (options?.nodeId && options?.onStateUpdate) {
            const preprocessedImageData = {
              guideImageURL: result.guideImageURL,
              preprocessor: result.preprocessor,
              sourceImageUUID: imageUrl,
              timestamp: Date.now(),
            };
            
            options.onStateUpdate(options.nodeId, {
              preprocessedImage: preprocessedImageData,
              preprocessor: result.preprocessor,
              hasPreprocessedImage: true,
              isPreprocessing: false,
              hasError: false,
              errorMessage: undefined,
              right_sidebar: {
                preprocessedImage: result.guideImageURL,
                showPreprocessed: true,
              },
            });
            
            console.log("✅ Node state updated after successful preprocessing:", {
              nodeId: options.nodeId,
              guideImageURL: result.guideImageURL
            });
          } else {
            // Fallback: Try to find and update the node automatically
            console.log("⚠️ No callback provided, attempting fallback node update...");
            this.attemptFallbackNodeUpdate(imageUrl, result, controlNetType);
          }
          
          resolve(result);
        }
      });

      this.ws!.send(JSON.stringify(message));
    });
  }
  
  // Fallback method to find and update nodes when no explicit callback is provided
  private attemptFallbackNodeUpdate(
    imageUrl: string, 
    result: { guideImageURL: string; preprocessor: string },
    controlNetType: string
  ): void {
    if (!RunwareService.globalNodeUpdateCallback || !RunwareService.globalNodeLookup) {
      console.warn("📍 No global fallback callbacks registered for node updates");
      return;
    }
    
    try {
      const nodes = RunwareService.globalNodeLookup();
      console.log("📍 Searching for ControlNet node to update, total nodes:", nodes.length);
      
      // Find ControlNet nodes that match the type and are in processing state
      const candidateNodes = nodes.filter(node => {
        const nodeType = node.data?.type || node.type;
        const isProcessing = node.data?.isPreprocessing === true;
        const isControlNet = nodeType?.includes('control-net') || nodeType === 'seed-image-lights';
        const typeMatches = nodeType === controlNetType;
        
        console.log("📍 Checking node:", {
          id: node.id,
          nodeType,
          isProcessing,
          isControlNet,
          typeMatches
        });
        
        return isControlNet && typeMatches && isProcessing;
      });
      
      if (candidateNodes.length > 0) {
        const targetNode = candidateNodes[0]; // Use the first matching node
        console.log("🎯 Found matching node for fallback update:", targetNode.id);
        
        const preprocessedImageData = {
          guideImageURL: result.guideImageURL,
          preprocessor: result.preprocessor,
          sourceImageUUID: imageUrl,
          timestamp: Date.now(),
        };
        
        RunwareService.globalNodeUpdateCallback(targetNode.id, {
          preprocessedImage: preprocessedImageData,
          preprocessor: result.preprocessor,
          hasPreprocessedImage: true,
          isPreprocessing: false,
          hasError: false,
          errorMessage: undefined,
          right_sidebar: {
            preprocessedImage: result.guideImageURL,
            showPreprocessed: true,
          },
        });
        
        console.log("✅ Fallback node state update completed:", {
          nodeId: targetNode.id,
          guideImageURL: result.guideImageURL
        });
      } else {
        console.warn("⚠️ No matching ControlNet node found for fallback update", {
          controlNetType,
          imageUrl: imageUrl.substring(0, 50) + "..."
        });
      }
    } catch (error) {
      console.error("❌ Error in fallback node update:", error);
    }
  }

  // Get the correct preprocessor for a ControlNet type
  getPreprocessorForControlNet(controlNetType: string): string | null {
    // Import the mapping from controlNetUtils to avoid duplication
    const preprocessorMap: Record<string, string | null> = {
      'control-net-pose': 'openpose',
      'control-net-depth': 'depth',
      'control-net-edge': 'lineart',
      'control-net-segments': 'seg',
      'control-net-normal-map': 'normalbae',
      'control-net-canny': 'canny',
      'seed-image-lights': null // No preprocessing needed
    };
    
    return preprocessorMap[controlNetType] || null;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const CONTROL_NET_PREPROCESSORS: ControlNetPreprocessor[] = [
  {
    id: "canny",
    name: "Canny Edge",
    description: "Detects edges in the image",
    taskType: "imageControlNetPreProcess",
    preprocessor: "canny"
  },
  {
    id: "depth",
    name: "Depth Map", 
    description: "Creates a depth map of the image",
    taskType: "imageControlNetPreProcess",
    preprocessor: "depth"
  },
  {
    id: "pose",
    name: "Human Pose",
    description: "Detects human poses and body structure",
    taskType: "imageControlNetPreProcess", 
    preprocessor: "openpose"
  },
  {
    id: "normal",
    name: "Normal Map",
    description: "Generates surface normal information",
    taskType: "imageControlNetPreProcess",
    preprocessor: "normalbae"
  }
];

// Create singleton instance of the service
let runwareServiceInstance: RunwareService | null = null;
let currentApiKey: string | null = null;

export const getRunwareService = (apiKey: string): RunwareService => {
  if (!runwareServiceInstance || currentApiKey !== apiKey) {
    runwareServiceInstance = new RunwareService(apiKey);
    currentApiKey = apiKey;
  }
  return runwareServiceInstance;
};