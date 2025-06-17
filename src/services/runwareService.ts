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
  promptWeighting?: "compel" | "sdEmbeds";
  seed?: number | null;
  lora?: {
    name: string;
    strength: number;
  }[];
  controlnet?: {
    type: string;
    imageUrl: string;
    strength: number;
    model?: string;
  }[];
}

// Define the interface for the generated image
export interface GeneratedImage {
  imageURL: string;
  positivePrompt: string;
  seed: number;
  NSFWContent: boolean;
}

// Interface for uploaded image response
export interface UploadedImage {
  imageUUID: string;
  imageURL: string;
}

export class RunwareService {
  // Making apiKey accessible to class methods
  apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  // New method to upload an image to Runware API
  async uploadImage(imageData: string): Promise<UploadedImage> {
    try {
      const authTask = {
        taskType: "authentication",
        apiKey: this.apiKey
      };
      
      const taskUUID = crypto.randomUUID();
      
      const uploadTask = {
        taskType: "imageUpload",
        taskUUID,
        image: imageData
      };
      
      console.log("Sending image upload request to Runware API");
      
      const response = await fetch("https://api.runware.ai/v1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify([authTask, uploadTask])
      });
      
      const data = await response.json();
      
      if (!response.ok || data.errors) {
        console.error("Error response from API:", data);
        const errorMessage = data.errors && data.errors.length > 0 
          ? data.errors[0].message 
          : 'Failed to upload image';
        throw new Error(errorMessage);
      }
      
      // Extract the image upload result
      const result = data.data.find((item: any) => item.taskType === "imageUpload" && item.taskUUID === taskUUID);
      
      if (!result) {
        throw new Error('No image upload result found in the response');
      }
      
      return {
        imageUUID: result.imageUUID,
        imageURL: result.imageURL
      };
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
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
        lora: params.lora || []
      };
      
      // Only add promptWeighting if it's a valid value
      if (params.promptWeighting === "compel" || params.promptWeighting === "sdEmbeds") {
        Object.assign(imageTask, { promptWeighting: params.promptWeighting });
      }
      
      // Remove seed if not provided
      if (params.seed) {
        Object.assign(imageTask, { seed: params.seed });
      }
      
      // Add ControlNet if available
      if (params.controlnet && params.controlnet.length > 0) {
        Object.assign(imageTask, {
          controlNet: params.controlnet.map(cn => {
            // Map each controlnet configuration
            const controlnetConfig: any = {
              type: cn.type,
              guideImage: cn.imageUrl, // Use guideImage parameter instead of imageUrl
              strength: cn.strength
            };
            
            // Map the correct AIR identifier based on controlnet type
            // Using the values from the FLUX.1 controlnet AIR identifiers from the image
            switch (cn.type) {
              case 'canny':
                controlnetConfig.model = "runware:25@1"; // FLUX.1 canny model
                break;
              case 'tile':
                controlnetConfig.model = "runware:26@1"; // FLUX.1 tile model
                break;
              case 'depth':
                controlnetConfig.model = "runware:27@1"; // FLUX.1 depth model
                break;
              case 'blur':
                controlnetConfig.model = "runware:28@1"; // FLUX.1 blur model
                break;
              case 'pose':
                controlnetConfig.model = "runware:29@1"; // FLUX.1 pose model
                break;
              case 'gray':
                controlnetConfig.model = "runware:30@1"; // FLUX.1 gray model
                break;
              case 'segment':
                // For segment, we'll use low quality as it's closest to segment
                controlnetConfig.model = "runware:31@1"; // FLUX.1 low quality model
                break;
              default:
                // Fallback to canny model if type is unknown
                controlnetConfig.model = "runware:25@1";
            }
            
            return controlnetConfig;
          })
        });
      }
      
      console.log("Sending request to Runware API:", [authTask, imageTask]);
      
      const response = await fetch("https://api.runware.ai/v1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify([authTask, imageTask])
      });
      
      const data = await response.json();
      
      if (!response.ok || data.errors) {
        console.error("Error response from API:", data);
        const errorMessage = data.errors && data.errors.length > 0 
          ? data.errors[0].message 
          : 'Failed to generate image';
        throw new Error(errorMessage);
      }
      
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

  // Add a new method to convert a file to a data URL
  async fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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