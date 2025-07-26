import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GenStatus = "idle" | "running" | "succeeded" | "failed" | "canceled";

export interface GenerationRecord {
  id: string;
  workflowId: string;
  outputNodeId: string;
  request: any;
  response?: any;
  status: GenStatus;
  startedAt?: number;
  endedAt?: number;
  error?: string;
}

export interface RunwareStore {
  generations: Record<string, GenerationRecord>;
  byOutputNode: Record<string, string>;
  
  create: (workflowId: string, outputNodeId: string, request: any) => string;
  setStatus: (id: string, status: GenStatus, patch?: Partial<GenerationRecord>) => void;
  latestForOutput: (outputNodeId: string) => GenerationRecord | undefined;
  clearWorkflow: (workflowId: string) => void;
}

export const useRunwareStore = create<RunwareStore>()(
  persist(
    (set, get) => ({
      generations: {},
      byOutputNode: {},
      
      create: (workflowId: string, outputNodeId: string, request: any) => {
        const id = crypto.randomUUID();
        const record: GenerationRecord = {
          id,
          workflowId,
          outputNodeId,
          request,
          status: "idle",
        };
        
        set((state) => ({
          generations: {
            ...state.generations,
            [id]: record,
          },
          byOutputNode: {
            ...state.byOutputNode,
            [outputNodeId]: id,
          },
        }));
        
        return id;
      },
      
      setStatus: (id: string, status: GenStatus, patch?: Partial<GenerationRecord>) => {
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
      
      latestForOutput: (outputNodeId: string) => {
        const state = get();
        const generationId = state.byOutputNode[outputNodeId];
        return generationId ? state.generations[generationId] : undefined;
      },
      
      clearWorkflow: (workflowId: string) => {
        set((state) => {
          const filteredGenerations: Record<string, GenerationRecord> = {};
          const filteredByOutputNode: Record<string, string> = {};
          
          Object.entries(state.generations).forEach(([id, record]) => {
            if (record.workflowId !== workflowId) {
              filteredGenerations[id] = record;
              if (state.byOutputNode[record.outputNodeId] === id) {
                filteredByOutputNode[record.outputNodeId] = id;
              }
            }
          });
          
          return {
            generations: filteredGenerations,
            byOutputNode: filteredByOutputNode,
          };
        });
      },
    }),
    {
      name: 'runware-store',
      partialize: (state) => ({
        generations: state.generations,
        byOutputNode: state.byOutputNode,
      }),
    }
  )
);