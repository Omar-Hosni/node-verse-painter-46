import { toast } from "sonner";

// Define the parameters for image generation
export interface GenerateImageParams {
  positivePrompt: string;
  negativePrompt?: string;
  model?: string;
  width?: number;
  height?: number;
  numberResults?: number;
  outputFormat?: string;
  CFGScale?: number;
  scheduler?: string;
  steps?: number;
  strength?: number;
  promptWeighting?: "none" | "compel" | "sdEmbeds";
  seed?: number | null;
  lora?: {
    name: string;
    strength: number;
  }[];
  controlnet?: {
    type: string;
    imageUrl: string;
    strength: number;
  }[];
}

// Define the interface for the generated image
export interface GeneratedImage {
  imageURL: string;
  positivePrompt: string;
  seed: number;
  NSFWContent: boolean;
}

export class RunwareService {
  // Making apiKey accessible to class methods
  apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  // Method to generate an image using the Runware API
  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    try {
      const authTask = {
        taskType: "authentication",
        apiKey: this.apiKey
      };
      
      const taskUUID = crypto.randomUUID();
      
      const imageTask = {
        taskType: "imageInference",
        taskUUID,
        positivePrompt: params.positivePrompt,
        negativePrompt: params.negativePrompt || "",
        model: params.model || "runware:100@1",
        width: params.width || 1024,
        height: params.height || 1024,
        numberResults: params.numberResults || 1,
        outputFormat: params.outputFormat || "WEBP",
        CFGScale: params.CFGScale || 7.5,
        scheduler: params.scheduler || "EulerDiscreteScheduler",
        steps: params.steps || 30,
        strength: params.strength || 0.8,
        promptWeighting: params.promptWeighting || "none",
        lora: params.lora || []
      };
      
      // Remove seed if not provided
      if (params.seed) {
        Object.assign(imageTask, { seed: params.seed });
      }
      
      // Add ControlNet if available
      if (params.controlnet && params.controlnet.length > 0) {
        Object.assign(imageTask, {
          controlNet: params.controlnet.map(cn => ({
            type: cn.type,
            imageUrl: cn.imageUrl,
            strength: cn.strength
          }))
        });
      }
      
      const response = await fetch("https://api.runware.ai/v1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify([authTask, imageTask])
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate image');
      }
      
      const data = await response.json();
      
      // Extract the image generation result
      const result = data.data.find((item: any) => item.taskType === "imageInference" && item.taskUUID === taskUUID);
      
      if (!result) {
        throw new Error('No image result found in the response');
      }
      
      return {
        imageURL: result.imageURL,
        positivePrompt: result.positivePrompt,
        seed: result.seed,
        NSFWContent: result.NSFWContent || false
      };
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}

// Create singleton instance of the service
let runwareServiceInstance: RunwareService | null = null;

export const getRunwareService = (apiKey: string): RunwareService => {
  if (!runwareServiceInstance || runwareServiceInstance.apiKey !== apiKey) {
    runwareServiceInstance = new RunwareService(apiKey);
  }
  return runwareServiceInstance;
};
