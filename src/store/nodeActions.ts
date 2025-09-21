// @ts-nocheck
import { Node, NodeChange, applyNodeChanges } from "@xyflow/react";
import { NodeType } from "./types";
import { Edge } from "@xyflow/react";
import { merge } from "lodash";

let nodeIdCounter = 1;
let globalOrderCounter = 1000;

let iconBgColorChoices = [
  "Pink",
  "Blue",
  "Cyan",
  "Purple",
  "Orange",
  "Red",
  "Green",
];
let iconsChoices = ["🎨", "🔥", "🖼️", "😏", "😉", "❤️", "✨"];

const getRandomItem = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const createNode = (
  nodeType: NodeType,
  position: { x: number; y: number },
  order
): Node => {
  const id = `${nodeType}-${nodeIdCounter++}`;
  let newNode: Node;

  // Handle nodes based on schema design attribute
  if (
    nodeType.startsWith("control-net-") ||
    nodeType.startsWith("image-to-image-") ||
    nodeType === "input-text" ||
    nodeType === "connector" ||
    nodeType.startsWith("engine-") ||
    nodeType.startsWith("gear-") ||
    nodeType === "text-tool" ||
    nodeType === "seed-image-lights"
  ) {
    // These use normal-node design
    const displayName = getDisplayNameFromType(nodeType);
    console.log(getFunctionalityFromType(nodeType));

    // Special handling for text-tool to use text-node type
    const reactFlowNodeType =
      nodeType === "text-tool" ? "text-node" : "normal-node";

    newNode = {
      id,
      type: reactFlowNodeType,
      position,
      zIndex: order,
      draggable: true, // New nodes are draggable by default (not pinned)
      data: {
        type: nodeType,
        functionality: getFunctionalityFromType(nodeType),
        displayName,
        nodeShape: "rectangle",
        nodeStyle:
          nodeType.includes("engine") ||
          nodeType.includes("gear") ||
          nodeType === "input-text" ||
          nodeType === "image-to-image-reangle" ||
          nodeType === "control-net-pose" ||
          nodeType === "seed-image-lights" ||
          nodeType === "control-net-edge" ||
          nodeType === "control-net-depth" ||
          nodeType === "control-net-reference"
            ? "accent"
            : undefined,
        order,
        zIndex: order,
        color: "Black",
        icon: getRandomItem(iconsChoices),
        iconBgColor: getRandomItem(iconBgColorChoices),
        // Add width and height for text-tool
        ...(nodeType === "text-tool" ? { width: 200, height: 100 } : {}),
        // Add default right_sidebar data based on type
        right_sidebar: {
          ...getDefaultDataForType(nodeType),
          image_input: null,
          image_url: getImageUrlForEngineOrGear(nodeType),
        },
        // Initialize ControlNet-specific fields
        ...(nodeType.startsWith("control-net-") || nodeType === "seed-image-lights" ? {
          preprocessedImage: undefined,
          isPreprocessing: false,
          hasPreprocessedImage: false,
          preprocessor: undefined,
        } : {}),
      },
      className: nodeType === "text-tool" ? "node-text" : "node-normal",
    };
  }

  //Preview  Node
  else if (nodeType === "preview-realtime-node") {
    newNode = {
      id,
      type: "preview-realtime-node",
      position,
      draggable: true, // New nodes are draggable by default (not pinned)
      data: {
        type: nodeType,
        functionality: "output",
        displayName: "Preview Layer",
        image: null,
        uploading: false,
        label: "Preview Layer",
        order,
      },
      className: "node-layer-preview",
    };
  }
  // Preview Image Node (Image Output)
  else if (nodeType === "preview-image") {
    newNode = {
      id,
      type: "previewNode",
      position,
      zIndex: order,
      draggable: true, // New nodes are draggable by default (not pinned)
      data: {
        type: nodeType,
        functionality: "output",
        displayName: "Image Output",
        image: null,
        uploading: false,
        label: "Image Output",
        order,
        zIndex: order,
        width: 1024,
        height: 1024,
        aspectRatioLocked: true,
        storedAspectRatio: 1024 / 1024, // Store the aspect ratio (1)
      },
      style: {
        width: 1024,
        height: 1024,
      },
      className: "node-preview",
    };
  }
  // Shape Nodes (Rectangle, Circle, Star)
  else if (
    nodeType === "rectangle-node" ||
    nodeType === "circle-node" ||
    nodeType === "star-node"
  ) {
    const displayName = getDisplayNameFromType(nodeType);

    newNode = {
      id,
      type: nodeType,
      position,
      zIndex: order,
      draggable: true,
      data: {
        type: nodeType,
        displayName,
        order,
        zIndex: order,
        width: 200,
        height: 200,
        right_sidebar: {
          pin: false,
          visibility: true,
          opacity: 100,
          blendMode: "normal",
          fillColor: "#007AFF",
          strokeColor: "#FFFFFF",
          strokeWidth: 0,
          strokeStyle: "solid" as const,
          aspectRatioLocked: false,
          ...(nodeType === "rectangle-node"
            ? {
                cornerRadius: 0,
                activeCorner: "all",
                corners: {
                  topLeft: 0,
                  topRight: 0,
                  bottomLeft: 0,
                  bottomRight: 0,
                },
              }
            : {}),
          ...(nodeType === "star-node"
            ? {
                starCount: 5,
                starAngle: 40,
                cornerRadius: 0,
                activeCorner: "all",
                corners: {
                  topLeft: 0,
                  topRight: 0,
                  bottomLeft: 0,
                  bottomRight: 0,
                },
              }
            : {}),
        },
      },
      className: `node-${nodeType.replace("-node", "")}`,
    };
  }
  // Frame Node
  else if (nodeType === "frame-node") {
    newNode = {
      id,
      type: "frame-node",
      position,
      zIndex: order,
      draggable: true,
      data: {
        type: nodeType,
        displayName: "Frame",
        label: "New Frame",
        order,
        zIndex: order,
        width: 1024,
        height: 1024,
        children: [],
        right_sidebar: {
          cornerRadius: 0,
          activeCorner: "all",
          corners: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0,
          },
        },
      },
      style: {
        width: 1024,
        height: 1024,
      },
      className: "node-frame",
    };
  } else {
    throw new Error(`Unknown node type: ${nodeType}`);
  }

  return newNode;
};

