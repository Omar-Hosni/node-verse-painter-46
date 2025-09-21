// RiveInputEngineRation.tsx
// @ts-nocheck
import React, { useEffect, useMemo } from "react";
import { useRive, useViewModelInstanceBoolean } from "@rive-app/react-webgl2";
import { useCanvasStore } from "@/store/useCanvasStore";

// ---- Config ----
const RIVE_PATH = "/rive/engineratio.riv";
const ARTBOARD = "Artboard";            // change if your artboard name differs
const STATE_MACHINE = "State Machine 1"; // change if needed

const ratioOptions = ["1:1", "2:3", "3:2", "9:16", "16:9"] as const;
type Ratio = (typeof ratioOptions)[number];

// Default sizes (feel free to tweak to your engine’s preferred multiples)
const ratioSizeMap: Record<Ratio, { width: number; height: number }> = {
  "1:1":  { width: 512, height: 512 },
  "2:3":  { width: 768, height: 1152 },
  "3:2":  { width: 1152, height: 768 },
  "9:16": { width: 576, height: 1024 },
  "16:9": { width: 1024, height: 576 },
};

// Simple visual tokens that mimic your five ratio icons
const RatioSwatch = ({ ratio, active }: { ratio: Ratio; active: boolean }) => {
  const boxStyles =
    ratio === "1:1"
      ? "w-4 h-4"
      : ratio === "2:3"
      ? "w-3 h-4"
      : ratio === "3:2"
      ? "w-4 h-3"
      : ratio === "9:16"
      ? "w-3 h-5"
      : /* 16:9 */   "w-5 h-3";

  return (
    <span
      className={[
        "inline-flex rounded-sm",
        "border",
        active ? "bg-white border-white" : "bg-[#2a2a2a] border-[#444]",
        boxStyles,
      ].join(" ")}
    />
  );
};

// Rive booleans helper wrapper
const useRatioFlags = (vm: any) => {
  const oneOne       = useViewModelInstanceBoolean("1:1", vm);
  const twoThree     = useViewModelInstanceBoolean("2:3", vm);
  const threeTwo     = useViewModelInstanceBoolean("3:2", vm);
  const nineSixteen  = useViewModelInstanceBoolean("9:16", vm);
  const sixteenNine  = useViewModelInstanceBoolean("16:9", vm);

  const getCurrent = (): Ratio | null => {
    if (oneOne.value) return "1:1";
    if (twoThree.value) return "2:3";
    if (threeTwo.value) return "3:2";
    if (nineSixteen.value) return "9:16";
    if (sixteenNine.value) return "16:9";
    return null;
  };

  const setOnly = (ratio: Ratio) => {
    // ensure exclusivity
    oneOne.setValue(ratio === "1:1");
    twoThree.setValue(ratio === "2:3");
    threeTwo.setValue(ratio === "3:2");
    nineSixteen.setValue(ratio === "9:16");
    sixteenNine.setValue(ratio === "16:9");
  };

  return {
    flags: { oneOne, twoThree, threeTwo, nineSixteen, sixteenNine },
    getCurrent,
    setOnly,
  };
};

const RatioSelector: React.FC<{
  ratio: Ratio;
  onSelect: (r: Ratio) => void;
}> = React.memo(({ ratio, onSelect }) => {
  return (
    <div className="flex bg-[#1a1a1a] rounded-full w-full h-9 p-0.5 gap-0.5">
      {ratioOptions.map((r) => (
        <button
          key={r}
          onClick={() => onSelect(r)}
          className={[
            "flex-1 h-full flex items-center justify-between rounded-full px-3 text-sm transition-all",
            ratio === r ? "bg-[#333] text-white" : "text-[#9e9e9e] hover:text-white",
          ].join(" ")}
          title={r}
        >
          <span>{r}</span>
          <RatioSwatch ratio={r} active={ratio === r} />
        </button>
      ))}
    </div>
  );
});

const RiveInputEngineRation: React.FC = () => {
  const { selectedNode, updateNodeData } = useCanvasStore();

  if (!selectedNode?.data?.right_sidebar) return null;
  const { right_sidebar } = selectedNode.data;
  const { ratio: ratioInStore, size } = right_sidebar;

  const ratio: Ratio = (ratioInStore as Ratio) || "1:1";
  const defaultSize = ratioSizeMap[ratio];
  const width = size?.width ?? defaultSize.width;
  const height = size?.height ?? defaultSize.height;

  // --- Rive init ---
  const { rive, RiveComponent } = useRive({
    src: RIVE_PATH,
    autoplay: true,
    artboard: ARTBOARD,
    autoBind: true,
    stateMachines: STATE_MACHINE,
  });

  // Bind the five boolean toggles
  const ratioVM = useRatioFlags(rive?.viewModelInstance);

  // --- Sync: Rive -> Store ---
  useEffect(() => {
    if (!rive?.viewModelInstance) return;
    const current = ratioVM.getCurrent();
    if (!current) return;

    // If Rive selection differs from store, update store (and size if absent)
    if (current !== ratio || !size?.width || !size?.height) {
      const nextDefault = ratioSizeMap[current];
      updateNodeData(selectedNode.id, {
        right_sidebar: {
          ...right_sidebar,
          ratio: current,
          size: { width: size?.width ?? nextDefault.width, height: size?.height ?? nextDefault.height },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // listen to boolean values
    ratioVM.flags.oneOne.value,
    ratioVM.flags.twoThree.value,
    ratioVM.flags.threeTwo.value,
    ratioVM.flags.nineSixteen.value,
    ratioVM.flags.sixteenNine.value,
  ]);

  // --- Sync: Store -> Rive ---
  useEffect(() => {
    if (!rive?.viewModelInstance) return;
    ratioVM.setOnly(ratio);
  }, [rive, ratio]); // when ratio changes in store, reflect in Rive

  // Ensure we have an initial size for 1:1 on first mount
  useEffect(() => {
    if (!size?.width || !size?.height) {
      updateNodeData(selectedNode.id, {
        right_sidebar: {
          ...right_sidebar,
          ratio: ratio || "1:1",
          size: { width: defaultSize.width, height: defaultSize.height },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle user clicking a ratio button
  const handleSelectRatio = (next: Ratio) => {
    // Update store
    const nextDefault = ratioSizeMap[next];
    updateNodeData(selectedNode.id, {
      right_sidebar: {
        ...right_sidebar,
        ratio: next,
        size: {
          // preserve explicit size if already set; otherwise apply sensible defaults
          width: right_sidebar.size?.width ?? nextDefault.width,
          height: right_sidebar.size?.height ?? nextDefault.height,
        },
      },
    });
    // Update Rive flags
    if (rive?.viewModelInstance) ratioVM.setOnly(next);
  };

  return (
    <div className="text-white">
      {/* Rive preview */}
      <div className="flex items-center">
        <div className="flex-1 flex gap-1.5 justify-center items-center" style={{ minHeight: 235, height: 235 }}>
          <div
            className="w-[235px] h-[235px] overflow-hidden relative"
            style={{ borderRadius: 19, border: "1.5px solid #1d1d1d" }}
          >
            <RiveComponent className="w-full h-full block" style={{ borderRadius: 16 }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiveInputEngineRation;
