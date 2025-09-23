// @ts-nocheck
import React, { useEffect, useMemo } from "react";
import * as Slider from "@radix-ui/react-slider";
import {
  useRive,
  useViewModelInstanceBoolean,
  useViewModelInstanceNumber,
} from "@rive-app/react-webgl2";
import { useCanvasStore } from '@/store/useCanvasStore';
import { useLocation } from "react-router-dom";
import { useWorkflowStore } from "@/store/workflowStore";
import { getRunwareService } from "@/services/runwareService";
import { dataUrlToFile, generateImageFilename } from "@/utils/imageUtils";
import { toast } from "sonner";

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

export const RiveInputPose: React.FC = () => {
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
    const apiKey = runwareApiKey || import.meta.env.REACT_APP_RUNWARE_API_KEY || null;
    if (!apiKey) {
      console.warn("No Runware API key available. Check runwareApiKey in store or REACT_APP_RUNWARE_API_KEY.");
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

  const rivePath = "/rive/pose6.riv";
  const artboard = "final for nover";

  const { rive, RiveComponent } = useRive({
    src: rivePath,
    autoplay: true,
    artboard,
    autoBind: true,
    stateMachines: "State Machine 1",
  });

  const { right_sidebar } = selectedNode?.data || {};

  // Pose view model bindings
  const { value: exportVersion, setValue: setExportVersion } =
    useViewModelInstanceBoolean("export version", rive?.viewModelInstance);

  const { value: zooming, setValue: setZooming } =
    useViewModelInstanceNumber("zooming", rive?.viewModelInstance);
  const { value: neck, setValue: setNeck } =
    useViewModelInstanceNumber("neck", rive?.viewModelInstance);
  const { value: head, setValue: setHead } =
    useViewModelInstanceNumber("head", rive?.viewModelInstance);
  const { value: stroke, setValue: setStroke } =
    useViewModelInstanceNumber("stroke", rive?.viewModelInstance);
  const { value: ballSize, setValue: setBallSize } =
    useViewModelInstanceNumber("ball size", rive?.viewModelInstance);

  const { value: entireLocationX, setValue: setEntireLocationX } =
    useViewModelInstanceNumber("entire location x", rive?.viewModelInstance);
  const { value: entireLocationY, setValue: setEntireLocationY } =
    useViewModelInstanceNumber("entire location y", rive?.viewModelInstance);

  const { value: shoulderLeftX, setValue: setShoulderLeftX } =
    useViewModelInstanceNumber("shoulder left x", rive?.viewModelInstance);
  const { value: shoulderLeftY, setValue: setShoulderLeftY } =
    useViewModelInstanceNumber("shoulder left y", rive?.viewModelInstance);
  const { value: shoulderRightX, setValue: setShoulderRightX } =
    useViewModelInstanceNumber("shoulder right x", rive?.viewModelInstance);
  const { value: shoulderRightY, setValue: setShoulderRightY } =
    useViewModelInstanceNumber("shoulder right y", rive?.viewModelInstance);

  const { value: elbowLeftX, setValue: setElbowLeftX } =
    useViewModelInstanceNumber("elbow left x", rive?.viewModelInstance);
  const { value: elbowLeftY, setValue: setElbowLeftY } =
    useViewModelInstanceNumber("elbow left y", rive?.viewModelInstance);
  const { value: elbowRightX, setValue: setElbowRightX } =
    useViewModelInstanceNumber("elbow right x", rive?.viewModelInstance);
  const { value: elbowRightY, setValue: setElbowRightY } =
    useViewModelInstanceNumber("elbow right y", rive?.viewModelInstance);

  const { value: handLeftX, setValue: setHandLeftX } =
    useViewModelInstanceNumber("hand left x", rive?.viewModelInstance);
  const { value: handLeftY, setValue: setHandLeftY } =
    useViewModelInstanceNumber("hand left y", rive?.viewModelInstance);
  const { value: handRightX, setValue: setHandRightX } =
    useViewModelInstanceNumber("hand right x", rive?.viewModelInstance);
  const { value: handRightY, setValue: setHandRightY } =
    useViewModelInstanceNumber("hand right y", rive?.viewModelInstance);

  const { value: waistLeftX, setValue: setWaistLeftX } =
    useViewModelInstanceNumber("waist left x", rive?.viewModelInstance);
  const { value: waistLeftY, setValue: setWaistLeftY } =
    useViewModelInstanceNumber("waist left y", rive?.viewModelInstance);
  const { value: waistRightX, setValue: setWaistRightX } =
    useViewModelInstanceNumber("waist right x", rive?.viewModelInstance);
  const { value: waistRightY, setValue: setWaistRightY } =
    useViewModelInstanceNumber("waist right y", rive?.viewModelInstance);

  const { value: kneeLeftX, setValue: setKneeLeftX } =
    useViewModelInstanceNumber("knee left x", rive?.viewModelInstance);
  const { value: kneeLeftY, setValue: setKneeLeftY } =
    useViewModelInstanceNumber("knee left y", rive?.viewModelInstance);
  const { value: kneeRightX, setValue: setKneeRightX } =
    useViewModelInstanceNumber("knee right x", rive?.viewModelInstance);
  const { value: kneeRightY, setValue: setKneeRightY } =
    useViewModelInstanceNumber("knee right y", rive?.viewModelInstance);

  const { value: footLeftX, setValue: setFootLeftX } =
    useViewModelInstanceNumber("foot left x", rive?.viewModelInstance);
  const { value: footLeftY, setValue: setFootLeftY } =
    useViewModelInstanceNumber("foot left y", rive?.viewModelInstance);
  const { value: footRightX, setValue: setFootRightX } =
    useViewModelInstanceNumber("foot right x", rive?.viewModelInstance);
  const { value: footRightY, setValue: setFootRightY } =
    useViewModelInstanceNumber("foot right y", rive?.viewModelInstance);

  // Snapshot of current sidebar pose values
  const poseValuesRef = {
    zooming: right_sidebar?.zooming,
    neck: right_sidebar?.neck,
    head: right_sidebar?.head,
    stroke: right_sidebar?.stroke,
    ball_size: right_sidebar?.ball_size,
    export_version: right_sidebar?.export_version,
    entire_location_x: right_sidebar?.entire_location_x,
    entire_location_y: right_sidebar?.entire_location_y,
    shoulder_left_x: right_sidebar?.shoulder_left_x,
    shoulder_left_y: right_sidebar?.shoulder_left_y,
    shoulder_right_x: right_sidebar?.shoulder_right_x,
    shoulder_right_y: right_sidebar?.shoulder_right_y,
    elbow_left_x: right_sidebar?.elbow_left_x,
    elbow_left_y: right_sidebar?.elbow_left_y,
    elbow_right_x: right_sidebar?.elbow_right_x,
    elbow_right_y: right_sidebar?.elbow_right_y,
    hand_left_x: right_sidebar?.hand_left_x,
    hand_left_y: right_sidebar?.hand_left_y,
    hand_right_x: right_sidebar?.hand_right_x,
    hand_right_y: right_sidebar?.hand_right_y,
    waist_left_x: right_sidebar?.waist_left_x,
    waist_left_y: right_sidebar?.waist_left_y,
    waist_right_x: right_sidebar?.waist_right_x,
    waist_right_y: right_sidebar?.waist_right_y,
    knee_left_x: right_sidebar?.knee_left_x,
    knee_left_y: right_sidebar?.knee_left_y,
    knee_right_x: right_sidebar?.knee_right_x,
    knee_right_y: right_sidebar?.knee_right_y,
    foot_left_x: right_sidebar?.foot_left_x,
    foot_left_y: right_sidebar?.foot_left_y,
    foot_right_x: right_sidebar?.foot_right_x,
    foot_right_y: right_sidebar?.foot_right_y,
  };

  // Update right_sidebar when Rive pose values change
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
      head, zooming, neck, ball_size: ballSize, stroke,
    };

    updateNodeData(selectedNode.id, {
      right_sidebar: { ...right_sidebar, ...updatedPoseValues },
    });
  }, [
    entireLocationX, entireLocationY,
    shoulderLeftX, shoulderLeftY, shoulderRightX, shoulderRightY,
    elbowLeftX, elbowLeftY, elbowRightX, elbowRightY,
    handLeftX, handLeftY, handRightX, handRightY,
    waistLeftX, waistLeftY, waistRightX, waistRightY,
    kneeLeftX, kneeLeftY, kneeRightX, kneeRightY,
    footLeftX, footLeftY, footRightX, footRightY,
    head, zooming, neck, ballSize, stroke,
  ]);

  // Initialize pose values from sidebar when component (or rive) is ready
  useEffect(() => {
    if (!rive || !rive.viewModelInstance) return;

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
  }, [rive]);

  // Capture canvas element for export
  useEffect(() => {
    if (!rive) return;
    const canvas = rive.canvas as HTMLCanvasElement;
    if (canvas) {
      canvasRef.current = canvas;
    }
  }, [rive]);

  // Upload helper (pose uses controlnet/guideImage)
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

    if ((selectedNode.data as any)?.isUploading) {
      toast.warning("Upload already in progress. Please wait...");
      return;
    }

    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL("image/png");
      const filename = generateImageFilename("pose");
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
        workflowType: 'controlnet' as const,
        controlnetConfig: { guideImage: imageURL },
      };

      updateNodeData(selectedNode.id, {
        ...workflowData,
        isUploading: false,
      });

      toast.dismiss(`upload-${selectedNode.id}`);
      toast.success("Image uploaded successfully! Ready for workflow processing.");
      console.log("Image uploaded to Runware (pose):", { imageUUID, imageURL });
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

  // When exportVersion is set to true => upload screenshot for pose
  const isPose = selectedNode?.data?.type.includes("pose");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedNode) return;

    if (exportVersion === true) {
      const timer = setTimeout(() => {
        handleDone();
        setExportVersion(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [exportVersion, selectedNode, rive, isPose, canvasRef.current]);

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

      {/* Pose Controls */}
      <div className="text-white text-sm space-y-2.5 mt-2.5">
        {/* Hidden Export Version (kept for parity) */}
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
                  updateNodeData(selectedNode.id, { right_sidebar: { ...right_sidebar, zooming: val } });
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
                  updateNodeData(selectedNode.id, { right_sidebar: { ...right_sidebar, zooming: val } });
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
                  updateNodeData(selectedNode.id, { right_sidebar: { ...right_sidebar, neck: val } });
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
                  updateNodeData(selectedNode.id, { right_sidebar: { ...right_sidebar, neck: val } });
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
                  updateNodeData(selectedNode.id, { right_sidebar: { ...right_sidebar, head: val } });
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
                  updateNodeData(selectedNode.id, { right_sidebar: { ...right_sidebar, head: val } });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiveInputPose;
