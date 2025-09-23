// @ts-nocheck
import React, { useEffect, useMemo } from "react";
import * as Slider from "@radix-ui/react-slider";
import {
  useRive,
  useViewModelInstanceBoolean,
  useViewModelInstanceNumber,
  useViewModelInstanceColor,
} from "@rive-app/react-webgl2";
import { useCanvasStore } from '@/store/useCanvasStore';
import { useLocation } from "react-router-dom";
import { useWorkflowStore } from "@/store/workflowStore";
import { getRunwareService } from "@/services/runwareService";
import { dataUrlToFile, generateImageFilename } from "@/utils/imageUtils";
import { ColorPicker } from './RightSidebar';
import { toast } from "sonner";

/** ------- Utils ------- */
const parseColorToRGB = (color: string) => {
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10)
    };
  }
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
};

/** ------- UI ------- */
const CustomSlider = ({
  value, min, max, step, onChange,
}: {
  value: number; min: number; max: number; step: number; onChange: (val: number) => void;
}) => {
  return (
    <Slider.Root
      className="relative flex items-center select-none touch-none w-full h-5"
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={(val) => onChange(val[0])}
    >
      <Slider.Track className="relative grow rounded-full h-[2px]" style={{ backgroundColor: '#2b2b2b' }}>
        <Slider.Range className="absolute h-full rounded-full" style={{ backgroundColor: '#007AFF' }} />
      </Slider.Track>
      <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow hover:bg-gray-200 focus:outline-none" />
    </Slider.Root>
  );
};

