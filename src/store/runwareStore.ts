import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Status = "idle" | "running" | "succeeded" | "failed" | "canceled";

export interface GenerationRecord {
  id: string;
  workflowId: string;
  outputNodeId: string;
  flow: "t2i" | "i2i" | "flux-kontext" | "tool";
  request: any;
  response?: any;
  status: Status;
  startedAt?: number;
  endedAt?: number;
  error?: string;
}

export interface AssetRecord {
  nodeId: string;
  imageURL?: string;
  imageUUID?: string;
  guidedImageURL?: string; // for controlNet preprocessors
  lastUpdated: number;
}

export interface RunwareStore {
  generations: Record<string, GenerationRecord>;
  assets: Record<string, AssetRecord>;
  
  createGen: (rec: Omit<GenerationRecord, "id" | "status" | "startedAt">) => string;
  setGenStatus: (id: string, status: Status, patch?: Partial<GenerationRecord>) => void;
  upsertAsset: (nodeId: string, patch: Partial<AssetRecord>) => void;
  getAsset: (nodeId: string) => AssetRecord | undefined;
  clearWorkflow: (workflowId: string) => void;
}

export const useRunwareStore = create<RunwareStore>()(
  persist(
    (set, get) => ({
      generations: {},
      assets: {},
      
      createGen: (rec: Omit<GenerationRecord, "id" | "status" | "startedAt">) => {
        const id = crypto.randomUUID();
        const record: GenerationRecord = {
          ...rec,
          id,
          status: "idle",
        };
        
        set((state) => ({
          generations: {
            ...state.generations,
            [id]: record,
          },
        }));
        
        return id;
      },
      
      setGenStatus: (id: string, status: Status, patch?: Partial<GenerationRecord>) => {
        set((state) => {
          const existing = state.generations[id];
          if (!existing) return state;
          
          const updated: GenerationRecord = {
            ...existing,
            status,
            ...(status === "running" && { startedAt: Date.now() }),
            ...(["succeeded", "failed", "canceled"].includes(status) && { endedAt: Date.now() }),
            ...patch,
          };
          
          return {
            generations: {
              ...state.generations,
              [id]: updated,
            },
          };
        });
      },
      
      upsertAsset: (nodeId: string, patch: Partial<AssetRecord>) => {
        set((state) => {
          const existing = state.assets[nodeId];
          const updated: AssetRecord = {
            ...existing,
            nodeId,
            lastUpdated: Date.now(),
            ...patch,
          };
          
          return {
            assets: {
              ...state.assets,
              [nodeId]: updated,
            },
          };
        });
      },
      
      getAsset: (nodeId: string) => {
        const state = get();
        return state.assets[nodeId];
      },
      
      clearWorkflow: (workflowId: string) => {
        set((state) => {
          const filteredGenerations: Record<string, GenerationRecord> = {};
          
          Object.entries(state.generations).forEach(([id, record]) => {
            if (record.workflowId !== workflowId) {
              filteredGenerations[id] = record;
            }
          });
          
          return {
            generations: filteredGenerations,
          };
        });
      },
    }),
    {
      name: 'runware-store',
      partialize: (state) => ({
        generations: state.generations,
        assets: state.assets,
      }),
    }
  )
);