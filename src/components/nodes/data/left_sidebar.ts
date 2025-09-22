import {
  LayoutList,
  FileImage,
  Shuffle,
  Settings,
  FileOutput,
  DraftingCompass,
  Orbit,
  Cog,
  Atom
} from "lucide-react";

import { NodeType } from "@/store/types";

type NodeOption = {
  type: NodeType;
  label: string;
  icon: string;
  description: string;
  design?: string;
  functionality?: string;
  model?: string;
  lora?: string;
  loras?: string[];
  image_url?: string;
  data?: any;
  node_desc_image_url?: string;
  status?: string;
};

type NodeCategory = {
  name: string;
  icon: React.ElementType;
  options: NodeOption[];
};

type AssetItem = {
  name: string;
  type: string;
  image?: string;
};

export const insertCategories: NodeCategory[] = [
  {
    name: "Controllers",
    icon: DraftingCompass,
    options: [
      {
        design: "normal-node", // for UI
        functionality: "control-net", // for Connection Rules
        type: "control-net-pose", // for Runware API
        label: "Pose Control",
        icon: "pose",
        description:
          "The Pose Controller Node defines body positioning and gestures, helping the engine generate people in specific stances or movement.",
        node_desc_image_url: "pose",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "control-net",
        type: "control-net-edge",
        label: "Edge Control",
        icon: "edge",
        description:
          "The Edge Controller Node extracts and refines edges, generating clean line art that guides the engine to follow the image’s structural outlines.",
        node_desc_image_url: "edge",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "control-net",
        type: "seed-image-lights",
        label: "Lights Control",
        icon: "lights",
        description:
          "The Light Controller Node adjusts lighting conditions, colors, and highlights to shape the mood, contrast, and realism of the output image.",
        node_desc_image_url: "light",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "control-net",
        type: "control-net-face",
        label: "Face Express",
        icon: "face",
        description:
          "The Face Expression Node adjusts facial features to express emotions, enabling realistic and expressive character generation.",
        node_desc_image_url: "face-express",
        status: "coming-soon",
      },
      {
        design: "normal-node",
        functionality: "control-net",
        type: "control-net-segments",
        label: "Segments",
        icon: "segments",
        description:
          "The Segments allows to detect objects and differ them enabling text prompts to better target objects for specific changes.",
        node_desc_image_url: "segments",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "control-net",
        type: "control-net-depth",
        label: "Depth Control",
        icon: "depth",
        description:
          "The Depth Controller Node extracts depth information, turning it into a depth map that helps the engine maintain accurate distance and layering in the final output.",
        node_desc_image_url: "depth",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "control-net",
        type: "control-net-normal-map",
        label: "Normal Map",
        icon: "normal_map",
        description: "Reference faces, styles, or objects",
        node_desc_image_url: "normal-map",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "control-net",
        type: "control-net-reference",
        label: "Reference",
        icon: "reference",
        description:
          "The Reference Node preserves style, character details, product design, and more—ensuring consistency and precision for visualization and style transfer.",
        node_desc_image_url: "reference",
        status: "stable",
      },
    ],
  },
  {
    name: "Re-rendering",
    icon: Atom,
    options: [
      {
        design: "normal-node",
        functionality: "image-to-image",
        type: "image-to-image-reimagine",
        label: "Re-Imagine",
        icon: "reimagine",
        description:
          "The Re-Imagine Node generates creative variations of an image, maintaining its essence while exploring new visual possibilities.",
        node_desc_image_url: "re-imagine",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "image-to-image",
        type: "image-to-image-rescene",
        label: "Re-Scene",
        icon: "rescene",
        description:
          "The Re-Scene Node merges a subject with a background, blending both into a realistic, well-composited scene.",
        node_desc_image_url: "re-scene",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "image-to-image",
        type: "image-to-image-object-relight",
        label: "Object Re-Light",
        icon: "objectrelight",
        description:
          "The Relight Node modifies the lighting of an existing image, allowing for new visual moods or improved highlight and shadow dynamics.",
        node_desc_image_url: "re-light",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "image-to-image",
        type: "image-to-image-reangle",
        label: "Re-Angle",
        icon: "reangle",
        description:
          "The Re-Angle Node shifts the camera viewpoint to offer alternate perspectives while preserving the core composition.",
        node_desc_image_url: "re-angle",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "image-to-image",
        type: "image-to-image-remix",
        label: "Re-Mix",
        icon: "merger",
        description:
          "The Re-Mix Node merges multiple images into one cohesive output, blending elements and styles to form a unified composition.",
        node_desc_image_url: "re-mix",
        status: "stable",
      },
    ],
  },
  {
    name: "Tools",
    icon: Settings,
    options: [
      {
        design: "normal-node",
        functionality: "image-to-image",
        type: "image-to-image-remove-bg",
        label: "Remove BG",
        icon: "removebg",
        description:
          "The Remove BG Node isolates the subject and removes the background, making the image ready for compositing or replacement.",
        node_desc_image_url: "remove-bg",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "image-to-image",
        type: "image-to-image-upscale",
        label: "Upscale",
        icon: "upscale",
        description:
          "The Image Upscale Node increases the resolution of an image while maintaining sharpness, ideal for print or large displays.",
        node_desc_image_url: "upscaler",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "image-to-image",
        type: "image-to-image-inpainting",
        label: "In-Painting",
        icon: "inpainting",
        description:
          "The Inpainting Node fills or repairs selected areas of an image using surrounding content to restore or modify missing parts.",
        node_desc_image_url: "in-paint",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "image-to-image",
        type: "image-to-image-remove-outpainting",
        label: "Out-Painting",
        icon: "outpainting",
        description:
          "The Outpainting Node extends an image’s canvas, generating new content that blends naturally with the original edges.",
        node_desc_image_url: "out-painting",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "image-to-image",
        type: "image-to-image-3d-maker",
        label: "3D Maker",
        icon: "3dmaker",
        description: "Generate mesh and texture from image",
        status: "coming-soon",
      },
      {
        design: "normal-node",
        functionality: "input",
        type: "input-text",
        label: "Text Prompt",
        icon: "text",
        description:
          "The Text Prompt Node lets you enter descriptive text that guides the engine’s imagination and controls the direction of the generated image.",
        node_desc_image_url: "text-prompt",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "image-to-image",
        type: "image-to-image-merger",
        label: "Merger",
        icon: "merger",
        node_desc_image_url: "re-mix",
        description: "Merge multiple images with weights",
        status: "stable",
      },
      {
        design: "custom-router",
        functionality: "helper",
        type: "connector",
        label: "Router",
        icon: "router",
        description:
          "The Router Node directs the flow of data between nodes, giving you control over logic paths and workflow branching.",
        node_desc_image_url: "router",
        status: "stable",
      },
      {
        design: "text-node",
        functionality: "text-tool",
        type: "text-tool",
        label: "Text Tool",
        icon: "text",
        description:
          "The Text Tool Node allows you to add and style text with full typography controls, similar to Figma's text tool.",
        node_desc_image_url: "text-prompt",
        status: "stable",
      },
    ],
  },
  {
    name: "Render",
    icon: FileOutput,
    options: [
      {
        design: "image-node",
        functionality: "preview",
        type: "preview-image",
        data: {
          functionality: "output",
        },
        label: "Image Output",
        icon: "image_output",
        description:
          "The Image Output Node renders and displays the final generated image, acting as the visual endpoint of your workflow.",
        node_desc_image_url: "image-output",
        status: "stable",
      },
      {
        design: "image-node",
        functionality: "preview",
        type: "preview-realtime-node",
        data: {
          functionality: "output",
        },
        label: "Real-Time Preview",
        icon: "realtime",
        description: "Live preview during generation",
        status: "coming-soon",
      },
    ],
  },
  {
    name: "Engines",
    icon: Cog,
    options: [
      {
        design: "normal-node",
        functionality: "engine",
        type: "engine-real",
        model: "khialmaster:978314@1413433",
        loras: ["khialmaster:1551668@1755780", "civitai:686704@768584"],
        image_url: "https://framerusercontent.com/images/WsUaly5if0xT5w1jOkDj3Pdk.png?scale-down-to=512&width=1500&height=1900",
        data: {
          functionality: "engine",
        },
        label: "Nover Real",
        icon: "realtime",
        description: "Ultra-realistic visuals with lifelike detail for portraits, environments and scenes alike.",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "engine",
        type: "engine-style",
        model: "civitai:778691@1205317",
        loras: ["nover:2@1", "civitai:686704@768584"],
        image_url: "/nodes/engines/left_sidebar/style.png",
        data: {
          functionality: "engine",
        },
        label: "Nover Style",
        icon: "realtime",
        description: "Stylized and thematic imagery bringing strong moods, lighting and creative atmospheres together.",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "engine",
        type: "engine-draw",
        model: "nover:1@3",
        loras: ["civitai:686704@768584"],
        image_url:
          "https://framerusercontent.com/images/VPeR2lzmnJZnKCMC0gSeXNjo.webp?width=768&height=1024",
        data: {
          functionality: "engine",
        },
        label: "Nover Draw",
        icon: "realtime",
        description: "Illustrations in 2D, 3D, icons and graphic assets for apps, games, branding, and e-commerce",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "engine",
        type: "engine-chic",
        model: "nover:1@4",
        loras: ["civitai:686704@768584"],
        image_url: "/nodes/engines/left_sidebar/chic.png",
        data: {
          functionality: "engine",
        },
        label: "Nover Chic",
        icon: "realtime",
        description: "High-fashion visuals showcasing designer outfits, textures, and pro apparel presentations.",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "engine",
        type: "engine-ads",
        model: "nover:1@5",
        loras: ["civitai:686704@768584"],
        image_url: "/nodes/engines/left_sidebar/ads.png",
        data: {
          functionality: "engine",
        },
        label: "Nover Ads",
        icon: "realtime",
        description: "Polished product visuals optimized for campaigns, marketing assets, and e-commerce presentations.",
        status: "stable",
      },
      {
        design: "normal-node",
        functionality: "engine",
        type: "engine-home",
        model: "nover:1@6",
        loras: ["civitai:686704@768584"],
        image_url: "/nodes/engines/left_sidebar/home.png",
        data: {
          functionality: "engine",
        },
        label: "Nover Home",
        icon: "realtime",
        description: "Interior design and décor visuals showing rooms, layouts, materials and architectural concepts.",
        status: "stable",
      },
    ],
  },
  {
    "name": "Gears",
    "icon": Orbit,
    "options": [
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-blue-surrealism",
        "lora": "nover:10@2",
        "image_url": "https://liblibai-online.liblib.cloud/img/52a1ad7e1e909889aee437d8d3c0fccd/e5c15091c60c2a1de16698ca0fb2454fc4e5b40dcfe252be673947cd31e61180.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "Blue_idealism_bb",
            "blue surrealism",
            "dreamy blue tone",
            "ethereal 2D",
            "surreal blue palette"
          ]
        },
        "label": "Gear 2D Blue Surrealism",
        "icon": "",
        "description": "Explore surreal and dreamlike scenes, blending bold colors and unusual creatures with intricate, stylized, and fantastic detail.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-cartoon-style",
        "lora": "nover:10@3",
        "image_url": "https://liblibai-online.liblib.cloud/img/11a39c95eac046339de7a8e64c42d455/b7e84653a22760fbd64928f22b252b8f8763bd23ca6a28118a583d145520973d.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "cartoon style",
            "toon shading",
            "bold outlines",
            "flat colors",
            "2D cartoon"
          ]
        },
        "label": "Gear 2D Cartoon Style",
        "icon": "",
        "description": "Experience a charming and playful cartoon style with soft textures, expressive characters, and a warm, inviting color palette.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-dark-digital-painting",
        "lora": "nover:10@4",
        "image_url": "https://liblibai-online.liblib.cloud/community-img/495637083-d926618c08fa396e7c4f1886f94615de8cd464883e16081ce6bae64b2f4334bf.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "roger",
            "dark digital painting",
            "moody lighting",
            "high contrast shadows",
            "dramatic 2D"
          ]
        },
        "label": "Gear 2D Dark Digital Painting",
        "icon": "",
        "description": "Evoke a mystical, spiritual mood with a dark yet glowing palette, creating otherworldly and deeply atmospheric digital paintings.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-fine-digital-painting",
        "lora": "nover:10@5",
        "image_url": "https://liblibai-online.liblib.cloud/img/8a625d838f3f48ce84d97ab2d0a0cb49/859081bd-b3c1-40cd-9258-b137833292a1.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "qgch style",
            "strong noise texture with hand drawn brush strokes",
            "fine digital painting",
            "hand-painted feel",
            "detailed brushwork"
          ]
        },
        "label": "Gear 2D Fine Digital Painting",
        "icon": "",
        "description": "Exquisite digital paintings featuring subtle textures, a delicate color palette, and a refined, artistic sensibility that feels timeless.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-flat-illustration",
        "lora": "nover:10@6",
        "image_url": "https://liblibai-online.liblib.cloud/img/3d031842114049db8578fdad0af13363/b410834aebb256500e5dc00ce8da91d2cfc7a7fa5b4875db49ce797dc4256344.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "flat illustration",
            "vector flat",
            "minimal shapes",
            "clean 2D",
            "flat color blocks"
          ]
        },
        "label": "Gear 2D Flat Illustration",
        "icon": "",
        "description": "Flat and decorative illustrations with bold colors, simple shapes, and a playful, modern aesthetic that feels hand-drawn.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-game-typography",
        "lora": "nover:10@7",
        "image_url": "https://liblibai-online.liblib.cloud/img/5b783e4e079f197e561911ad12410708/7ca56bbbfc30a023726223386d3001d97bb66004b238dc405009b39ff62642c8.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "game typography",
            "arcade title",
            "bold 3D text",
            "retro game font",
            "glossy lettering"
          ]
        },
        "label": "Gear 2D Game Typography",
        "icon": "",
        "description": "Dynamic and bold typography that brings a cinematic and heroic feel, perfect for a title or logo.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-morning-vibes-art",
        "lora": "nover:10@8",
        "image_url": "https://liblibai-online.liblib.cloud/community-img/238401385-8cc1e9da4f3c3baf35074ac63c8920ebd83a9a52bc97708883ac4b4b2fd40364.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "bright 2D hand-drawn style",
            "soft textures",
            "morning vibes",
            "warm sunrise light",
            "fresh morning palette"
          ]
        },
        "label": "Gear 2D Morning Vibes Art",
        "icon": "",
        "description": "A cheerful and warm mood with bright colors, soft textures, and friendly characters that evoke a sense of coziness.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-pencil-sketch",
        "lora": "nover:10@9",
        "image_url": "https://liblibai-online.liblib.cloud/img/a0fedce0e9704c03aee76e54559ff60a/0044af66e4e81ebb8d6a413d753432ff48c336c379adfaab0ff1467740e2e05b.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "pencil sketch",
            "graphite lines",
            "hand-drawn sketch",
            "crosshatching",
            "monochrome sketch"
          ]
        },
        "label": "Gear 2D Pencil Sketch",
        "icon": "",
        "description": "Craft realistic and precise technical drawings, with sharp lines and a delicate, hand-sketched feel that captures intricate details.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-printer-flat-art",
        "lora": "nover:10@10",
        "image_url": "https://liblibai-online.liblib.cloud/community-img/334042765-0d9289bb58ddee9b73a449630aebb80fef0595ff6686f63a0f4f2ad13b92377a.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "BPH style illustration",
            "printer flat art",
            "CMYK flat",
            "poster flat style",
            "print-ready look"
          ]
        },
        "label": "Gear 2D Printer Flat Art",
        "icon": "",
        "description": "Playful, bold, and fun. This style uses simple shapes and vibrant colors with a rough, printed texture.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-round-character",
        "lora": "nover:10@11",
        "image_url": "https://liblibai-online.liblib.cloud/img/38a210e2c1c248f3a3f6eaae56f8d47f/231bc6fb94e2b6727884850cbdeea30bb9c98453d39401bed425dadd0848dfe1.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "round character",
            "chibi round",
            "soft shapes",
            "pillowy forms",
            "cute 2D mascot"
          ]
        },
        "label": "Gear 2D Round Character",
        "icon": "",
        "description": "Playful and charming illustrations with a soft, clean style, featuring friendly characters and a warm color palette.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-stamp-flat-art",
        "lora": "nover:10@12",
        "image_url": "https://liblibai-online.liblib.cloud/community-img/fd07ed22f7b57d8bf83e10e24939c5938e46cd92268a6b180ff42c7cca331eed.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "ysch style",
            "vector illustration with high saturation",
            "stamp flat art",
            "bold saturated flat",
            "postal stamp vibe"
          ]
        },
        "label": "Gear 2D Stamp Flat Art",
        "icon": "",
        "description": "Create bold, stylized compositions with a vintage feel, using vibrant colors, clean shapes, and a distinctive stamp-like texture.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-vivid-digital-painting",
        "lora": "nover:10@13",
        "image_url": "https://liblibai-online.liblib.cloud/img/2c74665bdb03430bb48d6df029b7bdd5/73eb7875a61e3fedd4443b03f8b368895f557c05dae53ab52c009dbd591e9296.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "vivid digital painting",
            "vector illustration",
            "high saturation",
            "punchy colors",
            "vibrant 2D"
          ]
        },
        "label": "Gear 2D Vivid Digital Painting",
        "icon": "",
        "description": "Dive into vibrant digital paintings featuring rich colors, dynamic compositions, and elements of traditional Chinese art and fantasy.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-vivid-flat-art",
        "lora": "nover:10@14",
        "image_url": "https://liblibai-online.liblib.cloud/img/8d5ade1f022c453089e473c7e39dbb35/3dd316a48338e2a5a03ed85a80784bda8f700e3dc38e775e184c05bf9f586967.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "vivid flat art",
            "vibrant flat",
            "bold flat palette",
            "graphic shapes",
            "high-impact flat"
          ]
        },
        "label": "Gear 2D Vivid Flat Art",
        "icon": "",
        "description": "An explosion of bright, colorful characters, objects, and emotions, bursting with a playful and trendy vibe.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-2d-western-anime-style",
        "lora": "nover:10@15",
        "image_url": "https://liblibai-online.liblib.cloud/img/3182e97388e94f0b8fbd0234ac38e892/966453e915f3e970e516f97d2f08a0e09f8c018c182e014043fb25066557d3f6.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "AYU",
            "artistic illustration",
            "western anime",
            "clean anime lines",
            "cel shading"
          ]
        },
        "label": "Gear 2D Western Anime Style",
        "icon": "",
        "description": "Captivating anime characters in a classic Western style, featuring bold colors, sharp lines, and a clean, dynamic feel.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-3d-clay-character",
        "lora": "nover:10@16",
        "image_url": "https://liblibai-online.liblib.cloud/community-img/572368156-be014c0ffb345737377948f369a6d664031f2c63189682b69f62151033fbbcdf.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "clay style",
            "stop motion look",
            "handmade clay",
            "soft clay material",
            "plasticine"
          ]
        },
        "label": "Gear 3D Clay Character",
        "icon": "",
        "description": "Charming 3D characters sculpted with a soft, clay-like texture, bringing a playful and handcrafted feel to your visuals.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-3d-detailed-3d",
        "lora": "nover:10@17",
        "image_url": "https://liblibai-online.liblib.cloud/img/a78ce25a9fe547949b8e207f56c94e34/355dcd69874ca4d2ed0a369f09b886f5aba04c0b4a0213cac2c3e07462ec6c64.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "poster design",
            "detailed 3D",
            "photoreal 3D",
            "micro-details",
            "high poly look"
          ]
        },
        "label": "Gear 3D Detailed 3D",
        "icon": "",
        "description": "Explore intricately detailed 3D scenes with vibrant colors and a futuristic aesthetic, perfect for showcasing complex environments and products.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-3d-fat-3d-icon",
        "lora": "nover:10@18",
        "image_url": "https://liblibai-online.liblib.cloud/img/636785acca274963afaf35c31c0780a6/07ffcc39-fba0-4d22-b2c8-7818d51d81f3.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "pengzhang",
            "baloon",
            "pumped",
            "air pumped",
            "chunky 3D icon",
            "blobby 3D"
          ]
        },
        "label": "Gear 3D Fat 3D Icon",
        "icon": "",
        "description": "Cute, plump 3D icons with soft, rounded shapes and a playful, tactile appearance, ideal for a friendly and inviting look.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-3d-flat-scene",
        "lora": "nover:10@19",
        "image_url": "https://liblibai-online.liblib.cloud/img/dedd2236c6ab458584fce5902aaf2032/2cf2dd1ed976ae9fef119cc66c0ce4d72645d991f35c980ffda91e4c4d2641d3.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "flat 3D scene",
            "isometric feel",
            "minimal 3D",
            "clean geometry",
            "pastel 3D"
          ]
        },
        "label": "Gear 3D Flat Scene",
        "icon": "",
        "description": "A charming 3D scenes with a soft, clean style, featuring cute characters and playful objects in a simplified and cozy environment.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-3d-icon-design",
        "lora": "nover:10@20",
        "image_url": "https://liblibai-online.liblib.cloud/img/0a60cfd4fb36498081f2535f24c5cbe5/347af5f0-3953-4819-9ef1-1f9fe818f0b0.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "Two eyes",
            "inflatable",
            "plastic-bag style cartoon",
            "white background",
            "icon",
            "3D icon glossy"
          ]
        },
        "label": "Gear 3D Icon Design",
        "icon": "",
        "description": "Bring icons to life with a playful, inflatable 3D style, featuring soft textures, vibrant colors, and charming googly eyes.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-3d-avatar-character",
        "lora": "nover:10@21",
        "image_url": "https://liblibai-online.liblib.cloud/img/e14ed7c37a3741d88e05fc61a441e265/99742748c435e5fe3f8f3b82167d46455346e73ed07c0ad074811c5f5f6a1b09.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "avatar",
            "profile avatar",
            "3D character",
            "cartoon avatar",
            "stylized figure"
          ]
        },
        "label": "Gear 3D Avatar Character",
        "icon": "",
        "description": "Dynamic 3D character designs with a **bold, illustrative style**, featuring vibrant colors, expressive faces, and unique details.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-3d-poster",
        "lora": "nover:10@22",
        "image_url": "https://liblibai-online.liblib.cloud/img/0ec0638f229949779a3604f395be4b05/26b36942389f3487a3eb2d8873d56ff7f559393a2dbc06597f88cafdf28e5d31.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "3D poster",
            "cinematic poster",
            "hero composition",
            "dramatic layout",
            "key art"
          ]
        },
        "label": "Gear 3D Poster",
        "icon": "",
        "description": "Captivating 3D posters with **vibrant colors, dynamic compositions**, and a futuristic aesthetic that brings scenes to life.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-3d-vivid-3d-object",
        "lora": "nover:10@23",
        "image_url": "https://liblibai-online.liblib.cloud/img/e14ed7c37a3741d88e05fc61a441e265/3c014a2ef9c0806ae2685b1694ea7ad0ca6f9bd0d6f72de4ee55753505f3a60e.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "vivid 3D object",
            "colorful 3D",
            "glossy highlights",
            "studio lighting",
            "product-style render"
          ]
        },
        "label": "Gear 3D Vivid 3D Object",
        "icon": "",
        "description": "Bold, vibrant, and highly stylized 3D objects with a clean, digital aesthetic and a playful, futuristic touch.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-camera-extreme",
        "lora": "nover:10@24",
        "image_url": "https://liblibai-online.liblib.cloud/img/89e762e8432d4b65958ab16981f9393b/4d1832acc7006de1d27fb95a46a6f98f8eb30adc5d5aefed8b228534ee5a0aa6.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "extreme close-up",
            "macro feel",
            "ultra wide-close",
            "edge distortion",
            "intense perspective"
          ]
        },
        "label": "Gear Camera Extreme",
        "icon": "",
        "description": "Bold and dynamic photography with **extreme camera angles and perspectives**, highlighting **clothing and models** with an edgy, artistic style.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-camera-figh-eye-lens",
        "lora": "nover:10@25",
        "image_url": "https://liblibai-online.liblib.cloud/community-img/489700562-ebd0082a9c9725d2c56163460ea5332e2bf86a46b0bdcca51e44eb7f59b937ec.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "fisheye lens",
            "barrel distortion",
            "ultra wide curve",
            "spherical view",
            "180-degree look"
          ]
        },
        "label": "Gear Camera Figh Eye Lens",
        "icon": "",
        "description": "Distorted and dynamic photography that captures a **wide, expansive view**, perfect for creating a bold, playful, and eye-catching aesthetic.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-camera-wide-angle-lens",
        "lora": "nover:10@26",
        "image_url": "https://liblibai-online.liblib.cloud/img/ba5d94e9cc4f0dd5b2bb1f8060201839/e063ab62a8be29ac6144b2508fc019fce84ce64c1a3f26c69896566e40a699d6.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "wide angle",
            "broad field of view",
            "expansive perspective",
            "environmental shot",
            "wide lens look"
          ]
        },
        "label": "Gear Camera Wide Angle Lens",
        "icon": "",
        "description": "Dramatic portraits using **a wide-angle lens** to capture **models and their environment**, creating a **dynamic, expansive, and immersive perspective**.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-portrait-commercial-shot",
        "lora": "nover:10@27",
        "image_url": "https://liblibai-online.liblib.cloud/img/e14ed7c37a3741d88e05fc61a441e265/c6cca7b180c1c5f7a65047a904a2527954ef3e5b8fff7600222020c12fd0f24a.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "commercial portrait",
            "studio portrait",
            "beauty lighting",
            "clean background",
            "glossy commercial look"
          ]
        },
        "label": "Gear Portrait Commercial Shot",
        "icon": "",
        "description": "Commercial portraits with **sharp focus, natural skin tones, and rich, vibrant colors**, perfect for a clean, high-end, and polished aesthetic.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-portrait-extreme-fashion",
        "lora": "nover:10@28",
        "image_url": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/b2d5e9302f4edcd34b7516432429c7cf195b08c1d9375d2095e09df6dbf1c763.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "extreme fashion",
            "editorial portrait",
            "avant-garde styling",
            "runway vibe",
            "high fashion lighting"
          ]
        },
        "label": "Gear Portrait Extreme Fashion",
        "icon": "",
        "description": "Dramatic fashion photography that blends **high-end looks with surreal, unexpected locations** and a clean, editorial aesthetic.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-portrait-fashion-magazine",
        "lora": "nover:10@29",
        "image_url": "https://liblibai-online.liblib.cloud/img/785ad06f390049d4837e32aece721659/c94d24eb4e59414730ac0e835e2f89f5d078a7346888fa684df93fa0869a9864.jpg?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "fashion magazine",
            "editorial cover",
            "glossy portrait",
            "luxury styling",
            "magazine aesthetic"
          ]
        },
        "label": "Gear Portrait Fashion Magazine",
        "icon": "",
        "description": "Polished, editorial-style portraits with a **natural, high-end feel**, highlighting sophisticated fashion and an air of effortless elegance.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-portrait-fit-sport-wear",
        "lora": "nover:10@30",
        "image_url": "https://liblibai-online.liblib.cloud/img/039f480c90144605b89be09383cbb460/e1d0a8c4ee336802b688ddd45b3a77a64a0690a5027a5df7bc6d8d142a2cee25.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "sportswear portrait",
            "athletic look",
            "fitness fashion",
            "dynamic pose",
            "sporty editorial"
          ]
        },
        "label": "Gear Portrait Fit Sport Wear",
        "icon": "",
        "description": "High-end sports apparel photography with **clean studio lighting**, focusing on **dynamic poses** to highlight the clothing's function, fit, and movement.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-portrait-future-fashion",
        "lora": "nover:10@31",
        "image_url": "https://liblibai-online.liblib.cloud/img/30adc6dff51248ae9b49c567281f736e/8a3b9815c79ad6f61241f27ace257985ad17619e86d59323f96414d13745b39c.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "futuristic fashion",
            "techwear portrait",
            "neon accents",
            "sleek styling",
            "sci-fi editorial"
          ]
        },
        "label": "Gear Portrait Future Fashion",
        "icon": "",
        "description": "Edgy, futuristic fashion with **bold lighting and high contrast**, capturing sleek, modern looks with a **minimalist, cinematic aesthetic**.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-portrait-future-lady",
        "lora": "nover:10@32",
        "image_url": "https://liblibai-online.liblib.cloud/img/f574471b318b491695503813e0f553cf/99cf92bf7ddab99b06143b0ed5207e439df469f45be36e770af9af65c8635088.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "future lady",
            "cyber fashion",
            "sleek portrait",
            "neon rim light",
            "futuristic styling"
          ]
        },
        "label": "Gear Portrait Future Lady",
        "icon": "",
        "description": "Serene and futuristic portraits with a **soft, clean, and minimalist style**, featuring **graceful models** and a **calm, ethereal aesthetic**.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-portrait-happy-breakfast",
        "lora": "nover:10@33",
        "image_url": "https://liblibai-online.liblib.cloud/img/a2f296d39286455384debb93d9c0fb69/41ee2c549ec3315e684c460351101de4738d8863f820d649cfb4edf9dad34bbf.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "breakfast vibe",
            "morning kitchen light",
            "cozy lifestyle",
            "sunny breakfast",
            "warm domestic scene"
          ]
        },
        "label": "Gear Portrait Happy Breakfast",
        "icon": "",
        "description": "Food and lifestyle shots with a **bright, natural aesthetic**, capturing a **sense of joy and contentment** with a clean, light, and delicious feel.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-portrait-headphones",
        "lora": "nover:10@34",
        "image_url": "https://liblibai-online.liblib.cloud/copy/sd-images/deb594a996b7ebc6f14eaaa88174e588778093002df431f6f3c7b530d53280aa.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "headphones portrait",
            "music lifestyle",
            "audio gear focus",
            "studio vibe",
            "listening pose"
          ]
        },
        "label": "Gear Portrait Headphones",
        "icon": "",
        "description": "Detailed and modern product shots that focus on **headphones**, highlighting their design and fit with **clean lighting and minimalist backgrounds**.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-portrait-street-fashion",
        "lora": "nover:10@35",
        "image_url": "https://liblibai-online.liblib.cloud/img/b11a6d76837b41389d4daff7fe415030/83c5e3e59abaa5d76b5e0fa1160b01b4b0376f3585be826c6e087b34ee2ca74f.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "street fashion",
            "urban portrait",
            "city backdrop",
            "streetwear styling",
            "on-location fashion"
          ]
        },
        "label": "Gear Portrait Street Fashion",
        "icon": "",
        "description": "Street-style fashion photography with a **dynamic, low-angle perspective**, capturing a cool and carefree vibe with **bold lighting and vibrant colors**.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-portrait-tech-product-holder",
        "lora": "nover:10@36",
        "image_url": "https://liblibai-online.liblib.cloud/img/1147a017bdc94c3eb887adb884386dca/3429a753-5f92-4181-b9b2-3e4172453541.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "tech product holder",
            "gadget in hand",
            "product-in-hand shot",
            "UI glow",
            "tech lifestyle"
          ]
        },
        "label": "Gear Portrait Tech Product Holder",
        "icon": "",
        "description": "Modern lifestyle photography showcasing tech products with **clean, minimalist styling and natural, inviting lighting** for a sophisticated, commercial feel.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-product-shoot-air-fit",
        "lora": "nover:10@37",
        "image_url": "https://liblibai-online.liblib.cloud/community-img/544932001-5940b955bb9dd7751c29b7c185b5e73d26a53c4c5d9addcf38e2cfb10781d9ac.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "Clothing photography",
            "airy fit",
            "weightless fabric",
            "floating garment",
            "soft wind motion"
          ]
        },
        "label": "Gear Product Shoot Air Fit",
        "icon": "",
        "description": "Capture the essence of clothing with **dynamic, floating compositions**, showcasing **fabric, texture, and movement** in a clean, minimalist style.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-product-shoot-arctic-aesthetics",
        "lora": "nover:10@38",
        "image_url": "https://liblibai-online.liblib.cloud/img/a846149471c54ff692f2d15005ec0f39/2c626bca2183ffb137bf6a8a430ecd2cab6464a7d303bcfb911344a442c7b0b4.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "arctic aesthetics",
            "ice blue backdrop",
            "frozen minimal",
            "cool tones",
            "glacial product set"
          ]
        },
        "label": "Gear Product Shoot Arctic Aesthetics",
        "icon": "",
        "description": "Product photos featuring **crisp, winter aesthetics**, utilizing snow and ice with realistic textures and cool tones to create a refreshing look.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-product-shoot-cinematic-product",
        "lora": "nover:10@39",
        "image_url": "https://liblibai-online.liblib.cloud/img/e14ed7c37a3741d88e05fc61a441e265/df5a0140cf697f6339a504d4152d924f84462441e2336be21af82ee36e366464.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "Realistic product commercial blockbuster",
            "cinematic product",
            "moody product light",
            "hero product shot",
            "filmic contrast"
          ]
        },
        "label": "Gear Product Shoot Cinematic Product",
        "icon": "",
        "description": "Captures products with dramatic lighting and natural elements, creating a visually striking and **story-driven, cinematic aesthetic.**",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-product-shoot-clean-clothes",
        "lora": "nover:10@40",
        "image_url": "https://liblibai-online.liblib.cloud/copy/sd-images/a84f8dfd1bb2ef09fb6a031408f704ae579f6e0ddefbdf0dd47ae6bef0231435.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "miluolkfz",
            "clean garment shot",
            "lint-free fabric",
            "wrinkle-free look",
            "studio clothing"
          ]
        },
        "label": "Gear Product Shoot Clean Clothes",
        "icon": "",
        "description": "Elegant clothing rendered with a **clean, minimalist aesthetic**, showcasing textures and form in a pristine, gravity-defying environment.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-product-shoot-dynamic-shot",
        "lora": "nover:10@41",
        "image_url": "https://liblibai-online.liblib.cloud/img/e14ed7c37a3741d88e05fc61a441e265/d63e32330a319b4fb81992dae11120272805fbd54068b4aba1ddfcc2ad3647ce.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "dynamic product shot",
            "motion blur streak",
            "splash energy",
            "kinetic product",
            "action product"
          ]
        },
        "label": "Gear Product Shoot Dynamic Shot",
        "icon": "",
        "description": "Product visuals with **dynamic motion, vivid colors, and a clean, high-end feel**, highlighting fresh ingredients and a sense of weightless elegance.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-product-shoot-fine-texture-shot",
        "lora": "nover:10@42",
        "image_url": "https://liblibai-online.liblib.cloud/img/512db55f75114e88885efdd5974208e1/67692bc5a3e53770f95f62437626093f980665537b59bb60a0e42a81851bc77b.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "fine texture shot",
            "macro fabric",
            "micro detail product",
            "material close-up",
            "tactile surface"
          ]
        },
        "label": "Gear Product Shoot Fine Texture Shot",
        "icon": "",
        "description": "Captures products in **meticulously crafted environments**, highlighting ultra-fine textures, subtle details, and a refined, high-end feel.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-product-shoot-food-photography",
        "lora": "nover:10@43",
        "image_url": "https://liblibai-online.liblib.cloud/img/50130dd00b7f4c0ab8472a720169906f/6c2013be9c18338d51196c908672d12a481595bdf868315cce402c12eb2d5ada.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "mssy",
            "food photography",
            "tasty hero",
            "gourmet plating",
            "yum macro",
            "steam effect"
          ]
        },
        "label": "Gear Product Shoot Food Photography",
        "icon": "",
        "description": "Delicious **food photography that highlights texture, color, and a sense of warmth** with inviting, shallow depth of field.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-product-shoot-green-shot",
        "lora": "nover:10@44",
        "image_url": "https://liblibai-online.liblib.cloud/img/d0d6324fc04ca15e2071e719b7a4fb08/84af7b41da03c22b6c812dc6c3ae300e1dd4dd827dd41b177878dd904f667b19.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "green product shot",
            "botanical set",
            "leafy backdrop",
            "eco vibe",
            "natural green tone"
          ]
        },
        "label": "Gear Product Shoot Green Shot",
        "icon": "",
        "description": "Realistic renders of objects set in vibrant, natural green environments, emphasizing clear detail and a fresh, serene aesthetic.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-product-shoot-hold-my-product",
        "lora": "nover:10@45",
        "image_url": "https://liblibai-online.liblib.cloud/img/117b993dfda849038fd0cfc8d6cf8d49/bc3fb74e3ace5eff1583d3a20345b964ad8ac58214b1fea1a9c642396b87dd4c.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "hand model",
            "product in hand",
            "human touch",
            "holding shot",
            "lifestyle product hold"
          ]
        },
        "label": "Gear Product Shoot Hold My Product",
        "icon": "",
        "description": "Captures products in use or held by hands, emphasizing interaction and human connection through clear, focused composition.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-product-shoot-natural-commerce",
        "lora": "nover:10@46",
        "image_url": "https://liblibai-online.liblib.cloud/img/f65d5dde6e9a48f1bb48fbd2455b8ec5/8514c282419011186e9907f5534f20977083d78a9252b25f935e20a79fd1e6d1.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "Arcade scene rendering",
            "natural commerce",
            "everyday retail set",
            "market vibe",
            "casual shopping scene"
          ]
        },
        "label": "Gear Product Shoot Natural Commerce",
        "icon": "",
        "description": "Showcase products with a **clean, organic aesthetic**, using **natural elements and soft lighting** to create a fresh, serene, and elegant feel.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-product-shoot-wooden-shot",
        "lora": "nover:10@47",
        "image_url": "https://liblibai-online.liblib.cloud/img/f574471b318b491695503813e0f553cf/4e68a1449291e9e359053e652f5bf17b0954814c969c888b8747a74d8e4bfd36.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "wooden backdrop",
            "warm wood texture",
            "craft table",
            "rustic product set",
            "oak surface"
          ]
        },
        "label": "Gear Product Shoot Wooden Shot",
        "icon": "",
        "description": "Elevate product visuals with a natural, rustic aesthetic, showcasing items on weathered wood amidst earthy tones and subtle textures.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-scene-dreamscape-location",
        "lora": "nover:10@48",
        "image_url": "https://liblibai-online.liblib.cloud/img/636785acca274963afaf35c31c0780a6/c7a329b63078169c0c8e3085632070f26453a98266631903b2d062b0626fb04d.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "xianshi",
            "dreamscape",
            "surreal location",
            "floating islands",
            "misty fantasy scene"
          ]
        },
        "label": "Gear Scene Dreamscape Location",
        "icon": "",
        "description": "Immersive, **dreamlike landscapes** with **surreal architecture, ethereal colors**, and a **misty, atmospheric quality** that feels otherworldly and serene.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-scene-fresh-air",
        "lora": "nover:10@49",
        "image_url": "https://liblibai-online.liblib.cloud/img/f7423df6debc42689cab955307f88217/faf6bfc8-e1d9-4d13-9670-1df285e4ad5d.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "changjingA",
            "fresh air",
            "open sky",
            "breezy landscape",
            "clear atmosphere"
          ]
        },
        "label": "Gear Scene Fresh Air",
        "icon": "",
        "description": "Experience vast, serene landscapes with **lush greenery, clear water, and soft, natural lighting**, evoking a refreshing and peaceful atmosphere.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-scene-hyper-reality",
        "lora": "nover:10@50",
        "image_url": "https://liblibai-online.liblib.cloud/img/e14ed7c37a3741d88e05fc61a441e265/b0fbde13168257da3112075e660c30dd317677589c0086ae6235ff965e4a6b3b.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "hyper reality",
            "heightened realism",
            "crisp HDR",
            "ultra defined",
            "surreal-real fusion"
          ]
        },
        "label": "Gear Scene Hyper Reality",
        "icon": "",
        "description": "Surreal and immersive scenes that blend **realistic people with dreamlike landscapes**, featuring **striking colors and fantastical elements**.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-scene-minimal-3d-location",
        "lora": "nover:10@51",
        "image_url": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/525c12d4b98a762a2c1ad79036dc51ac692b293531904ebaa5e0cc3f97b22c02.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "gncj style",
            "minimal 3D location",
            "clean stage",
            "simple architectural set",
            "white studio space"
          ]
        },
        "label": "Gear Scene Minimal 3D Location",
        "icon": "",
        "description": "Creates serene, minimalist 3D locations with **dreamlike archways, surreal elements, and soft, ethereal lighting.**",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-charming-fluidity",
        "lora": "nover:10@52",
        "image_url": "https://liblibai-online.liblib.cloud/img/fec0806e56074953acbbe6a347addd5a/3c295219114c338317f90b188d1db28dbbadf2cfd422870e73d31422696a83cd.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "dynamic composition",
            "backlit silhouette effect outlines the silhouette of character",
            "bold colors",
            "fluid motion",
            "sweeping curves"
          ]
        },
        "label": "Gear Style Charming Fluidity",
        "icon": "",
        "description": "Captures the **fluidity and dynamism of motion**, with vibrant, swirling colors and graceful figures to create a sense of effortless movement and energy.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-dark-street",
        "lora": "nover:10@53",
        "image_url": "https://liblibai-online.liblib.cloud/img/148ecce3d0a74e3ca867307cd77bc1cd/4c1e7514f6ab58c9103a08f5f087318da52a507f9affb16d771a0ae6d9596464.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "dark street",
            "noir city",
            "wet asphalt glow",
            "moody alley",
            "urban night"
          ]
        },
        "label": "Gear Style Dark Street",
        "icon": "",
        "description": "**Dark street:** Moody and dramatic portraits set in urban alleyways and streets, using deep shadows and cinematic lighting to capture a mysterious, noir-like vibe.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-deep-emotions",
        "lora": "nover:10@54",
        "image_url": "https://liblibai-online.liblib.cloud/community-img/427555066-64a2fa3f2280a8c7f5f66cb848afb0f29e3a37532e08c04ada0c8e555c641534.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "deep emotions",
            "expressive mood",
            "tearful glow",
            "intense feeling",
            "poignant tone"
          ]
        },
        "label": "Gear Style Deep Emotions",
        "icon": "",
        "description": "Dramatic photography with a **cinematic, film-like aesthetic**, capturing raw moments and powerful emotions with **rich colors and compelling natural lighting**.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-glowing-light",
        "lora": "nover:10@55",
        "image_url": "https://liblibai-online.liblib.cloud/img/70f78eb416c54675ac25b742eeae0ea8/8aaaf6f055a5bd00b07633a04667c4df2e8ac6c30bc0949170acfde043c8e33c.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "glowing light",
            "rim light halo",
            "luminous haze",
            "radiant glow",
            "soft bloom"
          ]
        },
        "label": "Gear Style Glowing Light",
        "icon": "",
        "description": "Photography with **high-contrast lighting and a warm, glowing quality**, capturing **dramatic moments and a feeling of solitude** with deep shadows.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-green-tone",
        "lora": "nover:10@56",
        "image_url": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/524d1a6fe88085f58f88e25aa800a785408f27efb1c4bae64d066c8978a2dd7b.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "green tone",
            "emerald grade",
            "lush palette",
            "forest tint",
            "verdant mood"
          ]
        },
        "label": "Gear Style Green Tone",
        "icon": "",
        "description": "Captures scenes with a **dreamy, vintage film aesthetic**, featuring a strong green color cast that creates a serene and nostalgic mood.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-high-exposure",
        "lora": "nover:10@57",
        "image_url": "https://liblibai-online.liblib.cloud/img/70f78eb416c54675ac25b742eeae0ea8/8178fcbd045453cc3c817a6ad03d8950999ecb8c9896a72d36158e283031d266.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "high exposure",
            "bright blown highlights",
            "overexposed look",
            "airy whites",
            "soft washed tones"
          ]
        },
        "label": "Gear Style High Exposure",
        "icon": "",
        "description": "Captures subjects and landscapes with **vibrant, overexposed lighting** and a **dreamy, washed-out feel** that evokes a nostalgic, sun-drenched mood.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-light-and-shadow",
        "lora": "nover:10@58",
        "image_url": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/5e9661822bf559e5e360a301059e9d30301e2b53f9b0faf183bbdb4a396713ca.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "light and shadow",
            "chiaroscuro",
            "dramatic contrast",
            "hard edge light",
            "shadow play"
          ]
        },
        "label": "Gear Style Light and Shadow",
        "icon": "",
        "description": "Photos featuring a **dramatic interplay of light and shadow**, with **cinematic contrast** that accentuates faces, textures, and a contemplative, intimate mood.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-morning-hour",
        "lora": "nover:10@59",
        "image_url": "https://liblibai-online.liblib.cloud/img/70f78eb416c54675ac25b742eeae0ea8/f006d71578465a1c65ccae8fea877e5433b6723b847d0957c7b5ed9b875e5d21.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "morning hour",
            "golden early light",
            "soft sun rays",
            "fresh dawn",
            "warm morning grade"
          ]
        },
        "label": "Gear Style Morning Hour",
        "icon": "",
        "description": "Photos bathed in the soft glow of **morning light**, capturing serene and peaceful moments with **high contrast and deep shadows** for a contemplative mood.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-motion-blur",
        "lora": "nover:10@60",
        "image_url": "https://liblibai-online.liblib.cloud/community-img/254608462-6d61af4acdd8a3df37c20a2aa97e21f42d7ce0a81bc14e53a3b91eafa415bf9b.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "motion blur",
            "speed streaks",
            "dynamic smear",
            "long exposure feel",
            "action trail"
          ]
        },
        "label": "Gear Style Motion Blur",
        "icon": "",
        "description": "Cinematic photos with **dynamic motion blur**, emphasizing speed and movement, to create a **dramatic, fast-paced, and immersive urban feel**.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-nostalgic-moment",
        "lora": "nover:10@61",
        "image_url": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/8e85127382df98e2fbdf1885942a1f1fb28d8723c80e6557486914bb58a0deab.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "nostalgic moment",
            "retro warmth",
            "soft film grain",
            "memory haze",
            "vintage mood"
          ]
        },
        "label": "Gear Style Nostalgic Moment",
        "icon": "",
        "description": "Authentic photos with a **warm, nostalgic feel**, capturing candid, everyday moments with **natural light, soft colors, and subtle film grain**.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-quiet-city",
        "lora": "nover:10@62",
        "image_url": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/d072e54b861783abce0e63f6aa5c67894916fad5d12187af8cd8047fdd56babe.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "quiet city",
            "empty streets",
            "soft urban dusk",
            "calm metropolis",
            "hushed city lights"
          ]
        },
        "label": "Gear Style Quiet City",
        "icon": "",
        "description": "Urban and scenic photos with **subtle lighting and a soft, low-contrast aesthetic**, capturing a sense of calm and tranquility.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-saturated-food",
        "lora": "nover:10@63",
        "image_url": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/26e536fed8dccf9f7dfcf476a0861f4e5f07431069a8c3cf1a7a3a5cc814eedf.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "saturated food",
            "vivid cuisine",
            "juicy saturation",
            "color-pop dishes",
            "gourmet glow"
          ]
        },
        "label": "Gear Style Saturated Food",
        "icon": "",
        "description": "Rich and visually striking food photography with **vibrant, saturated colors**, showcasing **delicious dishes and fresh ingredients** with a clean, captivating top-down perspective.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-sunlight",
        "lora": "nover:10@64",
        "image_url": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/c4a0c2fe73fe5275efe936d45805a129702cc25654f9dd85302c63a5207401f4.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "sunlight style",
            "hard sun beams",
            "sun-kissed glow",
            "golden beam",
            "bright cast shadow"
          ]
        },
        "label": "Gear Style Sunlight",
        "icon": "",
        "description": "Vivid photography with **warm, cinematic lighting and a film-like quality**, capturing **everyday moments** bathed in the soft glow of natural light.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-synthwave-photography",
        "lora": "nover:10@65",
        "image_url": "https://liblibai-online.liblib.cloud/img/82127fa570704d2682ac31ef3dade685/0bc91333bd0b1c7e774e2fcd27d27d1e700438ef2f2cfffad7a35f25a2e57d71.png?x-oss-process=image/resize,w_764,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "synthwave photography",
            "neon grid",
            "magenta cyan glow",
            "retro wave",
            "80s neon city"
          ]
        },
        "label": "Gear Style Synthwave Photography",
        "icon": "",
        "description": "Cinematic photography that captures a **vibrant, retro vibe** with **neon colors**, deep purples, and stunning cityscapes, creating a **dreamy, nostalgic feel**.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-vibrant-morning",
        "lora": "nover:10@66",
        "image_url": "https://liblibai-online.liblib.cloud/img/d059169a83e74c9c955091012c30d8e7/d53ff016-2095-41fb-8615-ce85948f405b.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "vibrant morning",
            "bright daybreak",
            "fresh daylight",
            "high-key morning",
            "uplifting tone"
          ]
        },
        "label": "Gear Style Vibrant Morning",
        "icon": "",
        "description": "Joyful, vibrant photos with **bright lighting and saturated colors**, capturing a **sense of fun and energy** in outdoor, sunlit scenes.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-vintage-showa",
        "lora": "nover:10@67",
        "image_url": "https://liblibai-online.liblib.cloud/sd-images/3937d4cc6d066da67502e8545f421b0d187fd7577dd37cb0eb7ba77a58af2695.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "vintage showa",
            "retro Japan print",
            "aged film look",
            "old poster grain",
            "Showa era vibe"
          ]
        },
        "label": "Gear Style Vintage Showa",
        "icon": "",
        "description": "Photography with a **nostalgic, vintage feel**, capturing **authentic moments** and a film-like quality with **soft colors and subtle grain**.",
        "status": "stable"
      },
      {
        "design": "normal-node",
        "functionality": "lora",
        "type": "gear-style-visual-tension",
        "lora": "nover:10@68",
        "image_url": "https://liblibai-online.liblib.cloud/community-img/423287211-0e47f5c9bc05081b65309c754fa22e28dc783913444cbb33b1ef898efef34baa.png?x-oss-process=image/resize,w_1146,m_lfit/format,webp",
        "data": {
          "functionality": "lora",
          "positiveTriggerWords": [
            "visual tension",
            "contrasting forces",
            "edge conflict",
            "dynamic push-pull",
            "strained composition"
          ]
        },
        "label": "Gear Style Visual Tension",
        "icon": "",
        "description": "Captures a sense of tension with a **film-like aesthetic**, using **gritty textures and high-contrast lighting** for a raw, visually impactful vibe.",
        "status": "stable"
      }
    ]
  }
];