export const RiveInputLights: React.FC = () => {
  const { selectedNode, updateNodeData, runwareApiKey } = useCanvasStore();
  const { initializeServices } = useWorkflowStore();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const location = useLocation();
  const projectId = location.pathname.split("/").pop();

  // Initialize workflow services when API key is available
  useEffect(() => {
    if (runwareApiKey) initializeServices(runwareApiKey);
  }, [runwareApiKey, initializeServices]);

  // Get Runware service instance
  const runwareService = useMemo(() => {
    // SECURITY FIX: Use secure backend instead of exposing API key
    const apiKey = runwareApiKey || "secure-backend";
    if (!runwareApiKey) {
      console.warn("No Runware API key available in store. Using secure backend.");
    }
    try {
      console.log("Creating Runware service");
      return getRunwareService(apiKey);
    } catch (error) {
      console.error("Failed to create Runware service:", error);
      return null;
    }
  }, [runwareApiKey]);

  const rivePath = "/rive/lights10.riv";
  const artboard = "Artboard";

  const { rive, RiveComponent } = useRive({
    src: rivePath,
    autoplay: true,
    artboard,
    autoBind: true,
    stateMachines: "State Machine 1",
  });

  const { right_sidebar } = selectedNode?.data || {};

  // Common
  const onChangeLightValue = (i: number, key: string, value: any) => {
    const updatedLights = right_sidebar?.lights?.map(light => {
      if (light?.id === i) {
        return { ...light, [key]: value };
      }
      return light;
    });

    updateNodeData(selectedNode.id, {
      right_sidebar: { ...right_sidebar, lights: updatedLights },
    });
  };

  // Export flag + "editing" flag for lights
  const { value: exportVersion, setValue: setExportVersion } =
    useViewModelInstanceBoolean("export version", rive?.viewModelInstance);
  const { value: editingLights, setValue: setEditingLights } =
    useViewModelInstanceBoolean("editing", rive?.viewModelInstance);

  // Per-light controls factory
  const lightControls = (i: number) => {
    const { value: color, setValue: setColor, setRgb } =
      useViewModelInstanceColor(`color${i}`, rive?.viewModelInstance);
    const { value: size, setValue: setSize } =
      useViewModelInstanceNumber(`size${i}`, rive?.viewModelInstance);
    const { value: width, setValue: setWidth } =
      useViewModelInstanceNumber(`width${i}`, rive?.viewModelInstance);
    const { value: power, setValue: setPower } =
      useViewModelInstanceNumber(`power${i}`, rive?.viewModelInstance);
    const { value: selected, setValue: setSelected } =
      useViewModelInstanceBoolean(`select light ${i}`, rive?.viewModelInstance);
    const { value: angle, setValue: setAngle } =
      useViewModelInstanceNumber(`angle${i}`, rive?.viewModelInstance);
    const { value: lightLocationX, setValue: setLightLocationX } =
      useViewModelInstanceNumber(`location${i} X`, rive?.viewModelInstance);
    const { value: lightLocationY, setValue: setLightLocationY } =
      useViewModelInstanceNumber(`location${i} Y`, rive?.viewModelInstance);
    const { value: lightAdded, setValue: setLightAdded } =
      useViewModelInstanceBoolean(`add light${i}`, rive?.viewModelInstance);

    return {
      lightGetters: { color, size, width, power, selected, angle, lightLocationX, lightLocationY, lightAdded },
      lightSetters: { setRgb, setColor, setSize, setWidth, setPower, setSelected, setAngle, setLightLocationX, setLightLocationY, setLightAdded }
    };
  };

  // Create controls for 4 lights
  const lights = [lightControls(1), lightControls(2), lightControls(3), lightControls(4)];

  // Helper to read current sidebar light by id
  const lightValuesRef = (i: number) => right_sidebar?.lights?.find((light) => light.id === i);

  // When Rive light values change, update right_sidebar
  useEffect(() => {
    if (!rive || !rive.viewModelInstance) return;

    const newLights = right_sidebar?.lights.map((light, idx) => {
      const g = lights[idx].lightGetters;
      if (!g.selected) return light; // preserve if not selected

      return {
        ...light,
        selected: g.selected,
        power: g.power,
        width: g.width,
        angle: g.angle,
        locationX: g.lightLocationX,
        locationY: g.lightLocationY,
        ...(idx > 0 ? { add: light.add || g.lightAdded } : {}),
      };
    });

    const hasChanges = JSON.stringify(newLights) !== JSON.stringify(right_sidebar.lights);
    if (!hasChanges) return;

    updateNodeData(selectedNode.id, { right_sidebar: { ...right_sidebar, lights: newLights } });
  }, [
    lights[0].lightGetters.selected, lights[0].lightGetters.power, lights[0].lightGetters.width, lights[0].lightGetters.angle, lights[0].lightGetters.lightLocationX, lights[0].lightGetters.lightLocationY,
    lights[1].lightGetters.selected, lights[1].lightGetters.power, lights[1].lightGetters.width, lights[1].lightGetters.angle, lights[1].lightGetters.lightLocationX, lights[1].lightGetters.lightLocationY, lights[1].lightGetters.lightAdded,
    lights[2].lightGetters.selected, lights[2].lightGetters.power, lights[2].lightGetters.width, lights[2].lightGetters.angle, lights[2].lightGetters.lightLocationX, lights[2].lightGetters.lightLocationY, lights[2].lightGetters.lightAdded,
    lights[3].lightGetters.selected, lights[3].lightGetters.power, lights[3].lightGetters.width, lights[3].lightGetters.angle, lights[3].lightGetters.lightLocationX, lights[3].lightGetters.lightLocationY, lights[3].lightGetters.lightAdded,
  ]);

  // Initialize lights values from sidebar when rive is ready
  useEffect(() => {
    if (!rive || !rive.viewModelInstance) return;

    setEditingLights(true);

    for (let i = 1; i <= 4; i++) {
      const lightRef = lightValuesRef(i);
      if (!lightRef) continue;

      // only light 1 starts selected
      i > 1 ? lights[i - 1].lightSetters.setSelected(false) : lights[i - 1].lightSetters.setSelected(true);
      lights[i - 1].lightSetters.setSize(lightRef.size ?? 100);
      lights[i - 1].lightSetters.setWidth(lightRef.width ?? 100);
      lights[i - 1].lightSetters.setPower(lightRef.power ?? 100);

      const { r, g, b } = parseColorToRGB((lightRef.color ?? "#ffffff").toString());
      lights[i - 1].lightSetters.setRgb(r, g, b);

      lights[i - 1].lightSetters.setAngle(lightRef.angle ?? 0);
      lights[i - 1].lightSetters.setLightLocationX(lightRef.locationX ?? 250);
      lights[i - 1].lightSetters.setLightLocationY(lightRef.locationY ?? 250);
    }

    for (let i = 2; i <= 4; i++) {
      const lightRef = lightValuesRef(i);
      if (!lightRef) continue;
      lights[i - 1].lightSetters.setLightAdded(lightRef.add ?? false);
    }
  }, [rive]);

  // Capture canvas element for export
  useEffect(() => {
    if (!rive) return;
    const canvas = rive.canvas as HTMLCanvasElement;
    if (canvas) {
      canvasRef.current = canvas;
    }
  }, [rive]);

  // Upload helper (lights uses seedImage)
  const handleDone = async () => {
    if (!canvasRef.current) {
      toast.error("Canvas not ready. Please try again.");
      return;
    }
    if (!runwareService) {
      console.error("Runware service unavailable");
      toast.error("Upload service unavailable. Please try again.");
      return;
    }
    if (!selectedNode) {
      toast.error("No node selected");
      return;
    }

    if ((selectedNode.data as any)?.isUploading) {
      toast.warning("Upload already in progress. Please wait...");
      return;
    }

    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL("image/png");
      const filename = generateImageFilename("lights");
      const imageFile = dataUrlToFile(dataUrl, filename);

      updateNodeData(selectedNode.id, {
        image: dataUrl,
        imageUrl: dataUrl,
        isUploading: true,
      });

      toast.loading("Uploading image to Runware...", { id: `upload-${selectedNode.id}` });

      const uploadResult = await runwareService.uploadImageWithBothValues(imageFile);
      const { imageUUID, imageURL } = uploadResult;

      const workflowData = {
        image: imageURL,
        imageUrl: imageURL,
        imageUUID,
        workflowType: 'seedImage' as const,
        seedImageConfig: { seedImage: imageURL },
      };

      updateNodeData(selectedNode.id, {
        ...workflowData,
        isUploading: false,
      });

      toast.dismiss(`upload-${selectedNode.id}`);
      toast.success("Image uploaded successfully! Ready for workflow processing.");
      console.log("Image uploaded to Runware (lights):", { imageUUID, imageURL });
    } catch (error) {
      console.error("Error uploading image:", error);
      updateNodeData(selectedNode.id, { isUploading: false });
      toast.dismiss(`upload-${selectedNode.id}`);
      if (error && typeof error === 'object' && 'type' in error) {
        const runwareError = error as any;
        switch (runwareError.type) {
          case 'AUTHENTICATION_ERROR': toast.error("Authentication failed. Please check your API key and try again."); break;
          case 'NETWORK_ERROR': toast.error("Network error. Please check your connection and try again."); break;
          case 'VALIDATION_ERROR': toast.error(`Invalid input: ${runwareError.message || 'Please check your image and try again.'}`); break;
          case 'TIMEOUT_ERROR': toast.error("Upload timed out. Please try again."); break;
          case 'CONNECTION_ERROR': toast.error("Connection error. Please try again."); break;
          default: toast.error(`Upload failed: ${runwareError.message || 'Please try again.'}`);
        }
      } else if (error instanceof Error) {
        toast.error(`Upload failed: ${error.message}`);
      } else {
        toast.error("An unexpected error occurred during upload. Please try again.");
      }
    }
  };

  // When user finishes editingLights => export & upload
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (editingLights === false) {
      for (let i = 1; i <= 4; i++) {
        lights[i - 1].lightSetters.setSelected(false);
      }

      setExportVersion(true);
      const timer = setTimeout(() => {
        handleDone();
        setExportVersion(false);
      }, 100);

      return () => clearTimeout(timer);
    }

    if (editingLights === true) setExportVersion(false);
  }, [editingLights]);

  if (!rivePath) return null;

  return (
    <div>
      {/* Rive Preview */}
      <div className="flex items-center">
        <div className="flex-1 flex gap-1.5 justify-center items-center" style={{ minHeight: '235px', height: '235px' }}>
          <div className="w-[235px] h-[235px] overflow-hidden relative" style={{ borderRadius: '19px', border: '1.5px solid #1d1d1d' }}>
            <RiveComponent className="w-full h-full block" canvas={canvasRef.current} style={{ borderRadius: '16px' }} />
          </div>
        </div>
      </div>

      {/* Lights Controls */}
      <div className="text-white text-sm space-y-2.5 mt-2.5">
        {/* Hidden Export Version (kept for parity) */}
        <div style={{ display: 'none' }}>
          <input
            type="checkbox"
            checked={right_sidebar?.export_version ?? false}
            onChange={(e) => {
              setExportVersion(e.target.checked);
              updateNodeData(selectedNode.id, {
                right_sidebar: { ...right_sidebar, export_version: e.target.checked },
              });
            }}
          />
        </div>

        {(() => {
          const selectedIndex = [0, 1, 2, 3].find(i => lights[i].lightGetters.selected);
          const ref = lightValuesRef(selectedIndex !== undefined ? selectedIndex + 1 : 1);
          const lightSetters = lights[selectedIndex ?? 0].lightSetters;

          return (
            <>
              {/* Power */}
              <div className="flex items-center">
                <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">Power</label>
                <div className="flex-1 flex gap-1.5 h-[30px] items-center">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={ref?.power ?? 100}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(e) => {
                        if (selectedIndex === undefined) return;
                        const val = parseInt(e.target.value);
                        lightSetters.setPower(val);
                        onChangeLightValue(selectedIndex + 1, "power", val);
                      }}
                      className="w-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none focus:bg-[#333333] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ minHeight: '30px', height: '30px' }}
                    />
                  </div>
                  <div className="flex-1 flex items-center">
                    <CustomSlider
                      value={ref?.power ?? 100}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(val) => {
                        if (selectedIndex === undefined) return;
                        lightSetters.setPower(val);
                        onChangeLightValue(selectedIndex + 1, "power", val);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Color */}
              <div className="flex items-center">
                <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">Color</label>
                <div className="flex-1 flex gap-1.5 h-[30px]">
                  <ColorPicker
                    value={ref?.color ?? "#ffffff"}
                    onChange={(value) => {
                      if (selectedIndex === undefined) return;
                      const { r, g, b } = parseColorToRGB(value);
                      lightSetters.setRgb(r, g, b);
                      onChangeLightValue(selectedIndex + 1, "color", value);
                    }}
                  />
                </div>
              </div>

              {/* Width */}
              <div className="flex items-center">
                <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">Width</label>
                <div className="flex-1 flex gap-1.5 h-[30px] items-center">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={ref?.width ?? 100}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(e) => {
                        if (selectedIndex === undefined) return;
                        const val = parseInt(e.target.value);
                        lightSetters.setWidth(val);
                        onChangeLightValue(selectedIndex + 1, "width", val);
                      }}
                      className="w-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none focus:bg-[#333333] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ minHeight: '30px', height: '30px' }}
                    />
                  </div>
                  <div className="flex-1 flex items-center">
                    <CustomSlider
                      value={ref?.width ?? 100}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(val) => {
                        if (selectedIndex === undefined) return;
                        lightSetters.setWidth(val);
                        onChangeLightValue(selectedIndex + 1, "width", val);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Size */}
              <div className="flex items-center">
                <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">Size</label>
                <div className="flex-1 flex gap-1.5 h-[30px] items-center">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={ref?.size ?? 100}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(e) => {
                        if (selectedIndex === undefined) return;
                        const val = parseInt(e.target.value);
                        lightSetters.setSize(val);
                        onChangeLightValue(selectedIndex + 1, "size", val);
                      }}
                      className="w-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none focus:bg-[#333333] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ minHeight: '30px', height: '30px' }}
                    />
                  </div>
                  <div className="flex-1 flex items-center">
                    <CustomSlider
                      value={ref?.size ?? 100}
                      min={0}
                      max={100}
                      step={1}
                      onChange={(val) => {
                        if (selectedIndex === undefined) return;
                        lightSetters.setSize(val);
                        onChangeLightValue(selectedIndex + 1, "size", val);
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default RiveInputLights;
