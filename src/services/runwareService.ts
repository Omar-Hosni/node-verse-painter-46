import { toast } from "sonner";
// runware.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
export type RunwareTask =
  | { taskType: "authentication"; apiKey: string }
  | { taskType: "imageUpload"; taskUUID: string; image: string }
  | {
      taskType: "imageInference";
      taskUUID: string;
      positivePrompt: string;
      negativePrompt?: string;
      // ... other fields
    }
  | {
      taskType: "imageUpscale";
      taskUUID: string;
      imageUUID: string;
      scale?: 2 | 4;
      model?: string;
      faceEnhance?: boolean;
    };

export interface RunwareResponse {
  data: any[];
  errors?: Array<{ message: string; code?: string }>;
}

export interface RunwareServiceOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class RunwareService {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  f: typeof fetch;

  constructor(opts: RunwareServiceOptions) {
    this.apiKey  = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://api.runware.ai/v1").replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 60_000;

    const g = typeof window !== "undefined" ? window : globalThis;
    const nativeFetch = (opts.fetchImpl ?? g.fetch) as typeof fetch | undefined;

    if (!nativeFetch) {
      throw new Error("No fetch available. Provide fetchImpl (e.g., from undici or cross-fetch).");
    }

    // ✅ bind to the correct global
    this.f = nativeFetch.bind(g);
  }


  // ---------- public API ----------

  async uploadImage(imageDataUrl: string, abortSignal?: AbortSignal) {
    const taskUUID = crypto.randomUUID();
    const [, base64] = imageDataUrl.split(",");
    const tasks: RunwareTask[] = [
      { taskType: "authentication", apiKey: this.apiKey },
      { taskType: "imageUpload", taskUUID, image: base64 ?? imageDataUrl }
    ];
    const res = await this.run(tasks, abortSignal);
    const out = this.findByUUID(res, taskUUID);
    return {
      imageUUID: out.imageUUID as string,
      imageURL: out.imageURL as string
    };
  }

  async txt2img(params: GenerateImageParams, abortSignal?: AbortSignal) {
    const taskUUID = crypto.randomUUID();
    const imageTask = this.buildTxt2ImgTask(taskUUID, params);
    const res = await this.run(
      [{ taskType: "authentication", apiKey: this.apiKey }, imageTask],
      abortSignal
    );
    const out = this.findByUUID(res, taskUUID);
    return this.normalizeGenResult(out);
  }

  async img2img(
    imageUUID: string,
    params: Omit<GenerateImageParams, "width" | "height"> & { strength?: number },
    abortSignal?: AbortSignal
  ) {
    const taskUUID = crypto.randomUUID();
    const task = this.buildImg2ImgTask(taskUUID, imageUUID, params);
    const res = await this.run(
      [{ taskType: "authentication", apiKey: this.apiKey }, task],
      abortSignal
    );
    const out = this.findByUUID(res, taskUUID);
    return this.normalizeGenResult(out);
  }

  async upscale(
    imageUUID: string,
    opts: { scale?: 2 | 4; model?: string; faceEnhance?: boolean } = {},
    abortSignal?: AbortSignal
  ) {
    const taskUUID = crypto.randomUUID();
    const task: RunwareTask = {
      taskType: "imageUpscale",
      taskUUID,
      imageUUID,
      scale: opts.scale ?? 4,
      model: opts.model ?? "ESRGAN-4x",
      faceEnhance: opts.faceEnhance ?? false
    };
    const res = await this.run(
      [{ taskType: "authentication", apiKey: this.apiKey }, task],
      abortSignal
    );
    const out = this.findByUUID(res, taskUUID);
    return {
      imageURL: out.imageURL as string,
      imageUUID: out.imageUUID as string
    };
  }

  async applyControlNet(params: GenerateImageParams, abortSignal?: AbortSignal) {
    // Reuse txt2img builder; you already map controlNet inside it.
    return this.txt2img(params, abortSignal);
  }

  /** (Optional) model discovery if Runware supports it */
  async listModels(abortSignal?: AbortSignal) {
    // If Runware exposes a REST model list endpoint, use that instead:
    const res = await this.f(`${this.baseUrl}/models`, { signal: abortSignal });
    if (!res.ok) throw new Error(`listModels failed: ${res.statusText}`);
    return res.json();
  }

  // ---------- private ----------

  private async run(tasks: RunwareTask[], abortSignal?: AbortSignal): Promise<RunwareResponse> {
    const controller = new AbortController();
    const signal = abortSignal ?? controller.signal;
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.f(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tasks),
        signal
      });
      const data: RunwareResponse = await res.json();
      if (!res.ok || data.errors?.length) {
        throw new Error(
          data.errors?.[0]?.message ?? `Runware error (HTTP ${res.status})`
        );
      }
      return data;
    } catch (e) {
      if ((e as any).name === "AbortError") {
        throw new Error(`Runware request timed out after ${this.timeoutMs}ms`);
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }

  private findByUUID(data: RunwareResponse, taskUUID: string) {
    const out = data.data.find((d) => d.taskUUID === taskUUID);
    if (!out) throw new Error("Task result not found");
    return out;
  }

  private normalizeGenResult(item: any) {
    return {
      imageURL: item.imageURL as string,
      positivePrompt: item.positivePrompt as string,
      seed: item.seed as number,
      NSFWContent: Boolean(item.NSFWContent)
    };
  }

  private buildTxt2ImgTask(taskUUID: string, p: GenerateImageParams) {
    const task: any = {
      taskType: "imageInference",
      taskUUID,
      positivePrompt: p.positivePrompt,
      negativePrompt: p.negativePrompt ?? "",
      model: p.model ?? "runware:100@1",
      width: p.width ?? 1024,
      height: p.height ?? 1024,
      numberResults: p.numberResults ?? 1,
      outputFormat: p.outputFormat ?? "WEBP",
      CFGScale: p.CFGScale ?? 7.5,
      scheduler: p.scheduler ?? "EulerDiscreteScheduler",
      steps: p.steps ?? 30,
      strength: p.strength ?? 0.8,
      lora: p.lora ?? []
    };

    if (p.promptWeighting) task.promptWeighting = p.promptWeighting;
    if (p.seed != null) task.seed = p.seed;

    if (p.controlnet?.length) {
      task.controlNet = p.controlnet.map(mapControlNet);
    }

    return task;
  }

  private buildImg2ImgTask(taskUUID: string, imageUUID: string, p: any) {
    const t = this.buildTxt2ImgTask(taskUUID, p);
    t.imageUUID = imageUUID;
    t.taskSubType = "img2img"; // if Runware requires a flag; otherwise omit
    return t;
  }
}

// your original interface reused
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

function mapControlNet(cn: GenerateImageParams["controlnet"][number]) {
  const table: Record<string, string> = {
    canny: "runware:25@1",
    tile: "runware:26@1",
    depth: "runware:27@1",
    blur: "runware:28@1",
    pose: "runware:29@1",
    gray: "runware:30@1",
    segment: "runware:31@1"
  };
  return {
    type: cn.type,
    guideImage: cn.imageUrl,
    strength: cn.strength,
    model: cn.model ?? table[cn.type] ?? table.canny
  };
}

// Singleton (unchanged, but now takes an options object)
let _instance: RunwareService | null = null;
export const getRunwareService = (opts: RunwareServiceOptions) => {
  if (!_instance || _instance.apiKey !== opts.apiKey) {
    _instance = new RunwareService(opts);
  }
  return _instance;
};