export const assetCategories = [
  {
    name: "Components",
    icon: LayoutList,
    items: [
      { name: "Component 1", type: "component" },
      { name: "Component 2", type: "component" },
      { name: "Untitled Component", type: "component" },
    ] as AssetItem[],
  },
  {
    name: "Renders",
    icon: FileImage,
    items: [
      {
        name: "Render 1",
        type: "render",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475",
      },
      {
        name: "Render 2",
        type: "render",
        image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5",
      },
      {
        name: "Render 3",
        type: "render",
        image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
      },
      {
        name: "Render 4",
        type: "render",
        image: "https://images.unsplash.com/photo-1470813740244-df37b8c1edcb",
      },
      {
        name: "Render 5",
        type: "render",
        image: "https://images.unsplash.com/photo-1500673922987-e212871fec22",
      },
      {
        name: "Render 6",
        type: "render",
        image: "https://images.unsplash.com/photo-1582562124811-c09040d0a901",
      },
    ] as AssetItem[],
  },
  {
    name: "Uploaded",
    icon: Shuffle,
    items: [
      {
        name: "Upload 1",
        type: "upload",
        image: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7",
      },
      {
        name: "Upload 2",
        type: "upload",
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475",
      },
      {
        name: "Upload 3",
        type: "upload",
        image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5",
      },
      {
        name: "Upload 4",
        type: "upload",
        image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
      },
    ] as AssetItem[],
  },
];