// Helper functions for node creation
export const getDisplayNameFromType = (nodeType: string): string => {
  const typeMap: Record<string, string> = {
    "control-net-pose": "Pose Control",
    "control-net-edge": "Edge Control",
    "control-net-lights": "Lights Control",
    "control-net-face": "Face Express",
    "control-net-segments": "Segments",
    "control-net-depth": "Depth Control",
    "control-net-normal-map": "Normal Map",
    "control-net-reference": "Reference",
    "seed-image-lights": "Lights Control",

    "image-to-image-reimagine": "Re-Imagine",
    "image-to-image-rescene": "Re-Scene",
    "image-to-image-object-relight": "Object Re-Light",
    "image-to-image-reangle": "Re-Angle",
    "image-to-image-remove-bg": "Remove BG",
    "image-to-image-remix": "Re-Mix",
    "image-to-image-upscale": "Upscale",
    "image-to-image-inpainting": "In-Painting",
    "image-to-image-remove-outpainting": "Out-Painting",
    "image-to-image-3d-maker": "3D Maker",
    "input-text": "Text Prompt",
    "image-to-image-merger": "Merger",
    "connector": "Router",

    "preview-image": "Image Output",
    "preview-realtime": "Real-Time Preview",

    "text-tool": "Text Tool",
    "rectangle-node": "Rectangle",
    "circle-node": "Circle",
    "star-node": "Star",
    "frame-node": "Frame",

    "engine-real": "Nover Real",
    "engine-style": "Nover Style",
    "engine-draw": "Nover Draw",
    "engine-chic": "Nover Chic",
    "engine-ads": "Nover Ads",
    "engine-home": "Nover Home",

  "gear-2d-blue-surrealism": "2D Blue Surrealism",
  "gear-2d-cartoon-style": "2D Cartoon Style",
  "gear-2d-dark-digital-painting": "2D Dark Digital Painting",
  "gear-2d-fine-digital-painting": "2D Fine Digital Painting",
  "gear-2d-flat-illustration": "2D Flat Illustration",
  "gear-2d-game-typography": "2D Game Typography",
  "gear-2d-morning-vibes-art": "2D Morning Vibes Art",
  "gear-2d-pencil-sketch": "2D Pencil Sketch",
  "gear-2d-printer-flat-art": "2D Printer Flat Art",
  "gear-2d-round-character": "2D Round Character",
  "gear-2d-stamp-flat-art": "2D Stamp Flat Art",
  "gear-2d-vivid-digital-painting": "2D Vivid Digital Painting",
  "gear-2d-vivid-flat-art": "2D Vivid Flat Art",
  "gear-2d-western-anime-style": "2D Western Anime Style",

  "gear-3d-clay-character": "3D Clay Character",
  "gear-3d-detailed-3d": "Detailed 3D",
  "gear-3d-fat-3d-icon": "Fat 3D Icon",
  "gear-3d-flat-scene": "3D  Flat Scene",
  "gear-3d-icon-design": "3D  Icon Design",
  "gear-3d-avatar-character": "3D  Avatar Character",
  "gear-3d-poster": "3D  Poster",
  "gear-3d-vivid-3d-object": "Vivid 3D Object",

  "gear-camera-extreme": "Camera Extreme",
  "gear-camera-figh-eye-lens": "Camera Fisheye Lens",
  "gear-camera-wide-angle-lens": "Camera Wide Angle Lens",

  "gear-portrait-commercial-shot": "Commercial Shot",
  "gear-portrait-extreme-fashion": "Extreme Fashion",
  "gear-portrait-fashion-magazine": "Fashion Magazine",
  "gear-portrait-fit-sport-wear": "Fit Sport Wear",
  "gear-portrait-future-fashion": "Future Fashion",
  "gear-portrait-future-lady": "Future Lady",
  "gear-portrait-happy-breakfast": "Happy Breakfast",
  "gear-portrait-headphones": "Headphones",
  "gear-portrait-street-fashion": "Street Fashion",
  "gear-portrait-tech-product-holder": "Tech Product Holder",

  "gear-product-shoot-air-fit": "Air Fit",
  "gear-product-shoot-arctic-aesthetics": "Arctic Aesthetics",
  "gear-product-shoot-cinematic-product": "Cinematic Product",
  "gear-product-shoot-clean-clothes": "Clean Clothes",
  "gear-product-shoot-dynamic-shot": "Dynamic Shot",
  "gear-product-shoot-fine-texture-shot": "Fine Texture Shot",
  "gear-product-shoot-food-photography": "Food Photography",
  "gear-product-shoot-green-shot": "Green Shot",
  "gear-product-shoot-hold-my-product": "Hold My Product",
  "gear-product-shoot-natural-commerce": "Natural Commerce",
  "gear-product-shoot-wooden-shot": "Wooden Shot",

  "gear-scene-dreamscape-location": "Dreamscape Location",
  "gear-scene-fresh-air": "Fresh Air",
  "gear-scene-hyper-reality": "Hyper Reality",
  "gear-scene-minimal-3d-location": "Minimal 3D Location",

  "gear-style-charming-fluidity": "Charming Fluidity",
  "gear-style-dark-street": "Dark Street",
  "gear-style-deep-emotions": "Deep Emotions",
  "gear-style-glowing-light": "Glowing Light",
  "gear-style-green-tone": "Green Tone",
  "gear-style-high-exposure": "High Exposure",
  "gear-style-light-and-shadow": "Light and Shadow",
  "gear-style-morning-hour": "Morning Hour",
  "gear-style-motion-blur": "Motion Blur",
  "gear-style-nostalgic-moment": "Nostalgic Moment",
  "gear-style-quiet-city": "Quiet City",
  "gear-style-saturated-food": "Saturated Food",
  "gear-style-sunlight": "Sunlight",
  "gear-style-synthwave-photography": "Synthwave Photography",
  "gear-style-vibrant-morning": "Vibrant Morning",
  "gear-style-vintage-showa": "Vintage Showa",
  "gear-style-visual-tension": "Visual Tension"
  };
  return typeMap[nodeType] || nodeType;
};

