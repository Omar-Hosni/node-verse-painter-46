import {
// Basic UI Icons Cpu, Layers, Image as ImageIcon, Type, FileOutput, HelpCircle,
  ChevronDown, ChevronRight, LayoutList, SquarePlus, FileImage, Shuffle,
  Search, PlusCircle, Paintbrush, Text, Frame, Triangle, RectangleHorizontal, Circle,
  // Additional Lucide Icons matching your new UI
  User, // for Face Control
  Aperture, // for Pose Control
  Sun, // for Lighting
  Eye, // for Depth Control
  SquareStack, // for Layers or Segments
  Grid, // for Grids/References
  RefreshCw, // for Re-rendering tools
  Scissors, // for Remove Background
  ArrowUp, ArrowDown, // for Import/Export
  Wand2, // for AI-based Tools
  Compass, // for Navigation / Scene control
  Ruler, // for Inpainting/Outpainting
  ZoomIn, ZoomOut, // for scaling
  Settings, Upload, Download, RotateCw, PlayCircle,
  Box, Share2, FileOutput, ImageIcon, Cog, DraftingCompass, Orbit, Atom, PersonStanding, LandPlot, ImageUpscale
} from 'lucide-react';

import { TbGridDots, TbImageInPicture, TbBulbFilled, TbCapture } from "react-icons/tb";
import { LuImageDown, LuImagePlus, LuImageMinus } from "react-icons/lu";
import { CiTurnR1, CiTimer } from "react-icons/ci";
import { FaRegFaceKissWinkHeart } from "react-icons/fa6";
import { PiSelectionBackground } from "react-icons/pi"
import { RxText } from "react-icons/rx";

import { NodeType } from '@/store/types';

import SvgIcon from '@/components/SvgIcon';

