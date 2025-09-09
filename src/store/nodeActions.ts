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
    connector: "Router",
    "preview-image": "Image Output",
    "preview-realtime": "Real-Time Preview",
    "engine-real": "Nover Real",
    "gear-anime": "Anime",
    "gear-killua": "Killua",
    "text-tool": "Text Tool",
    "rectangle-node": "Rectangle",
    "circle-node": "Circle",
    "star-node": "Star",
    "frame-node": "Frame",
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
  // Return default right_sidebar data based on node type from schema
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
    "image-to-image-re-imagine": {
      creativity: 50,
    },
    "input-text": {
      prompt: "",
      negative: "",
      enhance: false,
    },
    "preview-image": {
      preview: "",
      quality: 100,
      ratio: "Outpaint",
      accident: 0,
    },
    "engine-real": {
      image_url: "",
      model: "runware:101@1",
      lora: "civitai:796382@1026423"
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
  };

  return defaults[nodeType] || {};
};

const getImageUrlForEngineOrGear = (nodeType: string): string => {
  const defaults: Record<string, string> = {
    "engine-real":
      "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/99ccccd1-35b1-4090-ade2-83e2a2bf14ab/anim=false,width=450/5P_00006_.jpeg",
    "gear-anime":
      "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/8125d41b-c2fc-4141-8a43-a2b8f0c3058d/anim=false,width=450/pixai-1888583114545024969-0.jpeg",
    "gear-killua":
      "https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/0de4dbcd-eb1c-478c-9709-1694b25e94f9/anim=false,width=450/00960-497516903.jpeg",
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