const getFunctionalityFromType = (nodeType: string): string => {
  if (nodeType.startsWith("control-net-")) return "control-net";
  if (nodeType.startsWith("image-to-image-")) return "image-to-image";
  if (nodeType === "input-text") return "input";
  if (nodeType === "connector") return "helper";
  if (nodeType === "text-tool") return "text-tool";
  if (nodeType.startsWith("preview-")) return "preview";
  if (nodeType.startsWith("engine-")) return "engine";
  if (nodeType.startsWith("gear-")) return "gear";
  if (
    nodeType.endsWith("-node") &&
    ["rectangle", "circle", "star"].some((shape) => nodeType.includes(shape))
  )
    return "shape";
  if (nodeType === "frame-node") return "frame";
  return "unknown";
};

const getDefaultDataForType = (nodeType: string): Record<string, any> => {
  // add data.right_sidebar based on node type from schema

  const defaults: Record<string, any> = {
    "control-net-pose": {
      template: "",
      source: "",
      zooming: 100,
      neck: 50,
      head: 0,
      stroke: 500,
      ball_size: 1000,
      export_version: false,
      selected: false,

      // Entire location
      entire_location_x: 290,
      entire_location_y: 318,

      // Shoulders
      shoulder_left_x: -47.12242126464844,
      shoulder_left_y: -161.46728515625,
      shoulder_right_x: 45.875,
      shoulder_right_y: -161.46990966796875,

      // Elbows
      elbow_left_x: -79.12069702148438,
      elbow_left_y: -51.96641540527344,
      elbow_right_x: 102.375,
      elbow_right_y: -181.46990966796875,

      // Hands
      hand_left_x: -67.125,
      hand_left_y: -21.96990966796875,
      hand_right_x: 106,
      hand_right_y: -244.5,

      // Waist
      waist_left_x: -28.625,
      waist_left_y: -12.96990966796875,
      waist_right_x: 28.375,
      waist_right_y: -12.96990966796875,

      // Knees
      knee_left_x: -41.125,
      knee_left_y: 90.03009033203125,
      knee_right_x: 39.875,
      knee_right_y: 90.03009033203125,

      // Feet
      foot_left_x: -49,
      foot_left_y: 200,
      foot_right_x: 48.375,
      foot_right_y: 200.03009033203125,
    },
    "control-net-edge": {
      image: "",
      type: "source",
      source: "",
      map: "",
    },
    "seed-image-lights": {
      export_version: false,
      editing: true,
      lights: [
        {
          id: 1,
          selected: false,
          size: 100,
          width: 100,
          power: 100,
          color: "#ffffff",

          angle: 0,
          locationX: 248,
          locationY: 258,
        },
        {
          id: 2,
          selected: false,
          size: 100,
          width: 100,
          power: 100,
          color: "#ffffff",

          add: false,
          angle: 0,
          locationX: 240,
          locationY: 255,
        },
        {
          id: 3,
          selected: false,
          size: 100,
          width: 100,
          power: 100,
          color: "#ffffff",

          add: false,
          angle: 0,
          locationX: 255,
          locationY: 265,
        },
        {
          id: 4,
          selected: false,
          size: 100,
          width: 100,
          power: 100,
          color: "#ffffff",

          add: false,
          angle: 0,
          locationX: 270,
          locationY: 240,
        },
      ],
    },
    "image-to-image-object-relight": {
      export_version: false,
      editing: true,
      lights: [
        {
          id: 1,
          selected: false,
          size: 100,
          width: 100,
          power: 100,
          color: "#ffffff",

          angle: 0,
          locationX: 248,
          locationY: 258,
        },
        {
          id: 2,
          selected: false,
          size: 100,
          width: 100,
          power: 100,
          color: "#ffffff",

          add: false,
          angle: 0,
          locationX: 240,
          locationY: 255,
        },
        {
          id: 3,
          selected: false,
          size: 100,
          width: 100,
          power: 100,
          color: "#ffffff",

          add: false,
          angle: 0,
          locationX: 255,
          locationY: 265,
        },
        {
          id: 4,
          selected: false,
          size: 100,
          width: 100,
          power: 100,
          color: "#ffffff",

          add: false,
          angle: 0,
          locationX: 270,
          locationY: 240,
        },
      ],
    },
    "image-to-image-re-imagine": {
      creativity: 50,
    },
    "image-to-image-reangle": {
      front: true,
      back: false,
      right: false,
      left: false,
      top: false,
      bottom: false
    },
    "image-to-image-inpainting": {
      inpaintPrompt: "",
      maskImage: "",
    },
    "input-text": {
      prompt: "",
      negative: "",
      enhance: false,
    },
    "text-tool": {
      pin: false,
      font: "Inter",
      weight: "400",
      fontSize: 48,
      align: "left",
      lineSpacing: 1.2,
      letterSpacing: 0,
      visibility: true,
      opacity: 100,
      blendMode: "normal",
      color: "#FFFFFF",
      text: "Text",
      width: 261,
      height: 58,
      hugMode: true,
    },
    "preview-image": {
      preview: "",
      quality: 100,
      ratio: "Outpaint",
      accident: 0,
    },
    "engine-real": {
      model: "khialmaster:978314@1413433",
      loras: ["khialmaster:1551668@1755780", "civitai:686704@768584"],
      steps: 16,
      cfgScale: 2.5,
      scheduler: "DPM++ 2M"
    },
    "engine-style": {
      model: "civitai:778691@1205317",
      loras: ["nover:2@1", "civitai:686704@768584"],
      steps: 16,
      cfgScale: 2.5,
    },
    "engine-draw": {
      model: "nover:1@3",
      loras: ["civitai:686704@768584"],
      steps: 10,
      cfgScale: 2.5,
      scheduler: "Euler"
    },
    "engine-chic": {
      model: "nover:1@44",
      loras: [{model:"nover:4@1", weight:0.9}, {model:"nover:4@2", weight:0.8}, {model:"civitai:686704@768584", weight:1}],
      steps: 16,
      cfgScale: 2.5,
      scheduler: "Euler"
    },
    "engine-ads": {
      model: "nover:1@5",
      loras: ["civitai:686704@768584"],
      steps: 16,
      cfgScale: 3.5,
      scheduler: "Euler"
    },
    "engine-home": {
      model: "nover:1@6",
      loras: ["civitai:686704@768584"],
      steps: 16,
      cfgScale: 3.5,
      scheduler: "Euler"
    },
  "gear-2d-blue-surrealism": { "model": "nover:10@2", "weight": 0.8 },
  "gear-2d-cartoon-style": { "model": "nover:10@3", "weight": 0.8 },
  "gear-2d-dark-digital-painting": { "model": "nover:10@4", "weight": 0.8 },
  "gear-2d-fine-digital-painting": { "model": "nover:10@5", "weight": 0.8 },
  "gear-2d-flat-illustration": { "model": "nover:10@6", "weight": 0.8 },
  "gear-2d-game-typography": { "model": "nover:10@7", "weight": 0.8 },
  "gear-2d-morning-vibes-art": { "model": "nover:10@8", "weight": 0.8 },
  "gear-2d-pencil-sketch": { "model": "nover:10@9", "weight": 0.8 },
  "gear-2d-printer-flat-art": { "model": "nover:10@10", "weight": 0.8 },
  "gear-2d-round-character": { "model": "nover:10@11", "weight": 0.8 },
  "gear-2d-stamp-flat-art": { "model": "nover:10@12", "weight": 0.8 },
  "gear-2d-vivid-digital-painting": { "model": "nover:10@13", "weight": 0.8 },
  "gear-2d-vivid-flat-art": { "model": "nover:10@14", "weight": 0.8 },
  "gear-2d-western-anime-style": { "model": "nover:10@15", "weight": 0.8 },

  "gear-3d-clay-character": { "model": "nover:10@16", "weight": 0.8 },
  "gear-3d-detailed-3d": { "model": "nover:10@17", "weight": 0.8 },
  "gear-3d-fat-3d-icon": { "model": "nover:10@18", "weight": 0.8 },
  "gear-3d-flat-scene": { "model": "nover:10@19", "weight": 0.8 },
  "gear-3d-icon-design": { "model": "nover:10@20", "weight": 0.8 },
  "gear-3d-avatar-character": { "model": "nover:10@21", "weight": 0.8 },
  "gear-3d-poster": { "model": "nover:10@22", "weight": 0.8 },
  "gear-3d-vivid-3d-object": { "model": "nover:10@23", "weight": 0.8 },

  "gear-camera-extreme": { "model": "nover:10@24", "weight": 0.8 },
  "gear-camera-figh-eye-lens": { "model": "nover:10@25", "weight": 0.8 },
  "gear-camera-wide-angle-lens": { "model": "nover:10@26", "weight": 0.8 },

  "gear-portrait-commercial-shot": { "model": "nover:10@27", "weight": 0.8 },
  "gear-portrait-extreme-fashion": { "model": "nover:10@28", "weight": 0.8 },
  "gear-portrait-fashion-magazine": { "model": "nover:10@29", "weight": 0.8 },
  "gear-portrait-fit-sport-wear": { "model": "nover:10@30", "weight": 0.8 },
  "gear-portrait-future-fashion": { "model": "nover:10@31", "weight": 0.8 },
  "gear-portrait-future-lady": { "model": "nover:10@32", "weight": 0.8 },
  "gear-portrait-happy-breakfast": { "model": "nover:10@33", "weight": 0.8 },
  "gear-portrait-headphones": { "model": "nover:10@34", "weight": 0.8 },
  "gear-portrait-street-fashion": { "model": "nover:10@35", "weight": 0.8 },
  "gear-portrait-tech-product-holder": { "model": "nover:10@36", "weight": 0.8 },

  "gear-product-shoot-air-fit": { "model": "nover:10@37", "weight": 0.8 },
  "gear-product-shoot-arctic-aesthetics": { "model": "nover:10@38", "weight": 0.8 },
  "gear-product-shoot-cinematic-product": { "model": "nover:10@39", "weight": 0.8 },
  "gear-product-shoot-clean-clothes": { "model": "nover:10@40", "weight": 0.8 },
  "gear-product-shoot-dynamic-shot": { "model": "nover:10@41", "weight": 0.8 },
  "gear-product-shoot-fine-texture-shot": { "model": "nover:10@42", "weight": 0.8 },
  "gear-product-shoot-food-photography": { "model": "nover:10@43", "weight": 0.8 },
  "gear-product-shoot-green-shot": { "model": "nover:10@44", "weight": 0.8 },
  "gear-product-shoot-hold-my-product": { "model": "nover:10@45", "weight": 0.8 },
  "gear-product-shoot-natural-commerce": { "model": "nover:10@46", "weight": 0.8 },
  "gear-product-shoot-wooden-shot": { "model": "nover:10@47", "weight": 0.8 },

  "gear-scene-dreamscape-location": { "model": "nover:10@48", "weight": 0.8 },
  "gear-scene-fresh-air": { "model": "nover:10@49", "weight": 0.8 },
  "gear-scene-hyper-reality": { "model": "nover:10@50", "weight": 0.8 },
  "gear-scene-minimal-3d-location": { "model": "nover:10@51", "weight": 0.8 },

  "gear-style-charming-fluidity": { "model": "nover:10@52", "weight": 0.8 },
  "gear-style-dark-street": { "model": "nover:10@53", "weight": 0.8 },
  "gear-style-deep-emotions": { "model": "nover:10@54", "weight": 0.8 },
  "gear-style-glowing-light": { "model": "nover:10@55", "weight": 0.8 },
  "gear-style-green-tone": { "model": "nover:10@56", "weight": 0.8 },
  "gear-style-high-exposure": { "model": "nover:10@57", "weight": 0.8 },
  "gear-style-light-and-shadow": { "model": "nover:10@58", "weight": 0.8 },
  "gear-style-morning-hour": { "model": "nover:10@59", "weight": 0.8 },
  "gear-style-motion-blur": { "model": "nover:10@60", "weight": 0.8 },
  "gear-style-nostalgic-moment": { "model": "nover:10@61", "weight": 0.8 },
  "gear-style-quiet-city": { "model": "nover:10@62", "weight": 0.8 },
  "gear-style-saturated-food": { "model": "nover:10@63", "weight": 0.8 },
  "gear-style-sunlight": { "model": "nover:10@64", "weight": 0.8 },
  "gear-style-synthwave-photography": { "model": "nover:10@65", "weight": 0.8 },
  "gear-style-vibrant-morning": { "model": "nover:10@66", "weight": 0.8 },
  "gear-style-vintage-showa": { "model": "nover:10@67", "weight": 0.8 },
  "gear-style-visual-tension": { "model": "nover:10@68", "weight": 0.8 }
  };

  return defaults[nodeType] || {};
};

