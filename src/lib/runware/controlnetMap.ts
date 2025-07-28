export const CONTROLNET_AIR_BY_NODE_TYPE: Record<string, string> = {
  "control-net-pose": "runware:29@1",
  "control-net-edge": "runware:25@1", 
  "control-net-depth": "runware:27@1",
  "control-net-segments": "runware:31@1",
  "control-net-normal-map": "runware:NORMAL@1",
  "control-net-reference": "runware:REFERENCE@1",
  // control-net-lights is NOT a controlnet - handled separately as seed image
};

// Legacy export for backward compatibility
export const CONTROLNET_MODEL_BY_TYPE = CONTROLNET_AIR_BY_NODE_TYPE;