type NodeOption = {
  type: NodeType;
  label: string;
  icon: React.ElementType;
  description: string;
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
    name: 'Controllers',
    icon: DraftingCompass,
    options: [
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-pose',
        label: 'Pose Control',
        icon: "pose",
        description: 'Control pose of the subject',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-edge',
        label: 'Edge Control',
        icon: "edge",
        description: 'Edge detection via Canny map',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-lights',
        label: 'Lights Control',
        icon: "lights",
        description: 'Custom lighting map control',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-face',
        label: 'Face Express',
        icon: "face",
        description: 'Facial expressions and identity',
        status: 'coming-soon',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-segments',
        label: 'Segments',
        icon: "segments",
        description: 'Segment maps for regions',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-depth',
        label: 'Depth Control',
        icon: "depth",
        description: 'Depth map control for composition',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-normal-map',
        label: 'Normal Map',
        icon: "normal_map",
        description: 'Reference faces, styles, or objects',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'control-net',
        type: 'control-net-reference',
        label: 'Reference',
        icon: "reference",
        description: 'Reference faces, styles, or objects',
        status: 'stable',
      },
    ],
  },
  {
    name: 'Re-rendering',
    icon: Atom,
    options: [
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-reimagine',
        label: 'Re-Imagine',
        icon: "reimagine",
        description: 'Recreate image with new style',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-rescene',
        label: 'Re-Scene',
        icon: "rescene",
        description: 'Change scene and object context',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-objectrelight',
        label: 'Object Re-Light',
        icon: "objectrelight",
        description: 'Change the lighting of the scene',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-reangle',
        label: 'Re-Angle',
        icon: "reangle",
        description: 'Change the camera angle',
        status: 'stable',
      },
    ],
  },
  {
    name: 'Tools',
    icon: Settings,
    options: [
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-remove-bg',
        label: 'Remove BG',
        icon: "removebg",
        description: 'Erase image background',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-upscale',
        label: 'Upscale',
        icon: "upscale",
        description: 'Increase image resolution',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-inpainting',
        label: 'In-Painting',
        icon: "inpainting",
        description: 'Fill missing areas in the image',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-remove-outpainting',
        label: 'Out-Painting',
        icon: "outpainting",
        description: 'Extend content beyond original image',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-3d-maker',
        label: '3D Maker',
        icon: "3dmaker",
        description: 'Generate mesh and texture from image',
        status: 'coming-soon',
      },
      {
        design: 'normal-node',
        functionality: 'input',
        type: 'input-text',
        label: 'Text Prompt',
        icon: "text",
        description: 'Input text prompt for generation',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'image-to-image',
        type: 'image-to-image-merger',
        label: 'Merger',
        icon: "merger",
        description: 'Merge multiple images with weights',
        status: 'stable',
      },
      {
        design: 'custom-router',
        functionality: 'helper',
        type: 'connector',
        label: 'Router',
        icon: "router",
        description: 'Route connections in workflows',
        status: 'stable',
      },
    ],
  },
  {
    name: 'Render',
    icon: FileOutput,
    options: [
      {
        design: 'image-node',
        functionality: 'preview',
        type: 'layer-image-node',
        data: {
          functionality: 'output',
        },
        label: 'Image Output',
        icon: "image_output",
        description: 'Final rendered image',
        status: 'stable',
      },
      {
        design: 'image-node',
        functionality: 'preview',
        type: 'preview-realtime-node',
        data: {
          functionality: 'output',
        },
        label: 'Real-Time Preview',
        icon: "realtime",
        description: 'Live preview during generation',
        status: 'coming-soon',
      },
    ],
  },
  {
    name: 'Engines',
    icon: Cog,
    options: [
      {
        design: 'normal-node',
        functionality: 'engine',
        type: 'engine-real',
        model: 'civitai:778691@1129380',
        lora: 'civitai:920816@1565102',
        image_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/99ccccd1-35b1-4090-ade2-83e2a2bf14ab/anim=false,width=450/5P_00006_.jpeg',
        data: {
          functionality: 'engine',
        },
        label: 'Nover Real',
        icon: "realtime",
        description: 'Combination of Fluxmania Model and Defluxion LoRa',
        status: 'stable',
      },
    ],
  },
  {
    name: 'Gears',
    icon: Orbit,
    options: [
      {
        design: 'normal-node',
        functionality: 'lora',
        type: 'gear-anime',
        lora: 'civitai:534506@1882710',
        image_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/8125d41b-c2fc-4141-8a43-a2b8f0c3058d/anim=false,width=450/pixai-1888583114545024969-0.jpeg',
        data: {
          functionality: 'lora',
        },
        label: 'Gear Semi-Real',
        icon: "",
        description: 'Semi-Real LoRa',
        status: 'stable',
      },
      {
        design: 'normal-node',
        functionality: 'lora',
        type: 'gear-killua',
        lora: 'civitai:1348627@1523250',
        image_url: 'https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/0de4dbcd-eb1c-478c-9709-1694b25e94f9/anim=false,width=450/00960-497516903.jpeg',
        data: {
          functionality: 'lora',
        },
        label: 'Gear Killua',
        icon: "",
        description: 'Killua LoRa',
        status: 'stable',
      },
    ],
  },
];



export const assetCategories = [
    {
      name: 'Components',
      icon: LayoutList,
      items: [
        { name: 'Component 1', type: 'component' },
        { name: 'Component 2', type: 'component' },
        { name: 'Untitled Component', type: 'component' },
      ] as AssetItem[]
    },
    {
      name: 'Renders',
      icon: FileImage,
      items: [
        { name: 'Render 1', type: 'render', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475' },
        { name: 'Render 2', type: 'render', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5' },
        { name: 'Render 3', type: 'render', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158' },
        { name: 'Render 4', type: 'render', image: 'https://images.unsplash.com/photo-1470813740244-df37b8c1edcb' },
        { name: 'Render 5', type: 'render', image: 'https://images.unsplash.com/photo-1500673922987-e212871fec22' },
        { name: 'Render 6', type: 'render', image: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901' },
      ] as AssetItem[]
    },
    {
      name: 'Uploaded',
      icon: Shuffle,
      items: [
        { name: 'Upload 1', type: 'upload', image: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7' },
        { name: 'Upload 2', type: 'upload', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475' },
        { name: 'Upload 3', type: 'upload', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5' },
        { name: 'Upload 4', type: 'upload', image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158' },
      ] as AssetItem[]
    }
  ];