const getImageUrlForEngineOrGear = (nodeType: string): string => {
  const defaults: Record<string, string> = {
    "engine-real": "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/99ccccd1-35b1-4090-ade2-83e2a2bf14ab/anim=false,width=450/5P_00006_.jpeg",
    "engine-draw":"https://framerusercontent.com/images/VPeR2lzmnJZnKCMC0gSeXNjo.webp?width=768&height=1024",
    "engine-style": "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/16267bcd-6ec4-4395-939a-dd1c14c060fc/width=800,original=false/C-0806200522-HQ__1.jpeg",
    "engine-chic": "https://framerusercontent.com/images/npFSgBlEWFP7XRsJ4zu8e5eLaM.webp?scale-down-to=1024&width=1024&height=1536",
    "engine-ads": "https://framerusercontent.com/images/Sy0oVd6AdS3lpBXH2TxoNCVmKxc.webp?width=764&height=1019",
    "engine-home": "https://framerusercontent.com/images/VSsF7Tbkqygnd5KWF13fXlH3qY.webp?width=764&height=1019",
    
    "gear-2d-blue-surrealism": "https://liblibai-online.liblib.cloud/img/52a1ad7e1e909889aee437d8d3c0fccd/e5c15091c60c2a1de16698ca0fb2454fc4e5b40dcfe252be673947cd31e61180.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-2d-cartoon-style": "https://liblibai-online.liblib.cloud/img/11a39c95eac046339de7a8e64c42d455/b7e84653a22760fbd64928f22b252b8f8763bd23ca6a28118a583d145520973d.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-2d-dark-digital-painting": "https://liblibai-online.liblib.cloud/community-img/495637083-d926618c08fa396e7c4f1886f94615de8cd464883e16081ce6bae64b2f4334bf.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-2d-fine-digital-painting": "https://liblibai-online.liblib.cloud/img/8a625d838f3f48ce84d97ab2d0a0cb49/859081bd-b3c1-40cd-9258-b137833292a1.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
    "gear-2d-flat-illustration": "https://liblibai-online.liblib.cloud/img/3d031842114049db8578fdad0af13363/b410834aebb256500e5dc00ce8da91d2cfc7a7fa5b4875db49ce797dc4256344.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-2d-game-typography": "https://img.freepik.com/premium-vector/start-game-cute-colorful-editable-text-effect-font-style-template-design-fun-games-header_521317-1888.jpg",
    "gear-2d-morning-vibes-art": "https://liblibai-online.liblib.cloud/community-img/238401385-8cc1e9da4f3c3baf35074ac63c8920ebd83a9a52bc97708883ac4b4b2fd40364.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-2d-pencil-sketch": "https://liblibai-online.liblib.cloud/img/a0fedce0e9704c03aee76e54559ff60a/0044af66e4e81ebb8d6a413d753432ff48c336c379adfaab0ff1467740e2e05b.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-2d-printer-flat-art": "https://liblibai-online.liblib.cloud/community-img/334042765-0d9289bb58ddee9b73a449630aebb80fef0595ff6686f63a0f4f2ad13b92377a.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-2d-round-character": "https://liblibai-online.liblib.cloud/img/38a210e2c1c248f3a3f6eaae56f8d47f/231bc6fb94e2b6727884850cbdeea30bb9c98453d39401bed425dadd0848dfe1.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-2d-stamp-flat-art": "https://liblibai-online.liblib.cloud/community-img/fd07ed22f7b57d8bf83e10e24939c5938e46cd92268a6b180ff42c7cca331eed.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
    "gear-2d-vivid-digital-painting": "https://liblibai-online.liblib.cloud/img/2c74665bdb03430bb48d6df029b7bdd5/73eb7875a61e3fedd4443b03f8b368895f557c05dae53ab52c009dbd591e9296.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
    "gear-2d-vivid-flat-art": "https://liblibai-online.liblib.cloud/img/8d5ade1f022c453089e473c7e39dbb35/3dd316a48338e2a5a03ed85a80784bda8f700e3dc38e775e184c05bf9f586967.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-2d-western-anime-style": "https://liblibai-online.liblib.cloud/img/3182e97388e94f0b8fbd0234ac38e892/966453e915f3e970e516f97d2f08a0e09f8c018c182e014043fb25066557d3f6.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",

    "gear-3d-clay-character": "https://liblibai-online.liblib.cloud/community-img/572368156-be014c0ffb345737377948f369a6d664031f2c63189682b69f62151033fbbcdf.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
    "gear-3d-detailed-3d": "https://liblibai-online.liblib.cloud/img/a78ce25a9fe547949b8e207f56c94e34/355dcd69874ca4d2ed0a369f09b886f5aba04c0b4a0213cac2c3e07462ec6c64.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-3d-fat-3d-icon": "https://liblibai-online.liblib.cloud/img/636785acca274963afaf35c31c0780a6/07ffcc39-fba0-4d22-b2c8-7818d51d81f3.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
    "gear-3d-flat-scene": "https://liblibai-online.liblib.cloud/img/dedd2236c6ab458584fce5902aaf2032/2cf2dd1ed976ae9fef119cc66c0ce4d72645d991f35c980ffda91e4c4d2641d3.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-3d-icon-design": "https://liblibai-online.liblib.cloud/img/0a60cfd4fb36498081f2535f24c5cbe5/347af5f0-3953-4819-9ef1-1f9fe818f0b0.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
    "gear-3d-avatar-character": "https://liblibai-online.liblib.cloud/img/e14ed7c37a3741d88e05fc61a441e265/99742748c435e5fe3f8f3b82167d46455346e73ed07c0ad074811c5f5f6a1b09.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-3d-poster": "https://liblibai-online.liblib.cloud/img/0ec0638f229949779a3604f395be4b05/26b36942389f3487a3eb2d8873d56ff7f559393a2dbc06597f88cafdf28e5d31.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-3d-vivid-3d-object": "https://liblibai-online.liblib.cloud/img/e14ed7c37a3741d88e05fc61a441e265/3c014a2ef9c0806ae2685b1694ea7ad0ca6f9bd0d6f72de4ee55753505f3a60e.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",

    "gear-camera-extreme": "https://liblibai-online.liblib.cloud/img/89e762e8432d4b65958ab16981f9393b/4d1832acc7006de1d27fb95a46a6f98f8eb30adc5d5aefed8b228534ee5a0aa6.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-camera-figh-eye-lens": "https://liblibai-online.liblib.cloud/community-img/489700562-ebd0082a9c9725d2c56163460ea5332e2bf86a46b0bdcca51e44eb7f59b937ec.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-camera-wide-angle-lens": "https://liblibai-online.liblib.cloud/img/ba5d94e9cc4f0dd5b2bb1f8060201839/e063ab62a8be29ac6144b2508fc019fce84ce64c1a3f26c69896566e40a699d6.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",

    "gear-portrait-commercial-shot": "https://liblibai-online.liblib.cloud/img/e14ed7c37a3741d88e05fc61a441e265/c6cca7b180c1c5f7a65047a904a2527954ef3e5b8fff7600222020c12fd0f24a.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-portrait-extreme-fashion": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/b2d5e9302f4edcd34b7516432429c7cf195b08c1d9375d2095e09df6dbf1c763.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-portrait-fashion-magazine": "https://liblibai-online.liblib.cloud/img/785ad06f390049d4837e32aece721659/c94d24eb4e59414730ac0e835e2f89f5d078a7346888fa684df93fa0869a9864.jpg?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-portrait-fit-sport-wear": "https://liblibai-online.liblib.cloud/img/039f480c90144605b89be09383cbb460/e1d0a8c4ee336802b688ddd45b3a77a64a0690a5027a5df7bc6d8d142a2cee25.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-portrait-future-fashion": "https://liblibai-online.liblib.cloud/img/30adc6dff51248ae9b49c567281f736e/8a3b9815c79ad6f61241f27ace257985ad17619e86d59323f96414d13745b39c.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
    "gear-portrait-future-lady": "https://liblibai-online.liblib.cloud/img/f574471b318b491695503813e0f553cf/99cf92bf7ddab99b06143b0ed5207e439df469f45be36e770af9af65c8635088.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-portrait-happy-breakfast": "https://liblibai-online.liblib.cloud/img/a2f296d39286455384debb93d9c0fb69/41ee2c549ec3315e684c460351101de4738d8863f820d649cfb4edf9dad34bbf.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-portrait-headphones": "https://liblibai-online.liblib.cloud/copy/sd-images/deb594a996b7ebc6f14eaaa88174e588778093002df431f6f3c7b530d53280aa.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-portrait-street-fashion": "https://liblibai-online.liblib.cloud/img/b11a6d76837b41389d4daff7fe415030/83c5e3e59abaa5d76b5e0fa1160b01b4b0376f3585be826c6e087b34ee2ca74f.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-portrait-tech-product-holder": "https://liblibai-online.liblib.cloud/img/1147a017bdc94c3eb887adb884386dca/3429a753-5f92-4181-b9b2-3e4172453541.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",

    "gear-product-shoot-air-fit": "https://liblibai-online.liblib.cloud/community-img/544932001-5940b955bb9dd7751c29b7c185b5e73d26a53c4c5d9addcf38e2cfb10781d9ac.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-product-shoot-arctic-aesthetics": "https://liblibai-online.liblib.cloud/img/a846149471c54ff692f2d15005ec0f39/2c626bca2183ffb137bf6a8a430ecd2cab6464a7d303bcfb911344a442c7b0b4.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-product-shoot-cinematic-product": "https://liblibai-online.liblib.cloud/img/e14ed7c37a3741d88e05fc61a441e265/df5a0140cf697f6339a504d4152d924f84462441e2336be21af82ee36e366464.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
    "gear-product-shoot-clean-clothes": "https://liblibai-online.liblib.cloud/copy/sd-images/a84f8dfd1bb2ef09fb6a031408f704ae579f6e0ddefbdf0dd47ae6bef0231435.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-product-shoot-dynamic-shot": "https://liblibai-online.liblib.cloud/img/e14ed7c37a3741d88e05fc61a441e265/d63e32330a319b4fb81992dae11120272805fbd54068b4aba1ddfcc2ad3647ce.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-product-shoot-fine-texture-shot": "https://liblibai-online.liblib.cloud/img/512db55f75114e88885efdd5974208e1/67692bc5a3e53770f95f62437626093f980665537b59bb60a0e42a81851bc77b.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-product-shoot-food-photography": "https://liblibai-online.liblib.cloud/img/50130dd00b7f4c0ab8472a720169906f/6c2013be9c18338d51196c908672d12a481595bdf868315cce402c12eb2d5ada.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-product-shoot-green-shot": "https://liblibai-online.liblib.cloud/img/d0d6324fc04ca15e2071e719b7a4fb08/84af7b41da03c22b6c812dc6c3ae300e1dd4dd827dd41b177878dd904f667b19.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-product-shoot-hold-my-product": "https://liblibai-online.liblib.cloud/img/117b993dfda849038fd0cfc8d6cf8d49/bc3fb74e3ace5eff1583d3a20345b964ad8ac58214b1fea1a9c642396b87dd4c.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-product-shoot-natural-commerce": "https://liblibai-online.liblib.cloud/img/f65d5dde6e9a48f1bb48fbd2455b8ec5/8514c282419011186e9907f5534f20977083d78a9252b25f935e20a79fd1e6d1.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-product-shoot-wooden-shot": "https://liblibai-online.liblib.cloud/img/f574471b318b491695503813e0f553cf/4e68a1449291e9e359053e652f5bf17b0954814c969c888b8747a74d8e4bfd36.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",

    "gear-scene-dreamscape-location": "https://liblibai-online.liblib.cloud/img/636785acca274963afaf35c31c0780a6/c7a329b63078169c0c8e3085632070f26453a98266631903b2d062b0626fb04d.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-scene-fresh-air": "https://liblibai-online.liblib.cloud/img/f7423df6debc42689cab955307f88217/faf6bfc8-e1d9-4d13-9670-1df285e4ad5d.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
    "gear-scene-hyper-reality": "https://liblibai-online.liblib.cloud/img/e14ed7c37a3741d88e05fc61a441e265/b0fbde13168257da3112075e660c30dd317677589c0086ae6235ff965e4a6b3b.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-scene-minimal-3d-location": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/525c12d4b98a762a2c1ad79036dc51ac692b293531904ebaa5e0cc3f97b22c02.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",

    "gear-style-charming-fluidity": "https://liblibai-online.liblib.cloud/img/fec0806e56074953acbbe6a347addd5a/3c295219114c338317f90b188d1db28dbbadf2cfd422870e73d31422696a83cd.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-dark-street": "https://liblibai-online.liblib.cloud/img/148ecce3d0a74e3ca867307cd77bc1cd/4c1e7514f6ab58c9103a08f5f087318da52a507f9affb16d771a0ae6d9596464.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-deep-emotions": "https://liblibai-online.liblib.cloud/community-img/427555066-64a2fa3f2280a8c7f5f66cb848afb0f29e3a37532e08c04ada0c8e555c641534.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-glowing-light": "https://liblibai-online.liblib.cloud/img/70f78eb416c54675ac25b742eeae0ea8/8aaaf6f055a5bd00b07633a04667c4df2e8ac6c30bc0949170acfde043c8e33c.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-green-tone": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/524d1a6fe88085f58f88e25aa800a785408f27efb1c4bae64d066c8978a2dd7b.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-high-exposure": "https://liblibai-online.liblib.cloud/img/70f78eb416c54675ac25b742eeae0ea8/8178fcbd045453cc3c817a6ad03d8950999ecb8c9896a72d36158e283031d266.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-light-and-shadow": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/5e9661822bf559e5e360a301059e9d30301e2b53f9b0faf183bbdb4a396713ca.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
    "gear-style-morning-hour": "https://liblibai-online.liblib.cloud/img/70f78eb416c54675ac25b742eeae0ea8/f006d71578465a1c65ccae8fea877e5433b6723b847d0957c7b5ed9b875e5d21.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-motion-blur": "https://liblibai-online.liblib.cloud/community-img/254608462-6d61af4acdd8a3df37c20a2aa97e21f42d7ce0a81bc14e53a3b91eafa415bf9b.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-nostalgic-moment": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/8e85127382df98e2fbdf1885942a1f1fb28d8723c80e6557486914bb58a0deab.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-quiet-city": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/d072e54b861783abce0e63f6aa5c67894916fad5d12187af8cd8047fdd56babe.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-saturated-food": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/26e536fed8dccf9f7dfcf476a0861f4e5f07431069a8c3cf1a7a3a5cc814eedf.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-sunlight": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/c4a0c2fe73fe5275efe936d45805a129702cc25654f9dd85302c63a5207401f4.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-synthwave-photography": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/0bc91333bd0b1c7e774e2fcd27d27d1e700438ef2f2cfffad7a35f25a2e57d71.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
    "gear-style-vibrant-morning": "https://liblibai-online.liblib.cloud/img/d059169a83e74c9c955091012c30d8e7/d53ff016-2095-41fb-8615-ce85948f405b.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
    "gear-style-vintage-showa": "https://liblibai-online.liblib.cloud/sd-images/3937d4cc6d066da67502e8545f421b0d187fd7577dd37cb0eb7ba77a58af2695.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
    "gear-style-visual-tension": "https://liblibai-online.liblib.cloud/community-img/423287211-0e47f5c9bc05081b65309c754fa22e28dc783913444cbb33b1ef898efef34baa.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp"

    };

  return defaults[nodeType] || "";
};

