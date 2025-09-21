// RiveInputImageCorners.tsx
// @ts-nocheck
import React, { useEffect } from "react";
import { useRive, useViewModelInstanceBoolean } from "@rive-app/react-webgl2";
import { useCanvasStore } from "@/store/useCanvasStore";

type Corner =
  | "all"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight";

// ---- Config (adjust if needed) ----
const RIVE_PATH = "/rive/imagecorners2.riv"; // <- replace with your .riv file
const ARTBOARD = "Artboard";                  // <- change if different
const STATE_MACHINE = "State Machine 1";      // <- change if different

// Map store value <-> Rive boolean input names
const storeToRiveKey: Record<Corner, string> = {
  all: "All",
  topLeft: "top left",
  topRight: "top right",
  bottomLeft: "bottom left",
  bottomRight: "bottom right",
};

const riveKeys = [
  "bottom left",
  "bottom right",
  "top left",
  "top right",
  "All",
] as const;

const useCornerFlags = (vm: any) => {
  const bl = useViewModelInstanceBoolean("bottom left", vm);
  const br = useViewModelInstanceBoolean("bottom right", vm);
  const tl = useViewModelInstanceBoolean("top left", vm);
  const tr = useViewModelInstanceBoolean("top right", vm);
  const all = useViewModelInstanceBoolean("All", vm);

  const getCurrent = (): Corner | null => {
    if (all.value) return "all";
    if (tl.value) return "topLeft";
    if (tr.value) return "topRight";
    if (bl.value) return "bottomLeft";
    if (br.value) return "bottomRight";
    return null;
  };

  const setOnly = (corner: Corner) => {
    const want = storeToRiveKey[corner];
    bl.setValue(want === "bottom left");
    br.setValue(want === "bottom right");
    tl.setValue(want === "top left");
    tr.setValue(want === "top right");
    all.setValue(want === "All");
  };

  return {
    flags: { bl, br, tl, tr, all },
    getCurrent,
    setOnly,
  };
};

const RiveInputImageCorners: React.FC = () => {
  const { selectedNode, updateNodeData } = useCanvasStore();

  if (!selectedNode?.data?.right_sidebar) return null;
  const { right_sidebar } = selectedNode.data;

  const activeCorner: Corner = (right_sidebar.activeCorner as Corner) || "all";

  const { rive, RiveComponent } = useRive({
    src: RIVE_PATH,
    autoplay: true,
    artboard: ARTBOARD,
    autoBind: true,
    stateMachines: STATE_MACHINE,
  });

  const corners = useCornerFlags(rive?.viewModelInstance);

  // Store -> Rive (reflect current store corner into Rive)
  useEffect(() => {
    if (!rive?.viewModelInstance) return;
    corners.setOnly(activeCorner);
  }, [rive, activeCorner]);

  // Rive -> Store (when any boolean changes, compute selection and write to store)
  useEffect(() => {
    if (!rive?.viewModelInstance) return;
    const current = corners.getCurrent();
    if (!current) return;
    if (current !== activeCorner) {
      updateNodeData(selectedNode.id, {
        right_sidebar: { ...right_sidebar, activeCorner: current },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    corners.flags.bl.value,
    corners.flags.br.value,
    corners.flags.tl.value,
    corners.flags.tr.value,
    corners.flags.all.value,
  ]);

  return (
    <div className="text-white">
      {/* Rive preview frame (matches your other inputs) */}
        <div
          className="w-[70px] h-[70px] overflow-hidden relative"
          style={{ borderRadius: 19, border: "1.5px solid #1d1d1d" }}
        >
          <RiveComponent className="w-full h-full block" style={{ borderRadius: 16 }} />
        </div>

      {/* (Optional) Local selector — you can keep using your existing
          PropertyRow + CustomSelect outside this component. This is only
          here if you want the control embedded next to the Rive preview.

      <div className="mt-3">
        <div className="bg-[#1a1a1a] rounded-full w-full h-9 p-0.5">
          <select
            className="w-full h-full bg-transparent text-sm px-3"
            value={activeCorner}
            onChange={(e) => {
              const next = e.target.value as Corner;
              updateNodeData(selectedNode.id, {
                right_sidebar: { ...right_sidebar, activeCorner: next },
              });
              if (rive?.viewModelInstance) corners.setOnly(next);
            }}
          >
            <option value="all">All corners</option>
            <option value="topLeft">Top left</option>
            <option value="topRight">Top right</option>
            <option value="bottomLeft">Bottom left</option>
            <option value="bottomRight">Bottom right</option>
          </select>
        </div>
      </div>
      */}
    </div>
  );
};

export default RiveInputImageCorners;
