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
import { RgbaColorPicker } from 'react-colorful';
import { Pipette } from 'lucide-react';
import { ColorPicker } from './RightSidebar';
import { toast } from "sonner";

const colorNumberToHexString = (colorNum: number | null) => {
  if (colorNum === null) return "#ffffff";
  const r = (colorNum >> 16) & 0xff;
  const g = (colorNum >> 8) & 0xff;
  const b = colorNum & 0xff;
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

const parseColorToRGB = (color: string) => {
  // Handle rgba format
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1], 10),
      g: parseInt(rgbaMatch[2], 10),
      b: parseInt(rgbaMatch[3], 10)
    };
  }

  // Handle hex format
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
};

const CustomSlider = ({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
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

export const RiveInput: React.FC<{ nodeType: string }> = ({ nodeType }) => {
  const { selectedNode, updateNodeData, runwareApiKey, setRunwareApiKey, nodes, edges } = useCanvasStore();
  const { 
    setNodes, 
    setEdges, 
    initializeServices
  } = useWorkflowStore();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const location = useLocation();
  const projectId = location.pathname.split("/").pop();

    // Initialize workflow services when API key is available
    useEffect(() => {
        if (runwareApiKey) {
          initializeServices(runwareApiKey);
        }
      }, [runwareApiKey, initializeServices]);

    // Get Runware service instance
    const runwareService = useMemo(() => {
    // Use API key from store, fallback to environment variable, then to null
    const apiKey = runwareApiKey || import.meta.env.REACT_APP_RUNWARE_API_KEY || null;
    
    if (!apiKey) {
        console.warn("No Runware API key available. Check runwareApiKey in store or REACT_APP_RUNWARE_API_KEY environment variable.");
        return null;
    }
    
    try {
        console.log("Creating Runware service with API key:", apiKey.substring(0, 8) + "...");
        return getRunwareService(apiKey);
    } catch (error) {
        console.error("Failed to create Runware service:", error);
        return null;
    }
    }, [runwareApiKey]);

  const rivePath = nodeType.includes("pose")
    ? "/rive/pose6.riv"
    : nodeType.includes("lights")
      ? "/rive/lights10.riv"
      : null;

  const artboard = nodeType.includes("lights") ? "Artboard" : "final for nover";

  const isPose = nodeType.includes("pose");

  const isLights = nodeType.includes("lights");
  const { rive, RiveComponent } = useRive({
    src: rivePath || "",
    autoplay: true,
    artboard,
    autoBind: true,
    stateMachines: "State Machine 1",
  });

  const { right_sidebar } = selectedNode?.data;

  const poseValuesRef = {
    zooming: right_sidebar?.zooming,
    neck: right_sidebar?.neck,
    head: right_sidebar?.head,
    stroke: right_sidebar?.stroke,
    ball_size: right_sidebar?.ball_size,
    export_version: right_sidebar?.export_version,

    // Entire location
    entire_location_x: right_sidebar?.entire_location_x,
    entire_location_y: right_sidebar?.entire_location_y,

    // Shoulders
    shoulder_left_x: right_sidebar?.shoulder_left_x,
    shoulder_left_y: right_sidebar?.shoulder_left_y,
    shoulder_right_x: right_sidebar?.shoulder_right_x,
    shoulder_right_y: right_sidebar?.shoulder_right_y,

    // Elbows
    elbow_left_x: right_sidebar?.elbow_left_x,
    elbow_left_y: right_sidebar?.elbow_left_y,
    elbow_right_x: right_sidebar?.elbow_right_x,
    elbow_right_y: right_sidebar?.elbow_right_y,

    // Hands
    hand_left_x: right_sidebar?.hand_left_x,
    hand_left_y: right_sidebar?.hand_left_y,
    hand_right_x: right_sidebar?.hand_right_x,
    hand_right_y: right_sidebar?.hand_right_y,

    // Waist
    waist_left_x: right_sidebar?.waist_left_x,
    waist_left_y: right_sidebar?.waist_left_y,
    waist_right_x: right_sidebar?.waist_right_x,
    waist_right_y: right_sidebar?.waist_right_y,

    // Knees
    knee_left_x: right_sidebar?.knee_left_x,
    knee_left_y: right_sidebar?.knee_left_y,
    knee_right_x: right_sidebar?.knee_right_x,
    knee_right_y: right_sidebar?.knee_right_y,

    // Feet
    foot_left_x: right_sidebar?.foot_left_x,
    foot_left_y: right_sidebar?.foot_left_y,
    foot_right_x: right_sidebar?.foot_right_x,
    foot_right_y: right_sidebar?.foot_right_y
  };


  const lightValuesRef = (i: number) => {
    return right_sidebar?.lights?.find((light) => light.id === i);
  };

  const onChangeLightValue = (i: number, key: string, value: any) => {
    const updatedLights = right_sidebar?.lights?.map(light => {
      if (light?.id === i) {
        return {
          ...light,
          [key]: value
        };
      }
      return light;
    });

    updateNodeData(selectedNode.id, {
      right_sidebar: {
        ...right_sidebar,
        lights: updatedLights,
      },
    });
  };


  // Common view model bindings
  const { value: exportVersion, setValue: setExportVersion } = useViewModelInstanceBoolean("export version", rive?.viewModelInstance);


  // Rive view model bindings for light
  const { value: editingLights, setValue: setEditingLights } = useViewModelInstanceBoolean("editing", rive?.viewModelInstance);

  const lightControls = (i: number) => {
    const { value: color, setValue: setColor, setRgb } = useViewModelInstanceColor(`color${i}`, rive?.viewModelInstance);
    const { value: size, setValue: setSize } = useViewModelInstanceNumber(`size${i}`, rive?.viewModelInstance);
    const { value: width, setValue: setWidth } = useViewModelInstanceNumber(`width${i}`, rive?.viewModelInstance);
    const { value: power, setValue: setPower } = useViewModelInstanceNumber(`power${i}`, rive?.viewModelInstance);
    const { value: selected, setValue: setSelected } = useViewModelInstanceBoolean(`select light ${i}`, rive?.viewModelInstance);
    const { value: angle, setValue: setAngle } = useViewModelInstanceNumber(`angle${i}`, rive?.viewModelInstance);
    const { value: lightLocationX, setValue: setLightLocationX } = useViewModelInstanceNumber(`location${i} X`, rive?.viewModelInstance);
    const { value: lightLocationY, setValue: setLightLocationY } = useViewModelInstanceNumber(`location${i} Y`, rive?.viewModelInstance);
    const { value: lightAdded, setValue: setLightAdded } = useViewModelInstanceBoolean(`add light${i}`, rive?.viewModelInstance);


    return {
      lightGetters: { color, size, width, power, selected, angle, lightLocationX, lightLocationY, lightAdded },
      lightSetters: { setRgb, setColor, setSize, setWidth, setPower, setSelected, setAngle, setLightLocationX, setLightLocationY, setLightAdded }
    };
  };

  // Initial  values
  const lights = [
    lightControls(1),
    lightControls(2),
    lightControls(3),
    lightControls(4),
  ];
  // lights[1].lightSetters.setLightAdded(true)

  // Rive view model bindings for pose
  const { value: zooming, setValue: setZooming } = useViewModelInstanceNumber("zooming", rive?.viewModelInstance);
  const { value: neck, setValue: setNeck } = useViewModelInstanceNumber("neck", rive?.viewModelInstance);
  const { value: head, setValue: setHead } = useViewModelInstanceNumber("head", rive?.viewModelInstance);
  const { value: stroke, setValue: setStroke } = useViewModelInstanceNumber("stroke", rive?.viewModelInstance);
  const { value: ballSize, setValue: setBallSize } = useViewModelInstanceNumber("ball size", rive?.viewModelInstance);

  const { value: entireLocationX, setValue: setEntireLocationX } = useViewModelInstanceNumber("entire location x", rive?.viewModelInstance);
  const { value: entireLocationY, setValue: setEntireLocationY } = useViewModelInstanceNumber("entire location y", rive?.viewModelInstance);

  const { value: shoulderLeftX, setValue: setShoulderLeftX } = useViewModelInstanceNumber("shoulder left x", rive?.viewModelInstance);
  const { value: shoulderLeftY, setValue: setShoulderLeftY } = useViewModelInstanceNumber("shoulder left y", rive?.viewModelInstance);
  const { value: shoulderRightX, setValue: setShoulderRightX } = useViewModelInstanceNumber("shoulder right x", rive?.viewModelInstance);
  const { value: shoulderRightY, setValue: setShoulderRightY } = useViewModelInstanceNumber("shoulder right y", rive?.viewModelInstance);

  const { value: elbowLeftX, setValue: setElbowLeftX } = useViewModelInstanceNumber("elbow left x", rive?.viewModelInstance);
  const { value: elbowLeftY, setValue: setElbowLeftY } = useViewModelInstanceNumber("elbow left y", rive?.viewModelInstance);
  const { value: elbowRightX, setValue: setElbowRightX } = useViewModelInstanceNumber("elbow right x", rive?.viewModelInstance);
  const { value: elbowRightY, setValue: setElbowRightY } = useViewModelInstanceNumber("elbow right y", rive?.viewModelInstance);

  const { value: handLeftX, setValue: setHandLeftX } = useViewModelInstanceNumber("hand left x", rive?.viewModelInstance);
  const { value: handLeftY, setValue: setHandLeftY } = useViewModelInstanceNumber("hand left y", rive?.viewModelInstance);
  const { value: handRightX, setValue: setHandRightX } = useViewModelInstanceNumber("hand right x", rive?.viewModelInstance);
  const { value: handRightY, setValue: setHandRightY } = useViewModelInstanceNumber("hand right y", rive?.viewModelInstance);

  const { value: waistLeftX, setValue: setWaistLeftX } = useViewModelInstanceNumber("waist left x", rive?.viewModelInstance);
  const { value: waistLeftY, setValue: setWaistLeftY } = useViewModelInstanceNumber("waist left y", rive?.viewModelInstance);
  const { value: waistRightX, setValue: setWaistRightX } = useViewModelInstanceNumber("waist right x", rive?.viewModelInstance);
  const { value: waistRightY, setValue: setWaistRightY } = useViewModelInstanceNumber("waist right y", rive?.viewModelInstance);

  const { value: kneeLeftX, setValue: setKneeLeftX } = useViewModelInstanceNumber("knee left x", rive?.viewModelInstance);
  const { value: kneeLeftY, setValue: setKneeLeftY } = useViewModelInstanceNumber("knee left y", rive?.viewModelInstance);
  const { value: kneeRightX, setValue: setKneeRightX } = useViewModelInstanceNumber("knee right x", rive?.viewModelInstance);
  const { value: kneeRightY, setValue: setKneeRightY } = useViewModelInstanceNumber("knee right y", rive?.viewModelInstance);

  const { value: footLeftX, setValue: setFootLeftX } = useViewModelInstanceNumber("foot left x", rive?.viewModelInstance);
  const { value: footLeftY, setValue: setFootLeftY } = useViewModelInstanceNumber("foot left y", rive?.viewModelInstance);
  const { value: footRightX, setValue: setFootRightX } = useViewModelInstanceNumber("foot right x", rive?.viewModelInstance);
  const { value: footRightY, setValue: setFootRightY } = useViewModelInstanceNumber("foot right y", rive?.viewModelInstance);


  //when rive pose changes, update the right sidebar
  useEffect(() => {
    if (!rive || !rive.viewModelInstance) return;
    const updatedPoseValues = {
      entire_location_x: entireLocationX,
      entire_location_y: entireLocationY,

      shoulder_left_x: shoulderLeftX,
      shoulder_left_y: shoulderLeftY,
      shoulder_right_x: shoulderRightX,
      shoulder_right_y: shoulderRightY,

      elbow_left_x: elbowLeftX,
      elbow_left_y: elbowLeftY,
      elbow_right_x: elbowRightX,
      elbow_right_y: elbowRightY,

      hand_left_x: handLeftX,
      hand_left_y: handLeftY,
      hand_right_x: handRightX,
      hand_right_y: handRightY,

      waist_left_x: waistLeftX,
      waist_left_y: waistLeftY,
      waist_right_x: waistRightX,
      waist_right_y: waistRightY,

      knee_left_x: kneeLeftX,
      knee_left_y: kneeLeftY,
      knee_right_x: kneeRightX,
      knee_right_y: kneeRightY,

      foot_left_x: footLeftX,
      foot_left_y: footLeftY,
      foot_right_x: footRightX,
      foot_right_y: footRightY,

      head: head,
      zooming: zooming,
      neck: neck,
      ball_size: ballSize,
      stroke: stroke
    };

    updateNodeData(selectedNode.id, {
      right_sidebar: {
        ...right_sidebar,
        ...updatedPoseValues
      },
    });
  }, [
    entireLocationX, entireLocationY,
    shoulderLeftX, shoulderLeftY, shoulderRightX, shoulderRightY,
    elbowLeftX, elbowLeftY, elbowRightX, elbowRightY,
    handLeftX, handLeftY, handRightX, handRightY,
    waistLeftX, waistLeftY, waistRightX, waistRightY,
    kneeLeftX, kneeLeftY, kneeRightX, kneeRightY,
    footLeftX, footLeftY, footRightX, footRightY,
    head, zooming, neck, ballSize, stroke
  ]);

  //when rive light changes, update the right sidebar
  useEffect(() => {
    if (!rive || !rive.viewModelInstance) return;

    const newLights = right_sidebar.lights.map((light, idx) => {
      const g = lights[idx].lightGetters;

      if (!g.selected) {
        return light; // skip update; preserve as-is
      }

      return {
        ...light,
        selected: g.selected,
        power: g.power,
        width: g.width,
        angle: g.angle,
        locationX: g.lightLocationX,
        locationY: g.lightLocationY,
        ...(idx > 0 ? { add: light.add || g.lightAdded } : {}), // Only lights 2–4 have `add`
      };
    });

    // Prevent unnecessary updates
    const hasChanges = JSON.stringify(newLights) !== JSON.stringify(right_sidebar.lights);
    if (!hasChanges) return;

    updateNodeData(selectedNode.id, {
      right_sidebar: {
        ...right_sidebar,
        lights: newLights,
      },
    });
  }, [
    lights[0].lightGetters.selected, lights[0].lightGetters.power, lights[0].lightGetters.width, lights[0].lightGetters.angle, lights[0].lightGetters.lightLocationX, lights[0].lightGetters.lightLocationY,
    lights[1].lightGetters.selected, lights[1].lightGetters.power, lights[1].lightGetters.width, lights[1].lightGetters.angle, lights[1].lightGetters.lightLocationX, lights[1].lightGetters.lightLocationY, lights[1].lightGetters.lightAdded,
    lights[2].lightGetters.selected, lights[2].lightGetters.power, lights[2].lightGetters.width, lights[2].lightGetters.angle, lights[2].lightGetters.lightLocationX, lights[2].lightGetters.lightLocationY, lights[2].lightGetters.lightAdded,
    lights[3].lightGetters.selected, lights[3].lightGetters.power, lights[3].lightGetters.width, lights[3].lightGetters.angle, lights[3].lightGetters.lightLocationX, lights[3].lightGetters.lightLocationY, lights[3].lightGetters.lightAdded,
  ]);



  //initialize values for pose and light upon rendering/node select 
  useEffect(() => {
    if (!rive || !rive.viewModelInstance) return;

    if (isPose) {
      setZooming(poseValuesRef.zooming);
      setNeck(poseValuesRef.neck);
      setHead(poseValuesRef.head);
      setStroke(poseValuesRef.stroke);
      setBallSize(poseValuesRef.ball_size);
      setExportVersion(poseValuesRef.export_version);

      setEntireLocationX(poseValuesRef.entire_location_x);
      setEntireLocationY(poseValuesRef.entire_location_y);

      setShoulderLeftX(poseValuesRef.shoulder_left_x);
      setShoulderLeftY(poseValuesRef.shoulder_left_y);
      setShoulderRightX(poseValuesRef.shoulder_right_x);
      setShoulderRightY(poseValuesRef.shoulder_right_y);

      setElbowLeftX(poseValuesRef.elbow_left_x);
      setElbowLeftY(poseValuesRef.elbow_left_y);
      setElbowRightX(poseValuesRef.elbow_right_x);
      setElbowRightY(poseValuesRef.elbow_right_y);

      setHandLeftX(poseValuesRef.hand_left_x);
      setHandLeftY(poseValuesRef.hand_left_y);
      setHandRightX(poseValuesRef.hand_right_x);
      setHandRightY(poseValuesRef.hand_right_y);

      setWaistLeftX(poseValuesRef.waist_left_x);
      setWaistLeftY(poseValuesRef.waist_left_y);
      setWaistRightX(poseValuesRef.waist_right_x);
      setWaistRightY(poseValuesRef.waist_right_y);

      setKneeLeftX(poseValuesRef.knee_left_x);
      setKneeLeftY(poseValuesRef.knee_left_y);
      setKneeRightX(poseValuesRef.knee_right_x);
      setKneeRightY(poseValuesRef.knee_right_y);

      setFootLeftX(poseValuesRef.foot_left_x);
      setFootLeftY(poseValuesRef.foot_left_y);
      setFootRightX(poseValuesRef.foot_right_x);
      setFootRightY(poseValuesRef.foot_right_y);
    }

    if (isLights) {
      setEditingLights(true);

      for (let i = 1; i <= 4; i++) {
        const lightRef = lightValuesRef(i);
        if (!lightRef) continue;

        i > 1 ? lights[i - 1].lightSetters.setSelected(false): lights[i - 1].lightSetters.setSelected(true);
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
        const lightRef = lightValuesRef(i)
        if (!lightRef) return;
        lights[i - 1].lightSetters.setLightAdded(lightRef.add ?? false)
      }
    }
  }, [rive])


  useEffect(() => {
    if (!rive) return;
    const canvas = rive.canvas as HTMLCanvasElement;
    if (canvas) {
      canvasRef.current = canvas;
    }
  }, [rive]);


  const handleDone = async () => {
    if (!canvasRef.current) {
      toast.error("Canvas not ready. Please try again.");
      return;
    }

    if (!runwareService) {
      const hasStoreKey = !!runwareApiKey;
      const hasEnvKey = !!import.meta.env.REACT_APP_RUNWARE_API_KEY;
      console.error("Runware service unavailable:", { hasStoreKey, hasEnvKey });
      toast.error("Upload service unavailable. Please configure your Runware API key and try again.");
      return;
    }

    if (!selectedNode) {
      toast.error("No node selected");
      return;
    }

    // Prevent duplicate upload attempts
    if ((selectedNode.data as any)?.isUploading) {
      toast.warning("Upload already in progress. Please wait...");
      return;
    }

    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL("image/png");

      // Convert dataUrl to File for runware service
      const filename = generateImageFilename(nodeType);
      const imageFile = dataUrlToFile(dataUrl, filename);

      // Update node immediately with the image data and loading state
      updateNodeData(selectedNode.id, {
        image: dataUrl,
        imageUrl: dataUrl,
        isUploading: true,
      });

      // Show loading indicator
      toast.loading("Uploading image to Runware...", { id: `upload-${selectedNode.id}` });

      // Upload to Runware with File object and get both UUID and URL
      const uploadResult = await runwareService.uploadImageWithBothValues(
        imageFile
      );
      const { imageUUID, imageURL } = uploadResult;

      // Store workflow-specific metadata according to design
      const getWorkflowSpecificData = (nodeType: string, imageUUID: string, imageURL: string) => {
        const baseData = {
          image: imageURL,
          imageUrl: imageURL,
          imageUUID: imageUUID,
        };

        if (nodeType.includes('pose')) {
          return {
            ...baseData,
            workflowType: 'controlnet' as const,
            controlnetConfig: {
              guideImage: imageURL,
            },
          };
        }

        if (nodeType.includes('lights')) {
          return {
            ...baseData,
            workflowType: 'seedImage' as const,
            seedImageConfig: {
              seedImage: imageURL,
            },
          };
        }

        return baseData;
      };

      const workflowData = getWorkflowSpecificData(nodeType, imageUUID, imageURL);

      // Update with Runware data and workflow-specific metadata
      updateNodeData(selectedNode.id, {
        ...workflowData,
        isUploading: false,
      });

      // Dismiss loading toast and show success message
      toast.dismiss(`upload-${selectedNode.id}`);
      toast.success("Image uploaded successfully! Ready for workflow processing.");
      console.log("Image uploaded to Runware:", { imageUUID, imageURL });
    } catch (error) {
      console.error("Error uploading image:", error);
      
      // Always reset uploading state
      updateNodeData(selectedNode.id, { isUploading: false });
      
      // Dismiss loading toast
      toast.dismiss(`upload-${selectedNode.id}`);
      
      // Provide specific error messages based on error type
      if (error && typeof error === 'object' && 'type' in error) {
        const runwareError = error as any;
        switch (runwareError.type) {
          case 'AUTHENTICATION_ERROR':
            toast.error("Authentication failed. Please check your API key and try again.");
            break;
          case 'NETWORK_ERROR':
            toast.error("Network error. Please check your connection and try again.");
            break;
          case 'VALIDATION_ERROR':
            toast.error(`Invalid input: ${runwareError.message || 'Please check your image and try again.'}`);
            break;
          case 'TIMEOUT_ERROR':
            toast.error("Upload timed out. Please try again with a smaller image or check your connection.");
            break;
          case 'CONNECTION_ERROR':
            toast.error("Connection error. Please check your internet connection and try again.");
            break;
          default:
            toast.error(`Upload failed: ${runwareError.message || 'Please try again.'}`);
        }
      } else if (error instanceof Error) {
        toast.error(`Upload failed: ${error.message}`);
      } else {
        toast.error("An unexpected error occurred during upload. Please try again.");
      }
    }
  };

  //when click done in lights, set export version to true and download image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // User done editing
    if (editingLights === false) {
      for (let i = 1; i <= 4; i++) {
        lights[i - 1].lightSetters.setSelected(false);
      }

      setExportVersion(true);
      const timer = setTimeout(() => {
        handleDone();
        setExportVersion(false);
      }, 100);

      return () => clearTimeout(timer); // Cleanup
    }

    if (editingLights === true) {
      setExportVersion(false);
    }
  }, [editingLights]);

  //when export version is true, upload screenshot for pose
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedNode) return;

    if (exportVersion === true && isPose) {
      const timer = setTimeout(() => {
        handleDone();
        setExportVersion(false);
      }, 100);

      return () => clearTimeout(timer);
    }
    
  }, [exportVersion, selectedNode, isPose]);

  if (!rivePath) return null;

  return (
    <div>
      {/* Rive Preview */}
      <div className="flex items-center">
        <div className="flex-1 flex gap-1.5 justify-center items-center" style={{ minHeight: '235px', height: '235px' }}>
          <div className="w-[235px] h-[235px] overflow-hidden relative" style={{ borderRadius: '19px', border: '1.5px solid #1d1d1d' }}>
            {/* Always render Rive component - RightSidebar handles preprocessed images */}
            <RiveComponent
              className="w-full h-full block"
              canvas={canvasRef.current}
              style={{ borderRadius: '16px' }}
            />
          </div>
        </div>
      </div>

      {isPose && (
        <div className="text-white text-sm space-y-2.5 mt-2.5">
          {/* Export Version - Hidden as requested */}
          <div style={{ display: 'none' }}>
            <input
              type="checkbox"
              checked={poseValuesRef?.export_version ?? false}
              onChange={(e) => {
                setExportVersion(e.target.checked);
                updateNodeData(selectedNode.id, { right_sidebar: { ...right_sidebar, export_version: e.target.checked } });
              }}
            />
          </div>

          {/* Zooming */}
          <div className="flex items-center">
            <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">Zooming</label>
            <div className="flex-1 flex gap-1.5 h-[30px] items-center">
              <div className="flex-1">
                <input
                  type="number"
                  value={poseValuesRef.zooming ?? 100}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setZooming(val);
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...right_sidebar,
                        zooming: val,
                      },
                    });
                  }}
                  className="w-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none focus:bg-[#333333] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ minHeight: '30px', height: '30px' }}
                />
              </div>
              <div className="flex-1 flex items-center">
                <CustomSlider
                  value={poseValuesRef.zooming ?? 100}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) => {
                    setZooming(val);
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...right_sidebar,
                        zooming: val,
                      },
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {/* Neck */}
          <div className="flex items-center">
            <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">Neck</label>
            <div className="flex-1 flex gap-1.5 h-[30px] items-center">
              <div className="flex-1">
                <input
                  type="number"
                  value={poseValuesRef.neck ?? 50}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setNeck(val);
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...right_sidebar,
                        neck: val,
                      },
                    });
                  }}
                  className="w-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none focus:bg-[#333333] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ minHeight: '30px', height: '30px' }}
                />
              </div>
              <div className="flex-1 flex items-center">
                <CustomSlider
                  value={poseValuesRef.neck ?? 50}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) => {
                    setNeck(val);
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...right_sidebar,
                        neck: val,
                      },
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {/* Head */}
          <div className="flex items-center">
            <label className="text-sm text-[#9e9e9e] w-[85px] flex-shrink-0">Head</label>
            <div className="flex-1 flex gap-1.5 h-[30px] items-center">
              <div className="flex-1">
                <input
                  type="number"
                  value={poseValuesRef.head ?? 0}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setHead(val);
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...right_sidebar,
                        head: val,
                      },
                    });
                  }}
                  className="w-full bg-[#1a1a1a] rounded-full px-3 py-1.5 text-sm text-white outline-none focus:bg-[#333333] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ minHeight: '30px', height: '30px' }}
                />
              </div>
              <div className="flex-1 flex items-center">
                <CustomSlider
                  value={poseValuesRef.head ?? 0}
                  min={0}
                  max={100}
                  step={1}
                  onChange={(val) => {
                    setHead(val);
                    updateNodeData(selectedNode.id, {
                      right_sidebar: {
                        ...right_sidebar,
                        head: val,
                      },
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isLights && (
        <div className="text-white text-sm space-y-2.5 mt-2.5">
          {/* Export Version - Hidden as requested */}
          <div style={{ display: 'none' }}>
            <input
              type="checkbox"
              checked={right_sidebar?.export_version ?? false}
              onChange={(e) => {
                setExportVersion(e.target.checked);
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...right_sidebar,
                    export_version: e.target.checked,
                  },
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
      )}
    </div>
  );
};

export default RiveInput;