export const getHighestOrder = (nodes: Node[]): number => {
  return nodes.reduce((max, node) => Math.max(max, node.data?.order || 0), 0);
};

// Add function to renumber orders
export const renumberOrders = (nodes: Node[]): Node[] => {
  const sortedNodes = [...nodes].sort(
    (a, b) => (a.data?.order || 0) - (b.data?.order || 0)
  );

  return sortedNodes.map((node, index) => ({
    ...node,
    data: {
      ...node.data,
      order: index + 1, // Start from 1
    },
  }));
};

export const renumberOrdersEnhanced = (nodes: Node[]): Node[] => {
  // Separate nodes by parent
  const nodesByParent: Record<string, Node[]> = {};
  const topLevelNodes: Node[] = [];

  nodes.forEach((node) => {
    if (node.parentId) {
      if (!nodesByParent[node.parentId]) {
        nodesByParent[node.parentId] = [];
      }
      nodesByParent[node.parentId].push(node);
    } else {
      topLevelNodes.push(node);
    }
  });

  // Sort top-level nodes by current order
  topLevelNodes.sort((a, b) => (a.data?.order || 0) - (b.data?.order || 0));

  let globalOrder = 1;
  const renumberedNodes: Node[] = [];

  // Process top-level nodes and their children
  topLevelNodes.forEach((parent) => {
    // Update parent order
    const updatedParent = {
      ...parent,
      data: {
        ...parent.data,
        order: globalOrder++,
      },
    };
    renumberedNodes.push(updatedParent);

    // Process children
    const children = nodesByParent[parent.id] || [];
    children.sort((a, b) => (a.data?.order || 0) - (b.data?.order || 0));

    children.forEach((child) => {
      renumberedNodes.push({
        ...child,
        data: {
          ...child.data,
          order: globalOrder++,
        },
      });
    });
  });

  return renumberedNodes;
};

export const handleNodesChange = (
  changes: NodeChange[],
  nodes: Node[],
  selectedNode: Node | null
): {
  updatedNodes: Node[];
  updatedSelectedNode: Node | null;
} => {
  const updatedNodes = applyNodeChanges(changes, nodes);

  let updatedSelectedNode = selectedNode;
  if (selectedNode) {
    const updatedNode = updatedNodes.find((n) => n.id === selectedNode.id);
    if (!updatedNode) {
      updatedSelectedNode = null;
    } else if (JSON.stringify(updatedNode) !== JSON.stringify(selectedNode)) {
      updatedSelectedNode = updatedNode;
    }
  }

  return { updatedNodes, updatedSelectedNode };
};

// export const updateNodeDataHelper = (
//   nodeId: string,
//   newData: any,
//   nodes: Node[],
//   selectedNode: Node | null
// ): {
//   updatedNodes: Node[],
//   updatedSelectedNode: Node | null
// } => {
//   const updatedNodes = nodes.map(node => {
//     if (node.id === nodeId) {
//       const newDataMerged = merge({}, node.data, newData);
//       if (JSON.stringify(node.data) === JSON.stringify(newDataMerged)) {
//         return node; // Avoid unnecessary updates
//       }
//       return { ...node, data: newDataMerged };
//     }
//     return node;
//   });

//   let updatedSelectedNode = selectedNode;
//   if (selectedNode?.id === nodeId) {
//     updatedSelectedNode = updatedNodes.find(n => n.id === nodeId) || null;
//   }

//   return { updatedNodes, updatedSelectedNode };
// };

export const updateNodeDataHelper = (
  nodeId: string,
  newData: any,
  nodes: Node[],
  selectedNode: Node | null
): {
  updatedNodes: Node[];
  updatedSelectedNode: Node | null;
} => {
  const nodeToUpdate = nodes.find((n) => n.id === nodeId);
  if (!nodeToUpdate)
    return { updatedNodes: nodes, updatedSelectedNode: selectedNode };

  const deltaX =
    newData.position && nodeToUpdate.position
      ? newData.position.x - nodeToUpdate.position.x
      : 0;
  const deltaY =
    newData.position && nodeToUpdate.position
      ? newData.position.y - nodeToUpdate.position.y
      : 0;

  let updatedNodes = nodes.map((node) => {
    if (node.id === nodeId) {
      const newDataMerged = merge({}, node.data, newData);

      // Handle width and height specially - set both in data and at node level
      const nodeUpdate: any = {
        ...node,
        data: newDataMerged,
        position: newData.position || node.position,
      };

      // If width or height are being updated, also set them at the node level for React Flow
      if (newData.width !== undefined) {
        nodeUpdate.width = newData.width;
      }
      if (newData.height !== undefined) {
        nodeUpdate.height = newData.height;
      }

      // Handle pin functionality - set draggable based on pin status
      // Check both possible pin locations: data.pin and data.right_sidebar.pin
      const isPinned = newDataMerged.pin || newDataMerged.right_sidebar?.pin;
      nodeUpdate.draggable = !isPinned;

      if (
        JSON.stringify(node.data) === JSON.stringify(newDataMerged) &&
        (!newData.position ||
          (node.position.x === newData.position.x &&
            node.position.y === newData.position.y)) &&
        newData.width === undefined &&
        newData.height === undefined
      ) {
        return node; // Avoid unnecessary updates
      }
      return nodeUpdate;
    }
    return node;
  });

  // 🏠 Removed labeled frame group node handling

  let updatedSelectedNode = selectedNode;
  if (selectedNode?.id === nodeId) {
    updatedSelectedNode = updatedNodes.find((n) => n.id === nodeId) || null;
  }

  return { updatedNodes, updatedSelectedNode };
};

export const deleteEdgeHelper = (edgeId: string, edges: Edge[]): Edge[] => {
  return edges.filter((edge) => edge.id !== edgeId);
};

// Reset node counter - useful when loading projects
export const resetNodeIdCounter = (nodes: Node[]) => {
  const maxId = Math.max(
    ...nodes.map((n: Node) => {
      const match = n.id.match(/\d+$/);
      return match ? parseInt(match[0]) : 0;
    })
  );
  nodeIdCounter = maxId + 1;
};
